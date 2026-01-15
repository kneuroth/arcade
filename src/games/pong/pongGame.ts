import { Scene } from "phaser";
import { GameConfig, createGameConfig } from "../../types/game";
import { getAssetPath } from "../../utils/assetPath";

class PongGameScene extends Scene {
  private leftPaddle!: Phaser.GameObjects.Rectangle;
  private rightPaddle!: Phaser.GameObjects.Rectangle;
  private ball!: Phaser.GameObjects.Arc;
  private ballVelocity!: Phaser.Math.Vector2;
  private trailGraphics!: Phaser.GameObjects.Graphics;
  private trailPoints: Array<{ x: number; y: number; alpha: number; color: number }> = [];
  private rallyCount: number = 0;
  private rallyText!: Phaser.GameObjects.Text;
  private activePointers: Map<number, Phaser.GameObjects.Rectangle> = new Map();
  private ballSpeed: number = 300;
  private baseBallSpeed: number = 300;
  private hue: number = 0;
  private readonly maxVerticalSpeedRatio: number = 0.6; // Max vertical speed as ratio of horizontal speed (prevents too steep angles)
  private readonly bounceRandomness: number = 50; // Random variance added to ball bounce

  constructor() {
    super({ key: "PongGame" });
  }

  create() {
    const { width, height } = this.cameras.main;

    // Set background
    this.cameras.main.setBackgroundColor("#0a0a0a");

    // Create trail graphics
    this.trailGraphics = this.add.graphics();

    // Create paddles (can move anywhere on their side)
    const paddleWidth = 15;
    const paddleHeight = 80;
    const paddleY = height / 2;

    this.leftPaddle = this.add.rectangle(30, paddleY, paddleWidth, paddleHeight, 0x00ff00);
    this.rightPaddle = this.add.rectangle(width - 30, paddleY, paddleWidth, paddleHeight, 0xff0000);

    // Create ball
    this.ball = this.add.circle(width / 2, height / 2, 10, 0xffffff);
    this.ballVelocity = new Phaser.Math.Vector2(
      Phaser.Math.Between(-1, 1) > 0 ? this.ballSpeed : -this.ballSpeed,
      Phaser.Math.Between(-this.ballSpeed / 2, this.ballSpeed / 2)
    );

    // Rally counter (main goal)
    this.rallyText = this.add.text(width / 2, 30, "Rally: 0", {
      fontSize: "36px",
      color: "#ffffff",
      fontFamily: "Arial",
    });
    this.rallyText.setOrigin(0.5);
    this.rallyText.setStyle({ fontWeight: "bold" });

    // Instructions
    const instructions = this.add.text(width / 2, height - 30, "Drag anywhere to move paddles", {
      fontSize: "16px",
      color: "#666666",
      fontFamily: "Arial",
    });
    instructions.setOrigin(0.5);

    // Fade out instructions after 3 seconds
    this.tweens.add({
      targets: instructions,
      alpha: 0,
      duration: 2000,
      delay: 3000,
    });

    // Input handlers for both touch and mouse - support multiple pointers
    this.input.on("pointerdown", this.startDrag, this);
    this.input.on("pointermove", this.onDrag, this);
    this.input.on("pointerup", this.stopDrag, this);
    this.input.on("pointerupoutside", this.stopDrag, this);

    // Center line
    this.add.rectangle(width / 2, 0, 2, height, 0x333333);
  }

  private startDrag(pointer: Phaser.Input.Pointer) {
    const { x, y } = pointer;
    const { width } = this.cameras.main;
    const paddleWidth = 15;
    const paddleHeight = 80;
    const paddleX = 30;
    const rightPaddleX = width - 30;

    // Determine which paddle to control based on screen position
    // Left half of screen controls left paddle, right half controls right paddle
    let targetPaddle: Phaser.GameObjects.Rectangle | null = null;

    if (x < width / 2) {
      // Left side - control left paddle
      targetPaddle = this.leftPaddle;
    } else {
      // Right side - control right paddle
      targetPaddle = this.rightPaddle;
    }

    // If clicking directly on a paddle, use that paddle
    // Otherwise use the paddle on that side of the screen
    if (
      x >= paddleX - paddleWidth / 2 &&
      x <= paddleX + paddleWidth / 2 &&
      y >= this.leftPaddle.y - paddleHeight / 2 &&
      y <= this.leftPaddle.y + paddleHeight / 2
    ) {
      targetPaddle = this.leftPaddle;
    } else if (
      x >= rightPaddleX - paddleWidth / 2 &&
      x <= rightPaddleX + paddleWidth / 2 &&
      y >= this.rightPaddle.y - paddleHeight / 2 &&
      y <= this.rightPaddle.y + paddleHeight / 2
    ) {
      targetPaddle = this.rightPaddle;
    }

    if (targetPaddle) {
      this.activePointers.set(pointer.id, targetPaddle);
      // Immediately move paddle to pointer position
      this.movePaddleToPointer(pointer, targetPaddle);
    }
  }

  private onDrag(pointer: Phaser.Input.Pointer) {
    const targetPaddle = this.activePointers.get(pointer.id);
    if (!targetPaddle) {
      // If pointer not in map but is down, try to assign it
      if (pointer.isDown) {
        this.startDrag(pointer);
        return;
      }
      return;
    }

    this.movePaddleToPointer(pointer, targetPaddle);
  }

  private movePaddleToPointer(pointer: Phaser.Input.Pointer, paddle: Phaser.GameObjects.Rectangle) {
    const { width, height } = this.cameras.main;
    const paddleHeight = 80;
    const minY = paddleHeight / 2;
    const maxY = height - paddleHeight / 2;

    // Constrain paddle to its side of the screen
    if (paddle === this.leftPaddle) {
      // Left paddle can move anywhere on left half
      paddle.y = Phaser.Math.Clamp(pointer.y, minY, maxY);
      paddle.x = Phaser.Math.Clamp(pointer.x, 15, width / 2 - 15);
    } else {
      // Right paddle can move anywhere on right half
      paddle.y = Phaser.Math.Clamp(pointer.y, minY, maxY);
      paddle.x = Phaser.Math.Clamp(pointer.x, width / 2 + 15, width - 15);
    }
  }

  private stopDrag(pointer: Phaser.Input.Pointer) {
    this.activePointers.delete(pointer.id);
  }

  update() {
    const { width, height } = this.cameras.main;
    const paddleWidth = 15;
    const paddleHeight = 80;
    const ballRadius = 10;

    // Update ball position
    this.ball.x += this.ballVelocity.x * (this.game.loop.delta / 1000);
    this.ball.y += this.ballVelocity.y * (this.game.loop.delta / 1000);

    // Ball collision with top/bottom walls
    if (this.ball.y <= ballRadius || this.ball.y >= height - ballRadius) {
      this.ballVelocity.y = -this.ballVelocity.y;
      this.ball.y = Phaser.Math.Clamp(this.ball.y, ballRadius, height - ballRadius);

      // Ensure wall bounces don't create too steep angles
      const horizontalSpeed = Math.abs(this.ballVelocity.x);
      const maxVerticalSpeed = horizontalSpeed * this.maxVerticalSpeedRatio;
      if (Math.abs(this.ballVelocity.y) > maxVerticalSpeed) {
        this.ballVelocity.y = Math.sign(this.ballVelocity.y) * maxVerticalSpeed;
      }
    }

    // Ball collision with left paddle
    if (
      this.ball.x - ballRadius <= this.leftPaddle.x + paddleWidth / 2 &&
      this.ball.x - ballRadius >= this.leftPaddle.x - paddleWidth / 2 &&
      this.ball.y >= this.leftPaddle.y - paddleHeight / 2 &&
      this.ball.y <= this.leftPaddle.y + paddleHeight / 2 &&
      this.ballVelocity.x < 0
    ) {
      this.handlePaddleHit(this.leftPaddle, "left", paddleWidth, paddleHeight, ballRadius);
    }

    // Ball collision with right paddle
    if (
      this.ball.x + ballRadius >= this.rightPaddle.x - paddleWidth / 2 &&
      this.ball.x + ballRadius <= this.rightPaddle.x + paddleWidth / 2 &&
      this.ball.y >= this.rightPaddle.y - paddleHeight / 2 &&
      this.ball.y <= this.rightPaddle.y + paddleHeight / 2 &&
      this.ballVelocity.x > 0
    ) {
      this.handlePaddleHit(this.rightPaddle, "right", paddleWidth, paddleHeight, ballRadius);
    }

    // Ball went out of bounds - reset rally
    if (this.ball.x < 0 || this.ball.x > width) {
      this.resetBall();
    }

    // Update trail and visual effects
    this.updateTrail();
  }

  private handlePaddleHit(
    paddle: Phaser.GameObjects.Rectangle,
    side: "left" | "right",
    paddleWidth: number,
    paddleHeight: number,
    ballRadius: number
  ) {
    // Calculate where ball hit paddle (normalized -1 to 1, where 0 is center)
    const hitPos = (this.ball.y - paddle.y) / (paddleHeight / 2);

    // Reverse horizontal velocity
    this.ballVelocity.x = -this.ballVelocity.x;

    // Add spin based on where ball hits paddle
    this.ballVelocity.y += hitPos * 100;

    // Add randomness to make rallies unpredictable
    this.ballVelocity.y += Phaser.Math.Between(-this.bounceRandomness, this.bounceRandomness);

    // Cap vertical velocity to prevent too steep angles (keeps game fun)
    const horizontalSpeed = Math.abs(this.ballVelocity.x);
    const maxVerticalSpeed = horizontalSpeed * this.maxVerticalSpeedRatio;
    if (Math.abs(this.ballVelocity.y) > maxVerticalSpeed) {
      this.ballVelocity.y = Math.sign(this.ballVelocity.y) * maxVerticalSpeed;
    }

    // Position ball correctly
    if (side === "left") {
      this.ball.x = paddle.x + paddleWidth / 2 + ballRadius;
    } else {
      this.ball.x = paddle.x - paddleWidth / 2 - ballRadius;
    }

    this.onPaddleHit();
  }

  private onPaddleHit() {
    this.rallyCount++;
    this.rallyText.setText(`Rally: ${this.rallyCount}`);

    // Increase ball speed based on rally count (with cap)
    const speedMultiplier = 1 + Math.min(this.rallyCount * 0.05, 1.5);
    const currentSpeed = Math.sqrt(
      this.ballVelocity.x * this.ballVelocity.x + this.ballVelocity.y * this.ballVelocity.y
    );
    const newSpeed = this.baseBallSpeed * speedMultiplier;
    const speedRatio = newSpeed / currentSpeed;
    this.ballVelocity.x *= speedRatio;
    this.ballVelocity.y *= speedRatio;

    // Update hue for color cycling
    this.hue = (this.hue + 30) % 360;
  }

  private resetBall() {
    const { width, height } = this.cameras.main;
    this.ball.x = width / 2;
    this.ball.y = height / 2;
    this.ballVelocity.set(
      Phaser.Math.Between(-1, 1) > 0 ? this.baseBallSpeed : -this.baseBallSpeed,
      Phaser.Math.Between(-this.baseBallSpeed / 2, this.baseBallSpeed / 2)
    );
    this.rallyCount = 0;
    this.rallyText.setText("Rally: 0");
    this.trailPoints = [];
    this.hue = 0;
  }

  private hsvToColor(h: number, s: number, v: number): number {
    const c = v * s;
    const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;

    if (h * 6 < 1) {
      r = c; g = x; b = 0;
    } else if (h * 6 < 2) {
      r = x; g = c; b = 0;
    } else if (h * 6 < 3) {
      r = 0; g = c; b = x;
    } else if (h * 6 < 4) {
      r = 0; g = x; b = c;
    } else if (h * 6 < 5) {
      r = x; g = 0; b = c;
    } else {
      r = c; g = 0; b = x;
    }

    return Phaser.Display.Color.GetColor(
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255)
    );
  }

  private updateTrail() {
    // Add current ball position to trail
    const colorValue = this.hsvToColor(this.hue / 360, 1, 1);

    this.trailPoints.push({
      x: this.ball.x,
      y: this.ball.y,
      alpha: 1,
      color: colorValue,
    });

    // Fade out and remove old trail points
    this.trailPoints = this.trailPoints
      .map((point) => ({
        ...point,
        alpha: Math.max(0, point.alpha - 0.05),
      }))
      .filter((point) => point.alpha > 0);

    // Limit trail length
    if (this.trailPoints.length > 30) {
      this.trailPoints.shift();
    }

    // Draw trail
    this.trailGraphics.clear();
    for (let i = 0; i < this.trailPoints.length - 1; i++) {
      const point = this.trailPoints[i];
      const nextPoint = this.trailPoints[i + 1];
      const size = 5 + (point.alpha * 5);

      this.trailGraphics.lineStyle(size, point.color, point.alpha);
      this.trailGraphics.beginPath();
      this.trailGraphics.moveTo(point.x, point.y);
      this.trailGraphics.lineTo(nextPoint.x, nextPoint.y);
      this.trailGraphics.strokePath();
    }

    // Update ball color based on rally
    const intensity = Math.min(this.rallyCount / 10, 1);
    const ballColor = this.hsvToColor(this.hue / 360, 1, 0.5 + intensity * 0.5);
    this.ball.setFillStyle(ballColor);
  }
}

/**
 * Factory function to create the Pong game config
 * 
 * Usage in App.tsx:
 * import { createPongGame } from './games/pong/pongGame'
 * <ArcadeMachine gameConfig={createPongGame()} />
 */
export const createPongGame = (): GameConfig => {
  const config = createGameConfig(
    "Paddle Master",
    PongGameScene,
    undefined,
    {
      isMobileCompatible: false,
      usesTouchControls: false,
      mobileDescription: "Drag paddles to hit the ball. Longer rallies = faster ball & colorful trails!",
      minWidth: 320,
    }
  );
  config.bannerArt = getAssetPath("/images/games/pong/banner.png");
  config.screenArt = getAssetPath("/images/games/pong/screen.png");
  return config;
};

