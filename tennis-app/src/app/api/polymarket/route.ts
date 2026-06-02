import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const revalidate = 0;

// Mappings for translation to French
const TRANSLATIONS: Record<string, string> = {
  "winner": "Vainqueur",
  "winner:": "Vainqueur :",
  "set 1 winner": "Vainqueur du 1er Set",
  "set 2 winner": "Vainqueur du 2ème Set",
  "total sets o/u 2.5": "Nombre de Sets (Plus/Moins de 2.5)",
  "over 2.5": "Plus de 2.5 sets",
  "under 2.5": "Moins de 2.5 sets",
  "total sets": "Total de Sets",
  "roland garros": "Roland Garros",
  "french open": "Roland Garros",
  "wimbledon": "Wimbledon",
  "us open": "US Open",
  "australian open": "Open d'Australie",
  "wuhan tennis open": "Open de Wuhan",
  "china open": "Open de Chine",
  "itf luan": "ITF Lu'an",
  "itf wuning": "ITF Wuning",
  "qualification atp": "Qualifications ATP",
  "qualification wta": "Qualifications WTA"
};

function translateText(text: string): string {
  if (!text) return text;
  let translated = text;
  
  // Replace keywords based on dictionary
  Object.entries(TRANSLATIONS).forEach(([eng, fre]) => {
    const regex = new RegExp(eng, 'gi');
    translated = translated.replace(regex, fre);
  });

  // Handle common patterns like "Will [Player] win [Tournament]?"
  const winQueryMatch = text.match(/Will\s+(.*?)\s+win\s+(.*?)\?/i);
  if (winQueryMatch) {
    const player = winQueryMatch[1];
    const tournament = TRANSLATIONS[winQueryMatch[2].toLowerCase()] || winQueryMatch[2];
    return `Est-ce que ${player} va remporter ${tournament} ?`;
  }
  
  return translated.trim();
}

// Fuzzy matching player names
function matchPlayerName(polyName: string, dbName: string): boolean {
  const p = polyName.toLowerCase().trim();
  const d = dbName.toLowerCase().trim();
  
  if (p === d) return true;
  
  // Last name match
  const lastP = p.split(' ').pop() || '';
  const lastD = d.split(' ').pop() || '';
  
  if (lastP.length > 2 && lastD.length > 2 && lastP === lastD) {
    return true;
  }
  
  // Contains
  if (p.includes(d) || d.includes(p)) {
    return true;
  }
  
  return false;
}

export async function GET() {
  try {
    // 1. Fetch active matches from Supabase to match players and calculate edge
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: dbMatches } = await supabase
      .from('tennis_matches')
      .select('*')
      .order('is_live', { ascending: false });

    const tennisMarkets = [];
    const polymarketEventsUrl = "https://gamma-api.polymarket.com/events";
    
    // 2. Fetch pages of active tennis events to bypass the 100-item cutoff limit
    let rawEvents: any[] = [];
    
    for (let page = 0; page < 2; page++) {
      const offset = page * 100;
      const polyParams = new URLSearchParams({
        "active": "true",
        "closed": "false",
        "tag_id": "864", // Tennis specific Tag ID
        "limit": "100",
        "offset": offset.toString()
      });

      try {
        const res = await fetch(`${polymarketEventsUrl}?${polyParams.toString()}`, {
          next: { revalidate: 0 },
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (res.ok) {
          const events = await res.json();
          if (!events || events.length === 0) break;
          rawEvents = rawEvents.concat(events);
          if (events.length < 100) break;
        } else {
          break;
        }
      } catch (err) {
        console.error(`Error fetching page ${page+1} of events:`, err);
        break;
      }
    }

    // 3. Filter and parse tennis events
    const now = new Date();
    for (const e of rawEvents) {
      const title = e.title || '';
      
      // Skip completed/past events
      if (e.endDate) {
        const eventEndDate = new Date(e.endDate);
        if (eventEndDate < now) {
          continue;
        }
      }
      
      // Filter out outrights (ex: "Men's French Open Winner") to keep only match duels
      if (!title.toLowerCase().includes('vs') && !title.toLowerCase().includes('vs.')) {
        continue;
      }
      
      const markets = e.markets || [];
      if (markets.length === 0) continue;
      
      // Find the primary match winner market:
      const winnerMarket = markets.find((m: any) => {
        const q = (m.question || '').toLowerCase();
        
        // 1. Reject questions containing non-winner keywords
        const containsNonWinnerKeywords = 
          q.includes('o/u') || 
          q.includes('handicap') || 
          q.includes('set 1') || 
          q.includes('set 2') || 
          q.includes('set 3') || 
          q.includes('set 4') || 
          q.includes('set 5') || 
          q.includes('winner:') || 
          q.includes('completed match') ||
          q.includes('most aces') ||
          q.includes('tiebreak') ||
          q.includes('to win a set') ||
          q.includes('games') ||
          q.includes('total');
          
        if (containsNonWinnerKeywords) return false;
        
        // 2. Reject outcomes that are Yes/No, Over/Under, etc.
        let outcomes: string[] = [];
        try {
          outcomes = typeof m.outcomes === 'string' ? JSON.parse(m.outcomes) : m.outcomes;
        } catch (err) {
          outcomes = m.outcomes || [];
        }
        
        if (outcomes.length < 2) return false;
        
        const first = outcomes[0].toLowerCase().trim();
        const second = outcomes[1].toLowerCase().trim();
        
        if (
          first === 'yes' || first === 'no' ||
          first === 'over' || first === 'under' ||
          first.startsWith('over ') || first.startsWith('under ') ||
          second === 'yes' || second === 'no' ||
          second === 'over' || second === 'under' ||
          second.startsWith('over ') || second.startsWith('under ')
        ) {
          return false;
        }
        
        return true;
      });
      
      // If no valid match winner market is found, skip this event entirely!
      if (!winnerMarket) continue;
      
      let prices: string[] = [];
      let outcomes: string[] = [];
      
      try {
        prices = typeof winnerMarket.outcomePrices === 'string' ? JSON.parse(winnerMarket.outcomePrices) : winnerMarket.outcomePrices;
        outcomes = typeof winnerMarket.outcomes === 'string' ? JSON.parse(winnerMarket.outcomes) : winnerMarket.outcomes;
      } catch (err) {
        prices = winnerMarket.outcomePrices || [];
        outcomes = winnerMarket.outcomes || [];
      }

      if (prices.length < 2 || outcomes.length < 2) continue;
      
      const priceA = parseFloat(prices[0]) || 0;
      const priceB = parseFloat(prices[1]) || 0;
      
      // Skip completed or dead markets
      if (priceA === 0 && priceB === 0) continue;
      if (priceA === 1 || priceB === 1) continue;
      
      const probA = Math.round(priceA * 100);
      const probB = Math.round(priceB * 100);
      
      const playerAName = outcomes[0];
      const playerBName = outcomes[1];
      
      // Translate question and outcomes
      const cleanTitle = title.split(' (Tennis)')[0]; // strip Vercel suffixes
      const translatedQuestion = translateText(cleanTitle);
      const translatedOutcomes = outcomes.map(o => translateText(o));
      
      // Calculate total volume for all markets in the event
      let totalVolume = 0;
      markets.forEach((m: any) => {
        totalVolume += parseFloat(m.volume) || 0;
      });
      if (totalVolume === 0) {
        totalVolume = parseFloat(winnerMarket.volume) || 0;
      }
      
      // 4. Match with our active database matches
      let matchedMatchId = null;
      let matchedMatch = null;
      let edge = 0;
      let ourProbA = 0;
      let ourProbB = 0;
      
      if (dbMatches && dbMatches.length > 0) {
        const matched = dbMatches.find(db => {
          const matchA = matchPlayerName(playerAName, db.player_a_name) && matchPlayerName(playerBName, db.player_b_name);
          const matchB = matchPlayerName(playerAName, db.player_b_name) && matchPlayerName(playerBName, db.player_a_name);
          return matchA || matchB;
        });
        
        if (matched) {
          matchedMatchId = matched.id;
          matchedMatch = {
            player_a_name: matched.player_a_name,
            player_b_name: matched.player_b_name,
            player_a_prob: matched.player_a_prob,
            player_b_prob: matched.player_b_prob,
            is_live: matched.is_live,
            score_str: matched.score_str,
            tournament: matched.tournament?.split(' || ')[0]
          };
          
          // Check orientation of outcomes
          const isDirectOrder = matchPlayerName(playerAName, matched.player_a_name);
          ourProbA = isDirectOrder ? matched.player_a_prob : matched.player_b_prob;
          ourProbB = isDirectOrder ? matched.player_b_prob : matched.player_a_prob;
          
          // Calculate statistical edge
          edge = ourProbA - probA;
        }
      }
      
      tennisMarkets.push({
        id: winnerMarket.id,
        question: translatedQuestion,
        slug: e.slug,
        category: translateText(e.category || "Tennis"),
        volume: Math.round(totalVolume),
        liquidity: Math.round(parseFloat(winnerMarket.liquidity) || 0),
        outcomes: translatedOutcomes,
        prices: [priceA, priceB],
        probabilities: [probA, probB],
        clobTokenIds: winnerMarket.clobTokenIds,
        matchedMatchId,
        matchedMatch,
        ourProbA,
        ourProbB,
        edge: Math.round(edge)
      });
    }

    // Sort tennis markets by volume descending
    tennisMarkets.sort((a, b) => b.volume - a.volume);
    
    return NextResponse.json(
      { markets: tennisMarkets, source: 'polymarket' },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
    
  } catch (error: any) {
    console.error('Polymarket route error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Polymarket data', details: error.message },
      { status: 500 }
    );
  }
}
