"""
OSRS Passive Effects Scraper v1.2 (Fixed)

This scraper extracts passive effects data from the Old School RuneScape wiki.
Fixed version with improved validation that doesn't filter out too much valid data.
"""

import requests
import time
import logging
import json
import os
import re
from bs4 import BeautifulSoup
from typing import Dict, Any, Optional, List

# === Config ===
WIKI_API = "https://oldschool.runescape.wiki/api.php"
WIKI_BASE = "https://oldschool.runescape.wiki"
HEADERS = {"User-Agent": "osrs-passive-effects-scraper/1.2 (https://example.com; contact@example.com)"}

OUTPUT_JSON = "osrs_passive_effects_v1_2.json"

# === Logging ===
logging.basicConfig(
    filename="passive_effects_scraper.log", 
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

def get_passive_effects_from_main_page():
    """Extract passive effects data from the main passive effects page"""
    url = "https://oldschool.runescape.wiki/w/Passive_effect"
    
    try:
        response = requests.get(url, headers=HEADERS)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, "html.parser")
        
        passive_effects = []
        
        # Find the main content area
        main_content = soup.find("div", {"id": "mw-content-text"})
        if not main_content:
            main_content = soup.find("div", class_="mw-parser-output")
        if not main_content:
            log("Could not find main content area")
            return []
        
        # Remove unwanted elements
        for unwanted in main_content.find_all(["div"], class_=["navbox", "mw-references-wrap", "printfooter"]):
            unwanted.decompose()
        for unwanted in main_content.find_all(["table"], class_=["navbox", "ambox"]):
            unwanted.decompose()
            
        # Find all tables that contain passive effects data
        tables = main_content.find_all("table", class_="wikitable")
        
        for table in tables:
            log(f"Processing table...")
            
            # Get table headers
            headers = []
            header_row = table.find("tr")
            if header_row:
                for th in header_row.find_all(["th", "td"]):
                    header_text = clean_text(th.get_text(strip=True)).lower()
                    headers.append(header_text)
            
            log(f"Table headers: {headers}")
            
            # Skip tables that are clearly not passive effects data
            if not headers or len(headers) < 2:
                continue
                
            # Look for tables with relevant headers - more flexible matching
            has_item_column = any("item" in h or "equipment" in h or "name" in h or "weapon" in h or "armour" in h or "jewellery" in h for h in headers)
            has_effect_column = any("effect" in h or "passive" in h or "bonus" in h or "description" in h for h in headers)
            
            if not (has_item_column and has_effect_column):
                log(f"Skipping table - missing required columns (needs item+effect columns)")
                continue
            
            log(f"Found valid passive effects table with headers: {headers}")
            
            # Extract data from table rows
            rows = table.find_all("tr")[1:]  # Skip header row
            for row_idx, row in enumerate(rows):
                cells = row.find_all(["td", "th"])
                if len(cells) >= 2:
                    passive_effect = extract_passive_effect_from_row(cells, headers)
                    if passive_effect:
                        passive_effects.append(passive_effect)
                        log(f"✅ Extracted: {passive_effect['item_name']}")
        
        # Look for structured content sections (like subsections with specific items)
        sections = main_content.find_all(["h2", "h3", "h4"])
        for section in sections:
            section_title = clean_text(section.get_text()).lower()
            
            # Skip navigation and non-content sections
            if any(skip in section_title for skip in ["contents", "navigation", "tools", "views", "external", "reference"]):
                continue
                
            # Look for equipment/item sections
            if any(keyword in section_title for keyword in ["armour", "weapon", "jewellery", "equipment", "set"]):
                log(f"Processing section: {section_title}")
                
                # Get content after this heading until next heading
                content_elements = []
                current = section.find_next_sibling()
                
                while current and current.name not in ["h1", "h2", "h3", "h4"]:
                    if current.name in ["p", "ul", "ol", "table"]:
                        content_elements.append(current)
                    current = current.find_next_sibling()
                
                # Extract passive effects from this section
                for element in content_elements:
                    if element.name == "table" and "wikitable" in element.get("class", []):
                        # Process tables in sections
                        rows = element.find_all("tr")
                        if len(rows) > 1:  # Has header + data
                            header_row = rows[0]
                            headers = [clean_text(th.get_text()).lower() for th in header_row.find_all(["th", "td"])]
                            
                            for row in rows[1:]:
                                cells = row.find_all(["td", "th"])
                                if len(cells) >= 2:
                                    passive_effect = extract_passive_effect_from_row(cells, headers)
                                    if passive_effect:
                                        passive_effects.append(passive_effect)
                                        log(f"✅ From section '{section_title}': {passive_effect['item_name']}")
                    
                    elif element.name in ["ul", "ol"]:
                        # Process lists in sections
                        items = element.find_all("li")
                        for item in items:
                            passive_effect = extract_passive_effect_from_list_item(item, section_title)
                            if passive_effect:
                                passive_effects.append(passive_effect)
                                log(f"✅ From list in '{section_title}': {passive_effect['item_name']}")
        
        return passive_effects
        
    except Exception as e:
        log(f"Failed to fetch passive effects from main page: {e}")
        return []

def extract_passive_effect_from_row(cells, headers):
    """Extract passive effect data from a table row"""
    try:
        passive_effect = {
            "item_name": "",
            "effect_description": "",
            "effect_type": "",
            "requirements": [],
            "stackable": None,
            "icon_url": None,
            "wiki_url": None
        }
        
        # Map common header patterns to our data structure
        header_mapping = {
            "item": "item_name",
            "equipment": "item_name", 
            "name": "item_name",
            "weapon": "item_name",
            "armour": "item_name",
            "armor": "item_name",
            "jewellery": "item_name",
            "effect": "effect_description",
            "passive effect": "effect_description",
            "description": "effect_description",
            "bonus": "effect_description",
            "ability": "effect_description",
            "type": "effect_type",
            "requirement": "requirements",
            "requirements": "requirements"
        }
        
        for i, cell in enumerate(cells):
            if i < len(headers):
                header = headers[i]
                cell_text = clean_text(cell.get_text(strip=True))
                
                # Skip empty cells or cells with just numbers/symbols
                if not cell_text or cell_text in ["", "-", "—", "N/A", "n/a"]:
                    continue
                
                # Find matching header
                matched_field = None
                for pattern, field in header_mapping.items():
                    if pattern in header:
                        matched_field = field
                        break
                
                if matched_field:
                    if matched_field == "requirements" and cell_text:
                        # Parse requirements
                        passive_effect[matched_field] = parse_requirements(cell_text)
                    else:
                        # Clean up the text before storing
                        if matched_field == "item_name":
                            # For item names, remove any leading numbers or formatting
                            cleaned_name = re.sub(r'^[\d\.\s]+', '', cell_text).strip()
                            if len(cleaned_name) > 1:
                                passive_effect[matched_field] = cleaned_name
                        else:
                            passive_effect[matched_field] = cell_text
                
                # Extract links and images regardless of header matching
                link = cell.find("a")
                if link and link.get("href") and not passive_effect["wiki_url"]:
                    href = link.get("href")
                    # Skip navigation and edit links
                    navigation_patterns = ["edit", "talk:", "user:", "category:", "special:", "file:", "help:"]
                    if not any(skip in href.lower() for skip in navigation_patterns):
                        if href.startswith("/"):
                            passive_effect["wiki_url"] = WIKI_BASE + href
                        elif href.startswith("http"):
                            passive_effect["wiki_url"] = href
                        
                        # If we don't have an item name yet, try to get it from the link
                        if not passive_effect["item_name"]:
                            link_text = clean_text(link.get_text(strip=True))
                            if link_text and len(link_text) > 1:
                                passive_effect["item_name"] = link_text
                
                img = cell.find("img")
                if img and img.get("src") and not passive_effect["icon_url"]:
                    src = img.get("src")
                    if src.startswith("//"):
                        passive_effect["icon_url"] = "https:" + src
                    elif src.startswith("/"):
                        passive_effect["icon_url"] = WIKI_BASE + src
                    else:
                        passive_effect["icon_url"] = src
        
        # Basic validation - just check we have the essentials
        if passive_effect["item_name"] and passive_effect["effect_description"]:
            # Skip obvious junk - more targeted filtering
            item_name = passive_effect["item_name"].lower()
            if any(skip in item_name for skip in ["edit source", "view source", "discussion"]):
                return None
            
            # Parse additional effect properties
            passive_effect = parse_effect_properties(passive_effect)
            return passive_effect
        
        return None
        
    except Exception as e:
        log(f"Error extracting passive effect from row: {e}")
        return None

def extract_passive_effect_from_list_item(item, section_context=""):
    """Extract passive effect from a list item - much more aggressive extraction"""
    try:
        text = clean_text(item.get_text(strip=True))
        if not text or len(text) < 3:
            return None
        
        passive_effect = {
            "item_name": "",
            "effect_description": "",
            "effect_type": "",
            "requirements": [],
            "stackable": None,
            "icon_url": None,
            "wiki_url": None,
            "section": section_context
        }
        
        # Try to extract item name from the first link
        link = item.find("a")
        if link:
            item_name = clean_text(link.get_text(strip=True))
            if item_name and len(item_name) > 1:
                passive_effect["item_name"] = item_name
                href = link.get("href")
                if href:
                    if href.startswith("/"):
                        passive_effect["wiki_url"] = WIKI_BASE + href
                    elif href.startswith("http"):
                        passive_effect["wiki_url"] = href
                
                # Set a placeholder description indicating we need to get the actual effect
                passive_effect["effect_description"] = f"Passive effect for {item_name} (from {section_context} section)"
        
        # If no link found, try to extract from bold text
        if not passive_effect["item_name"]:
            bold = item.find(["b", "strong"])
            if bold:
                item_name = clean_text(bold.get_text(strip=True))
                if item_name and len(item_name) > 1:
                    passive_effect["item_name"] = item_name
                    passive_effect["effect_description"] = f"Passive effect for {item_name} (from {section_context} section)"
        
        # If still no item name, try to extract from the text itself
        if not passive_effect["item_name"] and text:
            # For list items, the entire text might be the item name
            if len(text) < 100:  # Reasonable item name length
                passive_effect["item_name"] = text
                passive_effect["effect_description"] = f"Passive effect for {text} (from {section_context} section)"
        
        # Extract icon if present
        img = item.find("img")
        if img and img.get("src"):
            src = img.get("src")
            if src.startswith("//"):
                passive_effect["icon_url"] = "https:" + src
            elif src.startswith("/"):
                passive_effect["icon_url"] = WIKI_BASE + src
        
        # Return if we have any item name at all
        if passive_effect["item_name"]:
            # Mark that we need to fetch the actual effect description
            passive_effect["needs_effect_fetch"] = True
            passive_effect = parse_effect_properties(passive_effect)
            return passive_effect
        
        return None
        
    except Exception as e:
        log(f"Error extracting passive effect from list item: {e}")
        return None

def parse_requirements(req_text):
    """Parse requirements text into structured data"""
    if not req_text:
        return []
    
    requirements = []
    
    # Common requirement patterns
    level_pattern = r'(\d+)\s*(attack|defence|strength|ranged|magic|prayer|hitpoints|slayer|crafting|smithing|mining|fishing|cooking|firemaking|woodcutting|fletching|herblore|thieving|agility|runecraft|farming|construction|hunter)'
    quest_pattern = r'(completion of|completed)\s+([^,\.]+)'
    
    # Extract level requirements
    for match in re.finditer(level_pattern, req_text.lower()):
        level = int(match.group(1))
        skill = match.group(2).title()
        requirements.append({
            "type": "skill",
            "skill": skill,
            "level": level
        })
    
    # Extract quest requirements
    for match in re.finditer(quest_pattern, req_text.lower()):
        quest_name = match.group(2).strip()
        requirements.append({
            "type": "quest",
            "quest": quest_name.title()
        })
    
    # If no structured requirements found, store as text
    if not requirements and req_text.strip():
        requirements.append({
            "type": "other",
            "description": req_text.strip()
        })
    
    return requirements

def parse_effect_properties(passive_effect):
    """Parse additional properties from the effect description"""
    effect_text = passive_effect["effect_description"].lower()
    
    # Determine effect type based on keywords
    effect_types = {
        "combat": ["damage", "hit", "attack", "defence", "accuracy", "strength"],
        "skill": ["experience", "xp", "skill", "level", "boost"],
        "utility": ["teleport", "prayer", "run energy", "weight", "inventory"],
        "special": ["chance", "proc", "trigger", "activate"],
        "defensive": ["block", "reduce", "absorb", "protect", "immune"],
        "offensive": ["increase", "bonus", "extra", "additional", "more"]
    }
    
    for effect_type, keywords in effect_types.items():
        if any(keyword in effect_text for keyword in keywords):
            if not passive_effect["effect_type"]:
                passive_effect["effect_type"] = effect_type
            break
    
    # Check if effect is stackable
    stackable_keywords = ["stack", "stacks", "stackable", "multiple"]
    non_stackable_keywords = ["does not stack", "doesn't stack", "non-stackable", "unique"]
    
    if any(keyword in effect_text for keyword in non_stackable_keywords):
        passive_effect["stackable"] = False
    elif any(keyword in effect_text for keyword in stackable_keywords):
        passive_effect["stackable"] = True
    
    # Extract numerical values
    passive_effect["numerical_values"] = extract_numerical_values(effect_text)
    
    # Extract percentages
    percentage_pattern = r'(\d+(?:\.\d+)?)\s*%'
    percentages = re.findall(percentage_pattern, effect_text)
    if percentages:
        passive_effect["percentages"] = [float(p) for p in percentages]
    
    return passive_effect

def extract_numerical_values(text):
    """Extract numerical values and their context from text"""
    values = []
    
    # Pattern for numbers with potential context
    number_pattern = r'(\d+(?:\.\d+)?)\s*([a-zA-Z%]*)'
    
    for match in re.finditer(number_pattern, text):
        number = float(match.group(1)) if '.' in match.group(1) else int(match.group(1))
        unit = match.group(2).strip()
        
        if unit or number > 0:  # Include all numbers with units, or positive numbers
            values.append({
                "value": number,
                "unit": unit,
                "context": get_number_context(text, match.start(), match.end())
            })
    
    return values

def get_number_context(text, start, end):
    """Get context around a number in text"""
    # Get 20 characters before and after the number
    context_start = max(0, start - 20)
    context_end = min(len(text), end + 20)
    context = text[context_start:context_end].strip()
    return clean_text(context)

def validate_and_clean_passive_effects(passive_effects, debug_mode=False):
    """Validate and clean the extracted passive effects data - VERY minimal filtering"""
    cleaned_effects = []
    
    for effect in passive_effects:
        # Get basic info
        item_name = effect.get("item_name", "")
        effect_desc = effect.get("effect_description", "")
        
        if debug_mode:
            log(f"Checking: '{item_name}' | '{effect_desc[:50]}...'")
        
        # Only check that we have an item name - that's it!
        if not item_name or len(item_name) < 2:
            if debug_mode:
                log(f"  → FILTERED: Missing or too short item name")
            continue
            
        # Skip only the most obvious navigation pages
        navigation_keywords = ["edit source", "view source", "privacy policy", "terms of use"]
        
        if any(skip in item_name.lower() for skip in navigation_keywords):
            if debug_mode:
                log(f"  → FILTERED: Navigation page")
            continue
        
        # Clean up the item name - remove leading numbers
        cleaned_name = re.sub(r'^[\d\.\s]+', '', item_name).strip()
        if cleaned_name:
            effect["item_name"] = cleaned_name
        
        # If no effect description, create a placeholder
        if not effect_desc or len(effect_desc) < 10:
            effect["effect_description"] = f"Has a passive effect (details need to be fetched from wiki page)"
            effect["needs_effect_fetch"] = True
        else:
            effect["effect_description"] = clean_text(effect_desc)
        
        cleaned_effects.append(effect)
        if debug_mode:
            log(f"  → KEPT: {effect['item_name']}")
        
    return cleaned_effects

def save_passive_effects_json(passive_effects):
    """Save all passive effects to JSON file"""
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(passive_effects, f, indent=2, ensure_ascii=False)
    log(f"Saved {len(passive_effects)} passive effects to {OUTPUT_JSON}")

def load_existing_data():
    """Load existing JSON data if it exists"""
    if os.path.exists(OUTPUT_JSON):
        try:
            with open(OUTPUT_JSON, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []
    return []

def fetch_passive_effect_details(item_name, wiki_url=None):
    """Fetch the actual passive effect description from an item's wiki page"""
    if not wiki_url:
        # Construct wiki URL from item name
        wiki_page = item_name.replace(" ", "_")
        wiki_url = f"https://oldschool.runescape.wiki/w/{wiki_page}"
    
    try:
        params = {
            "action": "parse",
            "page": item_name.replace(" ", "_"),
            "prop": "text",
            "format": "json",
        }
        
        r = requests.get(WIKI_API, params=params, headers=HEADERS)
        r.raise_for_status()
        html = r.json()["parse"]["text"]["*"]
        
        soup = BeautifulSoup(html, "html.parser")
        
        # Look for passive effect information in various places
        effect_text = ""
        
        # Check for explicit passive effect sections
        for heading in soup.find_all(["h2", "h3", "h4"]):
            heading_text = heading.get_text().lower()
            if "passive" in heading_text or "effect" in heading_text:
                # Get content after this heading
                content = []
                for sibling in heading.find_next_siblings():
                    if sibling.name in ["h2", "h3", "h4"]:
                        break
                    if sibling.name in ["p", "ul", "ol", "div"]:
                        content.append(sibling.get_text(separator=" ", strip=True))
                
                if content:
                    effect_text = " ".join(content).strip()
                    break
        
        # If no dedicated section, look in the main content
        if not effect_text:
            # Look for sentences mentioning passive effects
            text_content = soup.get_text()
            sentences = text_content.split('.')
            
            for sentence in sentences:
                sentence_lower = sentence.lower()
                if any(keyword in sentence_lower for keyword in ["passive", "effect", "when worn", "when equipped", "automatically"]):
                    if len(sentence.strip()) > 20:
                        effect_text = sentence.strip()
                        break
        
        # Clean and return the effect text
        if effect_text:
            return clean_text(effect_text)
        else:
            return f"Has a passive effect (specific details not found on wiki page)"
            
    except Exception as e:
        log(f"Failed to fetch passive effect for {item_name}: {e}")
        return f"Has a passive effect (failed to fetch details: {str(e)})"

def enhance_passive_effects_with_details(passive_effects):
    """Enhance passive effects that need their details fetched"""
    enhanced_effects = []
    
    for effect in passive_effects:
        if effect.get("needs_effect_fetch"):
            log(f"Fetching details for: {effect['item_name']}")
            
            # Fetch the actual effect description
            new_description = fetch_passive_effect_details(effect["item_name"], effect.get("wiki_url"))
            effect["effect_description"] = new_description
            
            # Remove the flag
            del effect["needs_effect_fetch"]
            
            # Re-parse the effect properties with the new description
            effect = parse_effect_properties(effect)
            
            time.sleep(0.3)  # Rate limiting
        
        enhanced_effects.append(effect)
    
    return enhanced_effects
    """Display a summary of the scraped passive effects data"""
    log(f"\nPassive Effects Dataset Summary:")
    log(f"Total items with passive effects: {len(passive_effects)}")
    
    # Categorize by effect type
    effect_types = {}
    for effect in passive_effects:
        effect_type = effect.get("effect_type", "unknown")
        if effect_type not in effect_types:
            effect_types[effect_type] = []
        effect_types[effect_type].append(effect["item_name"])
    
    log(f"\nEffect Types:")
    for effect_type, items in effect_types.items():
        log(f"  {effect_type.title()}: {len(items)} items")
        if len(items) <= 5:
            log(f"    Items: {', '.join(items)}")
        else:
            log(f"    Items: {', '.join(items[:3])} ... and {len(items) - 3} more")
    
    # Show sample entries
    log(f"\nSample Entries:")
    for i, effect in enumerate(passive_effects[:5]):
        log(f"\n  {i+1}. {effect['item_name']}")
        log(f"     Type: {effect.get('effect_type', 'Unknown')}")
        log(f"     Effect: {effect['effect_description'][:100]}...")

def main():
    """Main processing function"""
    log("=== OSRS Passive Effects Scraper v1.2 (Fixed) ===")
    
    print("\nChoose option:")
    print("1. Scrape with minimal filtering (recommended)")
    print("2. Debug mode - show what gets filtered out")
    
    choice = input("\nEnter choice (1-2): ").strip()
    
    debug_mode = choice == "2"
    
    log("Scraping from main passive effects page...")
    main_page_effects = get_passive_effects_from_main_page()
    log(f"Raw extraction found {len(main_page_effects)} potential effects")
    
    # Clean and validate the data with minimal filtering
    clean_main_effects = validate_and_clean_passive_effects(main_page_effects, debug_mode)
    log(f"After cleaning: {len(clean_main_effects)} valid passive effects")
    
    if not clean_main_effects:
        log("No valid passive effects found!")
        return
    
    # Remove duplicates based on item name (case insensitive)
    unique_effects = {}
    for effect in clean_main_effects:
        item_name_key = effect["item_name"].lower().strip()
        if item_name_key not in unique_effects:
            unique_effects[item_name_key] = effect
        else:
            # Keep the one with longer description
            if len(effect["effect_description"]) > len(unique_effects[item_name_key]["effect_description"]):
                unique_effects[item_name_key] = effect
    
    final_effects = list(unique_effects.values())
    
    # Sort by item name for consistency
    final_effects.sort(key=lambda x: x["item_name"].lower())
    
    # Add metadata
    for effect in final_effects:
        effect["last_updated"] = time.strftime("%Y-%m-%d %H:%M:%S")
        effect["scraper_version"] = "1.2"
    
    # Save results
    save_passive_effects_json(final_effects)
    
    log("=== Scraping Complete ===")
    display_summary(final_effects)

if __name__ == "__main__":
    main()