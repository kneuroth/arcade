import { Scene } from "phaser";
import { GameConfig, createGameConfig } from "../../types/game";

interface ExpandingShape {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  color: number;
  hue: number;
  rotation: number;
  rotationSpeed: number;
  sides: number; // For polygon shapes
  age: number;
  graphics: Phaser.GameObjects.Graphics;
}

class AbstractArtScene extends Scene {
  private shapes: ExpandingShape[] = [];
  private instructionsText!: Phaser.GameObjects.Text;
  private baseHue: number = 0;
  private isDragging: boolean = false;
  private dragShape: ExpandingShape | null = null;
  private lastTrailSpawn: number = 0;
  private readonly TRAIL_SPAWN_INTERVAL = 200; // ms between trail shapes (5 per second)
  private baseHueForDrag: number = 0; // Track the base hue for the current drag

  constructor() {
    super({ key: "AbstractArt" });
  }

  create() {
    const { width, height } = this.cameras.main;

    // Set dark background
    this.cameras.main.setBackgroundColor("#000000");

    // Instructions
    this.instructionsText = this.add.text(width / 2, height - 40, "Drag to create colorful patterns", {
      fontSize: "18px",
      color: "#ffffff",
      fontFamily: "Arial",
    });
    this.instructionsText.setOrigin(0.5);
    this.instructionsText.setScrollFactor(0, 0);
    this.instructionsText.setDepth(1000);

    // Fade out instructions after 5 seconds
    this.tweens.add({
      targets: this.instructionsText,
      alpha: 0.3,
      duration: 2000,
      delay: 5000,
    });

    // Drag handlers
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.startDrag(pointer.x, pointer.y);
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging && pointer.isDown) {
        this.updateDrag(pointer.x, pointer.y);
      }
    });

    this.input.on("pointerup", () => {
      this.endDrag();
    });

    this.input.on("pointerupoutside", () => {
      this.endDrag();
    });
  }

  private startDrag(x: number, y: number): void {
    this.isDragging = true;
    this.lastTrailSpawn = Date.now();

    // Create a random shape that follows the drag
    const { width } = this.cameras.main;
    const normalizedX = x / width;

    // Random properties for the drag shape
    const sides = Phaser.Math.Between(3, 10);
    const maxRadius = Phaser.Math.Between(80, 150);
    const speed = 0; // Doesn't expand, just follows
    const rotationSpeed = (Phaser.Math.FloatBetween(-0.05, 0.05));

    // Initial color - pick a base hue and stay within that color range
    this.baseHue = (this.baseHue + Phaser.Math.Between(20, 60)) % 360;
    this.baseHueForDrag = this.baseHue; // Store the base hue for this drag
    const hue = (this.baseHue + normalizedX * 60) % 360;
    const color = this.hsvToColor(hue / 360, 0.8, 0.9);

    // Create graphics object
    const graphics = this.add.graphics();
    graphics.setDepth(1000);

    this.dragShape = {
      id: `drag_${Date.now()}`,
      x,
      y,
      radius: maxRadius * 0.3, // Start at 30% of max radius
      maxRadius,
      speed,
      color,
      hue,
      rotation: 0,
      rotationSpeed,
      sides,
      age: 0,
      graphics,
    };

    // Fade in animation
    graphics.setAlpha(0);
    this.tweens.add({
      targets: graphics,
      alpha: 1,
      duration: 200,
      ease: "Power2",
    });
  }

  private updateDrag(x: number, y: number): void {
    if (!this.dragShape) return;

    // Update position
    this.dragShape.x = x;
    this.dragShape.y = y;
    // Update age for color animation
    this.dragShape.age += 16; // Approximate 60fps delta

    // Update color based on time - stay within color range
    // Vary hue within a 30-degree range of the base hue
    const hueVariation = Math.sin(this.dragShape.age * 0.01) * 15; // Oscillate within range
    const hue = (this.baseHueForDrag + hueVariation) % 360;
    this.dragShape.hue = hue;
    this.dragShape.color = this.hsvToColor(hue / 360, 0.8, 0.9);

    // Spawn trail shapes - 5 per second, using current shape color
    const now = Date.now();
    this.spawnTrailShape(x, y);
    // if (now - this.lastTrailSpawn >= this.TRAIL_SPAWN_INTERVAL) {

    //   this.lastTrailSpawn = now;
    // }

    // Update rotation
    this.dragShape.rotation += this.dragShape.rotationSpeed;
  }

  private spawnTrailShape(x: number, y: number): void {
    if (!this.dragShape) return;

    // Create a small trail shape
    const trailMaxRadius = Phaser.Math.Between(20, 40); // Slightly larger for visibility
    const trailSpeed = Phaser.Math.FloatBetween(0.2, 0.4); // Slower expansion so they persist longer
    const trailRotationSpeed = Phaser.Math.FloatBetween(-0.03, 0.03);

    // Use the current color of the drag shape
    const trailColor = this.dragShape.color;

    // Create graphics object
    const graphics = this.add.graphics();
    graphics.setDepth(500); // Ensure trail is visible but below drag shape (1000)

    const trailShape: ExpandingShape = {
      id: `trail_${Date.now()}_${Math.random()}`,
      x,
      y,
      radius: 5, // Start with visible radius instead of 0
      maxRadius: trailMaxRadius,
      speed: trailSpeed,
      color: trailColor,
      hue: this.dragShape.hue,
      rotation: 0,
      rotationSpeed: trailRotationSpeed,
      sides: 0, // Circles for simplicity
      age: 0,
      graphics,
    };

    this.shapes.push(trailShape);

    // Draw immediately (no fade in needed for trail)
    graphics.setAlpha(1);
    // Draw the initial shape so it's visible right away
    this.drawShape(trailShape);
  }

  private endDrag(): void {
    if (!this.dragShape) return;

    // Fade out and remove the drag shape
    this.tweens.add({
      targets: this.dragShape.graphics,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        if (this.dragShape) {
          this.dragShape.graphics.destroy();
          this.dragShape = null;
        }
      },
    });

    this.isDragging = false;
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

  private drawShape(shape: ExpandingShape): void {
    const { graphics, x, y, radius, sides, rotation, color, age } = shape;

    graphics.clear();

    if (radius <= 0) return;

    // Calculate opacity based on expansion progress (not age)
    const expansionProgress = shape.radius / shape.maxRadius;
    // Keep full opacity until 80% expanded, then fade
    const opacity = expansionProgress < 0.8 ? 1 : Math.max(0, 1 - ((expansionProgress - 0.8) / 0.2) * 0.5);

    // Draw multiple concentric shapes for depth
    const layers = 3;
    for (let layer = 0; layer < layers; layer++) {
      const layerRadius = radius * (1 - layer * 0.15);
      const layerOpacity = opacity * (1 - layer * 0.2);

      if (layerRadius <= 0) continue;

      // Create gradient effect
      const layerColor = Phaser.Display.Color.ValueToColor(color);
      const brightness = 1 - layer * 0.15;
      layerColor.lighten(brightness * 50);

      graphics.lineStyle(3 - layer, layerColor.color, layerOpacity);

      if (sides === 0 || sides >= 50) {
        // Circle
        graphics.strokeCircle(x, y, layerRadius);
      } else {
        // Polygon
        graphics.beginPath();
        const angleStep = (Math.PI * 2) / sides;
        for (let i = 0; i <= sides; i++) {
          const angle = angleStep * i + rotation;
          const px = x + Math.cos(angle) * layerRadius;
          const py = y + Math.sin(angle) * layerRadius;
          if (i === 0) {
            graphics.moveTo(px, py);
          } else {
            graphics.lineTo(px, py);
          }
        }
        graphics.strokePath();
      }
    }

    // Add inner glow effect
    if (radius > 10) {
      const glowColor = Phaser.Display.Color.ValueToColor(color);
      glowColor.brighten(30);
      graphics.lineStyle(1, glowColor.color, opacity * 0.5);
      graphics.strokeCircle(x, y, radius * 0.3);
    }
  }

  update(_time: number, delta: number): void {
    // Update drag shape if dragging
    if (this.isDragging && this.dragShape) {
      // Update rotation
      this.dragShape.rotation += this.dragShape.rotationSpeed * (delta / 16);
      // Update age for color animation (in case updateDrag isn't called)
      this.dragShape.age += delta;
      // Draw the drag shape
      this.drawShape(this.dragShape);
    }

    // Update all trail shapes
    this.shapes.forEach((shape, index) => {
      // Update radius
      shape.radius += shape.speed * (delta / 16); // Normalize to 60fps
      shape.age += delta;

      // Update rotation
      shape.rotation += shape.rotationSpeed * (delta / 16);

      // Draw the shape
      this.drawShape(shape);

      // Remove shapes that have fully expanded
      if (shape.radius >= shape.maxRadius) {
        // Fade out before removing
        this.tweens.add({
          targets: shape.graphics,
          alpha: 0,
          duration: 500,
          onComplete: () => {
            shape.graphics.destroy();
            this.shapes.splice(index, 1);
          },
        });
      }
    });

    // Limit total shapes for performance (increase limit for more visible trails)
    if (this.shapes.length > 200) {
      const oldest = this.shapes.shift();
      if (oldest) {
        oldest.graphics.destroy();
      }
    }
  }
}

export const createFractalGame = (): GameConfig => {
  const config = createGameConfig("Abstract Art Creator", AbstractArtScene);
  return config;
};
