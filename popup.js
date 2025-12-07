// Popup script for Mobbin Image Extractor

let collectedImages = [];
let currentAppName = '';
let backgroundPort = null;

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusEl = document.getElementById('status');
const foundCountEl = document.getElementById('foundCount');
const uniqueCountEl = document.getElementById('uniqueCount');
const viewDashboardBtn = document.getElementById('viewDashboardBtn');
const scrollDelayInput = document.getElementById('scrollDelay');
const scrollAmountInput = document.getElementById('scrollAmount');
const progressBar = document.getElementById('progressBar');

// Connect to background script
backgroundPort = chrome.runtime.connect({ name: 'popup' });

// Listen for messages from background port
backgroundPort.onMessage.addListener((request) => {
  handleMessage(request);
});

// Event listeners
startBtn.addEventListener('click', startScanning);
stopBtn.addEventListener('click', stopScanning);
viewDashboardBtn.addEventListener('click', openDashboard);

// Initialize on popup open
async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Check if we're on a Mobbin page
  if (!tab.url.includes('mobbin.com')) {
    statusEl.textContent = '⚠️ Please navigate to a Mobbin page';
    startBtn.disabled = true;
    return;
  }
  
  // Check current state
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (state) => {
    if (state && state.isActive) {
      startBtn.disabled = true;
      stopBtn.disabled = false;
      statusEl.textContent = 'Scanning in progress...';
      collectedImages = state.images || [];
      updateStats();
    }
  });
  
  // Check if we have saved apps
  const result = await chrome.storage.local.get(['mobbinApps']);
  const mobbinApps = result.mobbinApps || {};
  const appCount = Object.keys(mobbinApps).length;
  
  if (appCount > 0) {
    viewDashboardBtn.textContent = `📊 View Dashboard (${appCount} app${appCount !== 1 ? 's' : ''})`;
  }
}

async function startScanning() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  const scrollDelay = parseInt(scrollDelayInput.value) || 800;
  const scrollAmount = parseInt(scrollAmountInput.value) || 800;
  
  startBtn.disabled = true;
  stopBtn.disabled = false;
  viewDashboardBtn.disabled = true;
  statusEl.textContent = '🔍 Scanning page...';
  collectedImages = [];
  currentAppName = '';
  updateStats();
  progressBar.style.width = '0%';
  
  // Send message to background
  chrome.runtime.sendMessage({
    type: 'START_SCAN',
    tabId: tab.id,
    scrollDelay: scrollDelay,
    scrollAmount: scrollAmount
  });
}

function stopScanning() {
  startBtn.disabled = false;
  stopBtn.disabled = true;
  viewDashboardBtn.disabled = false;
  
  chrome.runtime.sendMessage({ type: 'STOP_SCAN' });
}

function handleMessage(request) {
  if (request.type === 'IMAGE_UPDATE') {
    collectedImages = request.images || [];
    currentAppName = request.appName || '';
    updateStats();
    updateProgress(request.scrollProgress || 0);
    
    const appText = currentAppName ? ` from ${currentAppName}` : '';
    statusEl.textContent = `🔍 Scanning${appText}... (${collectedImages.length} found)`;
  } else if (request.type === 'SCAN_COMPLETE') {
    collectedImages = request.images || [];
    currentAppName = request.appName || '';
    updateStats();
    updateProgress(100);
    
    const appText = currentAppName ? ` for ${currentAppName}` : '';
    statusEl.textContent = `✅ Saved ${collectedImages.length} images${appText}!`;
    
    startBtn.disabled = false;
    stopBtn.disabled = true;
    viewDashboardBtn.disabled = false;
    
    // Update dashboard button count
    updateDashboardCount();
  } else if (request.type === 'SCAN_STOPPED') {
    collectedImages = request.images || [];
    currentAppName = request.appName || '';
    updateStats();
    updateProgress(0);
    
    statusEl.textContent = `⏸ Scan stopped. Found ${collectedImages.length} images`;
    
    startBtn.disabled = false;
    stopBtn.disabled = true;
    viewDashboardBtn.disabled = false;
  }
}

function updateStats() {
  // Count total images
  foundCountEl.textContent = collectedImages.length;
  
  // Count unique images based on baseUrl
  const uniqueUrls = new Set();
  collectedImages.forEach(img => {
    if (img.baseUrl) {
      uniqueUrls.add(img.baseUrl);
    }
  });
  uniqueCountEl.textContent = uniqueUrls.size;
}

function updateProgress(percent) {
  progressBar.style.width = Math.min(100, Math.max(0, percent)) + '%';
}

async function updateDashboardCount() {
  const result = await chrome.storage.local.get(['mobbinApps']);
  const mobbinApps = result.mobbinApps || {};
  const appCount = Object.keys(mobbinApps).length;
  
  if (appCount > 0) {
    viewDashboardBtn.textContent = `📊 View Dashboard (${appCount} app${appCount !== 1 ? 's' : ''})`;
  }
}

function openDashboard() {
  chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
}

// Initialize when popup opens
init();