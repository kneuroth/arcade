import { GameConfig, createGameConfig } from "../../types/game";
import { BaseGameScene } from "../templates/BaseGameScene";
import { hsvToColor } from "../../utils/color";
import { getAssetPath } from "../../utils/assetPath";

// ----------------------------------------------------------------
// Design tokens — neon-outline palette matching the painted shapes
// ----------------------------------------------------------------
const UI_LINE = 0x4de1ff;
const UI_DIM = 0x223244;
const UI_TEXT = "#9fe8ff";
const UI_TEXT_DIM = "#5a7a88";

const DEPTH = { CANVAS: 0, CURSOR: 5, INSTRUCTIONS: 50, PALETTE: 100, PALETTE_TEXT: 101 };

// Palette layout (px)
const PALETTE_H = 96;
const BTN = 44;
const BTN_X0 = 20;
const BTN_STEP = 54;
const SLIDER_X0 = 200;
const SLIDER_STEP = 150;
const SLIDER_W = 120;
const HANDLE_R = 9;
const BTN_W = 64; // export / clear buttons
const BTN_H = 34;
const BTN_PAD = 10;

type BrushKind = "square" | "circle" | "line";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function rectContains(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

// ----------------------------------------------------------------
// A single labelled slider drawn in the neon palette style.
// Owns its label/value Text objects; the track + handle are drawn
// into the shared palette Graphics via draw().
// ----------------------------------------------------------------
class PaletteSlider {
  x = 0;
  y = 0;
  w = SLIDER_W;
  visible = true;
  private min = 0;
  private max = 1;
  private value = 0;
  private labelText: Phaser.GameObjects.Text;
  private valueText: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    label: string,
    private format: (v: number) => string,
  ) {
    const labelStyle = { fontSize: "11px", color: UI_TEXT_DIM, fontFamily: "Arial" };
    const valueStyle = { fontSize: "12px", color: UI_TEXT, fontFamily: "Arial" };
    this.labelText = scene.add
      .text(0, 0, label, labelStyle)
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(DEPTH.PALETTE_TEXT);
    this.valueText = scene.add
      .text(0, 0, "", valueStyle)
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setDepth(DEPTH.PALETTE_TEXT);
  }

  setRange(min: number, max: number): void {
    this.min = min;
    this.max = max;
  }

  setValue(v: number): void {
    this.value = clamp(v, this.min, this.max);
    this.valueText.setText(this.format(this.value));
  }

  getValue(): number {
    return this.value;
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.labelText.setPosition(x, y - 15);
    this.valueText.setPosition(x + this.w, y - 15);
  }

  setVisible(v: boolean): void {
    this.visible = v;
    this.labelText.setVisible(v);
    this.valueText.setVisible(v);
  }

  private t(): number {
    return (this.value - this.min) / (this.max - this.min);
  }

  setFromPointerX(px: number): void {
    const t = clamp((px - this.x) / this.w, 0, 1);
    this.setValue(this.min + t * (this.max - this.min));
  }

  /** Generous hit area so the handle is easy to grab. */
  contains(px: number, py: number): boolean {
    return (
      this.visible &&
      px >= this.x - HANDLE_R &&
      px <= this.x + this.w + HANDLE_R &&
      py >= this.y - 14 &&
      py <= this.y + 14
    );
  }

  draw(g: Phaser.GameObjects.Graphics, accent: number): void {
    if (!this.visible) return;
    const hx = this.x + this.t() * this.w;
    // Track (unfilled + filled portion — filled tinted with the next draw color)
    g.lineStyle(3, UI_DIM, 1);
    g.lineBetween(this.x, this.y, this.x + this.w, this.y);
    g.lineStyle(3, accent, 1);
    g.lineBetween(this.x, this.y, hx, this.y);
    // Handle
    g.fillStyle(0x000000, 1);
    g.fillCircle(hx, this.y, HANDLE_R);
    g.lineStyle(4, accent, 0.2);
    g.strokeCircle(hx, this.y, HANDLE_R);
    g.lineStyle(2.5, accent, 1);
    g.strokeCircle(hx, this.y, HANDLE_R);
  }
}

class AbstractArtScene extends BaseGameScene {
  private canvasTexture!: Phaser.GameObjects.RenderTexture;
  private scratch!: Phaser.GameObjects.Graphics;
  private brushCursor!: Phaser.GameObjects.Graphics;
  private paletteGraphics!: Phaser.GameObjects.Graphics;
  private instructionsText!: Phaser.GameObjects.Text;
  private clearText!: Phaser.GameObjects.Text;
  private exportText!: Phaser.GameObjects.Text;

  // Per-brush persisted settings (density is 0..1; rotate in degrees)
  private settings: Record<BrushKind, { size: number; density: number; rotate: number }> = {
    square: { size: 18, density: 0.55, rotate: 0 },
    circle: { size: 22, density: 0.4, rotate: 0 },
    line: { size: 90, density: 0.5, rotate: 30 },
  };
  private kind: BrushKind = "circle";

  // Sliders
  private sizeSlider!: PaletteSlider;
  private densitySlider!: PaletteSlider;
  private rotateSlider!: PaletteSlider;

  // Palette hit regions
  private brushRects: { kind: BrushKind; rect: Rect }[] = [];
  private clearRect: Rect = { x: 0, y: 0, w: BTN_W, h: BTN_H };
  private exportRect: Rect = { x: 0, y: 0, w: BTN_W, h: BTN_H };
  private paletteTop = 0;

  // Interaction state
  private activeSlider: PaletteSlider | null = null;
  private painting = false;
  private emitAccum = 0;
  private strokeHue = 0;
  private strokeDist = 0;
  private nextHue = 0; // hue the next stroke will start from; previewed in the controls

  constructor() {
    super({ key: "AbstractArt" });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor("#000000");

    // Persistent accumulation layer — sits above the palette, never behind it
    this.canvasTexture = this.add
      .renderTexture(0, 0, width, height - PALETTE_H)
      .setOrigin(0, 0)
      .setDepth(DEPTH.CANVAS);

    // Reusable off-screen graphics used to blit each stamp into the texture
    this.scratch = this.make.graphics({});

    // Live hover preview of the current brush
    this.brushCursor = this.add.graphics().setDepth(DEPTH.CURSOR).setAlpha(0.55);

    // Palette
    this.paletteGraphics = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.PALETTE);
    const btnTextStyle = { fontSize: "12px", color: UI_TEXT, fontFamily: "Arial" };
    this.clearText = this.add
      .text(0, 0, "CLEAR", btnTextStyle)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.PALETTE_TEXT);
    this.exportText = this.add
      .text(0, 0, "EXPORT", btnTextStyle)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.PALETTE_TEXT);

    this.sizeSlider = new PaletteSlider(this, "SIZE", (v) => `${Math.round(v)}`);
    this.densitySlider = new PaletteSlider(this, "DENSITY", (v) => `${Math.round(v * 100)}%`);
    this.rotateSlider = new PaletteSlider(this, "ROTATE", (v) => `${Math.round(v)}°`);

    // Instructions (fade out)
    this.instructionsText = this.add
      .text(width / 2, 24, "Pick a brush below · drag to paint · CLEAR to reset", {
        fontSize: "15px",
        color: "#ffffff",
        fontFamily: "Arial",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.INSTRUCTIONS);
    this.tweens.add({ targets: this.instructionsText, alpha: 0.25, duration: 2000, delay: 5000 });

    this.nextHue = Phaser.Math.Between(0, 359);
    this.layoutPalette(width, height);
    this.selectBrush(this.kind);

    // Input
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.onPointerDown(p));
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => this.onPointerMove(p));
    this.input.on("pointerup", () => this.onPointerUp());
    this.input.on("pointerupoutside", () => this.onPointerUp());
  }

  onResize(width: number, height: number): void {
    if (!this.canvasTexture) return;
    // Resize the accumulation layer (contents reset — acceptable on resize)
    this.canvasTexture.setSize(width, height - PALETTE_H);
    this.instructionsText.setPosition(width / 2, 24);
    this.layoutPalette(width, height);
    this.drawPalette();
  }

  // ----------------------------------------------------------------
  // Palette layout + drawing
  // ----------------------------------------------------------------

  private layoutPalette(width: number, height: number): void {
    this.paletteTop = height - PALETTE_H;
    const btnY = this.paletteTop + (PALETTE_H - BTN) / 2;
    const kinds: BrushKind[] = ["square", "circle", "line"];
    this.brushRects = kinds.map((kind, i) => ({
      kind,
      rect: { x: BTN_X0 + i * BTN_STEP, y: btnY, w: BTN, h: BTN },
    }));

    const sliderY = this.paletteTop + PALETTE_H / 2 + 8;
    this.sizeSlider.setPosition(SLIDER_X0, sliderY);
    this.densitySlider.setPosition(SLIDER_X0 + SLIDER_STEP, sliderY);
    this.rotateSlider.setPosition(SLIDER_X0 + 2 * SLIDER_STEP, sliderY);

    const actionY = this.paletteTop + (PALETTE_H - BTN_H) / 2;
    this.clearRect = { x: width - BTN_W - 20, y: actionY, w: BTN_W, h: BTN_H };
    this.exportRect = { x: this.clearRect.x - BTN_W - BTN_PAD, y: actionY, w: BTN_W, h: BTN_H };
    this.clearText.setPosition(this.clearRect.x + BTN_W / 2, this.clearRect.y + BTN_H / 2);
    this.exportText.setPosition(this.exportRect.x + BTN_W / 2, this.exportRect.y + BTN_H / 2);
  }

  private drawPalette(): void {
    const g = this.paletteGraphics;
    const width = this.cameras.main.width;
    const accent = this.accentColor();
    g.clear();

    // Bar background + top border tinted with the next draw color
    g.fillStyle(0x000000, 0.72);
    g.fillRect(0, this.paletteTop, width, PALETTE_H);
    g.lineStyle(2, accent, 0.6);
    g.lineBetween(0, this.paletteTop, width, this.paletteTop);

    // Brush buttons — selected one glows in the next draw color
    for (const { kind, rect } of this.brushRects) {
      const selected = kind === this.kind;
      if (selected) {
        g.fillStyle(accent, 0.12);
        g.fillRoundedRect(rect.x, rect.y, rect.w, rect.h, 8);
      }
      g.lineStyle(selected ? 2.5 : 1.5, selected ? accent : UI_DIM, 1);
      g.strokeRoundedRect(rect.x, rect.y, rect.w, rect.h, 8);
      this.drawBrushIcon(g, kind, rect.x + rect.w / 2, rect.y + rect.h / 2, selected ? accent : UI_LINE, selected);
    }

    // Sliders
    this.sizeSlider.draw(g, accent);
    this.densitySlider.draw(g, accent);
    this.rotateSlider.draw(g, accent);

    // Action buttons
    g.lineStyle(1.5, UI_LINE, 0.9);
    g.strokeRoundedRect(this.exportRect.x, this.exportRect.y, BTN_W, BTN_H, 6);
    g.strokeRoundedRect(this.clearRect.x, this.clearRect.y, BTN_W, BTN_H, 6);
  }

  private drawBrushIcon(
    g: Phaser.GameObjects.Graphics,
    kind: BrushKind,
    cx: number,
    cy: number,
    color: number,
    selected: boolean,
  ): void {
    g.lineStyle(2, color, selected ? 1 : 0.75);
    if (kind === "square") {
      this.strokeRotatedSquare(g, cx, cy, 20, Math.PI / 7);
    } else if (kind === "circle") {
      g.strokeCircle(cx, cy, 12);
      g.strokeCircle(cx, cy, 7);
    } else {
      const a = Math.PI / 4;
      const dx = Math.cos(a) * 13;
      const dy = Math.sin(a) * 13;
      g.lineBetween(cx - dx, cy - dy, cx + dx, cy + dy);
    }
  }

  private strokeRotatedSquare(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    side: number,
    rot: number,
  ): void {
    const h = side / 2;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const corners = [
      [-h, -h],
      [h, -h],
      [h, h],
      [-h, h],
    ].map(([px, py]) => ({ x: cx + px * cos - py * sin, y: cy + px * sin + py * cos }));
    g.beginPath();
    g.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) g.lineTo(corners[i].x, corners[i].y);
    g.closePath();
    g.strokePath();
  }

  // ----------------------------------------------------------------
  // Brush selection
  // ----------------------------------------------------------------

  private selectBrush(kind: BrushKind): void {
    this.kind = kind;
    const s = this.settings[kind];

    // Size range differs per brush
    const sizeRange: Record<BrushKind, [number, number]> = {
      square: [6, 48],
      circle: [4, 60],
      line: [20, 220],
    };
    this.sizeSlider.setRange(sizeRange[kind][0], sizeRange[kind][1]);
    this.sizeSlider.setValue(s.size);
    this.densitySlider.setRange(0, 1);
    this.densitySlider.setValue(s.density);
    this.rotateSlider.setRange(0, 180);
    this.rotateSlider.setValue(s.rotate);

    // Rotate sub-slider is exclusive to the line brush
    this.rotateSlider.setVisible(kind === "line");

    this.drawPalette();
  }

  /** Push current slider values back into the active brush's settings. */
  private syncSettings(): void {
    const s = this.settings[this.kind];
    s.size = this.sizeSlider.getValue();
    s.density = this.densitySlider.getValue();
    if (this.kind === "line") s.rotate = this.rotateSlider.getValue();
  }

  // ----------------------------------------------------------------
  // Input handling
  // ----------------------------------------------------------------

  private onPointerDown(p: Phaser.Input.Pointer): void {
    if (p.y >= this.paletteTop) {
      this.handlePaletteDown(p.x, p.y);
      return;
    }
    // Begin a paint stroke with the previewed next color
    this.painting = true;
    this.strokeHue = this.nextHue;
    this.strokeDist = 0;
    this.emitAccum = 0;
    this.spray(p.x, p.y);
  }

  private handlePaletteDown(px: number, py: number): void {
    // Brush buttons
    for (const { kind, rect } of this.brushRects) {
      if (rectContains(rect, px, py)) {
        this.selectBrush(kind);
        return;
      }
    }
    // Clear / Export
    if (rectContains(this.clearRect, px, py)) {
      this.canvasTexture.clear();
      return;
    }
    if (rectContains(this.exportRect, px, py)) {
      this.exportImage();
      return;
    }
    // Sliders
    const sliders = [this.sizeSlider, this.densitySlider, this.rotateSlider];
    for (const slider of sliders) {
      if (slider.contains(px, py)) {
        this.activeSlider = slider;
        slider.setFromPointerX(px);
        this.syncSettings();
        this.drawPalette();
        return;
      }
    }
  }

  private onPointerMove(p: Phaser.Input.Pointer): void {
    if (this.activeSlider && p.isDown) {
      this.activeSlider.setFromPointerX(p.x);
      this.syncSettings();
      this.drawPalette();
      return;
    }
  }

  private onPointerUp(): void {
    if (this.painting) {
      // Advance the previewed color so the controls show the next stroke's color
      this.nextHue = (this.nextHue + Phaser.Math.Between(25, 65)) % 360;
      this.drawPalette();
    }
    this.painting = false;
    this.activeSlider = null;
  }

  /** The color the next stroke will start from — shown across the controls. */
  private accentColor(): number {
    return hsvToColor(this.nextHue / 360, 0.85, 0.95);
  }

  /** Snapshot the painted canvas onto a black background and download it as a PNG. */
  private exportImage(): void {
    const w = this.canvasTexture.width;
    const h = this.canvasTexture.height;
    this.canvasTexture.snapshot((snap) => {
      if (!(snap instanceof HTMLImageElement)) return;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(snap, 0, 0);
      const link = document.createElement("a");
      link.download = `abstract-art-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    });
  }

  /** DENSITY drives the spray rate (marks per second) while painting. */
  private emitRate(): number {
    return Phaser.Math.Linear(3, 120, this.densitySlider.getValue());
  }

  /** Uniform random offset inside a disc of the given radius. */
  private discOffset(radius: number): { x: number; y: number } {
    const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const r = Math.sqrt(Phaser.Math.FloatBetween(0, 1)) * radius;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  }

  private currentColor(): number {
    const hue = (this.strokeHue + Math.sin(this.strokeDist * 0.015) * 22 + 360) % 360;
    return hsvToColor(hue / 360, 0.85, 0.95);
  }

  // ----------------------------------------------------------------
  // Spray (bakes one randomized brush mark into the persistent texture)
  // ----------------------------------------------------------------

  private spray(cx: number, cy: number): void {
    const g = this.scratch;
    g.clear();
    const color = this.currentColor();

    if (this.kind === "square") {
      // Tiny squares scattered randomly near the cursor, random orientation
      const size = this.settings.square.size;
      const o = this.discOffset(size * 1.8);
      const s = size * Phaser.Math.FloatBetween(0.55, 1);
      this.glowSquare(g, cx + o.x, cy + o.y, s, Phaser.Math.FloatBetween(0, Math.PI), color);
    } else if (this.kind === "circle") {
      // Concentric rings scattered randomly near the cursor
      const size = this.settings.circle.size;
      const o = this.discOffset(size * 0.7);
      const r = size * Phaser.Math.FloatBetween(0.7, 1);
      this.glowCircles(g, cx + o.x, cy + o.y, r, color);
    } else {
      // Short dashes spread ALONG the rotation axis, jittered perpendicular
      const size = this.settings.line.size;
      const a = (this.settings.line.rotate * Math.PI) / 180;
      const dirx = Math.cos(a);
      const diry = Math.sin(a);
      const along = Phaser.Math.FloatBetween(-size * 0.7, size * 0.7);
      const perp = Phaser.Math.FloatBetween(-size * 0.14, size * 0.14);
      const px = cx + dirx * along - diry * perp;
      const py = cy + diry * along + dirx * perp;
      const half = size * Phaser.Math.FloatBetween(0.12, 0.28);
      this.glowLine(g, px - dirx * half, py - diry * half, px + dirx * half, py + diry * half, color, 2.5);
    }

    this.canvasTexture.draw(g);
  }

  // ----------------------------------------------------------------
  // Neon primitives (soft outer glow pass + bright core pass)
  // ----------------------------------------------------------------

  private glowLine(
    g: Phaser.GameObjects.Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: number,
    coreW: number,
  ): void {
    g.lineStyle(coreW + 5, color, 0.18);
    g.lineBetween(x1, y1, x2, y2);
    g.lineStyle(coreW, color, 1);
    g.lineBetween(x1, y1, x2, y2);
  }

  private glowSquare(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    side: number,
    rot: number,
    color: number,
  ): void {
    g.lineStyle(6, color, 0.16);
    this.strokeRotatedSquare(g, cx, cy, side, rot);
    g.lineStyle(2, color, 1);
    this.strokeRotatedSquare(g, cx, cy, side, rot);
  }

  private glowCircles(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    radius: number,
    color: number,
  ): void {
    const layers = 3;
    for (let layer = 0; layer < layers; layer++) {
      const r = radius * (1 - layer * 0.18);
      if (r <= 1) continue;
      const c = Phaser.Display.Color.ValueToColor(color);
      c.lighten((1 - layer * 0.2) * 25);
      g.lineStyle(5 - layer, c.color, 0.16);
      g.strokeCircle(x, y, r);
      g.lineStyle(3 - layer * 0.6, c.color, 1);
      g.strokeCircle(x, y, r);
    }
    // Inner glow dot
    const inner = Phaser.Display.Color.ValueToColor(color);
    inner.brighten(30);
    g.lineStyle(1, inner.color, 0.6);
    g.strokeCircle(x, y, radius * 0.28);
  }

  // ----------------------------------------------------------------
  // Hover cursor preview
  // ----------------------------------------------------------------

  update(_time: number, delta: number): void {
    const p = this.input.activePointer;
    const over =
      p.x >= 0 && p.x <= this.cameras.main.width && p.y >= 0 && p.y < this.paletteTop;

    // Continuous spray while painting over the canvas
    if (this.painting && p.isDown && over) {
      this.strokeDist += delta * 0.05;
      this.emitAccum = Math.min(this.emitAccum + this.emitRate() * (delta / 1000), 40);
      while (this.emitAccum >= 1) {
        this.emitAccum -= 1;
        this.spray(p.x, p.y);
      }
    }

    // Hover cursor — previews the brush shape, spray footprint AND next color
    const g = this.brushCursor;
    g.clear();
    if (!over) return;
    const accent = this.accentColor();

    if (this.kind === "square") {
      g.lineStyle(1, accent, 0.35);
      g.strokeCircle(p.x, p.y, this.settings.square.size * 1.8);
      this.glowSquare(g, p.x, p.y, this.settings.square.size, 0, accent);
    } else if (this.kind === "circle") {
      g.lineStyle(1, accent, 0.35);
      g.strokeCircle(p.x, p.y, this.settings.circle.size * 0.7 + this.settings.circle.size);
      g.lineStyle(2, accent, 1);
      g.strokeCircle(p.x, p.y, this.settings.circle.size);
      g.strokeCircle(p.x, p.y, this.settings.circle.size * 0.64);
    } else {
      // The spray axis (hover line) the dashes expand along
      const size = this.settings.line.size;
      const a = (this.settings.line.rotate * Math.PI) / 180;
      const dx = Math.cos(a) * size * 0.7;
      const dy = Math.sin(a) * size * 0.7;
      this.glowLine(g, p.x - dx, p.y - dy, p.x + dx, p.y + dy, accent, 2);
    }
  }
}

export const createFractalGame = (): GameConfig => {
  const config = createGameConfig("Abstract Art Creator", AbstractArtScene);
  config.screenArt = getAssetPath("/images/games/fractal/screen.png");
  return config;
};
