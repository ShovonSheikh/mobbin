// Background service worker for network interception
let capturedUrls = new Set();
let isIntercepting = false;
let currentTabId = null;

// Install listener
chrome.runtime.onInstalled.addListener(() => {
  console.log('Mobbin Extractor installed successfully');
});

// Listen for scan start/stop messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startInterception') {
    startNetworkInterception(sender.tab.id);
    sendResponse({ success: true });
  } else if (message.action === 'stopInterception') {
    stopNetworkInterception();
    sendResponse({ success: true, urls: Array.from(capturedUrls) });
  } else if (message.action === 'getInterceptedUrls') {
    sendResponse({ urls: Array.from(capturedUrls) });
  }
  return true;
});

// Network interception using webRequest
function startNetworkInterception(tabId) {
  isIntercepting = true;
  currentTabId = tabId;
  capturedUrls.clear();
  
  console.log('Started network interception for tab:', tabId);
}

function stopNetworkInterception() {
  isIntercepting = false;
  currentTabId = null;
  console.log('Stopped network interception. Captured URLs:', capturedUrls.size);
}

// Listen to web requests - Manifest V3 approach
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Only intercept if we're actively scanning
    if (!isIntercepting || details.tabId !== currentTabId) {
      return;
    }
    
    const url = details.url;
    
    // Check if this is an app screen image
    if (url.includes('app_screens') && url.includes('bytescale.mobbin.com')) {
      // Extract base URL (everything before the query string)
      const baseUrl = url.split('?')[0];
      
      // Only add if it's a PNG (actual screenshot)
      if (baseUrl.endsWith('.png') || baseUrl.endsWith('.jpg') || baseUrl.endsWith('.webp')) {
        capturedUrls.add(baseUrl);
        console.log('Captured:', baseUrl);
        
        // Notify content script of progress
        chrome.tabs.sendMessage(currentTabId, {
          action: 'networkCaptureProgress',
          count: capturedUrls.size
        });
      }
    }
  },
  { urls: ["https://bytescale.mobbin.com/*"] }
);

// Clear scanning state on browser startup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.set({ isScanning: false });
  capturedUrls.clear();
  isIntercepting = false;
});