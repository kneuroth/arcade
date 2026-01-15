import { MapShape, GameMap } from "./bmxGame";

/**
 * Utility functions to easily build BMX maps
 * 
 * Example usage:
 * const map = createMap({
 *   name: "My Level",
 *   startX: 100,
 *   startY: 400,
 *   finishX: 2000,
 *   finishY: 300,
 *   shapes: [
 *     rectangle(0, 450, 300, 50),
 *     platform(400, 450, 200, 50),
 *     ramp(650, 430, 200, 70, -20),
 *   ]
 * });
 */

/**
 * Create a rectangle platform
 */
export const rectangle = (x: number, y: number, width: number, height: number): MapShape => {
  return {
    type: "rectangle",
    x,
    y,
    width,
    height,
  };
};

/**
 * Create a platform (alias for rectangle)
 */
export const platform = (x: number, y: number, width: number, height: number): MapShape => {
  return {
    type: "platform",
    x,
    y,
    width,
    height,
  };
};

/**
 * Create a ramp (rotated rectangle)
 * @param x - X position (center)
 * @param y - Y position (center)
 * @param width - Width of ramp
 * @param height - Height of ramp
 * @param rotation - Rotation in degrees (negative = upward slope, positive = downward slope)
 */
export const ramp = (
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number
): MapShape => {
  return {
    type: "ramp",
    x,
    y,
    width,
    height,
    rotation,
  };
};

/**
 * Helper to create a series of connected platforms
 */
export const platformChain = (
  startX: number,
  startY: number,
  platforms: Array<{ width: number; gap?: number; height?: number; y?: number }>
): MapShape[] => {
  const shapes: MapShape[] = [];
  let currentX = startX;

  platforms.forEach((platform, index) => {
    const y = platform.y !== undefined ? platform.y : startY;
    const height = platform.height || 50;

    shapes.push({
      type: "platform",
      x: currentX + platform.width / 2,
      y: y + height / 2,
      width: platform.width,
      height,
    });

    currentX += platform.width + (platform.gap || 0);
  });

  return shapes;
};

/**
 * Helper to create a map with shapes
 */
export const createMap = (config: {
  name: string;
  startX: number;
  startY: number;
  finishX: number;
  finishY: number;
  shapes: MapShape[];
}): GameMap => {
  return {
    name: config.name,
    startX: config.startX,
    startY: config.startY,
    finishX: config.finishX,
    finishY: config.finishY,
    shapes: config.shapes,
  };
};

