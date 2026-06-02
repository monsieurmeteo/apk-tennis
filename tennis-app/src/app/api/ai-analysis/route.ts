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

    const {
      tournament,
      is_live,
      score_str,
      playerA,
      playerB,
      oddsA,
      oddsB,
    } = match;

    // Detect surface roughly from tournament name
    let surface = 'Hard';
    if (tournament.toLowerCase().includes('clay') || tournament.toLowerCase().includes('roland')) surface = 'Clay';
    if (tournament.toLowerCase().includes('grass') || tournament.toLowerCase().includes('wimbledon')) surface = 'Grass';

    // Fetch deep stats internally
    let statsData: any = null;
    try {
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
      const protocol = request.headers.get('x-forwarded-proto') || 'http';
      const baseUrl = `${protocol}://${host}`;
      const url = new URL(`/api/player-stats`, baseUrl);
      url.searchParams.set('playerA', playerA.name);
      url.searchParams.set('playerB', playerB.name);
      url.searchParams.set('surface', surface);
      
      const statsRes = await fetch(url.toString(), { next: { revalidate: 3600 } });
      if (statsRes.ok) {
        statsData = await statsRes.json();
      }
    } catch (e) {
      console.error("Impossible de récupérer les stats internes pour l'IA:", e);
    }

    // Format stats for prompt
    let h2hText = "H2H non disponible.";
    if (statsData && statsData.h2h) {
      h2hText = `${playerA.name} ${statsData.h2h.winsA} - ${statsData.h2h.winsB} ${playerB.name}`;
    }

    let formAText = "Non disponible.";
    let formBText = "Non disponible.";
    if (statsData && statsData.formA && statsData.formA.length > 0) {
      formAText = statsData.formA.map((m: any) => `${m.won ? 'V' : 'D'} (${m.score || 'score inc.'})`).join(', ');
    }
    if (statsData && statsData.formB && statsData.formB.length > 0) {
      formBText = statsData.formB.map((m: any) => `${m.won ? 'V' : 'D'} (${m.score || 'score inc.'})`).join(', ');
    }

    let serveAText = statsData && statsData.averagesA ? `Aces: ${statsData.averagesA.avgAces}, DF: ${statsData.averagesA.avgDf}, 1er Serv: ${statsData.averagesA.avg1stServ}%` : 'N/A';
    let serveBText = statsData && statsData.averagesB ? `Aces: ${statsData.averagesB.avgAces}, DF: ${statsData.averagesB.avgDf}, 1er Serv: ${statsData.averagesB.avg1stServ}%` : 'N/A';

    let eloAText = statsData && statsData.eloA ? `Général: ${statsData.eloA.general}, Sur surface: ${surface === 'Clay' ? statsData.eloA.clay : surface === 'Grass' ? statsData.eloA.grass : statsData.eloA.hard}` : `${playerA.prob}% (Prob générale)`;
    let eloBText = statsData && statsData.eloB ? `Général: ${statsData.eloB.general}, Sur surface: ${surface === 'Clay' ? statsData.eloB.clay : surface === 'Grass' ? statsData.eloB.grass : statsData.eloB.hard}` : `${playerB.prob}% (Prob générale)`;


    const systemPrompt = `Agis comme un modèle d'ensemble quantitatif (stacking ensemble) combinant les capacités de LightGBM et XGBoost, couplé à l'expertise d'un parieur professionnel (sharp bettor). Ton objectif est d'analyser le match de tennis suivant et de déterminer s'il existe une Value Bet (EV+) exploitable. 

ÉTAPES DE L'ANALYSE OBLIGATOIRE :
1. Évaluation Structurelle (Le Différentiel ELO) : Ignore le classement ATP. Compare l'ELO spécifique à la surface. Qui a l'avantage mathématique réel ?
2. Dynamique et Momentum (WElo et Forme) : Analyse la forme récente (victoires/défaites et sévérité si disponible). 
3. Incompatibilité Tactique : Examine le H2H et les stats de service (Hold %, Aces, etc.). Y a-t-il une dominance bloquante ?
4. Efficience Financière et De-Vigging : Retire la marge du bookmaker des cotes fournies pour obtenir la probabilité implicite réelle. Compare-la avec ta probabilité estimée.

LIVRABLE FINAL ATTENDU (en français, strict, format Markdown) :
🎾 **Contexte et Probabilités** : [Résumé probabilités implicites vs tes probabilités]
📊 **Analyse Value & De-Vigging** : [Le marché sous-estime-t-il un joueur ? Décision Value Bet Oui/Non]
🔑 **Facteurs Tactiques et Forme** : [Points clés de la forme et du service]
🔥 **Verdict et Gestion (Quarter-Kelly)** : [Recommandation claire avec Kelly Fractionné (max 5%). Alerte Abandon si pertinent.]`;

    const userPrompt = `DONNÉES DU MATCH À ANALYSER :
Joueur A : ${playerA.name} (Cote Pinnacle/Bookmaker : ${oddsA || 'N/A'}) - ELO : ${eloAText}
Joueur B : ${playerB.name} (Cote Pinnacle/Bookmaker : ${oddsB || 'N/A'}) - ELO : ${eloBText}
Tournoi et Surface : ${tournament} (${surface})
Statut actuel : ${is_live ? 'En direct' : 'À venir'} (Score/Heure : ${score_str})

STATISTIQUES COMPLÉMENTAIRES (Si disponibles) :
H2H Récent : ${h2hText}
Forme ${playerA.name} (5 derniers) : ${formAText}
Forme ${playerB.name} (5 derniers) : ${formBText}
Stats Service ${playerA.name} : ${serveAText}
Stats Service ${playerB.name} : ${serveBText}

Génère ton analyse finale selon le format demandé. Reste percutant et professionnel.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'APK Tennis',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.5,
        max_tokens: 600,
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
