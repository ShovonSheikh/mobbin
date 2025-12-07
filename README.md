# Mobbin Extractor Chrome Extension

Professional screenshot collection tool for Mobbin.com with a sleek black and white interface.

## 📦 Installation

1. **Create Extension Folder**
   ```
   mobbin-extractor/
   ├── manifest.json
   ├── popup.html
   ├── popup.js
   ├── content.js
   ├── dashboard.html
   ├── dashboard.js
   └── background.js
   ```

2. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the folder containing all extension files
   - The extension is now installed (no icon will appear, but it will be in your extensions)

## 🚀 How to Use

### Collecting Screenshots

1. **Visit a Mobbin App Page**
   - Go to `https://mobbin.com/apps/[any-app]`
   - Example: `https://mobbin.com/apps/instagram`

2. **Open Extension**
   - Click the extension icon in Chrome toolbar (or from extensions menu)
   - The popup will show the detected app name
   - Click "Start Scan"

3. **Automatic Collection**
   - The extension automatically scrolls through the entire page
   - Collects all screenshot URLs
   - Downloads them in high resolution (1200px width)
   - Saves everything locally in your browser

4. **View Dashboard**
   - Click "View Dashboard" in the popup
   - Or open it directly from the extensions menu

### Using the Dashboard

**Apps Grid View**
- See all collected apps with their icons
- Shows screenshot count for each app
- Click any app card to view its screens

**App Detail View**
- Shows app icon and name at the top
- Grid of all collected screenshots
- Hover over any screenshot to see download button
- Click any screenshot to view full resolution in sidebar

**Sidebar Preview**
- Opens with smooth slide-from-right animation
- Shows full resolution image
- Click outside or press ESC to close

**Back Button**
- Floating button appears when scrolling or in detail view
- Click to return to apps grid or scroll to top
- Also works with ESC key

## ✨ Features

- **Automatic Detection** - Extracts app name, icon, and screenshots from Mobbin's structure
- **High Quality** - Downloads 1200px resolution images
- **Smart Organization** - Groups by app with icons and metadata
- **Professional UI** - Clean black and white design
- **Smooth Animations** - Slide-in sidebar, hover effects
- **Keyboard Shortcuts** - ESC to close/back
- **Local Storage** - Everything stored privately in your browser
- **No Icons Needed** - Works without custom icons

## 🎨 Design Features

- Pure black (#000) and white (#fff) theme
- Professional typography with Inter/SF Pro
- Outlined icons (Lucide-style SVG)
- Smooth transitions and hover states
- Responsive grid layouts
- Fixed floating back button
- Slide-from-right sidebar animation
- Clean borders and spacing

## 🔧 Technical Details

### Data Structure
```javascript
{
  apps: {
    "app-id": {
      id: "app-id",
      name: "App Name",
      icon: "icon-url",
      screens: [
        {
          url: "base-url",
          data: "base64-image-data",
          timestamp: 1234567890
        }
      ],
      createdAt: 1234567890,
      updatedAt: 1234567890
    }
  }
}
```

### Image Extraction
The extension targets specific Mobbin elements:
- **App Icon**: `img[src*="app_logos"]`
- **App Name**: `h1.text-title-2` (first part before "—")
- **Screenshots**: `img[src*="app_screens"]`

It extracts the base URL pattern:
```
https://bytescale.mobbin.com/FW25bBB/image/mobbin.com/prod/content/app_screens/[UUID].png
```

Then requests high-res version:
```
https://bytescale.mobbin.com/.../[UUID].png?w=1200&q=95
```

### Permissions
- `activeTab` - Interact with current Mobbin page
- `storage` - Save screenshots locally
- `scripting` - Inject content script
- `https://mobbin.com/*` - Access Mobbin
- `https://bytescale.mobbin.com/*` - Download images

## 🛠️ Customization

### Adjust Scan Speed
In `content.js`, line 48:
```javascript
const scrollDelay = 1000; // milliseconds between scrolls
```

### Change Image Quality
In `content.js`, line 93:
```javascript
const highResUrl = `${url}?w=1200&q=95`; // width and quality
```

### Modify Theme Colors
In `dashboard.html` and `popup.html`, search for:
- Background: `#000` (pure black)
- Text: `#fff` (white)
- Borders: `#1a1a1a` (dark gray)
- Hover borders: `#333` (medium gray)
- Muted text: `#666` (gray)

## 🐛 Troubleshooting

**Extension not visible?**
- It has no icon by design
- Access from Chrome menu → Extensions icon → Mobbin Extractor

**No screenshots found?**
- Ensure you're on an app page (not homepage)
- URL should be: `mobbin.com/apps/[app-name]`
- Refresh the page and try again

**Scan stopped early?**
- Check console for errors (F12)
- Some apps have fewer screens than others
- The scan stops automatically at page bottom

**Images not loading?**
- Verify internet connection
- Check if Mobbin.com is accessible
- Clear browser cache and retry

**Storage full?**
- Chrome limits local storage to ~5-10MB
- Delete old apps from dashboard
- Export important screenshots before clearing

## 📝 Notes

- Works with Mobbin's current HTML structure (as of December 2024)
- If Mobbin updates their site, selectors may need adjustment
- All data stored as base64 in Chrome's local storage
- No external servers - completely private
- No analytics or tracking

## 🔒 Privacy

- 100% local storage in your browser
- No data sent to external servers
- No analytics or tracking
- No API calls except to Mobbin for images
- Your collection is completely private

## ⌨️ Keyboard Shortcuts

- `ESC` - Close sidebar or go back to apps view
- Click floating back button - Return to apps or scroll to top

## 🎯 Best Practices

1. **Scan one app at a time** for better organization
2. **Wait for scan to complete** before closing the tab
3. **Review dashboard regularly** to manage storage
4. **Download important screenshots** as external files for long-term storage
5. **Clear old collections** to free up space

## 📄 License

Free to use and modify for personal use.

---

**Build your design inspiration library with style! ✨**