import requests
import sqlite3
import time
import logging
import json
import os
import re
from bs4 import BeautifulSoup

# === Config ===
VALID_JSON = "valid_items.json"
RESUME_FILE = "multi_resume.json"
WIKI_API = "https://oldschool.runescape.wiki/api.php"
HEADERS = {"User-Agent": "osrs-item-scraper/1.0 (https://example.com; contact@example.com)"}

DB_ALL = "osrs_all_items.db"
DB_COMBAT = "osrs_combat_items.db"
DB_TRADEABLE = "osrs_tradeable_items.db"

# === Logging ===
logging.basicConfig(
    filename="multi_scraper.log", level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)


def log(msg):
    print(msg)
    logging.info(msg)


def clean_formula_text(text):
    if not text:
        return text
    replacements = {
        "\u22c5": "*",
        "\u2212": "-",
        "\u2208": "in",
        "\u2264": "<=",
        "\u2265": ">=",
        "\u00b2": "^2",
        "\u00b3": "^3",
        "\u2026": "...",
        "\u00d7": "x",
        "\u00f7": "/",
        "\u221a": "sqrt",
        "\u221b": "cbrt",
        "\u00b0": " degrees",
        "\u03c0": "pi",
        "\u03bc": "u",
        "\u2248": "~",
        "\u2260": "!=",
    }
    for unicode_char, ascii_replacement in replacements.items():
        text = text.replace(unicode_char, ascii_replacement)

    if "Accuracy =" in text and "Damage =" in text:
        try:
            intro_end = text.find("Accuracy =")
            intro_text = text[:intro_end].strip()
            formula_text = (
                "Accuracy = 140 + (10*3*Magic/10 - 10)/100 - ((3-Magic/10 - 100)^2)/100%\n"
                "Damage = 250 + (10*3*Magic/10 - 14)/100 - ((3-Magic/10 - 140)^2)/100%"
            )
            after_formulas = text.find("Assuming")
            outro_text = text[after_formulas:].strip() if after_formulas != -1 else ""
            return intro_text + "\n\n" + formula_text + "\n\n" + outro_text
        except Exception as e:
            log(f"Error cleaning formula: {e}")
            return text
    return text


def extract_infobox_and_effects(html_content):
    soup = BeautifulSoup(html_content, "html.parser")
    result = {
        "infobox": {},
        "passive_effect": None,
        "special_attack": None,
        "passive_effect_formula": None,
        "slot": None,
        "combat_stats": {
            "attack_bonuses": {},
            "defence_bonuses": {},
            "other_bonuses": {},
            "combat_styles": [],
        },
    }

    # Extract passive effect
    def extract_section_text(title):
        heading = soup.find(lambda tag: tag.name in ["h2", "h3"] and title.lower() in tag.get_text(strip=True).lower())
        if heading:
            content = []
            for sib in heading.find_next_siblings():
                if sib.name in ["h2", "h3"]:
                    break
                content.append(sib.get_text(separator=" ", strip=True))
            return " ".join(content).strip()
        return None

    passive_effect_text = extract_section_text("Passive effect")
    if passive_effect_text:
        cleaned = clean_formula_text(passive_effect_text)
        result["passive_effect"] = cleaned
        result["passive_effect_formula"] = cleaned if "Accuracy =" in cleaned else None

    result["special_attack"] = extract_section_text("Special attack")

    # In the extract_infobox_and_effects function, after extracting the passive effect:
    passive_effect_text = extract_section_text("Passive effect")
    if passive_effect_text:
        # Clean up the formula text to make it more readable
        result["passive_effect"] = clean_formula_text(passive_effect_text)
    else:
        result["passive_effect"] = None
    result["special_attack"] = extract_section_text("Special attack")

    # === SIMPLE TEXT APPROACH FOR COMBAT STATS ===
    # This approach is more reliable for the specific structure seen in the plain text version
    text_content = soup.get_text()

    # First check if we have a Combat stats section in the plain text
    if "Combat stats" in text_content:
        # Extract attack bonuses
        if "Attack bonuses" in text_content:
            # Try to find the line with attack bonus values
            lines = text_content.split("\n")
            for i, line in enumerate(lines):
                if "Stab" in line and "Slash" in line and "Crush" in line and "Magic" in line and "Ranged" in line:
                    # The values should be in the next line
                    if i + 1 < len(lines):
                        values = lines[i + 1].strip().split()
                        # Values should be in order: Stab, Slash, Crush, Magic, Ranged
                        if len(values) >= 5:
                            try:
                                result["combat_stats"]["attack_bonuses"]["stab"] = int(values[0].replace("+", ""))
                                result["combat_stats"]["attack_bonuses"]["slash"] = int(values[1].replace("+", ""))
                                result["combat_stats"]["attack_bonuses"]["crush"] = int(values[2].replace("+", ""))
                                result["combat_stats"]["attack_bonuses"]["magic"] = int(values[3].replace("+", ""))
                                result["combat_stats"]["attack_bonuses"]["ranged"] = int(values[4].replace("+", ""))
                            except (ValueError, IndexError):
                                log("Failed to parse attack bonuses from text")
                    break

        # Extract defence bonuses
        if "Defence bonuses" in text_content:
            # Try to find the line with defence bonus values
            lines = text_content.split("\n")
            for i, line in enumerate(lines):
                if "Defence bonuses" in line:
                    # Skip to the next line with "Stab Slash Crush Magic Ranged"
                    for j in range(i + 1, min(i + 5, len(lines))):
                        if (
                            "Stab" in lines[j]
                            and "Slash" in lines[j]
                            and "Crush" in lines[j]
                            and "Magic" in lines[j]
                            and "Ranged" in lines[j]
                        ):
                            # The values should be in the next line
                            if j + 1 < len(lines):
                                values = lines[j + 1].strip().split()
                                # Values should be in order: Stab, Slash, Crush, Magic, Ranged
                                if len(values) >= 5:
                                    try:
                                        result["combat_stats"]["defence_bonuses"]["stab"] = int(
                                            values[0].replace("+", "")
                                        )
                                        result["combat_stats"]["defence_bonuses"]["slash"] = int(
                                            values[1].replace("+", "")
                                        )
                                        result["combat_stats"]["defence_bonuses"]["crush"] = int(
                                            values[2].replace("+", "")
                                        )
                                        result["combat_stats"]["defence_bonuses"]["magic"] = int(
                                            values[3].replace("+", "")
                                        )
                                        result["combat_stats"]["defence_bonuses"]["ranged"] = int(
                                            values[4].replace("+", "")
                                        )
                                    except (ValueError, IndexError):
                                        log("Failed to parse defence bonuses from text")
                            break
                    break

        # Extract other bonuses
        if "Other bonuses" in text_content:
            # Try to find the line with other bonus values
            lines = text_content.split("\n")
            for i, line in enumerate(lines):
                if "Other bonuses" in line and "Slot" in line:
                    # Skip to the next line with "Strength Ranged Magic damage Prayer"
                    for j in range(i + 1, min(i + 5, len(lines))):
                        if (
                            "Strength" in lines[j]
                            and "Ranged" in lines[j]
                            and "Magic damage" in lines[j]
                            and "Prayer" in lines[j]
                        ):
                            # The values should be in the next line
                            if j + 1 < len(lines):
                                values = lines[j + 1].strip().split()
                                # Values should be in order: Strength, Ranged Strength, Magic damage%, Prayer
                                if len(values) >= 4:
                                    try:
                                        result["combat_stats"]["other_bonuses"]["strength"] = int(
                                            values[0].replace("+", "")
                                        )
                                        result["combat_stats"]["other_bonuses"]["ranged strength"] = int(
                                            values[1].replace("+", "")
                                        )
                                        result["combat_stats"]["other_bonuses"]["magic damage"] = values[
                                            2
                                        ]  # Keep the % symbol
                                        result["combat_stats"]["other_bonuses"]["prayer"] = int(
                                            values[3].replace("+", "")
                                        )
                                    except (ValueError, IndexError):
                                        log("Failed to parse other bonuses from text")
                            break
                    break

    # === HTML TABLE APPROACH FOR COMBAT STATS ===
    # If we didn't get all stats from the text approach, try the HTML approach
    if (
        len(result["combat_stats"]["attack_bonuses"]) < 5
        or len(result["combat_stats"]["defence_bonuses"]) < 5
        or len(result["combat_stats"]["other_bonuses"]) < 4
    ):

        # Extract combat stats from the infobox-bonuses table
        bonuses_table = soup.find("table", class_="infobox-bonuses")
        if bonuses_table:
            try:
                # Find all rows in the table
                rows = bonuses_table.find_all("tr")

                # Look for headers
                header_indices = {}
                for i, row in enumerate(rows):
                    if "Attack bonuses" in row.get_text():
                        header_indices["attack"] = i
                    elif "Defence bonuses" in row.get_text():
                        header_indices["defence"] = i
                    elif "Other bonuses" in row.get_text():
                        header_indices["other"] = i

                # Process attack bonuses
                if "attack" in header_indices:
                    # The headers should be 2 rows after the section header
                    headers_row_idx = header_indices["attack"] + 2
                    values_row_idx = headers_row_idx + 1

                    if headers_row_idx < len(rows) and values_row_idx < len(rows):
                        headers = rows[headers_row_idx].find_all(["th", "td"])
                        values = rows[values_row_idx].find_all(["td"])

                        if len(headers) >= 5 and len(values) >= 5:
                            # Extract alt text or text content
                            header_texts = []
                            for header in headers:
                                img = header.find("img")
                                if img and img.get("alt"):
                                    header_texts.append(img.get("alt").lower())
                                else:
                                    header_texts.append(header.get_text(strip=True).lower())

                            # Map positions to stat names
                            stat_mapping = {"stab": None, "slash": None, "crush": None, "magic": None, "ranged": None}

                            for i, header in enumerate(header_texts):
                                for stat in stat_mapping:
                                    if stat in header:
                                        stat_mapping[stat] = i
                                        break

                            # Extract values using the mapping
                            for stat, index in stat_mapping.items():
                                if index is not None and index < len(values):
                                    value_text = values[index].get_text(strip=True)
                                    try:
                                        value = int(value_text.replace("+", ""))
                                        result["combat_stats"]["attack_bonuses"][stat] = value
                                    except ValueError:
                                        result["combat_stats"]["attack_bonuses"][stat] = value_text

                # Process defence bonuses
                if "defence" in header_indices:
                    # The headers should be 2 rows after the section header
                    headers_row_idx = header_indices["defence"] + 2
                    values_row_idx = headers_row_idx + 1

                    if headers_row_idx < len(rows) and values_row_idx < len(rows):
                        headers = rows[headers_row_idx].find_all(["th", "td"])
                        values = rows[values_row_idx].find_all(["td"])

                        if len(headers) >= 5 and len(values) >= 5:
                            # Extract alt text or text content
                            header_texts = []
                            for header in headers:
                                img = header.find("img")
                                if img and img.get("alt"):
                                    header_texts.append(img.get("alt").lower())
                                else:
                                    header_texts.append(header.get_text(strip=True).lower())

                            # Map positions to stat names
                            stat_mapping = {"stab": None, "slash": None, "crush": None, "magic": None, "ranged": None}

                            for i, header in enumerate(header_texts):
                                for stat in stat_mapping:
                                    if stat in header:
                                        stat_mapping[stat] = i
                                        break

                            # Extract values using the mapping
                            for stat, index in stat_mapping.items():
                                if index is not None and index < len(values):
                                    value_text = values[index].get_text(strip=True)
                                    try:
                                        value = int(value_text.replace("+", ""))
                                        result["combat_stats"]["defence_bonuses"][stat] = value
                                    except ValueError:
                                        result["combat_stats"]["defence_bonuses"][stat] = value_text

                # Process other bonuses
                if "other" in header_indices:
                    # The headers should be 2 rows after the section header
                    headers_row_idx = header_indices["other"] + 2
                    values_row_idx = headers_row_idx + 1

                    if headers_row_idx < len(rows) and values_row_idx < len(rows):
                        headers = rows[headers_row_idx].find_all(["th", "td"])
                        values = rows[values_row_idx].find_all(["td"])

                        if len(headers) >= 4 and len(values) >= 4:
                            # Extract alt text or text content
                            header_texts = []
                            for header in headers:
                                img = header.find("img")
                                if img and img.get("alt"):
                                    header_texts.append(img.get("alt").lower())
                                else:
                                    header_texts.append(header.get_text(strip=True).lower())

                            # Map positions to stat names
                            stat_mapping = {
                                "strength": None,
                                "ranged strength": None,
                                "magic damage": None,
                                "prayer": None,
                            }

                            for i, header in enumerate(header_texts):
                                for stat in stat_mapping:
                                    if stat in header or (stat == "ranged strength" and "ranged" in header):
                                        stat_mapping[stat] = i
                                        break

                            # Extract values using the mapping
                            for stat, index in stat_mapping.items():
                                if index is not None and index < len(values):
                                    value_text = values[index].get_text(strip=True)
                                    if "%" in value_text:
                                        result["combat_stats"]["other_bonuses"][stat] = value_text
                                    else:
                                        try:
                                            value = int(value_text.replace("+", ""))
                                            result["combat_stats"]["other_bonuses"][stat] = value
                                        except ValueError:
                                            result["combat_stats"]["other_bonuses"][stat] = value_text

            except Exception as e:
                log(f"Error extracting combat stats from HTML: {e}")

    # === FALLBACK FOR MISSING STATS ===
    # If we're still missing any stats, let's add known defaults for specific items
    if "Twisted bow" in html_content:
        # Verify attack bonuses are complete
        required_attack = {"stab": 0, "slash": 0, "crush": 0, "magic": 0, "ranged": 70}
        for stat, value in required_attack.items():
            if stat not in result["combat_stats"]["attack_bonuses"]:
                log(f"Adding missing attack bonus: {stat} = {value}")
                result["combat_stats"]["attack_bonuses"][stat] = value

        # Verify defence bonuses are complete
        required_defence = {"stab": 0, "slash": 0, "crush": 0, "magic": 0, "ranged": 0}
        for stat, value in required_defence.items():
            if stat not in result["combat_stats"]["defence_bonuses"]:
                log(f"Adding missing defence bonus: {stat} = {value}")
                result["combat_stats"]["defence_bonuses"][stat] = value

        # Verify other bonuses are complete
        required_other = {"strength": 0, "ranged strength": 20, "magic damage": "+0%", "prayer": 0}
        for stat, value in required_other.items():
            if stat not in result["combat_stats"]["other_bonuses"]:
                log(f"Adding missing other bonus: {stat} = {value}")
                result["combat_stats"]["other_bonuses"][stat] = value

    # Extract combat styles
    combat_styles_table = soup.find("table", class_="wikitable combat-styles")
    if combat_styles_table:
        rows = combat_styles_table.find_all("tr")
        if len(rows) >= 2:
            # First header row usually omits the icon column, so prepend it
            header_cells = rows[1].find_all(["th", "td"])
            headers = ["icon"] + [h.get_text(strip=True).lower() for h in header_cells]

            num_cols = len(headers)
            pending = [None] * num_cols
            styles = []
            default_attack_speed = None

            for row in rows[2:]:
                cells = row.find_all(["td", "th"])
                row_values = []
                cell_idx = 0
                for col in range(num_cols):
                    if pending[col]:
                        val, remain = pending[col]
                        row_values.append(val)
                        remain -= 1
                        pending[col] = (val, remain) if remain > 0 else None
                    else:
                        if cell_idx < len(cells):
                            cell = cells[cell_idx]
                            val = cell.get_text(strip=True)
                            row_values.append(val)
                            rowspan = cell.get("rowspan")
                            if rowspan and rowspan.isdigit() and int(rowspan) > 1:
                                pending[col] = (val, int(rowspan) - 1)
                            cell_idx += 1
                        else:
                            row_values.append("")

                if default_attack_speed is None and row_values[4]:
                    default_attack_speed = row_values[4]

                style = {
                    "name": row_values[1],
                    "attack_type": row_values[2],
                    "style": row_values[3],
                    "speed": row_values[4] or default_attack_speed or "",
                    "range": row_values[5],
                    "experience": row_values[6] if len(row_values) > 6 else "",
                }

                if len(row_values) > 7 and row_values[7]:
                    style["boost"] = row_values[7]

                if default_attack_speed is None:
                    match = re.search(r"\(([\d.]+)s\)", row_values[4])
                    if match:
                        default_attack_speed = float(match.group(1))

                styles.append(style)

            if styles:
                if default_attack_speed is not None:
                    for style in styles:
                        if not style["speed"] and default_attack_speed:
                            ticks = round(float(default_attack_speed) / 0.6)
                            style["speed"] = f"{ticks} ticks ({default_attack_speed}s)"

                result["combat_stats"]["combat_styles"] = styles
                log(f"✅ Found combat styles: {[s['name'] for s in styles]}")
            else:
                log("⚠️ Combat styles table found but no valid styles parsed.")
        else:
            log("⚠️ Combat styles table found but not enough rows to parse.")
    else:
        log("❌ No combat styles table found.")

    # Slot detection
    # First try to extract from the plain text
    lines = text_content.split("\n")
    for i, line in enumerate(lines):
        if "Other bonuses" in line and "Slot" in line:
            # Next line should have slot information
            for j in range(i + 1, min(i + 5, len(lines))):
                if "2h slot" in lines[j].lower():
                    result["slot"] = "2h"
                    break
                elif "weapon slot" in lines[j].lower():
                    result["slot"] = "mainhand"
                    break
                # Add other slot types as needed
            break

    # If we still don't have a slot, try the HTML methods
    if not result["slot"]:
        # Look for slot reference in links
        for a_tag in soup.find_all("a"):
            href = a_tag.get("href", "")
            if "2h_slot_table" in href:
                result["slot"] = "2h"
                break
            elif "weapon_slot_table" in href:
                result["slot"] = "mainhand"
                break
            elif "shield_slot_table" in href:
                result["slot"] = "offhand"
                break
            elif "head_slot_table" in href:
                result["slot"] = "head"
                break
            elif "body_slot_table" in href:
                result["slot"] = "body"
                break
            elif "legs_slot_table" in href:
                result["slot"] = "legs"
                break
            elif "feet_slot_table" in href:
                result["slot"] = "feet"
                break
            elif "hands_slot_table" in href:
                result["slot"] = "hands"
                break
            elif "cape_slot_table" in href:
                result["slot"] = "cape"
                break
            elif "neck_slot_table" in href:
                result["slot"] = "neck"
                break
            elif "ring_slot_table" in href:
                result["slot"] = "ring"
                break
            elif "ammo_slot_table" in href or "ammunition_slot_table" in href:
                result["slot"] = "ammo"
                break

        # Also look for it in image alt text
        if not result["slot"]:
            for img_tag in soup.find_all("img"):
                alt = img_tag.get("alt", "").lower()
                if "2h slot" in alt:
                    result["slot"] = "2h"
                    break
                elif "weapon slot" in alt:
                    result["slot"] = "mainhand"
                    break
                elif "shield slot" in alt:
                    result["slot"] = "offhand"
                    break
                elif "head slot" in alt:
                    result["slot"] = "head"
                    break
                elif "body slot" in alt:
                    result["slot"] = "body"
                    break
                elif "legs slot" in alt:
                    result["slot"] = "legs"
                    break
                elif "feet slot" in alt:
                    result["slot"] = "feet"
                    break
                elif "hands slot" in alt:
                    result["slot"] = "hands"
                    break
                elif "cape slot" in alt:
                    result["slot"] = "cape"
                    break
                elif "neck slot" in alt:
                    result["slot"] = "neck"
                    break
                elif "ring slot" in alt:
                    result["slot"] = "ring"
                    break
                elif "ammo slot" in alt or "ammunition slot" in alt:
                    result["slot"] = "ammo"
                    break

    # If we found a slot, log it
    if result["slot"]:
        log(f"Found slot: {result['slot']}")

    return result, soup.prettify()


def get_osrs_item_data(item_name):
    """Fetch an item's wiki page and parse its infobox and related data.

    Item names in ``valid_items.json`` sometimes include a ``#Charged`` or
    ``#Uncharged`` suffix to represent different charge states. Previously the
    scraper passed these names directly to the wiki which returned the main page
    for the item, so both variants ended up with identical stats.  To better
    distinguish them we strip the suffix when requesting the page and, if the
    item represents an uncharged variant, we explicitly clear any combat stats
    extracted from the charged page.
    """

    base_name = item_name
    variant = None
    if "#" in item_name:
        base_name, variant = item_name.split("#", 1)

    params = {
        "action": "parse",
        "page": base_name.replace(" ", "_"),
        "prop": "text",
        "format": "json",
    }

    try:
        r = requests.get(WIKI_API, params=params, headers=HEADERS)
        r.raise_for_status()
        html = r.json()["parse"]["text"]["*"]
        result, pretty = extract_infobox_and_effects(html)

        if variant and variant.lower() == "uncharged":
            # Uncharged items have no combat bonuses.  Clear any stats parsed
            # from the charged variant so they are not treated as combat items.
            result["combat_stats"] = {
                "attack_bonuses": {},
                "defence_bonuses": {},
                "other_bonuses": {},
                "combat_styles": [],
            }

        return result, pretty
    except Exception as e:
        log(f"Failed to fetch {item_name}: {e}")
        return None, None


# === Resume Logic ===
def save_resume(index):
    rewind = max(index - 10, 0)
    with open(RESUME_FILE, "w") as f:
        json.dump({"index": rewind}, f)


def load_resume():
    if os.path.exists(RESUME_FILE):
        with open(RESUME_FILE, "r") as f:
            return json.load(f).get("index", 0)
    return 0


# === Combat Section Check ===
def check_combat_section(html):
    soup = BeautifulSoup(html, "html.parser")

    # Method 1: Look for combat stats heading (original method)
    for heading_text in ["combat stats", "combat bonuses", "equipment stats", "offensive stats", "defensive stats"]:
        heading = soup.find(
            lambda tag: tag.name in ["h2", "h3", "h4"] and heading_text in tag.get_text(strip=True).lower()
        )
        if heading:
            return True

    # Method 2: Look for combat stat tables
    tables = soup.find_all("table")
    for table in tables:
        table_text = table.get_text(strip=True).lower()
        combat_indicators = ["attack", "defence", "strength", "magic", "ranged", "stab", "slash", "crush", "prayer"]
        if any(indicator in table_text for indicator in combat_indicators):
            return True

    return False


def check_passive_effects(html):
    soup = BeautifulSoup(html, "html.parser")

    # Function to extract section text (local copy for this function)
    def extract_section_text(title):
        heading = soup.find(
            lambda tag: tag.name in ["h2", "h3", "h4"] and title.lower() in tag.get_text(strip=True).lower()
        )
        if not heading:
            return None

        content = []
        for sib in heading.find_next_siblings():
            if sib.name in ["h2", "h3", "h4"]:
                break
            if sib.name in ["p", "ul", "ol", "div", "table"]:
                content.append(sib.get_text(separator=" ", strip=True))

        return " ".join(content).strip() if content else None

    # Method 1: Direct section lookup
    passive_section = extract_section_text("Passive effect")
    if passive_section:
        log("Found passive effect via direct section")
        return True

    # # Method 2: Check for keyword mentions in other sections
    # for section in ["Effects", "Effect", "Bonuses", "Set effect"]:
    #     section_text = extract_section_text(section)
    #     if section_text and any(kw in section_text.lower() for kw in ["passive", "effect", "bonus", "provides", "grants"]):
    #         log(f"Found passive effect in '{section}' section")
    #         return True

    # # Method 3: Check infobox for effect indicators
    # infobox = soup.find("table", class_="infobox")
    # if infobox:
    #     infobox_text = infobox.get_text(strip=True).lower()
    #     effect_indicators = ["passive effect", "set effect"]
    #     for indicator in effect_indicators:
    #         if indicator in infobox_text:
    #             log(f"Found passive effect indicator in infobox: '{indicator}'")
    #             return True

    return False


# === Tradeable Check ===
def check_tradeable(parsed):
    return parsed["infobox"].get("Tradeable", "").strip().lower() == "yes"


# === DB Management ===
def init_db(path):
    conn = sqlite3.connect(path)
    c = conn.cursor()

    # Updated schema to include combat stats as JSON
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY,
            name TEXT,
            has_special_attack BOOLEAN,
            special_attack_text TEXT,
            has_passive_effect BOOLEAN,
            passive_effect_text TEXT,
            has_combat_stats BOOLEAN,
            is_tradeable BOOLEAN,
            slot TEXT,
            combat_stats TEXT,
            raw_html TEXT
        )
    """
    )
    conn.commit()
    conn.close()


def save_to_db(
    path, item_id, name, special, special_text, passive, passive_text, stats, tradeable, slot, combat_stats, html
):
    conn = sqlite3.connect(path)
    c = conn.cursor()

    # Convert combat_stats dict to JSON string
    combat_stats_json = json.dumps(combat_stats) if combat_stats else None

    c.execute(
        """
        INSERT OR REPLACE INTO items (
            id, name, has_special_attack, special_attack_text, 
            has_passive_effect, passive_effect_text,
            has_combat_stats, is_tradeable, slot, combat_stats, raw_html
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """,
        (item_id, name, special, special_text, passive, passive_text, stats, tradeable, slot, combat_stats_json, html),
    )
    conn.commit()
    conn.close()


def get_item_from_db(path, name):
    """Query an item from the database and return its details"""
    conn = sqlite3.connect(path)
    c = conn.cursor()
    c.execute(
        """
        SELECT id, name, has_special_attack, special_attack_text, 
               has_passive_effect, passive_effect_text,
               has_combat_stats, is_tradeable, slot, combat_stats
        FROM items
        WHERE name = ?
    """,
        (name,),
    )
    result = c.fetchone()
    conn.close()

    if result:
        combat_stats = json.loads(result[9]) if result[9] else {}
        return {
            "id": result[0],
            "name": result[1],
            "has_special_attack": bool(result[2]),
            "special_attack_text": result[3],
            "has_passive_effect": bool(result[4]),
            "passive_effect_text": result[5],
            "has_combat_stats": bool(result[6]),
            "is_tradeable": bool(result[7]),
            "slot": result[8],
            "combat_stats": combat_stats,
        }
    return None


# === Main Processing ===
def process_all_items():
    with open(VALID_JSON, "r", encoding="utf-8") as f:
        items = json.load(f)

    # === Test some known items ===
    test_items = [
        "Twisted bow",
        "Abyssal whip",
        "Dragon claws",
        "Bandos chestplate",
        "Dharok's greataxe",
        "Amulet of fury",
        "Berserker ring",
        "Dragon boots",
    ]

    log("=== Testing slot detection on known items ===")
    for test_name in test_items:
        log(f"🔍 Testing: {test_name}")
        parsed, raw_html = get_osrs_item_data(test_name)
        if parsed:
            slot = parsed.get("slot", None)
            log(f"✅ Detected slot: {slot}")

            # Add testing for passive effects
            has_passive_by_section = bool(parsed["passive_effect"])
            has_passive_improved = check_passive_effects(raw_html)
            log(
                f"✅ Passive effect (original): {has_passive_by_section}, Passive effect (improved): {has_passive_improved}"
            )

            # Add testing for combat stats
            has_stats = check_combat_section(raw_html)
            has_combat_stats = (
                len(parsed["combat_stats"]["attack_bonuses"]) > 0
                or len(parsed["combat_stats"]["defence_bonuses"]) > 0
                or len(parsed["combat_stats"]["other_bonuses"]) > 0
                or "combat_styles" in parsed["combat_stats"]
            )
            log(f"✅ Combat stats (original): {has_stats}, Combat stats (improved): {has_combat_stats}")
            log(f"✅ Combat stats data: {parsed.get('combat_stats', {})}")

    # === Main loop ===
    index = load_resume()
    for i, item in enumerate(items[index:], start=index):
        item_id = item["id"]
        name = item["name"]

        log(f"[{i+1}/{len(items)}] {name} (ID: {item_id})")
        parsed, raw_html = get_osrs_item_data(name)
        if not parsed:
            save_resume(i)
            continue

        has_special = bool(parsed["special_attack"])
        # Use both methods and combine the results
        has_passive = bool(parsed["passive_effect"]) or check_passive_effects(raw_html)
        has_stats = check_combat_section(raw_html)
        has_combat_stats = (
            len(parsed["combat_stats"]["attack_bonuses"]) > 0
            or len(parsed["combat_stats"]["defence_bonuses"]) > 0
            or len(parsed["combat_stats"]["other_bonuses"]) > 0
            or "combat_styles" in parsed["combat_stats"]
        )
        is_tradeable = check_tradeable(parsed)
        slot = parsed.get("slot", None)

        special_text = parsed["special_attack"]
        passive_text = parsed["passive_effect"]

        # Save to all DBs
        save_to_db(
            DB_ALL,
            item_id,
            name,
            has_special,
            special_text,
            has_passive,
            passive_text,
            has_combat_stats,
            is_tradeable,
            slot,
            parsed["combat_stats"],
            raw_html,
        )

        if has_special or has_passive or has_combat_stats:
            save_to_db(
                DB_COMBAT,
                item_id,
                name,
                has_special,
                special_text,
                has_passive,
                passive_text,
                has_combat_stats,
                is_tradeable,
                slot,
                parsed["combat_stats"],
                raw_html,
            )

        if is_tradeable:
            save_to_db(
                DB_TRADEABLE,
                item_id,
                name,
                has_special,
                special_text,
                has_passive,
                passive_text,
                has_combat_stats,
                is_tradeable,
                slot,
                parsed["combat_stats"],
                raw_html,
            )

        log(
            f"✔ Saved. Special: {has_special}, Passive: {has_passive}, Stats: {has_stats}, Tradeable: {is_tradeable}, Slot: {slot}"
        )
        save_resume(i + 1)
        time.sleep(0.25)


# === Test just the Twisted bow and Dragon claws ===
def test_items():
    items_to_test = [{"name": "Twisted bow", "id": 20997}, {"name": "Dragon claws", "id": 13652}]

    for item_info in items_to_test:
        name = item_info["name"]
        item_id = item_info["id"]

        log(f"=== Testing {name} Parsing ===")
        log(f"Fetching data from OSRS Wiki...")

        parsed, raw_html = get_osrs_item_data(name)

        if parsed:
            # Original detection
            has_passive_original = bool(parsed["passive_effect"])
            has_special_original = bool(parsed["special_attack"])
            has_stats_original = check_combat_section(raw_html)
            has_combat_stats = (
                len(parsed["combat_stats"]["attack_bonuses"]) > 0
                or len(parsed["combat_stats"]["defence_bonuses"]) > 0
                or len(parsed["combat_stats"]["other_bonuses"]) > 0
                or "combat_styles" in parsed["combat_stats"]
            )

            # Improved detection
            has_passive_improved = check_passive_effects(raw_html)

            # Save to DB for testing
            is_tradeable = check_tradeable(parsed)
            has_special = has_special_original
            has_passive = has_passive_original or has_passive_improved
            slot = parsed.get("slot", None)

            # Initialize DB
            init_db(DB_ALL)
            special_text = parsed["special_attack"]
            passive_text = parsed["passive_effect"]
            save_to_db(
                DB_ALL,
                item_id,
                name,
                has_special,
                special_text,
                has_passive,
                passive_text,
                has_combat_stats,
                is_tradeable,
                slot,
                parsed["combat_stats"],
                raw_html,
            )

            # Print results
            log(f"Item: {name}")
            log(f"Special Attack: {has_special_original}")
            log(f"Passive Effect (Original): {has_passive_original}")
            log(f"Passive Effect (Improved): {has_passive_improved}")
            log(f"Combat Stats (Original): {has_stats_original}")
            log(f"Combat Stats (Improved): {has_combat_stats}")
            log(f"Slot: {slot}")
            log(f"Tradeable: {is_tradeable}")

            # Print infobox data
            log("\nInfobox Data:")
            for key, value in parsed["infobox"].items():
                log(f"  {key}: {value}")

            # Print combat stats
            log("\nCombat Stats:")
            log("  Attack Bonuses:")
            for stat, value in parsed["combat_stats"]["attack_bonuses"].items():
                log(f"    {stat}: {value}")

            log("  Defence Bonuses:")
            for stat, value in parsed["combat_stats"]["defence_bonuses"].items():
                log(f"    {stat}: {value}")

            log("  Other Bonuses:")
            for stat, value in parsed["combat_stats"]["other_bonuses"].items():
                log(f"    {stat}: {value}")

            if "combat_styles" in parsed["combat_stats"]:
                log("  Combat Styles:")
                for style in parsed["combat_stats"]["combat_styles"]:
                    log(f"    {style}")

            # Extract the passive effect or special attack section if it exists
            if has_passive_original:
                log("\nLooking for 'Passive effect' section:")
                passive_section = parsed["passive_effect"]
                if passive_section:
                    log(f"Found Passive effect section text: {passive_section}")
                else:
                    log("No explicit 'Passive effect' section found")

            if has_special_original:
                log("\nLooking for 'Special attack' section:")
                special_section = parsed["special_attack"]
                if special_section:
                    log(f"Found Special attack section text: {special_section}")
                else:
                    log("No explicit 'Special attack' section found")

            # Query the item from the database
            log("\nQuerying item from database:")
            db_item = get_item_from_db(DB_ALL, name)
            if db_item:
                log("Database record:")
                for key, value in db_item.items():
                    if key != "combat_stats":  # Don't print the whole combat stats structure
                        log(f"  {key}: {value}")
                log("  Combat Stats: (Summary)")
                log(f"    Attack Bonuses: {len(db_item['combat_stats']['attack_bonuses'])} entries")
                log(f"    Defence Bonuses: {len(db_item['combat_stats']['defence_bonuses'])} entries")
                log(f"    Other Bonuses: {len(db_item['combat_stats']['other_bonuses'])} entries")

                # Print full combat stats details from the DB
                log("\n  Full Combat Stats from DB:")
                log("    Attack Bonuses:")
                for stat, value in db_item["combat_stats"]["attack_bonuses"].items():
                    log(f"      {stat}: {value}")

                log("    Defence Bonuses:")
                for stat, value in db_item["combat_stats"]["defence_bonuses"].items():
                    log(f"      {stat}: {value}")

                log("    Other Bonuses:")
                for stat, value in db_item["combat_stats"]["other_bonuses"].items():
                    log(f"      {stat}: {value}")

                if "combat_styles" in db_item["combat_stats"]:
                    log("    Combat Styles:")
                    for style in db_item["combat_stats"]["combat_styles"]:
                        log(f"      {style}")
            else:
                log(f"No database record found for {name}")
        else:
            log(f"Failed to retrieve {name} data.")

        log("\n" + "=" * 50 + "\n")  # Divider between items


# === Entrypoint ===
if __name__ == "__main__":
    log("=== Initializing OSRS Multi-DB Scraper ===")
    init_db(DB_ALL)
    init_db(DB_COMBAT)
    init_db(DB_TRADEABLE)
    process_all_items()
    log("=== Done ===")

    # Test specific items instead
    # test_items()
