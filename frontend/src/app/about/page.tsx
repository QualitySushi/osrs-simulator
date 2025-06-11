import Link from 'next/link';

export default function AboutPage() {
  return (
    <main id="main" className="container mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold mb-8 text-center">About ScapeLab</h1>
      
      <div className="prose dark:prose-invert max-w-3xl">
        <p className="lead text-center">
          ScapeLab is an open-source DPS calculator and gear optimizer for Old School RuneScape.
          Use it to compare different loadouts and plan for maximum damage against any boss or monster.
        </p>
        
        <h2>How It Works</h2>
        <p>
          The calculator uses the official combat formulas from Old School RuneScape to provide accurate 
          damage-per-second (DPS) calculations. These formulas include:
        </p>
        <ul>
          <li>Effective combat levels based on boosts, prayers, and stances</li>
          <li>Attack roll calculations including equipment bonuses</li>
          <li>Defence roll calculations for monsters</li>
          <li>Hit chance determination using both attack and defence rolls</li>
          <li>Max hit calculations including all applicable bonuses</li>
          <li>Special effect calculations (e.g., Twisted Bow, Tumeken&apos;s Shadow)</li>
        </ul>
        
        <h2>Features</h2>
        <ul>
          <li>Calculate DPS for all three combat styles: Melee, Ranged, and Magic</li>
          <li>Select from a database of bosses with accurate defense stats</li>
          <li>Choose from combat equipment with their respective bonuses</li>
          <li>Compare different setups side-by-side</li>
          <li>Accurate calculations for weapon special effects</li>
        </ul>
        
        <h2>Data Sources</h2>
        <p>
          The data for bosses, monsters, and items is sourced from the 
          <a href="https://oldschool.runescape.wiki/" target="_blank" rel="noopener noreferrer" className="mx-1">
            Old School RuneScape Wiki
          </a>
          via our custom scraper. This ensures that the information used in calculations is as accurate 
          and up-to-date as possible.
        </p>
        
        <h2>Technologies Used</h2>
        <p>This calculator is built with:</p>
        <ul>
          <li>Frontend: Next.js, React, TanStack Query, Zustand, shadcn/ui</li>
          <li>Backend: FastAPI, Python, SQLite</li>
        </ul>

        <h2>Feedback & Contributions</h2>
        <p>
          This project is completely open source. Contributions, bug reports and feature requests are welcome on
          <a
            href="https://github.com/QualitySushi/osrs-simulator"
            target="_blank"
            rel="noopener noreferrer"
            className="mx-1"
          >
            GitHub
          </a>
          .
        </p>

        <p className="mt-6 text-center font-semibold">
          ScapeLab is built by players, for players, and is not affiliated with Jagex Ltd.
        </p>
        
        <div className="mt-8">
          <Link
            href="/"
            className="bg-primary text-primary-foreground hover:bg-primary/90 py-2 px-4 rounded"
          >
            Return Home
          </Link>
        </div>
      </div>
    </main>
  );
}
