from playwright.sync_api import sync_playwright
import json

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
            for e in events:
                hs = e.get('homeScore', {})
                as_ = e.get('awayScore', {})
                # Find an event where a point is playing (e.g. 15, 30, 40, A, etc.)
                hp = str(hs.get('point', ''))
                ap = str(as_.get('point', ''))
                if hp in ['15', '30', '40', 'A'] or ap in ['15', '30', '40', 'A']:
                    print(f"Match found: {e.get('homeTeam', {}).get('name')} vs {e.get('awayTeam', {}).get('name')}")
                    print(json.dumps(e, indent=2))
                    break
            else:
                if events:
                    print("No event with active points found. Printing first live event:")
                    print(json.dumps(events[0], indent=2))
        except Exception as ex:
            print(f"❌ Error: {ex}")
        finally:
            browser.close()

if __name__ == "__main__":
    main()
