# Architecture Overview

This document illustrates the high level layout of the project and the flow between components.

## Component Diagram

```mermaid
flowchart LR
    User["Browser"] --> Frontend
    Frontend["Next.js App"] -->|REST API| Backend
    Backend["FastAPI Service"] --> Database[(SQLite)]
    Backend --> Webscraper["Scraper Scripts"]
```

* **Frontend** – Next.js application housed in `frontend/`.
* **Backend** – FastAPI service inside `backend/` that provides calculation endpoints.
* **Database** – SQLite databases populated by scrapers.
* **Webscraper** – Python scripts under `backend/webscraper` used to refresh game data.

## Data Flow

1. Users interact with the React frontend.
2. The frontend communicates with the FastAPI backend.
3. The backend queries the SQLite databases and performs DPS calculations.
4. Results are returned to the frontend for display.

For more information see `docs/DEVELOPER_GUIDE.md`.
