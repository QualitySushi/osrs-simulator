import json
import os
import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, unquote

URL = "https://oldschool.runescape.wiki/api.php?action=parse&page=NPC_IDs&prop=text&format=json"
WIKI_BASE = "https://oldschool.runescape.wiki"
HEADERS = {
    "User-Agent": "osrs-valid-npc-generator/1.0 (https://example.com; contact@example.com)"
}

def fetch_npcs() -> list[dict[str, int | str]]:
    """Fetch NPC IDs, names, and wiki links from the Old School RuneScape wiki."""
    print(f"Fetching from: {URL}")
    response = requests.get(URL, headers=HEADERS)
    response.raise_for_status()
    
    data = response.json()
    html = data["parse"]["text"]["*"]
    print(f"Response status: {response.status_code}")
    print(f"HTML length: {len(html)} characters")
    
    soup = BeautifulSoup(html, "html.parser")
    npcs = []
    
    # Debug: Check what tables we find
    tables = soup.find_all("table", class_="wikitable")
    print(f"Found {len(tables)} wikitable(s)")
    
    if not tables:
        # Try without class restriction
        all_tables = soup.find_all("table")
        print(f"Found {len(all_tables)} total table(s)")
        
        # Print first table content as sample
        if all_tables:
            print("First table preview:")
            print(str(all_tables[0])[:500] + "...")
            tables = all_tables
    
    for i, table in enumerate(tables):
        print(f"Processing table {i+1}")
        rows = table.find_all("tr")
        print(f"  Found {len(rows)} rows")
        
        # Check if this is a header row to understand the structure
        header_row = rows[0] if rows else None
        headers = []
        if header_row:
            header_cells = header_row.find_all(["th", "td"])
            headers = [cell.get_text(strip=True).lower() for cell in header_cells]
            print(f"  Headers: {headers}")
        
        # Determine column structure based on headers
        id_col = None
        name_col = None
        
        for idx, header in enumerate(headers):
            if "id" in header:
                id_col = idx
            elif "name" in header or "npc" in header:
                name_col = idx
        
        # If we can't determine from headers, assume standard format (name, id)
        if id_col is None or name_col is None:
            print(f"  Could not determine column structure from headers, assuming name=0, id=1")
            name_col = 0
            id_col = 1
        
        print(f"  Using columns - Name: {name_col}, ID: {id_col}")
        
        for j, row in enumerate(rows[1:], 1):  # Skip header row
            cols = row.find_all("td")
            if len(cols) < max(id_col + 1, name_col + 1):
                continue
            
            # Extract NPC name and potential link
            name_cell = cols[name_col]
            name_link = name_cell.find("a")
            
            if name_link and name_link.get("href"):
                # Extract name and wiki link
                name = name_link.get_text(strip=True)
                href = name_link.get("href")
                
                # Convert relative URL to absolute
                if href.startswith("/"):
                    wiki_url = urljoin(WIKI_BASE, href)
                else:
                    wiki_url = href
                
                # Decode URL and clean up
                wiki_url = unquote(wiki_url)
            else:
                # No link found, just get text
                name = name_cell.get_text(strip=True)
                wiki_url = None
            
            # Extract NPC ID
            id_cell = cols[id_col]
            npc_id_text = id_cell.get_text(strip=True)
            
            # Debug first few items
            if j <= 3:
                print(f"  Row {j}: ID='{npc_id_text}', Name='{name}', URL='{wiki_url}'")
            
            # Remove references like [1], [2], etc. from name
            name = re.sub(r"\[.*?\]", "", name).strip()
            
            # Remove any parenthetical disambiguations like (monster) for cleaner names
            # But keep important distinctions like level numbers
            name = re.sub(r"\s*\([^)]*monster[^)]*\)", "", name, flags=re.IGNORECASE).strip()
            
            # Skip if name is empty after cleaning
            if not name:
                continue
            
            # Parse NPC ID - handle ranges like "1-5" or single IDs
            npc_ids = []
            if "-" in npc_id_text and not npc_id_text.startswith("-"):
                # Handle ranges like "1-5"
                try:
                    parts = npc_id_text.split("-")
                    if len(parts) == 2:
                        start_id = int(parts[0].strip())
                        end_id = int(parts[1].strip())
                        npc_ids = list(range(start_id, end_id + 1))
                except ValueError:
                    if j <= 3:
                        print(f"    Skipped range (invalid format): '{npc_id_text}'")
                    continue
            else:
                # Handle single ID or comma-separated IDs
                id_parts = re.findall(r'\d+', npc_id_text)
                for id_part in id_parts:
                    try:
                        npc_ids.append(int(id_part))
                    except ValueError:
                        continue
            
            if not npc_ids:
                if j <= 3:
                    print(f"    Skipped (no valid IDs): '{npc_id_text}'")
                continue
            
            # Create entries for each NPC ID
            for npc_id in npc_ids:
                npc_entry = {
                    "id": npc_id,
                    "name": name,
                }
                
                if wiki_url:
                    npc_entry["wiki_url"] = wiki_url
                
                npcs.append(npc_entry)
    
    return npcs

def clean_and_deduplicate(npcs: list[dict]) -> list[dict]:
    """Clean and deduplicate the NPC list."""
    print(f"Cleaning and deduplicating {len(npcs)} NPCs...")
    
    # Remove duplicates based on ID
    seen_ids = set()
    cleaned_npcs = []
    
    for npc in npcs:
        npc_id = npc["id"]
        if npc_id not in seen_ids:
            seen_ids.add(npc_id)
            cleaned_npcs.append(npc)
    
    # Sort by ID for easier browsing
    cleaned_npcs.sort(key=lambda x: x["id"])
    
    print(f"After deduplication: {len(cleaned_npcs)} unique NPCs")
    return cleaned_npcs

def analyze_data(npcs: list[dict]) -> None:
    """Analyze the extracted NPC data."""
    print("\n=== Data Analysis ===")
    print(f"Total NPCs: {len(npcs)}")
    
    # Count NPCs with wiki URLs
    with_urls = sum(1 for npc in npcs if npc.get("wiki_url"))
    print(f"NPCs with wiki URLs: {with_urls} ({with_urls/len(npcs)*100:.1f}%)")
    
    # Show ID range
    if npcs:
        min_id = min(npc["id"] for npc in npcs)
        max_id = max(npc["id"] for npc in npcs)
        print(f"ID range: {min_id} - {max_id}")
    
    # Show some examples
    print("\nFirst 5 NPCs:")
    for npc in npcs[:5]:
        url_info = f" (URL: {npc.get('wiki_url', 'None')})" if npc.get('wiki_url') else " (No URL)"
        print(f"  ID {npc['id']}: {npc['name']}{url_info}")
    
    print("\nLast 5 NPCs:")
    for npc in npcs[-5:]:
        url_info = f" (URL: {npc.get('wiki_url', 'None')})" if npc.get('wiki_url') else " (No URL)"
        print(f"  ID {npc['id']}: {npc['name']}{url_info}")

def main() -> None:
    print("Fetching NPCs from OSRS Wiki...")
    npcs = fetch_npcs()
    print(f"Found {len(npcs)} total NPC entries")
    
    # Clean and deduplicate
    npcs = clean_and_deduplicate(npcs)
    
    # Analyze the data
    analyze_data(npcs)
    
    # Save to file
    path = os.path.join(os.path.dirname(__file__), "valid_npcs.json")
    print(f"\nWriting to {path}")
    
    with open(path, "w", encoding="utf-8") as f:
        json.dump(npcs, f, ensure_ascii=False, indent=2)
    
    print(f"Successfully wrote {len(npcs)} NPCs to valid_npcs.json")
    
    # Also create a summary file with just names and IDs for quick reference
    summary_path = os.path.join(os.path.dirname(__file__), "npc_summary.txt")
    with open(summary_path, "w", encoding="utf-8") as f:
        f.write("OSRS NPC ID Summary\n")
        f.write("==================\n\n")
        for npc in npcs:
            f.write(f"{npc['id']:5d}: {npc['name']}\n")
    
    print(f"Also created summary file: {summary_path}")

if __name__ == "__main__":
    main()