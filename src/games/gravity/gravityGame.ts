import { Scene } from "phaser";
import { GameConfig, createGameConfig } from "../../types/game";
import { getMapData } from "./maps";
import { getAssetPath } from "../../utils/assetPath";

enum GravityDirection {
  Down = 0,   // Normal gravity
  Right = 1,  // Gravity pulls right
  Up = 2,     // Gravity pulls up
  Left = 3    // Gravity pulls left
}

class GravityGameScene extends Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private coins!: Phaser.Physics.Arcade.Group;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private currentGravity: GravityDirection = GravityDirection.Down;
  private gravityIndicator!: Phaser.GameObjects.Graphics;
  private coinCountText!: Phaser.GameObjects.Text;
  private totalCoins: number = 0;
  private collectedCoins: number = 0;
  private currentMapIndex: number = 0;
  private mapCompleteText!: Phaser.GameObjects.Text;
  private gravityForce: number = 800; // Gravity strength
  private jumpForce: number = 400; // Jump velocity
  private mapBounds!: Phaser.GameObjects.Image;

  constructor() {
    super({ key: "GravityGame" });
  }

  create() {
    const { width, height } = this.cameras.main;

    // Set background
    this.cameras.main.setBackgroundColor("#1a1a2e");

    // Initialize physics
    this.physics.world.gravity.y = 0; // We'll handle gravity manually

    // Create platforms group
    this.platforms = this.physics.add.staticGroup();

    // Create coins group
    this.coins = this.physics.add.group();

    // Create gravity indicator (fixed to camera)
    this.gravityIndicator = this.add.graphics();
    this.gravityIndicator.setScrollFactor(0, 0); // Fix to camera, not world
    this.gravityIndicator.setDepth(1000); // On top of everything
    this.updateGravityIndicator();

    // Create UI (must be created before loadMap since it calls updateCoinText)
    this.coinCountText = this.add.text(20, 20, "Coins: 0/0", {
      fontSize: "24px",
      color: "#ffffff",
      fontFamily: "Arial",
    });
    this.coinCountText.setScrollFactor(0, 0); // Fix to camera
    this.coinCountText.setDepth(1000); // On top

    this.mapCompleteText = this.add.text(width / 2, height / 2, "", {
      fontSize: "32px",
      color: "#00ff00",
      fontFamily: "Arial",
    });
    this.mapCompleteText.setOrigin(0.5);
    this.mapCompleteText.setVisible(false);
    this.mapCompleteText.setDepth(1000); // Ensure it's on top of everything

    // Setup controls
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Load first map (after UI is created)
    this.loadMap(0);

    // Setup camera to follow player (after player is created)
    this.cameras.main.startFollow(this.player);
    // Set camera bounds to accommodate larger maps
    this.cameras.main.setBounds(0, 0, 2000, 1000);

    // Create visible map boundaries
    this.createMapBoundaries();
  }

  private loadMap(mapIndex: number) {
    // Clear existing map elements
    this.platforms.clear(true, true);
    this.coins.clear(true, true);
    if (this.player) {
      this.player.destroy();
    }

    const mapData = getMapData(mapIndex);
    if (!mapData) {
      console.error(`Map ${mapIndex} not found`);
      return;
    }

    this.currentMapIndex = mapIndex;
    this.collectedCoins = 0;

    // Reset camera position
    this.cameras.main.stopFollow();
    this.cameras.main.setScroll(0, 0);

    // Update map boundaries
    this.updateMapBoundaries();

    // Create platforms
    mapData.platforms.forEach((platform) => {
      const platformSprite = this.platforms.create(
        platform.x + platform.width / 2,
        platform.y + platform.height / 2,
        undefined
      ) as Phaser.Physics.Arcade.Sprite;

      // Create graphics for platform
      const graphics = this.add.graphics();
      graphics.fillStyle(0x654321);
      graphics.fillRect(0, 0, platform.width, platform.height);
      graphics.generateTexture(`platform_${platform.x}_${platform.y}`, platform.width, platform.height);
      graphics.destroy();

      platformSprite.setTexture(`platform_${platform.x}_${platform.y}`);
      platformSprite.setDisplaySize(platform.width, platform.height);
      platformSprite.refreshBody();
    });

    // Create coins
    mapData.coins.forEach((coin) => {
      const coinSprite = this.coins.create(coin.x, coin.y, undefined) as Phaser.Physics.Arcade.Sprite;

      // Create graphics for coin
      const graphics = this.add.graphics();
      graphics.fillStyle(0xffd700);
      graphics.fillCircle(16, 16, 16);
      graphics.fillStyle(0xffaa00);
      graphics.fillCircle(16, 16, 12);
      graphics.generateTexture(`coin_${coin.x}_${coin.y}`, 32, 32);
      graphics.destroy();

      coinSprite.setTexture(`coin_${coin.x}_${coin.y}`);
      coinSprite.setDisplaySize(32, 32);
      coinSprite.setCircle(16);
      // Coins don't need gravity - they're static collectibles
    });

    this.totalCoins = mapData.coins.length;
    this.updateCoinText();

    // Create player
    const graphics = this.add.graphics();
    graphics.fillStyle(0x00ff00);
    graphics.fillRect(0, 0, 24, 32);
    graphics.fillStyle(0x00cc00);
    graphics.fillRect(4, 4, 16, 24);
    graphics.generateTexture("player", 24, 32);
    graphics.destroy();

    this.player = this.physics.add.sprite(mapData.spawn.x, mapData.spawn.y, "player");
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.1);
    this.player.setDrag(100, 100);

    // Get default world bounds (Phaser sets these automatically based on game size)
    // and create visual boundaries based on those
    const worldBounds = this.physics.world.bounds;
    this.createWorldBoundaryLines(worldBounds.width, worldBounds.height);

    // Collisions
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.overlap(this.player, this.coins, this.collectCoin as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);

    // Reset gravity to down
    this.currentGravity = GravityDirection.Down;
    this.updateGravityIndicator();

    // Restart camera following after player is created
    this.cameras.main.startFollow(this.player);
  }

  private createMapBoundaries() {
    // Use the same bounds as world bounds (get from physics world)
    const worldBounds = this.physics.world.bounds;
    const boundsWidth = worldBounds.width;
    const boundsHeight = worldBounds.height;
    const lineWidth = 8;

    const graphics = this.add.graphics();
    graphics.lineStyle(lineWidth, 0xff0000, 1.0); // Bright red, fully opaque

    // Draw boundary lines at the edges of the playable area
    // These match the world bounds
    // Top boundary (y = 0)
    graphics.lineBetween(0, 0, boundsWidth, 0);
    // Right boundary (x = boundsWidth)
    graphics.lineBetween(boundsWidth, 0, boundsWidth, boundsHeight);
    // Bottom boundary (y = boundsHeight)
    graphics.lineBetween(boundsWidth, boundsHeight, 0, boundsHeight);
    // Left boundary (x = 0)
    graphics.lineBetween(0, boundsHeight, 0, 0);

    // Generate as texture and create sprite so it persists
    graphics.generateTexture("mapBoundaries", boundsWidth, boundsHeight);
    graphics.destroy();

    this.mapBounds = this.add.image(0, 0, "mapBoundaries");
    this.mapBounds.setOrigin(0, 0);
    this.mapBounds.setDepth(-1); // Behind everything but visible
  }

  private updateMapBoundaries() {
    // Boundaries are static, no need to update
    // But ensure they're visible
    if (this.mapBounds) {
      this.mapBounds.setVisible(true);
    }
  }

  private createWorldBoundaryLines(width: number, height: number) {
    // Create graphics for world boundary lines (where player collides)
    const graphics = this.add.graphics();
    graphics.lineStyle(4, 0x00ff00, 1.0); // Green lines for world bounds

    // Draw boundary lines at the edges of the world
    // Top boundary (y = 0)
    graphics.lineBetween(0, 0, width, 0);
    // Right boundary (x = width)
    graphics.lineBetween(width, 0, width, height);
    // Bottom boundary (y = height)
    graphics.lineBetween(width, height, 0, height);
    // Left boundary (x = 0)
    graphics.lineBetween(0, height, 0, 0);

    // Generate as texture and create sprite
    graphics.generateTexture("worldBoundaries", width, height);
    graphics.destroy();

    const worldBoundsSprite = this.add.image(0, 0, "worldBoundaries");
    worldBoundsSprite.setOrigin(0, 0);
    worldBoundsSprite.setDepth(-2); // Behind map boundaries but visible
  }

  private collectCoin(
    _player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    coin: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) {
    const coinSprite = coin as Phaser.Physics.Arcade.Sprite;
    coinSprite.destroy();
    this.collectedCoins++;
    this.updateCoinText();

    // Check if all coins collected
    if (this.collectedCoins >= this.totalCoins) {
      this.completeMap();
    }
  }

  private completeMap() {
    if (this.currentMapIndex < 2) {
      // Move to next map
      this.mapCompleteText.setText("Map Complete!\nPress SPACE for next map");
      this.mapCompleteText.setVisible(true);

      // Wait for space to continue
      const spaceHandler = () => {
        this.mapCompleteText.setVisible(false);
        this.loadMap(this.currentMapIndex + 1);
        this.spaceKey.off("down", spaceHandler);
      };
      this.spaceKey.once("down", spaceHandler);
    } else {
      // All maps complete
      this.mapCompleteText.setText("All Maps Complete!\nCongratulations!");
      this.mapCompleteText.setVisible(true);
    }
  }

  private updateCoinText() {
    this.coinCountText.setText(`Coins: ${this.collectedCoins}/${this.totalCoins}`);
  }

  private updateGravityIndicator() {
    // This method is called when gravity changes
    // The actual drawing happens in update() at the correct camera-relative position
  }

  private rotateGravity() {
    // Rotate clockwise: Down → Right → Up → Left → Down
    this.currentGravity = (this.currentGravity + 1) % 4;
    this.updateGravityIndicator();

    // Update background color subtly
    const colors = [0x1a1a2e, 0x2e1a2e, 0x2e2e1a, 0x1a2e2e];
    this.cameras.main.setBackgroundColor(colors[this.currentGravity]);
  }

  private applyGravity() {
    const body = this.player.body as Phaser.Physics.Arcade.Body;

    // Reset gravity forces
    body.setGravity(0, 0);

    // Apply gravity based on current direction
    // Use consistent force value in all directions
    switch (this.currentGravity) {
      case GravityDirection.Down:
        body.setGravityY(this.gravityForce);
        break;
      case GravityDirection.Right:
        body.setGravityX(this.gravityForce);
        break;
      case GravityDirection.Up:
        body.setGravityY(-this.gravityForce);
        break;
      case GravityDirection.Left:
        body.setGravityX(-this.gravityForce);
        break;
    }
  }

  private handleJump() {
    const body = this.player.body as Phaser.Physics.Arcade.Body;

    // Check if player is on ground (touching a platform in the direction opposite to gravity)
    let isOnGround = false;

    switch (this.currentGravity) {
      case GravityDirection.Down:
        isOnGround = body.blocked.down || body.touching.down;
        break;
      case GravityDirection.Right:
        // When gravity is right, player stands on left side of platform
        isOnGround = body.blocked.right || body.touching.right;
        break;
      case GravityDirection.Up:
        isOnGround = body.blocked.up || body.touching.up;
        break;
      case GravityDirection.Left:
        // When gravity is left, player stands on right side of platform
        isOnGround = body.blocked.left || body.touching.left;
        break;
    }

    if (isOnGround) {
      // Apply jump force opposite to gravity direction
      switch (this.currentGravity) {
        case GravityDirection.Down:
          body.setVelocityY(-this.jumpForce);
          break;
        case GravityDirection.Right:
          body.setVelocityX(-this.jumpForce);
          break;
        case GravityDirection.Up:
          body.setVelocityY(this.jumpForce);
          break;
        case GravityDirection.Left:
          body.setVelocityX(this.jumpForce);
          break;
      }

      // Rotate gravity
      this.rotateGravity();
    }
  }

  update() {
    // Apply gravity
    this.applyGravity();

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const leftKey = this.input.keyboard!.addKey("A");
    const rightKey = this.input.keyboard!.addKey("D");

    // Handle movement relative to player's orientation (not screen)
    // Arrow keys are relative to the surface the player is standing on
    switch (this.currentGravity) {
      case GravityDirection.Down:
        // Normal: Left/Right move horizontally, Up is jump
        if (this.cursors.left!.isDown || this.input.keyboard!.checkDown(leftKey)) {
          this.player.setVelocityX(-200);
        } else if (this.cursors.right!.isDown || this.input.keyboard!.checkDown(rightKey)) {
          this.player.setVelocityX(200);
        } else {
          body.setVelocityX(Phaser.Math.Linear(body.velocity.x, 0, 0.1));
        }
        // Up arrow or Space is jump
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.cursors.up!)) {
          this.handleJump();
        }
        break;

      case GravityDirection.Right:
        // Standing on right wall: Up/Down move vertically along wall, Left is jump
        if (this.cursors.up!.isDown) {
          body.setVelocityY(-200);
        } else if (this.cursors.down!.isDown) {
          body.setVelocityY(200);
        } else {
          body.setVelocityY(Phaser.Math.Linear(body.velocity.y, 0, 0.1));
        }
        // Left arrow or Space is jump
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.cursors.left!)) {
          this.handleJump();
        }
        break;

      case GravityDirection.Up:
        // On ceiling: Left/Right move horizontally, Down is jump
        if (this.cursors.left!.isDown || this.input.keyboard!.checkDown(leftKey)) {
          this.player.setVelocityX(-200);
        } else if (this.cursors.right!.isDown || this.input.keyboard!.checkDown(rightKey)) {
          this.player.setVelocityX(200);
        } else {
          body.setVelocityX(Phaser.Math.Linear(body.velocity.x, 0, 0.1));
        }
        // Down arrow or Space is jump
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.cursors.down!)) {
          this.handleJump();
        }
        break;

      case GravityDirection.Left:
        // Standing on left wall: Up/Down move vertically along wall, Right is jump
        if (this.cursors.up!.isDown) {
          body.setVelocityY(-200);
        } else if (this.cursors.down!.isDown) {
          body.setVelocityY(200);
        } else {
          body.setVelocityY(Phaser.Math.Linear(body.velocity.y, 0, 0.1));
        }
        // Right arrow or Space is jump
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.cursors.right!)) {
          this.handleJump();
        }
        break;
    }

    // Update UI positions (relative to camera viewport)
    const cam = this.cameras.main;
    this.gravityIndicator.clear();

    // Position indicators fixed to screen (camera-relative)
    const currentIndicatorX = cam.width - 80;
    const nextIndicatorX = cam.width - 40;
    const indicatorY = 30;

    // Draw current gravity indicator
    this.drawGravityIndicator(currentIndicatorX, indicatorY, this.currentGravity, false);

    // Draw next gravity direction (to the right, smaller, grey)
    const nextGravity = (this.currentGravity + 1) % 4;
    this.drawGravityIndicator(nextIndicatorX, indicatorY, nextGravity, true);

    this.coinCountText.setPosition(20, 20);
  }

  private drawGravityIndicator(x: number, y: number, direction: GravityDirection, isNext: boolean) {
    // Set style based on whether it's current or next
    const lineWidth = isNext ? 2 : 4;
    const color = isNext ? 0x888888 : 0xffffff; // Grey for next, white for current
    const scale = isNext ? 0.6 : 1.0; // Smaller for next

    this.gravityIndicator.lineStyle(lineWidth, color);
    const arrowSize = 15 * scale;
    const headSize = 8 * scale;

    switch (direction) {
      case GravityDirection.Down:
        // Arrow pointing down (gravity pulls down)
        // Draw shaft from top to bottom
        this.gravityIndicator.lineBetween(x, y, x, y + arrowSize);
        // Draw arrowhead pointing down
        this.gravityIndicator.lineBetween(x, y + arrowSize, x - headSize, y + arrowSize - headSize);
        this.gravityIndicator.lineBetween(x, y + arrowSize, x + headSize, y + arrowSize - headSize);
        break;
      case GravityDirection.Right:
        // Arrow pointing right (gravity pulls right)
        // Draw shaft from left to right
        this.gravityIndicator.lineBetween(x, y, x + arrowSize, y);
        // Draw arrowhead pointing right
        this.gravityIndicator.lineBetween(x + arrowSize, y, x + arrowSize - headSize, y - headSize);
        this.gravityIndicator.lineBetween(x + arrowSize, y, x + arrowSize - headSize, y + headSize);
        break;
      case GravityDirection.Up:
        // Arrow pointing up (gravity pulls up)
        // Draw shaft from bottom to top
        this.gravityIndicator.lineBetween(x, y + arrowSize, x, y);
        // Draw arrowhead pointing up
        this.gravityIndicator.lineBetween(x, y, x - headSize, y + headSize);
        this.gravityIndicator.lineBetween(x, y, x + headSize, y + headSize);
        break;
      case GravityDirection.Left:
        // Arrow pointing left (gravity pulls left)
        // Draw shaft from right to left
        this.gravityIndicator.lineBetween(x + arrowSize, y, x, y);
        // Draw arrowhead pointing left
        this.gravityIndicator.lineBetween(x, y, x + headSize, y - headSize);
        this.gravityIndicator.lineBetween(x, y, x + headSize, y + headSize);
        break;
    }
  }
}

/**
 * Factory function to create the Gravity Rotating Platformer game config
 */
export const createGravityGame = (): GameConfig => {
  const config = createGameConfig(
    "Gravity Rotator",
    GravityGameScene,
    {
      physics: {
        default: "arcade",
        arcade: {
          gravity: { x: 0, y: 0 }, // We handle gravity manually
          debug: false,
        },
      },
    }
  );
  config.bannerArt = getAssetPath("/images/games/gravity-rotator/banner.png");
  config.screenArt = getAssetPath("/images/games/gravity-rotator/screen.png");
  return config;
};

