# OSRS Special Attack Scraper v3.0

A modular, robust scraper for Old School RuneScape special attack data with comprehensive parsing and testing.

## Features

- **Modular Architecture**: Separate parser module for easy maintenance
- **Robust Parsing**: Precise regex patterns with minimal false positives  
- **Comprehensive Tests**: Unit tests for all parsing components
- **Structured Data**: Uses wiki infoboxes where available
- **Quality Metrics**: Built-in validation and comparison tools

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the scraper:
```bash
python osrs_scraper.py
```

## Usage Options

1. **Update existing data** - Re-parse existing weapons with improved parser
2. **Fresh scrape** - Download and parse all weapons from wiki
3. **Both** - Update existing + add new weapons
4. **Quality tests** - Run validation tests on known weapons
5. **Compare** - Compare parsing quality between old/new versions

## Testing

Run unit tests:
```bash
python -m pytest test_osrs_parser.py -v
```

Run quick integration tests:
```bash
python test_osrs_parser.py
```

## Key Improvements Over Previous Versions

### [FIXED] Major Issues

- **Special Cost**: Now correctly extracts costs like "50%" instead of wrong numbers
- **Damage Modifiers**: Properly handles reductions (Abyssal dagger: 0.85x not 1.25x)
- **Stat Drains**: Accurately detects damage-based vs percentage-based drains
- **Area Effects**: Conservative parsing prevents massive text capture

### [IMPROVED] Architecture  

- **Modular Design**: Parser separated from scraper logic
- **Comprehensive Tests**: 30+ unit tests covering edge cases
- **Structured Data**: Uses wiki infoboxes when available
- **Quality Validation**: Built-in tests and comparison tools

### [IMPROVED] Parsing Accuracy

- **Bandos godsword**: Correctly shows damage-based stat drains
- **Dragon claws**: Shows 4 hits instead of wrong multipliers
- **Abyssal dagger**: Shows 0.85x damage (15% reduced) 
- **Dark bow**: Correctly handles min damage per arrow

## Sample Output

```json
{
  "weapon_name": "Bandos godsword",
  "special_cost": 50,
  "accuracy_multiplier": 2.0,
  "damage_multiplier": 1.21,
  "hit_count": 1,
  "guaranteed_hit": false,
  "special_mechanics": {
    "stat_drains": [
      {
        "type": "damage_based",
        "description": "Drains combat stats equal to damage dealt"
      }
    ]
  }
}
```

## File Structure

- `osrs_parser.py` - Core parsing logic with specialized extractors
- `osrs_scraper.py` - Main scraper that uses the parser  
- `test_osrs_parser.py` - Comprehensive unit tests
- `requirements.txt` - Python dependencies

## Contributing

1. Add new extractor classes to `osrs_parser.py` for new mechanics
2. Add corresponding tests to `test_osrs_parser.py`
3. Run tests to ensure no regressions: `pytest test_osrs_parser.py -v`

## Known Limitations

- Text-based parsing can miss some edge cases
- Wiki formatting changes may require pattern updates
- Some very complex mechanics may need manual review

## Version History

- **v3.0**: Modular architecture, comprehensive tests, improved accuracy
- **v2.0**: Improved pattern matching, reduced false positives  
- **v1.0**: Basic scraping functionality
