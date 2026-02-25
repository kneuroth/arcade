import { GameConfig, createGameConfig } from '../../types/game';
import { BaseGameScene } from '../templates/BaseGameScene';
import { getMapData, getMapCount } from './maps';
import { getAssetPath } from '../../utils/assetPath';
import {
  PLAYER_DRAG, PLAYER_BOUNCE,
  WORLD_WIDTH, WORLD_HEIGHT, DEPTH, BG_COLORS, COLOR,
  PLAYER_W, PLAYER_H, COIN_SIZE, COIN_RADIUS, INDICATOR,
  COYOTE_MS, JUMP_BUFFER_MS,
} from './constants';
import { GravityDirection, DIRECTION_HANDLERS } from './gravityDirections';

class GravityGameScene extends BaseGameScene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private coins!: Phaser.Physics.Arcade.Group;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyLeft!: Phaser.Input.Keyboard.Key;
  private keyRight!: Phaser.Input.Keyboard.Key;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private shiftKey!: Phaser.Input.Keyboard.Key;
  private currentGravity: GravityDirection = GravityDirection.Down;
  private gravityIndicator!: Phaser.GameObjects.Graphics;
  private coinCountText!: Phaser.GameObjects.Text;
  private mapCompleteText!: Phaser.GameObjects.Text;
  private totalCoins = 0;
  private collectedCoins = 0;
  private currentMapIndex = 0;
  private lastGroundedTime = -Infinity; // timestamp when last grounded (for coyote)
  private jumpBufferTime   = -Infinity; // timestamp when Space was pressed (buffer)
  private pendingJumpDir   = GravityDirection.Down; // gravity dir chosen at jump press
  private wasGrounded      = true;      // previous frame grounded state (for land detection)

  constructor() {
    super({ key: 'GravityGame' });
  }

  create() {
    const { width, height } = this.cameras.main;

    this.physics.world.gravity.y = 0; // gravity applied manually per-body each frame

    this.platforms = this.physics.add.staticGroup();
    this.coins = this.physics.add.group();

    // HUD — gravity arrow
    this.gravityIndicator = this.add.graphics();
    this.gravityIndicator.setScrollFactor(0);
    this.gravityIndicator.setDepth(DEPTH.UI);

    // HUD — coin counter
    this.coinCountText = this.add.text(20, 20, 'Coins: 0/0', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial',
    });
    this.coinCountText.setScrollFactor(0);
    this.coinCountText.setDepth(DEPTH.UI);

    // HUD — map complete overlay (camera-relative so it always appears centred)
    this.mapCompleteText = this.add.text(width / 2, height / 2, '', {
      fontSize: '32px',
      color: '#00ff00',
      fontFamily: 'Arial',
    });
    this.mapCompleteText.setOrigin(0.5);
    this.mapCompleteText.setScrollFactor(0);
    this.mapCompleteText.setVisible(false);
    this.mapCompleteText.setDepth(DEPTH.UI);

    // Input — cached once, never recreated inside update()
    this.cursors  = this.input.keyboard!.createCursorKeys();
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyLeft  = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyRight = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.shiftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    // Shared textures created once; reused across every map load
    this.ensureSharedTextures();

    // World boundary outline (drawn once at world origin)
    this.drawBoundaryRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT, COLOR.BOUNDARY, 8, DEPTH.MAP_BOUNDS);

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBackgroundColor(BG_COLORS[GravityDirection.Down]);

    this.loadMap(0);
  }

  /** Reposition camera-relative UI when the canvas resizes. */
  onResize(width: number, height: number) {
    this.mapCompleteText?.setPosition(width / 2, height / 2);
  }

  // ----------------------------------------------------------------
  // Map loading
  // ----------------------------------------------------------------

  private loadMap(mapIndex: number) {
    this.platforms.clear(true, true);
    this.coins.clear(true, true);
    if (this.player) this.player.destroy();

    const mapData = getMapData(mapIndex);
    if (!mapData) {
      console.error(`Map ${mapIndex} not found`);
      return;
    }

    this.currentMapIndex = mapIndex;
    this.collectedCoins  = 0;

    this.cameras.main.stopFollow();
    this.cameras.main.setScroll(0, 0);

    // Platforms — identical dimensions share one cached texture
    for (const p of mapData.platforms) {
      const key = this.ensurePlatformTexture(p.width, p.height);
      const sprite = this.platforms.create(
        p.x + p.width  / 2,
        p.y + p.height / 2,
        key,
      ) as Phaser.Physics.Arcade.Sprite;
      sprite.setDisplaySize(p.width, p.height);
      sprite.refreshBody();
    }

    // Coins — all share one 'coin' texture
    for (const c of mapData.coins) {
      const sprite = this.coins.create(c.x, c.y, 'coin') as Phaser.Physics.Arcade.Sprite;
      sprite.setDisplaySize(COIN_SIZE, COIN_SIZE);
      sprite.setCircle(COIN_RADIUS);
    }

    this.totalCoins = mapData.coins.length;
    this.updateCoinText();

    // Player
    this.player = this.physics.add.sprite(mapData.spawn.x, mapData.spawn.y, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(PLAYER_BOUNCE);
    this.player.setDrag(PLAYER_DRAG, PLAYER_DRAG);

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.overlap(
      this.player,
      this.coins,
      this.collectCoin as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this,
    );

    this.currentGravity   = GravityDirection.Down;
    this.cameras.main.setBackgroundColor(BG_COLORS[this.currentGravity]);
    this.lastGroundedTime = -Infinity;
    this.jumpBufferTime   = -Infinity;
    this.wasGrounded      = true;
    this.cameras.main.startFollow(this.player);
  }

  // ----------------------------------------------------------------
  // Gameplay
  // ----------------------------------------------------------------

  private collectCoin(
    _player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    coin: Phaser.Types.Physics.Arcade.GameObjectWithBody,
  ) {
    (coin as Phaser.Physics.Arcade.Sprite).destroy();
    this.collectedCoins++;
    this.updateCoinText();
    if (this.collectedCoins >= this.totalCoins) this.completeMap();
  }

  private completeMap() {
    const isLast = this.currentMapIndex >= getMapCount() - 1;
    if (!isLast) {
      this.mapCompleteText.setText('Map Complete!\nPress SPACE for next map');
      this.mapCompleteText.setVisible(true);
      this.spaceKey.once('down', () => {
        this.mapCompleteText.setVisible(false);
        this.loadMap(this.currentMapIndex + 1);
      });
    } else {
      this.mapCompleteText.setText('All Maps Complete!\nCongratulations!');
      this.mapCompleteText.setVisible(true);
    }
  }

  /** Read held arrow keys + Shift to determine target gravity. Shift must be held to rotate. */
  private getTargetDirectionFromInput(): GravityDirection {
    if (!this.shiftKey.isDown) return this.currentGravity;
    if (this.cursors.up!.isDown)    return GravityDirection.Up;
    if (this.cursors.down!.isDown)  return GravityDirection.Down;
    if (this.cursors.left!.isDown)  return GravityDirection.Left;
    if (this.cursors.right!.isDown) return GravityDirection.Right;
    return this.currentGravity; // shift held but no arrow → plain jump
  }

  /** Fire the jump impulse (off current surface) and switch gravity to chosen direction. */
  private executeJump(body: Phaser.Physics.Arcade.Body) {
    DIRECTION_HANDLERS[this.currentGravity].applyJump(body);
    this.setGravityDirection(this.pendingJumpDir);
    this.onJump();
  }

  private setGravityDirection(dir: GravityDirection) {
    this.currentGravity = dir;
    this.cameras.main.setBackgroundColor(BG_COLORS[dir]);
  }

  /** Stretch the player sprite on jump, tween back to normal. */
  private onJump() {
    const { sx, sy } = this.getSquashScales(true);
    this.player.setScale(sx, sy);
    this.tweens.add({ targets: this.player, scaleX: 1, scaleY: 1, duration: 200, ease: 'Back.Out' });
  }

  /** Squash the player sprite on land, tween back to normal. */
  private onLand() {
    const { sx, sy } = this.getSquashScales(false);
    this.player.setScale(sx, sy);
    this.tweens.add({ targets: this.player, scaleX: 1, scaleY: 1, duration: 150, ease: 'Back.Out' });
  }

  /** Squash/stretch scales based on current gravity axis. */
  private getSquashScales(isJump: boolean): { sx: number; sy: number } {
    const isVertical = DIRECTION_HANDLERS[this.currentGravity].arrowVector.dy !== 0;
    if (isVertical) {
      return isJump ? { sx: 0.75, sy: 1.3 } : { sx: 1.3, sy: 0.75 };
    } else {
      return isJump ? { sx: 1.3, sy: 0.75 } : { sx: 0.75, sy: 1.3 };
    }
  }

  // ----------------------------------------------------------------
  // Update loop
  // ----------------------------------------------------------------

  update() {
    const body    = this.player.body as Phaser.Physics.Arcade.Body;
    const handler = DIRECTION_HANDLERS[this.currentGravity];

    handler.applyGravity(body);
    handler.handleMovement(body, this.cursors, this.keyLeft, this.keyRight);

    // Coyote time tracking
    const grounded = handler.isGrounded(body);
    if (grounded) this.lastGroundedTime = this.time.now;

    // Landing squash (only after being airborne)
    if (!this.wasGrounded && grounded) this.onLand();
    this.wasGrounded = grounded;

    // Buffer the jump intent + chosen gravity direction at press time
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.jumpBufferTime   = this.time.now;
      this.pendingJumpDir   = this.getTargetDirectionFromInput();
    }

    // Fire jump if grounded (or coyote) and buffer is hot
    const canJump   = grounded || (this.time.now - this.lastGroundedTime < COYOTE_MS);
    const bufferHot = this.time.now - this.jumpBufferTime < JUMP_BUFFER_MS;
    if (canJump && bufferHot) {
      this.executeJump(body);
      this.lastGroundedTime = -Infinity; // consume coyote
      this.jumpBufferTime   = -Infinity; // consume buffer
    }

    this.drawHUD();
  }

  // ----------------------------------------------------------------
  // HUD drawing
  // ----------------------------------------------------------------

  private drawHUD() {
    const cam = this.cameras.main;
    this.gravityIndicator.clear();
    const cx = cam.width - INDICATOR.COMPASS_X;
    const cy = INDICATOR.COMPASS_Y;
    for (let dir = 0; dir < 4; dir++) {
      this.drawGravityArrow(cx, cy, dir as GravityDirection, dir !== this.currentGravity);
    }
  }

  /**
   * Draw one gravity arrow using a vector-based approach —
   * no per-direction switch statement needed.
   *
   * The arrow shaft runs from (x, y) in the gravity direction.
   * The arrowhead chevron is formed by two lines from the tip,
   * angled via the perpendicular vector.
   */
  private drawGravityArrow(x: number, y: number, dir: GravityDirection, isNext: boolean) {
    const g         = this.gravityIndicator;
    const scale     = isNext ? INDICATOR.NEXT_SCALE : 1;
    const lineWidth = isNext ? INDICATOR.NEXT_LINE_WIDTH : INDICATOR.CURRENT_LINE_WIDTH;
    const color     = isNext ? COLOR.INDICATOR_NEXT    : COLOR.INDICATOR_CURRENT;
    const arrowSize = INDICATOR.ARROW_SIZE * scale;
    const headSize  = INDICATOR.HEAD_SIZE  * scale;

    g.lineStyle(lineWidth, color);

    const { dx, dy } = DIRECTION_HANDLERS[dir].arrowVector;
    const ex = x + dx * arrowSize;
    const ey = y + dy * arrowSize;
    const px = -dy; // perpendicular unit vector
    const py =  dx;

    g.lineBetween(x, y, ex, ey);
    g.lineBetween(ex, ey, ex - dx * headSize + px * headSize, ey - dy * headSize + py * headSize);
    g.lineBetween(ex, ey, ex - dx * headSize - px * headSize, ey - dy * headSize - py * headSize);
  }

  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------

  private updateCoinText() {
    this.coinCountText.setText(`Coins: ${this.collectedCoins}/${this.totalCoins}`);
  }

  private drawBoundaryRect(
    x: number, y: number, w: number, h: number,
    color: number, lineWidth: number, depth: number,
  ) {
    const g = this.add.graphics();
    g.lineStyle(lineWidth, color, 1);
    g.strokeRect(x, y, w, h);
    g.setDepth(depth);
  }

  /** Create shared player and coin textures (no-ops if already cached). */
  private ensureSharedTextures() {
    if (!this.textures.exists('player')) {
      const g = this.add.graphics();
      g.fillStyle(COLOR.PLAYER_BODY);   g.fillRect(0, 0, PLAYER_W, PLAYER_H);
      g.fillStyle(COLOR.PLAYER_DETAIL); g.fillRect(4, 4, 16, 24);
      g.generateTexture('player', PLAYER_W, PLAYER_H);
      g.destroy();
    }

    if (!this.textures.exists('coin')) {
      const g = this.add.graphics();
      g.fillStyle(COLOR.COIN_OUTER); g.fillCircle(COIN_RADIUS, COIN_RADIUS, COIN_RADIUS);
      g.fillStyle(COLOR.COIN_INNER); g.fillCircle(COIN_RADIUS, COIN_RADIUS, 12);
      g.generateTexture('coin', COIN_SIZE, COIN_SIZE);
      g.destroy();
    }
  }

  /** Create a platform texture keyed by dimensions — identical sizes share one texture. */
  private ensurePlatformTexture(width: number, height: number): string {
    const key = `platform_${width}x${height}`;
    if (!this.textures.exists(key)) {
      const g = this.add.graphics();
      g.fillStyle(COLOR.PLATFORM);
      g.fillRect(0, 0, width, height);
      g.generateTexture(key, width, height);
      g.destroy();
    }
    return key;
  }
}

export const createGravityGame = (): GameConfig => {
  const config = createGameConfig('Gravity Rotator', GravityGameScene, {
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
  });
  config.bannerArt = getAssetPath('/images/games/gravity-rotator/banner.png');
  config.screenArt = getAssetPath('/images/games/gravity-rotator/screen.png');
  return config;
};
