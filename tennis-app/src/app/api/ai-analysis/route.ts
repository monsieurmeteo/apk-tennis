import { NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openrouter/free';

export async function POST(request: Request) {
  if (!OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: 'La clé API OpenRouter n\'est pas configurée.' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { match } = body;

    if (!match) {
      return NextResponse.json({ error: 'Données du match manquantes.' }, { status: 400 });
    }

    // Prepare context for the prompt
    const {
      tournament,
      is_live,
      score_str,
      playerA,
      playerB,
      oddsA,
      oddsB,
    } = match;

    const bookieOddsText = (oddsA && oddsB) 
      ? `Cotes Bookmaker: ${playerA.name} à ${oddsA}, ${playerB.name} à ${oddsB}.`
      : 'Cotes Bookmaker: Non disponibles.';

    const systemPrompt = `Tu es un expert mondial en paris sportifs sur le tennis, spécialisé dans la recherche de "Value Bet". 
Ta mission est d'analyser les statistiques d'un match fournies par notre système ELO et de donner un conseil de pari clair, direct et percutant.
Réponds en français, de manière très concise (maximum 3 à 4 phrases).
Sois confiant, dynamique et professionnel. 
Si le système montre une probabilité ELO significativement supérieure à la cote bookmaker (Value Bet), mets-le en avant.
Sinon, indique que le marché est équilibré.`;

    const userPrompt = `Voici les données du match :
Tournoi : ${tournament}
Statut : ${is_live ? 'En direct' : 'À venir'} (Score/Heure : ${score_str})

Joueur A : ${playerA.name} (Rang : ${playerA.rank || 'N/A'}) - Probabilité ELO : ${playerA.prob}%
Joueur B : ${playerB.name} (Rang : ${playerB.rank || 'N/A'}) - Probabilité ELO : ${playerB.prob}%

${bookieOddsText}

Base-toi sur ces chiffres pour me donner un conseil de pari tranché.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000', // Required by OpenRouter
        'X-Title': 'APK Tennis', // Required by OpenRouter
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 250,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenRouter Error:', err);
      return NextResponse.json({ error: 'Erreur lors de l\'appel à l\'IA OpenRouter.' }, { status: 500 });
    }

    const data = await response.json();
    const advice = data.choices?.[0]?.message?.content || "Désolé, je n'ai pas pu générer d'analyse pour le moment.";

    return NextResponse.json({ advice });

  } catch (error) {
    console.error('Erreur API IA:', error);
    return NextResponse.json(
      { error: 'Une erreur interne est survenue.' },
      { status: 500 }
    );
  }
}
