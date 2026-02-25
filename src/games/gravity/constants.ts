/** Gameplay tuning */
export const GRAVITY_FORCE = 800;
export const JUMP_FORCE = 400;
export const MOVE_SPEED = 200;
export const FRICTION = 0.1;
export const PLAYER_DRAG = 100;
export const PLAYER_BOUNCE = 0.1;

/** World dimensions */
export const WORLD_WIDTH = 2000;
export const WORLD_HEIGHT = 1000;

/** Render depths */
export const DEPTH = {
  MAP_BOUNDS: -1,
  UI: 1000,
} as const;

/** Background colors per gravity direction (index matches GravityDirection enum) */
export const BG_COLORS = [0x1a1a2e, 0x2e1a2e, 0x2e2e1a, 0x1a2e2e] as const;

/** Object colors */
export const COLOR = {
  PLATFORM: 0x654321,
  COIN_OUTER: 0xffd700,
  COIN_INNER: 0xffaa00,
  PLAYER_BODY: 0x00ff00,
  PLAYER_DETAIL: 0x00cc00,
  BOUNDARY: 0xff0000,
  INDICATOR_CURRENT: 0xffffff,
  INDICATOR_NEXT: 0x888888,
} as const;

/** Player sprite dimensions */
export const PLAYER_W = 24;
export const PLAYER_H = 32;

/** Coin sprite dimensions */
export const COIN_SIZE = 32;
export const COIN_RADIUS = 16;

/** Feel timing */
export const COYOTE_MS = 120;      // ms grace period after walking off a ledge
export const JUMP_BUFFER_MS = 100; // ms window to pre-press jump before landing

/** HUD gravity indicator sizing */
export const INDICATOR = {
  COMPASS_X: 55, // px from right edge
  COMPASS_Y: 55, // px from top
  ARROW_SIZE: 15,
  HEAD_SIZE: 8,
  NEXT_SCALE: 0.6,
  CURRENT_LINE_WIDTH: 4,
  NEXT_LINE_WIDTH: 2,
} as const;
