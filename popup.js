let isScanning = false;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Check if we're on Mobbin
  if (!tab.url.includes('mobbin.com')) {
    showError('Please navigate to a Mobbin app page first');
    document.getElementById('startBtn').disabled = true;
    return;
  }

  // Get app info from current page
  chrome.tabs.sendMessage(tab.id, { action: 'getAppInfo' }, (response) => {
    if (response && response.appName) {
      document.getElementById('appName').textContent = response.appName;
    }
  });

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
  
  chrome.tabs.sendMessage(tab.id, { action: 'startScan' }, (response) => {
    if (chrome.runtime.lastError) {
      showError('Failed to start scan. Please refresh the page and try again.');
      setScanning(false);
      return;
    }
  });

  // Listen for updates
  chrome.runtime.onMessage.addListener(handleMessage);
}

function handleMessage(message, sender, sendResponse) {
  if (message.action === 'scanProgress') {
    document.getElementById('progressText').textContent = 
      `Found ${message.count} screenshot${message.count !== 1 ? 's' : ''}...`;
  } else if (message.action === 'scanComplete') {
    setScanning(false);
    chrome.storage.local.set({ isScanning: false });
    document.getElementById('progressText').textContent = 
      `Complete! Saved ${message.count} screenshot${message.count !== 1 ? 's' : ''}`;
    loadTotalCount();
    
    setTimeout(() => {
      document.getElementById('progress').classList.remove('active');
    }, 3000);
  } else if (message.action === 'scanError') {
    setScanning(false);
    chrome.storage.local.set({ isScanning: false });
    showError(message.error);
  }
}

async function stopScan() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.tabs.sendMessage(tab.id, { action: 'stopScan' });
  setScanning(false);
  chrome.storage.local.set({ isScanning: false });
  document.getElementById('progressText').textContent = 'Scan stopped';
  
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