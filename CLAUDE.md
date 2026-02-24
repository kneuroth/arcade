# CLAUDE.md — Dev Notes for Claude

## Project Overview
**Kelly's Virtual Arcade** — a retro arcade machine UI hosting multiple mini-games. Built with React + Phaser 3 + TypeScript, deployed to GitHub Pages at `/arcade/`.

## Tech Stack
- **Vite 7** — build tool / dev server
- **React 19** — arcade machine shell UI
- **Phaser 3.90** — 2D game engine (all game logic lives here)
- **TypeScript** (strict mode)
- **Tailwind CSS 4** — styling
- **Press Start 2P** — retro font from Google Fonts

## Key File Locations
| File | Purpose |
|------|---------|
| `src/App.tsx` | Grid of ArcadeMachine components, lists all games |
| `src/components/ArcadeMachine.tsx` | Retro cabinet UI (collapsed/expanded states) |
| `src/components/PhaserGame.tsx` | React wrapper that mounts/unmounts Phaser instances |
| `src/types/game.ts` | `GameConfig` interface + `createGameConfig()` helper |
| `src/games/gameRegistry.ts` | Central game list (used for lookups) |
| `src/utils/assetPath.ts` | `getAssetPath()` — resolves public asset URLs with base path |
| `vite.config.ts` | Base path set to `/arcade/` for GitHub Pages |
| `.github/workflows/deploy.yml` | Auto-deploys to GitHub Pages on push to main/master |

## Games
| Game | File | Status |
|------|------|--------|
| Paddle Master (Pong) | `src/games/pong/pongGame.ts` | Playable |
| Gravity Rotator | `src/games/gravity/gravityGame.ts` | Playable |
| Abstract Art Creator | `src/games/fractal/fractalGame.ts` | Playable |
| BMX Hero | `src/games/bmx/bmxGame.ts` | Prototype / WIP |

## Adding a New Game
1. Create `src/games/myGame/myGame.ts` — extend `Phaser.Scene`
2. Export a factory using `createGameConfig()` from `src/types/game.ts`
3. Add banner art (600×150px) and screen art (800×450px) to `public/images/games/myGame/`
4. Import and add the game config to the array in `src/App.tsx`

## Asset Art Specs
- **Banner**: 600×150px (4:1), shown as marquee above screen
- **Screen**: 800×450px (16:9), shown as game preview

## Dev Commands
```bash
npm run dev      # Start dev server (hot reload)
npm run build    # Build for production
npm run preview  # Preview production build locally
```

## Deployment
Push to `master` → GitHub Actions builds → deploys to GitHub Pages automatically. No manual steps needed.

## Patterns & Conventions
- Each game is self-contained in its own directory under `src/games/`
- Use `getAssetPath()` for any public assets to ensure correct base URL in production
- Games are added directly in `src/App.tsx`'s game array — `gameRegistry.ts` is used for lookup utilities
- ESC key closes the expanded game view (handled in `ArcadeMachine.tsx`)
- TypeScript strict mode is on — no implicit any, no unused vars
