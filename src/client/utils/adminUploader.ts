import { MediaManager } from './mediaManager';

/**
 * Admin utility for uploading puzzle images and music to Reddit CDN
 * This can be used during development to populate the CDN with assets
 */
export class AdminUploader {
  /**
   * Auto-upload all puzzle images from assets/Puzzles directory
   * Scans the local assets/Puzzles folder and uploads all images to CDN
   */
  static async uploadDefaultPuzzleImages(): Promise<void> {
    console.log('🖼️ Starting auto-upload of puzzle images from assets/Puzzles...');

    try {
      const response = await fetch('/api/auto-upload-puzzles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.status === 'success') {
        console.log(`✅ ${result.message}`);

        // Log individual results
        result.results?.forEach(
          (item: { status: string; filename: string; puzzleId?: string; error?: string }) => {
            if (item.status === 'success') {
              console.log(`  ✅ ${item.filename} → ${item.puzzleId}`);
            } else {
              console.error(`  ❌ ${item.filename} → Error: ${item.error}`);
            }
          }
        );
      } else {
        console.error('❌ Failed to auto-upload puzzle images:', result.message);
      }
    } catch (error) {
      console.error('❌ Error during puzzle image auto-upload:', error);
    }

    console.log('Puzzle image auto-upload completed');
  }

  /**
   * Auto-upload all sound files from assets/Sounds directory
   * Scans the local assets/Sounds folder and uploads all audio files to CDN
   */
  static async uploadDefaultMusic(): Promise<void> {
    console.log('🎵 Starting auto-upload of sound files from assets/Sounds...');

    try {
      const response = await fetch('/api/auto-upload-sounds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.status === 'success') {
        console.log(`✅ ${result.message}`);

        // Log individual results grouped by type
        type UploadItem = {
          status: string;
          filename: string;
          trackId?: string;
          type?: string;
          error?: string;
        };
        const byType = result.results?.reduce(
          (acc: Record<string, UploadItem[]>, item: UploadItem) => {
            const type = item.type || 'unknown';
            if (!acc[type]) acc[type] = [];
            acc[type].push(item);
            return acc;
          },
          {} as Record<string, UploadItem[]>
        );

        if (byType) {
          Object.entries(byType).forEach(([type, items]) => {
            console.log(`  📁 ${type.toUpperCase()} files:`);
            (items as UploadItem[]).forEach((item: UploadItem) => {
              if (item.status === 'success') {
                console.log(`    ✅ ${item.filename} → ${item.trackId}`);
              } else {
                console.error(`    ❌ ${item.filename} → Error: ${item.error}`);
              }
            });
          });
        }
      } else {
        console.error('❌ Failed to auto-upload sound files:', result.message);
      }
    } catch (error) {
      console.error('❌ Error during sound file auto-upload:', error);
    }

    console.log('Sound file auto-upload completed');
  }

  /**
   * Upload all default assets (images and music)
   */
  static async uploadAllDefaultAssets(): Promise<void> {
    console.log('🚀 Starting upload of all default assets to Reddit CDN...');

    try {
      await this.uploadDefaultPuzzleImages();
      await this.uploadDefaultMusic();
      console.log('🎉 All assets uploaded successfully!');
    } catch (error) {
      console.error('❌ Error during asset upload:', error);
    }
  }

  /**
   * Clear all old media and re-upload fresh from local directories
   */
  static async clearAndReuploadAllAssets(): Promise<void> {
    console.log('🧹 Starting fresh upload - clearing old media and re-uploading...');
    
    try {
      // Use MediaManager to clear and re-upload
      await MediaManager.clearAndReuploadAllMedia();
      console.log('🎉 Fresh upload completed successfully!');
    } catch (error) {
      console.error('❌ Error during fresh upload:', error);
    }
  }

  /**
   * Clear only puzzle images and re-upload
   */
  static async clearAndReuploadPuzzleImages(): Promise<void> {
    console.log('🧹 Clearing old puzzle images and re-uploading...');
    
    try {
      const cleared = await MediaManager.clearPuzzleImages();
      
      if (cleared) {
        console.log('📁 Re-uploading puzzle images from assets/Puzzles...');
        await this.uploadDefaultPuzzleImages();
        console.log('✅ Puzzle images refresh completed!');
      } else {
        console.error('❌ Failed to clear old puzzle images');
      }
    } catch (error) {
      console.error('❌ Error during puzzle images refresh:', error);
    }
  }

  /**
   * Clear only music tracks and re-upload
   */
  static async clearAndReuploadMusic(): Promise<void> {
    console.log('🧹 Clearing old music tracks and re-uploading...');
    
    try {
      const cleared = await MediaManager.clearMusicTracks();
      
      if (cleared) {
        console.log('📁 Re-uploading music from assets/Sounds...');
        await this.uploadDefaultMusic();
        console.log('✅ Music refresh completed!');
      } else {
        console.error('❌ Failed to clear old music tracks');
      }
    } catch (error) {
      console.error('❌ Error during music refresh:', error);
    }
  }

  /**
   * Fix invalid JPG entries and upload correct PNG files
   */
  static async fixPuzzleImages(): Promise<void> {
    console.log('🔧 Fixing invalid JPG entries and uploading correct PNG files...');
    
    try {
      // First clear all existing puzzle images (including invalid JPG entries)
      console.log('🧹 Clearing invalid JPG entries...');
      const cleared = await MediaManager.clearPuzzleImages();
      
      if (cleared) {
        console.log('📁 Uploading correct PNG files from assets/Puzzles...');
        await this.uploadDefaultPuzzleImages();
        console.log('✅ Puzzle images fixed successfully!');
        console.log('🎮 You can now reload the game to see the correct images.');
      } else {
        console.error('❌ Failed to clear old puzzle images');
      }
    } catch (error) {
      console.error('❌ Error during puzzle image fix:', error);
    }
  }

  /**
   * Upload a single puzzle image
   */
  static async uploadSinglePuzzleImage(imageUrl: string, puzzleId: string): Promise<string | null> {
    console.log(`Uploading puzzle image: ${puzzleId}`);

    try {
      const cdnUrl = await MediaManager.uploadPuzzleImage(imageUrl, puzzleId);

      if (cdnUrl) {
        console.log(`✅ Puzzle image uploaded: ${cdnUrl}`);
        return cdnUrl;
      } else {
        console.error(`❌ Failed to upload puzzle image: ${puzzleId}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error uploading puzzle image ${puzzleId}:`, error);
      return null;
    }
  }

  /**
   * Upload a single music track
   */
  static async uploadSingleMusicTrack(musicUrl: string, trackId: string): Promise<string | null> {
    console.log(`Uploading music track: ${trackId}`);

    try {
      const cdnUrl = await MediaManager.uploadMusic(musicUrl, trackId);

      if (cdnUrl) {
        console.log(`✅ Music track uploaded: ${cdnUrl}`);
        return cdnUrl;
      } else {
        console.error(`❌ Failed to upload music track: ${trackId}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error uploading music track ${trackId}:`, error);
      return null;
    }
  }
}

// Make it available globally for console access during development
if (typeof window !== 'undefined') {
  const globalWindow = window as unknown as Record<string, unknown>;
  globalWindow.AdminUploader = AdminUploader;
  globalWindow.MediaManager = MediaManager;
  
  // Add a quick fix function to the global scope
  globalWindow.fixJpgIssue = async () => {
    console.log('🔧 Quick fix: Clearing JPG entries and uploading PNG files...');
    try {
      await MediaManager.clearPuzzleImages();
      console.log('✅ Cleared old JPG entries');
      
      const response = await fetch('/api/auto-upload-puzzles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Uploaded PNG files:', result);
        
        // Clear local cache and reload
        MediaManager.clearCache();
        await MediaManager.getPuzzleImages();
        
        console.log('🎮 Please refresh the page to see the PNG images!');
      } else {
        console.error('❌ Failed to upload PNG files');
      }
    } catch (error) {
      console.error('❌ Error during fix:', error);
    }
  };
}
