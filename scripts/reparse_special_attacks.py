import json
import argparse
import sys
from pathlib import Path

# Allow importing the parser
sys.path.append(str(Path(__file__).resolve().parent.parent / 'webscraper' / 'runescape-items' / 'special_attacks'))
from osrs_parser import OSRSSpecialAttackParser

DEFAULT_PATH = Path(__file__).resolve().parent.parent / 'webscraper' / 'runescape-items' / 'osrs_special_attacks_v3.json'


def main(json_path=DEFAULT_PATH, write=False):
    parser = OSRSSpecialAttackParser()
    with open(json_path, encoding='utf-8') as f:
        data = json.load(f)

    updated = 0
    for entry in data:
        parsed = parser.parse(entry.get('effect', ''), entry.get('weapon_name', ''))
        parsed_dict = parsed.to_dict()
        for key, value in parsed_dict.items():
            if entry.get(key) != value:
                entry[key] = value
                updated += 1
    if write:
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
    print(f'Updated fields: {updated}')

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description='Reparse special attack data and optionally update the JSON file.')
    ap.add_argument('--json', type=Path, default=DEFAULT_PATH, help='Path to osrs_special_attacks_v3.json')
    ap.add_argument('--write', action='store_true', help='Write updates back to file')
    args = ap.parse_args()
    main(args.json, args.write)
