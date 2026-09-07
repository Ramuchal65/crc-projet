"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, KeyRound } from "lucide-react";

export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/30 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <KeyRound size={15} />
            Changer mon mot de passe
          </div>
          <button onClick={onClose} className="text-ink/40 hover:text-ink">
            <X size={16} />
          </button>
        </div>

        {done ? (
          <p className="text-sm text-basse">
            Mot de passe mis à jour. Il sera à utiliser dès ta prochaine connexion.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nouveau mot de passe (8 caractères min.)"
                className="w-full border border-line rounded-md px-3 py-2 text-sm bg-white"
              />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Confirmer le mot de passe"
                className="w-full border border-line rounded-md px-3 py-2 text-sm bg-white"
              />
            </div>
            {error && <p className="text-xs text-critique">{error}</p>}
            <button
              onClick={submit}
              disabled={saving || !password || !confirm}
              className="w-full bg-accent text-white hover:bg-accent/90 transition-colors rounded-lg py-2 text-sm disabled:opacity-40"
            >
              {saving ? "Enregistrement..." : "Valider"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
