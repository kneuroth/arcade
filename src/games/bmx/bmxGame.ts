import { Scene } from "phaser";
import { GameConfig, createGameConfig } from "../../types/game";

// Map definition interface
export interface MapShape {
  type: "rectangle" | "platform" | "ramp";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number; // in degrees
}

export interface GameMap {
  name: string;
  startX: number;
  startY: number;
  finishX: number;
  finishY: number;
  shapes: MapShape[];
}

class BMXGameScene extends Scene {
  private wheels: Phaser.Physics.Matter.Sprite[] = [];
  private platforms: Phaser.Physics.Matter.Sprite[] = [];
  private readonly wheelRadius: number = 15;

  constructor() {
    super({ key: "BMXGame" });
  }

  create() {
    const { width, height } = this.cameras.main;

    // Set background
    this.cameras.main.setBackgroundColor("#87CEEB");

    // Create map
    const currentMap = this.createMap1();
    this.buildMap(currentMap);

    // Create wheel graphics (simple circles)
    this.createWheelGraphics();

    // Spawn multiple wheels across the map for testing
    const wheelPositions = [
      { x: 100, y: 410 },   // Start platform (flat)
      { x: 200, y: 410 },   // Start platform (flat)
      { x: 500, y: 410 },   // Platform 2 (flat)
      { x: 750, y: 395 },   // Angled ramp (sloped)
      { x: 850, y: 385 },   // Angled ramp (sloped)
      { x: 1000, y: 250 },  // High platform (flat)
      { x: 1100, y: 250 },  // High platform (flat)
      { x: 1600, y: 360 },  // Lower platform (flat)
    ];

    wheelPositions.forEach((pos) => {
      const wheel = this.createWheel(pos.x, pos.y);
      this.wheels.push(wheel);
    });

    // Instructions
    const instructions = this.add.text(width / 2, 30, "Click to spawn a wheel. Wheels should stay still on flat ground and roll down slopes", {
      fontSize: "16px",
      color: "#ffffff",
      fontFamily: "Arial",
      backgroundColor: "#000000",
      padding: { x: 10, y: 5 },
    });
    instructions.setOrigin(0.5);
    instructions.setScrollFactor(0, 0); // Fix to camera

    // Set camera to follow first wheel
    if (this.wheels.length > 0) {
      this.cameras.main.setBounds(0, 0, width * 3, height);
      this.cameras.main.startFollow(this.wheels[0]);
    }

    // Click to spawn wheel
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      // Convert screen coordinates to world coordinates
      const worldX = pointer.worldX;
      const worldY = pointer.worldY;

      // Spawn a new wheel at click position
      const wheel = this.createWheel(worldX, worldY);
      this.wheels.push(wheel);

      // Update camera to follow the new wheel if it's the first one
      if (this.wheels.length === 1) {
        this.cameras.main.startFollow(wheel);
      }
    });
  }

  private createWheel(x: number, y: number): Phaser.Physics.Matter.Sprite {
    // Create wheel sprite with Matter.js physics
    // Use matter.add.sprite which creates a physics body automatically
    const wheel = this.matter.add.sprite(x, y, "wheel", undefined, {
      friction: 0.8, // High friction for rolling
      frictionAir: 0.01, // Low air resistance
      restitution: 0.2, // Low bounce
      density: 0.001, // Reasonable density for a wheel
      shape: { type: "circle", radius: this.wheelRadius }, // Try to specify circle shape
    } as any); // Type assertion needed as shape might not be in types

    // Get Matter engine from Phaser's matter world
    const matterWorld = this.matter.world as any;
    const Matter = matterWorld?.engine?.Matter || matterWorld?.engine?.default?.Matter;

    if (Matter && wheel.body) {
      const body = wheel.body as any;

      // If body is not circular, try to replace it with a circle
      if (!body.circleRadius && body.vertices) {
        // Create a new circle body using Matter.js
        const circleBody = Matter.Bodies.circle(x, y, this.wheelRadius, {
          friction: 0.8,
          frictionAir: 0.01,
          restitution: 0.2,
          density: 0.001,
        });

        // Replace the body in the world
        const world = matterWorld.localWorld || matterWorld.world;
        if (world) {
          Matter.World.remove(world, body);
          Matter.World.add(world, circleBody);
          // Update sprite's body reference
          wheel.body = circleBody;
        }
      }

      // Prevent physics body from rotating - we'll handle visual rotation manually
      const finalBody = wheel.body as any;
      if (finalBody) {
        finalBody.inertia = Infinity;
      }
    }

    // Store original rotation for visual rotation (separate from physics body rotation)
    (wheel as any).visualRotation = 0;

    return wheel;
  }

  private createWheelGraphics() {
    // Draw wheel texture with spokes to show rotation
    const wheelGraphics = this.add.graphics();
    const centerX = this.wheelRadius;
    const centerY = this.wheelRadius;

    // Draw wheel rim (outer circle)
    wheelGraphics.fillStyle(0x000000);
    wheelGraphics.fillCircle(centerX, centerY, this.wheelRadius);
    wheelGraphics.lineStyle(2, 0x666666);
    wheelGraphics.strokeCircle(centerX, centerY, this.wheelRadius);

    // Draw hub (center circle)
    wheelGraphics.fillStyle(0x333333);
    wheelGraphics.fillCircle(centerX, centerY, this.wheelRadius * 0.3);

    // Draw spokes (radial lines from center to rim)
    const numSpokes = 8;
    wheelGraphics.lineStyle(1.5, 0x888888);
    for (let i = 0; i < numSpokes; i++) {
      const angle = (i / numSpokes) * Math.PI * 2;
      const startX = centerX + Math.cos(angle) * (this.wheelRadius * 0.3);
      const startY = centerY + Math.sin(angle) * (this.wheelRadius * 0.3);
      const endX = centerX + Math.cos(angle) * (this.wheelRadius * 0.9);
      const endY = centerY + Math.sin(angle) * (this.wheelRadius * 0.9);
      wheelGraphics.moveTo(startX, startY);
      wheelGraphics.lineTo(endX, endY);
      wheelGraphics.strokePath();
    }

    wheelGraphics.generateTexture("wheel", this.wheelRadius * 2, this.wheelRadius * 2);
    wheelGraphics.destroy();
  }


  private createMap1(): GameMap {
    return {
      name: "Tutorial",
      startX: 100,
      startY: 410, // Position bike ON the starting platform (platform top is at y=450, so bike at y=440 sits just above it and will settle)
      finishX: 1800,
      finishY: 175, // Position finish zone ON the finish platform (platform top is at y=200)
      shapes: [
        // Starting platform (y=450 is top edge, platform center will be at y=475 after buildMap adds height/2)
        { type: "platform", x: 0, y: 450, width: 300, height: 50 },
        // Gap
        // Platform 2
        { type: "platform", x: 400, y: 450, width: 200, height: 50 },
        // Ramp up
        { type: "ramp", x: 650, y: 430, width: 200, height: 70, rotation: -20 },
        // High platform
        { type: "platform", x: 900, y: 300, width: 300, height: 50 },
        // Drop down
        { type: "ramp", x: 1250, y: 350, width: 200, height: 70, rotation: 20 },
        // Lower platform
        { type: "platform", x: 1500, y: 400, width: 200, height: 50 },
        // Final ramp to finish
        { type: "ramp", x: 1750, y: 250, width: 150, height: 70, rotation: -30 },
        // Finish platform (y=200 means top of platform)
        { type: "platform", x: 1800, y: 200, width: 100, height: 50 },
      ],
    };
  }

  private buildMap(map: GameMap) {
    map.shapes.forEach((shape) => {
      // Calculate platform center position (x, y in map definition are top-left for platforms)
      const centerX = shape.x + shape.width / 2;
      const centerY = shape.y + shape.height / 2;

      // Create platform graphics
      const graphics = this.add.graphics();
      graphics.fillStyle(0x654321);
      graphics.fillRect(0, 0, shape.width, shape.height);
      const key = `${shape.type}_${shape.x}_${shape.y}`;
      graphics.generateTexture(key, shape.width, shape.height);
      graphics.destroy();

      // Create Matter.js static body (ground/platform)
      const rotationRad = shape.rotation ? Phaser.Math.DegToRad(shape.rotation) : 0;

      const platform = this.matter.add.sprite(centerX, centerY, key, undefined, {
        isStatic: true, // Static body - doesn't move
        friction: 0.8,
        restitution: 0.1,
      });

      // Set rotation if it's a ramp - Matter.js handles rotated rectangles properly!
      if (shape.rotation) {
        platform.setRotation(rotationRad);
      }

      this.platforms.push(platform);
    });
  }

  update() {
    // Update visual rotation for wheels based on their velocity
    // Matter.js handles all the physics, we just need to update visual rotation
    this.wheels.forEach((wheel) => {
      this.updateWheelVisuals(wheel);
    });
  }

  private updateWheelVisuals(wheel: Phaser.Physics.Matter.Sprite) {
    if (!wheel.body) return;

    const body = wheel.body as any;
    const velocity = body.velocity || { x: 0, y: 0 };

    // Calculate speed along the ground
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

    // Calculate visual rotation based on speed and wheel radius
    // Rotation per frame = (distance traveled) / radius
    const deltaTime = this.game.loop.delta / 1000;
    const distanceTraveled = speed * deltaTime;
    const rotationDelta = distanceTraveled / this.wheelRadius;

    // Update visual rotation (for display only, doesn't affect physics)
    (wheel as any).visualRotation += rotationDelta;

    // Apply visual rotation to sprite (separate from physics body rotation)
    wheel.setRotation((wheel as any).visualRotation);
  }




}

/**
 * Factory function to create the BMX Hero game config
 */
export const createBMXGame = (): GameConfig => {
  return createGameConfig(
    "BMX Hero",
    BMXGameScene,
    {
      physics: {
        default: "matter",
        matter: {
          gravity: { x: 0, y: 1 }, // Matter.js uses normalized gravity (1 = normal gravity)
          enableSleeping: false, // Keep objects active
          debug: false, // Set to true to see collision boxes
        },
      },
    }
  );
};

