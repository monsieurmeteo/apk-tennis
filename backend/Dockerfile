# Utilise une image Python ultra-légère (slim)
FROM python:3.10-slim

# Définit le dossier de travail dans le conteneur
WORKDIR /app

# Installe uniquement les dépendances nécessaires à notre feeder ESPN (ultra rapide et sans Playwright)
RUN pip install --no-cache-dir requests python-dotenv

# Copie l'ensemble des fichiers du backend
COPY . .

# Définit la commande pour exécuter le feeder en continu avec sortie non bufférisée
CMD ["python", "-u", "supabase_feeder.py"]
