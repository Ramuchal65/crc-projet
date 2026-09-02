import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
    }

    const name = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let text = "";

    if (name.endsWith(".txt")) {
      text = buffer.toString("utf-8");
    } else if (name.endsWith(".docx")) {
      const mammoth = (await import("mammoth")).default;
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (name.endsWith(".pdf")) {
      // import direct (pas top-level) pour éviter que pdf-parse exécute son
      // script de test au chargement du module en environnement serverless
      const pdfParse = (await import("pdf-parse")).default;
      const result = await pdfParse(buffer);
      text = result.text;
    } else if (name.endsWith(".doc")) {
      return NextResponse.json(
        {
          error:
            "Le format .doc (Word 97-2003) n'est pas supporté, seulement .docx. Réenregistre le fichier au format .docx depuis Word, ou colle le texte directement.",
        },
        { status: 415 }
      );
    } else {
      return NextResponse.json(
        { error: "Format non supporté. Utilise .txt, .docx ou .pdf." },
        { status: 415 }
      );
    }

    text = text.trim();

    if (text.length < 20) {
      return NextResponse.json(
        {
          error:
            "Aucun texte exploitable extrait du fichier (PDF scanné/image sans texte sélectionnable ?). Essaie de coller le texte manuellement.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ text });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Échec de l'extraction : ${err?.message ?? "erreur inconnue"}` },
      { status: 500 }
    );
  }
}
