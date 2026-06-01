import pandas as pd
import os
from sqlalchemy import create_engine
from dotenv import load_dotenv

load_dotenv()

# We will download the last 10 years by default
START_YEAR = 2016
END_YEAR = 2026

BASE_URL = "https://raw.githubusercontent.com/jeffsackmann/tennis_atp/master/atp_matches_{}.csv"

def fetch_and_process_data():
    all_matches = []
    
    print(f"📥 Downloading ATP data from {START_YEAR} to {END_YEAR}...")
    for year in range(START_YEAR, END_YEAR + 1):
        url = BASE_URL.format(year)
        try:
            df = pd.read_csv(url)
            all_matches.append(df)
            print(f"✅ Loaded {year}: {len(df)} matches")
        except Exception as e:
            print(f"❌ Failed to load {year}: {e}")
            
    if not all_matches:
        print("No data loaded.")
        return None
        
    combined_df = pd.concat(all_matches, ignore_index=True)
    
    # Feature Engineering (Inspired by NikosAvg)
    # Calculate some basic percentages for the DB
    combined_df['w_1stIn_pct'] = combined_df['w_1stIn'] / combined_df['w_svpt']
    combined_df['w_1stWon_pct'] = combined_df['w_1stWon'] / combined_df['w_1stIn']
    combined_df['w_2ndWon_pct'] = combined_df['w_2ndWon'] / (combined_df['w_svpt'] - combined_df['w_1stIn'])
    
    combined_df['l_1stIn_pct'] = combined_df['l_1stIn'] / combined_df['l_svpt']
    combined_df['l_1stWon_pct'] = combined_df['l_1stWon'] / combined_df['l_1stIn']
    combined_df['l_2ndWon_pct'] = combined_df['l_2ndWon'] / (combined_df['l_svpt'] - combined_df['l_1stIn'])
    
    print(f"📊 Processed {len(combined_df)} total matches.")
    return combined_df

def push_to_supabase(df: pd.DataFrame):
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("⚠️ DATABASE_URL not found in .env. Skipping Supabase push.")
        # Save to local CSV as fallback
        df.to_csv("atp_matches_10years.csv", index=False)
        print("💾 Saved to local CSV instead: atp_matches_10years.csv")
        return
        
    print("🚀 Pushing to Supabase...")
    engine = create_engine(db_url)
    try:
        df.to_sql("atp_matches", engine, if_exists="replace", index=False)
        print("✅ Data successfully pushed to Supabase table 'atp_matches'!")
    except Exception as e:
        print(f"❌ Failed to push to Supabase: {e}")

if __name__ == "__main__":
    df = fetch_and_process_data()
    if df is not None:
        push_to_supabase(df)
