import { Scene, GameObjects } from 'phaser';
import * as Phaser from 'phaser';
import { UserProfile, CommunityPuzzleSubmission, PuzzleConfig } from '../../../shared/types/api';

export class MainMenu extends Scene {
  background: GameObjects.Image | null = null;
  logo: GameObjects.Image | null = null;
  title: GameObjects.Text | null = null;
  girlObject: GameObjects.Image | null = null;
  boyObject: GameObjects.Image | null = null;
  manObject: GameObjects.Image | null = null;
  contentBG: GameObjects.Rectangle | null = null;

  nameText: GameObjects.Text | null = null;
  rankText: GameObjects.Text | null = null;
  starsText: GameObjects.Text | null = null;
  puzzlesText: GameObjects.Text | null = null;
  userContainer: GameObjects.Container | null = null;
  avatarImage: GameObjects.Image | null = null;
  dailyText: GameObjects.Text | null = null;
  leisureText: GameObjects.Text | null = null;
  communityText: GameObjects.Text | null = null;
  profileText: GameObjects.Text | null = null;
  achievementsText: GameObjects.Text | null = null;
  adventureText: GameObjects.Text | null = null;

  dailyButton: GameObjects.Image | null = null;
  leisureButton: GameObjects.Image | null = null;
  communityButton: GameObjects.Image | null = null;
  profileButton: GameObjects.Image | null = null;
  achievementsButton: GameObjects.Image | null = null;
  adventureButton: GameObjects.Image | null = null;

  private userProfile: UserProfile | null = null;

  constructor() {
    super('MainMenu');
  }

  preload() {
    this.load.setPath('assets');

    // Add error handling for texture loading
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn('Failed to load asset:', file.key);
    });

    this.load.image('girl', 'home_girl.png');
    this.load.image('boy', 'home_boy.png');
    this.load.image('man', 'home_man.png');

    //this.load.image('background', 'home_background.png');
    //this.load.image('logo', 'home_logo.png');
    this.load.image('play', 'btn_daily.png');
    this.load.image('leisure', 'btn_leisure.png');
    this.load.image('community', 'btn_challenge.png');
    this.load.image('profile', 'btn_leaderboard.png');
    this.load.image('achievements', 'btn_awards.png');
    this.load.image('adventure', 'btn_map.png');

    // background music
    this.load.audio('background-music','Sounds/bg3.ogg');
  }

  init(): void {
    this.background = null;
    this.logo = null;
    this.title = null;
    this.girlObject = null;
    this.boyObject = null;
    this.manObject = null;
    this.contentBG = null;
    this.nameText = null;
    this.rankText = null;
    this.starsText = null;
    this.puzzlesText = null;
    this.userContainer = null;
    this.avatarImage = null;
    this.dailyButton = null;
    this.userProfile = null;
    this.leisureButton = null;
    this.communityButton = null;
    this.profileButton = null;
    this.achievementsButton = null;

    this.dailyText = null;
    this.leisureText = null;
    this.communityText = null;
    this.profileText = null;
    this.achievementsText = null;
    this.adventureButton = null;
    this.adventureText = null;
  }

  create() {
    this.background = this.add.image(-9999, 0, 'background').setOrigin(0);

    // fade out and in and cycle through images 'girl,'boy' and 'man' displaying them in the same position one at a time
    const girl = this.add.image(-9999, 0, 'girl').setOrigin(0);
    const boy = this.add.image(-9999, 0, 'boy').setOrigin(0);
    const man = this.add.image(-9999, 0, 'man').setOrigin(0);
    const images = [girl, boy, man];
    let index = 0;
    const fadeDuration = 1000;
    const delayBetweenImages = 3000;
    const fadeOut = (image: GameObjects.Image) => {
      this.tweens.add({
        targets: image,
        alpha: 0,
        duration: fadeDuration,
        onComplete: () => {
          index = (index + 1) % images.length;
          images[index]!.alpha = 0;
          fadeIn(images[index]!);
        },
      });
    };
    const fadeIn = (image: GameObjects.Image) => {
      this.tweens.add({
        targets: image,
        alpha: 1,
        duration: fadeDuration,
        onComplete: () => {
          setTimeout(() => fadeOut(image), delayBetweenImages);
        },
      });
    };

    this.girlObject = girl;
    this.boyObject = boy;
    this.manObject = man;
    this.girlObject.alpha = 1;
    this.boyObject.alpha = 0;
    this.manObject.alpha = 0;
    fadeIn(images[index]!);

    // play music
    this.sound.stopAll();
   
    this.sound.play('background-music', {
      loop: false,
      volume: 0.3,
    });
    
    this.logo = this.add.image(-9999, 0, 'logo').setOrigin(0.5, 0);


    this.dailyButton = this.add
      .image(-9999, 0, 'play')
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        this.dailyButton!.setPosition(this.dailyButton!.x, this.dailyButton!.y - 5);
      })
      .on('pointerout', () => {
        this.dailyButton!.setPosition(this.dailyButton!.x, this.dailyButton!.y + 5);
      })
      .on('pointerdown', () => {

        const puzzleConfig: PuzzleConfig = {
          image: 'puzzle-saturn',
          imageUrl: 'assets/Puzzles/0-4.png',
          title: 'Saturn',
          gridSize: 7,
          gridCols: 7,
          gridRows: 5,
          difficulty: 'medium',
          puzzleId: 'space-saturn',
          rotationEnabled: true,
          timedMode: true,
          timeLimit: 300,
          backgroundMusic: "assets/Sounds/bg1.mp3",
        };
        this.scene.start('Solve', { puzzleConfig: puzzleConfig });
      });

    
    this.leisureButton = this.add.image(-9999, 0, 'leisure').setOrigin(0.5, 0).setInteractive({ useHandCursor: true })
    .on('pointerover', () => {
      this.leisureButton!.setPosition(this.leisureButton!.x, this.leisureButton!.y - 5);
    })
    .on('pointerout', () => {
      this.leisureButton!.setPosition(this.leisureButton!.x, this.leisureButton!.y + 5);
    })
    .on('pointerdown', () => {
      this.scene.start('Leisure');
    });

    this.communityButton = this.add.image(-9999, 0, 'community').setOrigin(0.5, 0).setInteractive({ useHandCursor: true })
    .on('pointerover', () => {
      this.communityButton!.setPosition(this.communityButton!.x, this.communityButton!.y - 5);
    })
    .on('pointerout', () => {
      this.communityButton!.setPosition(this.communityButton!.x, this.communityButton!.y + 5);
    })
    .on('pointerdown', () => {
      void this.showCommunityPuzzles();
    });

    this.profileButton = this.add.image(-9999, 0, 'profile').setOrigin(0.5, 0).setInteractive({ useHandCursor: true })
    .on('pointerover', () => {
      this.profileButton!.setPosition(this.profileButton!.x, this.profileButton!.y - 5);
    })
    .on('pointerout', () => {
      this.profileButton!.setPosition(this.profileButton!.x, this.profileButton!.y + 5);
    })
    .on('pointerdown', () => {
      this.scene.start('Profile');
    });

    this.achievementsButton = this.add
      .image(-9999, 0, 'achievements')
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        this.achievementsButton!.setPosition(this.achievementsButton!.x, this.achievementsButton!.y - 5);
      })
      .on('pointerout', () => {
        this.achievementsButton!.setPosition(this.achievementsButton!.x, this.achievementsButton!.y + 5);
      })
      .on('pointerdown', () => {
        this.scene.start('Achievements');
      });

    this.adventureButton = this.add
      .image(-9999, 0, 'adventure')
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        this.adventureButton!.setPosition(this.adventureButton!.x, this.adventureButton!.y - 5);
      })
      .on('pointerout', () => {
        this.adventureButton!.setPosition(this.adventureButton!.x, this.adventureButton!.y + 5);
      })
      .on('pointerdown', () => {
        //this.scene.start('Adventure');
      });

    const font = { fontSize: '16px', color: '#000000',  fontFamily: "'Segoe UI', 'Tahoma', sans-serif", fontStyle: 'bold'};
    this.dailyText = this.add.text(-9999, 0, 'Puzzle of the Day', font).setOrigin(0.5, 0);
    this.leisureText = this.add.text(-9999, 0, 'Leisure', font).setOrigin(0.5, 0);
    this.communityText = this.add.text(-9999, 0, 'Community', font).setOrigin(0.5, 0);
    this.profileText = this.add.text(-9999, 0, 'Profile', font).setOrigin(0.5, 0);
    this.achievementsText = this.add.text(-9999, 0, 'Achievements', font).setOrigin(0.5, 0);
    this.adventureText = this.add.text(-9999, 0, 'Adventure', font).setOrigin(0.5, 0);


    // Load user profile
    void this.loadUserProfile();

    this.refreshLayout();

    // Re-calculate positions whenever the game canvas is resized (e.g. orientation change).
    this.scale.on('resize', this.refreshLayout, this);
    this.events.on('shutdown', this.handleShutdown, this);
  }

  private async loadUserProfile(): Promise<void> {
    try {
     /* const response = await fetch('/api/user');
      const data = await response.json();

      if (data.status === 'success' && data.user) {
        this.userProfile = data.user;

        // Load user avatar through server proxy if available
        if (this.userProfile?.avatar) {
          // Use server endpoint to proxy the avatar image
          this.load.image('user-avatar', `/api/user/avatar`);
          
          // Add error handler for avatar loading
          this.load.on('loaderror-image-user-avatar', () => {
            console.log('⚠️ Avatar loading failed, will show placeholder');
          });
          
          this.load.start();
        }

        this.updateUserDisplay();
      } else {
        console.warn('Failed to load user profile:', data.message);
        // Show default/guest user
        this.showGuestUser();
      }*/
    } catch (error) {
      console.error('Error loading user profile:', error);
      this.showGuestUser();
    }
  }

  private showGuestUser(): void {
    this.userProfile = {
      username: 'Guest',
      totalStars: 0,
      puzzlesCompleted: 0,
      bestTime: 0,
      rank: 0,
    };
    this.updateUserDisplay();
  }

  private updateUserDisplay(): void {
    if (!this.userProfile) return;

    // Update user info in the next layout refresh
    this.refreshLayout();
  }

  private async checkForCommunityPuzzle(): Promise<void> {
    try {
      // Get current post ID from URL parameters or Devvit context
      const urlParams = new URLSearchParams(window.location.search);
      let postId = urlParams.get('postId');
      
      // If no postId in URL params, try to extract from URL path
      if (!postId) {
        const pathParts = window.location.pathname.split('/');
        // Look for Reddit post ID pattern (starts with comments)
        const commentsIndex = pathParts.indexOf('comments');
        if (commentsIndex !== -1 && commentsIndex + 1 < pathParts.length) {
          postId = pathParts[commentsIndex + 1] || null;
        }
      }
      
      // Try to get from window context if available (Devvit specific)
      const devvitContext = (window as { __DEVVIT_CONTEXT__?: { postId?: string } }).__DEVVIT_CONTEXT__;
      if (!postId && devvitContext?.postId) {
        postId = devvitContext.postId || null;
        console.log('🔍 Found post ID from Devvit context:', postId);
      }
      
      // Skip if postId is clearly not a Reddit post ID
      if (!postId || postId === 'index.html' || postId.includes('.') || postId.length < 5) {
        console.log('📝 No valid post ID found, not a community puzzle post');
        return;
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
          return;
        }
      }

      // Not a community puzzle, show default puzzle
      const gridDims = this.getDifficultyGridDimensions('medium', 1.0); // Assume square aspect ratio
      const customConfig = {
        image: 'assets/home_girl.png',
        imageUrl: 'assets/home_girl.png',
        gridCols: gridDims.cols,
        gridRows: gridDims.rows,
        difficulty: 'medium' as const,
        title: 'Custom Puzzle',
        puzzleId: 'custom-demo-puzzle',
        rotationEnabled: true,
        timedMode: false,
        timeLimit: 180,
      };

      this.scene.start('Solve', { puzzleConfig: customConfig });
    } catch (error) {
      console.error('Error checking for community puzzle:', error);

      // Fallback to default puzzle
      const gridDims = this.getDifficultyGridDimensions('medium', 1.0); // Assume square aspect ratio
      const customConfig = {
        image: 'assets/home_girl.png',
        imageUrl: 'assets/home_girl.png',
        gridCols: gridDims.cols,
        gridRows: gridDims.rows,
        difficulty: 'medium' as const,
        title: 'Custom Puzzle',
        puzzleId: 'custom-demo-puzzle',
        rotationEnabled: true,
        timedMode: false,
        timeLimit: 180,
      };

      this.scene.start('Solve', { puzzleConfig: customConfig });
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

  private async showCommunityPuzzles(): Promise<void> {
    try {
      const response = await fetch('/api/community-puzzles');
      const data = await response.json();

      if (data.status === 'success' && data.puzzles) {
        // Show community puzzles in a simple overlay
        this.displayCommunityPuzzlesOverlay(data.puzzles);
      } else {
        console.warn('No community puzzles found');
        this.showMessage(
          'No community puzzles available yet.\n\nSubmit an image in a comment to create one!'
        );
      }
    } catch (error) {
      console.error('Error fetching community puzzles:', error);
      this.showMessage('Error loading community puzzles.\nPlease try again later.');
    }
  }

  private displayCommunityPuzzlesOverlay(puzzles: CommunityPuzzleSubmission[]): void {
    const { width, height } = this.scale;

    // Create overlay background
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);

    // Title
    const title = this.add
      .text(width / 2, height * 0.1, 'Community Puzzles', {
        fontSize: '36px',
        color: '#4A90E2',
        fontFamily: "'Segoe UI', 'Tahoma', sans-serif",
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Instructions
    const instructions = this.add
      .text(width / 2, height * 0.18, 'Submit an image in any comment to create a puzzle!', {
        fontSize: '18px',
        color: '#FFFFFF',
        fontFamily: "'Segoe UI', 'Tahoma', sans-serif",
      })
      .setOrigin(0.5);

    // Show approved puzzles
    const approvedPuzzles = puzzles.filter((p) => p.status === 'approved');
    const yPos = height * 0.3;

    if (approvedPuzzles.length === 0) {
      this.add
        .text(width / 2, yPos, 'No approved community puzzles yet.\nBe the first to submit one!', {
          fontSize: '24px',
          color: '#FFFFFF',
          fontFamily: "'Segoe UI', 'Tahoma', sans-serif",
          align: 'center',
        })
        .setOrigin(0.5);
    } else {
      approvedPuzzles.slice(0, 5).forEach((puzzle, index) => {
        this.add
          .text(
            width / 2,
            yPos + index * 60,
            `${puzzle.title}\nby u/${puzzle.submittedBy} - ${puzzle.difficulty}`,
            {
              fontSize: '20px',
              color: '#FFFFFF',
              fontFamily: "'Segoe UI', 'Tahoma', sans-serif",
              align: 'center',
              backgroundColor: '#4A90E2',
              padding: { x: 15, y: 8 },
            }
          )
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
            // Start this community puzzle
            const gridDims = this.getDifficultyGridDimensions(
              puzzle.difficulty,
              puzzle.aspectRatio
            );
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

            // Clean up overlay
            overlay.destroy();
            title.destroy();
            instructions.destroy();

            this.scene.start('Solve', { puzzleConfig });
          });
      });
    }

    // Close button
    const closeButton = this.add
      .text(width * 0.9, height * 0.1, '✕', {
        fontSize: '32px',
        color: '#FFFFFF',
        fontFamily: "'Segoe UI', 'Tahoma', sans-serif",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        overlay.destroy();
        title.destroy();
        instructions.destroy();
        closeButton.destroy();
      });
  }

  private showMessage(message: string): void {
    const { width, height } = this.scale;

    const overlay = this.add.rectangle(
      width / 2,
      height / 2,
      width * 0.8,
      height * 0.4,
      0x000000,
      0.9
    );
    const messageText = this.add
      .text(width / 2, height / 2, message, {
        fontSize: '24px',
        color: '#FFFFFF',
        fontFamily: "'Segoe UI', 'Tahoma', sans-serif",
        align: 'center',
      })
      .setOrigin(0.5);

    const okButton = this.add
      .text(width / 2, height * 0.65, 'OK', {
        fontSize: '24px',
        color: '#FFFFFF',
        backgroundColor: '#4A90E2',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        overlay.destroy();
        messageText.destroy();
        okButton.destroy();
      });
  }

  handleShutdown() {
    this.scale.off('resize', this.refreshLayout, this);
    this.events.off('shutdown', this.handleShutdown, this);
    //console.log('Resize listener has been removed.');
  }

  private refreshLayout(): void {
    const { width, height } = this.scale;

    // Resize camera to new viewport to prevent black bars
    this.cameras.resize(width, height);

    // Background – stretch to match the camera width but keep aspect ratio
    this.background!.setScale(
      Math.max(width / this.background!.width, height / this.background!.height)
    );
    this.background!.setPosition();

    // Logo – keep aspect but scale down for very small screens
    const scaleFactor = Math.min(width / 1024, height / 768);

    this.logo!.setPosition(width / 2, 10).setScale(scaleFactor);
    this.girlObject!.setPosition(0, height * 0.25).setScale(scaleFactor);
    this.boyObject!.setPosition(0, height * 0.25).setScale(scaleFactor);
    this.manObject!.setPosition(0, height * 0.25).setScale(scaleFactor);


    // rounded rectangle to hold user name and stats
    this.userContainer?.destroy();
    this.userContainer = this.add.container(width * 0.55, height * 0.2);
    this.contentBG = this.add
      .rectangle(0, 0,200, 80, 0xe6d5a9, 1)
      .setOrigin(0.5);
    this.userContainer.add(this.contentBG);

    // User avatar (if available)
    if (this.userProfile && this.textures.exists('user-avatar')) {
      this.avatarImage = this.add
        .image(-width * 0.15, -height * 0.15, 'user-avatar')
        .setOrigin(0.5)
        .setDisplaySize(60, 60);
      this.userContainer?.add(this.avatarImage);
    } else if (this.userProfile) {
      // Show default avatar placeholder if no avatar is available
      const avatarPlaceholder = this.add
        .circle(-width * 0.15, -height * 0.15, 30, 0x666666)
        .setStrokeStyle(2, 0x999999);
      
      const avatarText = this.add
        .text(-width * 0.15, -height * 0.15, this.userProfile.username.charAt(0).toUpperCase(), {
          fontSize: '24px',
          color: '#ffffff',
          fontFamily: "'Segoe UI', 'Tahoma', sans-serif",
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      
      this.userContainer?.add([avatarPlaceholder, avatarText]);

    }

    // Username
    const username = this.userProfile ? `u/${this.userProfile.username}` : 'u/username';
    this.nameText = this.add
      .text(0, -height * 0.1, username, {
        fontFamily: "'Segoe UI', 'Tahoma', sans-serif",
        fontSize: `${Math.min(28, width * 0.025)}px`,
        fontStyle: 'bold',
        color: '#000000ff',
      })
      .setOrigin(0.5);
    this.userContainer?.add(this.nameText);

    // Rank
    const rank = this.userProfile ? this.userProfile.rank : 0;
    this.rankText = this.add
      .text(0, -height * 0.05, `Rank: ${rank}`, {
        fontFamily: "'Segoe UI', 'Tahoma', sans-serif",
        fontSize: `${Math.min(20, width * 0.018)}px`,
        color: '#000000ff',
      })
      .setOrigin(0.5);
    this.userContainer?.add(this.rankText);

    // Stars
    const stars = this.userProfile ? this.userProfile.totalStars : 0;
    this.starsText = this.add
      .text(0, 0, `⭐ ${stars} Stars`, {
        fontFamily: "'Segoe UI', 'Tahoma', sans-serif",
        fontSize: `${Math.min(20, width * 0.018)}px`,
        color: '#000000ff',
      })
      .setOrigin(0.5);
    this.userContainer?.add(this.starsText);

    // Puzzles completed
    const puzzlesCompleted = this.userProfile ? this.userProfile.puzzlesCompleted : 0;
    this.puzzlesText = this.add
      .text(0, height * 0.05, `🧩 ${puzzlesCompleted} Puzzles`, {
        fontFamily: "'Segoe UI', 'Tahoma', sans-serif",
        fontSize: `${Math.min(20, width * 0.018)}px`,
        color: '#000000ff',
      })
      .setOrigin(0.5);
    this.userContainer?.add(this.puzzlesText);

    //this.userContainer.setScale(scaleFactor);
    this.userContainer.destroy();

    this.dailyButton!.setPosition(width * 0.65, height * 0.2);
    this.dailyText!.setPosition(width * 0.65, height * 0.2 + this.dailyButton!.height);

    // Position gallery button
    if (this.leisureButton) {
      this.leisureButton.setPosition(width * 0.5, height * 0.4);
      this.leisureText?.setPosition(width * 0.5, height * 0.4 + this.leisureButton.height);
    }

    // Position community button
    if (this.communityButton) {
      this.communityButton.setPosition(width * 0.8, height * 0.4);
      this.communityText?.setPosition(width * 0.8, height * 0.4 + this.communityButton.height);
    }

    // Position profile button
    if (this.profileButton) {
      this.profileButton.setPosition(width * 0.8, height * 0.6);
      this.profileText?.setPosition(width * 0.8, height * 0.6 + this.profileButton.height);
    }

    // Position achievements button
    if (this.achievementsButton) {
      this.achievementsButton.setPosition(width * 0.5, height * 0.6);
      this.achievementsText?.setPosition(
        width * 0.5,
        height * 0.6 + this.achievementsButton.height
      );
    }

    // position adventure button
    if (this.adventureButton) {
      this.adventureButton.setPosition(width * 0.65, height * 0.8);
      this.adventureText?.setPosition(width * 0.65, height * 0.8 + this.adventureButton.height);
    }

    console.log('width: ' + width + ' height: ' + height + ' ratio: ' + scaleFactor);
  }
}
