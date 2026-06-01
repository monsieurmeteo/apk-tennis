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
            print(f"Total live events: {len(events)}")
            for idx, e in enumerate(events):
                # Search for an event with points if possible
                hs = e.get('homeScore', {})
                as_ = e.get('awayScore', {})
                # Look for a match currently in a set and having points
                if hs.get('point') is not None or as_.get('point') is not None or 'serving' in e or 'servingTeam' in e:
                    print(f"\n🔍 Detailed Event: {e.get('homeTeam', {}).get('name')} vs {e.get('awayTeam', {}).get('name')}")
                    # Print all top-level keys
                    print("Top-level keys:", list(e.keys()))
                    # Check for serving info
                    for k in ['serving', 'servingTeam', 'lastPeriod', 'status']:
                        if k in e:
                            print(f"  {k}:", e[k])
                    print("  homeScore keys/values:", hs)
                    print("  awayScore keys/values:", as_)
                    # Check what is inside cards or extra stats if available
                    break
            else:
                # If none found, print the first one's keys
                if events:
                    e = events[0]
                    print(f"\n🔍 First Event: {e.get('homeTeam', {}).get('name')} vs {e.get('awayTeam', {}).get('name')}")
                    print("Top-level keys:", list(e.keys()))
                    print("  homeScore:", e.get('homeScore'))
                    print("  awayScore:", e.get('awayScore'))
        except Exception as ex:
            print(f"❌ Error: {ex}")
        finally:
            browser.close()

if __name__ == "__main__":
    main()
