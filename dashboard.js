// Dashboard JavaScript

let appsData = {};

// Load apps data from Chrome storage
async function loadAppsData() {
  try {
    const result = await chrome.storage.local.get(['mobbinApps']);
    appsData = result.mobbinApps || {};
    renderApps();
  } catch (error) {
    console.error('Error loading apps data:', error);
    showEmptyState();
  }
}

// Render apps grid
function renderApps(searchTerm = '') {
  const appsGrid = document.getElementById('appsGrid');
  const emptyState = document.getElementById('emptyState');
  
  // Filter apps based on search
  const appNames = Object.keys(appsData).filter(name => 
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  if (appNames.length === 0) {
    appsGrid.style.display = 'none';
    emptyState.classList.add('visible');
    return;
  }
  
  appsGrid.style.display = 'grid';
  emptyState.classList.remove('visible');
  
  appsGrid.innerHTML = appNames.map(appName => {
    const app = appsData[appName];
    const screenCount = app.screenshots.length;
    
    return `
      <a href="app-detail.html?app=${encodeURIComponent(appName)}" class="app-card">
        <div class="app-thumbnail">
          <img src="${app.logo}" alt="${appName} logo" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><rect width=%22200%22 height=%22200%22 fill=%22%23d1d5db%22/></svg>'">
        </div>
        <h3 class="app-name">${appName}</h3>
        <p class="app-count">${screenCount} screenshot${screenCount !== 1 ? 's' : ''}</p>
      </a>
    `;
  }).join('');
}

function showEmptyState() {
  document.getElementById('appsGrid').style.display = 'none';
  document.getElementById('emptyState').classList.add('visible');
}

// Search functionality
document.getElementById('searchInput').addEventListener('input', (e) => {
  renderApps(e.target.value);
});

// Initialize
loadAppsData();