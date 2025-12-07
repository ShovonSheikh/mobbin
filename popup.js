let isScanning = false;
let messageListener = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Check if we're on Mobbin
  if (!tab.url || !tab.url.includes('mobbin.com')) {
    showError('Please navigate to a Mobbin app page first');
    document.getElementById('startBtn').disabled = true;
    return;
  }

  // Check if we're on an app page (not just mobbin.com homepage)
  if (!tab.url.includes('mobbin.com/apps/')) {
    showError('Please navigate to a specific app page (mobbin.com/apps/...)');
    document.getElementById('startBtn').disabled = true;
    return;
  }

  // Try to get app info from current page with error handling
  try {
    chrome.tabs.sendMessage(tab.id, { action: 'getAppInfo' }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script not loaded yet - inject it
        console.log('Content script not loaded, injecting...');
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }, () => {
          // Try again after injection
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { action: 'getAppInfo' }, (response) => {
              if (response && response.appName) {
                document.getElementById('appName').textContent = response.appName;
              } else {
                document.getElementById('appName').textContent = 'Not detected';
              }
            });
          }, 500);
        });
        return;
      }
      
      if (response && response.appName) {
        document.getElementById('appName').textContent = response.appName;
      } else {
        document.getElementById('appName').textContent = 'Not detected';
      }
    });
  } catch (error) {
    console.error('Error getting app info:', error);
    document.getElementById('appName').textContent = 'Error';
  }

  // Load total count
  loadTotalCount();

  // Set up event listeners
  document.getElementById('startBtn').addEventListener('click', startScan);
  document.getElementById('stopBtn').addEventListener('click', stopScan);
  document.getElementById('dashboardBtn').addEventListener('click', openDashboard);

  // Check if already scanning
  chrome.storage.local.get(['isScanning'], (result) => {
    if (result.isScanning) {
      setScanning(true);
    }
  });
});

async function loadTotalCount() {
  chrome.storage.local.get(['apps'], (result) => {
    const apps = result.apps || {};
    let total = 0;
    
    Object.values(apps).forEach(app => {
      total += app.screens.length;
    });
    
    document.getElementById('totalCount').textContent = 
      `${total} screenshot${total !== 1 ? 's' : ''}`;
  });
}

async function startScan() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  setScanning(true);
  chrome.storage.local.set({ isScanning: true });
  
  // Ensure content script is loaded before starting scan
  chrome.tabs.sendMessage(tab.id, { action: 'startScan' }, (response) => {
    if (chrome.runtime.lastError) {
      // Content script not loaded, inject it first
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      }, () => {
        // Try starting scan again after injection
        setTimeout(() => {
          chrome.tabs.sendMessage(tab.id, { action: 'startScan' }, (response) => {
            if (chrome.runtime.lastError) {
              showError('Failed to start scan. Please refresh the page and try again.');
              setScanning(false);
              chrome.storage.local.set({ isScanning: false });
            }
          });
        }, 500);
      });
      return;
    }
  });

  // Remove old listener if exists
  if (messageListener) {
    chrome.runtime.onMessage.removeListener(messageListener);
  }

  // Create new listener
  messageListener = (message, sender, sendResponse) => {
    handleMessage(message, sender, sendResponse);
  };

  // Listen for updates
  chrome.runtime.onMessage.addListener(messageListener);
}

function handleMessage(message, sender, sendResponse) {
  if (message.action === 'scanProgress') {
    const count = message.count;
    const scrollInfo = message.scrollInfo || '';
    
    document.getElementById('progressText').textContent = 
      `Found ${count} screenshot${count !== 1 ? 's' : ''}...`;
    
    if (scrollInfo) {
      document.getElementById('progressDetails').textContent = scrollInfo;
    } else {
      document.getElementById('progressDetails').textContent = 
        'Collecting screenshot URLs';
    }
  } else if (message.action === 'scanStatus') {
    // Handle status updates (reached bottom, final pass, etc.)
    document.getElementById('progressDetails').textContent = message.status;
  } else if (message.action === 'scanComplete') {
    setScanning(false);
    chrome.storage.local.set({ isScanning: false });
    
    const count = message.count;
    const newCount = message.newCount || count;
    
    document.getElementById('progressText').textContent = 
      `Complete! Saved ${newCount} new screenshot${newCount !== 1 ? 's' : ''}`;
    document.getElementById('progressDetails').textContent = 
      `Total: ${count} screenshot${count !== 1 ? 's' : ''} for this app`;
    
    loadTotalCount();
    
    // Remove listener after completion
    if (messageListener) {
      chrome.runtime.onMessage.removeListener(messageListener);
      messageListener = null;
    }
    
    setTimeout(() => {
      document.getElementById('progress').classList.remove('active');
    }, 4000);
  } else if (message.action === 'scanError') {
    setScanning(false);
    chrome.storage.local.set({ isScanning: false });
    showError(message.error);
    
    // Remove listener on error
    if (messageListener) {
      chrome.runtime.onMessage.removeListener(messageListener);
      messageListener = null;
    }
  }
}

async function stopScan() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.tabs.sendMessage(tab.id, { action: 'stopScan' });
  setScanning(false);
  chrome.storage.local.set({ isScanning: false });
  document.getElementById('progressText').textContent = 'Scan stopped';
  
  // Remove listener when stopping
  if (messageListener) {
    chrome.runtime.onMessage.removeListener(messageListener);
    messageListener = null;
  }
  
  setTimeout(() => {
    document.getElementById('progress').classList.remove('active');
  }, 2000);
}

function setScanning(scanning) {
  isScanning = scanning;
  document.getElementById('startBtn').style.display = scanning ? 'none' : 'block';
  document.getElementById('stopBtn').style.display = scanning ? 'block' : 'none';
  document.getElementById('progress').classList.toggle('active', scanning);
  
  if (scanning) {
    document.getElementById('error').classList.remove('show');
    document.getElementById('progressText').textContent = 'Starting scan...';
    document.getElementById('progressDetails').textContent = 'Initializing...';
  }
}

function showError(message) {
  const errorEl = document.getElementById('error');
  errorEl.textContent = message;
  errorEl.classList.add('show');
}

function openDashboard() {
  chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
}