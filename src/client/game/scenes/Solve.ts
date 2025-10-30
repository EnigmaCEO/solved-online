import Phaser from 'phaser';
import {
  PuzzleConfig,
  PuzzlePiece,
  SaveProgressRequest,
  MusicTrackData,
  Achievement,
} from '../../../shared/types/api';
import CutJigsawImage from 'phaser3-rex-plugins/plugins/cutjigsawimage.js';

export class Solve extends Phaser.Scene {
  background: Phaser.GameObjects.Image | null = null;
  logo: Phaser.GameObjects.Image | null = null;

  private puzzleConfig!: PuzzleConfig;
  private pieces: PuzzlePiece[] = [];
  private jigsawPieces: Phaser.GameObjects.Image[] = [];
  private gridSlots: Array<
    Array<{ x: number; y: number; occupied: boolean; piece?: PuzzlePiece }>
  > = [];
  private completedPieces = 0;
  private totalPieces = 0;
  private pieceSize = 0;
  private txtInstructions : Phaser.GameObjects.Text | null = null;

  // Game state
  private gameStarted = false;
  private gameCompleted = false;
  private startTime = 0;
  private elapsedTime = 0;
  private moveCount = 0;

  // Scoring system
  private score = 0;
  private currentStreak = 0;
  private maxStreak = 0;
  private incorrectPlacements = 0;
  private perfectCompletion = true;

  // UI elements
  private timerText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private streakText!: Phaser.GameObjects.Text;
  private pieceCounterText!: Phaser.GameObjects.Text;
  private bestScoreText!: Phaser.GameObjects.Text;

  // Current piece system
  private currentPieceIndex = 0;
  private currentPiece?: PuzzlePiece;
  private pieceDisplayArea!: Phaser.GameObjects.Container;

  // Graphics
  private gridSlotGraphics!: Phaser.GameObjects.Graphics;

  // Navigation throttling
  private lastNavigationTime = 0;
  private navigationCooldown = 100; // 100ms cooldown between navigation calls

  // Community puzzle properties
  private isCommunityPuzzle = false;
  private communityPuzzleData: { postId?: string; title?: string } | null = null;

  // Peek functionality
  private peekOverlay: Phaser.GameObjects.Image | null = null;
  private isPeeking = false;
  private lastPeekTime = 0;
  private peekCooldown = 2000; // 2 seconds cooldown
  private cameraButton: Phaser.GameObjects.Image | Phaser.GameObjects.Text | null = null;
  private backbutton: Phaser.GameObjects.Image | null = null;

  // Background music
  private backgroundMusic: Phaser.Sound.BaseSound | null = null;

  imgPuzzle : Phaser.GameObjects.Image | null = null;
  jigsawPiecePool : Phaser.GameObjects.Image[] = [];
  btnLeftArrow : Phaser.GameObjects.Image | null = null;
  btnRightArrow : Phaser.GameObjects.Image | null = null;
  btnLeftRotate : Phaser.GameObjects.Image | null = null;
  btnRightRotate : Phaser.GameObjects.Image | null = null;
  imgTimer : Phaser.GameObjects.Image | null = null;
  imgProgress : Phaser.GameObjects.Image | null = null;
  imgProgressBG : Phaser.GameObjects.Image | null = null;
  imgVictory : Phaser.GameObjects.Image | null = null;
  imgPerfect : Phaser.GameObjects.Image | null = null;
  imgFail : Phaser.GameObjects.Image | null = null;

  // Settings
  private puzzleSettings = {
    rotationEnabled: true,
    timedMode: false,
    timeLimit: 300,
    snapDistance: 80,
  };

  // Timer
  private timerEvent?: Phaser.Time.TimerEvent;
  private remainingTime = 0;

  // Cleanup tracking
  private createdTextureKeys: string[] = [];
  private completionOverlayElements: Phaser.GameObjects.GameObject[] = [];

  // Scaling constants for jigsaw pieces
  private readonly JIGSAW_DISPLAY_SCALE = 0.7; // Scale for pieces in display area
  private readonly JIGSAW_GRID_SCALE = 0.7; // Scale for pieces when placed in grid

  constructor() {
    super({ key: 'Solve' });
  }

  async init(data: { puzzleConfig: PuzzleConfig; rotationEnabled?: boolean }) {
    if (!data || !data.puzzleConfig) {
      console.error('❌ No puzzle configuration provided to Solve scene');
      this.scene.start('MainMenu');
      return;
    }

    // Clean up any existing puzzle data before starting new one
    this.cleanupPreviousPuzzle();

    this.puzzleConfig = data.puzzleConfig;
    console.log('🎮 Initializing Solve scene with config:', this.puzzleConfig);

    // Check if this is a community puzzle and get post data
    this.isCommunityPuzzle = this.puzzleConfig.puzzleId.startsWith('community-');
    if (this.isCommunityPuzzle) {
      // Get post ID from the server's init endpoint
      try {
        const response = await fetch('/api/init');
        const data = await response.json();
        console.log('Initialization data:', data);
        const postId = data.postId;

        this.communityPuzzleData = {
          ...(postId && { postId }),
          ...(this.puzzleConfig.title && { title: this.puzzleConfig.title }),
        };

        console.log('🧩 Community puzzle detected with postId:', postId);
      } catch (error) {
        console.error('❌ Failed to get postId from /api/init:', error);
        this.communityPuzzleData = {
          ...(this.puzzleConfig.title && { title: this.puzzleConfig.title }),
        };
      }
    }

    // Apply mobile optimizations
    const { width } = this.scale.gameSize;
    const isMobile = width <= 400;

    if (isMobile) {
      this.puzzleSettings.rotationEnabled = false;
      this.puzzleSettings.timedMode = false;
      this.puzzleSettings.snapDistance = 100;
    }

    // Override with config-specific settings
    if (this.puzzleConfig.rotationEnabled !== undefined) {
      this.puzzleSettings.rotationEnabled = this.puzzleConfig.rotationEnabled;
    }

    if (this.puzzleConfig.timedMode !== undefined) {
      this.puzzleSettings.timedMode = this.puzzleConfig.timedMode;
    }

    if (this.puzzleConfig.timeLimit !== undefined) {
      this.puzzleSettings.timeLimit = this.puzzleConfig.timeLimit;
    }

    //clean up UI elements
    this.background = null;
    this.logo = null;
    this.cameraButton = null;
    this.backbutton = null;
    this.txtInstructions = null;
    this.btnLeftArrow = null;
    this.btnRightArrow = null;
    this.btnLeftRotate = null;
    this.btnRightRotate = null;
    this.imgTimer = null;
    this.imgProgress = null;
    this.imgProgressBG = null;
    this.imgVictory = null;
    this.imgPerfect = null;
    this.imgFail = null;
  }

  private initializeGameState(): void {
    this.startTime = 0;
    this.elapsedTime = 0;
    this.remainingTime = this.puzzleSettings.timeLimit;
    this.moveCount = 0;
    this.gameStarted = false;
    this.gameCompleted = false;
    this.currentPieceIndex = 0;
    this.completedPieces = 0;
    this.totalPieces = 0;
    this.pieceSize = 0;

    // Initialize scoring system
    this.score = 0;
    this.currentStreak = 0;
    this.maxStreak = 0;
    this.incorrectPlacements = 0;
    this.perfectCompletion = true;

    // Reset navigation throttling
    this.lastNavigationTime = 0;

    // Reset peek functionality
    this.isPeeking = false;
    this.lastPeekTime = 0;

  }

  preload() {
    console.log('🎮 Solve scene preload started');

    // Load puzzle image
    if (this.puzzleConfig.imageUrl) {
      console.log('🔄 Loading puzzle image from:', this.puzzleConfig.imageUrl);
      this.load.image('puzzle-image', this.puzzleConfig.imageUrl);
    } else if (this.puzzleConfig.image) {
      console.log('🔄 Loading puzzle image from image property:', this.puzzleConfig.image);
      this.load.image('puzzle-image', this.puzzleConfig.image);
    } else {
      console.warn('⚠️ No puzzle image URL provided');
    }

    // Add loading event handlers
    this.load.on('filecomplete-image-puzzle-image', () => {
      console.log('✅ Puzzle image loaded successfully');
    });

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.error('❌ Failed to load:', file.key, 'from:', file.src);
    });

    // Load UI assets (these might not exist, so don't worry about 404s)
    this.load.image('back-button', '/assets/btn_back.png');
    this.load.image('camera-button', '/assets/btn_camera.png');
    this.load.image('btn_left_arrow', '/assets/arrow.png');
    this.load.image('btn_right_arrow', '/assets/arrow2.png');
    this.load.image('btn_left_rotate', '/assets/rotate.png');
    this.load.image('btn_right_rotate', '/assets/rotate2.png');
    this.load.image('btn_left_arrow_hover', '/assets/arrow_over.png');
    this.load.image('btn_right_arrow_hover', '/assets/arrow2_over.png');
    this.load.image('btn_left_rotate_hover', '/assets/rotate_over.png');
    this.load.image('btn_right_rotate_hover', '/assets/rotate2_over.png');
    this.load.image('imgTimer', '/assets/timer.png');
    this.load.image('puzzleProgress', '/assets/obj_progressBar.png');
    this.load.image('puzzleProgressBG', '/assets/obj_progressbarBG.png');
    this.load.image('imgVictory', '/assets/solved.png');
    this.load.image('imgPerfect', '/assets/perfection.png');
    this.load.image('imgFail', '/assets/failed.png');

    this.load.audio('piece-snap', '/assets/Sounds/chime.wav');
    this.load.audio('puzzle-complete', '/assets/Sounds/chime.wav');
    this.load.audio('piece-error', '/assets/Sounds/strike.wav');

  }

  create() {
    const { width, height } = this.scale.gameSize;
    const scaleFactor = Math.min(width / 1024, height / 768);

    // Initialize game state
    this.initializeGameState();

    // Load and play background music
    void this.loadBackgroundMusic();

    // Create background
    //this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e).setDepth(0);
    this.background = this.add.image(-9999, 0, 'background').setOrigin(0);
    this.background!.setScale(
      Math.max(width / this.background!.width, height / this.background!.height)
    );
    this.background!.setPosition();

    this.logo = this.add.image(-9999, 0, 'logo').setOrigin(0.5, 0);
    this.logo!.setPosition(width / 2, 10).setScale(scaleFactor);

    this.imgPuzzle = this.add.image(width / 2, height / 2 - height/10, 'puzzle-image').setDepth(1001).setVisible(false);
    this.imgPuzzle.displayWidth = width - width * 0.05;
    this.imgPuzzle.scaleY = this.imgPuzzle.scaleX;

    // Create UI
    this.createUI();

    // Initialize grid and pieces
    this.initializeGrid();
    this.createPuzzlePieces();

    // Setup piece display area
    this.setupPieceDisplayArea();

    // Show first piece
    this.showCurrentPiece();

    // Setup controls
    this.setupKeyboardControls();

    // Load best score
    this.loadBestScore();
  }

  private createUI(): void {
    const { width, height } = this.scale.gameSize;
    const isMobile = width <= 400;

    // Back button
    if(this.backbutton) {
      this.backbutton.destroy();
    }
    
    this.backbutton = this.add
      .image(width * 0.025, height * 0.025, 'back-button')
      .setDepth(2000)
      .setOrigin(0,0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.scene.start('MainMenu');
      });

    // Camera/Peek button
    if(this.cameraButton) {
      this.cameraButton.destroy();
    }
    
    this.cameraButton = this.add.image(width * 0.025, height-150, 'camera-button')
    .setScale(isMobile ? 0.6 : 1).setOrigin(0,1)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', () => {
      this.showPeek();
    });

    // display arrow buttons
    if(this.btnLeftArrow) {
      this.btnLeftArrow.destroy();
    }
    this.btnLeftArrow = this.add.image(width/2 - 80, height - height * 0.025, 'btn_left_arrow')
    .setOrigin(0.5, 1)
    .setInteractive({ useHandCursor: true })
    .on('pointerover', () => {
      this.btnLeftArrow?.setTexture('btn_left_arrow_hover');
    })
    .on('pointerout', () => {
      this.btnLeftArrow?.setTexture('btn_left_arrow');
    })
    .on('pointerdown', () => {
      this.navigateToPreviousPiece();
    });
    if(this.btnRightArrow) {
      this.btnRightArrow.destroy();
    }
    this.btnRightArrow = this.add.image(width/2 + 80 ,  height - height * 0.025, 'btn_right_arrow')
    .setOrigin(0.5, 1)
    .setInteractive({ useHandCursor: true })
    .on('pointerover', () => {
      this.btnRightArrow?.setTexture('btn_right_arrow_hover');
    })
    .on('pointerout', () => {
      this.btnRightArrow?.setTexture('btn_right_arrow');
    })
    .on('pointerdown', () => {
      this.navigateToNextPiece();
    });

    // display rotate buttons
    if(this.btnLeftRotate) {
      this.btnLeftRotate.destroy();
    }
    this.btnLeftRotate = this.add.image(width * 0.025, height - height * 0.1, 'btn_left_rotate')
    .setOrigin(0, 1)
    .setInteractive({ useHandCursor: true })
    .on('pointerover', () => {
      this.btnLeftRotate?.setTexture('btn_left_rotate_hover');
    })
    .on('pointerout', () => {
      this.btnLeftRotate?.setTexture('btn_left_rotate');
    })
    .on('pointerdown', () => {
      this.rotatePieceLeft();
    });
    if(this.btnRightRotate) {
      this.btnRightRotate.destroy();
    }
    this.btnRightRotate = this.add.image(width - width * 0.025, height - height * 0.1, 'btn_right_rotate')
    .setOrigin(1, 1)
    .setInteractive({ useHandCursor: true })
    .on('pointerover', () => {
      this.btnRightRotate?.setTexture('btn_right_rotate_hover');
    })
    .on('pointerout', () => {
      this.btnRightRotate?.setTexture('btn_right_rotate');
    })
    .on('pointerdown', () => {
      this.rotatePieceRight();
    });

    // display timer
    if(this.imgTimer) {
      this.imgTimer.destroy();
    }
    this.imgTimer = this.add.image(width - width * 0.025, 60, 'imgTimer')
    .setOrigin(1, 1);

    // progress bar
    this.imgProgressBG = this.add.image(width/2, height - 150, 'puzzleProgressBG')
    .setOrigin(0.5, 1);

    this.imgProgress = this.add.image(width/2, height - 150, 'puzzleProgress')
    .setDepth(2)
    .setOrigin(0.5, 1);

    // Title
    /*this.add
      .text(width / 2, 30, this.puzzleConfig.title || 'Puzzle', {
        fontSize: isMobile ? '18px' : '24px',
        color: '#ffffff',
        fontFamily: "'Segoe UI', 'Tahoma', sans-serif",
      })
      .setOrigin(0.5);*/

    // Timer
    if(this.timerText) {
      this.timerText.destroy();
    }
    this.timerText = this.add
      .text(width - width * 0.025, 70, 'Time: 0:00', {
        fontSize: isMobile ? '14px' : '16px',
        color: '#000000',
        fontFamily: "'Segoe UI', 'Tahoma', sans-serif",
        fontStyle: 'bold',
      })
      .setOrigin(1, 0);

    // Score display
    if(this.scoreText) {
      this.scoreText.destroy();
    }
    this.scoreText = this.add
      .text(width/2, 70, 'Score: 0', {
        fontSize: isMobile ? '14px' : '16px',
        color: '#000000',
        fontFamily: "'Segoe UI', 'Tahoma', sans-serif",
        fontStyle: 'bold',
      })
      .setOrigin(0.5,0);

    // Streak display
    if(this.streakText) {
      this.streakText.destroy();
    }
    this.streakText = this.add
      .text(width * 0.025, 70, '', {
        fontSize: isMobile ? '14px' : '16px',
        color: '#015e0eff',
        fontFamily: "'Segoe UI', 'Tahoma', sans-serif",
        fontStyle: 'bold',
      })
      .setOrigin(0, 0);

    // Piece counter
    if(this.pieceCounterText) {
      this.pieceCounterText.destroy();
    }
    this.pieceCounterText = this.add
      .text(width / 2, height - (isMobile ? 190 : 180), '1 / 0', {
        fontSize: isMobile ? '14px' : '16px',
        color: '#000000',
        fontFamily: "'Segoe UI', 'Tahoma', sans-serif",
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0);

    // Instructions
    let instructions = 'Click grid or drag pieces • Arrow keys to navigate';
    if(isMobile) {
      instructions = 'Drag and drop or tap the grid to place puzzle pieces';
    }
    
    if(this.txtInstructions) {
      this.txtInstructions.destroy();
    }
    this.txtInstructions = this.add
      .text(width / 2, height - (isMobile ? 210 : 200), instructions, {
        fontSize: isMobile ? '10px' : '12px',
        color: '#333333',
        fontFamily: "'Segoe UI', 'Tahoma', sans-serif",
        align: 'center',
      })
      .setOrigin(0.5, 0);

    // Best score
    if(this.bestScoreText) {
      this.bestScoreText.destroy();
    }
    this.bestScoreText = this.add
      .text(width - 20, isMobile ? 50 : 60, '', {
        fontSize: isMobile ? '12px' : '14px',
        color: '#ffdd44',
        fontFamily: "'Segoe UI', 'Tahoma', sans-serif",
        fontStyle: 'bold',
      })
      .setOrigin(1, 0);
  }

  // Simple grid initialization
  private initializeGrid(): void {
    const { width, height } = this.scale.gameSize;
    const isMobile = width <= 400;

    const gridRows = this.puzzleConfig.gridRows;
    const gridCols = this.puzzleConfig.gridCols;

    console.log(`🎯 Initializing ${gridRows}x${gridCols} grid (${gridRows * gridCols} pieces)`);

    // Calculate available space
    const availableWidth = this.imgPuzzle!.displayWidth;
    const availableHeight = this.imgPuzzle!.displayHeight;

    // Calculate piece size
    const maxPieceSizeByWidth = availableWidth / gridCols;
    const maxPieceSizeByHeight = availableHeight / gridRows;
    this.pieceSize = Math.min(maxPieceSizeByWidth, maxPieceSizeByHeight);

    console.log("Grid size: " + this.pieceSize);
    console.log("Tile width: " + maxPieceSizeByWidth);
    console.log("Tile height: " + maxPieceSizeByHeight);

    // Center the grid
    const startX = this.imgPuzzle!.x - this.imgPuzzle!.displayWidth/2;
    const startY = this.imgPuzzle!.y - this.imgPuzzle!.displayHeight/2;

    // Initialize grid slots
    this.gridSlots = [];
    for (let row = 0; row < gridRows!; row++) {
      this.gridSlots[row] = [];
      for (let col = 0; col < gridCols!; col++) {
        this.gridSlots[row]![col] = {
          x: startX + col * maxPieceSizeByWidth + maxPieceSizeByWidth / 2,
          y: startY + row * maxPieceSizeByHeight + maxPieceSizeByHeight / 2,
          occupied: false,
        };
      }
    }

    // Create simple grid graphics and click areas
    // Create grid graphics
    this.gridSlotGraphics = this.add.graphics();
    this.gridSlotGraphics.setDepth(2); // Above background but below pieces
    this.gridSlotGraphics.lineStyle(3, 0x756a52, 0.9); // Thicker, more visible lines

    // Draw grid and create click areas
    for (let row = 0; row < gridRows!; row++) {
      for (let col = 0; col < gridCols!; col++) {
        const slot = this.gridSlots[row]?.[col];
        if (!slot) continue;

        // Draw grid rectangle
        this.gridSlotGraphics.strokeRect(
          slot.x - maxPieceSizeByWidth / 2,
          slot.y - maxPieceSizeByHeight / 2,
          maxPieceSizeByWidth,
          maxPieceSizeByHeight
        );

        // Create click area
        const clickArea = this.add.rectangle(
          slot.x,
          slot.y,
          maxPieceSizeByWidth,
          maxPieceSizeByHeight,
          0xffffff,
          0.7
        );

        clickArea.setDepth(3); // Ensure click areas are well above pieces
        clickArea.setInteractive();
        clickArea.on('pointerdown', () => {
          this.handleGridClick(row, col);
        });

        // No hover effects - just click functionality
      }
    }

    console.log(`✅ Created simple ${gridRows}x${gridCols} grid`);
  }

  // Simple grid click handler
  private handleGridClick(row: number, col: number): void {
    console.log(`🎯 Grid clicked: ${row},${col}`);

    if (!this.currentPiece || this.currentPiece.isPlaced) {
      console.log('⚠️ No current piece to place');
      return;
    }

    const slot = this.gridSlots[row]?.[col];
    if (!slot || slot.occupied) {
      console.log('⚠️ Slot unavailable');
      return;
    }

    // Only allow correct placement for clicks (original behavior)
    if (row === this.currentPiece.correctRow && col === this.currentPiece.correctCol && this.currentPiece.rotation == 0) {
      console.log('✅ Correct grid click placement!');
      this.placePieceInGrid(this.currentPiece, row, col);
    } else {
      console.log('❌ Wrong position clicked');
      this.showWrongPlacementFeedback(slot.x, slot.y);
      this.addIncorrectPlacementPenalty();
    }
  }

  // Create jigsaw puzzle pieces using the utility
  private createPuzzlePieces(): void {
    this.pieces = [];
    this.jigsawPieces = [];

    const gridRows = this.puzzleConfig.gridRows;
    const gridCols = this.puzzleConfig.gridCols;
    this.totalPieces = gridRows * gridCols;

    console.log(`🧩 Creating ${this.totalPieces} jigsaw puzzle pieces (${gridRows}x${gridCols})`);

    try {
      // Get the puzzle image
      const puzzleTexture = this.textures.get('puzzle-image');
      const source = puzzleTexture.source[0];
      
      if (!source || !source.image) {
        console.warn('⚠️ Invalid puzzle image source, falling back to simple pieces');
        //this.createSimplePieces();
        return;
      }
   
      // Generate jigsaw pieces
      this.jigsawPieces = CutJigsawImage(this.imgPuzzle!, {
        columns: gridCols, rows: gridRows,
        edgeWidth: 15, edgeHeight: 15,
        useDynamicTexture: false,
        //drawShapeCallback: this.DrawShapeCallback,
      });
      console.log(`✅ Generated ${this.jigsawPieces.length} jigsaw pieces`);

      // Create Phaser sprites from jigsaw pieces
      for (let i = 0,  cnt = this.jigsawPieces.length; i < cnt; i++) {
            const piece = this.jigsawPieces[i];
            piece!.preFX?.addGlow(0x000000, 1, 0);
            piece?.setDepth(4);
            piece?.setX(piece?.x + 5);
            piece?.setY(piece?.y + 5);
            piece?.setVisible(false);

            const row = Math.floor(i / gridCols);
            const col = i % gridCols;

            // random rotation 0,90,180,270
            const randomRotation = Math.floor(Math.random() * 4) * 90;

            // Create PuzzlePiece object
            const p: PuzzlePiece = {
              id: i,
              correctRow: row,
              correctCol: col,
              currentRow: -1,
              currentCol: -1,
              rotation: randomRotation,
              isPlaced: false,
              isInDisplay: false,
              sprite: this.add.image(-9999,0, piece!.texture, piece!.texture?.getFrameNames()[i])
            };
            
            //console.log(`🎮 Creating piece ${p.correctCol} - ${p.correctRow}`);

            this.pieces.push(p);
            this.setupSimpleDrag(p);
        }

        
        console.log(this.jigsawPiecePool.length);
        this.jigsawPiecePool.forEach((piece) => {
            console.log(`🎮 Creating piece ${piece.texture.key}`);
            
        });

      console.log(`✅ Created ${this.pieces.length} jigsaw puzzle pieces`);
    } catch (error) {
      console.error('❌ Error creating jigsaw pieces:', error);
      //this.createSimplePieces();
      return;
    }

    this.shuffleArray(this.pieces);
    this.updatePieceCounter();
  }

  // Simple drag setup
  private setupSimpleDrag(piece: PuzzlePiece): void {
    const sprite = piece.sprite;
    sprite.setInteractive({ draggable: true });

    sprite.on('dragstart', () => {
      console.log(`🎮 Dragging piece ${piece.correctRow},${piece.correctCol}`);
      sprite.setScale(this.JIGSAW_DISPLAY_SCALE * 1.1); // Slightly larger when dragging
      sprite.setDepth(1000);
      
      // Add glow effect when dragging
      //sprite.setTint(0xffffff);
      sprite.postFX?.addGlow(0x4ecdc4, 2, 0, false, 0.1, 8);

      if (piece.isInDisplay) {
        this.pieceDisplayArea.remove(sprite);
        piece.isInDisplay = false;
      }
    });

    sprite.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      sprite.setPosition(dragX, dragY);
    });

    sprite.on('dragend', (pointer: Phaser.Input.Pointer) => {
      const dropX = pointer.x;
      const dropY = pointer.y;

      console.log(
        `🎮 Dropped piece ${piece.correctRow},${piece.correctCol} at pointer position ${dropX},${dropY} (sprite at ${sprite.x},${sprite.y})`
      );
      sprite.setScale(this.JIGSAW_DISPLAY_SCALE);
      sprite.setDepth(5); // Keep pieces visible
      
      // Remove glow effect
      sprite.clearTint();
      sprite.postFX?.clear();
      sprite.postFX?.addGlow(0x000000, 2, 0, false, 0.1, 6);

      // Find the closest grid slot to where the pointer was when dropped
      let closestSlot = null;
      let minDistance = Infinity;

      const gridRows = this.puzzleConfig.gridRows;
      const gridCols = this.puzzleConfig.gridCols;

      for (let row = 0; row < gridRows!; row++) {
        for (let col = 0; col < gridCols!; col++) {
          const slot = this.gridSlots[row]?.[col];
          if (!slot) continue;

          const distance = Phaser.Math.Distance.Between(dropX, dropY, slot.x, slot.y);
          if (distance < minDistance) {
            minDistance = distance;
            closestSlot = { row, col, slot };
          }
        }
      }

      console.log(
        `📏 Closest slot: ${closestSlot?.row},${closestSlot?.col} at distance ${minDistance} (snap: ${this.puzzleSettings.snapDistance})`
      );

      // If dropped close enough to a slot, handle placement
      if (closestSlot && minDistance < this.puzzleSettings.snapDistance) {
        const slot = closestSlot.slot;
        
        // Check if slot is available
        if (slot.occupied) {
          console.log('⚠️ Slot occupied, returning to display');
          this.returnPieceToDisplay(piece);
          return;
        }
        
        // Check if it's the correct position
        if (closestSlot.row === piece.correctRow && closestSlot.col === piece.correctCol && piece.rotation == 0) {
          console.log(`✅ Correct drag drop placement at ${closestSlot.row},${closestSlot.col}`);
          this.placePieceInGrid(piece, closestSlot.row, closestSlot.col);
        } else {
          console.log(`❌ Wrong drag drop position ${closestSlot.row},${closestSlot.col}, returning to display`);
          this.showWrongPlacementFeedback(slot.x, slot.y);
          this.addIncorrectPlacementPenalty();
          this.returnPieceToDisplay(piece);
        }
      } else {
        console.log('📤 Dropped too far from any slot, returning to display');
        this.returnPieceToDisplay(piece);
      }
    });

    sprite.on('pointerdown', () => {
      if (!piece.isPlaced) {
        this.currentPieceIndex = this.pieces.indexOf(piece);
        this.currentPiece = piece;
        this.showCurrentPiece();
        console.log(`🎯 Selected piece ${piece.correctRow},${piece.correctCol}`);
      }
    });
  }

  // Place piece in grid
  private placePieceInGrid(piece: PuzzlePiece, row: number, col: number): void {
    const slot = this.gridSlots[row]?.[col];
    if (!slot || !piece.sprite) return;

    console.log(`✅ Placing piece ${piece.correctRow},${piece.correctCol} in grid ${row},${col}`);
    console.log(`📍 Grid slot coordinates: (${slot.x}, ${slot.y})`);


    // Instant placement - no animation
    this.jigsawPieces[piece.id]?.setVisible(true);
    //piece.sprite.setPosition(slot.x, slot.y);
    // Use a scale that fits the jigsaw piece (with tabs) within the grid slot
    piece.sprite.setScale(this.JIGSAW_GRID_SCALE);
    piece.sprite.setDepth(8); // Well above grid graphics but below click areas
    piece.sprite.setVisible(true); // Ensure piece is visible
    // Disable interaction for placed pieces (keep it simple for now)
    piece.sprite.disableInteractive();

    // Ensure the piece is added to the main scene (not in any container)
    if (piece.sprite.parentContainer) {
      piece.sprite.parentContainer.remove(piece.sprite);
    }

    // Add to main scene if not already there
    /*if (!this.children.exists(piece.sprite)) {
      this.add.existing(piece.sprite);
    }*/
   

    console.log(
      `📍 Piece positioned at (${slot.x}, ${slot.y}) with depth ${piece.sprite.depth} and scale ${piece.sprite.scale}`
    );
    console.log(`👁️ Piece visibility: ${piece.sprite.visible}, alpha: ${piece.sprite.alpha}`);
    console.log(
      `🏠 Piece parent container: ${piece.sprite.parentContainer ? 'In container' : 'In main scene'}`
    );
    console.log(`🎯 Piece in scene children: ${this.children.exists(piece.sprite)}`);

    // Force a render update
    piece.sprite.setVisible(false);
    
    // Keep the piece's natural color (no tint)
    piece.sprite.clearTint();

    piece.isPlaced = true;
    piece.isInDisplay = false;
    piece.currentRow = row;
    piece.currentCol = col;

    slot.occupied = true;
    slot.piece = piece;

    // Since handleGridClick only allows correct placements, all pieces here are correct
    this.completedPieces++;
    this.addCorrectPlacementScore();
    piece.sprite.clearTint(); // Ensure no tint for correct pieces
    console.log(
      `✅ Piece correctly placed! Completed: ${this.completedPieces}/${this.totalPieces}`
    );

    this.incrementMoveCount();
    this.sound.play('piece-snap', { volume: 1 });

    // Add satisfying placement animation
    piece.sprite.setScale(this.JIGSAW_GRID_SCALE * 1.2);
    
    this.tweens.add({
      targets: piece.sprite,
      scaleX: this.JIGSAW_GRID_SCALE,
      scaleY: this.JIGSAW_GRID_SCALE,
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Add subtle glow effect for placed pieces
        //piece.sprite.postFX?.addGlow(0x4ecdc4, 1, 0, false, 0.05, 4);
      }
    });

    // Check completion with detailed logging
    console.log(`🔍 Completion check: ${this.completedPieces} >= ${this.totalPieces} = ${this.completedPieces >= this.totalPieces}`);
    
    if (this.completedPieces >= this.totalPieces) {
      console.log('🎉 Triggering puzzle completion!');
      this.completePuzzle();
    } else {
      console.log('📦 Advancing to next piece...');
      this.advanceToNextUnplacedPiece();
    }
  }

  // Return piece to display
  private returnPieceToDisplay(piece: PuzzlePiece): void {
    try {
      // Validate piece and sprite
      if (!piece || !piece.sprite || piece.sprite.destroyed || !piece.sprite.active) {
        console.error('❌ Cannot return invalid piece to display');
        return;
      }

      console.log(`🔄 Returning piece ${piece.correctRow},${piece.correctCol} to display`);

      // Ensure display area exists
      if (!this.pieceDisplayArea) {
        console.error('❌ Display area not available');
        return;
      }

      // Remove from any existing container first
      if (piece.sprite.parentContainer && piece.sprite.parentContainer !== this.pieceDisplayArea) {
        piece.sprite.parentContainer.remove(piece.sprite);
      }

      // Position and style the piece
      piece.sprite.setPosition(0, 0);
      piece.sprite.setScale(this.JIGSAW_DISPLAY_SCALE);
      piece.sprite.setDepth(12);
      piece.sprite.setVisible(true);
      piece.sprite.setAlpha(1);
      piece.sprite.clearTint();
      
      // Add visual effects
      piece.sprite.postFX?.clear();
      piece.sprite.postFX?.addGlow(0x000000, 2, 0, false, 0.1, 6);
      
      // Add to display
      piece.isInDisplay = true;
      this.pieceDisplayArea.add(piece.sprite);

      // Update current piece tracking with validation
      const pieceIndex = this.pieces.indexOf(piece);
      if (pieceIndex !== -1) {
        this.currentPieceIndex = pieceIndex;
        this.currentPiece = piece;
      } else {
        console.warn('⚠️ Piece not found in pieces array, rebuilding...');
        this.rebuildPiecesArray();
        const newIndex = this.pieces.indexOf(piece);
        if (newIndex !== -1) {
          this.currentPieceIndex = newIndex;
          this.currentPiece = piece;
        }
      }

      this.updatePieceCounter();
    } catch (error) {
      console.error('❌ Error returning piece to display:', error);
      // Try to show current piece as fallback
      this.showCurrentPiece();
    }
  }

  // Show wrong placement feedback
  private showWrongPlacementFeedback(x: number, y: number): void {
    const feedback = this.add
      .text(x, y, '✗', {
        fontSize: '32px',
        color: '#ff0000',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(1000);

    this.sound.play('piece-error', { volume: 1 });
      
    // Instant feedback - no animation, just destroy after short delay
    this.time.delayedCall(500, () => {
      if (feedback && feedback.destroy) {
        feedback.destroy();
      }
    });
  }

  // Setup piece display area
  private setupPieceDisplayArea(): void {
    const { width, height } = this.scale.gameSize;
    const isMobile = width <= 400;

    const displayY = height - (isMobile ? 80 : 100);
    this.pieceDisplayArea = this.add.container(width / 2, displayY);
    this.pieceDisplayArea.setDepth(10); // Ensure display area is visible

    // Larger display area to accommodate realistic pieces with tabs
    /*const displaySize = isMobile ? 100 : 120;
    const displayBg = this.add
      .rectangle(0, 0, displaySize, displaySize, 0x333333, 0.9)
      .setStrokeStyle(3, 0x666666);
    this.pieceDisplayArea.add(displayBg);*/

    this.pieces.forEach((piece) => {
      if (piece.sprite) {
        piece.sprite.setPosition(0, 0);
        piece.sprite.setDepth(12);
        piece.sprite.setScale(this.JIGSAW_DISPLAY_SCALE);
        piece.sprite.setVisible(false);
        this.pieceDisplayArea.add(piece.sprite);
      }
    });
  }

  // Rebuild pieces array to remove null/invalid entries - conservative approach
  private rebuildPiecesArray(): boolean {
    const originalLength = this.pieces.length;
    
    // Only filter out pieces that are truly invalid (null, undefined, or destroyed)
    // Don't filter based on 'active' state as pieces may be temporarily inactive during navigation
    this.pieces = this.pieces.filter((piece) => {
      return piece && 
             piece.sprite && 
             !piece.sprite.destroyed &&
             typeof piece.correctRow === 'number' &&
             typeof piece.correctCol === 'number';
    });

    const newLength = this.pieces.length;
    const wasRebuilt = originalLength !== newLength;
    
    if (wasRebuilt) {
      console.log(`🔧 Rebuilt pieces array: ${originalLength} → ${newLength} pieces`);
      
      // Reset current piece index if it's now invalid
      if (this.currentPieceIndex >= newLength) {
        this.currentPieceIndex = Math.max(0, newLength - 1);
        console.log(`📍 Reset currentPieceIndex to ${this.currentPieceIndex}`);
      }
    }
    
    return wasRebuilt;
  }

  // Get valid unplaced pieces with conservative checks
  private getValidUnplacedPieces(): PuzzlePiece[] {
    return this.pieces.filter((piece) => {
      return piece && 
             piece.sprite && 
             !piece.sprite.destroyed &&
             !piece.isPlaced &&
             typeof piece.correctRow === 'number' &&
             typeof piece.correctCol === 'number';
    });
  }

  // Find next valid piece index starting from a given index
  private findNextValidPieceIndex(startIndex: number, direction: 1 | -1 = 1): number | null {
    const validPieces = this.getValidUnplacedPieces();
    
    if (validPieces.length === 0) {
      return null;
    }

    // If we only have one valid piece, return its index
    if (validPieces.length === 1) {
      const singlePiece = validPieces[0];
      return singlePiece ? this.pieces.indexOf(singlePiece) : null;
    }

    // Find current piece in valid pieces array
    const currentPiece = this.pieces[startIndex];
    let currentValidIndex = -1;
    
    if (currentPiece && !currentPiece.isPlaced) {
      currentValidIndex = validPieces.indexOf(currentPiece);
    }

    // If current piece is not in valid pieces, start from beginning/end
    if (currentValidIndex === -1) {
      const targetPiece = direction === 1 ? validPieces[0] : validPieces[validPieces.length - 1];
      return targetPiece ? this.pieces.indexOf(targetPiece) : null;
    }

    // Navigate to next/previous valid piece
    const nextValidIndex = direction === 1 
      ? (currentValidIndex + 1) % validPieces.length
      : (currentValidIndex - 1 + validPieces.length) % validPieces.length;
    
    const nextValidPiece = validPieces[nextValidIndex];
    if (!nextValidPiece) {
      return null;
    }
    return this.pieces.indexOf(nextValidPiece);
  }

  // Show current piece with robust error handling
  private showCurrentPiece(): void {
    try {
      if (this.pieces.length === 0) {
        console.log('⚠️ No pieces to show - empty array');
        this.updatePieceCounter();
        return;
      }

      // Get valid unplaced pieces
      const validUnplacedPieces = this.getValidUnplacedPieces();
      
      if (validUnplacedPieces.length === 0) {
        console.log('🎉 All pieces are placed - puzzle complete!');
        this.pieceDisplayArea.removeAll(true);
        return;
      }

      // Validate and fix current piece index
      let targetPiece: PuzzlePiece | null = null;
      
      // Check if current index points to a valid unplaced piece
      if (this.currentPieceIndex >= 0 && 
          this.currentPieceIndex < this.pieces.length) {
        const candidatePiece = this.pieces[this.currentPieceIndex];
        if (candidatePiece && 
            candidatePiece.sprite && 
            candidatePiece.sprite.active && 
            !candidatePiece.sprite.destroyed &&
            !candidatePiece.isPlaced) {
          targetPiece = candidatePiece;
        }
      }

      // If current piece is invalid, find the first valid unplaced piece
     if (!targetPiece) {
        console.log('⚠️ Current piece is invalid, finding first valid unplaced piece');
        targetPiece = validUnplacedPieces[0] || null;
        
        if (targetPiece) {
          this.currentPieceIndex = this.pieces.indexOf(targetPiece);
          console.log(`📍 Reset to piece index ${this.currentPieceIndex}`);
        }
      }

      // Final validation
      if (!targetPiece || 
          !targetPiece.sprite || 
          targetPiece.sprite.destroyed ||
          !targetPiece.sprite.active) {
        console.error('❌ No valid piece found to display');
        this.updatePieceCounter();
        return;
      }

      // Set current piece
      this.currentPiece = targetPiece;
      //console.log(`📦 Showing piece ${targetPiece.correctRow},${targetPiece.correctCol} (index: ${this.currentPieceIndex})`);

      // Display the piece
      if (this.pieceDisplayArea && !this.gameCompleted) {
        try {
          // Remove from any existing container first
          if (targetPiece.isInDisplay && targetPiece.sprite.parentContainer) {
            targetPiece.sprite.parentContainer.remove(targetPiece.sprite);
          }

          this.pieces.forEach((piece) => {
            if (piece.sprite) {
              piece.sprite.setVisible(false);
            }
          });

          // Position and style the piece
          targetPiece.sprite.setVisible(true);
          targetPiece.sprite.postFX?.clear();
          targetPiece.sprite.postFX?.addGlow(0x000000, 2, 0, false, 0.1, 6);
          targetPiece.sprite.setRotation(Phaser.Math.DegToRad(targetPiece.rotation));
       
          // Add to display
          targetPiece.isInDisplay = true;
          this.pieceDisplayArea.add(targetPiece.sprite);

          console.log(`✅ Successfully displayed piece ${targetPiece.correctRow},${targetPiece.correctCol}`);

          // Start timer if needed
          if (!this.gameStarted) {
            this.startTimer();
          }
        } catch (displayError) {
          console.error('❌ Error displaying piece:', displayError);
          targetPiece.isInDisplay = false;
        }
      }

      this.updatePieceCounter();
    } catch (error) {
      console.error('❌ Critical error in showCurrentPiece:', error);
    }
  }

  // Load and play random background music
  private async loadBackgroundMusic(): Promise<void> {
    try {
      console.log('🎵 Loading background music...');

      // Fetch available music tracks
      const response = await fetch('/api/music-tracks');
      const data = await response.json();

      if (data.status === 'success' && data.tracks && data.tracks.length > 0) {
        // Filter for OGG files only
        const oggTracks = data.tracks.filter(
          (track: MusicTrackData) => track.cdnUrl && track.cdnUrl.toLowerCase().includes('.ogg') && track.cdnUrl.toLowerCase().includes('t')
        );

        if (oggTracks.length > 0) {
          console.log('🎵 Available OGG music tracks:', oggTracks);
          // Select a random OGG track
          const randomTrack = oggTracks[Math.floor(Math.random() * oggTracks.length)];
          console.log('🎵 Selected random track:', randomTrack.trackId);

          // Load the audio file
          this.load.audio('background-music', randomTrack.cdnUrl);

          // Start loading
          this.load.start();

          // Play when loaded
          this.load.once('complete', () => {
            this.playBackgroundMusic();
          });
        } else {
          console.log('🎵 No OGG music tracks found');
        }
      } else {
        console.log('🎵 No music tracks available');
      }
    } catch (error) {
      console.error('❌ Error loading background music:', error);
    }
  }

  // Play background music
  private playBackgroundMusic(): void {
    try {
      if (this.cache.audio.exists('background-music')) {
        this.backgroundMusic = this.sound.add('background-music', {
          volume: 0.3,
          loop: true,
        });

        this.backgroundMusic.play();
        console.log('🎵 Background music started');
      }
    } catch (error) {
      console.error('❌ Error playing background music:', error);
    }
  }

  // Stop background music
  private stopBackgroundMusic(): void {
    if (this.backgroundMusic) {
      this.backgroundMusic.stop();
      this.backgroundMusic.destroy();
      this.backgroundMusic = null;
      console.log('🎵 Background music stopped');
    }
  }

  // Setup keyboard controls
  private setupKeyboardControls(): void {
    this.input.keyboard?.on('keydown-LEFT', () => {
      this.navigateToPreviousPiece();
    });

    this.input.keyboard?.on('keydown-RIGHT', () => {
      this.navigateToNextPiece();
    });
  }

  // Navigate to previous piece
  private navigateToPreviousPiece(): void {
    // Throttle navigation to prevent rapid-fire calls
    const now = this.time.now;
    if (now - this.lastNavigationTime < this.navigationCooldown) {
      return;
    }
    this.lastNavigationTime = now;

    try {
      if (this.pieces.length === 0) {
        console.log('⚠️ No pieces available for navigation');
        return;
      }

      // Check if all pieces are placed
      const validUnplacedPieces = this.getValidUnplacedPieces();
      if (validUnplacedPieces.length === 0) {
        console.log('🎉 All pieces are placed!');
        return;
      }

      // Simple navigation - find previous unplaced piece
      let attempts = 0;
      let prevIndex = this.currentPieceIndex;
      
      do {
        prevIndex = (prevIndex - 1 + this.pieces.length) % this.pieces.length;
        attempts++;
      } while (
        attempts < this.pieces.length && 
        this.pieces[prevIndex] && 
        this.pieces[prevIndex]!.isPlaced
      );
      
      // Validate the found piece
      const prevPiece = this.pieces[prevIndex];
      if (prevPiece && !prevPiece.isPlaced && prevPiece.sprite && !prevPiece.sprite.destroyed) {
        this.currentPieceIndex = prevIndex;
        console.log(`⬅️ Navigated to previous piece: ${prevPiece.correctRow},${prevPiece.correctCol}`);
        this.showCurrentPiece();
      } else {
        console.log('⚠️ No valid previous piece found');
      }
    } catch (error) {
      console.error('❌ Error navigating to previous piece:', error);
      // Try to show current piece as fallback
      this.showCurrentPiece();
    }
  }

  // Navigate to next piece
  private navigateToNextPiece(): void {
    // Throttle navigation to prevent rapid-fire calls
    const now = this.time.now;
    if (now - this.lastNavigationTime < this.navigationCooldown) {
      return;
    }
    this.lastNavigationTime = now;

    try {
      if (this.pieces.length === 0) {
        console.log('⚠️ No pieces available for navigation');
        return;
      }

      // Check if all pieces are placed
      const validUnplacedPieces = this.getValidUnplacedPieces();
      if (validUnplacedPieces.length === 0) {
        console.log('🎉 All pieces are placed!');
        return;
      }

      // Simple navigation - find next unplaced piece
      let attempts = 0;
      let nextIndex = this.currentPieceIndex;
      
      do {
        nextIndex = (nextIndex + 1) % this.pieces.length;
        attempts++;
      } while (
        attempts < this.pieces.length && 
        this.pieces[nextIndex] && 
        this.pieces[nextIndex]!.isPlaced
      );
      
      // Validate the found piece
      const nextPiece = this.pieces[nextIndex];
      if (nextPiece && !nextPiece.isPlaced && nextPiece.sprite && !nextPiece.sprite.destroyed) {
        this.currentPieceIndex = nextIndex;
        console.log(`➡️ Navigated to next piece: ${nextPiece.correctRow},${nextPiece.correctCol}`);
        this.showCurrentPiece();
      } else {
        console.log('⚠️ No valid next piece found');
      }
    } catch (error) {
      console.error('❌ Error navigating to next piece:', error);
      // Try to show current piece as fallback
      this.showCurrentPiece();
    }
  }

  // Advance to next unplaced piece
  private advanceToNextUnplacedPiece(): void {
    try {
      // Check if all pieces are placed
      const validUnplacedPieces = this.getValidUnplacedPieces();
      console.log(`🔍 Valid unplaced pieces remaining: ${validUnplacedPieces.length}`);
      
      if (validUnplacedPieces.length === 0) {
        console.log('🎉 All pieces are placed! Triggering completion...');
        this.completePuzzle();
        return;
      }

      // Simple navigation - find next unplaced piece
      let attempts = 0;
      let nextIndex = this.currentPieceIndex;
      
      do {
        nextIndex = (nextIndex + 1) % this.pieces.length;
        attempts++;
      } while (
        attempts < this.pieces.length && 
        this.pieces[nextIndex] && 
        this.pieces[nextIndex]!.isPlaced
      );
      
      // Validate the found piece
      const nextPiece = this.pieces[nextIndex];
      if (nextPiece && !nextPiece.isPlaced && nextPiece.sprite && !nextPiece.sprite.destroyed) {
        this.currentPieceIndex = nextIndex;
        console.log(`📦 Advanced to piece ${nextPiece.correctRow},${nextPiece.correctCol} (index: ${nextIndex})`);
        this.showCurrentPiece();
        return;
      }

      // Fallback: use first valid unplaced piece
      if (validUnplacedPieces.length > 0) {
        const fallbackPiece = validUnplacedPieces[0]!;
        this.currentPieceIndex = this.pieces.indexOf(fallbackPiece);
        console.log(`📦 Fallback: advanced to piece ${fallbackPiece.correctRow},${fallbackPiece.correctCol}`);
        this.showCurrentPiece();
        return;
      }
      
      console.log('⚠️ No valid unplaced pieces found in advance');
    } catch (error) {
      console.error('❌ Error advancing to next piece:', error);
      // Try to show current piece as fallback
      this.showCurrentPiece();
    }
  }

  // Start timer
  private startTimer(): void {
    this.gameStarted = true;
    this.startTime = this.time.now;

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true,
    });
  }

  // Update timer
  private updateTimer(): void {
    if (this.gameCompleted) return;

    this.elapsedTime = (this.time.now - this.startTime) / 1000;
    const minutes = Math.floor(this.elapsedTime / 60);
    const seconds = Math.floor(this.elapsedTime % 60);

    if (this.timerText) {
      this.timerText.setText(`Time: ${minutes}:${seconds.toString().padStart(2, '0')}`);
    }
  }

  // Increment move count
  private incrementMoveCount(): void {
    this.moveCount++;
  }

  // Add correct placement score
  private addCorrectPlacementScore(): void {
    this.currentStreak++;
    this.maxStreak = Math.max(this.maxStreak, this.currentStreak);

    const points = 5 * this.currentStreak;
    this.score += points;

    this.updateScoreDisplay();
  }

  // Add incorrect placement penalty
  private addIncorrectPlacementPenalty(): void {
    this.currentStreak = 0;
    this.incorrectPlacements++;
    this.perfectCompletion = false;

    this.score = Math.max(0, this.score - 25);
    this.updateScoreDisplay();
  }

  // Update score display
  private updateScoreDisplay(): void {
    if (this.scoreText) {
      this.scoreText.setText(`Score: ${this.score}`);
    }

    if (this.streakText) {
      
      this.streakText.setText(`Streak: ${this.currentStreak}`);

      if(this.currentStreak == 0) 
        this.streakText.setVisible(false);
      else
        this.streakText.setVisible(true);
    }
  }

  // Update piece counter
  private updatePieceCounter(): void {
    try {
      const remaining = this.pieces.filter((p) => p && !p.isPlaced).length;
      if (this.pieceCounterText && this.pieces.length > 0) {
        //const safeIndex = Math.max(0, Math.min(this.currentPieceIndex, this.pieces.length - 1));
        this.pieceCounterText.setText(
          `Progress: ${this.pieces.length-remaining}`
        );
        // show progress bar imgProgress
        console.log(`📦 Progress: ${this.pieces.length-remaining}/${this.pieces.length} ${remaining})`);
        console.log(`📦 Progress: ${((this.pieces.length-remaining) / this.pieces.length) * 100}%`);
        if(!this.imgProgress) {
          this.imgProgress = this.add.image(this.imgProgressBG!.x, this.imgProgressBG!.y, 'puzzleProgress')
          .setDepth(2)
          .setOrigin(0.5, 1);
        }
        this.imgProgress!.setCrop(0, 0, ((this.pieces.length-remaining) / this.pieces.length) * 100, 100);
      }
    } catch (error) {
      console.error('❌ Error updating piece counter:', error);
    }
  }

  // Load best score
  private loadBestScore(): void {
    const key = `best-score-${this.puzzleConfig.puzzleId || 'default'}`;
    const bestScoreData = localStorage.getItem(key);

    if (bestScoreData) {
      const data = JSON.parse(bestScoreData);
      if (this.bestScoreText) {
        const perfectBadge = data.perfectCompletion ? ' 🏆' : '';
        this.bestScoreText.setText(`Best: ${data.score}${perfectBadge}`);
      }
    }
  }

  // Complete puzzle
  private completePuzzle(): void {
    this.gameCompleted = true;
    this.timerEvent?.destroy();

    if (this.gameStarted) {
      this.elapsedTime = (this.time.now - this.startTime) / 1000;
    }

    this.updatePieceCounter();
    this.imgProgress?.setCrop();
    this.cameraButton?.setVisible(false);
    this.btnLeftArrow?.setVisible(false);
    this.btnRightArrow?.setVisible(false);
    this.btnLeftRotate?.setVisible(false);
    this.btnRightRotate?.setVisible(false);
    
    this.sound.play('puzzle-complete', { volume: 1 });

    // Calculate stars based on performance
    const stars = this.calculateStars();

    // Save progress to server and check for achievements
    void this.saveProgress(stars);
    void this.checkForNewAchievements();

    console.log('🎉 Puzzle completed!');
    // For now, just show a simple completion message
    const { width, height } = this.scale.gameSize;

    // Show stars earned
    let sText = '';
    for (let i = 0; i < stars; i++) {
      sText += '⭐';
    }

    const starsText = this.add
      .text(width / 2, height / 2 + 50, sText, {
        fontSize: '32px',
        color: '#FFD700',
        fontFamily: "'Segoe UI', 'Tahoma', sans-serif",
      })
      .setDepth(2000)
      .setOrigin(0.5);

    // Add "Share my Solve" button for community puzzles
    let shareSolveBtn: Phaser.GameObjects.Text | null = null;
    if (this.isCommunityPuzzle && this.communityPuzzleData?.postId){
      shareSolveBtn = this.add
        .text(width / 2, height - height * 0.1, 'Share my Solve! 🎉', {
          fontSize: '24px',
          color: '#ffffff',
          backgroundColor: '#FF6B35',
          padding: { x: 20, y: 10 },
        })
        .setOrigin(0.5, 1)
        .setDepth(2000)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          void this.shareSolveStats();
        });
    }

    this.completionOverlayElements = shareSolveBtn
      ? [starsText, shareSolveBtn]
      : [starsText];

    const startX = this.imgPuzzle!.x;
    const startY = this.imgPuzzle!.y;
    if(this.perfectCompletion) {
      this.imgPerfect = this.add.image(startX, startY, 'imgPerfect')
      .setScale(this.imgPuzzle!.scaleX, this.imgPuzzle!.scaleY)
      .setDepth(2000);
    } else {
      this.imgVictory = this.add.image(startX, startY, 'imgVictory')
      .setScale(this.imgPuzzle!.scaleX, this.imgPuzzle!.scaleY)
      .setDepth(2000);
    }
  }

  private calculateStars(): number {
    // Star calculation based on performance
    let stars = 1; // Base star for completion

    // Time bonus (if completed quickly)
    const timeBonus = this.elapsedTime < 60 ? 1 : this.elapsedTime < 120 ? 0.5 : 0;

    // Perfect completion bonus (no incorrect placements)
    const perfectBonus = this.incorrectPlacements === 0 ? 1 : 0;

    // Score bonus (high score)
    const scoreBonus = this.score > 1000 ? 1 : this.score > 500 ? 0.5 : 0;

    stars += timeBonus + perfectBonus + scoreBonus;
    return Math.min(Math.floor(stars), 5); // Cap at 5 stars
  }

  private async saveProgress(stars: number): Promise<void> {
    try {
      const puzzleId = this.puzzleConfig.puzzleId || 'nature-waterfall';

      // Check if this is a community puzzle (starts with 'community-')
      const isCommunityPuzzle = puzzleId.startsWith('community-');

      if (isCommunityPuzzle) {
        // Save community puzzle completion
        await this.saveCommunityPuzzleCompletion(stars);
      } else {
        // Save regular progress
        const progressData: SaveProgressRequest = {
          puzzleId,
          stars,
          time: this.elapsedTime,
          score: this.score,
          unlocks: this.determineUnlocks(stars),
        };

        const response = await fetch('/api/user/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(progressData),
        });

        const result = await response.json();

        if (result.status === 'success') {
          console.log('✅ Progress saved successfully');
        } else {
          console.warn('⚠️ Failed to save progress:', result.message);
        }

        // Also send completion data for achievement checking
        const completionData = {
          time: this.elapsedTime,
          score: this.score,
          moves: this.moveCount,
          perfectCompletion: this.perfectCompletion,
          maxStreak: this.maxStreak,
          stars,
          puzzleId,
          difficulty: this.puzzleConfig.difficulty || 'medium'
        };

        await fetch('/api/puzzle-complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(completionData),
        });
      }
    } catch (error) {
      console.error('❌ Error saving progress:', error);
    }
  }

  private async saveCommunityPuzzleCompletion(stars: number): Promise<void> {
    /*try {
      // Get current post ID from URL or context
      const urlParams = new URLSearchParams(window.location.search);
      const postId = urlParams.get('postId') || window.location.pathname.split('/').pop();

      const completionData = {
        puzzleId: this.puzzleConfig.puzzleId,
        postId,
        time: this.elapsedTime,
        score: this.score,
        moves: this.moveCount,
        stars,
        perfectCompletion: this.incorrectPlacements === 0,
        maxStreak: this.maxStreak,
      };

      const response = await fetch('/api/community-puzzle-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(completionData),
      });

      const result = await response.json();

      if (result.status === 'success') {
        console.log('✅ Community puzzle completion saved and posted!');
      } else {
        console.warn('⚠️ Failed to save community puzzle completion:', result.message);
      }
    } catch (error) {
      console.error('❌ Error saving community puzzle completion:', error);
    }*/
  }

  private async shareSolveStats(): Promise<void> {
    try {
      if (!this.isCommunityPuzzle || !this.communityPuzzleData?.postId) {
        console.warn('⚠️ Cannot share solve stats - not a community puzzle or missing post ID');
        return;
      }

      const shareData = {
        puzzleId: this.puzzleConfig.puzzleId,
        time: Math.round(this.elapsedTime),
        moves: this.moveCount,
        score: this.score,
        perfect: this.incorrectPlacements === 0,
        postId: this.communityPuzzleData.postId,
      };

      console.log('📤 Sharing solve stats:', shareData);

      const response = await fetch('/api/share-solve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shareData),
      });

      const result = await response.json();

      if (result.status === 'success') {
        console.log('✅ Solve stats shared successfully!');

        // Show success feedback
        const { width, height } = this.scale.gameSize;
        const successText = this.add
          .text(width / 2, height / 2 + 220, '✅ Shared to Reddit!', {
            fontSize: '20px',
            color: '#00FF00',
            fontFamily: "'Segoe UI', 'Tahoma', sans-serif",
          })
          .setOrigin(0.5);

        // Add to completion overlay elements so it gets cleaned up
        this.completionOverlayElements.push(successText);

        // Fade out the success message after 3 seconds
        this.time.delayedCall(3000, () => {
          successText.destroy();
        });
      } else {
        console.warn('⚠️ Failed to share solve stats:', result.message);

        // Show error feedback
        const { width, height } = this.scale.gameSize;
        const errorText = this.add
          .text(width / 2, height / 2 + 220, '❌ Failed to share', {
            fontSize: '20px',
            color: '#FF0000',
            fontFamily: "'Segoe UI', 'Tahoma', sans-serif",
          })
          .setOrigin(0.5);

        this.completionOverlayElements.push(errorText);

        this.time.delayedCall(3000, () => {
          errorText.destroy();
        });
      }
    } catch (error) {
      console.error('❌ Error sharing solve stats:', error);
    }
  }

  private determineUnlocks(stars: number): string[] {
    const unlocks: string[] = [];

    // Simple unlock system - unlock next puzzle based on current puzzle and stars
    if (stars >= 3) {
      // Unlock next puzzle in sequence
      const puzzleSequence = [
        'nature-waterfall',
        'nature-forest',
        'ocean-beach',
        'landscape-mountain',
        'space-saturn',
        'space-galaxy',
        'nature-lake',
        'city-skyline',
      ];

      const puzzleId = this.puzzleConfig.puzzleId || 'nature-waterfall';
      const currentIndex = puzzleSequence.indexOf(puzzleId);
      if (currentIndex >= 0 && currentIndex < puzzleSequence.length - 1) {
        const nextPuzzle = puzzleSequence[currentIndex + 1];
        if (nextPuzzle) {
          unlocks.push(nextPuzzle);
        }
      }
    }

    return unlocks;
  }

  // Shuffle array
  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = array[i];
      array[i] = array[j]!;
      array[j] = temp!;
    }
    return array;
  }

  // Cleanup
  shutdown() {
    console.log('🔄 Solve scene shutting down');
    this.stopBackgroundMusic();
    this.cleanupPreviousPuzzle();
  }

  private showPeek(): void {
    // Prevent multiple peeks at once or too frequent usage
    const currentTime = this.time.now;
    if (this.isPeeking || currentTime - this.lastPeekTime < this.peekCooldown) {
      if (!this.isPeeking) {
        const remainingCooldown = Math.ceil(
          (this.peekCooldown - (currentTime - this.lastPeekTime)) / 1000
        );
        console.log(`⏳ Peek on cooldown for ${remainingCooldown} more seconds`);

        // Show brief cooldown message
        const { width, height } = this.scale.gameSize;
        const cooldownText = this.add
          .text(width / 2, height / 2, `Wait ${remainingCooldown}s`, {
            fontSize: '20px',
            color: '#ffffffff',
            fontFamily: "'Segoe UI', 'Tahoma', sans-serif",
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 },
          })
          .setOrigin(0.5)
          .setDepth(1000);

        this.time.delayedCall(1000, () => {
          cooldownText.destroy();
        });
      }
      return;
    }

    console.log('👁️ Showing puzzle peek for 2 seconds');
    this.isPeeking = true;
    this.lastPeekTime = currentTime;


    // Show the full puzzle image positioned exactly over the grid
    if (this.textures.exists('puzzle-image')) {
      this.imgPuzzle?.setVisible(true);

      // Remove everything after 2 seconds
      this.time.delayedCall(2000, () => {
        
        this.imgPuzzle?.setVisible(false);
        this.isPeeking = false;
        console.log('👁️ Peek ended');
      });
    }
  }

  private async checkForNewAchievements(): Promise<void> {
    try {
      const response = await fetch('/api/achievements');
      const data = await response.json();

      if (data.status === 'success' && data.achievements) {
        // Check if there are any recently unlocked achievements (within last 10 seconds)
        const recentlyUnlocked = data.achievements.achievements.filter((achievement: Achievement) => 
          achievement.isUnlocked && 
          achievement.unlockedAt && 
          Date.now() - achievement.unlockedAt < 10000
        );

        if (recentlyUnlocked.length > 0) {
          this.showAchievementNotifications(recentlyUnlocked);
        }
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  }

  private showAchievementNotifications(achievements: Achievement[]): void {
    const { width } = this.scale;
    
    achievements.forEach((achievement, index) => {
      // Create achievement notification
      const notificationY = 100 + (index * 80);
      
      const notification = this.add.container(width + 300, notificationY);
      
      // Background
      const bg = this.add.rectangle(0, 0, 280, 60, 0x4CAF50, 0.95);
      bg.setStrokeStyle(2, 0xFFD700);
      notification.add(bg);
      
      // Achievement icon
      const icon = this.add.text(-100, 0, achievement.icon, {
        fontSize: '24px'
      }).setOrigin(0.5);
      notification.add(icon);
      
      // Achievement text
      const title = this.add.text(-20, -10, 'Achievement Unlocked!', {
        fontSize: '14px',
        color: '#FFFFFF',
        fontFamily: "'Segoe UI', 'Tahoma', sans-serif",
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      notification.add(title);
      
      const name = this.add.text(-20, 10, achievement.title, {
        fontSize: '12px',
        color: '#FFD700',
        fontFamily: 'Arial'
      }).setOrigin(0, 0.5);
      notification.add(name);
      
      // Animate in
      this.tweens.add({
        targets: notification,
        x: width - 150,
        duration: 500,
        ease: 'Back.easeOut',
        delay: index * 200
      });
      
      // Animate out after 4 seconds
      this.tweens.add({
        targets: notification,
        x: width + 300,
        duration: 500,
        ease: 'Back.easeIn',
        delay: 4000 + (index * 200),
        onComplete: () => {
          notification.destroy();
        }
      });
    });
  }

  private cleanupPreviousPuzzle(): void {
    console.log('🧹 Cleaning up previous puzzle data...');

    // Clean up peek overlay if active
    if (this.peekOverlay) {
      this.peekOverlay.destroy();
      this.peekOverlay = null;
    }
    this.isPeeking = false;

    // Clean up textures
    this.cleanupPieceTextures();

    // Clean up pieces
    this.pieces.forEach((piece) => {
      if (piece.sprite && piece.sprite.destroy) {
        piece.sprite.destroy();
      }
    });
    this.pieces = [];
    this.jigsawPieces = [];

    // Clean up completion overlay elements
    this.completionOverlayElements.forEach((element) => {
      if (element && element.destroy) {
        element.destroy();
      }
    });
    this.completionOverlayElements = [];

    // Clean up timer
    if (this.timerEvent) {
      this.timerEvent.destroy();
    }

    // Clean up graphics
    if (this.gridSlotGraphics) {
      this.gridSlotGraphics.destroy();
    }

    // Clean up containers
    if (this.pieceDisplayArea) {
      this.pieceDisplayArea.destroy();
    }

    // Reset grid slots
    this.gridSlots = [];

    console.log('✅ Previous puzzle cleanup complete');
  }

  private cleanupPieceTextures(): void {
    this.createdTextureKeys.forEach((key) => {
      if (this.textures.exists(key)) {
        console.log(`🗑️ Removing texture: ${key}`);
        this.textures.remove(key);
      }
    });
    this.createdTextureKeys = [];

    // Also clean up the puzzle image texture if it exists
    if (this.textures.exists('puzzle-image')) {
      console.log('🗑️ Removing puzzle-image texture');
      this.textures.remove('puzzle-image');
    }
  }

  // rotation
  rotatePieceLeft(): void {
    console.log('🔄 Rotating piece left');
    this.currentPiece!.rotation = (this.currentPiece!.rotation - 90) % 360;
    if (this.currentPiece!.rotation < 0) {
      this.currentPiece!.rotation += 360;
    }
    this.currentPiece?.sprite.setRotation(Phaser.Math.DegToRad(this.currentPiece!.rotation));
  }

  rotatePieceRight(): void {
    console.log('🔄 Rotating piece right');
    this.currentPiece!.rotation = (this.currentPiece!.rotation + 90) % 360;
    if (this.currentPiece!.rotation < 0) {
      this.currentPiece!.rotation += 360;
    }
    this.currentPiece?.sprite.setRotation(Phaser.Math.DegToRad(this.currentPiece!.rotation));
  }
}
