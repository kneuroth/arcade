# Kelly's Virtual Arcade

A retro arcade machine simulator with multiple playable mini-games. Built with React, Phaser 3, and TypeScript.

**Live site**: deployed to GitHub Pages at `https://<username>.github.io/arcade/`

---

## Games

| Game | Description |
|------|-------------|
| **Paddle Master** | Pong variant with rally counter, ball speed scaling, and color trails |
| **Gravity Rotator** | Platformer where jumping rotates gravity through four directions — collect all coins to advance |
| **Abstract Art Creator** | Drag to spawn expanding, color-cycling geometric shapes |
| **BMX Hero** | Physics-based stunt bike game *(in development)* |

---

## Development

```bash
npm install      # Install dependencies
npm run dev      # Start dev server with hot reload
npm run build    # Build for production
npm run preview  # Preview the production build locally
```

### Adding a Game

1. Create `src/games/myGame/myGame.ts` extending `Phaser.Scene`
2. Export a config using `createGameConfig()` from `src/types/game.ts`
3. Add banner (600×150px) and screen (800×450px) art to `public/images/games/myGame/`
4. Import and add the config to the games array in `src/App.tsx`

See `src/games/README.md` for a detailed walkthrough.

---

## Deployment

Pushing to `main` or `master` automatically builds and deploys to GitHub Pages via GitHub Actions.

**First-time setup:**
1. Push to GitHub
2. Go to **Settings → Pages** and set source to **GitHub Actions**
3. The workflow will deploy on the next push

If your repo name differs from `arcade`, update `base` in `vite.config.ts` to match.
