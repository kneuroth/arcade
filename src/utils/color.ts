/**
 * Convert HSV color values to a Phaser integer color.
 * @param h - Hue in [0, 1]
 * @param s - Saturation in [0, 1]
 * @param v - Value/brightness in [0, 1]
 * @returns Phaser integer color (0xRRGGBB)
 */
export function hsvToColor(h: number, s: number, v: number): number {
  const c = v * s
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1))
  const m = v - c
  let r = 0, g = 0, b = 0

  if (h * 6 < 1) {
    r = c; g = x; b = 0
  } else if (h * 6 < 2) {
    r = x; g = c; b = 0
  } else if (h * 6 < 3) {
    r = 0; g = c; b = x
  } else if (h * 6 < 4) {
    r = 0; g = x; b = c
  } else if (h * 6 < 5) {
    r = x; g = 0; b = c
  } else {
    r = c; g = 0; b = x
  }

  return Phaser.Display.Color.GetColor(
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  )
}
