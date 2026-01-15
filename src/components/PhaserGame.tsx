import { useEffect, useRef, useState } from "react";
import { Game } from "phaser";
import { GameConfig } from "../types/game";

interface PhaserGameProps {
  gameConfig: GameConfig;
  isActive: boolean;
}

function PhaserGame({ gameConfig, isActive }: PhaserGameProps) {
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

  // Handle resize
  useEffect(() => {
    if (!gameRef.current || !containerRef.current || !isActive) return;

    const handleResize = () => {
      if (gameRef.current && containerRef.current) {
        gameRef.current.scale.resize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        );
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
