OSRS DPS Calculator API
An API for calculating damage-per-second (DPS) in Old School RuneScape based on equipment, stats, and target information.
Features

Calculate DPS for all combat styles (melee, ranged, magic)
Access boss data with defense stats for different forms and phases
Look up item data with combat bonuses
Special item effect calculations (Twisted Bow, Tumeken's Shadow, etc.)
RESTful API using FastAPI

Requirements

Python 3.8+
FastAPI
Uvicorn
Pydantic
Azure SQL Database

Installation

Clone the repository


```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API will then be available at `http://localhost:8000`.

### Testing

Run unit tests from the `testing` folder:

```bash
python app/testing/UnitTest.py
```
