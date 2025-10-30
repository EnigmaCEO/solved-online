import { 
  MediaUploadResponse, 
  PuzzleImagesResponse, 
  MusicTracksResponse,
  PuzzleImageData,
  MusicTrackData 
} from '../../shared/types/api';

export class MediaManager {
  private static puzzleImageCache: Map<string, string> = new Map();
  private static musicTrackCache: Map<string, string> = new Map();

  /**
   * Upload a puzzle image to Reddit CDN
   */
  static async uploadPuzzleImage(imageUrl: string, puzzleId: string): Promise<string | null> {
    try {
      const response = await fetch('/api/upload-puzzle-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          puzzleId,
        }),
      });

      const result: MediaUploadResponse = await response.json();
      
      if (result.status === 'success' && result.cdnUrl) {
        // Cache the CDN URL
        this.puzzleImageCache.set(puzzleId, result.cdnUrl);
        return result.cdnUrl;
      } else {
        console.error('Failed to upload puzzle image:', result.message);
        return null;
      }
    } catch (error) {
      console.error('Error uploading puzzle image:', error);
      return null;
    }
  }

  /**
   * Upload background music to Reddit CDN
   */
  static async uploadMusic(musicUrl: string, trackId: string): Promise<string | null> {
    try {
      const response = await fetch('/api/upload-music', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          musicUrl,
          trackId,
        }),
      });

      const result: MediaUploadResponse = await response.json();
      
      if (result.status === 'success' && result.cdnUrl) {
        // Cache the CDN URL
        this.musicTrackCache.set(trackId, result.cdnUrl);
        return result.cdnUrl;
      } else {
        console.error('Failed to upload music:', result.message);
        return null;
      }
    } catch (error) {
      console.error('Error uploading music:', error);
      return null;
    }
  }

  /**
   * Get all uploaded puzzle images from the server
   */
  static async getPuzzleImages(): Promise<PuzzleImageData[]> {
    try {
      const response = await fetch('/api/puzzle-images');
      const result: PuzzleImagesResponse = await response.json();
      
      if (result.status === 'success' && result.images) {
        // Update cache
        result.images.forEach(image => {
          this.puzzleImageCache.set(image.puzzleId, image.cdnUrl);
        });
        return result.images;
      } else {
        console.error('Failed to fetch puzzle images:', result.message);
        return [];
      }
    } catch (error) {
      console.error('Error fetching puzzle images:', error);
      return [];
    }
  }

  /**
   * Get all uploaded music tracks from the server
   */
  static async getMusicTracks(): Promise<MusicTrackData[]> {
    try {
      const response = await fetch('/api/music-tracks');
      const result: MusicTracksResponse = await response.json();
      
      if (result.status === 'success' && result.tracks) {
        // Update cache
        result.tracks.forEach(track => {
          this.musicTrackCache.set(track.trackId, track.cdnUrl);
        });
        return result.tracks;
      } else {
        console.error('Failed to fetch music tracks:', result.message);
        return [];
      }
    } catch (error) {
      console.error('Error fetching music tracks:', error);
      return [];
    }
  }

  /**
   * Get cached CDN URL for a puzzle image
   */
  static getCachedPuzzleImage(puzzleId: string): string | null {
    return this.puzzleImageCache.get(puzzleId) || null;
  }

  /**
   * Get cached CDN URL for a music track
   */
  static getCachedMusicTrack(trackId: string): string | null {
    return this.musicTrackCache.get(trackId) || null;
  }

  /**
   * Auto-upload all assets from local directories
   */
  static async autoUploadAllAssets(): Promise<void> {
    try {
      console.log('🚀 Starting auto-upload of all local assets...');
      
      // Upload puzzle images from assets/Puzzles
      const puzzleResponse = await fetch('/api/auto-upload-puzzles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      // Upload sound files from assets/Sounds  
      const soundResponse = await fetch('/api/auto-upload-sounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const puzzleResult = await puzzleResponse.json();
      const soundResult = await soundResponse.json();

      if (puzzleResult.status === 'success' && soundResult.status === 'success') {
        console.log('✅ All assets auto-uploaded successfully');
        // Refresh cache with new uploads
        await this.preloadAllMedia();
      } else {
        console.error('❌ Some assets failed to upload');
      }
    } catch (error) {
      console.error('Error auto-uploading assets:', error);
    }
  }

  /**
   * Initialize the media system - auto-upload assets if needed, then preload
   */
  static async initializeMediaSystem(): Promise<void> {
    try {
      console.log('🚀 Initializing media system...');
      
      // First, try to get existing media
      const [existingImages, existingTracks] = await Promise.all([
        this.getPuzzleImages(),
        this.getMusicTracks(),
      ]);

      // Check if we have invalid JPG entries that need to be cleared
      const hasInvalidJpgEntries = existingImages.some(img => 
        img.cdnUrl && (img.cdnUrl.includes('.jpg') || img.cdnUrl.includes('waterfall.jpg') || img.cdnUrl.includes('forest.jpg'))
      );

      if (hasInvalidJpgEntries) {
        console.log('🔧 Detected invalid JPG entries, clearing and re-uploading...');
        await this.clearPuzzleImages();
        await this.autoUploadAllAssets();
      } else if (existingImages.length === 0 || existingTracks.length === 0) {
        console.log('📁 No CDN media found, auto-uploading from local directories...');
        await this.autoUploadAllAssets();
      }

      // Preload all media into cache
      await this.preloadAllMedia();
      
      console.log('✅ Media system initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing media system:', error);
      // Continue without CDN - game will use local assets
    }
  }

  /**
   * Preload all media from the server into cache
   */
  static async preloadAllMedia(): Promise<void> {
    try {
      await Promise.all([
        this.getPuzzleImages(),
        this.getMusicTracks(),
      ]);
      console.log('All media preloaded successfully');
    } catch (error) {
      console.error('Error preloading media:', error);
    }
  }

  /**
   * Clear all uploaded puzzle images from CDN
   */
  static async clearPuzzleImages(): Promise<boolean> {
    try {
      const response = await fetch('/api/clear-puzzle-images', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();
      
      if (result.status === 'success') {
        console.log(`✅ ${result.message}`);
        // Clear local cache
        this.puzzleImageCache.clear();
        return true;
      } else {
        console.error('❌ Failed to clear puzzle images:', result.message);
        return false;
      }
    } catch (error) {
      console.error('Error clearing puzzle images:', error);
      return false;
    }
  }

  /**
   * Clear all uploaded music tracks from CDN
   */
  static async clearMusicTracks(): Promise<boolean> {
    try {
      const response = await fetch('/api/clear-music-tracks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();
      
      if (result.status === 'success') {
        console.log(`✅ ${result.message}`);
        // Clear local cache
        this.musicTrackCache.clear();
        return true;
      } else {
        console.error('❌ Failed to clear music tracks:', result.message);
        return false;
      }
    } catch (error) {
      console.error('Error clearing music tracks:', error);
      return false;
    }
  }

  /**
   * Clear all uploaded media (both images and music) from CDN
   */
  static async clearAllMedia(): Promise<boolean> {
    try {
      const response = await fetch('/api/clear-all-media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();
      
      if (result.status === 'success') {
        console.log(`✅ ${result.message}`);
        // Clear local cache
        this.clearCache();
        return true;
      } else {
        console.error('❌ Failed to clear all media:', result.message);
        return false;
      }
    } catch (error) {
      console.error('Error clearing all media:', error);
      return false;
    }
  }

  /**
   * Clear old media and re-upload fresh from local directories
   */
  static async clearAndReuploadAllMedia(): Promise<void> {
    try {
      console.log('🧹 Clearing old media uploads...');
      
      // Clear all existing media
      const cleared = await this.clearAllMedia();
      
      if (cleared) {
        console.log('📁 Re-uploading fresh media from local directories...');
        
        // Re-upload everything from local directories
        await this.autoUploadAllAssets();
        
        console.log('✅ Media refresh completed successfully!');
      } else {
        console.error('❌ Failed to clear old media, skipping re-upload');
      }
    } catch (error) {
      console.error('Error during media refresh:', error);
    }
  }

  /**
   * Clear all cached media
   */
  static clearCache(): void {
    this.puzzleImageCache.clear();
    this.musicTrackCache.clear();
  }
}
