let isScanning = false;
let shouldStop = false;
let foundScreens = new Set();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getAppInfo') {
    sendResponse(getAppInfo());
  } else if (message.action === 'startScan') {
    startScanning();
    sendResponse({ success: true });
  } else if (message.action === 'stopScan') {
    shouldStop = true;
    sendResponse({ success: true });
  }
  return true;
});

function getAppInfo() {
  // Extract app name from h1
  const h1Element = document.querySelector('h1.text-title-2, h1');
  let appName = 'Unknown App';
  
  if (h1Element) {
    // Get just the app name, not the description
    const textContent = h1Element.textContent;
    const namePart = textContent.split('—')[0].trim();
    appName = namePart || textContent.trim();
  }
  
  // Extract app icon
  const iconElement = document.querySelector('img[alt*="logo"], img[src*="app_logos"]');
  let appIcon = null;
  
  if (iconElement) {
    appIcon = iconElement.src;
  }
  
  return { appName, appIcon };
}

async function startScanning() {
  if (isScanning) return;
  
  isScanning = true;
  shouldStop = false;
  foundScreens.clear();
  
  try {
    const { appName, appIcon } = getAppInfo();
    
    // Scroll through the page to load all images
    await scrollAndCollect();
    
    if (shouldStop) {
      chrome.runtime.sendMessage({ 
        action: 'scanComplete', 
        count: foundScreens.size 
      });
      isScanning = false;
      return;
    }
    
    // Extract screen URLs
    const screenUrls = Array.from(foundScreens);
    
    // Convert images to base64 and save
    const savedScreens = await downloadImages(screenUrls);
    
    // Save to storage
    await saveToStorage(appName, appIcon, savedScreens);
    
    chrome.runtime.sendMessage({ 
      action: 'scanComplete', 
      count: savedScreens.length 
    });
    
  } catch (error) {
    console.error('Scan error:', error);
    chrome.runtime.sendMessage({ 
      action: 'scanError', 
      error: error.message 
    });
  } finally {
    isScanning = false;
  }
}

async function scrollAndCollect() {
  const scrollDelay = 1000;
  const maxScrolls = 100;
  let scrollCount = 0;
  let lastHeight = 0;
  
  while (scrollCount < maxScrolls && !shouldStop) {
    // Collect images from current viewport
    collectScreensFromPage();
    
    // Scroll down
    window.scrollBy(0, window.innerHeight * 0.8);
    
    // Wait for images to load
    await new Promise(resolve => setTimeout(resolve, scrollDelay));
    
    // Check if we've reached the bottom
    const currentHeight = document.documentElement.scrollHeight;
    if (currentHeight === lastHeight) {
      break;
    }
    
    lastHeight = currentHeight;
    scrollCount++;
    
    // Send progress update
    chrome.runtime.sendMessage({ 
      action: 'scanProgress', 
      count: foundScreens.size 
    });
  }
  
  // Scroll back to top
  window.scrollTo(0, 0);
}

function collectScreensFromPage() {
  // Look for screen images with specific pattern
  const images = document.querySelectorAll('img[src*="app_screens"], img[alt*="screen"]');
  
  images.forEach(img => {
    let src = img.src;
    
    // Extract the base URL without query parameters
    // Format: https://bytescale.mobbin.com/FW25bBB/image/mobbin.com/prod/content/app_screens/UUID.png
    const match = src.match(/(https:\/\/bytescale\.mobbin\.com\/[^?]+\.png)/);
    
    if (match) {
      const baseUrl = match[1];
      
      // Only add if it's a legitimate screen (reasonable size)
      if (img.naturalWidth > 200 && img.naturalHeight > 200) {
        foundScreens.add(baseUrl);
      }
    }
  });
}

async function downloadImages(urls) {
  const images = [];
  
  for (const url of urls) {
    if (shouldStop) break;
    
    try {
      // Request high-resolution version
      const highResUrl = `${url}?w=1200&q=95`;
      const base64 = await fetchImageAsBase64(highResUrl);
      
      if (base64) {
        images.push({
          url: url,
          data: base64,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Failed to download image:', url, error);
    }
  }
  
  return images;
}

async function fetchImageAsBase64(url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
  }
}

async function saveToStorage(appName, appIcon, images) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apps'], (result) => {
      const apps = result.apps || {};
      
      // Create app ID from name
      const appId = appName.toLowerCase().replace(/\s+/g, '-');
      
      if (!apps[appId]) {
        apps[appId] = {
          id: appId,
          name: appName,
          icon: appIcon,
          screens: [],
          createdAt: Date.now()
        };
      }
      
      // Add new screens, avoiding duplicates
      const existingUrls = new Set(apps[appId].screens.map(screen => screen.url));
      const newScreens = images.filter(img => !existingUrls.has(img.url));
      
      apps[appId].screens.push(...newScreens);
      apps[appId].updatedAt = Date.now();
      
      chrome.storage.local.set({ apps }, () => {
        resolve();
      });
    });
  });
} 