# Utilise une image Python ultra-légère (slim)
FROM python:3.10-slim

# Définit le dossier de travail dans le conteneur
WORKDIR /app

# Installe les dépendances légères nécessaires au feeder (y compris psycopg2-binary pour administrer la base de données en direct)
RUN pip install --no-cache-dir requests python-dotenv psycopg2-binary

# Copie l'ensemble des fichiers du backend
COPY . .

# Définit la commande pour exécuter le feeder en continu avec sortie non bufférisée
CMD ["python", "-u", "supabase_feeder.py"]
