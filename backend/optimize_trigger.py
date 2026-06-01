import psycopg2
import os
from dotenv import load_dotenv

# Charger les variables d'environnement (.env local s'il existe)
load_dotenv()

SUPABASE_DB_URL = os.getenv("DATABASE_URL")

SQL = """
-- 1. Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trg_calculate_match_stats ON tennis_matches;

-- 2. Créer le trigger optimisé avec la clause WHEN
-- Ce trigger ne s'exécutera QUE lors de l'insertion ou si les noms des joueurs changent.
-- Il sera TOTALEMENT ignoré lors des simples mises à jour de scores ou de timestamps.
CREATE TRIGGER trg_calculate_match_stats
BEFORE INSERT OR UPDATE ON tennis_matches
FOR EACH ROW
WHEN (
  OLD IS NULL 
  OR OLD.player_a_name IS DISTINCT FROM NEW.player_a_name 
  OR OLD.player_b_name IS DISTINCT FROM NEW.player_b_name
)
EXECUTE FUNCTION calculate_match_stats();
"""

def main():
    print("🚀 Connexion à la base de données PostgreSQL de Supabase via le pooler...")
    try:
        conn = psycopg2.connect(SUPABASE_DB_URL, connect_timeout=15)
        cur = conn.cursor()
        print("💡 Connexion réussie. Optimisation du trigger 'trg_calculate_match_stats'...")
        cur.execute(SQL)
        conn.commit()
        print("✅ Le trigger a été optimisé avec succès via le pooler !")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ Erreur lors de l'application de l'optimisation : {e}")

if __name__ == "__main__":
    main()
