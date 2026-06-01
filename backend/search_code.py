import os

def search_files(directory, query):
    found = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.py')):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        if query.lower() in content.lower():
                            found.append(path)
                except Exception as e:
                    pass
    return found

def main():
    for term in ['muller', 'hartel', 'osijek']:
        results = search_files('c:\\Users\\grego\\Documents\\apk tennis\\tennis-app', term)
        print(f"Results for '{term}':")
        for r in results:
            print(f"  - {r}")

if __name__ == "__main__":
    main()
