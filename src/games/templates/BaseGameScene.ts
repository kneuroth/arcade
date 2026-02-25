import { Scene } from 'phaser'

/**
 * Base class for arcade game scenes.
 * Extend this class to get resize callbacks and the Phaser↔React event bridge.
 * Usage is opt-in — existing scenes that extend Scene directly still work fine.
 */
export abstract class BaseGameScene extends Scene {
  constructor(config: string | Phaser.Types.Scenes.SettingsConfig) {
    super(config)
  }

  abstract create(): void

  /**
   * Called by PhaserGame whenever the canvas is resized.
   * Override to reposition HUD elements or re-layout your scene.
   */
  onResize(_width: number, _height: number): void {
    // no-op — override in subclasses
  }

  /**
   * Emit a typed event to the React layer via the Phaser↔React bridge.
   * React components that pass `onGameEvent` to `ArcadeMachine` will receive it.
   *
   * @example
   * this.emitEvent('score', 42)
   * this.emitEvent('game-over')
   */
  protected emitEvent(type: string, payload?: unknown): void {
    this.game.events.emit('game-event', { type, payload })
  }

  /**
   * Override to clean up intervals, manual event listeners, or other resources
   * when the scene is shut down.
   */
  shutdown(): void {
    // no-op — override in subclasses
  }

  // Common setup that all games can use
  protected setupCommonInputs() {
    // Add common input handlers if needed
  }
}
