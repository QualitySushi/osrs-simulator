"""
Setup Guide for OSRS Special Attack Scraper v3.0

This file provides setup instructions and requirements.
"""

# requirements.txt content:
REQUIREMENTS = """
requests>=2.28.0
beautifulsoup4>=4.11.0
pytest>=7.0.0
lxml>=4.9.0
"""

# File structure that should be created:
FILE_STRUCTURE = """
osrs_scraper/
├── osrs_parser.py          # The parser module (first artifact)
├── test_osrs_parser.py     # Unit tests (second artifact)  
├── osrs_scraper.py         # Main scraper (third artifact)
├── requirements.txt        # Dependencies
└── README.md              # Documentation
"""

def create_requirements_file():
    """Create requirements.txt file"""
    with open('requirements.txt', 'w', encoding='utf-8') as f:
        f.write(REQUIREMENTS.strip())
    print("[OK] Created requirements.txt")

def create_readme():
    """Create README.md with usage instructions"""
    readme_content = """# OSRS Special Attack Scraper v3.0

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
"""
    
    with open('README.md', 'w', encoding='utf-8') as f:
        f.write(readme_content)
    print("[OK] Created README.md")

def validate_setup():
    """Validate that all required files exist"""
    import os
    
    required_files = [
        'osrs_parser.py',
        'osrs_scraper.py', 
        'test_osrs_parser.py',
        'requirements.txt',
        'README.md'
    ]
    
    missing_files = []
    for file in required_files:
        if not os.path.exists(file):
            missing_files.append(file)
    
    if missing_files:
        print(f"[ERROR] Missing files: {', '.join(missing_files)}")
        print("Please create these files using the provided artifacts.")
        return False
    else:
        print("[OK] All required files present")
        return True

def run_setup():
    """Run the complete setup process"""
    print("Setting up OSRS Special Attack Scraper v3.0...")
    print("=" * 50)
    
    # Create requirements and readme
    create_requirements_file()
    create_readme()
    
    # Validate setup
    if validate_setup():
        print("\n[SUCCESS] Setup complete!")
        print("\nNext steps:")
        print("1. Install dependencies: pip install -r requirements.txt")
        print("2. Run tests: python -m pytest test_osrs_parser.py -v") 
        print("3. Run scraper: python osrs_scraper.py")
    else:
        print("\n[WARNING] Setup incomplete. Please create missing files.")

if __name__ == "__main__":
    run_setup()