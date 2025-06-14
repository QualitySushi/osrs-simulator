import json
import os
import re
import requests
from bs4 import BeautifulSoup

URL = "https://oldschool.runescape.wiki/w/Item_IDs"
HEADERS = {
    "User-Agent": "osrs-valid-item-generator/1.0 (https://example.com; contact@example.com)"
}

def fetch_items() -> list[dict[str, int | str]]:
    """Fetch item IDs and names from the Old School RuneScape wiki."""
    print(f"Fetching from: {URL}")
    response = requests.get(URL, headers=HEADERS)
    response.raise_for_status()
    print(f"Response status: {response.status_code}")
    print(f"Response length: {len(response.text)} characters")
    
    soup = BeautifulSoup(response.text, "html.parser")
    items = []
    
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
    
    for i, table in enumerate(tables):
        print(f"Processing table {i+1}")
        rows = table.find_all("tr")
        print(f"  Found {len(rows)} rows")
        
        for j, row in enumerate(rows):
            cols = row.find_all("td")
            if len(cols) < 2:
                continue
                
            item_id_text = cols[1].get_text(strip=True)  # ID is in second column
            name = cols[0].get_text(strip=True)         # Name is in first column
            
            # Debug first few items
            if j < 3:
                print(f"  Row {j}: ID='{item_id_text}', Name='{name}'")
            
            # Remove references like [1], [2], etc.
            name = re.sub(r"\[.*?\]", "", name).strip()
            
            try:
                item_id = int(item_id_text)
            except ValueError:
                if j < 3:
                    print(f"    Skipped (invalid ID): '{item_id_text}'")
                continue
                
            items.append({"id": item_id, "name": name})
    
    return items

def main() -> None:
    print("Fetching items from OSRS Wiki...")
    items = fetch_items()
    print(f"Found {len(items)} items")
    
    path = os.path.join(os.path.dirname(__file__), "valid_items.json")
    print(f"Writing to {path}")
    
    with open(path, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    
    print(f"Successfully wrote {len(items)} items to valid_items.json")

if __name__ == "__main__":
    main()
