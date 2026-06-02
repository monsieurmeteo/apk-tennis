import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getDemoMatches() {
  return [
    {
      id: "demo-1", tournament: "Roland Garros ATP (Démo)", is_live: true, score_str: "4-3",
      playerA: { name: "C. Alcaraz", rank: 2, prob: 68 },
      playerB: { name: "J. Sinner", rank: 1, prob: 32 },
      edge: 18, targetPlayer: "A"
    },
    {
      id: "demo-2", tournament: "Roland Garros WTA (Démo)", is_live: true, score_str: "6-3, 2-1",
      playerA: { name: "I. Swiatek", rank: 1, prob: 75 },
      playerB: { name: "A. Sabalenka", rank: 2, prob: 25 },
      edge: 25, targetPlayer: "A"
    },
    {
      id: "demo-3", tournament: "Roland Garros ATP (Démo)", is_live: false, score_str: "Demain 11h00",
      playerA: { name: "C. Ruud", rank: 6, prob: 45 },
      playerB: { name: "A. Zverev", rank: 4, prob: 55 },
      edge: 5, targetPlayer: "B"
    },
    {
      id: "demo-4", tournament: "Roland Garros WTA (Démo)", is_live: false, score_str: "Demain 14h00",
      playerA: { name: "E. Rybakina", rank: 5, prob: 62 },
      playerB: { name: "C. Gauff", rank: 3, prob: 38 },
      edge: 12, targetPlayer: "A"
    }
  ];
}

export const revalidate = 0;

function matchPlayerWithOdds(oddsName: string, dbName: string): boolean {
  if (!oddsName || !dbName) return false;
  
  // Clean names (lowercase, remove seeds like (4) or qualifiers)
  const cleanOdds = oddsName.toLowerCase().replace(/\s*\(\d+\)\s*/g, '').replace(/\s*\(q\)\s*/g, '').trim();
  const cleanDb = dbName.toLowerCase().replace(/\s*\(\d+\)\s*/g, '').replace(/\s*\(q\)\s*/g, '').trim();
  
  if (cleanOdds === cleanDb) return true;
  
  // Split oddsName (usually "Lastname F." or "Lastname F. M.")
  const oddsParts = cleanOdds.split(' ');
  if (oddsParts.length === 0) return false;
  
  const oddsLastName = oddsParts[0].replace(/\./g, '');
  const oddsInitial = oddsParts[1] ? oddsParts[1].charAt(0) : '';
  
  // Split dbName (usually "Firstname Lastname" or "Firstname Middle Lastname")
  const dbParts = cleanDb.split(' ');
  if (dbParts.length === 0) return false;
  
  const dbLastName = dbParts[dbParts.length - 1];
  const dbFirst = dbParts[0];
  const dbInitial = dbFirst.charAt(0);
  
  // Check if last names are identical
  if (oddsLastName.length > 2 && dbLastName.length > 2 && oddsLastName === dbLastName) {
    if (oddsInitial && dbInitial) {
      return oddsInitial === dbInitial;
    }
    return true;
  }
  
  // Alternately check if one contains the other
  if (cleanOdds.includes(cleanDb) || cleanDb.includes(cleanOdds)) {
    return true;
  }
  
  return false;
}

export async function GET() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Non-blocking ping to Render to keep scraper service awake
    try {
      fetch('https://apk-tennis-docker.onrender.com').catch((e) => {
        console.log('Background ping to Render failed (expected/non-blocking):', e.message);
      });
    } catch (e) {
      // Ignorer les erreurs de fetch en arrière-plan
    }

    // 1. Fetch matches from Supabase
    const { data, error } = await supabase
      .from('tennis_matches')
      .select('*')
      .order('is_live', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json({ matches: getDemoMatches(), source: 'demo' });
    }

    // 2. Fetch public bookmaker odds from Mriganka-codes/tennis_data
    let oddsList: any[] = [];
    try {
      const oddsRes = await fetch('https://raw.githubusercontent.com/Mriganka-codes/tennis_data/main/matches.json', {
        next: { revalidate: 3600 } // Cache odds for 1 hour
      });
      if (oddsRes.ok) {
        const oddsData = await oddsRes.json();
        oddsList = oddsData.matches || [];
      }
    } catch (err) {
      console.error("Erreur de récupération des cotes GitHub:", err);
    }

    // 3. Remap Supabase columns -> frontend format & inject bookmaker cotes
    const matches = data.map((row: any) => {
      let tournamentName = row.tournament || '';
      let liveStats = null;
      
      if (row.tournament && row.tournament.includes(' || ')) {
        const parts = row.tournament.split(' || ');
        tournamentName = parts[0];
        try {
          liveStats = JSON.parse(parts[1]);
        } catch (e) {
          console.error("Error parsing live stats:", e);
        }
      }

      // Tenter d'associer des cotes de bookmakers via notre fuzzy matching
      let oddsA: number | null = null;
      let oddsB: number | null = null;
      
      if (oddsList.length > 0) {
        const matchedOdds = oddsList.find(o => {
          const matchNormal = matchPlayerWithOdds(o.player1, row.player_a_name) && matchPlayerWithOdds(o.player2, row.player_b_name);
          const matchInverted = matchPlayerWithOdds(o.player1, row.player_b_name) && matchPlayerWithOdds(o.player2, row.player_a_name);
          return matchNormal || matchInverted;
        });
        
        if (matchedOdds) {
          const isNormalOrder = matchPlayerWithOdds(matchedOdds.player1, row.player_a_name);
          oddsA = isNormalOrder ? matchedOdds.odds1 : matchedOdds.odds2;
          oddsB = isNormalOrder ? matchedOdds.odds2 : matchedOdds.odds1;
        }
      }

      return {
        id: row.id,
        tournament: tournamentName,
        is_live: row.is_live,
        score_str: row.score_str,
        playerA: { name: row.player_a_name, rank: row.player_a_rank, prob: row.player_a_prob },
        playerB: { name: row.player_b_name, rank: row.player_b_rank, prob: row.player_b_prob },
        edge: row.edge,
        targetPlayer: row.target_player,
        live_stats: liveStats,
        oddsA,
        oddsB
      };
    });

    return NextResponse.json(
      { matches, source: 'supabase' },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );

  } catch (error) {
    console.error('Supabase error:', error);
    return NextResponse.json(
      { matches: getDemoMatches(), source: 'demo' },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  }
}
