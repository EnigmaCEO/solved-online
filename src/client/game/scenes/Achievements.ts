import * as Phaser from 'phaser';
import { Scene, GameObjects } from 'phaser';
import { Achievement, UserAchievements } from '../../../shared/types/api';

export class Achievements extends Scene {
  private achievements: Achievement[] = [];
  private scrollContainer: GameObjects.Container | null = null;
  private scrollY = 0;
  private maxScrollY = 0;

  constructor() {
    super('Achievements');
  }

  create() {
    const { width, height } = this.scale;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Title
    this.add
      .text(width / 2, 50, '🏆 ACHIEVEMENTS', {
        fontSize: '36px',
        color: '#FFD700',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Instructions
    this.add
      .text(width / 2, 85, 'Click on unlocked achievements with 🏷️ to set your Reddit flair!', {
        fontSize: '16px',
        color: '#FFD700',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Back button
    const backButton = this.add
      .text(50, 60, '← BACK', {
        fontSize: '24px',
        color: '#FFFFFF',
        fontFamily: 'Arial',
        backgroundColor: '#4A90E2',
        padding: { x: 15, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.scene.start('MainMenu');
      });

    // Add hover effect
    backButton.on('pointerover', () => {
      backButton.setScale(1.05);
      backButton.setStyle({ backgroundColor: '#5BA0F2' });
    });

    backButton.on('pointerout', () => {
      backButton.setScale(1);
      backButton.setStyle({ backgroundColor: '#4A90E2' });
    });

    // Load achievements
    void this.loadAchievements();

    // Add scroll controls for mobile
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
      this.handleScroll(deltaY);
    });

    // Touch scroll support
    let startY = 0;
    let isDragging = false;

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      startY = pointer.y;
      isDragging = true;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (isDragging) {
        const deltaY = startY - pointer.y;
        this.handleScroll(deltaY * 2);
        startY = pointer.y;
      }
    });

    this.input.on('pointerup', () => {
      isDragging = false;
    });
  }

  private async loadAchievements(): Promise<void> {
    try {
      const response = await fetch('/api/achievements');
      const data = await response.json();

      if (data.status === 'success' && data.achievements) {
        this.achievements = data.achievements.achievements;
        this.displayAchievements(data.achievements);
      } else {
        this.showError('Failed to load achievements');
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
      this.showError('Error loading achievements');
    }
  }

  private displayAchievements(userAchievements: UserAchievements): void {
    const { width, height } = this.scale;

    // Create scroll container
    this.scrollContainer = this.add.container(0, 0);

    // Stats header
    const statsY = 130;
    this.add
      .text(width / 2, statsY, `${userAchievements.totalUnlocked}/${this.achievements.length} Unlocked`, {
        fontSize: '24px',
        color: '#FFFFFF',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5);

    // Progress bar
    const progressBarWidth = width * 0.8;
    const progressBarHeight = 20;
    const progressBarX = width / 2 - progressBarWidth / 2;
    const progressBarY = statsY + 40;

    // Background bar
    this.add.rectangle(
      width / 2,
      progressBarY,
      progressBarWidth,
      progressBarHeight,
      0x333333
    );

    // Progress fill
    const progressPercent = userAchievements.totalUnlocked / this.achievements.length;
    this.add.rectangle(
      progressBarX + (progressBarWidth * progressPercent) / 2,
      progressBarY,
      progressBarWidth * progressPercent,
      progressBarHeight,
      0x4CAF50
    );

    // Achievement categories
    const categories = ['puzzle', 'speed', 'mastery', 'community'];
    const categoryColors = {
      puzzle: 0x4A90E2,
      speed: 0xFF6B35,
      mastery: 0x9C27B0,
      community: 0x4CAF50,
    };

    let currentY = 200;
    const achievementHeight = 100;
    const spacing = 20;

    for (const category of categories) {
      const categoryAchievements = this.achievements.filter(a => a.category === category);
      if (categoryAchievements.length === 0) continue;

      // Category header
      const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
      const categoryHeader = this.add
        .text(width / 2, currentY, categoryTitle, {
          fontSize: '28px',
          color: '#FFFFFF',
          fontFamily: 'Arial',
          fontStyle: 'bold',
          backgroundColor: `#${categoryColors[category as keyof typeof categoryColors].toString(16)}`,
          padding: { x: 20, y: 10 },
        })
        .setOrigin(0.5);

      this.scrollContainer.add(categoryHeader);
      currentY += 60;

      // Achievement items
      for (const achievement of categoryAchievements) {
        const achievementContainer = this.createAchievementItem(achievement, width, currentY);
        this.scrollContainer.add(achievementContainer);
        currentY += achievementHeight + spacing;
      }

      currentY += 20; // Extra spacing between categories
    }

    // Calculate max scroll
    this.maxScrollY = Math.max(0, currentY - height + 100);
  }

  private createAchievementItem(achievement: Achievement, width: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(0, y);
    const itemWidth = width * 0.9;
    const itemHeight = 80;

    // Background
    const bgColor = achievement.isUnlocked ? 0x2E7D32 : 0x424242;
    const background = this.add
      .rectangle(width / 2, 0, itemWidth, itemHeight, bgColor, 0.8)
      .setStrokeStyle(2, achievement.isUnlocked ? 0x4CAF50 : 0x666666);

    container.add(background);

    // Icon
    const iconSize = achievement.isUnlocked ? 48 : 32;
    const iconColor = achievement.isUnlocked ? '#FFD700' : '#666666';
    const icon = this.add
      .text(width * 0.15, 0, achievement.icon, {
        fontSize: `${iconSize}px`,
        color: iconColor,
      })
      .setOrigin(0.5);

    container.add(icon);

    // Title and description
    const titleColor = achievement.isUnlocked ? '#FFFFFF' : '#AAAAAA';
    const title = this.add
      .text(width * 0.3, -15, achievement.title, {
        fontSize: '20px',
        color: titleColor,
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    // Add flair indicator to description if available
    const hasFlairAvailable = this.achievementHasFlair(achievement.id);
    const descriptionText = hasFlairAvailable ? 
      `${achievement.description} 🏷️` : 
      achievement.description;

    const description = this.add
      .text(width * 0.3, 10, descriptionText, {
        fontSize: '16px',
        color: titleColor,
        fontFamily: 'Arial',
      })
      .setOrigin(0, 0.5);

    container.add([title, description]);

    // Unlock date and flair button (if unlocked)
    if (achievement.isUnlocked && achievement.unlockedAt) {
      const unlockDate = new Date(achievement.unlockedAt).toLocaleDateString();
      const dateText = this.add
        .text(width * 0.85, -15, `Unlocked: ${unlockDate}`, {
          fontSize: '12px',
          color: '#CCCCCC',
          fontFamily: 'Arial',
        })
        .setOrigin(1, 0.5);

      container.add(dateText);

      // Add flair button if this achievement has a flair
      const flairButton = this.add
        .text(width * 0.85, 15, '🏷️ Set Flair', {
          fontSize: '12px',
          color: '#4CAF50',
          fontFamily: 'Arial',
          backgroundColor: '#1B5E20',
          padding: { x: 8, y: 4 },
        })
        .setOrigin(1, 0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          void this.setFlairFromAchievement(achievement);
        })
        .on('pointerover', () => {
          flairButton.setScale(1.1);
          flairButton.setStyle({ backgroundColor: '#2E7D32' });
        })
        .on('pointerout', () => {
          flairButton.setScale(1);
          flairButton.setStyle({ backgroundColor: '#1B5E20' });
        });

      container.add(flairButton);
    } else if (!achievement.isUnlocked) {
      // Lock icon
      const lockIcon = this.add
        .text(width * 0.85, 0, '🔒', {
          fontSize: '24px',
          color: '#666666',
        })
        .setOrigin(0.5);

      container.add(lockIcon);
    }

    // Make unlocked achievements clickable for flair setting
    if (achievement.isUnlocked) {
      background.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          void this.setFlairFromAchievement(achievement);
        })
        .on('pointerover', () => {
          background.setStrokeStyle(3, 0x66BB6A);
        })
        .on('pointerout', () => {
          background.setStrokeStyle(2, 0x4CAF50);
        });
    }

    return container;
  }

  private handleScroll(deltaY: number): void {
    if (!this.scrollContainer) return;

    this.scrollY += deltaY * 0.5;
    this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, this.maxScrollY);

    this.scrollContainer.setY(-this.scrollY);
  }

  private async setFlairFromAchievement(achievement: Achievement): Promise<void> {
    try {
      // Show confirmation dialog
      const confirmed = await this.showFlairConfirmation(achievement);
      if (!confirmed) return;

      const response = await fetch('/api/flair/achievement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ achievementId: achievement.id }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        this.showMessage(`✅ Flair set to: ${achievement.title}`, 0x4CAF50);
      } else {
        this.showMessage(`❌ Failed to set flair: ${data.message}`, 0xFF6B6B);
      }
    } catch (error) {
      console.error('Error setting flair from achievement:', error);
      this.showMessage('❌ Error setting flair', 0xFF6B6B);
    }
  }

  private showFlairConfirmation(achievement: Achievement): Promise<boolean> {
    return new Promise((resolve) => {
      const { width, height } = this.scale;

      // Create overlay
      const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);

      // Create confirmation dialog
      const dialogBg = this.add.rectangle(width / 2, height / 2, width * 0.8, height * 0.4, 0x2E2E2E);
      dialogBg.setStrokeStyle(2, 0x4CAF50);

      // Title
      const title = this.add
        .text(width / 2, height / 2 - 80, 'Set Reddit Flair?', {
          fontSize: '28px',
          color: '#FFFFFF',
          fontFamily: 'Arial',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      // Achievement info
      const achievementInfo = this.add
        .text(width / 2, height / 2 - 30, `${achievement.icon} ${achievement.title}`, {
          fontSize: '24px',
          color: '#4CAF50',
          fontFamily: 'Arial',
        })
        .setOrigin(0.5);

      const description = this.add
        .text(width / 2, height / 2, 'This will set your Reddit flair in this subreddit', {
          fontSize: '16px',
          color: '#CCCCCC',
          fontFamily: 'Arial',
        })
        .setOrigin(0.5);

      // Buttons
      const confirmButton = this.add
        .text(width / 2 - 80, height / 2 + 50, 'SET FLAIR', {
          fontSize: '18px',
          color: '#FFFFFF',
          backgroundColor: '#4CAF50',
          padding: { x: 20, y: 10 },
          fontFamily: 'Arial',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          cleanup();
          resolve(true);
        });

      const cancelButton = this.add
        .text(width / 2 + 80, height / 2 + 50, 'CANCEL', {
          fontSize: '18px',
          color: '#FFFFFF',
          backgroundColor: '#666666',
          padding: { x: 20, y: 10 },
          fontFamily: 'Arial',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          cleanup();
          resolve(false);
        });

      // Add hover effects
      confirmButton.on('pointerover', () => confirmButton.setScale(1.05));
      confirmButton.on('pointerout', () => confirmButton.setScale(1));
      cancelButton.on('pointerover', () => cancelButton.setScale(1.05));
      cancelButton.on('pointerout', () => cancelButton.setScale(1));

      const cleanup = () => {
        overlay.destroy();
        dialogBg.destroy();
        title.destroy();
        achievementInfo.destroy();
        description.destroy();
        confirmButton.destroy();
        cancelButton.destroy();
      };
    });
  }

  private achievementHasFlair(achievementId: string): boolean {
    // These achievement IDs have associated flairs
    const flairAchievements = [
      'first_puzzle',
      'speed_demon', 
      'perfect_solver',
      'expert_master',
      'community_creator',
      'star_collector'
    ];
    return flairAchievements.includes(achievementId);
  }

  private showMessage(message: string, color: number): void {
    const { width } = this.scale;

    const messageText = this.add
      .text(width / 2, 100, message, {
        fontSize: '18px',
        color: '#FFFFFF',
        backgroundColor: `#${color.toString(16)}`,
        padding: { x: 20, y: 10 },
        fontFamily: 'Arial',
      })
      .setOrigin(0.5);

    // Fade out after 3 seconds
    this.tweens.add({
      targets: messageText,
      alpha: 0,
      duration: 3000,
      onComplete: () => {
        messageText.destroy();
      },
    });
  }

  private showError(message: string): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2, message, {
        fontSize: '24px',
        color: '#FF6B6B',
        fontFamily: 'Arial',
        align: 'center',
      })
      .setOrigin(0.5);
  }
}
