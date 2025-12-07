# Mobbin Image Extractor - Chrome Extension

A beautiful Chrome extension that extracts high-quality images from Mobbin and organizes them in a clean dashboard by app name.

## ✨ Features

- 🔄 **Auto-scroll** through Mobbin pages with virtualized content
- 🖼️ **Extracts high-quality URLs** by removing CDN compression parameters
- 📱 **App Logo Detection** - Automatically extracts app logos
- 📊 **Beautiful Dashboard** - Organized by app with search functionality
- 🖼️ **Image Preview Modal** - Click to view images full-size
- ⬇️ **Download Images** - Download individual screenshots
- 🎯 **Automatic Deduplication** of images
- 💾 **Persistent Storage** - All data saved in Chrome storage
- ⚙️ **Configurable** scroll speed and amount

## 📁 Complete File Structure

```
mobbin-extractor/
├── manifest.json          # Extension configuration
├── background.js          # Service worker
├── content.js             # Page scanner (extracts images & app info)
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic
├── styles.css             # Popup styles
├── dashboard.html         # Main dashboard page
├── dashboard.js           # Dashboard logic
├── dashboard.css          # Dashboard & detail page styles
├── app-detail.html        # App detail page with screenshots
├── app-detail.js          # App detail page logic
├── icon16.png             # Extension icon (16x16)
├── icon48.png             # Extension icon (48x48)
└── icon128.png            # Extension icon (128x128)
```

## 🚀 Installation

### Method 1: Load Unpacked (Developer Mode)

1. **Download all the extension files** and place them in a folder

2. **Create placeholder icons** (or use real icons):
   - `icon16.png` (16x16 pixels)
   - `icon48.png` (48x48 pixels)
   - `icon128.png` (128x128 pixels)

3. **Open Chrome Extensions page:**
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)

4. **Load the extension:**
   - Click "Load unpacked"
   - Select the folder containing your extension files

## 📖 How to Use

### Step 1: Scan a Mobbin Page

1. **Navigate to a Mobbin app page** (e.g., Nike Training Club screenshots)
2. **Click the extension icon** in your Chrome toolbar
3. **Configure settings** (optional):
   - Scroll delay: Time to wait between scrolls (default: 800ms)
   - Scroll amount: Pixels to scroll each time (default: 800px)
4. **Click "▶ Start"** to begin scanning
5. Watch as it auto-scrolls and collects screenshots
6. **Wait for completion** or click "⏸ Stop" to stop early

### Step 2: View Your Dashboard

1. **Click "📊 View Dashboard"** in the popup
2. See all your collected apps organized beautifully
3. **Search** for specific apps using the search box
4. **Click on any app** to view its screenshots

### Step 3: View & Download Screenshots

1. On the app detail page, see all screenshots in a grid
2. **Click any screenshot** to view it full-size in a modal
3. **Hover over screenshots** to see download button
4. **Click Download** to save individual images

## 🎨 What Makes This Extension Special

### Smart App Detection
- Automatically extracts app name from the page
- Finds and saves the app logo
- Organizes everything by app name

### Beautiful UI
- Clean, modern dashboard design
- Responsive grid layouts
- Smooth animations and transitions
- Full-size image preview modal

### Persistent Storage
- All data saved in Chrome's local storage
- Survives browser restarts
- No external servers needed
- Privacy-focused design

### High-Quality Images
The extension transforms Mobbin's tiny thumbnails:
- `?w=15&q=85` (15px blurred thumbnails) 
- → `?w=1200&q=95` (1200px high-quality images)

## 🎯 Data Structure

The extension stores data in Chrome storage like this:

```javascript
{
  "mobbinApps": {
    "Nike Training Club": {
      "logo": "https://bytescale.mobbin.com/.../app_logos/xxx.webp",
      "screenshots": [
        {
          "url": "https://bytescale.mobbin.com/.../app_screens/xxx.png?w=1200&q=95",
          "alt": "Screenshot description"
        }
      ],
      "lastUpdated": 1234567890
    },
    "Another App": {
      // ...
    }
  }
}
```

## ⚙️ Configuration Tips

- **Slower connections**: Increase scroll delay to 1500-2000ms
- **Faster scanning**: Decrease scroll delay to 500ms
- **Dense content**: Decrease scroll amount to 400-600px
- **Sparse content**: Increase scroll amount to 1000-1500px

## 🐛 Troubleshooting

**Extension doesn't appear:**
- Make sure Developer mode is enabled
- Check that all files are in the same folder
- Reload the extension from `chrome://extensions/`

**Not finding images:**
- Make sure you're on a Mobbin page with app screenshots
- Try increasing the scroll delay
- Check the browser console for errors

**Dashboard is empty:**
- Make sure you've completed at least one scan
- Check Chrome DevTools Console for errors
- Try rescanning a page

**App name not detected:**
- The extension looks for app logos and page headings
- If detection fails, it uses the page title
- You can manually rename apps in the storage (advanced)

## 🔒 Privacy & Security

- **No data collection**: Everything runs locally in your browser
- **No external servers**: No data is sent anywhere except Mobbin's CDN
- **Open source**: All code is visible and auditable
- **Offline capable**: Dashboard works offline once data is collected

## 🎓 Technical Details

### How It Works

1. **Content Script** (`content.js`):
   - Runs on all Mobbin pages
   - Extracts app logo and name
   - Auto-scrolls to trigger lazy-loading
   - Collects all screenshot URLs
   - Saves to Chrome storage

2. **Background Service Worker** (`background.js`):
   - Manages communication between popup and content script
   - Maintains scanning state

3. **Popup** (`popup.html/js`):
   - Controls for starting/stopping scans
   - Real-time progress updates
   - Button to open dashboard

4. **Dashboard** (`dashboard.html/js`):
   - Displays all collected apps
   - Search functionality
   - Links to app detail pages

5. **App Detail** (`app-detail.html/js`):
   - Shows all screenshots for one app
   - Image preview modal
   - Download functionality

### Technologies Used

- **Chrome Extension Manifest V3**
- **Chrome Storage API** for data persistence
- **Vanilla JavaScript** (no frameworks)
- **Modern CSS** with Grid and Flexbox
- **Responsive Design**

## 📝 License

Free to use for personal projects. Always respect Mobbin's terms of service and copyright laws.

## ⚠️ Disclaimer

This tool is for educational purposes. Users are responsible for:
- Respecting Mobbin's terms of service
- Following copyright laws
- Using collected images appropriately
- Not redistributing or commercializing extracted content

---

**Made with ❤️ for designers and developers who love Mobbin**