export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Coin {
  x: number;
  y: number;
}

export interface SpawnPoint {
  x: number;
  y: number;
}

export interface MapData {
  platforms: Platform[];
  coins: Coin[];
  spawn: SpawnPoint;
  name: string;
}

/**
 * Map 1: "Tutorial" - Simple introduction
 * Teaches: basic movement, first gravity rotation, collecting coins
 */
const map1: MapData = {
  name: "Tutorial",
  spawn: { x: 100, y: 400 },
  platforms: [
    // Starting platform
    { x: 0, y: 450, width: 300, height: 50 },
    // Gap
    // Second platform (requires jump)
    { x: 400, y: 450, width: 200, height: 50 },
    // Vertical section - platform on right wall (requires right gravity)
    { x: 700, y: 300, width: 50, height: 200 },
    // Top platform (requires up gravity)
    { x: 700, y: 100, width: 200, height: 50 },
    // Left wall platform (requires left gravity)
    { x: 500, y: 200, width: 50, height: 150 },
    // Final platform
    { x: 300, y: 200, width: 150, height: 50 },
  ],
  coins: [
    // Easy coins on starting platform
    { x: 150, y: 400 },
    { x: 250, y: 400 },
    // Coin on second platform
    { x: 500, y: 400 },
    // Coin on right wall (requires right gravity)
    { x: 700, y: 350 },
    // Coin on top platform (requires up gravity)
    { x: 800, y: 50 },
    // Coin on left wall (requires left gravity)
    { x: 500, y: 250 },
    // Final coin
    { x: 375, y: 150 },
  ],
};

/**
 * Map 2: "The Maze" - Strategic rotations
 * Teaches: planning gravity rotations, navigating complex spaces
 */
const map2: MapData = {
  name: "The Maze",
  spawn: { x: 100, y: 400 },
  platforms: [
    // Starting area
    { x: 0, y: 450, width: 200, height: 50 },
    // Right wall section
    { x: 300, y: 0, width: 50, height: 500 },
    // Top ceiling
    { x: 400, y: 0, width: 400, height: 50 },
    // Left wall section
    { x: 800, y: 100, width: 50, height: 400 },
    // Bottom floor section
    { x: 400, y: 450, width: 300, height: 50 },
    // Middle platforms creating a maze
    { x: 500, y: 200, width: 100, height: 50 },
    { x: 650, y: 300, width: 100, height: 50 },
    { x: 500, y: 350, width: 50, height: 50 },
    // Vertical divider
    { x: 600, y: 150, width: 50, height: 100 },
  ],
  coins: [
    // Starting area
    { x: 150, y: 400 },
    // Right wall coins (require right gravity)
    { x: 300, y: 200 },
    { x: 300, y: 350 },
    // Top ceiling coins (require up gravity)
    { x: 500, y: 80 },
    { x: 700, y: 80 },
    // Left wall coins (require left gravity)
    { x: 800, y: 250 },
    { x: 800, y: 400 },
    // Bottom floor coins
    { x: 550, y: 400 },
    // Middle maze coins
    { x: 550, y: 150 },
    { x: 700, y: 250 },
  ],
};

/**
 * Map 3: "The Gauntlet" - Mastery challenge
 * Tests: mastery of all 4 gravity directions, quick decision-making
 */
const map3: MapData = {
  name: "The Gauntlet",
  spawn: { x: 100, y: 400 },
  platforms: [
    // Starting platform
    { x: 0, y: 450, width: 150, height: 50 },
    // Right wall gauntlet
    { x: 200, y: 100, width: 50, height: 200 },
    { x: 200, y: 300, width: 50, height: 200 },
    // Top ceiling section
    { x: 300, y: 100, width: 200, height: 50 },
    { x: 550, y: 100, width: 100, height: 50 },
    // Left wall section
    { x: 700, y: 100, width: 50, height: 150 },
    { x: 700, y: 300, width: 50, height: 150 },
    // Bottom floor section
    { x: 300, y: 450, width: 150, height: 50 },
    { x: 500, y: 450, width: 150, height: 50 },
    // Narrow platforms requiring precision
    { x: 400, y: 200, width: 50, height: 50 },
    { x: 500, y: 300, width: 50, height: 50 },
    { x: 600, y: 200, width: 50, height: 50 },
    // Final platform
    { x: 800, y: 400, width: 150, height: 50 },
  ],
  coins: [
    // Starting coin
    { x: 75, y: 400 },
    // Right wall coins (require right gravity, timing)
    { x: 200, y: 100 },
    { x: 200, y: 400 },
    // Top ceiling coins (require up gravity)
    { x: 400, y: 20 },
    { x: 600, y: 20 },
    // Left wall coins (require left gravity)
    { x: 700, y: 200 },
    { x: 700, y: 400 },
    // Bottom floor coins
    { x: 375, y: 400 },
    { x: 575, y: 400 },
    // Narrow platform coins (require precise jumps)
    { x: 425, y: 150 },
    { x: 525, y: 250 },
    { x: 625, y: 150 },
    // Final coin
    { x: 875, y: 350 },
  ],
};

const maps: MapData[] = [map1, map2, map3];

export function getMapData(index: number): MapData | null {
  if (index >= 0 && index < maps.length) {
    return maps[index];
  }
  return null;
}

export function getMapCount(): number {
  return maps.length;
}

