"""
Modular OSRS Special Attacks Scraper

This is the main scraper that uses the improved parser module.
Much cleaner and more maintainable than the previous monolithic version.
"""

import requests
import time
import logging
import json
import os
import re
from bs4 import BeautifulSoup
from typing import Dict, Any, Optional, List

# Import our improved parser
from osrs_parser import parse_special_attack

# === Config ===
WIKI_API = "https://oldschool.runescape.wiki/api.php"
HEADERS = {"User-Agent": "osrs-special-attacks-scraper/3.0 (https://example.com; contact@example.com)"}

OUTPUT_JSON = "osrs_special_attacks_v3.json"
RESUME_FILE = "special_attacks_resume.json"

# === Logging ===
logging.basicConfig(
    filename="special_attacks_scraper.log", 
    level=logging.INFO, 
    format="%(asctime)s - %(levelname)s - %(message)s"
)

def log(msg):
    print(msg)
    logging.info(msg)

def clean_text(text):
    """Clean up text by removing extra whitespace and normalizing unicode characters"""
    if not text:
        return text
    
    # Unicode replacements for common symbols
    replacements = {
        "\u22c5": "*", "\u2212": "-", "\u2208": "in", "\u2264": "<=", "\u2265": ">=",
        "\u00b2": "^2", "\u00b3": "^3", "\u2026": "...", "\u00d7": "x", "\u00f7": "/",
        "\u221a": "sqrt", "\u00b0": " degrees", "\u03c0": "pi", "\u2248": "~", "\u2260": "!=",
    }
    
    for unicode_char, ascii_replacement in replacements.items():
        text = text.replace(unicode_char, ascii_replacement)
    
    # Clean up whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def get_weapons_from_category():
    """Get list of weapons with special attacks from the category page"""
    params = {
        "action": "query",
        "list": "categorymembers",
        "cmtitle": "Category:Weapons with Special attacks",
        "cmlimit": "500",
        "format": "json",
    }
    
    try:
        r = requests.get(WIKI_API, params=params, headers=HEADERS)
        r.raise_for_status()
        data = r.json()
        
        weapons = []
        for member in data["query"]["categorymembers"]:
            weapon_name = member["title"]
            # Skip redirects and disambiguation pages
            if "redirect" not in weapon_name.lower() and "disambiguation" not in weapon_name.lower():
                weapons.append(weapon_name)
                log(f"Found weapon with special attack: {weapon_name}")
        
        return weapons
        
    except Exception as e:
        log(f"Failed to fetch weapons from category: {e}")
        return []

def extract_combat_stats_from_html(html_content, item_name):
    """Extract combat stats for a specific item from its wiki page"""
    soup = BeautifulSoup(html_content, "html.parser")
    
    result = {
        "attack_bonuses": {},
        "defence_bonuses": {},
        "other_bonuses": {},
        "combat_styles": [],
        "slot": None
    }
    
    # Try to extract combat stats from infobox-bonuses table
    bonuses_table = soup.find("table", class_="infobox-bonuses")
    if bonuses_table:
        try:
            rows = bonuses_table.find_all("tr")
            
            # Find section headers
            header_indices = {}
            for i, row in enumerate(rows):
                row_text = row.get_text().lower()
                if "attack bonuses" in row_text:
                    header_indices["attack"] = i
                elif "defence bonuses" in row_text:
                    header_indices["defence"] = i
                elif "other bonuses" in row_text:
                    header_indices["other"] = i
            
            # Extract attack bonuses
            if "attack" in header_indices:
                headers_row_idx = header_indices["attack"] + 2
                values_row_idx = headers_row_idx + 1
                
                if headers_row_idx < len(rows) and values_row_idx < len(rows):
                    values = rows[values_row_idx].find_all(["td"])
                    
                    if len(values) >= 5:
                        stats = ["stab", "slash", "crush", "magic", "ranged"]
                        for i, stat in enumerate(stats):
                            if i < len(values):
                                try:
                                    value = int(values[i].get_text(strip=True).replace("+", ""))
                                    result["attack_bonuses"][stat] = value
                                except ValueError:
                                    result["attack_bonuses"][stat] = values[i].get_text(strip=True)
            
            # Extract defence bonuses
            if "defence" in header_indices:
                headers_row_idx = header_indices["defence"] + 2
                values_row_idx = headers_row_idx + 1
                
                if headers_row_idx < len(rows) and values_row_idx < len(rows):
                    values = rows[values_row_idx].find_all(["td"])
                    
                    if len(values) >= 5:
                        stats = ["stab", "slash", "crush", "magic", "ranged"]
                        for i, stat in enumerate(stats):
                            if i < len(values):
                                try:
                                    value = int(values[i].get_text(strip=True).replace("+", ""))
                                    result["defence_bonuses"][stat] = value
                                except ValueError:
                                    result["defence_bonuses"][stat] = values[i].get_text(strip=True)
            
            # Extract other bonuses
            if "other" in header_indices:
                headers_row_idx = header_indices["other"] + 2
                values_row_idx = headers_row_idx + 1
                
                if headers_row_idx < len(rows) and values_row_idx < len(rows):
                    values = rows[values_row_idx].find_all(["td"])
                    
                    if len(values) >= 4:
                        stats = ["strength", "ranged_strength", "magic_damage", "prayer"]
                        for i, stat in enumerate(stats):
                            if i < len(values):
                                value_text = values[i].get_text(strip=True)
                                if "%" in value_text:
                                    result["other_bonuses"][stat] = value_text
                                else:
                                    try:
                                        value = int(value_text.replace("+", ""))
                                        result["other_bonuses"][stat] = value
                                    except ValueError:
                                        result["other_bonuses"][stat] = value_text
        
        except Exception as e:
            log(f"Error extracting combat stats for {item_name}: {e}")
    
    # Extract slot information
    for a_tag in soup.find_all("a"):
        href = a_tag.get("href", "")
        if "2h_slot_table" in href:
            result["slot"] = "2h"
            break
        elif "weapon_slot_table" in href:
            result["slot"] = "mainhand"
            break
    
    return result

def get_item_combat_stats(item_name):
    """Fetch combat stats for a specific item"""
    params = {
        "action": "parse",
        "page": item_name.replace(" ", "_"),
        "prop": "text",
        "format": "json",
    }
    
    try:
        r = requests.get(WIKI_API, params=params, headers=HEADERS)
        r.raise_for_status()
        html = r.json()["parse"]["text"]["*"]
        return extract_combat_stats_from_html(html, item_name)
    except Exception as e:
        log(f"Failed to fetch combat stats for {item_name}: {e}")
        return None

def extract_special_attack_from_weapon_page(weapon_name):
    """Extract special attack info from individual weapon page"""
    params = {
        "action": "parse",
        "page": weapon_name.replace(" ", "_"),
        "prop": "text",
        "format": "json",
    }
    
    try:
        r = requests.get(WIKI_API, params=params, headers=HEADERS)
        r.raise_for_status()
        html = r.json()["parse"]["text"]["*"]
        
        soup = BeautifulSoup(html, "html.parser")
        
        # Extract basic special attack info
        special_attack_info = {
            "weapon_name": weapon_name,
            "effect": "",
            "icon_url": None
        }
        
        # Look for special attack section
        special_section = None
        for heading in soup.find_all(["h2", "h3", "h4"]):
            if "special attack" in heading.get_text().lower():
                special_section = heading
                break
        
        if special_section:
            # Extract effect text from the section
            content = []
            for sibling in special_section.find_next_siblings():
                if sibling.name in ["h2", "h3", "h4"]:
                    break
                if sibling.name in ["p", "ul", "ol", "div"]:
                    content.append(sibling.get_text(separator=" ", strip=True))
            
            effect_text = " ".join(content).strip()
            special_attack_info["effect"] = clean_text(effect_text)
        
        # Extract icon from infobox
        infobox = soup.find("table", class_="infobox")
        if infobox:
            icon_img = infobox.find("img")
            if icon_img:
                src = icon_img.get("src")
                if src:
                    if src.startswith("//"):
                        special_attack_info["icon_url"] = "https:" + src
                    elif src.startswith("/"):
                        special_attack_info["icon_url"] = "https://oldschool.runescape.wiki" + src
                    else:
                        special_attack_info["icon_url"] = src
        
        # If no effect found in dedicated section, try alternative extraction
        if not special_attack_info["effect"]:
            text_content = soup.get_text()
            lines = text_content.split('\n')
            
            for i, line in enumerate(lines):
                if "special attack" in line.lower() and any(char in line for char in ['%', 'damage', 'hit']):
                    context_lines = lines[max(0, i-2):i+3]
                    context = " ".join(context_lines).strip()
                    
                    if len(context) > 20:
                        special_attack_info["effect"] = clean_text(context)
                    break
        
        # Use the improved parser to extract formula data
        if special_attack_info["effect"]:
            parsed_data = parse_special_attack(
                special_attack_info["effect"], 
                weapon_name,
                soup  # Pass soup for structured data extraction
            )
            special_attack_info.update(parsed_data)
        
        return special_attack_info if special_attack_info["effect"] else None
        
    except Exception as e:
        log(f"Failed to extract special attack from {weapon_name}: {e}")
        return None

def extract_special_attacks_data():
    """Main function to extract all special attack data"""
    log("Getting weapons list from category...")
    weapons = get_weapons_from_category()
    
    if not weapons:
        log("No weapons found in category!")
        return []
    
    log(f"Found {len(weapons)} weapons in category")
    special_attacks = []
    
    # Extract special attack info for each weapon
    for i, weapon_name in enumerate(weapons):
        log(f"[{i+1}/{len(weapons)}] Extracting special attack for: {weapon_name}")
        
        special_attack = extract_special_attack_from_weapon_page(weapon_name)
        if special_attack:
            special_attacks.append(special_attack)
            log(f"✅ Found special attack for {weapon_name}")
        else:
            log(f"⚠️ No special attack info found for {weapon_name}")
        
        time.sleep(0.5)  # Rate limiting
    
    return special_attacks

def load_existing_data():
    """Load existing JSON data if it exists"""
    if os.path.exists(OUTPUT_JSON):
        try:
            with open(OUTPUT_JSON, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []
    return []

def save_special_attacks_json(special_attacks):
    """Save all special attacks to JSON file"""
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(special_attacks, f, indent=2, ensure_ascii=False)
    log(f"Saved {len(special_attacks)} special attacks to {OUTPUT_JSON}")

def find_existing_weapon(special_attacks, weapon_name):
    """Find an existing weapon in the list by name"""
    for i, weapon in enumerate(special_attacks):
        if weapon.get("weapon_name") == weapon_name:
            return i
    return -1

def save_resume(index, total_weapons):
    """Save progress for resuming"""
    with open(RESUME_FILE, "w") as f:
        json.dump({"index": index, "total_weapons": total_weapons}, f)

def load_resume():
    """Load resume progress"""
    if os.path.exists(RESUME_FILE):
        try:
            with open(RESUME_FILE, "r") as f:
                data = json.load(f)
                return data.get("index", 0), data.get("total_weapons", 0)
        except (json.JSONDecodeError, FileNotFoundError):
            pass
    return 0, 0

def update_existing_weapons_data():
    """Update existing weapons data with improved parsing"""
    log("=== Updating existing weapons data with improved parsing ===")
    
    # Load existing data
    existing_data = load_existing_data()
    if not existing_data:
        log("No existing data found to update")
        return []
    
    log(f"Loaded {len(existing_data)} existing weapons")
    
    # Re-parse effects for each weapon with improved parser
    for i, weapon in enumerate(existing_data):
        weapon_name = weapon.get('weapon_name', '')
        log(f"[{i+1}/{len(existing_data)}] Re-parsing {weapon_name}")
        
        if weapon.get('effect'):
            # Use the improved parser
            new_data = parse_special_attack(weapon['effect'], weapon_name)
            
            # Update the weapon data
            weapon.update(new_data)
            weapon["last_updated"] = time.strftime("%Y-%m-%d %H:%M:%S") + " (v3 parser)"
    
    # Save updated data
    save_special_attacks_json(existing_data)
    log(f"Updated {len(existing_data)} weapons with improved parsing")
    
    return existing_data

def compare_parsing_quality(old_file_path: str, new_file_path: str):
    """Compare parsing quality between old and new versions"""
    log("=== Comparing Parsing Quality ===")
    
    try:
        with open(old_file_path, 'r') as f:
            old_data = json.load(f)
        with open(new_file_path, 'r') as f:
            new_data = json.load(f)
    except FileNotFoundError as e:
        log(f"Could not load comparison files: {e}")
        return
    
    # Create lookup by weapon name
    old_lookup = {w['weapon_name']: w for w in old_data}
    new_lookup = {w['weapon_name']: w for w in new_data}
    
    improvements = {
        'special_cost_fixed': 0,
        'accuracy_fixed': 0,
        'damage_fixed': 0,
        'mechanics_improved': 0,
        'total_compared': 0
    }
    
    # Compare each weapon
    for weapon_name in set(old_lookup.keys()) & set(new_lookup.keys()):
        old_weapon = old_lookup[weapon_name]
        new_weapon = new_lookup[weapon_name]
        improvements['total_compared'] += 1
        
        # Compare special cost
        old_cost = old_weapon.get('special_cost')
        new_cost = new_weapon.get('special_cost')
        if old_cost != new_cost and new_cost is not None:
            improvements['special_cost_fixed'] += 1
            log(f"  {weapon_name}: Cost {old_cost} → {new_cost}")
        
        # Compare accuracy
        old_acc = old_weapon.get('accuracy_multiplier', 1.0)
        new_acc = new_weapon.get('accuracy_multiplier', 1.0)
        if abs(old_acc - new_acc) > 0.1:
            improvements['accuracy_fixed'] += 1
            log(f"  {weapon_name}: Accuracy {old_acc} → {new_acc}")
        
        # Compare damage
        old_dmg = old_weapon.get('damage_multiplier', 1.0)
        new_dmg = new_weapon.get('damage_multiplier', 1.0)
        if abs(old_dmg - new_dmg) > 0.1:
            improvements['damage_fixed'] += 1
            log(f"  {weapon_name}: Damage {old_dmg} → {new_dmg}")
        
        # Compare mechanics
        old_mechanics = len(old_weapon.get('special_mechanics', {}))
        new_mechanics = len(new_weapon.get('special_mechanics', {}))
        if new_mechanics > old_mechanics:
            improvements['mechanics_improved'] += 1
    
    # Print summary
    log(f"\nComparison Summary:")
    log(f"  Weapons compared: {improvements['total_compared']}")
    log(f"  Special costs fixed: {improvements['special_cost_fixed']}")
    log(f"  Accuracy multipliers fixed: {improvements['accuracy_fixed']}")
    log(f"  Damage multipliers fixed: {improvements['damage_fixed']}")
    log(f"  Mechanics improved: {improvements['mechanics_improved']}")

def run_quality_tests():
    """Run quick quality tests on known problematic weapons"""
    log("=== Running Quality Tests ===")
    
    test_cases = [
        {
            "name": "Bandos godsword",
            "text": "doubled accuracy, inflicts 21% more damage and drains the opponent's combat levels equivalent to the damage hit. Warstrike consumes 50% of the wielder's special attack energy",
            "expected": {
                "special_cost": 50,
                "accuracy_multiplier": 2.0,
                "damage_multiplier": 1.21,
                "has_stat_drains": True
            }
        },
        {
            "name": "Abyssal dagger",
            "text": "hits twice in quick succession with a 25% increase in accuracy and 15% reduced damage, consuming 25% of the player's special attack energy",
            "expected": {
                "special_cost": 25,
                "accuracy_multiplier": 1.25,
                "damage_multiplier": 0.85,
                "hit_count": 2
            }
        },
        {
            "name": "Dragon claws",
            "text": "hits an enemy four times in succession, drains 50% of the special attack bar",
            "expected": {
                "special_cost": 50,
                "hit_count": 4
            }
        },
        {
            "name": "Dark bow",
            "text": "deals up to 30% more damage with a minimum of 5 damage per arrow, consuming 55% of the player's special attack energy",
            "expected": {
                "special_cost": 55,
                "damage_multiplier": 1.3,
                "min_damage": 5
            }
        }
    ]
    
    all_passed = True
    
    for test_case in test_cases:
        result = parse_special_attack(test_case["text"], test_case["name"])
        expected = test_case["expected"]
        
        log(f"\nTesting {test_case['name']}:")
        
        # Check each expected value
        for key, expected_value in expected.items():
            if key == "has_stat_drains":
                actual_value = bool(result.get('special_mechanics', {}).get('stat_drains'))
            else:
                actual_value = result.get(key)
            
            if actual_value == expected_value:
                log(f"  ✅ {key}: {actual_value}")
            else:
                log(f"  ❌ {key}: Expected {expected_value}, got {actual_value}")
                all_passed = False
    
    if all_passed:
        log("\n🎉 All quality tests passed!")
    else:
        log("\n⚠️ Some quality tests failed. Check the parser implementation.")
    
    return all_passed

def main():
    """Main processing function"""
    log("=== OSRS Special Attacks Scraper (Modular v3.0) ===")
    
    # Ask user what they want to do
    print("\nChoose an option:")
    print("1. Update existing data with improved parser")
    print("2. Scrape fresh data from wiki")
    print("3. Both - update existing and add new weapons")
    print("4. Run quality tests only")
    print("5. Compare old vs new parsing quality")
    
    choice = input("\nEnter choice (1-5): ").strip()
    
    if choice == "1":
        # Update existing data
        updated_data = update_existing_weapons_data()
        if updated_data:
            log("=== Update Complete ===")
            display_summary(updated_data)
        return
    
    elif choice == "2":
        # Fresh scrape
        existing_data = []
    
    elif choice == "3":
        # Update existing and add new
        existing_data = update_existing_weapons_data()
        if not existing_data:
            existing_data = []
    
    elif choice == "4":
        # Run quality tests only
        run_quality_tests()
        return
    
    elif choice == "5":
        # Compare parsing quality
        old_file = input("Enter path to old JSON file: ").strip()
        new_file = input("Enter path to new JSON file: ").strip()
        compare_parsing_quality(old_file, new_file)
        return
    
    else:
        log("Invalid choice, defaulting to option 1")
        updated_data = update_existing_weapons_data()
        if updated_data:
            display_summary(updated_data)
        return
    
    # Extract special attacks data from wiki
    log("Extracting special attacks from individual weapon pages...")
    new_special_attacks = extract_special_attacks_data()
    
    if not new_special_attacks:
        log("No special attacks found!")
        return
    
    log(f"Found {len(new_special_attacks)} special attacks on wiki")
    
    # Merge with existing data
    all_special_attacks = existing_data.copy() if existing_data else []
    
    # Get combat stats and process each weapon
    resume_index, total_from_resume = load_resume()
    
    if total_from_resume != len(new_special_attacks):
        resume_index = 0
        log("Number of weapons changed, resetting progress")
    
    for i, special_attack in enumerate(new_special_attacks[resume_index:], start=resume_index):
        weapon_name = special_attack["weapon_name"]
        log(f"[{i+1}/{len(new_special_attacks)}] Processing {weapon_name}")
        
        # Check if weapon already exists
        existing_index = find_existing_weapon(all_special_attacks, weapon_name)
        
        # Get combat stats
        combat_stats = get_item_combat_stats(weapon_name)
        if combat_stats:
            special_attack["combat_stats"] = combat_stats
            log(f"✅ Got combat stats for {weapon_name}")
        else:
            special_attack["combat_stats"] = {
                "attack_bonuses": {}, "defence_bonuses": {}, "other_bonuses": {}, "slot": None
            }
            log(f"⚠️ No combat stats found for {weapon_name}")
        
        # Add metadata
        special_attack["last_updated"] = time.strftime("%Y-%m-%d %H:%M:%S")
        special_attack["parser_version"] = "3.0"
        
        # Update or add the weapon
        if existing_index >= 0:
            all_special_attacks[existing_index] = special_attack
            log(f"Updated existing entry for {weapon_name}")
        else:
            all_special_attacks.append(special_attack)
            log(f"Added new entry for {weapon_name}")
        
        # Save progress
        save_special_attacks_json(all_special_attacks)
        save_resume(i + 1, len(new_special_attacks))
        
        # Rate limiting
        time.sleep(0.5)
    
    # Final save and cleanup
    save_special_attacks_json(all_special_attacks)
    
    if os.path.exists(RESUME_FILE):
        os.remove(RESUME_FILE)
    
    log("=== Processing Complete ===")
    display_summary(all_special_attacks)

def display_summary(all_special_attacks):
    """Display a summary of the scraped data with quality metrics"""
    log(f"\nDataset Summary:")
    log(f"Total weapons: {len(all_special_attacks)}")
    
    # Quality metrics
    metrics = {
        'has_special_cost': 0,
        'has_accuracy_mod': 0,
        'has_damage_mod': 0,
        'has_mechanics': 0,
        'multi_hit': 0,
        'guaranteed_hit': 0
    }
    
    # Categorize by mechanics
    categories = {
        'stat_drains': [], 'healing': [], 'binding': [], 'area_of_effect': [],
        'multi_hit': [], 'high_accuracy': [], 'high_damage': []
    }
    
    for attack in all_special_attacks:
        weapon_name = attack['weapon_name']
        
        # Count quality metrics
        if attack.get('special_cost'):
            metrics['has_special_cost'] += 1
        if attack.get('accuracy_multiplier', 1.0) != 1.0:
            metrics['has_accuracy_mod'] += 1
        if attack.get('damage_multiplier', 1.0) != 1.0:
            metrics['has_damage_mod'] += 1
        if attack.get('special_mechanics'):
            metrics['has_mechanics'] += 1
        if attack.get('hit_count', 1) > 1:
            metrics['multi_hit'] += 1
        if attack.get('guaranteed_hit'):
            metrics['guaranteed_hit'] += 1
        
        # Categorize by mechanics
        mechanics = attack.get('special_mechanics', {})
        for mechanic in mechanics.keys():
            if mechanic in categories:
                categories[mechanic].append(weapon_name)
        
        if attack.get('hit_count', 1) > 1:
            categories['multi_hit'].append(weapon_name)
        if attack.get('accuracy_multiplier', 1.0) > 1.5:
            categories['high_accuracy'].append(weapon_name)
        if attack.get('damage_multiplier', 1.0) > 1.2:
            categories['high_damage'].append(weapon_name)
    
    # Display quality metrics
    log(f"\nParsing Quality Metrics:")
    log(f"  Special costs extracted: {metrics['has_special_cost']}/{len(all_special_attacks)} ({metrics['has_special_cost']/len(all_special_attacks)*100:.1f}%)")
    log(f"  Accuracy modifiers found: {metrics['has_accuracy_mod']}")
    log(f"  Damage modifiers found: {metrics['has_damage_mod']}")
    log(f"  Special mechanics detected: {metrics['has_mechanics']}")
    log(f"  Multi-hit attacks: {metrics['multi_hit']}")
    log(f"  Guaranteed hit attacks: {metrics['guaranteed_hit']}")
    
    # Display categories
    log(f"\nWeapon Categories:")
    for category, weapons in categories.items():
        if weapons:
            log(f"  {category.replace('_', ' ').title()} ({len(weapons)}): {', '.join(weapons[:3])}")
            if len(weapons) > 3:
                log(f"    ... and {len(weapons) - 3} more")
    
    # Show some detailed examples
    log(f"\nSample Detailed Entries:")
    for i, attack in enumerate(all_special_attacks[:3]):
        cost = f"{attack.get('special_cost', 'Unknown')}%" if attack.get('special_cost') else "Unknown"
        log(f"\n  {i+1}. {attack['weapon_name']} - Cost: {cost}")
        
        if attack.get('accuracy_multiplier', 1.0) != 1.0:
            log(f"     Accuracy: {attack['accuracy_multiplier']}x")
        if attack.get('damage_multiplier', 1.0) != 1.0:
            log(f"     Damage: {attack['damage_multiplier']}x")
        if attack.get('hit_count', 1) > 1:
            log(f"     Hits: {attack['hit_count']}")
        
        mechanics = attack.get('special_mechanics', {})
        if mechanics:
            log(f"     Mechanics: {', '.join(mechanics.keys())}")
    
    log(f"\nOutput saved to: {OUTPUT_JSON}")

def validate_installation():
    """Validate that the parser module is properly installed"""
    try:
        from osrs_parser import parse_special_attack
        log("✅ Parser module imported successfully")
        
        # Run a quick test
        test_result = parse_special_attack("consumes 50% special attack energy", "Test weapon")
        if test_result.get('special_cost') == 50:
            log("✅ Parser module working correctly")
            return True
        else:
            log("❌ Parser module not working correctly")
            return False
            
    except ImportError as e:
        log(f"❌ Failed to import parser module: {e}")
        log("Make sure osrs_parser.py is in the same directory as this script")
        return False

if __name__ == "__main__":
    # Validate installation first
    if not validate_installation():
        print("Please ensure osrs_parser.py is in the same directory and try again.")
        exit(1)
    
    # Run quality tests first to verify everything is working
    if run_quality_tests():
        print("\n" + "="*50)
        main()
    else:
        print("Quality tests failed. Please check the parser implementation.")