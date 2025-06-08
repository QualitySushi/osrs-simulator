import requests
from bs4 import BeautifulSoup
import sqlite3
import time
import logging
import os
import re
import json

# === Config ===
WIKI_API = "https://oldschool.runescape.wiki/api.php"
WIKI_BASE = "https://oldschool.runescape.wiki"
BOSS_LIST_PAGE = "https://oldschool.runescape.wiki/api.php?action=parse&page=Boss&prop=text&format=json"
DB_PATH = 'osrs_bosses.db'
HEADERS = {
    "User-Agent": "osrs-boss-scraper/1.0 (https://example.com; contact@example.com)"
}
RESUME_FILE = "boss_resume.txt"

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
    filename="boss_scraper.log",
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

    # Main boss table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bosses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            raid_group TEXT,
            examine TEXT,
            release_date TEXT,
            location TEXT,
            slayer_level INTEGER,
            slayer_xp INTEGER,
            slayer_category TEXT,
            has_multiple_forms BOOLEAN DEFAULT 0,
            raw_html TEXT
        )
    ''')

    # Boss forms table to handle multiple forms/phases
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS boss_forms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            boss_id INTEGER,
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

            size INTEGER,
            npc_ids TEXT,
            assigned_by TEXT,

            FOREIGN KEY (boss_id) REFERENCES bosses(id),
            UNIQUE(boss_id, form_name)
        )
    ''')

    conn.commit()
    return conn, cursor

def extract_all_data_attr_params(soup):
    """
    Extract all unique data-attr-param attributes and their text content.
    Useful for debugging and ensuring all fields are considered.
    """
    data_params = {}
    for tag in soup.find_all(attrs={"data-attr-param": True}):
        key = tag["data-attr-param"].strip().lower()
        val = tag.get_text(separator=" ", strip=True)
        if key and key not in data_params:
            data_params[key] = val
    return data_params

def save_boss(conn, cursor, boss_data, forms_data):
    try:
        # Check if boss already exists
        cursor.execute("SELECT id FROM bosses WHERE name = ?", (boss_data['name'],))
        result = cursor.fetchone()
        
        if result:
            boss_id = result[0]
            # Update existing boss
            columns = []
            values = []
            for key, value in boss_data.items():
                if key != 'name':  # Don't update the primary key
                    columns.append(f"{key} = ?")
                    values.append(value)
            
            if columns:
                query = f"UPDATE bosses SET {', '.join(columns)} WHERE name = ?"
                values.append(boss_data['name'])
                cursor.execute(query, values)
                log(f"Updated boss: {boss_data['name']}")
        else:
            # Insert new boss
            columns = ', '.join(boss_data.keys())
            placeholders = ', '.join(['?' for _ in boss_data])
            values = list(boss_data.values())
            
            query = f"INSERT INTO bosses ({columns}) VALUES ({placeholders})"
            cursor.execute(query, values)
            boss_id = cursor.lastrowid
            log(f"Inserted boss: {boss_data['name']} (ID: {boss_id})")
        
        # Now handle forms data
        if forms_data:
            # First, clear existing forms for this boss
            cursor.execute("DELETE FROM boss_forms WHERE boss_id = ?", (boss_id,))
            
            # Insert new forms
            for form_index, form_data in enumerate(forms_data):
                form_data['boss_id'] = boss_id
                form_data['form_order'] = form_index + 1
                
                columns = ', '.join(form_data.keys())
                placeholders = ', '.join(['?' for _ in form_data])
                values = list(form_data.values())
                
                query = f"INSERT INTO boss_forms ({columns}) VALUES ({placeholders})"
                cursor.execute(query, values)
                
                # Verify form was inserted (without detailed field checking)
                cursor.execute("SELECT id FROM boss_forms WHERE boss_id = ? AND form_order = ?", 
                            (boss_id, form_index + 1))
                if not cursor.fetchone() and form_index == 0:  # Only log for first form failure
                    log(f"Failed to insert form {form_data.get('form_name', 'Unknown')}", "WARNING")
        
        # Simple verification query
        cursor.execute("SELECT COUNT(*) FROM boss_forms WHERE boss_id = ?", (boss_id,))
        form_count = cursor.fetchone()[0]
        
        conn.commit()
        log(f"Saved {boss_data['name']} with {form_count} forms", "SUCCESS")
        return True
    except Exception as e:
        conn.rollback()
        log(f"Failed to save {boss_data.get('name')}: {e}", "ERROR")
        return False

# === Resume Logic ===
def save_resume(boss_name):
    with open(RESUME_FILE, "w") as f:
        f.write(boss_name)

def load_resume():
    if os.path.exists(RESUME_FILE):
        with open(RESUME_FILE, "r") as f:
            return f.read().strip()
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

# === Scraping Functions ===
def get_boss_list():
    try:
        log("Fetching boss list from parsed wiki Boss page")
        response = requests.get(BOSS_LIST_PAGE, headers=HEADERS)
        response.raise_for_status()
        data = response.json()
        html = data["parse"]["text"]["*"]
        soup = BeautifulSoup(html, "html.parser")

        boss_links = soup.select(".mw-parser-output ul li a")
        bosses = []
        for a in boss_links:
            href = a.get("href")
            title = a.get("title")
            if href and title and not any(ex in href for ex in [":", "#"]):
                bosses.append({"title": title})

        log(f"Extracted {len(bosses)} boss names from parsed Boss page")
        return bosses
    except Exception as e:
        log(f"Failed to parse boss list: {e}", "ERROR")
        return []

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
                
    # Elemental weakness type (from <th>) — not part of normal section row
    elem_type_tag = table.find("th", {"data-attr-param": "elementalweaknesstype"})
    if elem_type_tag:
        img = elem_type_tag.find("img")
        if img and img.has_attr("alt"):
            stats['elemental_weakness_type'] = img["alt"].replace(" elemental weakness", "").strip()
        else:
            stats['elemental_weakness_type'] = elem_type_tag.get_text(strip=True)

    # Elemental weakness percent (from <td> in a separate row)
    elem_percent_tag = table.find("td", {"data-attr-param": "elementalweaknesspercent"})
    if elem_percent_tag:
        stats['elemental_weakness_percent'] = extract_number(elem_percent_tag.get_text(strip=True))

    return stats

def extract_infobox_stats(soup):
    """Extract critical combat stats from the infobox and other sources"""
    infobox_stats = {}
    
    # 1. Look for data attributes in the HTML
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
    
    # 2. Get max hit data attribute
    max_hit_cell = soup.find('td', {'data-attr-param': 'max_hit_fmt'})
    if max_hit_cell:
        infobox_stats['max_hit'] = max_hit_cell.get_text(strip=True)
    
    # 3. Get attack style data attribute
    attack_style_cell = soup.find('td', {'data-attr-param': 'attack style'})
    if attack_style_cell:
        infobox_stats['attack_style'] = attack_style_cell.get_text(strip=True)
    
    # 4. Get attack speed data attribute
    attack_speed_cell = soup.find('td', {'data-attr-param': 'attack speed'})
    if attack_speed_cell:
        attack_speed = extract_attack_speed(attack_speed_cell.get_text(strip=True))
        if attack_speed:
            infobox_stats['attack_speed'] = attack_speed
    
    # 5. If still no combat level, look through table rows
    if 'combat_level' not in infobox_stats:
        # Find the combat level header row
        combat_header = soup.find(lambda tag: tag.name == 'th' and tag.get_text(strip=True).lower() == 'combat level')
        if combat_header:
            # Get the value from the next cell or same row
            parent_row = combat_header.find_parent('tr')
            if parent_row:
                value_cell = parent_row.find('td')
                if value_cell:
                    combat_level = extract_number(value_cell.get_text(strip=True))
                    if combat_level:
                        infobox_stats['combat_level'] = combat_level
    
    # 6. If still no hitpoints, look for hitpoints in combat stats section
    if 'hitpoints' not in infobox_stats:
        # Look for hitpoints icon
        hitpoints_icon = soup.find('img', {'src': lambda s: s and 'Hitpoints_icon.png' in s})
        if hitpoints_icon:
            # Try to find hitpoints value in nearby elements
            parent = hitpoints_icon.find_parent('tr')
            if parent:
                # Check if value is in this row
                value_cell = parent.find('td')
                if value_cell:
                    hitpoints = extract_number(value_cell.get_text(strip=True))
                    if hitpoints:
                        infobox_stats['hitpoints'] = hitpoints
                # If not, check the next row
                else:
                    next_row = parent.find_next_sibling('tr')
                    if next_row:
                        value_cell = next_row.find('td')
                        if value_cell:
                            hitpoints = extract_number(value_cell.get_text(strip=True))
                            if hitpoints:
                                infobox_stats['hitpoints'] = hitpoints
    
    # 7. Final attempt - look for plain text mentions
    if 'combat_level' not in infobox_stats or 'hitpoints' not in infobox_stats:
        for p in soup.find_all('p'):
            text = p.get_text().lower()
            
            # Look for combat level
            if 'combat_level' not in infobox_stats:
                combat_match = re.search(r'combat level[^\d]*?(\d+)', text)
                if combat_match:
                    infobox_stats['combat_level'] = int(combat_match.group(1))
            
            # Look for hitpoints
            if 'hitpoints' not in infobox_stats:
                hp_match = re.search(r'(?:hitpoints|hit points|hp)[^\d]*?(\d+)', text)
                if hp_match:
                    infobox_stats['hitpoints'] = int(hp_match.group(1))
    
    return infobox_stats

def extract_immunities(soup):
    """Extract all immunity information"""
    immunities = {
        'poison_immunity': False,
        'venom_immunity': False,
        'magic_immunity': False,
        'ranged_immunity': False,
        'melee_immunity': False
    }
    
    # Check for immunities in any table
    for table in soup.find_all('table'):
        table_text = table.get_text().lower()
        
        # Immunity table
        if 'immunities' in table_text:
            for row in table.find_all('tr'):
                cells = row.find_all(['th', 'td'])
                if len(cells) >= 2:
                    immunity_type = cells[0].get_text(strip=True).lower()
                    immunity_value = cells[1].get_text(strip=True).lower()
                    
                    if 'poison' in immunity_type and 'venom' not in immunity_type:
                        immunities['poison_immunity'] = is_immune(immunity_value)
                    elif 'venom' in immunity_type:
                        immunities['venom_immunity'] = is_immune(immunity_value)
    
    # Also look for text about immunities in paragraphs
    for para in soup.find_all('p'):
        text = para.get_text().lower()
        if 'immune to magic' in text or 'cannot be harmed with magic' in text:
            immunities['magic_immunity'] = True
        if 'immune to ranged' in text or 'cannot be harmed with ranged' in text:
            immunities['ranged_immunity'] = True
        if 'immune to melee' in text or 'cannot be harmed with melee' in text:
            immunities['melee_immunity'] = True
    
    return immunities

def extract_all_combat_stats(soup):
    """Extract combat stats from all tables in the page"""
    all_stats = {}
    
    # Find all tables
    tables = soup.find_all('table')
    
    # Process each table to extract relevant stats
    for table in tables:
        stats = extract_combat_stats_from_table(table)
        all_stats.update(stats)
    
    # Extract immunities
    immunities = extract_immunities(soup)
    all_stats.update(immunities)
    
    return all_stats

def extract_special_mechanics(soup):
    """Extract special mechanics from the Fight overview section"""
    mechanics = []
    
    # Find Fight overview section
    fight_overview = soup.find(lambda tag: tag.name in ["h2", "h3"] and "fight overview" in tag.get_text(strip=True).lower())
    if fight_overview:
        # Get all paragraphs under this section
        section_end = fight_overview.find_next(["h2", "h3"])
        current = fight_overview.find_next(["p", "ul"])
        
        while current and (section_end is None or current.sourceline < section_end.sourceline):
            if current.name == "p":
                text = current.get_text(strip=True)
                if text and len(text) > 15:  # Filter out very short paragraphs
                    mechanics.append(text)
            elif current.name == "ul":
                for li in current.find_all("li"):
                    text = li.get_text(strip=True)
                    if text:
                        mechanics.append(f"- {text}")
            current = current.find_next(["p", "ul", "h2", "h3"])
            if current and current.name in ["h2", "h3"]:
                break
    
    # Also check for mechanics section
    mechanics_section = soup.find(lambda tag: tag.name in ["h2", "h3"] and "mechanic" in tag.get_text(strip=True).lower())
    if mechanics_section:
        # Get all paragraphs under this section
        section_end = mechanics_section.find_next(["h2", "h3"])
        current = mechanics_section.find_next(["p", "ul"])
        
        while current and (section_end is None or current.sourceline < section_end.sourceline):
            if current.name == "p":
                text = current.get_text(strip=True)
                if text and len(text) > 15:  # Filter out very short paragraphs
                    mechanics.append(text)
            elif current.name == "ul":
                for li in current.find_all("li"):
                    text = li.get_text(strip=True)
                    if text:
                        mechanics.append(f"- {text}")
            current = current.find_next(["p", "ul", "h2", "h3"])
            if current and current.name in ["h2", "h3"]:
                break
    
    return mechanics

def extract_boss_forms(soup, boss_name):
    """Extract different forms or phases of a boss with improved critical stats extraction"""
    forms = []
    examine_texts = {}  # Store examine texts to return to main boss object
    form_names_seen = set()

    version_tabs = soup.find_all(lambda tag: tag.name == "div" and "SMW Subobject for" in tag.get_text())

    if version_tabs:
        log(f"Found {len(version_tabs)} different forms")

        for tab in version_tabs:
            form_data = {}

            # === FORM NAME PARSING ===
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

            # === FIELD EXTRACTION ===
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
                    # Normalize and parse to JSON
                    hit_dict = {}
                    # e.g., value = "30 (melee), 25 (ranged)"
                    for segment in value.split(','):
                        match = re.match(r'(\d+)\s*\((.*?)\)', segment.strip())
                        if match:
                            hit, style = match.groups()
                            hit_dict[style.lower()] = int(hit)
                        elif value.strip().isdigit():
                            hit_dict["default"] = int(value.strip())
                    form_data['max_hit'] = json.dumps(hit_dict)
                elif 'attack speed' in key:
                    form_data['attack_speed'] = extract_attack_speed(value)
                elif 'attack style' in key:
                    # Split on slashes or commas
                    styles = [s.strip().lower() for s in re.split(r'[/,]', value) if s.strip()]
                    form_data['attack_style'] = json.dumps(styles)
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
                elif 'immune to poison' in key:
                    form_data['poison_immunity'] = is_immune(value)
                elif 'immune to venom' in key:
                    form_data['venom_immunity'] = is_immune(value)
                elif 'stab defence bonus' in key:
                    form_data['defence_stab'] = extract_number(value)
                elif 'slash defence bonus' in key:
                    form_data['defence_slash'] = extract_number(value)
                elif 'crush defence bonus' in key:
                    form_data['defence_crush'] = extract_number(value)
                elif 'light range defence bonus' in key:
                    form_data['defence_ranged_light'] = extract_number(value)
                elif 'standard range defence bonus' in key:
                    form_data['defence_ranged_standard'] = extract_number(value)
                elif 'heavy range defence bonus' in key:
                    form_data['defence_ranged_heavy'] = extract_number(value)
                elif 'magic defence bonus' in key:
                    form_data['defence_magic'] = extract_number(value)
                elif 'elemental weakness type' in key:
                    form_data['elemental_weakness_type'] = value
                elif 'elemental weakness percent' in key:
                    form_data['elemental_weakness_percent'] = value
                elif 'image' in key and '.' in value:
                    img_file = value.replace('File:', '').strip()
                    form_data['image_url'] = f"{WIKI_BASE}/images/{img_file}"
                elif 'npc id' in key:
                    ids = [int(n.strip()) for n in re.findall(r'\d+', value)]
                    form_data['npc_ids'] = json.dumps(ids)

                elif 'assigned by' in key:
                    # Normalize and lower-case slayer masters
                    names = [s.strip().lower() for s in value.split(',') if s.strip()]
                    form_data['assigned_by'] = json.dumps(names)
                elif 'monster attribute' in key:
                    form_data['attribute'] = value
                elif 'size' in key:
                    form_data['size'] = extract_number(value)

            # === ELEMENTAL WEAKNESS FROM IMAGE ALT ===
            elem_type_span = tab.find("span", {"data-attr-param": "elementalweaknesstype_smw"})
            if elem_type_span:
                img = elem_type_span.find("img")
                if img and img.has_attr("alt"):
                    form_data["elemental_weakness_type"] = img["alt"].strip()

            elem_percent = tab.find("span", {"data-attr-param": "elementalweaknesspercent_smw"})
            if elem_percent:
                form_data["elemental_weakness_percent"] = extract_number(elem_percent.get_text(strip=True))

            forms.append(form_data)

    if not forms:
        forms.append({'form_name': "Default"})

    return forms, examine_texts

def get_boss_data(boss_name):
    """Fetches data for a single boss using the API with enhanced critical stats extraction"""
    params = {
        "action": "parse",
        "page": boss_name,
        "prop": "text",
        "format": "json"
    }

    try:
        r = requests.get(WIKI_API, params=params, headers=HEADERS)
        r.raise_for_status()
        html = r.json()["parse"]["text"]["*"]
        soup = BeautifulSoup(html, "html.parser")

        # Initialize main boss data
        boss_data = {
            'name': boss_name,
            'raw_html': html
        }

        # Assign raid group if known
        if boss_name in RAID_BOSS_GROUPS:
            boss_data["raid_group"] = RAID_BOSS_GROUPS[boss_name]

        # Check for multiple forms
        forms_data, examine_texts = extract_boss_forms(soup, boss_name)
        if len(forms_data) > 1:
            boss_data['has_multiple_forms'] = True

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
                        boss_data['examine'] = val
                    elif 'release' in key:
                        boss_data['release_date'] = val
                    elif 'location' in key:
                        boss_data['location'] = val
                    elif 'slayer level' in key:
                        boss_data['slayer_level'] = extract_number(val)
                    elif 'slayer xp' in key:
                        boss_data['slayer_xp'] = extract_number(val)
                    elif 'category' in key and 'slayer' in key:
                        boss_data['slayer_category'] = val

        # Use examine from form if not in infobox
        if examine_texts and not boss_data.get('examine'):
            boss_data['examine'] = next(iter(examine_texts.values()))

        # Add combat + special mechanics for all forms
        combat_stats = extract_all_combat_stats(soup)
        infobox_stats = extract_infobox_stats(soup)
        immunities = extract_immunities(soup)
        mechanics = extract_special_mechanics(soup)

        for i, form in enumerate(forms_data):
            # Add stats from infobox
            for key, value in infobox_stats.items():
                if key not in form or form[key] is None:
                    form[key] = value

            # Global combat stats (low priority)
            for key, value in combat_stats.items():
                if key not in form or form[key] is None:
                    form[key] = value

            # Immunities
            form.update(immunities)

            # Special mechanics
            if mechanics:
                form['special_mechanics'] = json.dumps(mechanics)

            # === ADDITIONAL PARSING ===
            form_text = json.dumps(form).lower()

            # Parse 'size'
            if 'size' not in form or not form.get('size'):
                match = re.search(r'"size":\s*"?(\d+)[x×](\d+)"?', form_text)
                if match:
                    form['size'] = int(match.group(1)) * int(match.group(2))
                else:
                    fallback = re.search(r'"size":\s*"?(\d+)"?', form_text)
                    if fallback:
                        form['size'] = int(fallback.group(1))

            # Parse 'attribute'
            if 'attribute' not in form or not form.get('attribute'):
                if 'undead' in form_text:
                    form['attribute'] = 'undead'
                elif 'demon' in form_text:
                    form['attribute'] = 'demon'
                elif 'dragon' in form_text:
                    form['attribute'] = 'dragon'
                elif 'kalphite' in form_text:
                    form['attribute'] = 'kalphite'

            # Parse 'npc_ids'
            if 'npc_ids' not in form:
                npc_match = re.search(r'"npc id[s]?":\s*"([^"]+)"', form_text)
                if npc_match:
                    form['npc_ids'] = npc_match.group(1)

            # Parse 'assigned_by'
            if 'assigned_by' not in form:
                assigned_match = re.search(r'"assigned by":\s*"([^"]+)"', form_text)
                if assigned_match:
                    form['assigned_by'] = assigned_match.group(1)

            # Fallbacks for missing critical fields
            if form.get('combat_level') is None:
                for p in soup.find_all('p'):
                    match = re.search(r'combat level[^\d]*(\d+)', p.get_text().lower())
                    if match:
                        form['combat_level'] = int(match.group(1))
                        break
            if form.get('hitpoints') is None:
                for p in soup.find_all('p'):
                    match = re.search(r'(?:hitpoints|hit points|hp)[^\d]*(\d+)', p.get_text().lower())
                    if match:
                        form['hitpoints'] = int(match.group(1))
                        break

            forms_data[i] = form

        log(f"Retrieved data for {boss_name} with {len(forms_data)} forms")
        return boss_data, forms_data

    except Exception as e:
        log(f"Error fetching data for {boss_name}: {e}", "ERROR")
        return None, None

# === Main Function ===
def main():
    log("=== OSRS Boss Scraper Started ===")
    
    # Initialize database
    conn, cursor = init_db()
    log("Database initialized")
    
    # Get boss list
    bosses = get_boss_list()
    
    # Check for resume point
    resume_point = load_resume()
    should_resume = False
    processed_count = 0
    success_count = 0
    
    for i, boss in enumerate(bosses):
        boss_name = boss["title"]
        
        # Resume logic
        if resume_point and not should_resume:
            if boss_name == resume_point:
                should_resume = True
                log(f"Resuming from {boss_name}")
            else:
                continue
        
        log(f"Processing [{i+1}/{len(bosses)}]: {boss_name}")
        processed_count += 1
        
        # Get boss data
        boss_data, forms_data = get_boss_data(boss_name)
        
        if boss_data and forms_data:
            # Quick summary of critical stats before saving
            missing_combat = 0
            missing_hp = 0
            for form in forms_data:
                if form.get('combat_level') is None:
                    missing_combat += 1
                if form.get('hitpoints') is None:
                    missing_hp += 1
            
            if missing_combat > 0 or missing_hp > 0:
                log(f"⚠️ Missing critical stats: Combat Level ({missing_combat}/{len(forms_data)}), HP ({missing_hp}/{len(forms_data)})")
            
            # Save to database
            success = save_boss(conn, cursor, boss_data, forms_data)
            if success:
                success_count += 1
        else:
            log(f"Failed to get data for {boss_name}", "ERROR")
        
        # Save resume point
        save_resume(boss_name)
        
        # Respectful delay
        time.sleep(1)
    
    # Final database stats
    log("=== Scraping Complete ===")
    cursor.execute("SELECT COUNT(*) FROM bosses")
    boss_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM boss_forms")
    form_count = cursor.fetchone()[0]
    
    log(f"Results: {boss_count} bosses, {form_count} forms, {success_count}/{processed_count} successful")
    
    # Calculate missing stats - useful information
    cursor.execute("""
    SELECT 
        COUNT(*) AS total_forms,
        SUM(CASE WHEN hitpoints IS NULL THEN 1 ELSE 0 END) AS missing_hp,
        SUM(CASE WHEN combat_level IS NULL THEN 1 ELSE 0 END) AS missing_combat,
        SUM(CASE WHEN attack_level IS NULL THEN 1 ELSE 0 END) AS missing_atk,
        SUM(CASE WHEN defence_level IS NULL THEN 1 ELSE 0 END) AS missing_def
    FROM 
        boss_forms
    """)
    stats = cursor.fetchone()
    
    if stats[0] > 0:  # Avoid division by zero
        log(f"Data quality: Missing - Combat: {stats[2]}/{stats[0]} | HP: {stats[1]}/{stats[0]} | ATK: {stats[3]}/{stats[0]} | DEF: {stats[4]}/{stats[0]}")
    
    # Close database connection
    conn.close()

if __name__ == "__main__":
    main()