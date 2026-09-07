"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Lock } from "lucide-react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSending(false);
    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Email ou mot de passe incorrect."
          : error.message
      );
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-line rounded-lg p-5 space-y-3">
      <label className="block">
        <span className="text-xs uppercase tracking-wide text-ink/50 block mb-1">
          Adresse e-mail
        </span>
        <input
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="prenom.nom@structure.fr"
          className="w-full border border-line rounded-md px-3 py-2 text-sm bg-white"
        />
      </label>
      <label className="block">
        <span className="text-xs uppercase tracking-wide text-ink/50 block mb-1">
          Mot de passe
        </span>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full border border-line rounded-md px-3 py-2 text-sm bg-white"
        />
      </label>
      {error && <p className="text-xs text-critique">{error}</p>}
      <button
        type="submit"
        disabled={sending || !email.trim() || !password}
        className="w-full flex items-center justify-center gap-1.5 bg-accent text-white hover:bg-accent/90 transition-colors rounded-lg py-2 text-sm disabled:opacity-40"
      >
        <Lock size={13} />
        {sending ? "Connexion..." : "Se connecter"}
      </button>
      <p className="text-[11px] text-ink/35 text-center pt-1">
        Pas de compte ou mot de passe oublié ? Demande à un admin sur la page Équipe.
      </p>
    </form>
  );
}
