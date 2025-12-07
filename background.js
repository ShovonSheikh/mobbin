// Simplified background service worker

// Install listener
chrome.runtime.onInstalled.addListener(() => {
  console.log('Mobbin Extractor installed successfully');
});

// Clear scanning state on browser startup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.set({ isScanning: false });
});