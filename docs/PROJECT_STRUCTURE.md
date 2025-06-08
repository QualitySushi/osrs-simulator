# Project Structure

```
osrs-simulator/
├── backend/
│   ├── app/
│   │   ├── calculators/        # DPS calculators for each combat style
│   │   ├── config/             # Shared constants and configuration
│   │   ├── services/           # Service layer wrapping calculators
│   │   ├── repositories/       # Database access wrappers
│   │   ├── database.py         # Low level database service
│   │   ├── models.py           # Pydantic data models
│   │   ├── main.py             # FastAPI entrypoint
│   │   └── testing/            # Unit tests
│   └── requirements.txt        # Backend dependencies
├── frontend/
│   └── src/                    # Next.js application
└── docs/
    └── PROJECT_STRUCTURE.md    # (this file)
```

This layout keeps calculation logic isolated from the API so it can be reused in tests or other interfaces.
