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

    const systemPrompt = `Tu es un expert mondial en paris sportifs sur le tennis, spécialisé dans la recherche de "Value Bet" algorithmique.
Ta mission est d'analyser les statistiques d'un match (modèle ELO vs cotes bookmakers) et de générer une analyse ultra-précise et structurée pour tes parieurs professionnels.
Tu dois répondre STRICTEMENT selon cette structure (utilise les emojis et les sauts de ligne) :

🎾 **Contexte** : [1 phrase résumant le match et son statut]
📊 **Analyse de la Value** : [Analyse mathématique stricte comparant notre probabilité ELO avec la probabilité implicite du bookmaker. S'il n'y a pas de bookmaker, analyse l'écart ELO.]
🔑 **Facteurs Clés** :
- [Point fort du Joueur A ou B]
- [Dynamique / Situation actuelle du match si c'est en Live]
🔥 **Verdict** : [Conclusion directe : ex "Value Bet détecté sur X" ou "Marché équilibré, no bet". Précise une recommandation de mise (ex: 1% bankroll) si la value est élevée.]

Reste très concis (pas de bla-bla), professionnel, mathématique et froid.`;

    const userPrompt = `Voici les données en temps réel :
- Tournoi : ${tournament}
- Statut : ${is_live ? 'En direct' : 'À venir'} (Score/Heure : ${score_str})
- Joueur A : ${playerA.name} (Rang ${playerA.rank || 'N/A'}) - Probabilité ELO : ${playerA.prob}%
- Joueur B : ${playerB.name} (Rang ${playerB.rank || 'N/A'}) - Probabilité ELO : ${playerB.prob}%
- ${bookieOddsText}

Génère l'analyse stricte maintenant.`;

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
