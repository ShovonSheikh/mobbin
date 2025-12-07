let isScanning = false;
let shouldStop = false;
let foundScreens = new Set();
let networkCapturedCount = 0;

// Listen for messages from popup and background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getAppInfo') {
    sendResponse(getAppInfo());
  } else if (message.action === 'startScan') {
    startScanning();
    sendResponse({ success: true });
  } else if (message.action === 'stopScan') {
    shouldStop = true;
    sendResponse({ success: true });
  } else if (message.action === 'networkCaptureProgress') {
    networkCapturedCount = message.count;
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
  networkCapturedCount = 0;
  
  try {
    const { appName, appIcon } = getAppInfo();
    
    // Phase 1: Start network interception
    chrome.runtime.sendMessage({ action: 'startInterception' });
    
    // Phase 2: Scroll through page with enhanced detection
    await scrollAndCollect();
    
    if (shouldStop) {
      chrome.runtime.sendMessage({ action: 'stopInterception' });
      chrome.runtime.sendMessage({ 
        action: 'scanComplete', 
        count: foundScreens.size 
      });
      isScanning = false;
      return;
    }
    
    // Phase 3: Get all URLs from network interception
    const response = await chrome.runtime.sendMessage({ action: 'stopInterception' });
    const networkUrls = response.urls || [];
    
    // Combine network captured + DOM scraped URLs
    networkUrls.forEach(url => foundScreens.add(url));
    
    const allUrls = Array.from(foundScreens);
    
    console.log('Total unique URLs found:', allUrls.length);
    console.log('Network captured:', networkUrls.length);
    console.log('DOM scraped:', foundScreens.size - networkUrls.length);
    
    // Phase 4: Download high-resolution versions
    const savedScreens = await downloadImages(allUrls);
    
    // Phase 5: Save to storage
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
  const scrollDelay = 2500; // Slower scroll for better loading
  const maxScrolls = 150;
  let scrollCount = 0;
  let lastHeight = 0;
  let stableCount = 0;
  
  // Set up mutation observer to catch image src changes
  const observer = setupMutationObserver();
  
  while (scrollCount < maxScrolls && !shouldStop) {
    // Collect images from current viewport
    collectScreensFromPage();
    
    // Scroll down
    window.scrollBy(0, window.innerHeight * 0.7);
    
    // Wait for images to load and upgrade from w=15 to higher res
    await new Promise(resolve => setTimeout(resolve, scrollDelay));
    
    // Check if we've reached the bottom
    const currentHeight = document.documentElement.scrollHeight;
    if (currentHeight === lastHeight) {
      stableCount++;
      // If height hasn't changed for 3 iterations, we're at the bottom
      if (stableCount >= 3) {
        break;
      }
    } else {
      stableCount = 0;
    }
    
    lastHeight = currentHeight;
    scrollCount++;
    
    // Send progress update (combine network + DOM captures)
    const totalFound = Math.max(foundScreens.size, networkCapturedCount);
    chrome.runtime.sendMessage({ 
      action: 'scanProgress', 
      count: totalFound 
    });
  }
  
  // Disconnect observer
  observer.disconnect();
  
  // Scroll back to top
  window.scrollTo(0, 0);
}

function setupMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
        const img = mutation.target;
        if (img.src && img.src.includes('app_screens')) {
          const baseUrl = extractBaseUrl(img.src);
          if (baseUrl) {
            foundScreens.add(baseUrl);
          }
        }
      }
    });
  });
  
  // Observe the entire document for image changes
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['src'],
    subtree: true
  });
  
  return observer;
}

function collectScreensFromPage() {
  // Look for screen images with specific patterns
  const images = document.querySelectorAll('img[src*="app_screens"], img[alt*="screen"]');
  
  images.forEach(img => {
    const baseUrl = extractBaseUrl(img.src);
    if (baseUrl && isValidScreenshot(img)) {
      foundScreens.add(baseUrl);
    }
  });
}

function extractBaseUrl(url) {
  if (!url) return null;
  
  // Extract the base URL without query parameters
  // Format: https://bytescale.mobbin.com/FW25bBB/image/mobbin.com/prod/content/app_screens/UUID.png
  const match = url.match(/(https:\/\/bytescale\.mobbin\.com\/[^?]+\.(png|jpg|jpeg|webp))/i);
  
  return match ? match[1] : null;
}

function isValidScreenshot(img) {
  // Only consider images that are reasonably sized
  // Ignore tiny icons and thumbnails
  return img.naturalWidth > 100 && img.naturalHeight > 100;
}

async function downloadImages(urls) {
  const images = [];
  const batchSize = 5; // Download 5 at a time to avoid overwhelming
  
  for (let i = 0; i < urls.length; i += batchSize) {
    if (shouldStop) break;
    
    const batch = urls.slice(i, i + batchSize);
    const batchPromises = batch.map(url => downloadSingleImage(url));
    
    const results = await Promise.allSettled(batchPromises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        images.push(result.value);
      } else {
        console.error('Failed to download:', batch[index], result.reason);
      }
    });
    
    // Update progress
    chrome.runtime.sendMessage({ 
      action: 'scanProgress', 
      count: images.length 
    });
  }
  
  return images;
}

async function downloadSingleImage(baseUrl) {
  try {
    // Try to get maximum resolution
    // First, try without watermark by requesting the raw file
    const highResUrls = [
      `${baseUrl}`, // Original without params
      `${baseUrl}?w=2400&q=100`, // Very high res
      `${baseUrl}?w=1600&q=95`,  // High res fallback
      `${baseUrl}?w=1200&q=90`   // Medium res fallback
    ];
    
    // Try each URL until one works
    for (const url of highResUrls) {
      try {
        const base64 = await fetchImageAsBase64(url);
        if (base64) {
          return {
            url: baseUrl,
            data: base64,
            timestamp: Date.now()
          };
        }
      } catch (e) {
        // Try next URL
        continue;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Failed to download image:', baseUrl, error);
    return null;
  }
}

async function fetchImageAsBase64(url) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    throw error;
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