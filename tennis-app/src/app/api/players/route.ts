import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const revalidate = 3600; // Cache for 1 hour

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';

  if (q.length < 2) {
    return NextResponse.json({ players: [] });
  }

  try {
    // Fetch matching winners and losers
    const [winnersRes, losersRes] = await Promise.all([
      supabase
        .from('tennis_history')
        .select('winner_name')
        .ilike('winner_name', `%${q}%`)
        .limit(8),
      supabase
        .from('tennis_history')
        .select('loser_name')
        .ilike('loser_name', `%${q}%`)
        .limit(8)
    ]);

    const names = new Set<string>();
    
    if (winnersRes.data) {
      winnersRes.data.forEach(row => names.add(row.winner_name));
    }
    if (losersRes.data) {
      losersRes.data.forEach(row => names.add(row.loser_name));
    }

    const uniquePlayers = Array.from(names).sort().slice(0, 8);

    return NextResponse.json({ players: uniquePlayers });
  } catch (err) {
    console.error('Autosuggest error:', err);
    return NextResponse.json({ players: [] });
  }
}
