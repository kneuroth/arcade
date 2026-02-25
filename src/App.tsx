import ArcadeMachine from "./components/ArcadeMachine";
import { getAllGames } from "./games/gameRegistry";

const games = getAllGames();

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold text-white text-center mb-8 md:mb-12 drop-shadow-lg">
          Virtual Arcade
        </h1>
        <div className="flex flex-wrap justify-center gap-6 md:gap-8">
          {games.map((g) => (
            <ArcadeMachine key={g.name} gameConfig={g} />
          ))}
          <ArcadeMachine gameName="More Games Coming Soon!" />
        </div>
      </div>
    </div>
  );
}

export default App;
