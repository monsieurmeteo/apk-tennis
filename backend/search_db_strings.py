import os

def search_files(directory, query):
    found = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.py', '.sh', '.yml', '.yaml')):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        if query in content:
                            found.append(path)
                except Exception as e:
                    pass
    return found

def main():
    terms = ['DATABASE_URL', 'postgresql://', 'postgres.']
    for term in terms:
        results = search_files('c:\\Users\\grego\\Documents\\apk tennis', term)
        print(f"Results for '{term}':")
        for r in results:
            # Skip node_modules or cache files
            if 'node_modules' not in r and '.next' not in r:
                print(f"  - {r}")

if __name__ == "__main__":
    main()
