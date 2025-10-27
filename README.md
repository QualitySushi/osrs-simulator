# ScapeLab DPS Calculator

<img src="frontend/public/images/logo_transparent_hd.png" alt="ScapeLab Logo" width="180"/>

A comprehensive **damage-per-second (DPS)** calculator for **Old School RuneScape** with accurate combat formulas, equipment comparison, boss statistics, and modern web UX.

---

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-quickstart">Quickstart</a> •
  <a href="#-project-structure">Project Structure</a> •
  <a href="#-frontend">Frontend</a> •
  <a href="#-backend--database">Backend & Database</a> •
  <a href="#-data-pipeline--sources">Data Pipeline</a> •
  <a href="#-usage-guide">Usage Guide</a> •
  <a href="#-api-reference">API Reference</a> •
  <a href="#-testing--quality">Testing</a> •
  <a href="#-performance--seo">Performance & SEO</a> •
  <a href="#-deployment--devops">Deployment</a> •
  <a href="#-contributing">Contributing</a> •
  <a href="#-license--acknowledgements">License & Acknowledgements</a>
</p>

---

## ✨ Features

- **All Combat Styles**: Melee, Ranged, and Magic (hit chance, max hit, DPS).
- **Equipment Database**: Comprehensive item stats, effects, forms/variants.
- **NPC Encyclopedia**: Defensive stats, weaknesses, immunities, forms.
- **Special Effects**: Passive, set, and monster-specific bonuses.
- **Defense Reduction**: Model the impact of defense-lowering special attacks.
- **Visualizations**: Save loadouts and view DPS / max hit / hit chance graphs.
- **Prayers & Potions**: Full support for common boosts.
- **State Persistence**: Calculator state survives reloads (Zustand `persist`).
- **Search & Caching**: Fast local caching of item/NPC lists with invalidation.
- **Bug Reports → GitHub**: In-app **Report Bug** creates GitHub issues automatically.

> Coming soon / planned:
> - **Boss-only toggle** in NPC selector  
> - **Curated mid/end-game gear presets** (user-deletable)  
> - **Effects page grouping & sorting** (by style, requirements, energy cost)  
> - **SEO & hydration** improvements, sitemaps, OG images  
> - **Optional tick-accurate mode** and spec timeline visualizations

---

## 🚀 Quickstart

### Prerequisites
- **Node.js** 18.x LTS
- **Python** 3.8+
- **npm** or **yarn**
- **pip**
- **Microsoft ODBC Driver for SQL Server** (for backend via `aioodbc`)

### 1) Clone

    git clone https://github.com/QualitySushi/osrs-simulator.git
    cd osrs-simulator

### 2) Frontend

    # Install deps
    npm install

    # Configure environment
    cd frontend
    echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
    # Optional, to wipe persisted state on load:
    # echo "NEXT_PUBLIC_FORCE_CLEAR_CACHE=true" >> .env.local
    cd ..

    # Run dev server
    npm run dev
    # http://localhost:3000

### 3) Backend

    cd backend

    # Create venv
    python -m venv venv
    # Windows: venv\Scripts\activate
    # macOS/Linux:
    source venv/bin/activate

    # Install deps
    pip install -r requirements.txt

    # Set environment (see details below)
    # export SQLAZURECONNSTR_DefaultConnection="Driver=...;Server=...;Database=...;Uid=...;Pwd=...;Encrypt=yes;"

    # Run API
    uvicorn app.main:app --reload
    # http://localhost:8000

---

## 🧭 Project Structure

    osrs-simulator/
    ├─ frontend/                    # Next.js (App Router), Tailwind, shadcn, TS
    │  ├─ public/images/logo_transparent_hd.png
    │  ├─ ...                       # Pages, components, state, queries
    ├─ backend/                     # FastAPI application
    │  ├─ app/
    │  │  ├─ main.py                # App entrypoint, CORS, routes, caching
    │  │  ├─ models/                # Pydantic models
    │  │  ├─ services/              # Calculations, BIS, seeds
    │  │  ├─ repositories/          # Items/NPCs/effects data access
    │  │  └─ config/                # Settings (e.g., CACHE_TTL_SECONDS)
    │  ├─ requirements.txt
    ├─ webscraper/                  # Scrapers & migration tools
    │  └─ runescape-items/
    │     ├─ osrs_item_scraper.py
    │     ├─ extract.py
    │     └─ migrate_sql_to_azure.py
    ├─ docs/                        # Project docs
    │  ├─ ARCHITECTURE.md
    │  ├─ WIREFRAME.md
    │  └─ BEST_IN_SLOT_FINDER.md
    └─ ...

---

## 🖥️ Frontend

- **Framework**: Next.js (App Router)
- **State**: Zustand (+ persist for local storage)
- **Data**: TanStack Query (cache + revalidation)
- **Styling**: Tailwind CSS + shadcn/ui
- **Language**: TypeScript

### Environment

Create `frontend/.env.local`:

    NEXT_PUBLIC_API_URL=http://localhost:8000
    # Optional kill switch for persisted state during testing:
    # NEXT_PUBLIC_FORCE_CLEAR_CACHE=true

### Scripts

    npm run dev        # start dev server
    npm run build      # production build
    npm run start      # run production

---

## 🧰 Backend & Database

- **Framework**: FastAPI
- **DB**: Azure SQL Database (via `aioodbc`)
- **Validation**: Pydantic
- **Caching**: In-memory caches for item/NPC dictionaries
- **Config**: Environment-driven (12-factor)

### Key Environment Variables

- `SQLAZURECONNSTR_DefaultConnection` — Primary connection string  
  **or**:
  - `AZURE_SQL_SERVER`
  - `AZURE_SQL_DATABASE`
  - `AZURE_SQL_USERNAME`
  - `AZURE_SQL_PASSWORD`
- `CACHE_TTL_SECONDS` — Cache TTL for lookups (default 3600)
- `DB_CONNECTION_TIMEOUT` — Seconds (default 30)
- `DB_MAX_RETRIES` — Transient retry attempts (default 3)

### Run

    uvicorn app.main:app --reload
    # API docs: http://localhost:8000/docs

> **Note**: Ensure the Microsoft ODBC driver is installed on the host machine.

---

## 📊 Data Pipeline & Sources

All game data is sourced from the **Old School RuneScape Wiki** using custom scrapers.

### Tools (subset)

- `webscraper/runescape-items/osrs_item_scraper.py` — equipment data
- `webscraper/runescape-items/extract.py` — NPC data
- `webscraper/runescape-items/migrate_sql_to_azure.py` — imports scraped SQLite data into Azure SQL

### Artifacts

- `osrs_all_items.db` — items (SQLite)
- `osrs_npcs.db` — NPCs + npc_forms (SQLite)

### Migration Notes

- The migration script drops/recreates target tables (idempotent).
- Preserves original numeric IDs from SQLite for stable ordering.
- Items table enforces `UNIQUE(name)` to protect against duplicates.

---

## 📘 Usage Guide

1. **Select Combat Style**: Melee / Ranged / Magic.
2. **Set Your Stats**: Enter combat levels and boosts.
3. **Choose Equipment**: Select gear per slot.
4. **Select Target**: Pick an NPC or set custom defense stats.
5. **Apply Modifiers**: Prayers, potions, passive effects.
6. **Special Attacks** (configurable): Energy cost, regen rate, spec speed.
7. **Calculate**: View DPS, max hit, hit chance.
8. **Compare**: Save loadouts and compare side-by-side.

If you encounter a bug or have a suggestion, submit it from the **Report Bug** page. Reports are automatically converted into GitHub issues via a workflow.

---

## 🧮 Combat Formulas (Summary)

### Melee

    Effective Strength = floor((Strength Level × Prayer Bonus) + Style Bonus + 8)
    Max Hit = floor(0.5 + Effective Strength × (Strength Bonus + 64) / 640)

### Ranged

    Effective Ranged = floor((Ranged Level × Prayer Bonus) + Style Bonus + 8)
    Max Hit = floor(0.5 + Effective Ranged × (Ranged Strength + 64) / 640)

### Magic

    Effective Magic = floor((Magic Level × Prayer Bonus) + Style Bonus + 8)
    Max Hit = floor(Base Spell Hit × (1 + Magic Damage Bonus))

### Hit Chance

    If Attack Roll > Defence Roll:
      Hit Chance = 1 - (Defence Roll + 2) / (2 × (Attack Roll + 1))
    Else:
      Hit Chance = Attack Roll / (2 × (Defence Roll + 1))

### DPS

    DPS = Hit Chance × ((Max Hit + 1) / 2) / Attack Speed

### Special Attack Energy

- **Base regen**: 10% every 30s
- **Lightbearer**: doubles regen
- **Surge potion**: × 1.5 regen

Special attacks can be blended mathematically using `special_attack_speed`, `special_energy_cost`, and regen rate to determine expected special uses over time.

---

## 🔌 API Reference (Selected)

### Calculate DPS

**POST** `/calculate/dps`

**Request:**

    {
      "combat_style": "melee",
      "strength_level": 99,
      "attack_level": 99,
      "attack_style_bonus_strength": 3,
      "melee_strength_bonus": 100,
      "melee_attack_bonus": 100,
      "attack_speed": 2.4,
      "target_defence_level": 100,
      "target_defence_bonus": 50,

      "special_damage_multiplier": 1.2,
      "special_accuracy_modifier": 1.0,
      "special_attack_speed": 3.0,
      "special_energy_cost": 50,
      "special_regen_rate": 0.33
    }

**Response:**

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

### Calculate Item Effect

**POST** `/calculate/item-effect`

**Request:**

    {
      "weapon_name": "Twisted bow",
      "target_magic_level": 200
    }

**Response:**

    {
      "accuracy_multiplier": 1.299,
      "damage_multiplier": 1.919,
      "effect_description": "Twisted Bow vs 200 magic: +29.9% accuracy, +91.9% damage"
    }

### Import Seed

**POST** `/import-seed`

**Body:**

    { "seed": "base64encodedstring" }

### Calculate From Seed

**POST** `/calculate/seed`

**Body:**

    { "seed": "base64encodedstring" }

### Best In Slot

**POST** `/bis`

**Body**: DpsParameters  
**Response**: Mapping of gear slot → item details.

### Lists & Search

- **GET** `/npcs` — list NPCs (pagination)
- **GET** `/npc/form/{form_id}` — NPC details by form
- **GET** `/items` — list items (filters + pagination)
- **GET** `/search/npcs?query=...` — search NPCs
- **GET** `/search/items?query=...` — search items

### Performance Tips

- Use `page` and `page_size` for pagination.
- Dictionary endpoints send `Cache-Control: max-age=<CACHE_TTL_SECONDS>`.
- Adjust cache via `CACHE_TTL_SECONDS`.
- Explore interactive docs at `/docs`.

---

## ✅ Testing & Quality

- **Unit tests**: backend calculation modules & selectors.
- **Property tests**: data invariants (e.g., valid rolls, non-negative ranges).
- **E2E tests**: Playwright for core flows (load → pick boss → set gear → compute → share).
- **Data diff CI**: When scrapers update, CI posts an artifact (added/changed/removed entities).

---

## ⚡ Performance & SEO

### Frontend

- Code-splitting heavy selectors; virtualized lists
- TanStack Query caching (long staleTime for static dictionaries)
- Route-level Suspense (where safe)

### SEO

- Next.js `generateMetadata()` per route
- OpenGraph/Twitter meta and image previews (OG image endpoint recommended)
- `sitemap.xml` + `robots.txt` (allow GPTBot & ChatGPT-User)
- JSON-LD (SoftwareApplication, item/NPC detail types as needed)
- Accessibility: keyboard navigation, ARIA, alt text from infobox

### Example robots.txt

    User-agent: *
    Allow: /

    User-agent: GPTBot
    Allow: /

    User-agent: ChatGPT-User
    Allow: /

    Sitemap: https://your-domain/sitemap.xml

---

## 🚢 Deployment & DevOps

- **Frontend**: Next.js → (Azure Static Web Apps / Vercel)
- **Backend**: FastAPI → Azure App Service (or container)
- **DB**: Azure SQL (managed identity supported)

### GitHub Actions

- Frontend workflow injects `NEXT_PUBLIC_API_URL` from `BACKEND_URL` secret  
  (see `.github/workflows/azure-static-web-apps-*.yml`)
- Requires `AZURE_STATIC_WEB_APPS_API_TOKEN_...` to deploy the static app
- Optional job for data diff and Playwright on preview deployments
- Sentry/OTel hooks recommended for tracing and error reporting

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/amazing-thing`
3. Commit: `git commit -m "feat: add amazing thing"`
4. Push: `git push origin feat/amazing-thing`
5. Open a Pull Request

If you hit a bug or have a suggestion, use **Report Bug** inside the app—submissions are automatically converted into GitHub issues.

### Guidelines

- Follow existing code style and architecture
- Add TypeScript types for new features
- Write tests for backend calculations / critical flows
- Document non-trivial formulas and logic
- Update this README and `docs/*` for notable changes

---

## 🔒 License & Acknowledgements

**License**: MIT (see LICENSE)

### Data & Trademarks

- **Wiki content**: © contributors, CC BY-SA — please preserve attribution
- **Old School RuneScape** and **Jagex** are trademarks of Jagex Ltd.
- **ScapeLab** is not affiliated with Jagex Ltd.

### Thanks

- Old School RuneScape Wiki contributors
- The OSRS community for testing & verification
