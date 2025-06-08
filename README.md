OSRS DPS Calculator

A comprehensive damage-per-second calculator for Old School RuneScape with accurate combat formulas, equipment comparison, and boss statistics.
🎮 Try it Live | Report Bug | Request Feature

Overview

The OSRS DPS Calculator is a powerful tool for Old School RuneScape players to optimize their combat gear and strategies. By accurately implementing the game's combat formulas, this calculator helps players compare different equipment setups, account for special effects, and calculate expected damage against various bosses.
Key Features

    All Combat Styles: Full support for Melee, Ranged, and Magic calculations
    Equipment Database: Comprehensive database of in-game items with their stats and effects
    Boss Encyclopedia: Detailed information for all bosses including their defensive stats and weaknesses
    Special Effects: Support for passive effects, set effects, and monster-specific bonuses
    Defense Reduction: Calculate the impact of defense-lowering special attacks
    DPS Comparison: Save and compare multiple equipment setups
    Passive Effects: Automatic detection of relevant passive effects for your setup
    Prayer & Potions: Account for all combat boosting prayers and potions

🚀 Getting Started
Prerequisites

    Node.js 18.x or later
    Python 3.8+
    npm or yarn
    pip

Installation
Frontend Setup

bash

# Clone the repository
git clone https://github.com/yourusername/osrs-simulator.git
cd osrs-simulator

# Install dependencies
npm install

# Run development server
npm run dev

The frontend will be available at http://localhost:3000
Backend Setup

bash

# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload

The API will be available at http://localhost:8000
📚 Documentation
Usage Guide

    Select Combat Style: Choose between Melee, Ranged, or Magic
    Set Your Stats: Enter your combat levels and boosts
    Choose Equipment: Select gear for each slot
    Select Target: Pick a boss or enter custom defense stats
    Apply Modifiers: Select prayers, potions, and special attacks
    Calculate: View your expected DPS and other stats
    Compare: Save setups to compare different loadouts

Technical Documentation
Frontend Architecture

The frontend is built with Next.js and uses:

    Zustand for state management
    TanStack Query for data fetching
    shadcn/ui and Tailwind CSS for styling
    TypeScript for type safety

Backend Architecture

The backend is built with FastAPI and uses:

    SQLite for database storage
    Pydantic for data validation
    Custom calculators for combat style-specific logic
    Data scrapers for maintaining up-to-date game information

Combat Formulas

The calculator implements the following OSRS combat formulas:

Melee:

Effective Strength = floor((Strength Level × Prayer Bonus) + Style Bonus + 8)
Max Hit = floor(0.5 + Effective Strength × (Strength Bonus + 64) / 640)

Ranged:

Effective Ranged = floor((Ranged Level × Prayer Bonus) + Style Bonus + 8)
Max Hit = floor(0.5 + Effective Ranged × (Ranged Strength + 64) / 640)

Magic:

Effective Magic = floor((Magic Level × Prayer Bonus) + Style Bonus + 8)
Max Hit = floor(Base Spell Hit × (1 + Magic Damage Bonus))

Hit Chance:

If Attack Roll > Defence Roll:
  Hit Chance = 1 - (Defence Roll + 2) / (2 × (Attack Roll + 1))
Else:
  Hit Chance = Attack Roll / (2 × (Defence Roll + 1))

DPS:

DPS = Hit Chance × ((Max Hit + 1) / 2) / Attack Speed

⚙️ Configuration
Environment Variables

Create a .env.local file in the root directory:

NEXT_PUBLIC_API_URL=http://localhost:8000

For production, set this to your deployed API URL. The deployment workflows
expect a repository secret named `BACKEND_URL` which will be exposed as
`NEXT_PUBLIC_API_URL` during the frontend build.
Database Setup

The application uses two SQLite databases:

    osrs_combat_items.db: Equipment data
    osrs_bosses.db: Boss data

These databases can be generated using the provided scrapers:

bash

python osrs_item_scraper.py
python extract.py

The GitHub workflow `generate-databases.yml` runs these scrapers weekly and
uploads the resulting `.db` files as artifacts.

🔄 API Reference
Calculate DPS

POST /calculate/dps

Request Body:

json

{
  "combat_style": "melee",
  "strength_level": 99,
  "attack_level": 99,
  "attack_style_bonus_strength": 3,
  "melee_strength_bonus": 100,
  "melee_attack_bonus": 100,
  "attack_speed": 2.4,
  "target_defence_level": 100,
  "target_defence_bonus": 50
}

Response:

json

{
  "dps": 8.25,
  "max_hit": 47,
  "hit_chance": 0.84,
  "attack_roll": 16728,
  "defence_roll": 10920,
  "average_hit": 19.8,
  "effective_str": 110,
  "effective_atk": 107
}

Calculate Item Effect

POST /calculate/item-effect

Request Body:

```json
{
  "weapon_name": "Twisted bow",
  "target_magic_level": 200
}
```

Response:

```json
{
  "accuracy_multiplier": 1.299,
  "damage_multiplier": 1.919,
  "effect_description": "Twisted Bow vs 200 magic: +29.9% accuracy, +91.9% damage"
}
```

See the API documentation at /docs for more endpoints.
📊 Data Sources

All game data is sourced from the Old School RuneScape Wiki using custom data scrapers. The scraping tools are included in the repository:

    osrs_item_scraper.py: Scrapes equipment data
    extract.py: Scrapes boss data

🛠️ Contributing

Contributions are welcome! Please follow these steps:

    Fork the repository
    Create a feature branch: git checkout -b feature/amazing-feature
    Commit your changes: git commit -m 'Add amazing feature'
    Push to the branch: git push origin feature/amazing-feature
    Open a Pull Request

For major changes, please open an issue first to discuss what you would like to change.
Development Guidelines

    Follow the existing code style and architecture
    Add appropriate TypeScript types for new features
    Write tests for backend calculations
    Document any complex logic or formulas
    Update the README for significant changes

🔒 License

This project is licensed under the MIT License - see the LICENSE file for details.
👏 Acknowledgements

    Old School RuneScape Wiki for game data
    Jagex for creating Old School RuneScape
    The OSRS community for verifying formulas and mechanics

📝 References

    OSRS Combat Formulas
    DPS Calculator Theory
    Equipment Stats

📧 Contact

Project Link: https://github.com/yourusername/osrs-dps-calculator

OSRS DPS Calculator is not affiliated with Jagex Ltd. Old School RuneScape and Jagex are trademarks of Jagex Ltd.
