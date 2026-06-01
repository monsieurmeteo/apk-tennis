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
            for idx, e in enumerate(events[:10]):
                home = e.get('homeTeam', {}).get('name')
                away = e.get('awayTeam', {}).get('name')
                hs = e.get('homeScore', {})
                as_ = e.get('awayScore', {})
                status = e.get('status', {})
                print(f"\n[{idx}] {home} vs {away}")
                print(f"  Status: {status}")
                print(f"  homeScore: {hs}")
                print(f"  awayScore: {as_}")
        except Exception as ex:
            print(f"❌ Error: {ex}")
        finally:
            browser.close()

if __name__ == "__main__":
    main()
