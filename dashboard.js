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
  
  const previewImage = app.screens[0]?.data || '';
  const date = new Date(app.updatedAt || app.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  card.innerHTML = `
    <div class="app-card-preview">
      ${previewImage ? `<img src="${previewImage}" alt="${app.name}">` : ''}
      <div class="screen-count-badge">${app.screens.length} screens</div>
    </div>
    <div class="app-card-info">
      <div class="app-icon">
        ${app.icon ? `<img src="${app.icon}" alt="${app.name}">` : ''}
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
        ${app.icon ? `<img src="${app.icon}" alt="${app.name}">` : ''}
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
  
  item.innerHTML = `
    <img src="${screen.data}" alt="Screenshot ${index + 1}">
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
    openSidebar(screen.data);
  });
  
  // Click on download button
  item.querySelector('.download-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    downloadScreen(screen.data, appName, index);
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

function openSidebar(imageData) {
  document.getElementById('sidebarImage').src = imageData;
  document.getElementById('sidebar').classList.add('active');
  document.getElementById('overlayBackdrop').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('active');
  document.getElementById('overlayBackdrop').classList.remove('active');
  document.body.style.overflow = '';
}

function downloadScreen(data, appName, index) {
  const link = document.createElement('a');
  link.href = data;
  link.download = `${appName.replace(/\s+/g, '_')}_screen_${index + 1}.png`;
  link.click();
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