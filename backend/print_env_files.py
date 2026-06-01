import os

def main():
    paths = [
        'c:\\Users\\grego\\Documents\\apk tennis\\backend\\.env',
        'c:\\Users\\grego\\Documents\\apk tennis\\tennis-app\\.env.local',
    ]
    for p in paths:
        if os.path.exists(p):
            print(f"File: {p}")
            try:
                with open(p, 'r') as f:
                    print(f.read())
            except Exception as e:
                print(f"Error: {e}")
        else:
            print(f"File not found: {p}")

if __name__ == "__main__":
    main()
