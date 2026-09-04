import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";

  // Réponse construite dès le départ : les cookies de session seront
  // attachés directement dessus, sans dépendre de la fusion implicite
  // de next/headers (source du bug précédent : session créée côté
  // Supabase mais cookie jamais transmis au navigateur).
  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  let user = null;
  let authError: string | null = null;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) authError = error.message;
    else user = data.user;
  } else if (tokenHash && type) {
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

  return response;
}
