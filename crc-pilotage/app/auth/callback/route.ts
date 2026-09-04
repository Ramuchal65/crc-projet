import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";

  const supabase = createClient();
  let user = null;
  let authError: string | null = null;

  if (code) {
    // Flux PKCE (lien avec ?code=...)
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) authError = error.message;
    else user = data.user;
  } else if (tokenHash && type) {
    // Flux OTP classique (lien avec ?token_hash=...&type=magiclink)
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as any,
    });
    if (error) authError = error.message;
    else user = data.user;
  } else {
    authError = "Lien de connexion invalide ou incomplet (ni code, ni token_hash reçu).";
  }

  if (authError || !user) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(authError ?? "Échec de connexion inconnu.")}`
    );
  }

  // Cherche une fiche salarié pré-créée avec cet email (par un admin
  // via la page Équipe), sinon une fiche déjà liée à ce compte, sinon
  // on en crée une nouvelle automatiquement.
  const { data: existingByEmail } = await supabase
    .from("employees")
    .select("id, auth_user_id")
    .eq("email", user.email)
    .maybeSingle();

  if (existingByEmail && !existingByEmail.auth_user_id) {
    await supabase
      .from("employees")
      .update({ auth_user_id: user.id })
      .eq("id", existingByEmail.id);
  } else if (!existingByEmail) {
    const fallbackName = user.email?.split("@")[0]?.replace(/[._]/g, " ") ?? "Nouveau salarié";
    await supabase.from("employees").insert({
      auth_user_id: user.id,
      email: user.email,
      full_name: fallbackName,
      role: "salarie",
    });
  }

  return NextResponse.redirect(`${origin}${next}`);
}
