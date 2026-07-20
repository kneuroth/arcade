import { Scene } from "phaser";
import { GameConfig, createGameConfig } from "../../types/game";
import { getAssetPath } from "../../utils/assetPath";

/** A single jewel colorway: gem body/table gradients, matching glow, and trail tones. */
interface GemPalette {
  key: string;
  body: Array<[number, string]>;
  table: Array<[number, string]>;
  glow: [string, string, string];
  trailDeep: { r: number; g: number; b: number };
  trailBright: { r: number; g: number; b: number };
}

/** Muted-but-vivid Art Deco jewel colorways the ball shines through, in order. */
const GEM_PALETTES: GemPalette[] = [
  {
    key: "teal",
    body: [[0, "#0c5049"], [0.5, "#1f9c85"], [1, "#3fae6e"]],
    table: [[0, "#79e6c4"], [1, "#a6f0b6"]],
    glow: ["rgba(74,214,178,0.55)", "rgba(48,168,148,0.28)", "rgba(48,168,148,0)"],
    trailDeep: { r: 0x14, g: 0x74, b: 0x6a },
    trailBright: { r: 0x8f, g: 0xe8, b: 0xa6 },
  },
  {
    key: "blue",
    body: [[0, "#0d3a63"], [0.5, "#1f6fae"], [1, "#3f93d0"]],
    table: [[0, "#79c4e6"], [1, "#a6d6f0"]],
    glow: ["rgba(74,160,214,0.55)", "rgba(48,120,180,0.28)", "rgba(48,120,180,0)"],
    trailDeep: { r: 0x16, g: 0x56, b: 0x86 },
    trailBright: { r: 0x8f, g: 0xc8, b: 0xe8 },
  },
  {
    key: "amber",
    body: [[0, "#6a3410"], [0.5, "#c2761f"], [1, "#d99a3f"]],
    table: [[0, "#f0c479"], [1, "#f5dba6"]],
    glow: ["rgba(224,160,74,0.55)", "rgba(190,124,48,0.28)", "rgba(190,124,48,0)"],
    trailDeep: { r: 0x86, g: 0x54, b: 0x16 },
    trailBright: { r: 0xf0, g: 0xc8, b: 0x8f },
  },
  {
    key: "purple",
    body: [[0, "#3d1350"], [0.5, "#7a2f9c"], [1, "#a04fb5"]],
    table: [[0, "#d079e6"], [1, "#e6a6f0"]],
    glow: ["rgba(180,74,214,0.55)", "rgba(140,48,180,0.28)", "rgba(140,48,180,0)"],
    trailDeep: { r: 0x64, g: 0x16, b: 0x84 },
    trailBright: { r: 0xd0, g: 0x8f, b: 0xe8 },
  },
  {
    key: "rose",
    body: [[0, "#5a1030"], [0.5, "#b02f5a"], [1, "#d04f7a"]],
    table: [[0, "#f079a6"], [1, "#f5a6c0"]],
    glow: ["rgba(224,74,130,0.55)", "rgba(180,48,96,0.28)", "rgba(180,48,96,0)"],
    trailDeep: { r: 0x84, g: 0x16, b: 0x44 },
    trailBright: { r: 0xf0, g: 0x8f, b: 0xb2 },
  },
];

class PongGameScene extends Scene {
  private leftPaddle!: Phaser.GameObjects.Image;
  private rightPaddle!: Phaser.GameObjects.Image;
  private ball!: Phaser.GameObjects.Image;
  private ballGlow!: Phaser.GameObjects.Image;
  private sparkle!: Phaser.GameObjects.Image;
  private colorIndex: number = 0;
  private ballVelocity!: Phaser.Math.Vector2;
  private trailGraphics!: Phaser.GameObjects.Graphics;
  private trailPoints: Array<{ x: number; y: number; alpha: number }> = [];
  private rallyCount: number = 0;
  private rallyText!: Phaser.GameObjects.Text;
  private rallyBox!: Phaser.GameObjects.Graphics; // deco cartouche framing the count
  private activePointers: Map<number, Phaser.GameObjects.Image> = new Map();
  private ballSpeed: number = 300;
  private baseBallSpeed: number = 300;
  private readonly maxVerticalSpeedRatio: number = 0.6; // Max vertical speed as ratio of horizontal speed (prevents too steep angles)
  private readonly bounceRandomness: number = 50; // Random variance added to ball bounce
  // Silver-boy AI (controls the right paddle) — never misses, but sometimes
  // hangs back and makes a dramatic last-second dash to save the ball.
  private robotGfx!: Phaser.GameObjects.Graphics; // antenna + optic eye, redrawn each frame
  private aiEyeGlow!: Phaser.GameObjects.Image; // additive amber bloom for the eye
  private aiDrama: boolean = false; // is the current incoming ball a "clutch save" show?
  private dramaChance: number = 0.1; // ~10% of incoming balls get the last-second dash
  private readonly aiCruiseSpeed: number = 360; // comfortable tracking speed (px/s)
  private readonly aiLoafSpeed: number = 80; // lazy speed while faking a miss (px/s)
  private readonly dramaRushTime: number = 0.42; // seconds before arrival that the dash kicks in

  constructor() {
    super({ key: "PongGame" });
  }

  create() {
    const { width, height } = this.cameras.main;

    // Set background
    this.cameras.main.setBackgroundColor("#0a0a0a");

    // Draw the art deco arena (background layer, behind everything)
    this.drawArena(width, height);

    // Create trail graphics
    this.trailGraphics = this.add.graphics();

    // Create paddles (can move anywhere on their side)
    const paddleWidth = 15;
    const paddleHeight = 80;
    const paddleY = height / 2;

    // Shiny metallic paddle textures (generated once, reused across restarts)
    this.makeMetalTexture("paddleGold", [
      [0, "#3d2c05"],
      [0.14, "#a8791a"],
      [0.34, "#f4d474"],
      [0.5, "#fff4c8"],
      [0.66, "#f4d474"],
      [0.86, "#a8791a"],
      [1, "#3d2c05"],
    ]);
    this.makeMetalTexture(
      "paddleSilver",
      [
        [0, "#33343a"],
        [0.14, "#7f838d"],
        [0.34, "#dfe2ea"],
        [0.5, "#ffffff"],
        [0.66, "#dfe2ea"],
        [0.86, "#7f838d"],
        [1, "#33343a"],
      ],
      true // robot detailing: riveted panel plating
    );

    this.leftPaddle = this.add.image(30, paddleY, "paddleGold");
    this.leftPaddle.setDisplaySize(paddleWidth, paddleHeight);
    this.rightPaddle = this.add.image(width - 30, paddleY, "paddleSilver");
    this.rightPaddle.setDisplaySize(paddleWidth, paddleHeight);

    // Silver-boy AI: retro-futurist robot flair drawn over the right paddle
    this.makeGlowTexture("robotEyeGlow", [
      "rgba(255,176,74,0.7)",
      "rgba(230,140,40,0.3)",
      "rgba(230,140,40,0)",
    ]);
    this.aiEyeGlow = this.add.image(this.rightPaddle.x, this.rightPaddle.y, "robotEyeGlow");
    this.aiEyeGlow.setBlendMode(Phaser.BlendModes.ADD);
    this.aiEyeGlow.setScale(26 / 96);
    this.robotGfx = this.add.graphics();

    // Create ball: a faceted gem with a soft glow that shines through colorways
    this.makeBallTextures();
    const startKey = GEM_PALETTES[this.colorIndex].key;
    this.ballGlow = this.add.image(width / 2, height / 2, `ballGlow_${startKey}`);
    this.ballGlow.setDisplaySize(52, 52);
    this.ballGlow.setBlendMode(Phaser.BlendModes.ADD);
    this.ball = this.add.image(width / 2, height / 2, `ballGem_${startKey}`);
    this.ball.setDisplaySize(26, 26);

    // Sparkle burst used for the "shine" on each color change (hidden until then)
    this.sparkle = this.add.image(width / 2, height / 2, "ballSparkle");
    this.sparkle.setDisplaySize(64, 64);
    this.sparkle.setBlendMode(Phaser.BlendModes.ADD);
    this.sparkle.setVisible(false);

    this.ballVelocity = new Phaser.Math.Vector2(
      Phaser.Math.Between(-1, 1) > 0 ? this.ballSpeed : -this.ballSpeed,
      Phaser.Math.Between(-this.ballSpeed / 2, this.ballSpeed / 2)
    );

    // Rally count — just the number, framed by a Deco cartouche at the top
    this.rallyBox = this.add.graphics();
    // Start with the fallback face; swap to Poiret One once it loads. The
    // families must differ so setFontFamily actually forces a re-render.
    this.rallyText = this.add.text(width / 2, 50, "0", {
      fontSize: "40px",
      color: "#cbb06a",
      fontFamily: "Georgia, serif",
    });
    this.rallyText.setOrigin(0.5);
    this.rallyText.setLetterSpacing(6);
    this.rallyText.setAlpha(0.92);
    this.drawRallyBox();
    // Re-render with the Deco font once Google Fonts has finished loading
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts
        .load('40px "Poiret One"')
        .then(() => {
          this.rallyText.setFontFamily('"Poiret One", Georgia, serif');
          this.drawRallyBox();
        })
        .catch(() => {});
    }

    // Input handlers for both touch and mouse - support multiple pointers
    this.input.on("pointerdown", this.startDrag, this);
    this.input.on("pointermove", this.onDrag, this);
    this.input.on("pointerup", this.stopDrag, this);
    this.input.on("pointerupoutside", this.stopDrag, this);
  }

  /**
   * Draws a symmetric, 1920s Art Deco–inspired arena as the court backdrop:
   * a stepped double frame, corner sunbursts, a central sunburst medallion,
   * and a vertical chain of diamonds replacing the old plain center line.
   */
  private drawArena(width: number, height: number) {
    const g = this.add.graphics();
    const cx = width / 2;
    const cy = height / 2;
    const gold = 0xc2a15a;
    const goldFaint = 0x6d5a30;

    // --- Stepped double frame ---
    g.lineStyle(2, gold, 0.5);
    g.strokeRect(12, 12, width - 24, height - 24);
    g.lineStyle(1, goldFaint, 0.45);
    g.strokeRect(18, 18, width - 36, height - 36);

    // Ziggurat "step" notches at each corner of the inner frame
    const stepCorner = (ox: number, oy: number, sx: number, sy: number) => {
      g.lineStyle(1.5, gold, 0.5);
      const s = 10;
      g.beginPath();
      g.moveTo(ox + sx * s * 3, oy);
      g.lineTo(ox + sx * s * 2, oy);
      g.lineTo(ox + sx * s * 2, oy + sy * s);
      g.lineTo(ox + sx * s, oy + sy * s);
      g.lineTo(ox + sx * s, oy + sy * s * 2);
      g.lineTo(ox, oy + sy * s * 2);
      g.strokePath();
    };
    stepCorner(18, 18, 1, 1);
    stepCorner(width - 18, 18, -1, 1);
    stepCorner(18, height - 18, 1, -1);
    stepCorner(width - 18, height - 18, -1, -1);

    // --- Corner sunburst fans (radiating into the play area) ---
    const cornerFan = (ox: number, oy: number, angStart: number, angEnd: number) => {
      const rays = 7;
      const radius = Math.min(90, width * 0.14);
      g.lineStyle(1, gold, 0.28);
      for (let i = 0; i <= rays; i++) {
        const a = Phaser.Math.Linear(angStart, angEnd, i / rays);
        g.beginPath();
        g.moveTo(ox, oy);
        g.lineTo(ox + Math.cos(a) * radius, oy + Math.sin(a) * radius);
        g.strokePath();
      }
      g.lineStyle(1, goldFaint, 0.35);
      g.beginPath();
      g.arc(ox, oy, radius, angStart, angEnd);
      g.strokePath();
      g.beginPath();
      g.arc(ox, oy, radius * 0.6, angStart, angEnd);
      g.strokePath();
    };
    cornerFan(28, 28, 0, Math.PI / 2);
    cornerFan(width - 28, 28, Math.PI / 2, Math.PI);
    cornerFan(width - 28, height - 28, Math.PI, Math.PI * 1.5);
    cornerFan(28, height - 28, Math.PI * 1.5, Math.PI * 2);

    // --- Central sunburst medallion ---
    const medallionR = Math.min(60, height * 0.16);
    g.lineStyle(1.5, gold, 0.5);
    g.strokeCircle(cx, cy, medallionR);
    g.lineStyle(1, goldFaint, 0.4);
    g.strokeCircle(cx, cy, medallionR - 8);
    const spokes = 24;
    g.lineStyle(1, gold, 0.3);
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * (medallionR - 8), cy + Math.sin(a) * (medallionR - 8));
      g.lineTo(cx + Math.cos(a) * medallionR, cy + Math.sin(a) * medallionR);
      g.strokePath();
    }
    // Inner diamond at the very center
    const id = 16;
    g.lineStyle(1.5, gold, 0.55);
    g.beginPath();
    g.moveTo(cx, cy - id);
    g.lineTo(cx + id, cy);
    g.lineTo(cx, cy + id);
    g.lineTo(cx - id, cy);
    g.closePath();
    g.strokePath();

    // --- Vertical chain of diamonds along the centerline (skips the medallion) ---
    const step = 44;
    const d = 8;
    g.lineStyle(1, gold, 0.4);
    for (let y = 30; y < height - 20; y += step) {
      if (Math.abs(y - cy) < medallionR + 12) continue;
      if (y < 96) continue; // leave room for the rally-count cartouche at the top
      g.beginPath();
      g.moveTo(cx, y - d);
      g.lineTo(cx + d, y);
      g.lineTo(cx, y + d);
      g.lineTo(cx - d, y);
      g.closePath();
      g.strokePath();
    }
  }

  /**
   * Draws the Deco cartouche that frames the rally count. It's a chamfered
   * (octagonal) gold plaque with a double outline and little side lozenges,
   * sized to the current number's width so it grows with the digit count.
   */
  private drawRallyBox() {
    const g = this.rallyBox;
    g.clear();

    const gold = 0xc2a15a;
    const goldFaint = 0x6d5a30;
    const cx = this.rallyText.x;
    const cy = this.rallyText.y;
    // Size by digit count (not exact glyph width) so the box is fixed per
    // magnitude and only grows when a new digit appears (10s, 100s, ...).
    const digits = Math.max(1, this.rallyText.text.length);
    const perDigit = 30; // reserved width per digit slot
    const halfW = (digits * perDigit) / 2 + 18;
    const halfH = 30;

    // Chamfered-rectangle (octagon) path, matching the arena's angular style
    const chamfer = (w: number, h: number, c: number) => {
      g.beginPath();
      g.moveTo(cx - w + c, cy - h);
      g.lineTo(cx + w - c, cy - h);
      g.lineTo(cx + w, cy - h + c);
      g.lineTo(cx + w, cy + h - c);
      g.lineTo(cx + w - c, cy + h);
      g.lineTo(cx - w + c, cy + h);
      g.lineTo(cx - w, cy + h - c);
      g.lineTo(cx - w, cy - h + c);
      g.closePath();
    };

    // Darkened backing so the numeral reads clear of the arena lines behind it
    chamfer(halfW, halfH, 9);
    g.fillStyle(0x0a0a0a, 0.72);
    g.fillPath();

    // Double outline
    chamfer(halfW, halfH, 9);
    g.lineStyle(2, gold, 0.7);
    g.strokePath();
    chamfer(halfW - 4, halfH - 4, 7);
    g.lineStyle(1, goldFaint, 0.55);
    g.strokePath();

    // Little lozenge accents where the plaque meets the centerline chain
    const lz = 5;
    g.lineStyle(1, gold, 0.7);
    for (const sx of [-1, 1]) {
      const px = cx + sx * halfW;
      g.beginPath();
      g.moveTo(px, cy - lz);
      g.lineTo(px + sx * lz * 0.7, cy);
      g.lineTo(px, cy + lz);
      g.lineTo(px - sx * lz * 0.7, cy);
      g.closePath();
      g.strokePath();
    }
  }

  /**
   * Builds a reusable metallic paddle texture: a horizontal gradient across the
   * paddle's width creates a cylindrical sheen (dark edges → bright center),
   * finished with a crisp specular highlight streak and beveled edges.
   */
  private makeMetalTexture(key: string, stops: Array<[number, string]>, robot: boolean = false) {
    if (this.textures.exists(key)) return;

    const w = 24;
    const h = 128;
    const tex = this.textures.createCanvas(key, w, h);
    if (!tex) return;

    const ctx = tex.getContext();

    // Base metallic gradient across the width (left → right)
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    for (const [pos, color] of stops) grad.addColorStop(pos, color);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Bright vertical specular streak near the lit center for extra shine
    ctx.globalCompositeOperation = "lighter";
    const streak = ctx.createLinearGradient(0, 0, w, 0);
    streak.addColorStop(0.42, "rgba(255,255,255,0)");
    streak.addColorStop(0.5, "rgba(255,255,255,0.55)");
    streak.addColorStop(0.58, "rgba(255,255,255,0)");
    ctx.fillStyle = streak;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";

    // Subtle top/bottom shading so the ends read as rounded metal
    const ends = ctx.createLinearGradient(0, 0, 0, h);
    ends.addColorStop(0, "rgba(255,255,255,0.25)");
    ends.addColorStop(0.12, "rgba(255,255,255,0)");
    ends.addColorStop(0.88, "rgba(0,0,0,0)");
    ends.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = ends;
    ctx.fillRect(0, 0, w, h);

    // Robot plating: riveted panel seams for a 1920s machine-age look
    if (robot) {
      for (const y of [30, 64, 98]) {
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(2, y);
        ctx.lineTo(w - 2, y);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.beginPath();
        ctx.moveTo(2, y + 1);
        ctx.lineTo(w - 2, y + 1);
        ctx.stroke();
      }
      const rivet = (x: number, y: number) => {
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(18,20,24,0.55)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x - 0.5, y - 0.5, 0.9, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fill();
      };
      for (const y of [14, 48, 80, 114]) {
        rivet(6, y);
        rivet(w - 6, y);
      }
    }

    tex.refresh();
  }

  /**
   * Builds the ball textures for every jewel colorway in GEM_PALETTES:
   * a faceted Art Deco gem ("ballGem_<key>") and a matching soft radial glow
   * ("ballGlow_<key>"), plus one shared white "shine" sparkle ("ballSparkle").
   */
  private makeBallTextures() {
    for (const p of GEM_PALETTES) {
      this.makeGemTexture(`ballGem_${p.key}`, p.body, p.table);
      this.makeGlowTexture(`ballGlow_${p.key}`, p.glow);
    }
    this.makeSparkleTexture("ballSparkle");
  }

  /** Draws one faceted gem: a slender lozenge with a crown, table facet, and glint. */
  private makeGemTexture(
    key: string,
    bodyStops: Array<[number, string]>,
    tableStops: Array<[number, string]>
  ) {
    if (this.textures.exists(key)) return;
    const size = 64;
    const tex = this.textures.createCanvas(key, size, size);
    if (!tex) return;

    const ctx = tex.getContext();
    const cx = size / 2;
    const cy = size / 2;
    const R = 27;
    const wRatio = 0.72; // slender lozenge, echoing the deco diamonds

    const diamond = (r: number) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * wRatio, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r * wRatio, cy);
      ctx.closePath();
    };

    // Outer body: deep tone at top fading to a lighter tone at the base
    const body = ctx.createLinearGradient(0, cy - R, 0, cy + R);
    for (const [pos, color] of bodyStops) body.addColorStop(pos, color);
    diamond(R);
    ctx.fillStyle = body;
    ctx.fill();

    // Inner "table" facet: brighter highlight
    const ir = R * 0.52;
    const table = ctx.createLinearGradient(0, cy - ir, 0, cy + ir);
    for (const [pos, color] of tableStops) table.addColorStop(pos, color);
    diamond(ir);
    ctx.fillStyle = table;
    ctx.fill();

    // Facet lines from the table corners out to the crown
    const outerPts = [
      [cx, cy - R],
      [cx + R * wRatio, cy],
      [cx, cy + R],
      [cx - R * wRatio, cy],
    ];
    const innerPts = [
      [cx, cy - ir],
      [cx + ir * wRatio, cy],
      [cx, cy + ir],
      [cx - ir * wRatio, cy],
    ];
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(innerPts[i][0], innerPts[i][1]);
      ctx.lineTo(outerPts[i][0], outerPts[i][1]);
      ctx.stroke();
    }

    // Crisp gem outline
    diamond(R);
    ctx.strokeStyle = "rgba(8,20,26,0.7)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Static glint on the upper-left facet
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.22, cy - R * 0.5);
    ctx.lineTo(cx - R * 0.02, cy - R * 0.34);
    ctx.lineTo(cx - R * 0.22, cy - R * 0.16);
    ctx.lineTo(cx - R * 0.34, cy - R * 0.34);
    ctx.closePath();
    ctx.fill();

    tex.refresh();
  }

  /** Soft radial glow behind the gem so it reads clearly without looking neon. */
  private makeGlowTexture(key: string, stops: [string, string, string]) {
    if (this.textures.exists(key)) return;
    const size = 96;
    const tex = this.textures.createCanvas(key, size, size);
    if (!tex) return;
    const ctx = tex.getContext();
    const c = size / 2;
    const glow = ctx.createRadialGradient(c, c, 0, c, c, c);
    glow.addColorStop(0, stops[0]);
    glow.addColorStop(0.4, stops[1]);
    glow.addColorStop(1, stops[2]);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }

  /** A white four-point Deco sparkle/twinkle, flashed on each color change. */
  private makeSparkleTexture(key: string) {
    if (this.textures.exists(key)) return;
    const size = 64;
    const tex = this.textures.createCanvas(key, size, size);
    if (!tex) return;
    const ctx = tex.getContext();
    const c = size / 2;

    // Soft core
    const core = ctx.createRadialGradient(c, c, 0, c, c, c * 0.6);
    core.addColorStop(0, "rgba(255,255,255,0.9)");
    core.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, size, size);

    // Four-point star with concave sides
    const outer = 30;
    const inner = 5;
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const ang = (k * Math.PI) / 4;
      const r = k % 2 === 0 ? outer : inner;
      const x = c + Math.cos(ang) * r;
      const y = c + Math.sin(ang) * r;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fill();

    tex.refresh();
  }

  /**
   * The "shine": flashes a sparkle and pops the glow, swapping the gem and
   * glow to the next jewel colorway at the peak of the flash.
   */
  private shineAndChangeColor() {
    this.colorIndex = (this.colorIndex + 1) % GEM_PALETTES.length;
    const key = GEM_PALETTES[this.colorIndex].key;

    // Clear any in-flight flash so rapid hits don't stack tweens
    this.tweens.killTweensOf(this.sparkle);
    this.tweens.killTweensOf(this.ballGlow);

    // Sparkle flash — snaps in bright, then lingers as it grows, spins, and fades
    this.sparkle.setPosition(this.ball.x, this.ball.y);
    this.sparkle.setVisible(true).setAlpha(0).setScale(0.2).setAngle(0);
    this.tweens.add({
      targets: this.sparkle,
      alpha: 1,
      duration: 90,
      ease: "Quad.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: this.sparkle,
          alpha: 0,
          duration: 400,
          ease: "Quad.easeIn",
          onComplete: () => this.sparkle.setVisible(false),
        });
      },
    });
    this.tweens.add({
      targets: this.sparkle,
      scale: 1.2,
      angle: 105,
      duration: 500,
      ease: "Quad.easeOut",
    });

    // Glow pops brighter, then settles
    this.ballGlow.setScale(0.95);
    this.tweens.add({
      targets: this.ballGlow,
      scaleX: 52 / 96,
      scaleY: 52 / 96,
      duration: 440,
      ease: "Quad.easeOut",
    });

    // Swap gem + glow textures at the peak of the flash
    this.time.delayedCall(130, () => {
      this.ball.setTexture(`ballGem_${key}`);
      this.ball.setDisplaySize(26, 26);
      this.ballGlow.setTexture(`ballGlow_${key}`);
      this.ballGlow.setDisplaySize(52, 52);
    });
  }

  // The player only controls the gold (left) paddle; the right paddle is the AI.
  private startDrag(pointer: Phaser.Input.Pointer) {
    this.activePointers.set(pointer.id, this.leftPaddle);
    this.movePaddleToPointer(pointer);
  }

  private onDrag(pointer: Phaser.Input.Pointer) {
    if (!this.activePointers.has(pointer.id)) {
      if (pointer.isDown) {
        this.startDrag(pointer);
      }
      return;
    }
    this.movePaddleToPointer(pointer);
  }

  private movePaddleToPointer(pointer: Phaser.Input.Pointer) {
    const { height } = this.cameras.main;
    const paddleHeight = 80;
    // Player drags anywhere; only the gold paddle's vertical position follows.
    this.leftPaddle.y = Phaser.Math.Clamp(pointer.y, paddleHeight / 2, height - paddleHeight / 2);
  }

  private stopDrag(pointer: Phaser.Input.Pointer) {
    this.activePointers.delete(pointer.id);
  }

  /**
   * Silver-boy AI: it never misses. Normally it tracks the incoming ball
   * comfortably; on a "drama" rally it loafs behind — looking like it won't
   * make it — then dashes at the last second to snatch the ball back.
   *
   * The catch is guaranteed because the dash speed is derived from the time
   * left before the ball arrives, so it always covers the remaining gap.
   */
  private updateAI(dt: number) {
    const { height } = this.cameras.main;
    const halfH = 40; // half the paddle height
    const p = this.rightPaddle;

    const moveToward = (target: number, speed: number) => {
      const diff = target - p.y;
      const step = Phaser.Math.Clamp(diff, -speed * dt, speed * dt);
      p.y = Phaser.Math.Clamp(p.y + step, halfH, height - halfH);
    };

    const vx = this.ballVelocity.x;

    // Ball heading away: drift lazily back toward center.
    if (vx <= 0) {
      moveToward(height / 2, this.aiCruiseSpeed * 0.5);
      return;
    }

    // Ball incoming: work out where and when it reaches the paddle.
    const targetY = Phaser.Math.Clamp(this.ball.y, halfH, height - halfH);
    const distY = Math.abs(targetY - p.y);
    const dxToPaddle = Math.max(0, p.x - this.ball.x);
    const timeToReach = dxToPaddle / vx; // seconds until it crosses the paddle line
    // Minimum speed that still reaches the ball in the time remaining.
    const needed = timeToReach > 0.0001 ? distY / timeToReach : Infinity;

    if (this.aiDrama && timeToReach > this.dramaRushTime) {
      // Play it cool — hang back so it looks like a miss is coming.
      moveToward(targetY, this.aiLoafSpeed);
    } else if (this.aiDrama) {
      // Clutch dash: whatever it takes (with margin) to make the save.
      moveToward(targetY, Math.max(this.aiCruiseSpeed * 2, needed * 1.8));
    } else {
      // Normal, unhurried tracking that still guarantees the return.
      moveToward(targetY, Math.max(this.aiCruiseSpeed, needed * 1.3));
    }
  }

  /** Draws the robot's antenna and tracking optic eye over the right paddle. */
  private updateRobot() {
    const p = this.rightPaddle;
    const g = this.robotGfx;
    g.clear();

    const topY = p.y - 40; // paddle half-height
    const now = this.time.now;

    // Antenna with a blinking amber tip
    g.lineStyle(2, 0xc9cdd6, 0.85);
    g.beginPath();
    g.moveTo(p.x, topY);
    g.lineTo(p.x, topY - 14);
    g.strokePath();
    const blink = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(now / 180));
    g.fillStyle(0xffb44a, blink);
    g.fillCircle(p.x, topY - 16, 2.6);

    // Optic eye near the "head", pupil tracking the ball
    const eyeX = p.x;
    const eyeY = p.y - 14;
    const dx = this.ball.x - eyeX;
    const dy = this.ball.y - eyeY;
    const d = Math.hypot(dx, dy) || 1;
    const pupilX = eyeX + (dx / d) * 1.6;
    const pupilY = eyeY + (dy / d) * 1.6;
    const pulse = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(now / 220));

    g.fillStyle(0x1a1c22, 0.9);
    g.fillCircle(eyeX, eyeY, 5.5);
    g.lineStyle(1, 0xd8dce4, 0.9);
    g.strokeCircle(eyeX, eyeY, 5.5);
    g.fillStyle(0xffab3d, pulse);
    g.fillCircle(eyeX, eyeY, 3.4);
    g.fillStyle(0x201200, 1);
    g.fillCircle(pupilX, pupilY, 1.6);

    // Additive bloom behind the eye, pulsing with it (glow texture is 96px)
    this.aiEyeGlow.setPosition(eyeX, eyeY);
    this.aiEyeGlow.setScale((20 + pulse * 10) / 96);
  }

  update() {
    const { width, height } = this.cameras.main;
    const paddleWidth = 15;
    const paddleHeight = 80;
    const ballRadius = 10;

    // Update ball position
    this.ball.x += this.ballVelocity.x * (this.game.loop.delta / 1000);
    this.ball.y += this.ballVelocity.y * (this.game.loop.delta / 1000);

    // Slow gem spin for a shifting sparkle, and keep the glow centered on it
    this.ball.rotation += 0.03;
    this.ballGlow.setPosition(this.ball.x, this.ball.y);
    if (this.sparkle.visible) {
      this.sparkle.setPosition(this.ball.x, this.ball.y);
    }

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

      this.shineAndChangeColor();
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

    // Drive the AI paddle and its robot flair
    this.updateAI(this.game.loop.delta / 1000);
    this.updateRobot();

    // Update trail and visual effects
    this.updateTrail();
  }

  private handlePaddleHit(
    paddle: Phaser.GameObjects.Image,
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
      // Ball now heads toward the AI — decide if this is a "clutch save" rally
      this.aiDrama = Math.random() < this.dramaChance;
    } else {
      this.ball.x = paddle.x - paddleWidth / 2 - ballRadius;
    }

    this.onPaddleHit();
  }

  private onPaddleHit() {
    this.rallyCount++;
    this.rallyText.setText(`${this.rallyCount}`);
    this.drawRallyBox();

    // Increase ball speed based on rally count (with cap)
    const speedMultiplier = 1 + Math.min(this.rallyCount * 0.05, 1.5);
    const currentSpeed = Math.sqrt(
      this.ballVelocity.x * this.ballVelocity.x + this.ballVelocity.y * this.ballVelocity.y
    );
    const newSpeed = this.baseBallSpeed * speedMultiplier;
    const speedRatio = newSpeed / currentSpeed;
    this.ballVelocity.x *= speedRatio;
    this.ballVelocity.y *= speedRatio;

    // Shine and shift to the next jewel colorway on each paddle hit
    this.shineAndChangeColor();
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
    this.rallyText.setText("0");
    this.drawRallyBox();
    this.trailPoints = [];
    this.ballGlow.setPosition(this.ball.x, this.ball.y);
    this.ballGlow.setScale(52 / 96);
    // If the fresh ball is already heading at the AI, decide drama now.
    this.aiDrama = this.ballVelocity.x > 0 && Math.random() < this.dramaChance;
  }

  /**
   * Draws an Art Deco trail: instead of a smooth rainbow ribbon, the ball
   * leaves a fading chain of geometric lozenges (echoing the arena's diamond
   * motifs) linked by a thin spine, graded from deep teal to bright mint.
   */
  private updateTrail() {
    this.trailPoints.push({ x: this.ball.x, y: this.ball.y, alpha: 1 });

    // Fade out and remove old trail points
    this.trailPoints = this.trailPoints
      .map((point) => ({ ...point, alpha: Math.max(0, point.alpha - 0.045) }))
      .filter((point) => point.alpha > 0);

    // Limit trail length
    if (this.trailPoints.length > 26) {
      this.trailPoints.shift();
    }

    const g = this.trailGraphics;
    g.clear();

    const len = this.trailPoints.length;
    const palette = GEM_PALETTES[this.colorIndex];
    const c1 = palette.trailDeep;
    const c2 = palette.trailBright;
    const lerpColor = (t: number) =>
      (Math.round(c1.r + (c2.r - c1.r) * t) << 16) |
      (Math.round(c1.g + (c2.g - c1.g) * t) << 8) |
      Math.round(c1.b + (c2.b - c1.b) * t);

    // Thin connecting spine between the lozenges
    for (let i = 0; i < len - 1; i++) {
      const p = this.trailPoints[i];
      const next = this.trailPoints[i + 1];
      const t = len > 1 ? i / (len - 1) : 0;
      g.lineStyle(1, lerpColor(t), p.alpha * 0.5);
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.lineTo(next.x, next.y);
      g.strokePath();
    }

    // Fading diamond lozenges, larger and brighter nearer the ball
    for (let i = 0; i < len; i++) {
      const p = this.trailPoints[i];
      const t = len > 1 ? i / (len - 1) : 0;
      const color = lerpColor(t);
      const s = (2.5 + p.alpha * 5) * (0.45 + t * 0.55);
      const w = s * 0.7;

      g.fillStyle(color, p.alpha * 0.22);
      g.lineStyle(1.2, color, p.alpha * 0.7);
      g.beginPath();
      g.moveTo(p.x, p.y - s);
      g.lineTo(p.x + w, p.y);
      g.lineTo(p.x, p.y + s);
      g.lineTo(p.x - w, p.y);
      g.closePath();
      g.fillPath();
      g.strokePath();
    }
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
  const config = createGameConfig("Paddle Master", PongGameScene);
  config.bannerArt = getAssetPath("/images/games/pong/banner.png");
  config.screenArt = getAssetPath("/images/games/pong/screen.png");
  return config;
};

