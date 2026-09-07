import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  // 1. Vérifie que l'appelant est bien un admin connecté (via son cookie
  // de session normal, soumis à la RLS habituelle)
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { data: caller } = await supabase
    .from("employees")
    .select("role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (caller?.role !== "admin") {
    return NextResponse.json({ error: "Réservé aux admins." }, { status: 403 });
  }

  const { employeeId, email, password } = await req.json();

  if (!employeeId || !password || password.length < 8) {
    return NextResponse.json(
      { error: "employeeId et un mot de passe d'au moins 8 caractères sont requis." },
      { status: 400 }
    );
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY manquante côté serveur." },
      { status: 500 }
    );
  }

  // 2. Client "service role" — contourne la RLS, ne doit JAMAIS être
  // utilisé côté navigateur. Sert uniquement ici à créer/gérer des
  // comptes auth, une opération intrinsèquement administrative.
  const admin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: employee } = await supabase
    .from("employees")
    .select("id, auth_user_id, email")
    .eq("id", employeeId)
    .maybeSingle();

  if (!employee) {
    return NextResponse.json({ error: "Salarié introuvable." }, { status: 404 });
  }

  if (employee.auth_user_id) {
    // Compte déjà existant (créé avant, ou via l'ancien lien magique) :
    // on se contente de (re)définir son mot de passe.
    const { error } = await admin.auth.admin.updateUserById(employee.auth_user_id, {
      password,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, created: false });
  }

  // Pas encore de compte auth : on le crée directement, email confirmé
  // d'office (pas de lien magique à cliquer).
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: email ?? employee.email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Échec de création du compte." },
      { status: 500 }
    );
  }

  const { error: linkError } = await supabase
    .from("employees")
    .update({ auth_user_id: created.user.id })
    .eq("id", employeeId);

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, created: true });
}
