"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Tache = {
  ref_source: string | null;
  titre: string;
  description: string | null;
  responsables: string[];
  type: "technique" | "decisionnel" | null;
  priorite: "haute" | "moyenne" | "basse" | null;
  echeance_brute: string | null;
  statut_source: string | null;
};

type Risque = {
  niveau: "critique" | "eleve" | "modere";
  description: string;
  impact: string | null;
  recommandation: string | null;
  action_liee: string | null;
};

type Extraction = {
  cr_meta: { titre: string | null; date: string | null; equipe: string | null };
  taches: Tache[];
  risques: Risque[];
};

export default function ImportPage() {
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/extract-file", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de l'extraction du fichier.");
      setRawText(data.text);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setExtracting(false);
      e.target.value = ""; // permet de réuploader le même fichier si besoin
    }
  }

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    setExtraction(null);
    try {
      const res = await fetch("/api/parse-cr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de l'analyse.");
      setExtraction(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function updateTache(index: number, patch: Partial<Tache>) {
    if (!extraction) return;
    const taches = [...extraction.taches];
    taches[index] = { ...taches[index], ...patch };
    setExtraction({ ...extraction, taches });
  }

  function removeTache(index: number) {
    if (!extraction) return;
    setExtraction({
      ...extraction,
      taches: extraction.taches.filter((_, i) => i !== index),
    });
  }

  async function handleConfirm() {
    if (!extraction) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();

      // Projet par défaut "Pilotage CRC" — brique ultérieure : choix du projet
      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("name", "Pilotage CRC")
        .single();

      if (!project) throw new Error("Projet 'Pilotage CRC' introuvable.");

      const { data: crImport, error: crErr } = await supabase
        .from("cr_imports")
        .insert({
          project_id: project.id,
          raw_text: rawText,
          cr_title: extraction.cr_meta.titre,
          cr_date: extraction.cr_meta.date,
        })
        .select()
        .single();
      if (crErr) throw crErr;

      const tasksToInsert = extraction.taches.map((t, i) => ({
        project_id: project.id,
        cr_import_id: crImport.id,
        ref_source: t.ref_source,
        title: t.titre,
        description: t.description,
        responsible_name_raw: t.responsables.join(", ") || null,
        task_type: t.type,
        priority: t.priorite ?? "moyenne",
        status: "a_faire",
        due_date_raw: t.echeance_brute,
        order_index: i,
      }));

      if (tasksToInsert.length > 0) {
        const { error: taskErr } = await supabase.from("tasks").insert(tasksToInsert);
        if (taskErr) throw taskErr;
      }

      if (extraction.risques.length > 0) {
        const risksToInsert = extraction.risques.map((r) => ({
          project_id: project.id,
          cr_import_id: crImport.id,
          level: r.niveau,
          description: r.description,
          impact: r.impact,
          recommendation: r.recommandation,
        }));
        const { error: riskErr } = await supabase.from("risks").insert(risksToInsert);
        if (riskErr) throw riskErr;
      }

      setSaved(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="max-w-lg">
        <h1 className="text-xl font-medium mb-2">CR importé</h1>
        <p className="text-ink/70 mb-6">
          {extraction?.taches.length} tâche(s) et {extraction?.risques.length} risque(s)
          ajoutés au pilotage CRC.
        </p>
        <a href="/" className="text-sm underline underline-offset-4">
          Voir la liste des tâches
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-medium">Importer un compte-rendu</h1>

      {!extraction && (
        <>
          <div className="flex items-center gap-3">
            <label className="text-sm border border-line rounded-lg px-3 py-2 bg-white cursor-pointer hover:bg-line/20 transition-colors">
              {extracting ? "Extraction en cours..." : "Importer un fichier (.txt, .docx, .pdf)"}
              <input
                type="file"
                accept=".txt,.docx,.pdf"
                onChange={handleFileUpload}
                disabled={extracting}
                className="hidden"
              />
            </label>
            <span className="text-xs text-ink/40">ou colle le texte ci-dessous</span>
          </div>
          <textarea
            className="w-full h-72 border border-line rounded-lg p-4 text-sm font-mono bg-white"
            placeholder="Colle ici le texte du compte-rendu, ou importe un fichier ci-dessus..."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
          <button
            onClick={handleAnalyze}
            disabled={loading || rawText.trim().length < 20}
            className="bg-accent text-white hover:bg-accent/90 transition-colors px-4 py-2 rounded-lg text-sm disabled:opacity-40"
          >
            {loading ? "Analyse en cours..." : "Analyser le CR"}
          </button>
        </>
      )}

      {error && (
        <p className="text-critique text-sm border border-critique/30 bg-critique/5 rounded-lg p-3">
          {error}
        </p>
      )}

      {extraction && (
        <div className="space-y-8">
          <div className="text-sm text-ink/60">
            {extraction.cr_meta.titre || "CR sans titre"} ·{" "}
            {extraction.cr_meta.date || "date inconnue"} — relis et corrige avant de
            valider.
          </div>

          <section className="space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-ink/50">
              Tâches ({extraction.taches.length})
            </h2>
            {extraction.taches.map((t, i) => (
              <div key={i} className="border border-line rounded-lg p-4 bg-white space-y-2">
                <div className="flex items-start gap-2">
                  <input
                    className="flex-1 font-medium border-b border-transparent hover:border-line focus:border-ink outline-none bg-transparent"
                    value={t.titre}
                    onChange={(e) => updateTache(i, { titre: e.target.value })}
                  />
                  <button
                    onClick={() => removeTache(i)}
                    className="text-xs text-ink/40 hover:text-critique"
                  >
                    supprimer
                  </button>
                </div>
                {t.description && (
                  <p className="text-sm text-ink/60">{t.description}</p>
                )}
                <div className="flex flex-wrap gap-3 text-xs pt-1">
                  <label className="flex items-center gap-1">
                    Responsable(s)
                    <input
                      className="border border-line rounded px-2 py-1 bg-paper"
                      value={t.responsables.join(", ")}
                      onChange={(e) =>
                        updateTache(i, {
                          responsables: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </label>
                  <label className="flex items-center gap-1">
                    Priorité
                    <select
                      className="border border-line rounded px-2 py-1 bg-paper"
                      value={t.priorite ?? ""}
                      onChange={(e) =>
                        updateTache(i, { priorite: (e.target.value || null) as any })
                      }
                    >
                      <option value="">—</option>
                      <option value="haute">Haute</option>
                      <option value="moyenne">Moyenne</option>
                      <option value="basse">Basse</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-1">
                    Échéance
                    <input
                      className="border border-line rounded px-2 py-1 bg-paper"
                      value={t.echeance_brute ?? ""}
                      onChange={(e) => updateTache(i, { echeance_brute: e.target.value })}
                    />
                  </label>
                </div>
              </div>
            ))}
          </section>

          {extraction.risques.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium uppercase tracking-wide text-ink/50">
                Points de vigilance ({extraction.risques.length})
              </h2>
              {extraction.risques.map((r, i) => (
                <div
                  key={i}
                  className={`border rounded-lg p-3 text-sm bg-white border-${r.niveau}/30`}
                >
                  <span className={`text-${r.niveau} font-medium`}>
                    {r.niveau.toUpperCase()}
                  </span>{" "}
                  — {r.description}
                </div>
              ))}
            </section>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="bg-accent text-white hover:bg-accent/90 transition-colors px-4 py-2 rounded-lg text-sm disabled:opacity-40"
            >
              {saving ? "Enregistrement..." : "Valider et ajouter au pilotage"}
            </button>
            <button
              onClick={() => setExtraction(null)}
              className="text-sm text-ink/60 underline underline-offset-4"
            >
              Recommencer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
