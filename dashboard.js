let currentView = 'apps'; // 'apps' or 'detail'
let currentAppId = null;
let allApps = {};

// Load dashboard
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  
  // Back button
  document.getElementById('backButton').addEventListener('click', () => {
    if (currentView === 'detail') {
      showAppsView();
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  
  // Sidebar controls
  document.getElementById('closeSidebar').addEventListener('click', closeSidebar);
  document.getElementById('overlayBackdrop').addEventListener('click', closeSidebar);
  
  // Show/hide back button on scroll
  window.addEventListener('scroll', () => {
    const backBtn = document.getElementById('backButton');
    if (window.scrollY > 300 || currentView === 'detail') {
      backBtn.classList.remove('hidden');
    } else {
      backBtn.classList.add('hidden');
    }
  });
});

function loadDashboard() {
  chrome.storage.local.get(['apps'], (result) => {
    allApps = result.apps || {};
    const apps = Object.values(allApps);
    
    if (apps.length === 0) {
      showEmptyState();
      return;
    }
    
    hideEmptyState();
    updateStats(apps);
    renderAppsGrid(apps);
  });
}

function showEmptyState() {
  document.getElementById('emptyState').style.display = 'block';
  document.getElementById('appsView').style.display = 'none';
  document.getElementById('totalApps').textContent = '0';
  document.getElementById('totalScreenshots').textContent = '0';
}

function hideEmptyState() {
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('appsView').style.display = 'grid';
}

function updateStats(apps) {
  const totalScreenshots = apps.reduce((sum, app) => sum + app.screens.length, 0);
  document.getElementById('totalApps').textContent = apps.length;
  document.getElementById('totalScreenshots').textContent = totalScreenshots;
}

function renderAppsGrid(apps) {
  // Sort by updated date
  apps.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
  
  const grid = document.getElementById('appsView');
  grid.innerHTML = '';
  
  apps.forEach(app => {
    const card = createAppCard(app);
    grid.appendChild(card);
  });
}

function createAppCard(app) {
  const card = document.createElement('div');
  card.className = 'app-card';
  
  // Use first screenshot URL with high quality params
  const previewUrl = app.screens[0]?.url 
    ? `${app.screens[0].url}?w=800&q=90` 
    : '';
  
  const date = new Date(app.updatedAt || app.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  // App icon already has quality params from content.js
  const iconUrl = app.icon || '';
  
  card.innerHTML = `
    <div class="app-card-preview">
      ${previewUrl ? `<img src="${previewUrl}" alt="${app.name}" loading="lazy">` : ''}
      <div class="screen-count-badge">${app.screens.length} screens</div>
    </div>
    <div class="app-card-info">
      <div class="app-icon">
        ${iconUrl ? `<img src="${iconUrl}" alt="${app.name}" loading="lazy">` : ''}
      </div>
      <div class="app-details">
        <h3>${app.name}</h3>
        <div class="app-date">${date}</div>
      </div>
    </div>
  `;
  
  card.addEventListener('click', () => {
    showAppDetail(app.id);
  });
  
  return card;
}

function showAppDetail(appId) {
  const app = allApps[appId];
  if (!app) return;
  
  currentView = 'detail';
  currentAppId = appId;
  
  // Hide apps view
  document.getElementById('appsView').style.display = 'none';
  
  // Show detail view
  const detailView = document.getElementById('detailView');
  detailView.className = 'detail-view active';
  
  const date = new Date(app.updatedAt || app.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  
  detailView.innerHTML = `
    <div class="detail-header">
      <div class="detail-icon">
        ${app.icon ? `<img src="${app.icon}" alt="${app.name}" loading="lazy">` : ''}
      </div>
      <div class="detail-info">
        <h2>${app.name}</h2>
        <div class="detail-meta">
          <span>${app.screens.length} screenshots</span>
          <span>Updated ${date}</span>
        </div>
      </div>
    </div>
    <div class="screens-grid" id="screensGrid"></div>
  `;
  
  // Render screens
  const screensGrid = document.getElementById('screensGrid');
  app.screens.forEach((screen, index) => {
    const screenItem = createScreenItem(screen, index, app.name);
    screensGrid.appendChild(screenItem);
  });
  
  // Show back button
  document.getElementById('backButton').classList.remove('hidden');
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function createScreenItem(screen, index, appName) {
  const item = document.createElement('div');
  item.className = 'screen-item';
  
  // Use medium quality for thumbnails, high quality for modal/download
  const thumbnailUrl = `${screen.url}?w=600&q=85`;
  const fullUrl = `${screen.url}?w=1600&q=95`;
  
  item.innerHTML = `
    <img src="${thumbnailUrl}" alt="Screenshot ${index + 1}" loading="lazy">
    <div class="screen-overlay">
      <button class="download-btn">
        <svg class="icon" viewBox="0 0 24 24">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download
      </button>
    </div>
  `;
  
  // Click on image to view in sidebar
  item.querySelector('img').addEventListener('click', (e) => {
    e.stopPropagation();
    openSidebar(fullUrl);
  });
  
  // Click on download button
  item.querySelector('.download-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    downloadScreen(fullUrl, appName, index);
  });
  
  return item;
}

function showAppsView() {
  currentView = 'apps';
  currentAppId = null;
  
  document.getElementById('detailView').classList.remove('active');
  document.getElementById('appsView').style.display = 'grid';
  
  // Hide back button if at top
  if (window.scrollY < 300) {
    document.getElementById('backButton').classList.add('hidden');
  }
}

function openSidebar(imageUrl) {
  document.getElementById('sidebarImage').src = imageUrl;
  document.getElementById('sidebar').classList.add('active');
  document.getElementById('overlayBackdrop').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('active');
  document.getElementById('overlayBackdrop').classList.remove('active');
  document.body.style.overflow = '';
}

async function downloadScreen(url, appName, index) {
  try {
    // Show a loading indicator (optional)
    console.log('Downloading:', url);
    
    // Fetch the image
    const response = await fetch(url);
    const blob = await response.blob();
    
    // Create download link
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${appName.replace(/\s+/g, '_')}_screen_${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
  } catch (error) {
    console.error('Download failed:', error);
    alert('Failed to download image. Please try again.');
  }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Escape to close sidebar or go back
  if (e.key === 'Escape') {
    if (document.getElementById('sidebar').classList.contains('active')) {
      closeSidebar();
    } else if (currentView === 'detail') {
      showAppsView();
    }
  }
});