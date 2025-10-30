import { Scene } from 'phaser';
import * as Phaser from 'phaser';

export class Preloader extends Scene {
  constructor() {
    super('Preloader');
  }

  init() {}

  preload() {
    //  Load the assets for the game - Replace with your own assets
    this.load.setPath('assets');

    // Add error handling for texture loading
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn('Failed to load asset:', file.key);
    });

    this.load.image('logo', 'logo.png');
    this.load.image('puzzle', 'puzzle.png');
  }

  async create() {
    // Check if this is a community puzzle post and go directly to Solve scene
    const isCommunityPuzzle = await this.checkForCommunityPuzzle();

    if (!isCommunityPuzzle) {
      this.scene.start('MainMenu');
    }
  }

  private async checkForCommunityPuzzle(): Promise<boolean> {
    try {
      const response = await fetch('/api/init');

      const data = await response.json();
      console.log('Initialization data:', data);
      const postId = data.postId;

      console.log('📝 Final post ID found:', postId);

      // Skip if postId is clearly not a Reddit post ID
      if (!postId || postId === 'index.html' || postId.includes('.') || postId.length < 5) {
        console.log('📝 No valid post ID found, not a community puzzle post');
      }

      if (postId) {
        console.log('🔍 CLIENT: Checking for community puzzle with post ID:', postId);
        console.log('📏 CLIENT: Post ID length:', postId.length);
        console.log('🔤 CLIENT: Post ID type:', typeof postId);
        console.log('🌐 CLIENT: Making request to:', `/api/community-puzzle/${postId}`);

        // Try to fetch community puzzle for this post
        const response = await fetch(`/api/community-puzzle/${postId}`);
        console.log('📡 CLIENT: Response status:', response.status);
        const data = await response.json();
        console.log('📦 CLIENT: Response data:', data);

        if (data.status === 'success' && data.puzzle) {
          console.log('✅ Community puzzle detected, starting directly:', data.puzzle);

          // This is a community puzzle post, start the puzzle directly
          const puzzle = data.puzzle;
          const gridDims = this.getDifficultyGridDimensions(puzzle.difficulty, puzzle.aspectRatio);
          const puzzleConfig = {
            image: puzzle.imageUrl,
            imageUrl: puzzle.imageUrl,
            gridCols: gridDims.cols,
            gridRows: gridDims.rows,
            difficulty: puzzle.difficulty,
            title: puzzle.title,
            puzzleId: puzzle.id,
            rotationEnabled: puzzle.difficulty !== 'easy',
            timedMode: false,
            timeLimit: 300,
          };

          this.scene.start('Solve', { puzzleConfig });
          return true;
        }
      }

      console.log('📝 No community puzzle detected, proceeding to MainMenu');
      return false;
    } catch (error) {
      console.error('❌ Error checking for community puzzle:', error);
      return false;
    }
  }

  private getDifficultyGridDimensions(
    difficulty: string,
    aspectRatio: number = 1.0
  ): { rows: number; cols: number } {
    let targetPieces: number;

    switch (difficulty) {
      case 'easy':
        targetPieces = 20; // 5x4 or 4x5
        break;
      case 'medium':
        targetPieces = 35; // 7x5 or 5x7
        break;
      case 'hard':
        targetPieces = 63; // 9x7 or 7x9
        break;
      case 'expert':
        targetPieces = 108; // 12x9 or 9x12
        break;
      default:
        targetPieces = 35;
        break;
    }

    // Calculate optimal grid dimensions based on aspect ratio
    const sqrt = Math.sqrt(targetPieces);
    let cols: number, rows: number;

    if (aspectRatio >= 1.0) {
      // Landscape or square - more columns than rows
      cols = Math.round(sqrt * Math.sqrt(aspectRatio));
      rows = Math.round(targetPieces / cols);
    } else {
      // Portrait - more rows than columns
      rows = Math.round(sqrt / Math.sqrt(aspectRatio));
      cols = Math.round(targetPieces / rows);
    }

    // Ensure we have reasonable minimums and the product is close to target
    cols = Math.max(3, cols);
    rows = Math.max(3, rows);

    // Adjust to get closer to target piece count
    const currentPieces = cols * rows;
    if (Math.abs(currentPieces - targetPieces) > 5) {
      if (currentPieces < targetPieces) {
        if (aspectRatio >= 1.0) {
          cols++;
        } else {
          rows++;
        }
      }
    }

    return { rows, cols };
  }
}
