import { GRAVITY_FORCE, JUMP_FORCE, MOVE_SPEED, FRICTION } from './constants';

export enum GravityDirection {
  Down = 0,
  Right = 1,
  Up = 2,
  Left = 3,
}

type Body = Phaser.Physics.Arcade.Body;
type Cursors = Phaser.Types.Input.Keyboard.CursorKeys;
type Key = Phaser.Input.Keyboard.Key;

export interface DirectionHandler {
  /** Apply correct gravity force to the player body each frame */
  applyGravity(body: Body): void;
  /** True when the player is touching the "floor" for this gravity direction */
  isGrounded(body: Body): boolean;
  /** Apply jump impulse opposite to gravity */
  applyJump(body: Body): void;
  /** Drive lateral movement (the axis parallel to the "floor") */
  handleMovement(body: Body, cursors: Cursors, altNeg: Key, altPos: Key): void;
  /** Unit direction vector used to draw the gravity arrow in the HUD */
  arrowVector: { dx: number; dy: number };
  /** True when the jump key for this gravity direction is held */
  isJumpPressed(cursors: Cursors): boolean;
}

/**
 * Per-direction behaviour table.
 * Add all gravity-direction-specific logic HERE so the game scene
 * stays free of switch statements.
 */
export const DIRECTION_HANDLERS: Record<GravityDirection, DirectionHandler> = {
  [GravityDirection.Down]: {
    applyGravity:   (body) => body.setGravity(0, GRAVITY_FORCE),
    isGrounded:     (body) => body.blocked.down || body.touching.down,
    applyJump:      (body) => body.setVelocityY(-JUMP_FORCE),
    handleMovement: (body, cursors, altNeg, altPos) => {
      if      (cursors.left!.isDown  || altNeg.isDown) body.setVelocityX(-MOVE_SPEED);
      else if (cursors.right!.isDown || altPos.isDown) body.setVelocityX( MOVE_SPEED);
      else body.setVelocityX(Phaser.Math.Linear(body.velocity.x, 0, FRICTION));
    },
    arrowVector:    { dx: 0, dy: 1 },
    isJumpPressed:  (cursors) => cursors.up!.isDown,
  },

  [GravityDirection.Right]: {
    applyGravity:   (body) => body.setGravity(GRAVITY_FORCE, 0),
    isGrounded:     (body) => body.blocked.right || body.touching.right,
    applyJump:      (body) => body.setVelocityX(-JUMP_FORCE),
    handleMovement: (body, cursors, _altNeg, _altPos) => {
      if      (cursors.up!.isDown)   body.setVelocityY(-MOVE_SPEED);
      else if (cursors.down!.isDown) body.setVelocityY( MOVE_SPEED);
      else body.setVelocityY(Phaser.Math.Linear(body.velocity.y, 0, FRICTION));
    },
    arrowVector:    { dx: 1, dy: 0 },
    isJumpPressed:  (cursors) => cursors.left!.isDown,
  },

  [GravityDirection.Up]: {
    applyGravity:   (body) => body.setGravity(0, -GRAVITY_FORCE),
    isGrounded:     (body) => body.blocked.up || body.touching.up,
    applyJump:      (body) => body.setVelocityY(JUMP_FORCE),
    handleMovement: (body, cursors, altNeg, altPos) => {
      if      (cursors.left!.isDown  || altNeg.isDown) body.setVelocityX(-MOVE_SPEED);
      else if (cursors.right!.isDown || altPos.isDown) body.setVelocityX( MOVE_SPEED);
      else body.setVelocityX(Phaser.Math.Linear(body.velocity.x, 0, FRICTION));
    },
    arrowVector:    { dx: 0, dy: -1 },
    isJumpPressed:  (cursors) => cursors.down!.isDown,
  },

  [GravityDirection.Left]: {
    applyGravity:   (body) => body.setGravity(-GRAVITY_FORCE, 0),
    isGrounded:     (body) => body.blocked.left || body.touching.left,
    applyJump:      (body) => body.setVelocityX(JUMP_FORCE),
    handleMovement: (body, cursors, _altNeg, _altPos) => {
      if      (cursors.up!.isDown)   body.setVelocityY(-MOVE_SPEED);
      else if (cursors.down!.isDown) body.setVelocityY( MOVE_SPEED);
      else body.setVelocityY(Phaser.Math.Linear(body.velocity.y, 0, FRICTION));
    },
    arrowVector:    { dx: -1, dy: 0 },
    isJumpPressed:  (cursors) => cursors.right!.isDown,
  },
};

export function nextDirection(dir: GravityDirection): GravityDirection {
  return ((dir + 1) % 4) as GravityDirection;
}

export function oppositeDirection(dir: GravityDirection): GravityDirection {
  return ((dir + 2) % 4) as GravityDirection;
}
