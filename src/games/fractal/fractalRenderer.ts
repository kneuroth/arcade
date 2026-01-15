/**
 * Fractal rendering utilities for Mandelbrot and Julia sets
 */

export type FractalType = 'mandelbrot' | 'julia';

export interface FractalParams {
  type: FractalType;
  cx: number; // Center X
  cy: number; // Center Y
  zoom: number;
  maxIterations: number;
  juliaCx?: number; // For Julia sets
  juliaCy?: number; // For Julia sets
  hueShift: number; // Color hue shift (0-360)
  symmetry: number; // Number of rotational symmetries (1-16)
}

/**
 * Compute escape time for a point in the Mandelbrot set
 * Returns iterations and smooth escape value for coloring
 */
function mandelbrotEscapeTime(
  x: number,
  y: number,
  maxIterations: number
): { iterations: number; smooth: number } {
  let real = 0;
  let imag = 0;
  let iterations = 0;

  while (real * real + imag * imag < 4 && iterations < maxIterations) {
    const temp = real * real - imag * imag + x;
    imag = 2 * real * imag + y;
    real = temp;
    iterations++;
  }

  // Calculate smooth escape value for better coloring
  if (iterations < maxIterations) {
    const modulus = Math.sqrt(real * real + imag * imag);
    const smooth = iterations + 1 - Math.log(Math.log(modulus)) / Math.log(2);
    return { iterations, smooth };
  }

  return { iterations, smooth: iterations };
}

/**
 * Compute escape time for a point in a Julia set
 * Returns iterations and smooth escape value for coloring
 */
function juliaEscapeTime(
  x: number,
  y: number,
  juliaCx: number,
  juliaCy: number,
  maxIterations: number
): { iterations: number; smooth: number } {
  let real = x;
  let imag = y;
  let iterations = 0;

  while (real * real + imag * imag < 4 && iterations < maxIterations) {
    const temp = real * real - imag * imag + juliaCx;
    imag = 2 * real * imag + juliaCy;
    real = temp;
    iterations++;
  }

  // Calculate smooth escape value for better coloring
  if (iterations < maxIterations) {
    const modulus = Math.sqrt(real * real + imag * imag);
    const smooth = iterations + 1 - Math.log(Math.log(modulus)) / Math.log(2);
    return { iterations, smooth };
  }

  return { iterations, smooth: iterations };
}

/**
 * Convert iteration count to color with smooth coloring
 */
function iterationToColor(
  iterations: number,
  smooth: number,
  maxIterations: number,
  hueShift: number
): { r: number; g: number; b: number } {
  if (iterations === maxIterations) {
    return { r: 0, g: 0, b: 0 }; // Black for points in the set
  }

  // Smooth coloring using continuous iteration count
  const normalized = (smooth / maxIterations) * 360;
  const hue = (normalized + hueShift) % 360;

  // Convert HSV to RGB with good saturation
  const s = 0.8; // Saturation
  const v = 0.9; // Value (brightness)
  const c = v * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = v - c;

  let r = 0,
    g = 0,
    b = 0;

  if (hue < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (hue < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (hue < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (hue < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  return {
    r: Math.floor((r + m) * 255),
    g: Math.floor((g + m) * 255),
    b: Math.floor((b + m) * 255),
  };
}

/**
 * Render a fractal layer to a canvas
 */
export function renderFractalLayer(
  canvas: HTMLCanvasElement,
  params: FractalParams,
  width: number,
  height: number
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  const centerX = width / 2;
  const centerY = height / 2;
  const scale = 4 / params.zoom; // Scale factor for zoom

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Convert pixel coordinates to complex plane
      const real = (x - centerX) * scale + params.cx;
      const imag = (y - centerY) * scale + params.cy;

      let result: { iterations: number; smooth: number };
      if (params.type === 'mandelbrot') {
        result = mandelbrotEscapeTime(real, imag, params.maxIterations);
      } else {
        result = juliaEscapeTime(
          real,
          imag,
          params.juliaCx || 0,
          params.juliaCy || 0,
          params.maxIterations
        );
      }

      const color = iterationToColor(
        result.iterations,
        result.smooth,
        params.maxIterations,
        params.hueShift
      );

      const index = (y * width + x) * 4;
      data[index] = color.r; // R
      data[index + 1] = color.g; // G
      data[index + 2] = color.b; // B
      data[index + 3] = 255; // A
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply mandala symmetry by rotating a layer
 */
export function applyMandalaSymmetry(
  sourceCanvas: HTMLCanvasElement,
  targetCanvas: HTMLCanvasElement,
  symmetry: number,
  rotation: number
): void {
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

  const centerX = targetCanvas.width / 2;
  const centerY = targetCanvas.height / 2;
  const angleStep = (Math.PI * 2) / symmetry;

  for (let i = 0; i < symmetry; i++) {
    const angle = angleStep * i + (rotation * Math.PI) / 180;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);
    ctx.drawImage(sourceCanvas, -centerX, -centerY);
    ctx.restore();
  }
}

