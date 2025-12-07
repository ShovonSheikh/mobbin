// App Detail JavaScript

let currentApp = null;
let currentImageUrl = null;

// Get app name from URL
function getAppNameFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("app");
}

// Load app data
async function loadAppData() {
  const appName = getAppNameFromUrl();

  if (!appName) {
    window.location.href = "dashboard.html";
    return;
  }

  try {
    const result = await chrome.storage.local.get(["mobbinApps"]);
    const appsData = result.mobbinApps || {};
    currentApp = appsData[appName];

    if (!currentApp) {
      window.location.href = "dashboard.html";
      return;
    }

    renderAppDetail(appName);
  } catch (error) {
    console.error("Error loading app data:", error);
    window.location.href = "dashboard.html";
  }
}

// Render app detail page
function renderAppDetail(appName) {
  // Set app info
  document.getElementById("appLogo").src = currentApp.logo;
  document.getElementById("appName").textContent = appName;
  document.getElementById(
    "screenCount"
  ).textContent = `Total ${currentApp.screenshots.length} screens are saved`;

  // Render screenshots grid
  const screenshotsGrid = document.getElementById("screenshotsGrid");
  screenshotsGrid.innerHTML = currentApp.screenshots
    .map(
      (screenshot, index) => `
    <div class="screenshot-card" onclick="openImageModal('${screenshot.url}')">
      <img src="${screenshot.url}" alt="${
        screenshot.alt || "Screenshot"
      }" class="screenshot-image">
      <div class="screenshot-actions">
        <button class="download-btn" onclick="event.stopPropagation(); downloadImage('${
          screenshot.url
        }', '${appName}', ${index})">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M10 14L5 9l1.41-1.41L9 10.17V2h2v8.17l2.59-2.58L15 9l-5 5zm-7 4h14v2H3v-2z" fill="currentColor"/>
          </svg>
          Download
        </button>
      </div>
    </div>
  `
    )
    .join("");
}

// Open image modal
function openImageModal(imageUrl) {
  currentImageUrl = imageUrl;
  const modal = document.getElementById("imageModal");
  const modalImage = document.getElementById("modalImage");

  modalImage.src = imageUrl;
  modal.classList.add("visible");
}

// Close modal
function closeImageModal() {
  const modal = document.getElementById("imageModal");
  modal.classList.remove("visible");
  currentImageUrl = null;
}

// Download single image
async function downloadImage(url, appName, index) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `${appName}-screenshot-${index + 1}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Error downloading image:", error);
    alert("Failed to download image. Please try again.");
  }
}

// Download image from modal
function downloadCurrentImage() {
  if (!currentImageUrl) return;

  const appName = getAppNameFromUrl();
  const index = currentApp.screenshots.findIndex(
    (s) => s.url === currentImageUrl
  );
  downloadImage(currentImageUrl, appName, index);
}

// Event listeners
document.getElementById("backBtn").addEventListener("click", () => {
  window.location.href = "dashboard.html";
});

document
  .getElementById("closeModal")
  .addEventListener("click", closeImageModal);

document.getElementById("imageModal").addEventListener("click", (e) => {
  if (e.target.id === "imageModal") {
    closeImageModal();
  }
});

document
  .getElementById("downloadImageBtn")
  .addEventListener("click", downloadCurrentImage);

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeImageModal();
  }
});

// Initialize
loadAppData();
