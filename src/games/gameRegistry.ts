import { GameConfig } from '../types/game'

// This file serves as a registry for all games
// Import your game configs here and export them

// Example imports (uncomment when you create games):
// import { createExampleGame } from './templates/exampleGame'
// import { createSnakeGame } from './snake/snakeGame'
// import { createPongGame } from './pong/pongGame'
import { createGravityGame } from './gravity/gravityGame'
import { createFractalGame } from './fractal/fractalGame'

/**
 * Get all available game configs
 * Add your games to this array
 */
export const getAllGames = (): GameConfig[] => {
  return [
    createGravityGame(),
    createFractalGame(),
    // createExampleGame(),
    // createSnakeGame(),
    // createPongGame(),
  ]
}

/**
 * Get a game config by name
 */
export const getGameByName = (name: string): GameConfig | undefined => {
  return getAllGames().find(game => game.name === name)
}

