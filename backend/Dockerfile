# Utilise l'image Python officielle pré-configurée avec Playwright par Microsoft
FROM mcr.microsoft.com/playwright/python:v1.43.0-jammy

# Définit le dossier de travail
WORKDIR /app

# Copie le fichier de dépendances et l'installe
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copie l'ensemble des fichiers du backend
COPY . .

# Définit la commande pour exécuter le feeder en continu
CMD ["python", "supabase_feeder.py"]
