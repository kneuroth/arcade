import { Scene } from 'phaser'

/**
 * Base class for arcade game scenes
 * Extend this class to create new games
 */
export abstract class BaseGameScene extends Scene {
  constructor(config: string | Phaser.Types.Scenes.SettingsConfig) {
    super(config)
  }

  abstract create(): void

  // Common setup that all games can use
  protected setupCommonInputs() {
    // Add common input handlers if needed
  }

  // Override this to add custom cleanup if needed
  // Note: Phaser automatically handles scene cleanup
}

