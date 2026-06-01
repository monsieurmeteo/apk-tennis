from playwright.sync_api import sync_playwright
import json

def inspect_recursive(obj, path=""):
    results = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            current_path = f"{path}.{k}" if path else k
            if "serve" in k.lower() or "serv" in k.lower():
                results.append((current_path, v))
            results.extend(inspect_recursive(v, current_path))
    elif isinstance(obj, list):
        for idx, item in enumerate(obj):
            results.extend(inspect_recursive(item, f"{path}[{idx}]"))
    return results

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        try:
            page.goto("https://api.sofascore.com/api/v1/sport/tennis/events/live", wait_until="domcontentloaded")
            page.wait_for_timeout(3000)
            content = page.locator("body").inner_text()
            data = json.loads(content)
            events = data.get('events', [])
            print(f"Total live events: {len(events)}")
            for idx, e in enumerate(events):
                matches = inspect_recursive(e)
                if matches:
                    home = e.get('homeTeam', {}).get('name')
                    away = e.get('awayTeam', {}).get('name')
                    print(f"\n🎾 Match: {home} vs {away}")
                    for path, val in matches:
                        print(f"  - {path}: {val}")
        except Exception as ex:
            print(f"❌ Error: {ex}")
        finally:
            browser.close()

if __name__ == "__main__":
    main()
