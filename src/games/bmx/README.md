# BMX Hero - Map Building Guide

This guide shows you how to create maps for the BMX Hero game.

## Basic Map Structure

A map consists of:
- **Start position**: Where the bike spawns
- **Finish position**: Where you need to reach
- **Shapes**: Platforms, ramps, and obstacles

## Available Shapes

### Platform (Rectangle)
A flat surface the bike can ride on.

```typescript
{ type: "platform", x: 0, y: 450, width: 300, height: 50 }
```

- `x, y`: Position (top-left corner for platform type)
- `width, height`: Dimensions

### Ramp
A rotated platform for slopes.

```typescript
{ type: "ramp", x: 650, y: 430, width: 200, height: 70, rotation: -20 }
```

- `x, y`: Position (center)
- `width, height`: Dimensions
- `rotation`: Angle in degrees
  - Negative values: Upward slope (ramp up)
  - Positive values: Downward slope (ramp down)
  - Example: `-20` = 20° upward, `20` = 20° downward

## Example Map

```typescript
private createMyMap(): GameMap {
  return {
    name: "My Level",
    startX: 100,      // Bike spawn X position
    startY: 400,      // Bike spawn Y position
    finishX: 2000,    // Finish zone X position
    finishY: 300,     // Finish zone Y position
    shapes: [
      // Starting platform
      { type: "platform", x: 0, y: 450, width: 300, height: 50 },
      // Gap
      // Next platform
      { type: "platform", x: 400, y: 450, width: 200, height: 50 },
      // Ramp up
      { type: "ramp", x: 650, y: 430, width: 200, height: 70, rotation: -20 },
      // High platform
      { type: "platform", x: 900, y: 300, width: 300, height: 50 },
      // Finish platform
      { type: "platform", x: 1800, y: 300, width: 100, height: 50 },
    ],
  };
}
```

## Map Builder Utilities

Use the utilities in `mapBuilder.ts` for easier map creation:

```typescript
import { platform, ramp, createMap } from "./mapBuilder";

const map = createMap({
  name: "Easy Run",
  startX: 100,
  startY: 400,
  finishX: 2000,
  finishY: 400,
  shapes: [
    platform(0, 450, 300, 50),
    platform(400, 450, 200, 50),
    ramp(650, 430, 200, 70, -20),
    platform(900, 300, 300, 50),
  ]
});
```

## Tips

1. **Y Coordinates**: Lower Y values = higher on screen (inverted Y-axis)
2. **Platform Height**: Standard is 50px
3. **Gaps**: Leave space between platforms to create challenges
4. **Ramp Angles**: Keep between -45° and 45° for playability
5. **Camera**: The camera follows the bike, so design maps horizontally
6. **Testing**: Test your maps to ensure both wheels can stay on platforms

## Game Rules

- Both wheels must stay in contact with the ground
- If either wheel loses contact, you fail
- Use ramps strategically to jump gaps
- Control your speed with Up/Down arrows
- Tilt with Left/Right arrows to maintain balance

