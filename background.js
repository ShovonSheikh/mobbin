// Background service worker for Mobbin Image Extractor

let scanningState = {
  isActive: false,
  tabId: null,
  images: [],
  popupPort: null
};

// Listen for popup connections
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'popup') {
    scanningState.popupPort = port;
    
    port.onDisconnect.addListener(() => {
      scanningState.popupPort = null;
    });
  }
});

// Listen for messages from popup and content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'START_SCAN') {
    handleStartScan(request, sender);
    sendResponse({ success: true });
  } else if (request.type === 'STOP_SCAN') {
    handleStopScan(request, sender);
    sendResponse({ success: true });
  } else if (request.type === 'GET_STATE') {
    sendResponse(scanningState);
  } else if (request.type === 'IMAGE_UPDATE') {
    // Forward to popup
    scanningState.images = request.images;
    scanningState.isActive = true;
    if (scanningState.popupPort) {
      scanningState.popupPort.postMessage(request);
    }
    sendResponse({ success: true });
  } else if (request.type === 'SCAN_COMPLETE' || request.type === 'SCAN_STOPPED') {
    scanningState.images = request.images;
    scanningState.isActive = false;
    if (scanningState.popupPort) {
      scanningState.popupPort.postMessage(request);
    }
    sendResponse({ success: true });
  }
  
  return true; // Keep channel open for async response
});

function handleStartScan(request, sender) {
  scanningState = {
    isActive: true,
    tabId: sender.tab?.id || request.tabId,
    images: []
  };
  
  // Send message to content script
  if (scanningState.tabId) {
    chrome.tabs.sendMessage(scanningState.tabId, {
      type: 'START_SCAN',
      scrollDelay: request.scrollDelay,
      scrollAmount: request.scrollAmount
    }).catch(err => console.error('Error starting scan:', err));
  }
}

function handleStopScan(request, sender) {
  if (scanningState.tabId) {
    chrome.tabs.sendMessage(scanningState.tabId, {
      type: 'STOP_SCAN'
    }).catch(err => console.error('Error stopping scan:', err));
  }
  
  scanningState.isActive = false;
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.action.openPopup();
});

console.log('Mobbin Image Extractor background service worker loaded');