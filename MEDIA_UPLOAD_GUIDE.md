# Media Upload System for Reddit CDN

This system automatically uploads puzzle images from `assets/Puzzles` and sound files from `assets/Sounds` to Reddit's CDN, reducing your app bundle size and improving performance.

## 🚀 **Server Endpoints**

### Auto-Upload Puzzle Images
```
POST /api/auto-upload-puzzles
```
Scans `assets/Puzzles` directory and uploads all images to CDN.

### Auto-Upload Sound Files  
```
POST /api/auto-upload-sounds
```
Scans `assets/Sounds` directory and uploads all audio files to CDN.

### Manual Upload Puzzle Image
```
POST /api/upload-puzzle-image
Content-Type: application/json

{
  "imageUrl": "https://example.com/puzzle-image.jpg",
  "puzzleId": "nature-waterfall"
}
```

### Manual Upload Background Music
```
POST /api/upload-music
Content-Type: application/json

{
  "musicUrl": "https://example.com/background-music.mp3",
  "trackId": "ambient-puzzle"
}
```

### Get All Uploaded Images
```
GET /api/puzzle-images
```

### Get All Uploaded Music
```
GET /api/music-tracks
```

## 📱 **Client Usage**

### MediaManager Class

```typescript
import { MediaManager } from './utils/mediaManager';

// Upload a puzzle image
const cdnUrl = await MediaManager.uploadPuzzleImage(
  'https://example.com/image.jpg', 
  'puzzle-id'
);

// Upload background music
const musicCdnUrl = await MediaManager.uploadMusic(
  'https://example.com/music.mp3', 
  'track-id'
);

// Preload all media from CDN
await MediaManager.preloadAllMedia();

// Get cached CDN URL
const cachedUrl = MediaManager.getCachedPuzzleImage('puzzle-id');
```

### AdminUploader Utility

```typescript
import { AdminUploader } from './utils/adminUploader';

// Auto-upload all assets from local directories (run once during development)
await AdminUploader.uploadAllDefaultAssets();

// Auto-upload only puzzle images from assets/Puzzles
await AdminUploader.uploadDefaultPuzzleImages();

// Auto-upload only sound files from assets/Sounds  
await AdminUploader.uploadDefaultMusic();

// Upload a single puzzle image (manual)
await AdminUploader.uploadSinglePuzzleImage(
  'https://example.com/image.jpg', 
  'puzzle-id'
);

// Upload a single music track (manual)
await AdminUploader.uploadSingleMusicTrack(
  'https://example.com/music.mp3', 
  'track-id'
);
```

## 🔧 **Development Workflow**

### 1. Initial Setup
1. **Add your puzzle images** to `src/client/public/assets/Puzzles/`
   - Supported formats: JPG, PNG, WebP
   - Recommended size: 800x600 or higher
   - Name files descriptively (e.g., `waterfall.jpg`, `forest.png`)

2. **Add your sound files** to `src/client/public/assets/Sounds/`
   - Supported formats: MP3, OGG, WAV
   - Background music: `bg1.mp3`, `bg2.mp3`, etc.
   - Theme music: `t1.mp3`, `t2.mp3`, etc.
   - Sound effects: `chime.wav`, `cursor.wav`, etc.

3. **Run the auto-upload process** once to populate the CDN:
   ```javascript
   // In browser console during development
   await AdminUploader.uploadAllDefaultAssets();
   ```

### 2. Game Integration
The `Leisure` scene automatically:
- Preloads media from CDN in the background
- Falls back to local assets if CDN images aren't available
- Caches CDN URLs for better performance

### 3. Adding New Puzzles
1. **Add image file** to `assets/Puzzles/new-puzzle.jpg`
2. **Run auto-upload** to upload the new image:
   ```javascript
   await AdminUploader.uploadDefaultPuzzleImages();
   ```
3. **Add to puzzle data** in `Leisure.ts`:
   ```typescript
   const newPuzzle = {
     id: 'new-puzzle-id',
     title: 'New Puzzle',
     imageKey: 'puzzle-new',
     imagePath: 'assets/Puzzles/new-puzzle.jpg', // Local path as fallback
     pieces: 35,
     difficulty: 'medium',
     completed: false,
     stars: 0,
   };
   ```

### 4. Directory Structure
```
src/client/public/assets/
├── Puzzles/           # Puzzle images (auto-uploaded)
│   ├── waterfall.jpg
│   ├── forest.jpg
│   ├── beach.jpg
│   └── mountain.jpg
└── Sounds/            # Audio files (auto-uploaded)
    ├── bg1.mp3        # Background music
    ├── bg2.mp3
    ├── t1.mp3         # Theme music
    ├── chime.wav      # Sound effects
    └── cursor.wav
```

## 💾 **Data Storage**

### Redis Keys
- `puzzle:media:{puzzleId}` - Individual puzzle image data
- `music:media:{trackId}` - Individual music track data
- `puzzle:media:list` - List of all uploaded puzzle IDs
- `music:media:list` - List of all uploaded track IDs

### Stored Data Structure
```typescript
// Puzzle Image Data
{
  cdnUrl: string;        // Reddit CDN URL
  originalUrl: string;   // Original source URL
  uploadedAt: number;    // Timestamp
  puzzleId: string;      // Unique puzzle identifier
}

// Music Track Data
{
  cdnUrl: string;        // Reddit CDN URL
  originalUrl: string;   // Original source URL
  uploadedAt: number;    // Timestamp
  trackId: string;       // Unique track identifier
}
```

## 🎯 **Benefits**

1. **Reduced Bundle Size**: Images and music aren't included in your app bundle
2. **Better Performance**: Assets served from Reddit's CDN are faster
3. **Dynamic Content**: Easy to add new puzzles without redeploying
4. **Caching**: Client-side caching reduces repeated API calls
5. **Fallback Support**: Graceful fallback to local assets if CDN fails

## ⚠️ **Important Notes**

1. **Media Upload API**: The current implementation uses placeholder URLs. You'll need to implement the actual Reddit media upload API when it becomes available.

2. **URL Sources**: Make sure your source URLs are publicly accessible and serve the correct MIME types.

3. **File Formats**: 
   - Images: JPG, PNG, WebP
   - Audio: MP3, OGG, WAV

4. **Size Limits**: Check Devvit documentation for current file size limits.

5. **CORS**: Ensure your source URLs allow cross-origin requests.

## 🔄 **Migration from Local Assets**

1. Upload existing local assets to CDN using `AdminUploader`
2. Update puzzle data to reference CDN URLs
3. Keep local assets as fallbacks during transition
4. Remove local assets once CDN is fully populated

This system provides a robust foundation for managing media assets in your Reddit puzzle game while maintaining excellent performance and user experience.
