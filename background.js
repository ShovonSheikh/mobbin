// Background service worker for the extension
// Handles installation and basic event management

chrome.runtime.onInstalled.addListener(() => {
  console.log('Mobbin Extractor installed successfully');
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Forward messages if needed
  if (message.action === 'scanProgress' || 
      message.action === 'scanComplete' || 
      message.action === 'scanError') {
    // These messages will be handled by the popup
    return true;
  }
});

// Clear scanning state on browser startup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.set({ isScanning: false });
});