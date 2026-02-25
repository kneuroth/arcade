import { Game, Types, Scene } from 'phaser'

export interface GameEvent {
  type: string
  payload?: unknown
}

export type GameEventCallback = (event: GameEvent) => void

export interface MobileConfig {
  /** Whether the game is optimized for mobile devices */
  isMobileCompatible: boolean
  /** Minimum recommended screen width in pixels (default: 320) */
  minWidth?: number
  /** Whether the game uses touch controls */
  usesTouchControls?: boolean
  /** Description of mobile-specific features or controls */
  mobileDescription?: string
}

export interface GameConfig {
  name: string
  createGame: (container: HTMLElement) => Game
  /** Mobile compatibility information */
  mobile?: MobileConfig
  /** Banner art image URL (recommended size: 600x150px, 4:1 aspect ratio) */
  bannerArt?: string
  /** Screen art image URL shown when game is not active (recommended size: 800x450px, 16:9 aspect ratio) */
  screenArt?: string
}

export interface ArcadeGame {
  id: string
  name: string
  description?: string
  createGame: (container: HTMLElement) => Game
}

/**
 * Utility function to create a GameConfig from a Phaser Scene
 * Use this to easily create game configs for your arcade machines
 * 
 * @param name - Display name of the game
 * @param scene - Phaser Scene class, instance, array, or factory function
 * @param config - Optional additional Phaser game configuration
 * @param mobile - Optional mobile compatibility configuration
 */
export const createGameConfig = (
  name: string,
  scene: Scene | Scene[] | (() => Scene) | (new (...args: any[]) => Scene),
  config?: Partial<Types.Core.GameConfig>,
  mobile?: MobileConfig
): GameConfig => {
  return {
    name,
    mobile,
    createGame: (container: HTMLElement) => {
      // Handle different scene input types
      let sceneInstance: Scene | Scene[]

      if (typeof scene === 'function') {
        // Distinguish class constructor from factory function via prototype check
        const proto = (scene as Function).prototype
        if (proto && proto.constructor === scene) {
          sceneInstance = new (scene as new (...args: any[]) => Scene)()
        } else {
          sceneInstance = (scene as () => Scene)()
        }
      } else {
        sceneInstance = scene
      }

      // Mobile-optimized defaults if mobile compatible
      const isMobile = mobile?.isMobileCompatible
      const defaultWidth = isMobile ? (mobile?.minWidth || 320) : 800
      const defaultHeight = isMobile ? 480 : 600

      const gameConfig: Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: container.clientWidth || defaultWidth,
        height: container.clientHeight || defaultHeight,
        parent: container,
        backgroundColor: '#000000',
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        // Enable touch input if mobile compatible
        input: {
          ...(isMobile && { touch: true, activePointers: 2 }),
        },
        ...config,
        scene: sceneInstance,
      }
      return new Game(gameConfig)
    },
  }
}

