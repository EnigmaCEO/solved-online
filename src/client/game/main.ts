import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import { Game as MainGame } from './scenes/Game';
import { MainMenu } from './scenes/MainMenu';
import { Solve } from './scenes/Solve';
import { Leisure } from './scenes/Leisure';
import { Achievements } from './scenes/Achievements';
import { Profile } from './scenes/Profile';
import * as Phaser from 'phaser';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  parent: 'game-container',
  backgroundColor: '#ffffffff',
  scale: {
    // Keep a fixed game resolution but automatically scale it to fit within the available
    // web-view / device while maintaining aspect ratio.
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1024,
    height: 768,
  },
  scene: [Boot, Preloader, MainMenu, MainGame, Solve, Leisure, Achievements, Profile, GameOver],
};

const StartGame = (parent: string) => {
  return new Game({ ...config, parent });
};

export default StartGame;
