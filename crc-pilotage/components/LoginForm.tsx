"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail } from "lucide-react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const callbackError = searchParams.get("error");
    if (callbackError) setError(callbackError);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setSending(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <>
      {sent ? (
        <div className="bg-white border border-line rounded-lg p-5 text-center space-y-2">
          <Mail size={20} className="mx-auto text-accent" />
          <p className="text-sm">
            Lien de connexion envoyé à <span className="font-medium">{email}</span>
          </p>
          <p className="text-xs text-ink/50">
            Ouvre l'email et clique sur le lien pour te connecter — pas de mot de passe à
            retenir.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-line rounded-lg p-5 space-y-3">
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-ink/50 block mb-1">
              Ton adresse e-mail
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@structure.fr"
              className="w-full border border-line rounded-md px-3 py-2 text-sm bg-white"
            />
          </label>
          {error && <p className="text-xs text-critique">{error}</p>}
          <button
            type="submit"
            disabled={sending || !email.trim()}
            className="w-full bg-accent text-white hover:bg-accent/90 transition-colors rounded-lg py-2 text-sm disabled:opacity-40"
          >
            {sending ? "Envoi..." : "Recevoir le lien de connexion"}
          </button>
        </form>
      )}
    </>
  );
}
