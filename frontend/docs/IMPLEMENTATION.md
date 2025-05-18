OSRS DPS Calculator - Implementation Summary

This document provides an overview of the implementation of both the frontend and backend for the OSRS DPS Calculator project.
Project Structure

osrs-calculator/
├── backend/               # FastAPI backend
│   ├── app/              # Application code
│   │   ├── calculators/  # DPS calculation modules
│   │   ├── database.py   # Database service
│   │   ├── main.py       # FastAPI application
│   │   └── models.py     # Pydantic models
│   ├── db/               # Database files
│   └── scripts/          # Data scraping scripts
│
└── frontend/             # Next.js frontend
    ├── app/              # Next.js app directory
    ├── components/       # React components
    ├── services/         # API service modules
    └── store/            # State management

Backend Overview

The backend is built with FastAPI and provides REST API endpoints for calculating DPS and retrieving game data:
Endpoints

    DPS Calculation
        POST /calculate/dps - Calculate DPS based on provided parameters
        POST /calculate/item-effect - Calculate special effects for specific items
    Game Data
        GET /bosses - Get a list of all bosses
        GET /boss/{boss_id} - Get details for a specific boss
        GET /items - Get a list of all items with optional filters
        GET /item/{item_id} - Get details for a specific item
        GET /search/bosses - Search for bosses by name
        GET /search/items - Search for items by name

Key Components

    DPS Calculators - Modular calculators for each combat style:
        MeleeCalculator - Handles melee DPS calculations
        RangedCalculator - Handles ranged DPS calculations with special effects like Twisted Bow
        MagicCalculator - Handles magic DPS calculations with special effects like Tumeken's Shadow
        DpsCalculator - Main calculator interface that delegates to the specific combat style calculators
    Database Service - Handles database operations for retrieving boss and item data:
        SQLite database for bosses with their forms and stats
        SQLite database for items with their combat bonuses
        Search functionality for finding bosses and items
    Data Models - Pydantic models for type validation and serialization:
        DpsResult - Result of a DPS calculation
        Boss - Boss data including forms
        Item - Item data including combat stats
        DpsParameters - Parameters for DPS calculation
    Data Collection - Scripts for collecting game data:
        extract.py - Scrapes boss data from the OSRS Wiki
        osrs_item_scraper.py - Scrapes item data from the OSRS Wiki

Frontend Overview

The frontend is built with Next.js and provides a user-friendly interface for calculating DPS:
Key Features

    Combat Style Forms - Forms for inputting combat parameters:
        MeleeForm - Form for melee parameters
        RangedForm - Form for ranged parameters
        MagicForm - Form for magic parameters
    Target Selection - Component for selecting bosses to calculate DPS against:
        BossSelector - Allows selecting bosses and their forms
        Automatically updates defense parameters based on the selected boss
    Equipment Selection - Component for selecting items:
        ItemSelector - Allows selecting items with combat stats
        Automatically updates attack and strength bonuses based on the selected item
    DPS Comparison - Component for comparing different setups:
        DpsComparison - Allows saving and comparing multiple setups
        Displays DPS, max hit, and hit chance for each setup
    State Management - Zustand store for managing calculator state:
        Parameters for each combat style
        Calculation results
        Comparison data
    API Integration - Services for communicating with the backend:
        calculatorApi - Service for DPS calculations
        bossesApi - Service for retrieving boss data
        itemsApi - Service for retrieving item data

Key Algorithms
DPS Calculation

The core DPS calculation follows the Old School RuneScape combat formulas:

    Effective Level Calculation:

    effective_level = floor(base_level * prayer_multiplier) + 8 + stance_bonus

    Attack Roll Calculation:

    attack_roll = floor(effective_level * (equipment_bonus + 64))

    Defence Roll Calculation:

    defence_roll = (target_defence_level + 9) * (target_defence_bonus + 64)

    Hit Chance Calculation:

    if attack_roll > defence_roll:
        hit_chance = 1 - (defence_roll + 2) / (2 * (attack_roll + 1))
    else:
        hit_chance = attack_roll / (2 * (defence_roll + 1))

    Max Hit Calculation (varies by combat style):

    # For melee and ranged
    max_hit = floor((effective_strength * (strength_bonus + 64) / 640) + 0.5)

    # For magic
    max_hit = floor(base_spell_damage * damage_multiplier)

    DPS Calculation:

    average_hit = hit_chance * (max_hit / 2)
    dps = average_hit / attack_speed

Special Item Effects

The calculator also handles special item effects:

    Twisted Bow:
        Scales accuracy and damage based on the target's magic level
        Formula:

        accuracy = 140 + (10*3*Magic/10 - 10)/100 - ((3*Magic/10 - 100)^2)/100%
        damage = 250 + (10*3*Magic/10 - 14)/100 - ((3*Magic/10 - 140)^2)/100%

    Tumeken's Shadow:
        50% accuracy bonus
        Up to 50% additional damage based on magic level

Deployment Considerations
Backend Deployment

    Database Setup:
        Transfer the SQLite database files to the server
        Ensure the database directory is writable by the application
    FastAPI Deployment:
        Use uvicorn or gunicorn for production deployment
        Set up proper CORS settings for the frontend domain
        Configure proper logging

Frontend Deployment

    Environment Variables:
        Set NEXT_PUBLIC_API_URL to the deployed backend URL
    Build and Deployment:
        Build the Next.js application for production
        Deploy to a static hosting service or a Node.js server

Future Enhancements

    Additional Combat Mechanics:
        Account for damage reduction effects
        Support for Slayer helm and Salve amulet effects
        Support for poison and venom damage
    User Experience Improvements:
        Save user presets
        Equipment loadout builder
        DPS graphs for visual comparison
    Data Improvements:
        Regular data updates from the OSRS Wiki
        More detailed item special effect calculations
        Support for NPC-specific mechanics

Conclusion

The OSRS DPS Calculator provides a comprehensive tool for Old School RuneScape players to optimize their combat setups. The modular design allows for easy maintenance and expansion, while the accurate calculations help players make informed decisions about their gear and stats.
