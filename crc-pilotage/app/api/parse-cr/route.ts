import { NextRequest, NextResponse } from "next/server";

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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `Erreur Gemini: ${errText}` },
        { status: 502 }
      );
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
