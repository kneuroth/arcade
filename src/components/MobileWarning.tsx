import { useState } from "react";

interface MobileWarningProps {
  /**
   * "banner" — a slim, dismissible notice for the top of the arcade page.
   * "screen" — a full notice shown in place of a game when a mobile user
   *            tries to play. Provides an optional "Play anyway" escape hatch.
   */
  variant?: "banner" | "screen";
  /** Called when the user chooses to play anyway (screen variant only). */
  onContinue?: () => void;
}

function MobileWarning({ variant = "banner", onContinue }: MobileWarningProps) {
  const [dismissed, setDismissed] = useState(false);

  if (variant === "banner") {
    if (dismissed) return null;
    return (
      <div className="mb-6 rounded-lg border-2 border-yellow-500/60 bg-yellow-500/10 p-3 text-center text-[10px] leading-relaxed text-yellow-200 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <p className="flex-1">
            🖥️ Heads up — this arcade is built for a computer screen with a
            keyboard &amp; mouse. The games don't play well on phones yet.
          </p>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss notice"
            className="shrink-0 rounded bg-yellow-500/20 px-2 py-1 text-yellow-100 hover:bg-yellow-500/30"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // "screen" variant — shown inside the game area
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-5 p-6 text-center">
      <div className="text-4xl">🖥️</div>
      <p className="text-[11px] leading-relaxed text-yellow-200">
        This game is meant for a computer screen.
      </p>
      <p className="text-[9px] leading-relaxed text-gray-400">
        You can keep browsing, but hop on a desktop or laptop for the real
        experience.
      </p>
      {onContinue && (
        <button
          onClick={onContinue}
          className="mt-2 rounded-lg bg-yellow-600 px-4 py-2 text-[9px] text-white transition-colors hover:bg-yellow-500"
        >
          Play anyway
        </button>
      )}
    </div>
  );
}

export default MobileWarning;
