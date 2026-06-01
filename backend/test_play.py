from playwright.sync_api import sync_playwright
import time
import json

def scrape_sofa():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        try:
            print("Going to SofaScore...")
            page.goto("https://api.sofascore.com/api/v1/sport/tennis/events/live", wait_until="domcontentloaded")
            time.sleep(3) # Wait for Cloudflare to challenge
            content = page.locator("body").inner_text()
            data = json.loads(content)
            events = data.get('events', [])
            print("Total Live Matches:", len(events))
        except Exception as e:
            print("Failed:", e)
        finally:
            browser.close()

if __name__ == "__main__":
    scrape_sofa()
