import { GameConfig } from '../types/game'
import { createPongGame } from './pong/pongGame'
import { createGravityGame } from './gravity/gravityGame'
import { createFractalGame } from './fractal/fractalGame'

/**
 * Get all available game configs.
 * Add new games here — this is the single source of truth for the game list.
 */
export const getAllGames = (): GameConfig[] => [
  createPongGame(),
  createFractalGame(),
  createGravityGame(),
]

/**
 * Get a game config by name
 */
export const getGameByName = (name: string): GameConfig | undefined => {
  return getAllGames().find(game => game.name === name)
}
