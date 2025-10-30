import * as Phaser from 'phaser';
import { Scene, GameObjects } from 'phaser';
import { ExtendedUserProfile } from '../../../shared/types/api';

export class Profile extends Scene {
  private profile: ExtendedUserProfile | null = null;
  private flairSelector: GameObjects.Container | null = null;

  constructor() {
    super('Profile');
  }

  create() {
    const { width, height } = this.scale;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Title
    this.add
      .text(width / 2, 60, '👤 PROFILE', {
        fontSize: '36px',
        color: '#4A90E2',
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

    // Load profile data
    void this.loadProfile();
  }

  private async loadProfile(): Promise<void> {
    try {
      const response = await fetch('/api/profile');
      const data = await response.json();

      if (data.status === 'success' && data.profile) {
        this.profile = data.profile;
        this.displayProfile();
      } else {
        this.showError('Failed to load profile');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      this.showError('Error loading profile');
    }
  }

  private displayProfile(): void {
    if (!this.profile) return;

    const { width, height } = this.scale;

    // Profile header
    let currentY = 120;

    // Avatar and username
    const avatarContainer = this.add.container(width / 2, currentY);

    // Avatar placeholder (would load actual avatar in production)
    const avatarBg = this.add.circle(0, 0, 40, 0x4A90E2);
    const avatarText = this.add
      .text(0, 0, this.profile.username.charAt(0).toUpperCase(), {
        fontSize: '32px',
        color: '#FFFFFF',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    avatarContainer.add([avatarBg, avatarText]);

    // Username and rank
    currentY += 80;
    this.add
      .text(width / 2, currentY, `u/${this.profile.username}`, {
        fontSize: '28px',
        color: '#FFFFFF',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    currentY += 40;
    this.add
      .text(width / 2, currentY, `Rank #${this.profile.rank}`, {
        fontSize: '20px',
        color: '#FFD700',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5);

    // Stats grid
    currentY += 60;
    this.createStatsGrid(currentY);

    // Progress section
    currentY += 200;
    this.createProgressSection(currentY);

    // Flair selection
    currentY += 120;
    this.createFlairSection(currentY);

    // Achievements button
    currentY += 100;
    const achievementsButton = this.add
      .text(width / 2, currentY, '🏆 VIEW ACHIEVEMENTS', {
        fontSize: '24px',
        color: '#FFFFFF',
        backgroundColor: '#9C27B0',
        padding: { x: 20, y: 12 },
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.scene.start('Achievements');
      });

    // Add hover effect
    achievementsButton.on('pointerover', () => {
      achievementsButton.setScale(1.05);
      achievementsButton.setStyle({ backgroundColor: '#AD42C4' });
    });

    achievementsButton.on('pointerout', () => {
      achievementsButton.setScale(1);
      achievementsButton.setStyle({ backgroundColor: '#9C27B0' });
    });
  }

  private createStatsGrid(startY: number): void {
    if (!this.profile) return;

    const { width } = this.scale;
    const stats = [
      { label: 'Puzzles Completed', value: this.profile.puzzlesCompleted.toString(), icon: '🧩' },
      { label: 'Total Stars', value: this.profile.totalStars.toString(), icon: '⭐' },
      { label: 'Best Time', value: this.formatTime(this.profile.bestTime), icon: '⏱️' },
      { label: 'Total Time Played', value: this.formatTime(this.profile.stats.totalTimePlayed), icon: '🕐' },
      { label: 'Average Moves', value: this.profile.stats.averageMoves.toString(), icon: '🎯' },
      { label: 'Completion Rate', value: `${this.profile.stats.completionRate.toFixed(1)}%`, icon: '📊' },
    ];

    const cols = 2;
    const cellWidth = width * 0.4;
    const cellHeight = 80;
    const startX = width * 0.25;

    for (let i = 0; i < stats.length; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = startX + col * cellWidth;
      const y = startY + row * cellHeight;

      const stat = stats[i];
      if (!stat) continue;

      // Background
      this.add.rectangle(x, y, cellWidth - 10, cellHeight - 10, 0x2E2E2E, 0.8);

      // Icon
      this.add
        .text(x - cellWidth * 0.3, y - 15, stat.icon, {
          fontSize: '24px',
        })
        .setOrigin(0.5);

      // Value
      this.add
        .text(x, y - 15, stat.value, {
          fontSize: '20px',
          color: '#4CAF50',
          fontFamily: 'Arial',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      // Label
      this.add
        .text(x, y + 10, stat.label, {
          fontSize: '14px',
          color: '#CCCCCC',
          fontFamily: 'Arial',
        })
        .setOrigin(0.5);
    }
  }

  private createProgressSection(startY: number): void {
    if (!this.profile) return;

    const { width } = this.scale;

    // Progress title
    this.add
      .text(width / 2, startY, 'PROGRESS', {
        fontSize: '24px',
        color: '#FFFFFF',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Progress bar
    const progressBarWidth = width * 0.8;
    const progressBarHeight = 20;
    const progressY = startY + 40;

    // Background
    this.add.rectangle(width / 2, progressY, progressBarWidth, progressBarHeight, 0x333333);

    // Fill
    const progressPercent = this.profile.stats.completionRate / 100;
    this.add.rectangle(
      width / 2 - progressBarWidth / 2 + (progressBarWidth * progressPercent) / 2,
      progressY,
      progressBarWidth * progressPercent,
      progressBarHeight,
      0x4CAF50
    );

    // Percentage text
    this.add
      .text(width / 2, progressY + 30, `${this.profile.stats.completionRate.toFixed(1)}% Complete`, {
        fontSize: '16px',
        color: '#FFFFFF',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5);
  }

  private createFlairSection(startY: number): void {
    if (!this.profile) return;

    const { width } = this.scale;

    // Flair title
    this.add
      .text(width / 2, startY, 'REDDIT FLAIR', {
        fontSize: '24px',
        color: '#FFFFFF',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Current flair
    const currentFlair = this.profile.flair.selectedFlair || 'None selected';
    this.add
      .text(width / 2, startY + 35, `Current: ${currentFlair}`, {
        fontSize: '18px',
        color: '#4CAF50',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5);

    // Available flairs count
    this.add
      .text(width / 2, startY + 60, `${this.profile.flair.availableFlairs.length} flairs available`, {
        fontSize: '14px',
        color: '#CCCCCC',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5);

    // Available flairs
    if (this.profile.flair.availableFlairs.length > 0) {
      const flairButton = this.add
        .text(width / 2 - 80, startY + 90, 'CHANGE FLAIR', {
          fontSize: '16px',
          color: '#FFFFFF',
          backgroundColor: '#FF6B35',
          padding: { x: 15, y: 8 },
          fontFamily: 'Arial',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.showFlairSelector();
        });

      // Add hover effect
      flairButton.on('pointerover', () => {
        flairButton.setScale(1.05);
        flairButton.setStyle({ backgroundColor: '#FF8A65' });
      });

      flairButton.on('pointerout', () => {
        flairButton.setScale(1);
        flairButton.setStyle({ backgroundColor: '#FF6B35' });
      });

      // View achievements button
      const achievementsButton = this.add
        .text(width / 2 + 80, startY + 90, 'VIEW ACHIEVEMENTS', {
          fontSize: '16px',
          color: '#FFFFFF',
          backgroundColor: '#9C27B0',
          padding: { x: 15, y: 8 },
          fontFamily: 'Arial',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.scene.start('Achievements');
        });

      // Add hover effect
      achievementsButton.on('pointerover', () => {
        achievementsButton.setScale(1.05);
        achievementsButton.setStyle({ backgroundColor: '#AD42C4' });
      });

      achievementsButton.on('pointerout', () => {
        achievementsButton.setScale(1);
        achievementsButton.setStyle({ backgroundColor: '#9C27B0' });
      });
    } else {
      this.add
        .text(width / 2, startY + 85, 'Unlock achievements to earn flairs!', {
          fontSize: '16px',
          color: '#AAAAAA',
          fontFamily: 'Arial',
        })
        .setOrigin(0.5);

      // View achievements button for users with no flairs
      const achievementsButton = this.add
        .text(width / 2, startY + 115, '🏆 VIEW ACHIEVEMENTS', {
          fontSize: '18px',
          color: '#FFFFFF',
          backgroundColor: '#9C27B0',
          padding: { x: 20, y: 10 },
          fontFamily: 'Arial',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.scene.start('Achievements');
        });

      // Add hover effect
      achievementsButton.on('pointerover', () => {
        achievementsButton.setScale(1.05);
        achievementsButton.setStyle({ backgroundColor: '#AD42C4' });
      });

      achievementsButton.on('pointerout', () => {
        achievementsButton.setScale(1);
        achievementsButton.setStyle({ backgroundColor: '#9C27B0' });
      });
    }
  }

  private showFlairSelector(): void {
    if (!this.profile || this.flairSelector) return;

    const { width, height } = this.scale;

    // Overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);

    // Container
    this.flairSelector = this.add.container(width / 2, height / 2);

    // Background
    const bg = this.add.rectangle(0, 0, width * 0.8, height * 0.6, 0x2E2E2E);
    this.flairSelector.add(bg);

    // Title
    const title = this.add
      .text(0, -height * 0.25, 'SELECT FLAIR', {
        fontSize: '24px',
        color: '#FFFFFF',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.flairSelector.add(title);

    // Flair options
    const flairs = ['None', ...this.profile.flair.availableFlairs];
    let currentY = -height * 0.15;

    for (const flair of flairs) {
      const flairOption = this.add
        .text(0, currentY, flair, {
          fontSize: '18px',
          color: '#FFFFFF',
          backgroundColor: flair === this.profile.flair.selectedFlair ? '#4CAF50' : '#4A90E2',
          padding: { x: 20, y: 10 },
          fontFamily: 'Arial',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          void this.selectFlair(flair === 'None' ? null : flair);
        });

      this.flairSelector.add(flairOption);
      currentY += 50;
    }

    // Close button
    const closeButton = this.add
      .text(0, height * 0.2, 'CLOSE', {
        fontSize: '18px',
        color: '#FFFFFF',
        backgroundColor: '#666666',
        padding: { x: 20, y: 10 },
        fontFamily: 'Arial',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.closeFlairSelector();
      });

    this.flairSelector.add(closeButton);

    // Store overlay reference for cleanup
    (this.flairSelector as Phaser.GameObjects.Container & { overlay: Phaser.GameObjects.Rectangle }).overlay = overlay;
  }

  private async selectFlair(flair: string | null): Promise<void> {
    try {
      const response = await fetch('/api/flair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flair: flair || '' }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        // Update profile
        if (this.profile) {
          this.profile.flair.selectedFlair = flair;
        }

        this.closeFlairSelector();
        
        // Show success message
        this.showMessage('Flair updated successfully!', 0x4CAF50);
        
        // Refresh the display
        this.scene.restart();
      } else {
        this.showMessage('Failed to update flair', 0xFF6B6B);
      }
    } catch (error) {
      console.error('Error updating flair:', error);
      this.showMessage('Error updating flair', 0xFF6B6B);
    }
  }

  private closeFlairSelector(): void {
    if (this.flairSelector) {
      const overlay = (this.flairSelector as Phaser.GameObjects.Container & { overlay: Phaser.GameObjects.Rectangle }).overlay;
      if (overlay) {
        overlay.destroy();
      }
      this.flairSelector.destroy();
      this.flairSelector = null;
    }
  }

  private formatTime(seconds: number): string {
    if (seconds === 0) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
}
