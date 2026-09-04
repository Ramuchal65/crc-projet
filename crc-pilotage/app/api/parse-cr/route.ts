import { NextRequest, NextResponse } from "next/server";

// Le traitement Gemini peut dépasser la limite par défaut de 10s des
// fonctions serverless Vercel (offre gratuite) sur un CR long — on
// l'étend explicitement (60s = max autorisé sur Hobby).
export const maxDuration = 60;

const EXTRACTION_PROMPT = `Tu extrais les actions et points de vigilance d'un compte-rendu de réunion français, quel que soit son niveau de structuration (tableau déjà formaté, paragraphes en texte libre, ou mélange des deux).

RÈGLES STRICTES :
- N'invente RIEN. Si une information n'est pas écrite dans le CR (responsable, échéance, priorité), laisse le champ correspondant à null plutôt que de deviner.
- Pour les échéances : recopie exactement le texte tel qu'écrit dans le CR (ex: "Sept. 2026", "avant la rentrée", "d'ici 2 semaines") dans "echeance_brute". Ne convertis JAMAIS en date ISO toi-même — cette normalisation est faite ailleurs, de façon déterministe.
- Une "tâche" est une action concrète à réaliser, décidée ou à faire — pas une simple information ou un constat.
- Si le CR contient déjà un tableau de plan d'actions structuré, utilise-le comme source principale mais vérifie qu'aucune action mentionnée seulement dans le texte narratif n'a été oubliée.
- Pour les risques/points de vigilance, ne garde que ce qui est explicitement signalé comme un risque, un point d'alerte ou une vigilance — pas une tâche normale.
- "type" doit être "technique", "decisionnel", ou null si tu ne peux pas le déterminer avec confiance.
- "priorite" doit être "haute", "moyenne", "basse", ou null si non déterminable depuis le texte.

Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant/après, sans balises markdown, au format suivant :

{
  "cr_meta": { "titre": string|null, "date": string|null (format YYYY-MM-DD si trouvable), "equipe": string|null },
  "taches": [
    {
      "ref_source": string|null,
      "titre": string,
      "description": string|null,
      "responsables": string[],
      "type": "technique"|"decisionnel"|null,
      "priorite": "haute"|"moyenne"|"basse"|null,
      "echeance_brute": string|null,
      "statut_source": string|null
    }
  ],
  "risques": [
    {
      "niveau": "critique"|"eleve"|"modere",
      "description": string,
      "impact": string|null,
      "recommandation": string|null,
      "action_liee": string|null
    }
  ]
}`;

export async function POST(req: NextRequest) {
  try {
    const { rawText } = await req.json();

    if (!rawText || typeof rawText !== "string" || rawText.trim().length < 20) {
      return NextResponse.json(
        { error: "Le texte du CR est vide ou trop court." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY manquante côté serveur." },
        { status: 500 }
      );
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;
    const geminiBody = JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `${EXTRACTION_PROMPT}\n\n--- CR À ANALYSER ---\n\n${rawText}` }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    // Gemini renvoie parfois 503 (surcharge temporaire côté Google) ou
    // 429 (quota atteint) — on retente automatiquement avant d'abandonner,
    // plutôt que de faire échouer l'utilisateur sur une simple saturation
    // passagère du service.
    let response: Response | null = null;
    let lastErrText = "";
    const RETRY_DELAYS_MS = [1500, 4000]; // 2 tentatives supplémentaires

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: geminiBody,
      });

      if (response.ok) break;

      const retryable = response.status === 503 || response.status === 429;
      lastErrText = await response.text();

      if (!retryable || attempt === RETRY_DELAYS_MS.length) break;

      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }

    if (!response || !response.ok) {
      const friendly =
        response?.status === 503
          ? "Le service d'IA (Gemini) est momentanément surchargé côté Google, même après plusieurs tentatives. Réessaie dans une minute ou deux — ce n'est pas un bug de l'outil."
          : response?.status === 429
          ? "Quota Gemini temporairement atteint. Réessaie un peu plus tard."
          : `Erreur Gemini (statut ${response?.status ?? "inconnu"}) : ${lastErrText}`;
      return NextResponse.json({ error: friendly }, { status: 502 });
    }

    const data = await response.json();
    const textOut = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textOut) {
      return NextResponse.json(
        { error: "Réponse Gemini vide ou inattendue." },
        { status: 502 }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(textOut);
    } catch {
      return NextResponse.json(
        { error: "La réponse de Gemini n'était pas un JSON valide.", raw: textOut },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Erreur inconnue lors du parsing." },
      { status: 500 }
    );
  }
}
