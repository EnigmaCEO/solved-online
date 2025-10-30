# Quick Start: Auto-Upload Media System

## 🚀 **Quick Setup (3 Steps)**

### 1. Add Your Assets
```bash
# Add puzzle images to:
src/client/public/assets/Puzzles/
├── waterfall.jpg
├── forest.jpg  
├── beach.jpg
└── mountain.jpg

# Add sound files to:
src/client/public/assets/Sounds/
├── bg1.mp3        # Background music
├── bg2.mp3
├── t1.mp3         # Theme music
├── chime.wav      # Sound effects
└── cursor.wav
```

### 2. Auto-Upload Everything
```javascript
// In browser console during development:
await AdminUploader.uploadAllDefaultAssets();
```

### 3. Done! 
Your game now automatically uses CDN assets with local fallbacks.

## 📁 **Current Asset Mapping**

### Puzzle Images (assets/Puzzles/)
- `waterfall.jpg` → `nature-waterfall` puzzle
- `forest.jpg` → `nature-forest` puzzle  
- `beach.jpg` → `ocean-beach` puzzle
- `mountain.jpg` → `landscape-mountain` puzzle
- `saturn.jpg` → `space-saturn` puzzle
- `galaxy.jpg` → `space-galaxy` puzzle

### Sound Files (assets/Sounds/)
- `bg1.mp3` → `background-music-1` track
- `bg2.mp3` → `background-music-2` track
- `bg3.mp3` → `background-music-3` track
- `t1.mp3` → `theme-music-1` track
- `t2.mp3` → `theme-music-2` track
- `t3.mp3` → `theme-music-3` track
- `chime.wav` → `sound-chime` effect
- `cursor.wav` → `sound-cursor` effect
- `strike.wav` → `sound-strike` effect

## 🎮 **How It Works**

1. **Development**: Assets stored locally in `assets/` folders
2. **Auto-Upload**: Server scans directories and uploads to Reddit CDN
3. **Runtime**: Game loads from CDN with local fallback
4. **Caching**: CDN URLs cached for better performance

## 🔧 **Console Commands**

### **Upload Commands**
```javascript
// Upload all assets (puzzles + sounds)
await AdminUploader.uploadAllDefaultAssets();

// Upload only puzzle images
await AdminUploader.uploadDefaultPuzzleImages();

// Upload only sound files  
await AdminUploader.uploadDefaultMusic();
```

### **Clear & Re-upload Commands**
```javascript
// Clear all old media and re-upload fresh from local directories
await AdminUploader.clearAndReuploadAllAssets();

// Clear and re-upload only puzzle images
await AdminUploader.clearAndReuploadPuzzleImages();

// Clear and re-upload only music/sound files
await AdminUploader.clearAndReuploadMusic();

// Fix invalid JPG entries and upload correct PNG files
await AdminUploader.fixPuzzleImages();
```

### **Management Commands**
```javascript
// Check what's currently uploaded
await MediaManager.getPuzzleImages();
await MediaManager.getMusicTracks();

// Clear only local cache (not CDN)
MediaManager.clearCache();
await MediaManager.preloadAllMedia();

// Clear CDN media without re-uploading
await MediaManager.clearAllMedia();
await MediaManager.clearPuzzleImages();
await MediaManager.clearMusicTracks();
```

## ✅ **Benefits**

- **Smaller Bundle**: Assets not included in app bundle
- **Faster Loading**: CDN delivery is faster
- **Easy Updates**: Just replace files and re-upload
- **Automatic Fallback**: Uses local assets if CDN fails
- **No Code Changes**: Existing puzzle data works unchanged

## 🎯 **Next Steps**

1. **Replace placeholder images** with real puzzle images in `assets/Puzzles/`
2. **Add OGG audio files** for better web compatibility in `assets/Sounds/`
3. **Clear and re-upload** when you update assets:
   ```javascript
   await AdminUploader.clearAndReuploadAllAssets();
   ```
4. **Deploy and enjoy** faster loading times!

## 🔄 **When to Clear & Re-upload**

- **Added new puzzle images** → `clearAndReuploadPuzzleImages()`
- **Updated sound files** → `clearAndReuploadMusic()`  
- **Changed multiple assets** → `clearAndReuploadAllAssets()`
- **Invalid file entries** → `fixPuzzleImages()` (fixes JPG→PNG issues)
- **Testing different versions** → Clear and re-upload to ensure fresh CDN content

## 🚨 **Quick Fix for Current Issue**

If you're seeing "Failed to load asset" errors for JPG files:

```javascript
// Run this command to fix the invalid JPG entries and upload correct PNG files
await AdminUploader.fixPuzzleImages();
```

This will:
1. Clear all invalid JPG entries from Redis
2. Upload the correct PNG files (0-0.png, 0-1.png, etc.)
3. Update the puzzle mappings to use the actual files

## 📝 **Audio Format Support**

The system supports multiple audio formats:
- **MP3**: Good compatibility, larger file size
- **OGG**: Better compression, excellent web support
- **WAV**: Uncompressed, best quality, largest size

For best performance, use OGG format when possible. The system will auto-detect and upload both MP3 and OGG versions if available.

The system is designed to be zero-configuration - just add your assets and run the upload command!
