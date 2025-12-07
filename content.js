// Content script for Mobbin Image Extractor
// Runs on all Mobbin pages

let scanningActive = false;
let shouldStop = false;
let images = new Set();
let appName = "";
let appLogo = "";

console.log("Mobbin Image Extractor content script loaded");

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "START_SCAN") {
    startScanning(request.scrollDelay, request.scrollAmount);
    sendResponse({ success: true });
  } else if (request.type === "STOP_SCAN") {
    stopScanning();
    sendResponse({ success: true });
  }
  return true;
});

function extractAppInfo() {
  // Reset app info for new scan
  appName = "";
  appLogo = "";

  // Strategy 1: Find app logo with specific selectors
  const logoImg = document.querySelector(
    'img[src*="app_logos"][alt*="logo" i], ' +
      'img[data-sentry-component="AppLogoImage"], ' +
      'img[alt*="logo" i]'
  );

  if (logoImg && logoImg.src.includes("app_logos")) {
    appLogo = logoImg.src;

    // Extract app name from alt text
    if (logoImg.alt) {
      appName = logoImg.alt.replace(/logo/gi, "").replace(/app/gi, "").trim();
    }
  }

  // Strategy 2: If no app name yet, try to find it from heading or title
  if (!appName) {
    const heading = document.querySelector(
      'h1[class*="app" i], h2[class*="app" i], h1, h2'
    );
    if (heading) {
      appName = heading.textContent.trim();
    }
  }

  // Strategy 3: Extract from URL or page title
  if (!appName) {
    const urlMatch = window.location.pathname.match(/\/apps\/([^\/]+)/);
    if (urlMatch && urlMatch[1]) {
      appName = decodeURIComponent(urlMatch[1])
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
    } else {
      appName = document.title.split("-")[0].trim() || "Unknown App";
    }
  }

  // Fallback logo if none found
  if (!appLogo) {
    appLogo =
      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="%23d1d5db"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23666" font-size="60" font-family="Arial">?</text></svg>';
  }

  console.log("Extracted app info:", { appName, appLogo });
}

function extractImageUrl(url) {
  // Remove Mobbin's CDN transformations to get higher quality
  if (!url || !url.includes("bytescale.mobbin.com")) return null;

  // Extract base URL before query params
  const baseUrl = url.split("?")[0];

  // Only process app_screens images (not logos or other images)
  if (!baseUrl.includes("/app_screens/")) return null;

  // Create high-quality version
  const highQualityUrl = baseUrl + "?f=webp&w=1200&q=95&fit=shrink-cover";

  return {
    originalUrl: url,
    highQualityUrl: highQualityUrl,
    baseUrl: baseUrl,
  };
}

function scanCurrentView() {
  // Find all images with Mobbin's CDN URLs
  const imgElements = document.querySelectorAll(
    'img[src*="bytescale.mobbin.com"]'
  );

  imgElements.forEach((img) => {
    // Skip logo images
    if (
      img.src.includes("app_logos") ||
      img.alt.toLowerCase().includes("logo") ||
      img.getAttribute("data-sentry-component") === "AppLogoImage"
    ) {
      return;
    }

    const urlData = extractImageUrl(img.src);
    if (urlData) {
      const imageData = {
        ...urlData,
        alt: img.alt || "",
        timestamp: Date.now(),
      };

      // Use baseUrl as unique key
      const key = urlData.baseUrl;
      if (!Array.from(images).find((i) => i.baseUrl === key)) {
        images.add(imageData);
      }
    }
  });

  // Also check background images
  const divsWithBg = document.querySelectorAll(
    'div[style*="background-image"]'
  );
  divsWithBg.forEach((div) => {
    const style = div.style.backgroundImage;
    const match = style.match(/url\(['"]?(.*?)['"]?\)/);
    if (match && match[1]) {
      const urlData = extractImageUrl(match[1]);
      if (urlData) {
        const key = urlData.baseUrl;
        if (!Array.from(images).find((i) => i.baseUrl === key)) {
          images.add({ ...urlData, alt: "", timestamp: Date.now() });
        }
      }
    }
  });

  return Array.from(images);
}

async function saveToStorage(screenshots) {
  if (!appName) {
    console.error("No app name found");
    return;
  }

  try {
    // Get existing data
    const result = await chrome.storage.local.get(["mobbinApps"]);
    const mobbinApps = result.mobbinApps || {};

    // Check if app already exists and merge screenshots
    if (mobbinApps[appName]) {
      console.log("App already exists, merging screenshots...");

      // Get existing screenshot URLs
      const existingUrls = new Set(
        mobbinApps[appName].screenshots.map((s) => s.url)
      );

      // Add new screenshots that don't exist
      const newScreenshots = screenshots
        .map((s) => ({
          url: s.highQualityUrl,
          alt: s.alt || "",
        }))
        .filter((s) => !existingUrls.has(s.url));

      // Merge with existing
      mobbinApps[appName].screenshots = [
        ...mobbinApps[appName].screenshots,
        ...newScreenshots,
      ];

      mobbinApps[appName].lastUpdated = Date.now();

      console.log(
        `Added ${newScreenshots.length} new screenshots. Total: ${mobbinApps[appName].screenshots.length}`
      );
    } else {
      // Create new app entry
      console.log("Creating new app entry...");
      mobbinApps[appName] = {
        logo: appLogo,
        screenshots: screenshots.map((s) => ({
          url: s.highQualityUrl,
          alt: s.alt || "",
        })),
        lastUpdated: Date.now(),
      };
    }

    // Save back to storage
    await chrome.storage.local.set({ mobbinApps });
    console.log(
      "Saved to storage:",
      appName,
      mobbinApps[appName].screenshots.length,
      "total screenshots"
    );
  } catch (error) {
    console.error("Error saving to storage:", error);
  }
}

async function startScanning(scrollDelay = 800, scrollAmount = 800) {
  if (scanningActive) {
    console.log("Scan already in progress");
    return;
  }

  scanningActive = true;
  shouldStop = false;
  images = new Set(); // Reset images for new scan

  // Extract app info first
  extractAppInfo();

  if (!appName) {
    console.error("Failed to extract app name");
    chrome.runtime.sendMessage({
      type: "SCAN_STOPPED",
      images: [],
      appName: "Unknown App",
      error: "Could not detect app name",
    });
    scanningActive = false;
    return;
  }

  console.log("Starting scan for:", appName);
  console.log(
    "Scan settings - delay:",
    scrollDelay,
    "scroll amount:",
    scrollAmount
  );

  // Scroll to top first
  window.scrollTo(0, 0);
  await new Promise((resolve) => setTimeout(resolve, 500));

  let currentImages = scanCurrentView();

  // Send initial update
  chrome.runtime.sendMessage({
    type: "IMAGE_UPDATE",
    images: currentImages,
    appName: appName,
    scrollProgress: 0,
  });

  let scrollCount = 0;
  let lastScrollHeight = 0;
  let stableScrollCount = 0;
  const maxScrolls = 1000; // Safety limit

  while (!shouldStop && scrollCount < maxScrolls) {
    const scrollHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY;
    const clientHeight = window.innerHeight;

    // Scroll down
    window.scrollBy({
      top: scrollAmount,
      behavior: "smooth",
    });
    scrollCount++;

    // Wait for content to load
    await new Promise((resolve) => setTimeout(resolve, scrollDelay));

    // Scan for new images
    currentImages = scanCurrentView();

    // Calculate progress
    const progress = Math.min(
      95,
      (scrollTop / (scrollHeight - clientHeight)) * 100
    );

    // Send update
    chrome.runtime.sendMessage({
      type: "IMAGE_UPDATE",
      images: currentImages,
      appName: appName,
      scrollProgress: progress,
    });

    // Check if we've reached the bottom
    const newScrollTop = window.scrollY;
    if (newScrollTop + clientHeight >= scrollHeight - 10) {
      stableScrollCount++;
      if (stableScrollCount >= 3) {
        console.log("Reached bottom of page");
        break;
      }
    } else {
      stableScrollCount = 0;
    }

    // Check if scroll hasn't changed (stuck)
    if (Math.abs(scrollHeight - lastScrollHeight) < 10) {
      stableScrollCount++;
      if (stableScrollCount >= 5) {
        console.log("Page not loading new content");
        break;
      }
    } else {
      stableScrollCount = 0;
    }

    lastScrollHeight = scrollHeight;
  }

  // Final scan
  currentImages = scanCurrentView();

  // Save to storage
  await saveToStorage(currentImages);

  if (shouldStop) {
    console.log("Scan stopped by user");
    chrome.runtime.sendMessage({
      type: "SCAN_STOPPED",
      images: currentImages,
      appName: appName,
    });
  } else {
    console.log("Scan complete");
    chrome.runtime.sendMessage({
      type: "SCAN_COMPLETE",
      images: currentImages,
      appName: appName,
    });
  }

  scanningActive = false;
}

function stopScanning() {
  console.log("Stop requested");
  shouldStop = true;
}

// Add visual indicator when scanning
const style = document.createElement("style");
style.textContent = `
  .mobbin-extractor-indicator {
    position: fixed;
    top: 20px;
    right: 20px;
    background: #2563eb;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 999999;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    animation: pulse 2s ease-in-out infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
`;
document.head.appendChild(style);
