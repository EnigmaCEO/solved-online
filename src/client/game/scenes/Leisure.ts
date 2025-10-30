import { Scene, GameObjects } from 'phaser';
import * as Phaser from 'phaser';
import { MediaManager } from '../../utils/mediaManager';
import { PuzzleConfig, UserProgressData } from '../../../shared/types/api';

interface PuzzleData {
  id: string;
  title: string;
  imageKey: string;
  imagePath: string;
  pieces: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  bestTime?: number;
  bestScore?: number;
  completed: boolean;
  stars: number; // 0-3 stars based on performance
  perfectCompletion?: boolean;
  maxStreak?: number;
  unlocked: boolean;
}

interface SavedResult {
  puzzleId: string;
  bestTime: number;
  bestScore: number;
  moves: number; // Keep for backward compatibility
  completed: boolean;
  stars: number;
  perfectCompletion: boolean;
  maxStreak: number;
  timestamp: number;
}

interface DifficultyProgress {
  easy: { completed: number; total: number };
  medium: { completed: number; total: number };
  hard: { completed: number; total: number };
  expert: { completed: number; total: number };
}

export class Leisure extends Scene {
  private background!: GameObjects.Image;
  private scrollContainer!: GameObjects.Container;
  private puzzleCards: GameObjects.Container[] = [];
  private categoryButtons: GameObjects.Container[] = [];
  private currentCategory: string = 'all';
  private scrollY: number = 0;
  private maxScrollY: number = 0;
  private isDragging: boolean = false;
  private dragStartY: number = 0;
  private scrollStartY: number = 0;
  private difficultyProgress!: DifficultyProgress;

  // Puzzle data - sorted by difficulty for progression system
  // Using only confirmed existing images (0-0.png through 0-7.png)
  private puzzleData: PuzzleData[] = [
    // EASY - All start unlocked
    {
      id: 'nature-waterfall',
      title: 'Waterfall',
      imageKey: 'puzzle-waterfall',
      imagePath: 'assets/Puzzles/0-0.png',
      pieces: 20,
      difficulty: 'easy',
      completed: false,
      stars: 0,
      unlocked: true, // Easy puzzles start unlocked
    },
    {
      id: 'nature-forest',
      title: 'Forest Path',
      imageKey: 'puzzle-forest',
      imagePath: 'assets/Puzzles/0-1.png',
      pieces: 20,
      difficulty: 'easy',
      completed: false,
      stars: 0,
      unlocked: true,
    },
    
    // MEDIUM - Unlocked when all easy puzzles are completed
    {
      id: 'ocean-beach',
      title: 'Tropical Beach',
      imageKey: 'puzzle-beach',
      imagePath: 'assets/Puzzles/0-2.png',
      pieces: 35,
      difficulty: 'medium',
      completed: false,
      stars: 0,
      unlocked: false,
    },
    {
      id: 'landscape-mountain',
      title: 'Mountain Vista',
      imageKey: 'puzzle-mountain',
      imagePath: 'assets/Puzzles/0-3.png',
      pieces: 35,
      difficulty: 'medium',
      completed: false,
      stars: 0,
      unlocked: false,
    },
    {
      id: 'space-saturn',
      title: 'Saturn',
      imageKey: 'puzzle-saturn',
      imagePath: 'assets/Puzzles/0-4.png',
      pieces: 35,
      difficulty: 'medium',
      completed: false,
      stars: 0,
      unlocked: false,
    },
    
    // HARD - Unlocked when all medium puzzles are completed
    {
      id: 'space-galaxy',
      title: 'Galaxy Spiral',
      imageKey: 'puzzle-galaxy',
      imagePath: 'assets/Puzzles/0-5.png',
      pieces: 63,
      difficulty: 'hard',
      completed: false,
      stars: 0,
      unlocked: false,
    },
    {
      id: 'nature-lake',
      title: 'Peaceful Lake',
      imageKey: 'puzzle-lake',
      imagePath: 'assets/Puzzles/0-6.png',
      pieces: 63,
      difficulty: 'hard',
      completed: false,
      stars: 0,
      unlocked: false,
    },
    {
      id: 'city-skyline',
      title: 'City Skyline',
      imageKey: 'puzzle-city',
      imagePath: 'assets/Puzzles/0-7.png',
      pieces: 80,
      difficulty: 'hard',
      completed: false,
      stars: 0,
      unlocked: false,
    },
    
    // EXPERT - Unlocked when all hard puzzles are completed
    {
      id: 'advanced-waterfall',
      title: 'Advanced Waterfall',
      imageKey: 'puzzle-waterfall-expert',
      imagePath: 'assets/Puzzles/0-0.png', // Reuse existing image with higher piece count
      pieces: 108,
      difficulty: 'expert',
      completed: false,
      stars: 0,
      unlocked: false,
    },
    {
      id: 'master-beach',
      title: 'Master Beach',
      imageKey: 'puzzle-beach-expert',
      imagePath: 'assets/Puzzles/0-2.png', // Reuse existing image with higher piece count
      pieces: 120,
      difficulty: 'expert',
      completed: false,
      stars: 0,
      unlocked: false,
    },
  ];

  constructor() {
    super('Leisure');
  }

  init(data?: { 
    completedPuzzle?: string; 
    completionData?: { 
      time: number; 
      score: number;
      moves: number; 
      stars: number;
      perfectCompletion: boolean;
      maxStreak: number;
    } 
  }) {
    // Handle puzzle completion data if returning from Solve scene
    if (data?.completedPuzzle && data?.completionData) {
      // Process completion after scene is fully loaded
      this.events.once('create', () => {
        this.onPuzzleCompleted(data.completedPuzzle!, data.completionData!);
      });
    }
  }

  preload() {
    // Load puzzle thumbnails directly from local PNG files
    this.puzzleData.forEach((puzzle) => {
      console.log(`🔄 Loading ${puzzle.title} from: ${puzzle.imagePath}`);
      this.load.image(puzzle.imageKey, puzzle.imagePath);
    });

    // Load UI elements
    this.load.image('leisure-bg', 'assets/bg_selection001.png');
    this.load.image('card-frame', 'assets/obj_them_bg.png');
    this.load.image('star-empty', 'assets/ico_star.png');
    this.load.image('star-filled', 'assets/ico_star.png');
    this.load.image('lock-icon', 'assets/ico_lockM.png');

    // Create a fallback placeholder texture
    this.load.image('puzzle-placeholder', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');

    // Enhanced error handling and success logging
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.error('❌ FAILED TO LOAD:', {
        key: file.key,
        src: file.src,
        type: file.type,
        puzzle: this.puzzleData.find(p => p.imageKey === file.key)?.title || 'Unknown'
      });
      // Mark failed images for fallback handling
      this.markImageAsFailed(file.key);
    });

    this.load.on('filecomplete', (key: string, type: string) => {
      if (type === 'image') {
        const puzzle = this.puzzleData.find(p => p.imageKey === key);
        console.log('✅ LOADED SUCCESSFULLY:', {
          key: key,
          puzzle: puzzle?.title || 'UI Asset',
          type: type
        });
        this.validateImageTexture(key);
      }
    });

    // Log loading progress
    this.load.on('progress', (progress: number) => {
      if (progress === 1) {
        console.log('📊 LOADING COMPLETE - Summary:');
        console.log(`  ✅ Successful: ${this.puzzleData.length - this.failedImages.size}/${this.puzzleData.length} puzzle images`);
        console.log(`  ❌ Failed: ${this.failedImages.size}/${this.puzzleData.length} puzzle images`);
        if (this.failedImages.size > 0) {
          console.log('  🔍 Failed images:', Array.from(this.failedImages));
        }
      }
    });

    this.load.audio('background-music','/assets/Sounds/bg2.ogg')

    // Initialize media system in the background (non-blocking)
    this.initializeMediaSystemAsync();
  }

  private failedImages: Set<string> = new Set();

  private markImageAsFailed(imageKey: string): void {
    this.failedImages.add(imageKey);
  }

  private validateImageTexture(key: string): void {
    // Check if the loaded texture is valid
    const texture = this.textures.get(key);
    if (texture && texture.source[0]) {
      const source = texture.source[0];
      if (source.width <= 1 || source.height <= 1) {
        console.warn('⚠️ Invalid texture dimensions for:', key);
        this.markImageAsFailed(key);
      }
    }
  }

  private initializeMediaSystemAsync(): void {
    // Run media system initialization in background without blocking preload
    MediaManager.initializeMediaSystem().then(() => {
      console.log('Media system initialized in background');
    }).catch(error => {
      console.warn('Background media system initialization failed:', error);
    });
  }

  private createImagePlaceholder(card: GameObjects.Container, puzzle: PuzzleData, width: number, height: number): void {
    // Create a more attractive placeholder
    const placeholder = this.add.rectangle(0, -20, width - 20, height - 60, 0xe6e6e6);
    placeholder.setStrokeStyle(2, 0xcccccc);
    card.add(placeholder);

    // Puzzle icon
    const puzzleIcon = this.add.text(0, -30, '🧩', {
      fontSize: '32px',
    }).setOrigin(0.5);
    
    // "Image Loading" text
    const loadingText = this.add.text(0, -5, 'Loading...', {
      fontSize: '12px',
      color: '#666666',
      fontStyle: 'italic'
    }).setOrigin(0.5);
    
    // Difficulty indicator
    const difficultyColor = this.getDifficultyColor(puzzle.difficulty);
    const difficultyBadge = this.add.rectangle(0, 15, 60, 16, difficultyColor);
    difficultyBadge.setStrokeStyle(1, 0x999999);
    
    const difficultyText = this.add.text(0, 15, puzzle.difficulty.toUpperCase(), {
      fontSize: '10px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    card.add([puzzleIcon, loadingText, difficultyBadge, difficultyText]);
  }

  private getDifficultyColor(difficulty: string): number {
    switch (difficulty) {
      case 'easy': return 0x4CAF50;    // Green
      case 'medium': return 0xFF9800;  // Orange  
      case 'hard': return 0xF44336;    // Red
      case 'expert': return 0x9C27B0;  // Purple
      default: return 0x757575;        // Gray
    }
  }

  private retryFailedImages(): void {
    if (this.failedImages.size === 0) return;

    console.log('🔄 Retrying failed images:', Array.from(this.failedImages));
    
    // Try alternative paths for failed images
    const failedImagesCopy = Array.from(this.failedImages);
    failedImagesCopy.forEach(imageKey => {
      const puzzle = this.puzzleData.find(p => p.imageKey === imageKey);
      if (puzzle) {
        // Try loading from CDN if available
        const cdnUrl = MediaManager.getCachedPuzzleImage(puzzle.id);
        if (cdnUrl && cdnUrl !== puzzle.imagePath) {
          console.log(`🔄 Trying CDN URL for ${puzzle.title}: ${cdnUrl}`);
          this.load.image(imageKey + '_cdn', cdnUrl);
          this.load.start();
        }
      }
    });

    // Check again after retry
    this.time.delayedCall(2000, () => {
      if (this.failedImages.size > 0) {
        console.log('⚠️ Some images still failed to load:', Array.from(this.failedImages));
        console.log('💡 Consider checking if these image files exist in the assets/Puzzles/ directory');
      }
    });
  }







  create() {
    const { width, height } = this.scale;

    // Background
    this.background = this.add.image(width / 2, height / 2, 'leisure-bg');
     this.background.setScale(
      Math.max(width / this.background!.width, height / this.background!.height)
    );

    // play music
   this.sound.add('background-music', { loop: false });

    // Update puzzle piece counts based on actual image aspect ratios
    this.updatePuzzlePieceCounts();

    // Load saved results
    void this.loadSavedResults().then(() => {
      // Calculate difficulty progress after loading
      this.updateDifficultyProgress();
      this.createPuzzleGrid();
    });

    // Calculate difficulty progress and update unlock status
    this.updateDifficultyProgress();
    this.updateUnlockStatus();

    // Create header
    this.createHeader();

    // Create category buttons
    this.createCategoryButtons();

    // Create scroll container - adjust for mobile
    const isMobile = width <= 400;
    this.scrollContainer = this.add.container(0, isMobile ? 85 : 120);

    // Create puzzle grid
    this.createPuzzleGrid();

    // Set up input handling
    this.setupScrolling();

    // Handle resize
    this.scale.on('resize', this.refreshLayout, this);
    this.events.on('shutdown', this.handleShutdown, this);

    // Retry loading any failed images after a short delay
    this.time.delayedCall(1000, () => {
      this.retryFailedImages();
    });
  }

  private updatePuzzlePieceCounts(): void {
    const { width } = this.scale;
    const isMobile = width <= 400;
    
    console.log(`🔢 Updating puzzle piece counts for ${isMobile ? 'mobile' : 'desktop'} platform...`);
    
    this.puzzleData.forEach((puzzle) => {
      // Apply mobile piece count limits
      if (isMobile && puzzle.pieces > 63) {
        console.log(`📱 ${puzzle.title}: Reducing ${puzzle.pieces} → 63 pieces (mobile limit)`);
        puzzle.pieces = 63;
        puzzle.difficulty = 'hard'; // Cap mobile difficulty at 'hard'
      }
      
      // Calculate grid dimensions for the (possibly adjusted) piece count
      const gridDimensions = this.calculateExactGridDimensions(puzzle);
      
      console.log(`${puzzle.title}: ${puzzle.pieces} pieces (${gridDimensions.cols}×${gridDimensions.rows}) - ${puzzle.difficulty}`);
      
      // Store the grid dimensions for later use
      (puzzle as PuzzleData & { optimalCols?: number; optimalRows?: number }).optimalCols = gridDimensions.cols;
      (puzzle as PuzzleData & { optimalCols?: number; optimalRows?: number }).optimalRows = gridDimensions.rows;
    });
  }

  private updateDifficultyProgress(): void {
    // Calculate completion progress for each difficulty level
    this.difficultyProgress = {
      easy: { completed: 0, total: 0 },
      medium: { completed: 0, total: 0 },
      hard: { completed: 0, total: 0 },
      expert: { completed: 0, total: 0 }
    };

    this.puzzleData.forEach(puzzle => {
      this.difficultyProgress[puzzle.difficulty].total++;
      if (puzzle.completed) {
        this.difficultyProgress[puzzle.difficulty].completed++;
      }
    });

    console.log('🎯 Difficulty Progress:', this.difficultyProgress);
  }

  private updateUnlockStatus(): void {
    // Easy puzzles are always unlocked
    this.puzzleData.forEach(puzzle => {
      if (puzzle.difficulty === 'easy') {
        puzzle.unlocked = true;
      }
    });

    // Medium puzzles unlock when ALL easy puzzles are completed
    const allEasyCompleted = this.difficultyProgress.easy.completed === this.difficultyProgress.easy.total && this.difficultyProgress.easy.total > 0;
    
    // Hard puzzles unlock when ALL medium puzzles are completed
    const allMediumCompleted = this.difficultyProgress.medium.completed === this.difficultyProgress.medium.total && this.difficultyProgress.medium.total > 0;
    
    // Expert puzzles unlock when ALL hard puzzles are completed
    const allHardCompleted = this.difficultyProgress.hard.completed === this.difficultyProgress.hard.total && this.difficultyProgress.hard.total > 0;

    this.puzzleData.forEach(puzzle => {
      switch (puzzle.difficulty) {
        case 'medium':
          puzzle.unlocked = allEasyCompleted;
          break;
        case 'hard':
          puzzle.unlocked = allMediumCompleted;
          break;
        case 'expert':
          puzzle.unlocked = allHardCompleted;
          break;
      }
    });

    // Log unlock status for debugging
    const unlockedCount = this.puzzleData.filter(p => p.unlocked).length;
    console.log(`🔓 Unlocked ${unlockedCount}/${this.puzzleData.length} puzzles`);
    
    // Log next unlock requirements
    if (!allEasyCompleted) {
      const remaining = this.difficultyProgress.easy.total - this.difficultyProgress.easy.completed;
      console.log(`📚 Complete ${remaining} more easy puzzle(s) to unlock medium difficulty`);
    } else if (!allMediumCompleted) {
      const remaining = this.difficultyProgress.medium.total - this.difficultyProgress.medium.completed;
      console.log(`📚 Complete ${remaining} more medium puzzle(s) to unlock hard difficulty`);
    } else if (!allHardCompleted) {
      const remaining = this.difficultyProgress.hard.total - this.difficultyProgress.hard.completed;
      console.log(`📚 Complete ${remaining} more hard puzzle(s) to unlock expert difficulty`);
    }
  }



  private createHeader(): void {
    const { width } = this.scale;
    const isMobile = width <= 400;

    // Title - smaller on mobile with platform indicator
   /* const titleText = isMobile ? 'PUZZLE GALLERY 📱' : 'PUZZLE GALLERY';
    this.add
      .text(width / 2, isMobile ? 25 : 30, titleText, {
        fontSize: isMobile ? '20px' : '32px',
        color: '#8B4513',
        fontStyle: 'bold',
        stroke: '#FFFFFF',
        strokeThickness: 2,
      })
      .setOrigin(0.5);*/

    // Progress indicator
    const totalCompleted = this.puzzleData.filter(p => p.completed).length;
    const totalPuzzles = this.puzzleData.length;
    const progressText = isMobile 
      ? `${totalCompleted}/${totalPuzzles} Complete`
      : `Progress: ${totalCompleted}/${totalPuzzles} Puzzles Complete`;
    
    this.add
      .text(width / 2, isMobile ? 45 : 55, progressText, {
        fontSize: isMobile ? '12px' : '14px',
        color: totalCompleted === totalPuzzles ? '#4CAF50' : '#666666',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Add mobile optimization notice
    if (isMobile) {
      this.add
        .text(width / 2, 60, 'Mobile Optimized', {
          fontSize: '10px',
          color: '#888888',
          fontStyle: 'italic',
        })
        .setOrigin(0.5);
    }

    // Back button - smaller on mobile
    const backButton = this.add
      .text(isMobile ? 15 : 20, isMobile ? 25 : 30, '← Back', {
        fontSize: isMobile ? '16px' : '20px',
        color: '#FFFFFF',
        backgroundColor: '#8B4513',
        padding: { x: isMobile ? 8 : 12, y: isMobile ? 4 : 6 },
      })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.scene.start('MainMenu');
      });

    // Add hover effect
    backButton.on('pointerover', () => backButton.setScale(1.05));
    backButton.on('pointerout', () => backButton.setScale(1));
  }

  private createCategoryButtons(): void {
    const { width } = this.scale;
    const isMobile = width <= 400;
    
    // Difficulty-based categories with progress indicators
    const categories = [
      { key: 'all', label: 'All', difficulty: '' },
      { key: 'easy', label: isMobile ? 'Easy' : 'Easy', difficulty: 'easy' },
      { key: 'medium', label: isMobile ? 'Med' : 'Medium', difficulty: 'medium' },
      { key: 'hard', label: 'Hard', difficulty: 'hard' },
      { key: 'expert', label: isMobile ? 'Exp' : 'Expert', difficulty: 'expert' },
    ];

    // Mobile-optimized button dimensions
    const buttonWidth = isMobile ? 55 : 80;
    const buttonHeight = isMobile ? 35 : 40;
    const spacing = isMobile ? 4 : 8;
    const totalWidth = categories.length * buttonWidth + (categories.length - 1) * spacing;
    const startX = Math.max(15, (width - totalWidth) / 2);

    categories.forEach((category, index) => {
      const x = startX + buttonWidth / 2 + index * (buttonWidth + spacing);
      const y = isMobile ? 55 : 80;

      const button = this.add.container(x, y);

      // Check if this difficulty has any unlocked puzzles
      const hasUnlockedPuzzles = category.difficulty === '' || 
        this.puzzleData.some(p => p.difficulty === category.difficulty && p.unlocked);
      
      // Button background - different colors for locked/unlocked
      const bgColor = hasUnlockedPuzzles ? 0x8b4513 : 0x555555;
      const bg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, bgColor);
      bg.setStrokeStyle(2, hasUnlockedPuzzles ? 0xffffff : 0x888888);

      // Button text
      const textColor = hasUnlockedPuzzles ? '#FFFFFF' : '#AAAAAA';
      const text = this.add
        .text(0, -5, category.label, {
          fontSize: isMobile ? '11px' : '12px',
          color: textColor,
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      // Progress indicator for difficulty categories
      if (category.difficulty && this.difficultyProgress) {
        const progress = this.difficultyProgress[category.difficulty as keyof DifficultyProgress];
        const progressText = `${progress.completed}/${progress.total}`;
        const progressColor = progress.completed === progress.total && progress.total > 0 ? '#00FF00' : '#FFFF00';
        
        const progressLabel = this.add
          .text(0, 8, progressText, {
            fontSize: isMobile ? '9px' : '10px',
            color: hasUnlockedPuzzles ? progressColor : '#888888',
          })
          .setOrigin(0.5);
        
        button.add([bg, text, progressLabel]);
      } else {
        button.add([bg, text]);
      }

      // Lock icon for locked difficulties
      if (!hasUnlockedPuzzles && category.difficulty) {
        const lockIcon = this.add.text(buttonWidth / 2 - 8, -buttonHeight / 2 + 8, '🔒', {
          fontSize: '12px',
        }).setOrigin(0.5);
        button.add(lockIcon);
      }

      button.setInteractive(
        new Phaser.Geom.Rectangle(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight),
        Phaser.Geom.Rectangle.Contains
      );

      // Set initial state
      if (category.key === this.currentCategory) {
        bg.setFillStyle(hasUnlockedPuzzles ? 0xd2691e : 0x777777);
      }

      // Only make interactive if unlocked
      if (hasUnlockedPuzzles) {
        button.on('pointerdown', () => {
          this.selectCategory(category.key);
        });

        button.on('pointerover', () => {
          if (category.key !== this.currentCategory) {
            bg.setFillStyle(0xa0522d);
          }
        });

        button.on('pointerout', () => {
          if (category.key !== this.currentCategory) {
            bg.setFillStyle(0x8b4513);
          }
        });
      } else {
        // Show tooltip for locked categories
        button.on('pointerdown', () => {
          this.showUnlockRequirement(category.difficulty);
        });
      }

      this.categoryButtons.push(button);
    });
  }

  private createPuzzleGrid(): void {
    const { width, height } = this.scale;
    const isMobile = width <= 400;
    
    // Mobile-optimized card dimensions - slightly taller to accommodate aspect ratios
    const cardWidth = isMobile ? 150 : 160;
    const cardHeight = isMobile ? 140 : 150;
    const spacing = isMobile ? 8 : 20;
    const margin = isMobile ? 20 : 40;
    
    // Calculate columns more carefully to prevent cutoff
    const availableWidth = width - (margin * 2);
    const cols = Math.floor(availableWidth / (cardWidth + spacing));
    const actualGridWidth = cols * cardWidth + (cols - 1) * spacing;
    const startX = (width - actualGridWidth) / 2;

    let row = 0;
    let col = 0;

    this.puzzleData.forEach((puzzle) => {
      if (this.shouldShowPuzzle(puzzle)) {
        const x = startX + cardWidth / 2 + col * (cardWidth + spacing);
        const y = row * (cardHeight + spacing) + cardHeight / 2 + 20;

        const card = this.createPuzzleCard(puzzle, x, y, cardWidth, cardHeight);
        this.scrollContainer.add(card);
        this.puzzleCards.push(card);

        col++;
        if (col >= cols) {
          col = 0;
          row++;
        }
      }
    });

    // Calculate max scroll with mobile considerations
    const availableHeight = height - (isMobile ? 120 : 200);
    this.maxScrollY = Math.max(0, (row + 1) * (cardHeight + spacing) - availableHeight);
  }

  private createPuzzleCard(
    puzzle: PuzzleData,
    x: number,
    y: number,
    width: number,
    height: number
  ): GameObjects.Container {
    const card = this.add.container(x, y);

    // Card background with enhanced styling
    const bg = this.add.rectangle(0, 0, width, height, 0xf5deb3);
    bg.setStrokeStyle(3, 0x8b4513);
    
    // Add a subtle inner glow for unlocked puzzles
    const innerGlow = this.add.rectangle(0, 0, width - 6, height - 6, 0xffffff, 0.1);
    
    card.add([bg, innerGlow]);

    // Check if image loaded successfully
    const imageExists = this.textures.exists(puzzle.imageKey) && !this.failedImages.has(puzzle.imageKey);
    
    console.log(`Creating card for ${puzzle.title}:`);
    console.log(`  - Image key: ${puzzle.imageKey}`);
    console.log(`  - Image path: ${puzzle.imagePath}`);
    console.log(`  - Texture exists: ${imageExists}`);
    console.log(`  - Failed images: ${Array.from(this.failedImages)}`);
    
    // Puzzle image (if available, otherwise placeholder)
    if (imageExists) {
      const puzzleImage = this.add.image(0, -20, puzzle.imageKey);
      
      // Calculate aspect ratio and fit image properly within card bounds
      const texture = this.textures.get(puzzle.imageKey);
      const sourceWidth = texture.source[0]?.width || 1;
      const sourceHeight = texture.source[0]?.height || 1;
      
      // Validate image dimensions
      if (sourceWidth > 1 && sourceHeight > 1) {
        const imageAspectRatio = sourceWidth / sourceHeight;
        
        // Available space for image (leaving room for title and piece count)
        const availableWidth = width - 20;
        const availableHeight = height - 60;
        const availableAspectRatio = availableWidth / availableHeight;
        
        let displayWidth: number;
        let displayHeight: number;
        
        if (imageAspectRatio > availableAspectRatio) {
          // Image is wider than available space - fit to width
          displayWidth = availableWidth;
          displayHeight = availableWidth / imageAspectRatio;
        } else {
          // Image is taller than available space - fit to height
          displayHeight = availableHeight;
          displayWidth = availableHeight * imageAspectRatio;
        }
        
        puzzleImage.setDisplaySize(displayWidth, displayHeight);
        card.add(puzzleImage);
      } else {
        // Invalid image dimensions, show placeholder
        this.createImagePlaceholder(card, puzzle, width, height);
      }
    } else {
      // Image failed to load or doesn't exist, show placeholder
      this.createImagePlaceholder(card, puzzle, width, height);
    }

    // Title
    /*const title = this.add
      .text(0, 35, puzzle.title, {
        fontSize: '12px',
        color: '#8B4513',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    card.add(title);*/

    // Piece count
    const pieceText = this.add
      .text(-width / 2 + 10, -height / 2 + 10, `${puzzle.pieces}`, {
        fontSize: '14px',
        color: '#FFFFFF',
        backgroundColor: '#8B4513',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0);
    card.add(pieceText);

    // Stars
    this.createStars(card, puzzle.stars);

    // Best score and perfect completion badge (if completed)
    if (puzzle.completed && puzzle.bestScore !== undefined) {
      const perfectBadge = puzzle.perfectCompletion ? ' 🏆' : '';
      const scoreText = this.add
        .text(
          width / 2 - 10,
          -height / 2 + 10,
          `${puzzle.bestScore}${perfectBadge}`,
          {
            fontSize: '12px',
            color: '#FFFFFF',
            backgroundColor: puzzle.perfectCompletion ? '#FFD700' : '#228B22',
            padding: { x: 4, y: 2 },
          }
        )
        .setOrigin(1, 0);
      card.add(scoreText);
      
      // Show max streak if available
      if (puzzle.maxStreak && puzzle.maxStreak > 1) {
        const streakText = this.add
          .text(
            width / 2 - 10,
            -height / 2 + 30,
            `Streak: ${puzzle.maxStreak}`,
            {
              fontSize: '10px',
              color: '#FFFFFF',
              backgroundColor: '#FF6B35',
              padding: { x: 3, y: 1 },
            }
          )
          .setOrigin(1, 0);
        card.add(streakText);
      }
    }

    // Lock overlay for locked puzzles
    if (!puzzle.unlocked) {
      const lockOverlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7);
      const lockIcon = this.add.text(0, -10, '🔒', {
        fontSize: '32px',
      }).setOrigin(0.5);
      
      const lockText = this.add.text(0, 15, 'LOCKED', {
        fontSize: '12px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      
      card.add([lockOverlay, lockIcon, lockText]);
    }

    // Make interactive
    card.setSize(width, height);
    card.setInteractive({ useHandCursor: puzzle.unlocked });

    if (puzzle.unlocked) {
      card.on('pointerdown', () => {
        console.log('🎯 Puzzle card clicked:', puzzle.title, 'ID:', puzzle.id);
        try {
          this.startPuzzle(puzzle);
        } catch (error) {
          console.error('❌ Error starting puzzle:', error);
          console.error('Puzzle data:', puzzle);
        }
      });

      card.on('pointerover', () => {
        card.setScale(1.05);
      });

      card.on('pointerout', () => {
        card.setScale(1);
      });
    } else {
      // Show unlock requirement for locked puzzles
      card.on('pointerdown', () => {
        console.log('🔒 Locked puzzle clicked:', puzzle.title);
        try {
          this.showUnlockRequirement(puzzle.difficulty);
        } catch (error) {
          console.error('❌ Error showing unlock requirement:', error);
        }
      });
    }

    return card;
  }

  private createStars(container: GameObjects.Container, starCount: number): void {
    const starSize = 16;
    const starSpacing = 20;
    const startX = -(starSpacing * 2) / 2;

    for (let i = 0; i < 3; i++) {
      const x = startX + i * starSpacing;
      const y = 50;

      const star = this.add
        .text(x, y, i < starCount ? '⭐' : '☆', {
          fontSize: `${starSize}px`,
          color: i < starCount ? '#FFD700' : '#CCCCCC',
        })
        .setOrigin(0.5);

      container.add(star);
    }
  }

  private shouldShowPuzzle(puzzle: PuzzleData): boolean {
    if (this.currentCategory === 'all') return true;
    return puzzle.difficulty === this.currentCategory;
  }

  private showUnlockRequirement(difficulty: string): void {
    let message = '';
    
    switch (difficulty) {
      case 'medium': {
        const easyRemaining = this.difficultyProgress.easy.total - this.difficultyProgress.easy.completed;
        message = `Complete ${easyRemaining} more easy puzzle${easyRemaining !== 1 ? 's' : ''} to unlock medium difficulty`;
        break;
      }
      case 'hard': {
        const mediumRemaining = this.difficultyProgress.medium.total - this.difficultyProgress.medium.completed;
        message = `Complete ${mediumRemaining} more medium puzzle${mediumRemaining !== 1 ? 's' : ''} to unlock hard difficulty`;
        break;
      }
      case 'expert': {
        const hardRemaining = this.difficultyProgress.hard.total - this.difficultyProgress.hard.completed;
        message = `Complete ${hardRemaining} more hard puzzle${hardRemaining !== 1 ? 's' : ''} to unlock expert difficulty`;
        break;
      }
    }

    if (message) {
      // Show temporary message
      const { width, height } = this.scale;
      const messageText = this.add.text(width / 2, height / 2, message, {
        fontSize: '16px',
        color: '#FFFFFF',
        backgroundColor: '#000000',
        padding: { x: 20, y: 10 },
        align: 'center'
      }).setOrigin(0.5).setDepth(1000);

      // Fade out after 3 seconds
      this.tweens.add({
        targets: messageText,
        alpha: 0,
        duration: 3000,
        onComplete: () => messageText.destroy()
      });
    }
  }



  private selectCategory(category: string): void {
    this.currentCategory = category;

    // Update button states
    this.categoryButtons.forEach((button, index) => {
      const bg = button.list[0] as GameObjects.Rectangle;
      const categories = ['all', 'easy', 'medium', 'hard', 'expert'];
      
      // Check if this category has unlocked puzzles
      const categoryDifficulty = categories[index];
      const hasUnlockedPuzzles = categoryDifficulty === 'all' || 
        this.puzzleData.some(p => p.difficulty === categoryDifficulty && p.unlocked);

      if (categories[index] === category) {
        bg.setFillStyle(hasUnlockedPuzzles ? 0xd2691e : 0x777777);
      } else {
        bg.setFillStyle(hasUnlockedPuzzles ? 0x8b4513 : 0x555555);
      }
    });

    // Recreate puzzle grid
    this.clearPuzzleGrid();
    this.createPuzzleGrid();
    this.scrollY = 0;
    const isMobile = this.scale.width <= 400;
    this.scrollContainer.y = isMobile ? 85 : 120;
  }

  private clearPuzzleGrid(): void {
    this.puzzleCards.forEach((card) => card.destroy());
    this.puzzleCards = [];
    this.scrollContainer.removeAll();
  }

  private setupScrolling(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const isMobile = this.scale.width <= 400;
      const scrollAreaTop = isMobile ? 85 : 120;
      if (pointer.y > scrollAreaTop) {
        // Only in scroll area
        this.isDragging = true;
        this.dragStartY = pointer.y;
        this.scrollStartY = this.scrollY;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        const deltaY = pointer.y - this.dragStartY;
        this.scrollY = Phaser.Math.Clamp(this.scrollStartY - deltaY, 0, this.maxScrollY);
        const isMobile = this.scale.width <= 400;
        const scrollAreaTop = isMobile ? 85 : 120;
        this.scrollContainer.y = scrollAreaTop - this.scrollY;
      }
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
    });

    // Mouse wheel scrolling
    this.input.on(
      'wheel',
      (
        _pointer: Phaser.Input.Pointer,
        _gameObjects: Phaser.GameObjects.GameObject[],
        _deltaX: number,
        deltaY: number
      ) => {
        this.scrollY = Phaser.Math.Clamp(this.scrollY + deltaY * 0.5, 0, this.maxScrollY);
        const isMobile = this.scale.width <= 400;
        const scrollAreaTop = isMobile ? 85 : 120;
        this.scrollContainer.y = scrollAreaTop - this.scrollY;
      }
    );
  }

  private startPuzzle(puzzle: PuzzleData): void {
    // Get the most up-to-date image path (CDN or local)
    const cdnUrl = MediaManager.getCachedPuzzleImage(puzzle.id);
    const imageUrl = cdnUrl || puzzle.imagePath;
    
    console.log(`Starting puzzle ${puzzle.title} with image: ${imageUrl}`);

    // Calculate exact grid dimensions for the puzzle (using aspect ratio if available)
    const gridDimensions = this.calculateExactGridDimensions(puzzle);
    
    // Create comprehensive puzzle configuration for Solve scene
    const puzzleConfig: PuzzleConfig = {
      image: puzzle.imageKey, // Required by PuzzleConfig type
      imageUrl: imageUrl, // Use CDN URL if available, otherwise local
      title: puzzle.title,
      gridSize: Math.max(gridDimensions.cols, gridDimensions.rows), // For backward compatibility
      gridCols: gridDimensions.cols,
      gridRows: gridDimensions.rows,
      difficulty: puzzle.difficulty,
      puzzleId: puzzle.id,
      rotationEnabled: puzzle.difficulty !== 'easy',
      timedMode: puzzle.difficulty === 'hard' || puzzle.difficulty === 'expert',
      timeLimit: this.getTimeLimitForDifficulty(puzzle.difficulty),
      backgroundMusic: this.getBackgroundMusicForPuzzle(puzzle.id),
    };

    console.log('Puzzle config:', puzzleConfig);
    this.scene.start('Solve', { puzzleConfig: puzzleConfig });
  }

  private calculateExactGridDimensions(puzzle: PuzzleData): { cols: number; rows: number } {
    // Use optimal dimensions if available (calculated based on aspect ratio)
    const puzzleWithOptimal = puzzle as PuzzleData & { optimalCols?: number; optimalRows?: number };
    if (puzzleWithOptimal.optimalCols && puzzleWithOptimal.optimalRows) {
      return { 
        cols: puzzleWithOptimal.optimalCols, 
        rows: puzzleWithOptimal.optimalRows 
      };
    }

    // Fallback to piece count calculation
    const pieces = puzzle.pieces;
    
    // For common piece counts, use specific grid sizes
    switch (pieces) {
      case 20: return { cols: 5, rows: 4 }; // 4×5 = 20 pieces
      case 35: return { cols: 5, rows: 7 }; // 5×7 = 35 pieces
      case 48: return { cols: 6, rows: 8 }; // 6×8 = 48 pieces
      case 63: return { cols: 7, rows: 9 }; // 7×9 = 63 pieces
      case 80: return { cols: 8, rows: 10 }; // 8×10 = 80 pieces
      case 108: return { cols: 9, rows: 12 }; // 9×12 = 108 pieces
      default: {
        // For other counts, find factors that are close to square
        const sqrt = Math.sqrt(pieces);
        let bestCols = Math.round(sqrt);
        let bestRows = Math.round(pieces / bestCols);
        
        // Adjust to get exact piece count
        while (bestCols * bestRows !== pieces) {
          if (bestCols * bestRows < pieces) {
            bestRows++;
          } else {
            bestCols--;
            bestRows = Math.ceil(pieces / bestCols);
          }
          
          // Safety check to prevent infinite loop
          if (bestCols < 2) {
            bestCols = 2;
            bestRows = Math.ceil(pieces / 2);
            break;
          }
        }
        
        return { cols: bestCols, rows: bestRows };
      }
    }
  }

  private getTimeLimitForDifficulty(difficulty: string): number {
    switch (difficulty) {
      case 'easy': return 0; // No time limit
      case 'medium': return 0; // No time limit
      case 'hard': return 600; // 10 minutes
      case 'expert': return 300; // 5 minutes
      default: return 0;
    }
  }

  private getBackgroundMusicForPuzzle(puzzleId: string): string {
    // Map puzzles to background music tracks
    const musicMap: Record<string, string> = {
      'nature-waterfall': 'assets/Sounds/bg1.mp3',
      'nature-forest': 'assets/Sounds/bg2.mp3',
      'ocean-beach': 'assets/Sounds/bg3.mp3',
      'landscape-mountain': 'assets/Sounds/t1.mp3',
      'space-saturn': 'assets/Sounds/t2.mp3',
      'space-galaxy': 'assets/Sounds/t3.mp3',
    };

    // Try to get CDN URL for the music, fallback to local
    const localPath = musicMap[puzzleId] || 'assets/Sounds/bg1.mp3';
    const trackId = this.getMusicTrackId(localPath);
    const cdnUrl = MediaManager.getCachedMusicTrack(trackId);
    
    return cdnUrl || localPath;
  }

  private getMusicTrackId(localPath: string): string {
    // Map local paths to track IDs
    const pathToTrackId: Record<string, string> = {
      'assets/Sounds/bg1.mp3': 'background-music-1',
      'assets/Sounds/bg2.mp3': 'background-music-2',
      'assets/Sounds/bg3.mp3': 'background-music-3',
      'assets/Sounds/t1.mp3': 'theme-music-1',
      'assets/Sounds/t2.mp3': 'theme-music-2',
      'assets/Sounds/t3.mp3': 'theme-music-3',
    };

    return pathToTrackId[localPath] || 'background-music-1';
  }



  private async loadSavedResults(): Promise<void> {
    try {
      // Load user progress from server
      const response = await fetch('/api/user');
      const data = await response.json();
      
      if (data.status === 'success' && data.progress) {
        const progress: UserProgressData = data.progress;
        
        // Update puzzle data with server progress
        this.puzzleData.forEach(puzzle => {
          // Check if puzzle is completed
          if (progress.completedPuzzles.includes(puzzle.id)) {
            puzzle.completed = true;
            puzzle.bestTime = progress.bestTimes[puzzle.id] || 0;
            // Calculate stars based on best time and completion
            puzzle.stars = this.calculateStarsFromProgress(puzzle.id, progress);
          }
          
          // Check if puzzle is unlocked
          if (progress.unlocks.includes(puzzle.id)) {
            puzzle.unlocked = true;
          }
        });
      } else {
        console.warn('Failed to load user progress, using defaults');
        // Fallback to localStorage for backward compatibility
        this.loadFromLocalStorage();
      }
      
      // Update unlock status based on completion
      this.updateUnlockStatus();

      // Show progression message if new difficulty unlocked
      this.checkForNewUnlocks();
      
    } catch (error) {
      console.error('Error loading user progress:', error);
      // Fallback to localStorage
      this.loadFromLocalStorage();
    }
  }

  private loadFromLocalStorage(): void {
    try {
      const savedResults = localStorage.getItem('puzzle-results');
      if (savedResults) {
        const results: SavedResult[] = JSON.parse(savedResults);

        // Update puzzle data with saved results
        results.forEach((result) => {
          const puzzle = this.puzzleData.find((p) => p.id === result.puzzleId);
          if (puzzle) {
            puzzle.bestTime = result.bestTime;
            puzzle.bestScore = result.bestScore;
            puzzle.completed = result.completed;
            puzzle.stars = result.stars;
            puzzle.perfectCompletion = result.perfectCompletion;
            puzzle.maxStreak = result.maxStreak;
          }
        });
      }
    } catch (error) {
      console.warn('Could not load saved puzzle results');
    }
  }

  private calculateStarsFromProgress(puzzleId: string, progress: UserProgressData): number {
    // Simple star calculation based on completion and best time
    // This should match the calculation in the Solve scene
    const bestTime = progress.bestTimes[puzzleId];
    if (!bestTime) return 1;
    
    let stars = 1; // Base star for completion
    
    // Time-based bonuses
    if (bestTime < 60) stars += 2;
    else if (bestTime < 120) stars += 1;
    
    return Math.min(stars, 5);
  }

  // Method to be called when returning from a completed puzzle
  public onPuzzleCompleted(puzzleId: string, completionData: { 
    time: number; 
    score: number;
    moves: number; 
    stars: number;
    perfectCompletion: boolean;
    maxStreak: number;
  }): void {
    const puzzle = this.puzzleData.find(p => p.id === puzzleId);
    if (puzzle) {
      puzzle.completed = true;
      puzzle.bestTime = completionData.time;
      puzzle.bestScore = completionData.score;
      puzzle.stars = completionData.stars;
      puzzle.perfectCompletion = completionData.perfectCompletion;
      puzzle.maxStreak = completionData.maxStreak;

      // Save to localStorage
      this.savePuzzleResult(puzzle, completionData);

      // Recalculate progression and unlock status
      this.updateDifficultyProgress();
      this.updateUnlockStatus();

      // Show progression message if new difficulty unlocked
      this.checkForNewUnlocks();

      // Refresh the UI
      this.refreshAfterCompletion();
    }
  }

  private savePuzzleResult(puzzle: PuzzleData, completionData: { 
    time: number; 
    score: number;
    moves: number; 
    stars: number;
    perfectCompletion: boolean;
    maxStreak: number;
  }): void {
    try {
      const savedResults = localStorage.getItem('puzzle-results');
      const results: SavedResult[] = savedResults ? JSON.parse(savedResults) : [];

      // Update or add result
      const existingIndex = results.findIndex(r => r.puzzleId === puzzle.id);
      const newResult: SavedResult = {
        puzzleId: puzzle.id,
        bestTime: completionData.time,
        bestScore: completionData.score,
        moves: completionData.moves,
        completed: true,
        stars: completionData.stars,
        perfectCompletion: completionData.perfectCompletion,
        maxStreak: completionData.maxStreak,
        timestamp: Date.now()
      };

      if (existingIndex >= 0) {
        // Only update if this is a better score
        const existing = results[existingIndex];
        if (existing && (!existing.bestScore || completionData.score > existing.bestScore)) {
          results[existingIndex] = newResult;
        }
      } else {
        results.push(newResult);
      }

      localStorage.setItem('puzzle-results', JSON.stringify(results));
    } catch (error) {
      console.warn('Could not save puzzle result');
    }
  }

  private checkForNewUnlocks(): void {
    const { width, height } = this.scale;
    
    // Check if we just unlocked a new difficulty
    const allEasyCompleted = this.difficultyProgress.easy.completed === this.difficultyProgress.easy.total && this.difficultyProgress.easy.total > 0;
    const allMediumCompleted = this.difficultyProgress.medium.completed === this.difficultyProgress.medium.total && this.difficultyProgress.medium.total > 0;
    const allHardCompleted = this.difficultyProgress.hard.completed === this.difficultyProgress.hard.total && this.difficultyProgress.hard.total > 0;

    let unlockedMessage = '';
    
    if (allEasyCompleted && this.difficultyProgress.medium.total > 0) {
      const mediumUnlocked = this.puzzleData.some(p => p.difficulty === 'medium' && p.unlocked);
      if (mediumUnlocked) {
        unlockedMessage = '🎉 Medium Difficulty Unlocked!\nYou can now access more challenging puzzles!';
      }
    } else if (allMediumCompleted && this.difficultyProgress.hard.total > 0) {
      const hardUnlocked = this.puzzleData.some(p => p.difficulty === 'hard' && p.unlocked);
      if (hardUnlocked) {
        unlockedMessage = '🎉 Hard Difficulty Unlocked!\nPrepare for a real challenge!';
      }
    } else if (allHardCompleted && this.difficultyProgress.expert.total > 0) {
      const expertUnlocked = this.puzzleData.some(p => p.difficulty === 'expert' && p.unlocked);
      if (expertUnlocked) {
        unlockedMessage = '🎉 Expert Difficulty Unlocked!\nOnly the most skilled puzzlers can complete these!';
      }
    }

    if (unlockedMessage) {
      // Show celebration message
      const messageText = this.add.text(width / 2, height / 2, unlockedMessage, {
        fontSize: '20px',
        color: '#FFFFFF',
        backgroundColor: '#4CAF50',
        padding: { x: 30, y: 20 },
        align: 'center'
      }).setOrigin(0.5).setDepth(1000);

      // Add celebration animation
      messageText.setScale(0);
      this.tweens.add({
        targets: messageText,
        scale: 1,
        duration: 500,
        ease: 'Back.easeOut',
        onComplete: () => {
          // Fade out after 4 seconds
          this.tweens.add({
            targets: messageText,
            alpha: 0,
            duration: 1000,
            delay: 3000,
            onComplete: () => messageText.destroy()
          });
        }
      });
    }
  }

  private refreshAfterCompletion(): void {
    // Clear and recreate category buttons to show updated progress
    this.categoryButtons.forEach(button => button.destroy());
    this.categoryButtons = [];
    this.createCategoryButtons();

    // Refresh puzzle grid
    this.clearPuzzleGrid();
    this.createPuzzleGrid();
  }

  private refreshLayout(): void {
    const { width, height } = this.scale;

    // Resize camera
    this.cameras.resize(width, height);

    // Update background
    this.background.setPosition(width / 2, height / 2);
    this.background.setDisplaySize(width, height);

    // Recreate layout
    this.clearPuzzleGrid();
    this.createPuzzleGrid();
  }

  private handleShutdown(): void {
    this.scale.off('resize', this.refreshLayout, this);
    this.events.off('shutdown', this.handleShutdown, this);
  }
}
