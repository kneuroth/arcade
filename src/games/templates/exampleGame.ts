import { Scene } from 'phaser'
import { GameConfig, createGameConfig } from '../../types/game'

/**
 * Example game scene - replace this with your actual game logic
 * This is a template showing how to create a new game
 */
class ExampleGameScene extends Scene {
  constructor() {
    super({ key: 'ExampleGame' })
  }

  create() {
    // Set background color
    this.cameras.main.setBackgroundColor('#1a1a2e')

    // Add some example text
    const text = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      'Example Game\nClick to start',
      {
        fontSize: '32px',
        color: '#ffffff',
        align: 'center',
      }
    )
    text.setOrigin(0.5)

    // Example: Add click/touch handler (works on both desktop and mobile)
    this.input.on('pointerdown', () => {
      text.setText('Game Started!')
    })

    // For mobile: pointerdown handles both mouse clicks and touch events
    // You can also use this.input.on('pointerup') or this.input.on('pointermove')
  }
}

/**
 * Factory function to create the game config
 * Use this pattern for all your games
 * 
 * Usage in App.tsx:
 * import { createExampleGame } from './games/templates/exampleGame'
 * <ArcadeMachine gameConfig={createExampleGame()} />
 * 
 * To make a game mobile-compatible, pass the mobile config:
 * return createGameConfig('My Game', MyGameScene, undefined, {
 *   isMobileCompatible: true,
 *   usesTouchControls: true,
 *   mobileDescription: 'Tap to play!'
 * })
 */
export const createExampleGame = (): GameConfig => {
  const config = createGameConfig(
    'Example Game',
    ExampleGameScene,
    undefined,
    {
      isMobileCompatible: true,
      usesTouchControls: true,
      mobileDescription: 'Tap anywhere to start playing',
      minWidth: 320,
    }
  );

  // Add art assets (optional)
  // config.bannerArt = '/images/games/example/banner.png';
  // config.screenArt = '/images/games/example/screen.png';

  return config;
}

