OSRS DPS Calculator

A comprehensive damage-per-second calculator for Old School RuneScape with accurate combat formulas, equipment comparison, and boss statistics.


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

    Node.js 20.x or later
    Python 3.8+
    npm or yarn
    pip

Installation
Frontend Setup

bash

# Clone the repository
git clone https://github.com/QualitySushi/osrs-simulator.git
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

Additional documentation can be found in the `docs/` folder:

    docs/ARCHITECTURE.md - High level component diagram
    docs/WIREFRAME.md    - Basic UI wireframe

Technical Documentation
Frontend Architecture

The frontend is built with Next.js and uses:

    Zustand for state management
    TanStack Query for data fetching
    shadcn/ui and Tailwind CSS for styling
    TypeScript for type safety

State Persistence

The calculator remembers your last selected boss, locked gear, and loadout across
page reloads using Zustand's `persist` middleware. Boss and item lists are cached
locally for 12 hours so returning to the app doesn't require refetching all
reference data.

Backend Architecture

The backend is built with FastAPI and uses:

    Azure SQL Database for persistent storage
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

Create a `.env.local` file inside the `frontend` directory:

```bash
cd frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
```

For production, set this to your deployed API URL. The deployment workflows
expect a repository secret named `BACKEND_URL` which will be exposed as
`NEXT_PUBLIC_API_URL` during the frontend build.
Ensure this secret contains the URL of your deployed FastAPI service, for example
`https://scapelab-api-dvawaebtdze3brf0.canadacentral-01.azurewebsites.net`.

When deploying the frontend, the workflow also requires a secret named
`AZURE_STATIC_WEB_APPS_API_TOKEN_YELLOW_STONE_0DAF36A0F` containing the
deployment token for your Azure Static Web App.
Database Setup

The backend now connects directly to an Azure SQL Database. Configure the
connection string using the `SQLAZURECONNSTR_DefaultConnection` environment
variable or provide the individual parameters:

    AZURE_SQL_SERVER
    AZURE_SQL_DATABASE
    AZURE_SQL_USERNAME
    AZURE_SQL_PASSWORD

When running in Azure App Service you can omit the username and password and
authenticate via Managed Identity.

The scraper utilities still produce SQLite databases. Use
`webscraper/runescape-items/migrate_sql_to_azure.py` to import this data into
the Azure SQL instance.

The API also caches boss and item lookups in memory. Set the
`CACHE_TTL_SECONDS` environment variable to control how long (in seconds)
these results remain cached. The default is `3600` seconds. On the first
request the server loads and caches the full boss and item lists, and all
subsequent search requests are served from this in-memory cache so the
database is only queried when a specific record is requested.

Database connections are pooled. Tune pool behaviour with the following
environment variables:

- `DB_POOL_SIZE` – Maximum number of open connections (default `5`).
- `DB_CONNECTION_TIMEOUT` – Connection timeout in seconds (default `30`).
- `DB_MAX_RETRIES` – Number of connection retries for transient failures
  (default `3`).

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

Import Seed
------------

POST `/import-seed`

Request Body:

```json
{
  "seed": "base64encodedstring"
}
```

Calculate DPS from Seed
-----------------------

POST `/calculate/seed`

Request Body:

```json
{
  "seed": "base64encodedstring"
}
```

Best In Slot
------------

POST `/bis`

Request Body: `DpsParameters`

Response: A mapping of gear slot to item details.

List Bosses
-----------

GET `/bosses`

GET `/boss/form/{form_id}` - Retrieve boss details by form identifier

Query Parameters:

- `page` – Page number (default `1`)
- `page_size` – Results per page (default `50`)

Search Endpoints
----------------

GET `/search/bosses` - Search for bosses by name
GET `/search/items` - Search for items by name

Query Parameters:

- `query` – Search term (required)
- `limit` – Maximum results to return. If omitted, all matches are returned.

List Items
----------

GET `/items`

Query Parameters:

- `combat_only` – Only items with combat stats (default `true`)
- `tradeable_only` – Only tradeable items (default `false`)
- `page` – Page number (default `1`)
- `page_size` – Results per page (default `50`)

Performance & API Best Practices
-------------------------------

- Use `page` and `page_size` on `/items` and `/bosses` to paginate responses and minimize payload size.
- Item and boss detail endpoints utilise server-side in-memory caches. Responses include a `Cache-Control` header with a `max-age` matching the `CACHE_TTL_SECONDS` setting.
- Adjust cache duration via the `CACHE_TTL_SECONDS` environment variable when launching the backend.

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

OSRS DPS Calculator is not affiliated with Jagex Ltd. Old School RuneScape and Jagex are trademarks of Jagex Ltd.
