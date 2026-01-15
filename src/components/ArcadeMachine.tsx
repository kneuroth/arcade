import { useState, useEffect, useRef } from "react";
import PhaserGame from "./PhaserGame";
import { GameConfig } from "../types/game";

interface ArcadeMachineProps {
  gameConfig?: GameConfig;
  gameName?: string;
}

function ArcadeMachine({
  gameConfig,
  gameName = "Game 1",
}: ArcadeMachineProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const screenRef = useRef<HTMLDivElement>(null);

  const handleSelectGame = () => {
    if (gameConfig) {
      setIsExpanded(true);
    }
  };

  const handleClose = () => {
    setIsExpanded(false);
  };

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isExpanded) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isExpanded]);

  if (isExpanded) {
    return (
      <div className="w-full max-w-6xl mx-auto">
        <div className="bg-gray-900 rounded-lg p-4 md:p-6 shadow-2xl">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl md:text-2xl font-bold text-white">
                {gameConfig?.name || gameName}
              </h2>
              {gameConfig?.mobile?.isMobileCompatible && (
                <div className="flex items-center gap-1 bg-green-600/20 text-green-400 text-xs px-2 py-1 rounded">
                  <span>📱</span>
                  <span>Mobile</span>
                </div>
              )}
            </div>
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm md:text-base"
            >
              Close (ESC)
            </button>
          </div>
          <div
            ref={screenRef}
            className="bg-black rounded-lg aspect-video border-4 border-gray-700 overflow-hidden"
            style={{ minHeight: "400px" }}
          >
            {gameConfig ? (
              <PhaserGame gameConfig={gameConfig} isActive={isExpanded} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-gray-400 text-sm md:text-base">
                  No game configured
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm md:max-w-md" onClick={handleSelectGame}>
      <div
        className={`bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 rounded-xl p-3 md:p-5 shadow-2xl transform transition-transform border-2 border-gray-700 ${
          gameConfig ? "hover:scale-105 cursor-pointer" : "opacity-75"
        }`}
      >
        {/* Arcade Machine Top / Banner */}
        <div className="bg-gradient-to-b from-gray-800 to-gray-700 rounded-t-lg aspect-[4/1] mb-3 flex items-center justify-center relative overflow-hidden min-h-[60px] border-2 border-gray-600 shadow-inner">
          {gameConfig?.bannerArt ? (
            <img
              src={gameConfig.bannerArt}
              alt={`${gameConfig.name} banner`}
              className="w-full h-full object-contain p-1"
            />
          ) : (
            <div className="text-gray-300 text-[8px] md:text-xs text-center px-2">
              {gameConfig?.name || gameName || "Coming Soon!"}
            </div>
          )}
          {/* Mobile Compatibility Badge */}
          {gameConfig?.mobile?.isMobileCompatible && (
            <div className="absolute top-1 right-2 md:top-2 md:right-3 bg-green-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 z-20 shadow-lg">
              <span>📱</span>
              <span className="hidden sm:inline">Mobile</span>
            </div>
          )}
        </div>

        {/* Screen Area with Glass Effect */}
        <div className="bg-black rounded-lg aspect-video mb-3 border-4 border-gray-800 flex items-center justify-center relative overflow-hidden min-h-[200px] shadow-inner">
          {/* Screen Content */}
          {gameConfig?.screenArt ? (
            <>
              <img
                src={gameConfig.screenArt}
                alt={`${gameConfig.name} screen`}
                className="w-full h-full object-contain p-2"
              />
              {/* Glass/Reflection Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Top highlight */}
                <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/20 via-white/5 to-transparent"></div>
                {/* Side highlights */}
                <div className="absolute top-0 left-0 bottom-0 w-1/4 bg-gradient-to-r from-white/15 to-transparent"></div>
                <div className="absolute top-0 right-0 bottom-0 w-1/4 bg-gradient-to-l from-white/15 to-transparent"></div>
                {/* Subtle scanline effect */}
                <div
                  className="absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)",
                  }}
                ></div>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20 flex items-center justify-center">
              <p className="text-gray-400 text-xs md:text-sm text-center px-4">
                {gameConfig?.name || gameName || "More Games Coming Soon!"}
              </p>
            </div>
          )}
          {/* Screen bezel inner shadow */}
          <div className="absolute inset-0 border-2 border-black/50 rounded-lg pointer-events-none"></div>
        </div>

        {/* Control Panel */}
        <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg p-3 md:p-4 mb-3 border-2 border-gray-700 shadow-inner">
          <div className="flex justify-center gap-2 md:gap-4 mb-3">
            <div className="w-8 h-8 md:w-12 md:h-12 bg-gradient-to-br from-red-500 to-red-700 rounded-full border-2 border-red-900 shadow-lg relative">
              <div className="absolute inset-1 bg-red-400 rounded-full opacity-50"></div>
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full border-2 border-blue-900 shadow-lg relative">
              <div className="absolute inset-1 bg-blue-400 rounded-full opacity-50"></div>
            </div>
          </div>
        </div>

        {/* Arcade Machine Base */}
        <div className="bg-gradient-to-b from-gray-700 to-gray-800 rounded-b-lg h-4 md:h-6 border-t-2 border-gray-600"></div>
      </div>
    </div>
  );
}

export default ArcadeMachine;
