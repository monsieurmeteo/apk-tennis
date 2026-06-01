// Supabase Edge Function : tennis-scraper
// Se déploie sur Supabase et tourne automatiquement via pg_cron
// Aspire SofaScore et stocke les matchs dans la table tennis_matches

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const SOFASCORE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
  'Referer': 'https://www.sofascore.com/',
  'Origin': 'https://www.sofascore.com',
  'Cache-Control': 'no-cache',
};

function genProb(a: string, b: string): number {
  const h = (a.charCodeAt(0) * 7 + b.charCodeAt(0) * 13 + a.length * 3 + b.length * 11) % 100;
  return Math.max(30, Math.min(70, h));
}

function parseEvent(event: any, isLive: boolean): any {
  try {
    const home = event?.homeTeam?.name || 'Player A';
    const away = event?.awayTeam?.name || 'Player B';
    const cat = event?.tournament?.category?.name || '';
    const tour = event?.tournament?.name || 'Tennis';
    const tournament = cat ? `${cat} - ${tour}` : tour;

    let scoreStr = isLive ? 'LIVE' : 'À venir';
    if (isLive) {
      const hs = event?.homeScore;
      const as_ = event?.awayScore;
      
      const periods: string[] = [];
      for (let i = 1; i <= 5; i++) {
        const pHome = hs?.[`period${i}`];
        const pAway = as_?.[`period${i}`];
        if (pHome !== undefined && pAway !== undefined) {
          periods.push(`${pHome}-${pAway}`);
        }
      }
      
      const setScore = (hs?.current !== undefined && as_?.current !== undefined) 
        ? `${hs.current}-${as_.current}` 
        : '';
        
      const currentPoint = (hs?.point !== undefined && as_?.point !== undefined)
        ? `(${hs.point}-${as_.point})`
        : '';
        
      if (periods.length > 0) {
        scoreStr = `${periods.join(', ')}`;
        if (currentPoint) {
          scoreStr += ` ${currentPoint}`;
        }
      } else if (setScore) {
        scoreStr = `${setScore}`;
        if (currentPoint) {
          scoreStr += ` ${currentPoint}`;
        }
      }
    } else {
      const ts = event?.startTimestamp;
      if (ts) {
        const dt = new Date(ts * 1000);
        scoreStr = `${dt.getDate().toString().padStart(2,'0')}/${(dt.getMonth()+1).toString().padStart(2,'0')} ${dt.getHours().toString().padStart(2,'0')}:${dt.getMinutes().toString().padStart(2,'0')}`;
      }
    }

    const probA = genProb(home, away);
    const probB = 100 - probA;

    return {
      id: String(event?.id || `${home}-${away}`),
      tournament,
      is_live: isLive,
      score_str: scoreStr,
      player_a_name: home,
      player_a_rank: event?.homeTeam?.ranking || 0,
      player_a_prob: probA,
      player_b_name: away,
      player_b_rank: event?.awayTeam?.ranking || 0,
      player_b_prob: probB,
      edge: Math.abs(probA - 50),
      target_player: probA > probB ? 'A' : 'B',
      updated_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

async function fetchSofaScore(url: string): Promise<any[]> {
  try {
    const res = await fetch(url, { headers: SOFASCORE_HEADERS });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.events || [];
  } catch {
    return [];
  }
}

async function upsertMatches(matches: any[]) {
  if (!matches.length) return;
  
  // Batch upsert in groups of 100
  for (let i = 0; i < matches.length; i += 100) {
    const batch = matches.slice(i, i + 100);
    await fetch(`${SUPABASE_URL}/rest/v1/tennis_matches`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(batch),
    });
  }
}

Deno.serve(async (_req) => {
  const allMatches: any[] = [];
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // 1. Live matches
  const liveEvents = await fetchSofaScore('https://api.sofascore.com/api/v1/sport/tennis/events/live');
  for (const e of liveEvents) {
    const m = parseEvent(e, true);
    if (m) allMatches.push(m);
  }

  // 2. Today + Tomorrow scheduled
  for (const day of [today, tomorrow]) {
    const events = await fetchSofaScore(`https://api.sofascore.com/api/v1/sport/tennis/scheduled-events/${day}`);
    for (const e of events) {
      const status = e?.status?.type;
      if (status !== 'inprogress' && status !== 'finished') {
        const m = parseEvent(e, false);
        if (m && !allMatches.find(x => x.id === m.id)) allMatches.push(m);
      }
    }
  }

  await upsertMatches(allMatches);

  return new Response(JSON.stringify({ 
    success: true, 
    matches_updated: allMatches.length,
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
