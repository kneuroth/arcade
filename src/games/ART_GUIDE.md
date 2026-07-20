# Arcade Machine Art Guide

This guide provides specifications for game art assets used in arcade machines.

## Image Specifications

### Banner Art

- **Recommended Size**: 600x150px
- **Aspect Ratio**: 4:1 (width:height)
- **Format**: PNG, JPG, or WebP
- **Location**: Top of the arcade machine (marquee area)
- **Usage**: Displayed in the banner area above the screen
- **Notes**:
  - Should be readable at small sizes
  - Keep important text/logo in the center
  - Works well with horizontal layouts

### Screen Art

- **Recommended Size**: 800x450px
- **Aspect Ratio**: 16:9 (width:height)
- **Format**: PNG, JPG, or WebP
- **Location**: Screen area when game is not active
- **Usage**: Preview/teaser image shown before game starts
- **Notes**:
  - Should represent the game visually
  - Can be a screenshot, artwork, or promotional image
  - Will be displayed in the arcade machine screen area

## Usage in Code

```typescript
export const createMyGame = (): GameConfig => {
  const config = createGameConfig("My Game", MyGameScene);
  config.bannerArt = "/images/games/my-game/banner.png";
  config.screenArt = "/images/games/my-game/screen.png";
  return config;
};
```

Or add directly to the GameConfig:

```typescript
const gameConfig: GameConfig = {
  name: "My Game",
  createGame: (container) => {
    /* ... */
  },
  bannerArt: "/images/games/my-game/banner.png",
  screenArt: "/images/games/my-game/screen.png",
};
```

## File Organization

Recommended folder structure:

```
public/
  images/
    games/
      my-game/
        banner.png
        screen.png
```

## Tips

1. **Banner Art**: Keep it simple and recognizable - players will see it at a glance
2. **Screen Art**: Make it engaging - this is the first impression of your game
3. **Optimization**: Compress images for web to keep load times fast
4. **Responsive**: Images will scale automatically, but design for the recommended sizes
