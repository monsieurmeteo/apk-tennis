# Utilise l'image Python officielle pré-configurée avec Playwright par Microsoft
FROM mcr.microsoft.com/playwright/python:v1.43.0-jammy

# Définit le dossier de travail
WORKDIR /app

# Installe uniquement les dépendances légères nécessaires au feeder en épinglant la version pour correspondre aux navigateurs pré-installés
RUN pip install --no-cache-dir requests playwright==1.43.0 python-dotenv


# Copie l'ensemble des fichiers du backend
COPY . .

# Définit la commande pour exécuter le feeder en continu
CMD ["python", "supabase_feeder.py"]
