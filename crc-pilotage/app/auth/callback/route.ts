import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";

  console.log("[auth/callback] reçu", {
    hasCode: !!code,
    hasTokenHash: !!tokenHash,
    type,
    next,
    url: request.url,
  });

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

  try {
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
  } catch (e: any) {
    console.error("[auth/callback] exception pendant l'échange", e);
    authError = `Exception : ${e?.message ?? String(e)}`;
  }

  console.log("[auth/callback] résultat", { hasUser: !!user, authError });

  if (authError || !user) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(authError ?? "Échec de connexion inconnu.")}`
    );
  }

  // Cherche une fiche salarié pré-créée avec cet email (par un admin
  // via la page Équipe), sinon une fiche déjà liée à ce compte, sinon
  // on en crée une nouvelle automatiquement.
  try {
    // On récupère TOUTES les fiches correspondant à cet email (pas
    // .maybeSingle, qui échouerait silencieusement s'il y en a déjà
    // plusieurs) pour gérer proprement le cas d'un doublon existant.
    const { data: matches, error: lookupError } = await supabase
      .from("employees")
      .select("id, auth_user_id")
      .ilike("email", user.email ?? "");

    if (lookupError) console.error("[auth/callback] lookup employees error", lookupError);

    const alreadyLinked = matches?.find((m) => m.auth_user_id === user.id);
    const unlinkedPlaceholder = matches?.find((m) => !m.auth_user_id);

    if (alreadyLinked) {
      // rien à faire, déjà lié (reconnexion normale)
    } else if (unlinkedPlaceholder) {
      const { error: updateError } = await supabase
        .from("employees")
        .update({ auth_user_id: user.id })
        .eq("id", unlinkedPlaceholder.id);
      if (updateError) console.error("[auth/callback] update employees error", updateError);
    } else if (!matches || matches.length === 0) {
      const fallbackName = user.email?.split("@")[0]?.replace(/[._]/g, " ") ?? "Nouveau salarié";
      const { error: insertError } = await supabase.from("employees").insert({
        auth_user_id: user.id,
        email: user.email,
        full_name: fallbackName,
        role: "salarie",
      });
      if (insertError) console.error("[auth/callback] insert employees error", insertError);
    }
    // sinon : des fiches existent mais toutes déjà liées à d'autres
    // comptes (cas anormal) — on ne crée rien de plus, à nettoyer
    // manuellement sur /team.
  } catch (e) {
    console.error("[auth/callback] exception liaison salarié", e);
  }

  console.log("[auth/callback] succès, redirection vers", next);
  return response;
}
