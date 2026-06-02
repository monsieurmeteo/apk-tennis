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
  "itf wuning": "ITF Wuning"
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
  
  // Clean up any remaining double spaces or trailing colons
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

    // 2. Fetch active markets from Polymarket sorted by volume
    const polymarketUrl = "https://gamma-api.polymarket.com/markets";
    const polyParams = new URLSearchParams({
      "active": "true",
      "closed": "false",
      "limit": "250",
      "order": "volume",
      "ascending": "false"
    });

    const res = await fetch(`${polymarketUrl}?${polyParams.toString()}`, {
      next: { revalidate: 0 },
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!res.ok) {
      throw new Error(`Polymarket API returned status ${res.status}`);
    }

    const markets = await res.json();
    
    // 3. Filter and parse tennis markets
    const tennisMarkets = [];
    
    for (const m of markets) {
      const q = m.question || '';
      const desc = m.description || '';
      const title = m.title || '';
      const category = m.category || '';
      const text = `${q} ${desc} ${title} ${category}`.toLowerCase();
      
      const isTennis = text.includes('tennis') || 
                       text.includes('roland garros') || 
                       text.includes('wimbledon') || 
                       text.includes('atp') || 
                       text.includes('wta') ||
                       text.includes('itf');
                       
      if (isTennis && m.outcomePrices && m.outcomes) {
        let prices: string[] = [];
        let outcomes: string[] = [];
        
        try {
          // outcomePrices and outcomes are sometimes JSON-encoded strings
          prices = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices;
          outcomes = typeof m.outcomes === 'string' ? JSON.parse(m.outcomes) : m.outcomes;
        } catch (e) {
          prices = m.outcomePrices || [];
          outcomes = m.outcomes || [];
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
        const translatedQuestion = translateText(q || title);
        const translatedOutcomes = outcomes.map(o => translateText(o));
        
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
          id: m.id,
          question: translatedQuestion,
          slug: m.slug,
          category: translateText(category),
          volume: Math.round(parseFloat(m.volume) || 0),
          liquidity: Math.round(parseFloat(m.liquidity) || 0),
          outcomes: translatedOutcomes,
          prices: [priceA, priceB],
          probabilities: [probA, probB],
          clobTokenIds: m.clobTokenIds,
          matchedMatchId,
          matchedMatch,
          ourProbA,
          ourProbB,
          edge: Math.round(edge)
        });
      }
    }
    
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
