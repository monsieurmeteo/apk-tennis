import psycopg2
import os
from dotenv import load_dotenv

# Charger les variables d'environnement (.env local s'il existe)
load_dotenv()

DB_URL = os.getenv("DATABASE_URL")

SQL = """
CREATE OR REPLACE FUNCTION calculate_match_stats()
RETURNS TRIGGER AS $$
DECLARE
  last_a TEXT;
  last_b TEXT;
  surf TEXT;
  wins_a INT := 0;
  wins_b INT := 0;
  total_h2h INT := 0;
  form_wins_a INT := 0;
  form_total_a INT := 0;
  form_wins_b INT := 0;
  form_total_b INT := 0;
  surf_wins_a INT := 0;
  surf_losses_a INT := 0;
  surf_total_a INT := 0;
  surf_wins_b INT := 0;
  surf_losses_b INT := 0;
  surf_total_b INT := 0;
  
  weight_h2h FLOAT := 0;
  val_h2h FLOAT := 0.5;
  weight_form FLOAT := 0;
  val_form FLOAT := 0.5;
  weight_surf FLOAT := 0;
  val_surf FLOAT := 0.5;
  
  total_weight FLOAT := 0;
  raw_prob_a FLOAT := 0.5;
  balanced_prob_a FLOAT := 0.5;
  final_prob_a INT := 50;
  final_prob_b INT := 50;
BEGIN
  -- 1. Extract last names (handle edge cases)
  IF NEW.player_a_name IS NULL OR NEW.player_b_name IS NULL THEN
    RETURN NEW;
  END IF;
  
  last_a := lower(split_part(NEW.player_a_name, ' ', array_length(string_to_array(NEW.player_a_name, ' '), 1)));
  last_b := lower(split_part(NEW.player_b_name, ' ', array_length(string_to_array(NEW.player_b_name, ' '), 1)));

  -- 2. Detect surface
  IF lower(NEW.tournament) LIKE '%french open%' OR lower(NEW.tournament) LIKE '%roland garros%' OR lower(NEW.tournament) LIKE '%clay%' OR lower(NEW.tournament) LIKE '%terre%' OR lower(NEW.tournament) LIKE '%perugia%' OR lower(NEW.tournament) LIKE '%foggia%' OR lower(NEW.tournament) LIKE '%rome%' OR lower(NEW.tournament) LIKE '%madrid%' THEN
    surf := 'Clay';
  ELSIF lower(NEW.tournament) LIKE '%wimbledon%' OR lower(NEW.tournament) LIKE '%grass%' OR lower(NEW.tournament) LIKE '%gazon%' OR lower(NEW.tournament) LIKE '%halle%' OR lower(NEW.tournament) LIKE '%queen%' THEN
    surf := 'Grass';
  ELSE
    surf := 'Hard';
  END IF;

  -- 3. H2H count
  SELECT COALESCE(SUM(CASE WHEN lower(winner_name) LIKE '%' || last_a || '%' THEN 1 ELSE 0 END), 0),
         COALESCE(SUM(CASE WHEN lower(winner_name) LIKE '%' || last_b || '%' THEN 1 ELSE 0 END), 0)
  INTO wins_a, wins_b
  FROM tennis_history
  WHERE (lower(winner_name) LIKE '%' || last_a || '%' AND lower(loser_name) LIKE '%' || last_b || '%')
     OR (lower(winner_name) LIKE '%' || last_b || '%' AND lower(loser_name) LIKE '%' || last_a || '%');
  
  total_h2h := wins_a + wins_b;
  IF total_h2h > 0 THEN
    weight_h2h := 0.30;
    val_h2h := wins_a::FLOAT / total_h2h;
  END IF;

  -- 4. Recent Form (last 5 matches for each)
  -- Player A wins in last 5 matches
  SELECT COUNT(*), COALESCE(SUM(CASE WHEN won THEN 1 ELSE 0 END), 0)
  INTO form_total_a, form_wins_a
  FROM (
    SELECT TRUE as won, tourney_date FROM tennis_history WHERE lower(winner_name) LIKE '%' || last_a || '%'
    UNION ALL
    SELECT FALSE as won, tourney_date FROM tennis_history WHERE lower(loser_name) LIKE '%' || last_a || '%'
    ORDER BY tourney_date DESC
    LIMIT 5
  ) t;

  -- Player B wins in last 5 matches
  SELECT COUNT(*), COALESCE(SUM(CASE WHEN won THEN 1 ELSE 0 END), 0)
  INTO form_total_b, form_wins_b
  FROM (
    SELECT TRUE as won, tourney_date FROM tennis_history WHERE lower(winner_name) LIKE '%' || last_b || '%'
    UNION ALL
    SELECT FALSE as won, tourney_date FROM tennis_history WHERE lower(loser_name) LIKE '%' || last_b || '%'
    ORDER BY tourney_date DESC
    LIMIT 5
  ) t;

  IF form_total_a > 0 OR form_total_b > 0 THEN
    weight_form := 0.35;
    DECLARE
      pct_a FLOAT := CASE WHEN form_total_a > 0 THEN form_wins_a::FLOAT / form_total_a ELSE 0.5 END;
      pct_b FLOAT := CASE WHEN form_total_b > 0 THEN form_wins_b::FLOAT / form_total_b ELSE 0.5 END;
    BEGIN
      IF (pct_a + pct_b) > 0 THEN
        val_form := pct_a / (pct_a + pct_b);
      END IF;
    END;
  END IF;

  -- 5. Surface record
  SELECT COUNT(*) INTO surf_wins_a FROM tennis_history WHERE lower(winner_name) LIKE '%' || last_a || '%' AND lower(surface) = surf;
  SELECT COUNT(*) INTO surf_losses_a FROM tennis_history WHERE lower(loser_name) LIKE '%' || last_a || '%' AND lower(surface) = surf;
  surf_total_a := surf_wins_a + surf_losses_a;

  SELECT COUNT(*) INTO surf_wins_b FROM tennis_history WHERE lower(winner_name) LIKE '%' || last_b || '%' AND lower(surface) = surf;
  SELECT COUNT(*) INTO surf_losses_b FROM tennis_history WHERE lower(loser_name) LIKE '%' || last_b || '%' AND lower(surface) = surf;
  surf_total_b := surf_wins_b + surf_losses_b;

  IF surf_total_a > 0 AND surf_total_b > 0 THEN
    weight_surf := 0.35;
    DECLARE
      pct_a FLOAT := surf_wins_a::FLOAT / surf_total_a;
      pct_b FLOAT := surf_wins_b::FLOAT / surf_total_b;
    BEGIN
      IF (pct_a + pct_b) > 0 THEN
        val_surf := pct_a / (pct_a + pct_b);
      END IF;
    END;
  ELSIF surf_total_a > 0 THEN
    weight_surf := 0.20;
    val_surf := surf_wins_a::FLOAT / surf_total_a;
  ELSIF surf_total_b > 0 THEN
    weight_surf := 0.20;
    val_surf := 1.0 - (surf_wins_b::FLOAT / surf_total_b);
  END IF;

  -- 6. Combine
  total_weight := weight_h2h + weight_form + weight_surf;
  IF total_weight > 0 THEN
    raw_prob_a := (weight_h2h * val_h2h + weight_form * val_form + weight_surf * val_surf) / total_weight;
    balanced_prob_a := raw_prob_a * 0.5 + 0.5 * 0.5;
    final_prob_a := round(balanced_prob_a * 100);
    final_prob_b := 100 - final_prob_a;
    
    NEW.player_a_prob := final_prob_a;
    NEW.player_b_prob := final_prob_b;
    NEW.edge := abs(final_prob_a - 50);
    NEW.target_player := CASE WHEN final_prob_a > final_prob_b THEN 'A' ELSE 'B' END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
DROP TRIGGER IF EXISTS trg_calculate_match_stats ON tennis_matches;
CREATE TRIGGER trg_calculate_match_stats
BEFORE INSERT OR UPDATE ON tennis_matches
FOR EACH ROW
EXECUTE FUNCTION calculate_match_stats();
"""

def main():
    print("🚀 Connecting to Supabase PostgreSQL database...")
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        print("💡 Database connected. Applying PostgreSQL trigger function...")
        cur.execute(SQL)
        conn.commit()
        print("✅ Trigger applied successfully!")
        
        # Trigger update on all existing rows to calculate real probabilities for current matches
        print("🔄 Updating all existing rows in tennis_matches to recalculate probabilities...")
        cur.execute("UPDATE tennis_matches SET updated_at = NOW();")
        conn.commit()
        print("🎉 Recalculation complete! All database matches now have real statistical probabilities.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ Error applying trigger: {e}")

if __name__ == "__main__":
    main()
