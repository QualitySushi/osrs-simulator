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
    response = requests.get(URL, headers=HEADERS)
    response.raise_for_status()
    
    soup = BeautifulSoup(response.text, "html.parser")
    items = []
    
    tables = soup.find_all("table", class_="wikitable")
    for table in tables:
        for row in table.find_all("tr"):
            cols = row.find_all("td")
            if len(cols) < 2:
                continue
                
            item_id_text = cols[0].get_text(strip=True)
            name = cols[1].get_text(strip=True)
            
            # Remove references like [1], [2], etc.
            name = re.sub(r"\[.*?\]", "", name).strip()
            
            try:
                item_id = int(item_id_text)
            except ValueError:
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
