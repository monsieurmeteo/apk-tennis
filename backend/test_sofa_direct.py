import requests

def main():
    url = "https://api.sofascore.com/api/v1/event/16198519/statistics"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    print("Testing direct HTTP request to SofaScore API...")
    try:
        res = requests.get(url, headers=headers, timeout=5)
        print("Status Code:", res.status_code)
        if res.status_code == 200:
            print("✅ Success! SofaScore API is completely open!")
            print("Response Keys:", list(res.json().keys()))
        else:
            print("❌ Failed:", res.text[:200])
    except Exception as e:
        print("❌ Error:", e)

if __name__ == "__main__":
    main()
