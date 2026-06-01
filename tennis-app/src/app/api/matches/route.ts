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

    const { data, error } = await supabase
      .from('tennis_matches')
      .select('*')
      .order('is_live', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json({ matches: getDemoMatches(), source: 'demo' });
    }

    // Remap Supabase columns -> frontend format
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

      return {
        id: row.id,
        tournament: tournamentName,
        is_live: row.is_live,
        score_str: row.score_str,
        playerA: { name: row.player_a_name, rank: row.player_a_rank, prob: row.player_a_prob },
        playerB: { name: row.player_b_name, rank: row.player_b_rank, prob: row.player_b_prob },
        edge: row.edge,
        targetPlayer: row.target_player,
        live_stats: liveStats
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
