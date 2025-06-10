import requests
from bs4 import BeautifulSoup
import sqlite3
import time
import logging
import os
import re
import json
from urllib.parse import unquote, urlparse

# === Config ===
WIKI_API = "https://oldschool.runescape.wiki/api.php"
WIKI_BASE = "https://oldschool.runescape.wiki"
DB_PATH = 'osrs_npcs.db'
HEADERS = {
    "User-Agent": "osrs-npc-scraper/1.0 (https://example.com; contact@example.com)"
}
RESUME_FILE = "npc_resume.txt"
NPC_LIST_FILE = "valid_npcs.json"

# When not using the SQLite database we aggregate the scraped data
# and write it to this JSON file at the end.
OUTPUT_JSON = "npcs_data.json"

# List that will store the results before writing them to disk.
npcs_output = []

# === Manual Raid Boss Grouping ===
RAID_BOSS_GROUPS = {
    "Maiden of Sugadinti": "Theatre of Blood",
    "Pestilent Bloat": "Theatre of Blood",
    "Nylocas Vasilias": "Theatre of Blood",
    "Sotetseg": "Theatre of Blood",
    "Xarpus": "Theatre of Blood",
    "Verzik Vitur": "Theatre of Blood",

    "Tekton": "Chambers of Xeric",
    "Vasa Nistirio": "Chambers of Xeric",
    "Vespula": "Chambers of Xeric",
    "Muttadile": "Chambers of Xeric",
    "Great Olm": "Chambers of Xeric",

    "Akkha": "Tombs of Amascut",
    "Ba-Ba": "Tombs of Amascut",
    "Kephri": "Tombs of Amascut",
    "Zebak": "Tombs of Amascut",
    "Warden": "Tombs of Amascut",
}

# === Logging ===
logging.basicConfig(
    filename="npc_scraper.log",
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

def log(msg, level="INFO"):
    """Centralized logging with levels: INFO, SUCCESS, WARNING, ERROR"""
    if level == "SUCCESS":
        prefix = "✅"
    elif level == "WARNING":
        prefix = "⚠️"
    elif level == "ERROR":
        prefix = "❌"
    else:
        prefix = "→"

    message = f"{prefix} {msg}"
    print(message)
    logging.info(message)

# === Database Initialization ===
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Main NPC table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS npcs (
            id INTEGER PRIMARY KEY,
            name TEXT,
            raid_group TEXT,
            examine TEXT,
            release_date TEXT,
            location TEXT,
            slayer_level INTEGER,
            slayer_xp INTEGER,
            slayer_category TEXT,
            wiki_url TEXT,
            has_multiple_forms BOOLEAN DEFAULT 0,
            raw_html TEXT,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # NPC forms table to handle multiple forms/variations
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS npc_forms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            npc_id INTEGER,
            form_name TEXT,
            form_order INTEGER,

            combat_level INTEGER,
            hitpoints INTEGER,
            max_hit TEXT,
            attack_speed INTEGER,
            attack_style TEXT,

            attack_level INTEGER,
            strength_level INTEGER,
            defence_level INTEGER,
            magic_level INTEGER,
            ranged_level INTEGER,

            aggressive_attack_bonus INTEGER,
            aggressive_strength_bonus INTEGER,
            aggressive_magic_bonus INTEGER,
            aggressive_magic_strength_bonus INTEGER,
            aggressive_ranged_bonus INTEGER,
            aggressive_ranged_strength_bonus INTEGER,

            defence_stab INTEGER,
            defence_slash INTEGER,
            defence_crush INTEGER,
            defence_magic INTEGER,
            elemental_weakness_type TEXT,
            elemental_weakness_percent TEXT,
            defence_ranged_light INTEGER,
            defence_ranged_standard INTEGER,
            defence_ranged_heavy INTEGER,

            attribute TEXT,
            xp_bonus TEXT,
            aggressive BOOLEAN,
            poisonous BOOLEAN,

            poison_immunity BOOLEAN,
            venom_immunity BOOLEAN,
            melee_immunity BOOLEAN,
            magic_immunity BOOLEAN,
            ranged_immunity BOOLEAN,
            cannon_immunity BOOLEAN,
            thrall_immunity BOOLEAN,

            special_mechanics TEXT,
            image_url TEXT,
            icons TEXT,

            size INTEGER,
            assigned_by TEXT,
            
            FOREIGN KEY (npc_id) REFERENCES npcs(id),
            UNIQUE(npc_id, form_name)
        )
    ''')

    # NPC drops table for future expansion
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS npc_drops (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            npc_id INTEGER,
            item_name TEXT,
            item_id INTEGER,
            quantity TEXT,
            rarity TEXT,
            drop_rate TEXT,
            FOREIGN KEY (npc_id) REFERENCES npcs(id)
        )
    ''')

    conn.commit()
    return conn, cursor

def load_npc_list():
    """Load the list of NPCs from the generated JSON file."""
    if not os.path.exists(NPC_LIST_FILE):
        log(f"NPC list file not found: {NPC_LIST_FILE}", "ERROR")
        log("Please run the NPC ID generator first to create valid_npcs.json", "ERROR")
        return []
    
    with open(NPC_LIST_FILE, 'r', encoding='utf-8') as f:
        npcs = json.load(f)
    
    log(f"Loaded {len(npcs)} NPCs from {NPC_LIST_FILE}")
    return npcs

def save_resume(npc_id):
    with open(RESUME_FILE, "w") as f:
        f.write(str(npc_id))

def load_resume():
    if os.path.exists(RESUME_FILE):
        with open(RESUME_FILE, "r") as f:
            return int(f.read().strip())
    return None

# === Helper Functions ===
def extract_number(text):
    """Extract first number from text, handling commas in numbers"""
    if not text:
        return None
    
    # Try to find numbers with commas (like 1,000)
    comma_match = re.search(r'[\d,]+', text)
    if comma_match:
        return int(comma_match.group().replace(',', ''))
    
    # Fall back to simple number
    match = re.search(r'\d+', text)
    if match:
        return int(match.group())
    
    return None

def extract_attack_speed(text):
    """Convert attack speed (in ticks) to a numeric value"""
    if not text:
        return None
    
    match = re.search(r'\d+', text)
    if match:
        return int(match.group())
    
    return None

def clean_text(text):
    """Clean text by removing extra whitespace and special characters"""
    if not text:
        return None
    return re.sub(r'\s+', ' ', text).strip()

def is_immune(text):
    """Check if text indicates immunity"""
    if not text:
        return False
    return 'immune' in text.lower() or 'yes' in text.lower()

def extract_page_name_from_url(url):
    """Extract the wiki page name from a URL"""
    if not url:
        return None
    
    # Parse URL and get the path
    parsed = urlparse(url)
    path = parsed.path
    
    # Extract page name from /w/PageName format
    if '/w/' in path:
        page_name = path.split('/w/')[-1]
        return unquote(page_name)
    
    return None

# === Combat Stats Extraction (similar to boss scraper) ===
def extract_combat_stats_from_table(table):
    """Extract detailed combat stats from a specific table using ordered headers"""
    stats = {}
    
    if not table:
        return stats

    current_section = None
    rows = table.find_all("tr")
    for row in rows:
        headers = row.find_all("th")
        cells = row.find_all("td")

        # Section headers
        if len(headers) == 1 and not cells:
            header_text = headers[0].get_text(strip=True).lower()
            if "combat stats" in header_text:
                current_section = "combat_stats"
            elif "aggressive stats" in header_text:
                current_section = "aggressive_stats"
            elif "melee defence" in header_text:
                current_section = "melee_def"
            elif "magic defence" in header_text:
                current_section = "magic_def"
            elif "ranged defence" in header_text:
                current_section = "ranged_def"
            elif "immunities" in header_text:
                current_section = "immunities"
            else:
                current_section = None
            continue

        # Values by section
        if current_section == "combat_stats" and len(cells) >= 6:
            stats['hitpoints'] = extract_number(cells[0].get_text(strip=True))
            stats['attack_level'] = extract_number(cells[1].get_text(strip=True))
            stats['strength_level'] = extract_number(cells[2].get_text(strip=True))
            stats['defence_level'] = extract_number(cells[3].get_text(strip=True))
            stats['magic_level'] = extract_number(cells[4].get_text(strip=True))
            stats['ranged_level'] = extract_number(cells[5].get_text(strip=True))

        elif current_section == "aggressive_stats" and len(cells) >= 6:
            stats['aggressive_attack_bonus'] = extract_number(cells[0].get_text(strip=True))
            stats['aggressive_strength_bonus'] = extract_number(cells[1].get_text(strip=True))
            stats['aggressive_magic_bonus'] = extract_number(cells[2].get_text(strip=True))
            stats['aggressive_magic_strength_bonus'] = extract_number(cells[3].get_text(strip=True))
            stats['aggressive_ranged_bonus'] = extract_number(cells[4].get_text(strip=True))
            stats['aggressive_ranged_strength_bonus'] = extract_number(cells[5].get_text(strip=True))

        elif current_section == "melee_def" and len(cells) >= 3:
            stats['defence_stab'] = extract_number(cells[0].get_text(strip=True))
            stats['defence_slash'] = extract_number(cells[1].get_text(strip=True))
            stats['defence_crush'] = extract_number(cells[2].get_text(strip=True))

        elif current_section == "ranged_def" and len(cells) >= 3:
            stats['defence_ranged_light'] = extract_number(cells[0].get_text(strip=True))
            stats['defence_ranged_standard'] = extract_number(cells[1].get_text(strip=True))
            stats['defence_ranged_heavy'] = extract_number(cells[2].get_text(strip=True))

        elif current_section == "immunities" and len(cells) == 2:
            label = cells[0].get_text(strip=True).lower()
            value = cells[1].get_text(strip=True).lower()
            
            if 'poison' in label and 'venom' not in label:
                stats['poison_immunity'] = is_immune(value)
            elif 'venom' in label:
                stats['venom_immunity'] = is_immune(value)
            elif 'cannon' in label:
                stats['cannon_immunity'] = is_immune(value)
            elif 'thrall' in label:
                stats['thrall_immunity'] = is_immune(value)
                
    return stats

def extract_infobox_stats(soup):
    """Extract critical combat stats from the infobox and other sources"""
    infobox_stats = {}
    
    # Look for data attributes in the HTML
    combat_cell = soup.find('td', {'data-attr-param': 'combat'})
    if combat_cell:
        combat_level = extract_number(combat_cell.get_text(strip=True))
        if combat_level:
            infobox_stats['combat_level'] = combat_level
    
    # Look for hitpoints data attribute
    hp_cell = soup.find('td', {'data-attr-param': 'hitpoints'})
    if hp_cell:
        hitpoints = extract_number(hp_cell.get_text(strip=True))
        if hitpoints:
            infobox_stats['hitpoints'] = hitpoints
    
    # Get max hit data attribute
    max_hit_cell = soup.find('td', {'data-attr-param': 'max_hit_fmt'})
    if max_hit_cell:
        infobox_stats['max_hit'] = max_hit_cell.get_text(strip=True)
    
    # Get attack style data attribute
    attack_style_cell = soup.find('td', {'data-attr-param': 'attack style'})
    if attack_style_cell:
        infobox_stats['attack_style'] = attack_style_cell.get_text(strip=True)
    
    # Get attack speed data attribute
    attack_speed_cell = soup.find('td', {'data-attr-param': 'attack speed'})
    if attack_speed_cell:
        attack_speed = extract_attack_speed(attack_speed_cell.get_text(strip=True))
        if attack_speed:
            infobox_stats['attack_speed'] = attack_speed
    
    return infobox_stats

def extract_npc_forms(soup, npc_name):
    """Extract different forms or variations of an NPC"""
    forms = []
    examine_texts = {}
    form_names_seen = set()

    version_tabs = soup.find_all(lambda tag: tag.name == "div" and "SMW Subobject for" in tag.get_text())

    if version_tabs:
        log(f"Found {len(version_tabs)} different forms for {npc_name}")

        for tab in version_tabs:
            form_data = {}

            # Form name parsing
            form_header = tab.find("div", class_="smw-subobject-name")
            if form_header:
                raw_name = form_header.get_text(strip=True)
                form_name = raw_name.replace("SMW Subobject for", "").strip()
            else:
                raw_text = tab.get_text(separator="\n", strip=True)
                match = re.search(r'SMW Subobject for\s*(.+?)(?=\n|$)', raw_text)
                form_name = match.group(1).strip() if match else None

            if not form_name or form_name in form_names_seen:
                form_name = f"Form {len(forms) + 1}"

            form_names_seen.add(form_name)
            form_data['form_name'] = form_name

            # Field extraction from spans
            for span in tab.find_all('span'):
                text = span.get_text(strip=True)
                if ':' not in text:
                    continue
                key, value = text.split(':', 1)
                key = key.strip().lower()
                value = value.strip()

                if 'combat level' in key:
                    form_data['combat_level'] = extract_number(value)
                elif 'hitpoint' in key:
                    form_data['hitpoints'] = extract_number(value)
                elif 'max hit' in key:
                    form_data['max_hit'] = value
                elif 'attack speed' in key:
                    form_data['attack_speed'] = extract_attack_speed(value)
                elif 'attack style' in key:
                    form_data['attack_style'] = value
                elif 'attack level' in key:
                    form_data['attack_level'] = extract_number(value)
                elif 'strength level' in key:
                    form_data['strength_level'] = extract_number(value)
                elif 'defence level' in key:
                    form_data['defence_level'] = extract_number(value)
                elif 'magic level' in key:
                    form_data['magic_level'] = extract_number(value)
                elif 'ranged level' in key:
                    form_data['ranged_level'] = extract_number(value)
                elif 'examine' in key:
                    examine_texts[form_name] = value
                elif 'aggressive' in key and 'yes' in value.lower():
                    form_data['aggressive'] = True
                elif 'poisonous' in key and 'yes' in value.lower():
                    form_data['poisonous'] = True
                elif 'attribute' in key:
                    form_data['attribute'] = value
                elif 'size' in key:
                    form_data['size'] = extract_number(value)

            # Collect icon URLs
            icons = []
            for img_tag in tab.find_all('img'):
                src = img_tag.get('src')
                if not src:
                    continue
                if src.startswith('//'):
                    src = 'https:' + src
                elif src.startswith('/'):
                    src = f"{WIKI_BASE}{src}"
                if src not in icons:
                    icons.append(src)
            if icons:
                form_data['icons'] = icons

            forms.append(form_data)

    if not forms:
        forms.append({'form_name': "Default"})

    return forms, examine_texts

def save_npc(npc_data, forms_data):
    """Store scraped NPC data in the global list for JSON export."""
    npc_record = npc_data.copy()
    npc_record["forms"] = forms_data
    npcs_output.append(npc_record)
    log(f"Saved NPC {npc_data['id']}: {npc_data.get('name')} with {len(forms_data)} forms", "SUCCESS")
    return True

def get_npc_data(npc_id, npc_name, wiki_url=None):
    """Fetch data for a single NPC using either the wiki URL or NPC name"""
    
    # Determine page name to fetch
    if wiki_url:
        page_name = extract_page_name_from_url(wiki_url)
        if not page_name:
            page_name = npc_name
    else:
        page_name = npc_name
    
    params = {
        "action": "parse",
        "page": page_name,
        "prop": "text",
        "format": "json"
    }

    try:
        r = requests.get(WIKI_API, params=params, headers=HEADERS)
        r.raise_for_status()
        
        response_data = r.json()
        
        # Check if page exists
        if "error" in response_data:
            log(f"Page not found: {page_name}", "WARNING")
            return None, None
            
        html = response_data["parse"]["text"]["*"]
        soup = BeautifulSoup(html, "html.parser")

        # Initialize main NPC data
        npc_data = {
            'id': npc_id,
            'name': npc_name,
            'wiki_url': wiki_url,
            'raw_html': html
        }

        # Assign raid group if known
        if npc_name in RAID_BOSS_GROUPS:
            npc_data["raid_group"] = RAID_BOSS_GROUPS[npc_name]
            log(f"Tagged {npc_name} as {RAID_BOSS_GROUPS[npc_name]} raid boss")

        # Extract forms and examine texts
        forms_data, examine_texts = extract_npc_forms(soup, npc_name)
        if len(forms_data) > 1:
            npc_data['has_multiple_forms'] = True

        # Extract infobox fields
        infobox = soup.find('table', class_='infobox')
        if infobox:
            for row in infobox.find_all('tr'):
                header = row.find('th')
                value = row.find('td')
                if header and value:
                    key = header.get_text(strip=True).lower()
                    val = value.get_text(separator=" ", strip=True)

                    if 'examine' in key:
                        npc_data['examine'] = val
                    elif 'release' in key:
                        npc_data['release_date'] = val
                    elif 'location' in key:
                        npc_data['location'] = val
                    elif 'slayer level' in key:
                        npc_data['slayer_level'] = extract_number(val)
                    elif 'slayer xp' in key:
                        npc_data['slayer_xp'] = extract_number(val)
                    elif 'category' in key and 'slayer' in key:
                        npc_data['slayer_category'] = val

        # Use examine from form if not in infobox
        if examine_texts and not npc_data.get('examine'):
            npc_data['examine'] = next(iter(examine_texts.values()))

        # Extract combat stats and add them to forms
        infobox_stats = extract_infobox_stats(soup)
        
        for table in soup.find_all('table'):
            table_stats = extract_combat_stats_from_table(table)
            infobox_stats.update(table_stats)

        # Apply stats to all forms
        for i, form in enumerate(forms_data):
            # Add infobox stats if not already present in form
            for key, value in infobox_stats.items():
                if key not in form or form[key] is None:
                    form[key] = value
                    
            forms_data[i] = form

        log(f"Retrieved data for NPC {npc_id}: {npc_name} with {len(forms_data)} forms")
        return npc_data, forms_data

    except Exception as e:
        log(f"Error fetching data for NPC {npc_id} ({npc_name}): {e}", "ERROR")
        return None, None

def main():
    log("=== OSRS NPC Scraper Started ===")
    
    # No database required when exporting to JSON
    
    # Load NPC list
    npcs = load_npc_list()
    if not npcs:
        return
    
    # Check for resume point
    resume_point = load_resume()
    should_resume = False
    processed_count = 0
    success_count = 0
    
    # Sort NPCs by ID for consistent processing
    npcs.sort(key=lambda x: x['id'])
    
    for i, npc in enumerate(npcs):
        npc_id = npc["id"]
        npc_name = npc["name"]
        wiki_url = npc.get("wiki_url") or npc.get("link") or npc.get("url")
        
        # Resume logic
        if resume_point and not should_resume:
            if npc_id == resume_point:
                should_resume = True
                log(f"Resuming from NPC ID {npc_id}: {npc_name}")
            else:
                continue
        
        log(f"Processing [{i+1}/{len(npcs)}]: ID {npc_id} - {npc_name}")
        processed_count += 1
        
        # Get NPC data
        npc_data, forms_data = get_npc_data(npc_id, npc_name, wiki_url)
        
        if npc_data and forms_data:
            # Record the NPC for JSON output
            success = save_npc(npc_data, forms_data)
            if success:
                success_count += 1
        else:
            log(f"Failed to get data for NPC {npc_id}: {npc_name}", "ERROR")
        
        # Save resume point
        save_resume(npc_id)
        
        # Respectful delay - shorter than boss scraper since NPCs are simpler
        time.sleep(0.5)
        
        # Progress update every 100 NPCs
        if processed_count % 100 == 0:
            log(f"Progress: {processed_count} processed, {success_count} successful")
    
    # Final stats and write to JSON file
    log("=== Scraping Complete ===")
    log(f"Results: {success_count}/{processed_count} successful")

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(npcs_output, f, ensure_ascii=False, indent=2)
    
    # Clean up resume file
    if os.path.exists(RESUME_FILE):
        os.remove(RESUME_FILE)
        log("Resume file cleaned up")

if __name__ == "__main__":
    main()
