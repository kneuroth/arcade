import ArcadeMachine from "./components/ArcadeMachine";
// Example: Import a game and pass it to ArcadeMachine
import { createPongGame } from "./games/pong/pongGame";
import { createGravityGame } from "./games/gravity/gravityGame";

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold text-white text-center mb-8 md:mb-12 drop-shadow-lg">
          🕹️ Arcade
        </h1>
        <div className="flex flex-wrap justify-center gap-6 md:gap-8">
          {/* Pass gameConfig prop to add a Phaser game */}
          <ArcadeMachine gameConfig={createPongGame()} />
          <ArcadeMachine gameConfig={createGravityGame()} />
        </div>
      </div>
    </div>
  );
}

export default App;
