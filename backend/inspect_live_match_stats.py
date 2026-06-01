from playwright.sync_api import sync_playwright
import json

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        try:
            # Let's query the statistics of Auger-Aliassime vs Tabilo (ID: 16198519)
            url = "https://api.sofascore.com/api/v1/event/16198519/statistics"
            print(f"🚀 Fetching live statistics from {url}...")
            page.goto(url, wait_until="domcontentloaded")
            page.wait_for_timeout(3000)
            content = page.locator("body").inner_text()
            data = json.loads(content)
            print("Statistics keys:", list(data.keys()))
            if 'statistics' in data:
                stats = data['statistics']
                print(f"Found {len(stats)} periods of statistics.")
                for period in stats:
                    print(f"\nPeriod: {period.get('period')}")
                    groups = period.get('groups', [])
                    for g in groups:
                        print(f"  Group: {g.get('groupName')}")
                        items = g.get('statisticsItems', [])
                        for item in items[:5]:
                            name = item.get('name')
                            home = item.get('home')
                            away = item.get('away')
                            print(f"    - {name}: {home} vs {away}")
            else:
                print("No statistics key found in JSON response:", data)
        except Exception as ex:
            print(f"❌ Error: {ex}")
        finally:
            browser.close()

if __name__ == "__main__":
    main()
