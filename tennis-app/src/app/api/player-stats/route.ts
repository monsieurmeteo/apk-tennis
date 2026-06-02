import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const revalidate = 0;

async function getPlayerAverages(lastName: string) {
  try {
    // Query wins and losses with their game stats (aces, double faults, 1st serve %)
    const [winsRes, lossesRes] = await Promise.all([
      supabase
        .from('tennis_history')
        .select('w_aces, w_df, w_1st_pct')
        .ilike('winner_name', `%${lastName}%`)
        .not('w_aces', 'is', null)
        .limit(100), // Limit to last 100 matches to keep averages representative and fast
      supabase
        .from('tennis_history')
        .select('l_aces, l_df, l_1st_pct')
        .ilike('loser_name', `%${lastName}%`)
        .not('l_aces', 'is', null)
        .limit(100)
    ]);

    const wins = winsRes.data || [];
    const losses = lossesRes.data || [];
    const totalMatches = wins.length + losses.length;

    if (totalMatches === 0) {
      return { avgAces: 0, avgDf: 0, avg1stServ: 0, totalMatches };
    }

    let totalAces = 0;
    let totalDf = 0;
    let total1stServ = 0;

    wins.forEach(m => {
      totalAces += Number(m.w_aces) || 0;
      totalDf += Number(m.w_df) || 0;
      total1stServ += Number(m.w_1st_pct) || 0;
    });

    losses.forEach(m => {
      totalAces += Number(m.l_aces) || 0;
      totalDf += Number(m.l_df) || 0;
      total1stServ += Number(m.l_1st_pct) || 0;
    });

    return {
      avgAces: Math.round((totalAces / totalMatches) * 10) / 10,
      avgDf: Math.round((totalDf / totalMatches) * 10) / 10,
      avg1stServ: Math.round(total1stServ / totalMatches),
      totalMatches
    };
  } catch (err) {
    console.error(`Error calculating averages for ${lastName}:`, err);
    return { avgAces: 0, avgDf: 0, avg1stServ: 0, totalMatches: 0 };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerA = searchParams.get('playerA') || '';
  const playerB = searchParams.get('playerB') || '';
  const surface = searchParams.get('surface') || '';

  if (!playerA || !playerB) {
    return NextResponse.json({ error: 'Missing players' }, { status: 400 });
  }

  // Normalize player names for fuzzy matching (last name only)
  const lastA = playerA.split(' ').pop()?.toLowerCase() || '';
  const lastB = playerB.split(' ').pop()?.toLowerCase() || '';

  // 1. HEAD TO HEAD
  const { data: h2hData } = await supabase
    .from('tennis_history')
    .select('winner_name, loser_name, tourney_name, surface, tourney_date, score, round')
    .or(
      `and(winner_name.ilike.%${lastA}%,loser_name.ilike.%${lastB}%),and(winner_name.ilike.%${lastB}%,loser_name.ilike.%${lastA}%)`
    )
    .order('tourney_date', { ascending: false })
    .limit(10);

  // Count H2H wins
  let winsA = 0, winsB = 0;
  const h2hMatches = (h2hData || []).map(m => {
    const aWon = m.winner_name.toLowerCase().includes(lastA);
    if (aWon) winsA++; else winsB++;
    return {
      winner: m.winner_name,
      loser: m.loser_name,
      tournament: m.tourney_name,
      surface: m.surface,
      date: m.tourney_date,
      score: m.score,
      round: m.round,
    };
  });

  // 2. RECENT FORM - Player A (last 5 matches)
  const { data: formAWins } = await supabase
    .from('tennis_history')
    .select('winner_name, loser_name, tourney_name, tourney_date, surface')
    .ilike('winner_name', `%${lastA}%`)
    .order('tourney_date', { ascending: false })
    .limit(5);

  const { data: formALosses } = await supabase
    .from('tennis_history')
    .select('winner_name, loser_name, tourney_name, tourney_date, surface')
    .ilike('loser_name', `%${lastA}%`)
    .order('tourney_date', { ascending: false })
    .limit(5);

  const formA = [
    ...(formAWins || []).map(m => ({ ...m, won: true })),
    ...(formALosses || []).map(m => ({ ...m, won: false }))
  ]
    .sort((a, b) => (b.tourney_date || '').localeCompare(a.tourney_date || ''))
    .slice(0, 5);

  // 3. RECENT FORM - Player B (last 5 matches)
  const { data: formBWins } = await supabase
    .from('tennis_history')
    .select('winner_name, loser_name, tourney_name, tourney_date, surface')
    .ilike('winner_name', `%${lastB}%`)
    .order('tourney_date', { ascending: false })
    .limit(5);

  const { data: formBLosses } = await supabase
    .from('tennis_history')
    .select('winner_name, loser_name, tourney_name, tourney_date, surface')
    .ilike('loser_name', `%${lastB}%`)
    .order('tourney_date', { ascending: false })
    .limit(5);

  const formB = [
    ...(formBWins || []).map(m => ({ ...m, won: true })),
    ...(formBLosses || []).map(m => ({ ...m, won: false }))
  ]
    .sort((a, b) => (b.tourney_date || '').localeCompare(a.tourney_date || ''))
    .slice(0, 5);

  // 4. SURFACE STATS
  const getSurfaceStats = async (lastName: string, surf: string) => {
    if (!surf) return null;
    const [{ count: wins }, { count: losses }] = await Promise.all([
      supabase.from('tennis_history').select('*', { count: 'exact', head: true })
        .ilike('winner_name', `%${lastName}%`).ilike('surface', `%${surf}%`),
      supabase.from('tennis_history').select('*', { count: 'exact', head: true })
        .ilike('loser_name', `%${lastName}%`).ilike('surface', `%${surf}%`)
    ]);
    const total = (wins || 0) + (losses || 0);
    return total > 0 ? { wins: wins || 0, losses: losses || 0, total, pct: Math.round(((wins || 0) / total) * 100) } : null;
  };

  // 5. PLAYER DETAILED GAME STATS (Aces, Double faults, 1st serve %)
  const [surfA, surfB, averagesA, averagesB] = await Promise.all([
    getSurfaceStats(lastA, surface),
    getSurfaceStats(lastB, surface),
    getPlayerAverages(lastA),
    getPlayerAverages(lastB)
  ]);

  // 6. ELO RATINGS FUZZY LOOKUP
  let eloA = { name: playerA, general: 1500.0, hard: 1500.0, clay: 1500.0, grass: 1500.0 };
  let eloB = { name: playerB, general: 1500.0, hard: 1500.0, clay: 1500.0, grass: 1500.0 };

  try {
    const eloPath = path.join(process.cwd(), 'src/data/player_elo.json');
    if (fs.existsSync(eloPath)) {
      const eloDb = JSON.parse(fs.readFileSync(eloPath, 'utf8'));
      
      const findPlayerElo = (fullName: string) => {
        const normalized = fullName.toLowerCase().trim();
        // Exact match
        if (eloDb[normalized]) return eloDb[normalized];
        // Fuzzy match
        const foundKey = Object.keys(eloDb).find(key => 
          key.includes(normalized) || normalized.includes(key)
        );
        if (foundKey) return eloDb[foundKey];
        // Last name match
        const lastName = normalized.split(' ').pop() || '';
        if (lastName.length > 2) {
          const foundLastNameKey = Object.keys(eloDb).find(key => key.includes(lastName));
          if (foundLastNameKey) return eloDb[foundLastNameKey];
        }
        return null;
      };

      const foundA = findPlayerElo(playerA);
      if (foundA) eloA = foundA;

      const foundB = findPlayerElo(playerB);
      if (foundB) eloB = foundB;
    }
  } catch (err) {
    console.error("Error fetching Elo ratings from JSON:", err);
  }

  return NextResponse.json({
    h2h: { winsA, winsB, matches: h2hMatches },
    formA,
    formB,
    surfaceA: surfA,
    surfaceB: surfB,
    surface,
    averagesA,
    averagesB,
    eloA,
    eloB
  });
}
