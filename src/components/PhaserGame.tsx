import { useEffect, useRef, useState } from "react";
import { Game } from "phaser";
import { GameConfig, GameEvent, GameEventCallback } from "../types/game";

interface PhaserGameProps {
  gameConfig: GameConfig;
  isActive: boolean;
  onGameEvent?: GameEventCallback;
}

function PhaserGame({ gameConfig, isActive, onGameEvent }: PhaserGameProps) {
  const gameRef = useRef<Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isActive || !containerRef.current || isReady) {
      return;
    }

    // Small delay to ensure container is properly sized
    const timer = setTimeout(() => {
      if (!containerRef.current) return;

      try {
        gameRef.current = gameConfig.createGame(containerRef.current);
        setIsReady(true);
      } catch (error) {
        console.error(`Error creating game "${gameConfig.name}":`, error);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [isActive, gameConfig, isReady]);

  // Cleanup when component unmounts or becomes inactive
  useEffect(() => {
    return () => {
      if (gameRef.current) {
        try {
          gameRef.current.destroy(true);
        } catch (error) {
          console.error("Error destroying game:", error);
        }
        gameRef.current = null;
        setIsReady(false);
      }
    };
  }, []);

  // Forward Phaser game events to React via onGameEvent callback
  useEffect(() => {
    if (!gameRef.current || !onGameEvent || !isReady) return

    const handler = (event: GameEvent) => onGameEvent(event)
    gameRef.current.events.on('game-event', handler)
    return () => {
      gameRef.current?.events.off('game-event', handler)
    }
  }, [onGameEvent, isReady])

  // Prevent page scrolling while a game is active (Space, Shift+Space, arrow keys, etc.)
  useEffect(() => {
    if (!isActive) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isActive]);

  // Handle resize
  useEffect(() => {
    if (!gameRef.current || !containerRef.current || !isActive) return;

    const handleResize = () => {
      if (gameRef.current && containerRef.current) {
        const w = containerRef.current.clientWidth
        const h = containerRef.current.clientHeight
        gameRef.current.scale.resize(w, h)
        gameRef.current.scene.getScenes(true).forEach((scene) => {
          if (typeof (scene as any).onResize === 'function') {
            ;(scene as any).onResize(w, h)
          }
        })
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isActive, isReady]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: "400px" }}
    />
  );
}

export default PhaserGame;
