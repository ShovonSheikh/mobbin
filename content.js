let isScanning = false;
let shouldStop = false;
let foundScreens = new Set();
let originalZoom = 1;

console.log('🚀 Mobbin Extractor content script loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Received message:', message.action);
  
  if (message.action === 'getAppInfo') {
    const info = getAppInfo();
    console.log('📱 Returning app info:', info);
    sendResponse(info);
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
    const textContent = h1Element.textContent;
    // Split by em dash, long dash, or regular dash
    const parts = textContent.split(/—|–|-/);
    const namePart = parts[0].trim();
    appName = namePart || textContent.trim();
  }
  
  // Also try to get from page title
  if (appName === 'Unknown App') {
    const title = document.title;
    if (title && !title.includes('Mobbin')) {
      appName = title.split('—')[0].split('–')[0].split('-')[0].trim();
    }
  }
  
  // Extract app icon - look for a rounded square icon near the top
  // Try multiple selectors in order of specificity
  let appIcon = null;
  
  // Method 1: Look for image with specific size (app icons are usually 48x48 or larger)
  const topImages = document.querySelectorAll('img[src*="app_logos"]');
  for (const img of topImages) {
    // Check if it's in the header area (top 400px of page)
    const rect = img.getBoundingClientRect();
    if (rect.top < 400 && img.naturalWidth >= 40) {
      const iconUrl = img.src.split('?')[0];
      appIcon = `${iconUrl}?w=200&q=95`;
      console.log('✅ Found app icon (method 1):', appIcon);
      break;
    }
  }
  
  // Method 2: If not found, look for any app_logos image
  if (!appIcon) {
    const iconElement = document.querySelector('img[src*="app_logos"]');
    if (iconElement) {
      const iconUrl = iconElement.src.split('?')[0];
      appIcon = `${iconUrl}?w=200&q=95`;
      console.log('✅ Found app icon (method 2):', appIcon);
    }
  }
  
  // Method 3: Try to find the first large square-ish image at the top
  if (!appIcon) {
    const allImages = document.querySelectorAll('img');
    for (const img of allImages) {
      const rect = img.getBoundingClientRect();
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      
      // Look for square-ish images (0.8 to 1.2 ratio) in the header
      if (rect.top < 300 && 
          img.naturalWidth >= 40 && 
          aspectRatio > 0.8 && 
          aspectRatio < 1.2 &&
          img.src.includes('mobbin')) {
        const iconUrl = img.src.split('?')[0];
        appIcon = `${iconUrl}?w=200&q=95`;
        console.log('✅ Found app icon (method 3):', appIcon);
        break;
      }
    }
  }
  
  console.log('✅ Extracted app info:', { appName, appIcon });
  return { appName, appIcon };
}

async function startScanning() {
  if (isScanning) {
    console.log('⚠️ Already scanning');
    return;
  }
  
  isScanning = true;
  shouldStop = false;
  foundScreens.clear();
  
  console.log('🔍 Starting scan...');
  
  try {
    const { appName, appIcon } = getAppInfo();
    console.log('📱 Scanning app:', appName);
    
    // Save original zoom level and scroll position
    originalZoom = document.body.style.zoom || '1';
    const originalScroll = window.scrollY;
    
    // Step 1: Zoom out to 25%
    console.log('🔍 Zooming out to 25%...');
    chrome.runtime.sendMessage({ 
      action: 'scanStatus',
      status: '🔍 Zooming out to 25%...'
    });
    
    document.body.style.zoom = '0.25';
    
    // Wait a moment for zoom to apply
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 2: Quick scroll to bottom AFTER zooming
    console.log('📜 Scrolling to load all images...');
    chrome.runtime.sendMessage({ 
      action: 'scanStatus',
      status: '📜 Scrolling to load all images...'
    });
    
    await quickScrollToBottom();
    
    // Scroll back to top
    window.scrollTo(0, 0);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Step 3: Wait for all images to load
    console.log('⏳ Waiting for images to load...');
    chrome.runtime.sendMessage({ 
      action: 'scanStatus',
      status: '⏳ Loading images...'
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 4: Collect all screenshot URLs
    await collectAllScreenshotsAtOnce();
    
    // Restore original zoom and scroll
    document.body.style.zoom = originalZoom;
    window.scrollTo(0, originalScroll);
    console.log('✅ Zoom and scroll restored');
    
    if (shouldStop) {
      console.log('⏹️ Scan stopped by user');
      chrome.runtime.sendMessage({ 
        action: 'scanComplete', 
        count: foundScreens.size,
        newCount: foundScreens.size
      });
      isScanning = false;
      return;
    }
    
    const allUrls = Array.from(foundScreens);
    console.log('📸 Total URLs collected:', allUrls.length);
    
    // Extract clean base URLs (without query parameters)
    const cleanUrls = allUrls
      .map(url => extractCleanUrl(url))
      .filter(Boolean);
    
    // Set automatically removes duplicates
    const uniqueUrls = [...new Set(cleanUrls)];
    
    console.log('✅ Unique clean URLs:', uniqueUrls.length);
    console.log('🔍 Sample URLs:', uniqueUrls.slice(0, 3));
    
    // Save to storage
    const savedInfo = await saveToStorage(appName, appIcon, uniqueUrls);
    
    chrome.runtime.sendMessage({ 
      action: 'scanComplete', 
      count: savedInfo.totalCount,
      newCount: savedInfo.newCount
    });
    
  } catch (error) {
    console.error('❌ Scan error:', error);
    chrome.runtime.sendMessage({ 
      action: 'scanError', 
      error: error.message 
    });
    
    // Restore zoom on error
    document.body.style.zoom = originalZoom;
  } finally {
    isScanning = false;
  }
}

async function quickScrollToBottom() {
  const scrollDelay = 300; // Fast scroll
  const maxScrolls = 50;
  let scrollCount = 0;
  let lastHeight = 0;
  let stableCount = 0;
  
  while (scrollCount < maxScrolls) {
    const currentHeight = document.documentElement.scrollHeight;
    
    // Scroll down quickly
    window.scrollBy(0, window.innerHeight * 1.5);
    scrollCount++;
    
    await new Promise(resolve => setTimeout(resolve, scrollDelay));
    
    const newHeight = document.documentElement.scrollHeight;
    
    if (newHeight === currentHeight) {
      stableCount++;
      if (stableCount >= 3) {
        console.log('📍 Reached bottom');
        break;
      }
    } else {
      stableCount = 0;
      lastHeight = newHeight;
    }
  }
}

async function collectAllScreenshotsAtOnce() {
  console.log('📸 Collecting all screenshots from zoomed-out view...');
  
  chrome.runtime.sendMessage({ 
    action: 'scanStatus',
    status: '📸 Scanning all visible images...'
  });
  
  // Give extra time for all images to load in the grid
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Find all screenshot images
  const images = document.querySelectorAll('img[src*="app_screens"]');
  
  console.log(`📊 Found ${images.length} total images with app_screens`);
  
  images.forEach((img, index) => {
    if (img.src) {
      const cleanUrl = extractCleanUrl(img.src);
      if (cleanUrl) {
        foundScreens.add(cleanUrl);
      }
    }
  });
  
  console.log(`✅ Collected ${foundScreens.size} unique screenshot URLs`);
  
  chrome.runtime.sendMessage({ 
    action: 'scanProgress', 
    count: foundScreens.size,
    scrollInfo: `✅ Found ${foundScreens.size} screenshots`
  });
  
  // Wait a bit more and do one final collection pass
  console.log('🔄 Doing final collection pass...');
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const imagesSecondPass = document.querySelectorAll('img[src*="app_screens"]');
  imagesSecondPass.forEach(img => {
    if (img.src) {
      const cleanUrl = extractCleanUrl(img.src);
      if (cleanUrl) {
        foundScreens.add(cleanUrl);
      }
    }
  });
  
  console.log(`🔄 Final count: ${foundScreens.size} unique screenshots`);
  
  chrome.runtime.sendMessage({ 
    action: 'scanStatus',
    status: `🔄 Final: ${foundScreens.size} screenshots found`
  });
}

function extractCleanUrl(url) {
  if (!url || typeof url !== 'string') return null;
  
  // Must contain app_screens to be a screenshot
  if (!url.includes('app_screens')) return null;
  
  // Extract the UUID and extension from the URL
  // Pattern: .../app_screens/UUID.extension?params...
  const match = url.match(/app_screens\/([a-f0-9\-]+)\.(png|jpg|jpeg|webp)/i);
  
  if (match) {
    const uuid = match[1];
    const ext = match[2];
    
    // Return clean URL: base path + UUID + extension (no query params)
    return `https://bytescale.mobbin.com/FW25bBB/image/mobbin.com/prod/content/app_screens/${uuid}.${ext}`;
  }
  
  return null;
}

async function saveToStorage(appName, appIcon, urls) {
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
      
      // Get existing URLs to avoid duplicates
      const existingUrls = new Set(apps[appId].screens.map(screen => screen.url));
      const newUrls = urls.filter(url => !existingUrls.has(url));
      
      // Create screen objects with just URL and timestamp
      const newScreens = newUrls.map(url => ({
        url: url,
        timestamp: Date.now()
      }));
      
      apps[appId].screens.push(...newScreens);
      apps[appId].updatedAt = Date.now();
      
      const totalCount = apps[appId].screens.length;
      const newCount = newScreens.length;
      
      console.log(`💾 Saved ${newCount} new screenshots for "${appName}"`);
      console.log(`📊 Total screenshots for this app: ${totalCount}`);
      
      chrome.runtime.sendMessage({ 
        action: 'scanStatus',
        status: `💾 Saved ${newCount} new (${totalCount} total)`
      });
      
      chrome.storage.local.set({ apps }, () => {
        resolve({ totalCount, newCount });
      });
    });
  });
}

// Notify that content script is ready
console.log('✅ Content script ready and listening for messages');