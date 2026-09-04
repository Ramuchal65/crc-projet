import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const user = data.user;

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
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
