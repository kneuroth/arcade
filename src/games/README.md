# Adding Games to the Arcade

This guide shows you how to add new Phaser games to your arcade machines.

## Quick Start

1. **Create a new game scene** in `src/games/` (e.g., `src/games/snake/snakeGame.ts`)

```typescript
import { Scene } from 'phaser'
import { GameConfig, createGameConfig } from '../../types/game'

class SnakeGameScene extends Scene {
  constructor() {
    super({ key: 'SnakeGame' })
  }

  create() {
    // Your game logic here
    this.cameras.main.setBackgroundColor('#000000')
    // ... add sprites, physics, etc.
  }
}

export const createSnakeGame = (): GameConfig => {
  return createGameConfig('Snake Game', SnakeGameScene)
}
```

### Mobile-Compatible Games

To make your game work well on mobile devices, pass a mobile configuration:

```typescript
export const createSnakeGame = (): GameConfig => {
  return createGameConfig(
    'Snake Game',
    SnakeGameScene,
    undefined, // Optional Phaser game config
    {
      isMobileCompatible: true,
      usesTouchControls: true,
      mobileDescription: 'Swipe to control the snake',
      minWidth: 320, // Minimum screen width (default: 320)
    }
  )
}
```

**Mobile Configuration Options:**
- `isMobileCompatible`: Set to `true` to mark the game as mobile-optimized
- `usesTouchControls`: Indicates the game uses touch/gesture controls
- `mobileDescription`: Brief description shown on the arcade machine
- `minWidth`: Minimum recommended screen width (default: 320px)

When a game is marked as mobile-compatible:
- ✅ A mobile badge appears on the arcade machine
- ✅ Touch input is automatically enabled in Phaser
- ✅ The game uses smaller default dimensions (320x480 vs 800x600)
- ✅ Users see mobile compatibility info before playing

2. **Use it in your App.tsx**:

```typescript
import { createSnakeGame } from './games/snake/snakeGame'

<ArcadeMachine gameConfig={createSnakeGame()} />
```

3. **Or register it** in `src/games/gameRegistry.ts`:

```typescript
import { createSnakeGame } from './snake/snakeGame'

export const getAllGames = (): GameConfig[] => {
  return [
    createSnakeGame(),
    // ... other games
  ]
}
```

## Game Structure

- **Scene Class**: Extend `Phaser.Scene` or use `BaseGameScene` from `templates/BaseGameScene.ts`
- **Factory Function**: Export a function that returns a `GameConfig` using `createGameConfig()`
- **Game Config**: The `createGameConfig()` utility handles all the setup automatically

## Example Template

See `src/games/templates/exampleGame.ts` for a complete example.

## Features

- ✅ Automatic game lifecycle management (create/destroy)
- ✅ Responsive scaling to fit container
- ✅ Clean cleanup when closing games
- ✅ Type-safe game configuration
- ✅ Easy to add new games

