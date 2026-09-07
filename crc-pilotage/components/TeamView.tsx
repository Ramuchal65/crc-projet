"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Employee, Team } from "@/lib/types";
import { PROJECT_COLOR_PRESETS } from "@/lib/avatar";
import { UserPlus, Check, Circle, Plus, Trash2, KeyRound, Copy } from "lucide-react";

interface Membership {
  team_id: string;
  employee_id: string;
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function TeamView({
  initialEmployees,
  initialTeams,
  initialMemberships,
  currentEmployeeId,
  isAdmin,
}: {
  initialEmployees: Employee[];
  initialTeams: Team[];
  initialMemberships: Membership[];
  currentEmployeeId: string | null;
  isAdmin: boolean;
}) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [memberships, setMemberships] = useState<Membership[]>(initialMemberships);
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(generatePassword());
  const [addingTeam, setAddingTeam] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamColor, setTeamColor] = useState(PROJECT_COLOR_PRESETS[0]);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [savedPasswordFor, setSavedPasswordFor] = useState<{ name: string; password: string } | null>(
    null
  );
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  async function addEmployee() {
    if (!name.trim() || !email.trim() || password.length < 8) return;
    setBusy(true);
    const newEmployee: Employee = {
      id: crypto.randomUUID(),
      full_name: name.trim(),
      email: email.trim(),
      role: "salarie",
      auth_user_id: null,
      created_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("employees").insert(newEmployee);
    if (error) {
      alert("Échec : " + error.message);
      setBusy(false);
      return;
    }

    const res = await fetch("/api/admin/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: newEmployee.id, email: newEmployee.email, password }),
    });
    const result = await res.json();
    setBusy(false);

    if (!res.ok) {
      alert("Fiche créée, mais échec de création du compte : " + result.error);
    } else {
      setSavedPasswordFor({ name: newEmployee.full_name, password });
    }

    setEmployees((prev) => [...prev, { ...newEmployee, auth_user_id: "pending" }]);
    setName("");
    setEmail("");
    setPassword(generatePassword());
    setAddingEmployee(false);
  }

  async function submitResetPassword(emp: Employee) {
    if (resetPassword.length < 8) {
      alert("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/admin/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: emp.id, email: emp.email, password: resetPassword }),
    });
    const result = await res.json();
    setBusy(false);
    if (!res.ok) {
      alert("Échec : " + result.error);
      return;
    }
    setSavedPasswordFor({ name: emp.full_name, password: resetPassword });
    setResettingId(null);
    setResetPassword("");
    if (!emp.auth_user_id) {
      setEmployees((prev) => prev.map((e) => (e.id === emp.id ? { ...e, auth_user_id: "pending" } : e)));
    }
  }

  async function addTeam() {
    if (!teamName.trim()) return;
    const newTeam: Team = {
      id: crypto.randomUUID(),
      name: teamName.trim(),
      color: teamColor,
      created_at: new Date().toISOString(),
    };
    setTeams((prev) => [...prev, newTeam]);
    setTeamName("");
    setTeamColor(PROJECT_COLOR_PRESETS[0]);
    setAddingTeam(false);
    const { error } = await supabase.from("teams").insert(newTeam);
    if (error) {
      alert("Échec : " + error.message);
      setTeams((prev) => prev.filter((t) => t.id !== newTeam.id));
    }
  }

  async function toggleMembership(employeeId: string, teamId: string) {
    const exists = memberships.some(
      (m) => m.employee_id === employeeId && m.team_id === teamId
    );
    if (exists) {
      setMemberships((prev) =>
        prev.filter((m) => !(m.employee_id === employeeId && m.team_id === teamId))
      );
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("employee_id", employeeId)
        .eq("team_id", teamId);
      if (error) console.error(error.message);
    } else {
      setMemberships((prev) => [...prev, { employee_id: employeeId, team_id: teamId }]);
      const { error } = await supabase
        .from("team_members")
        .insert({ employee_id: employeeId, team_id: teamId });
      if (error) console.error(error.message);
    }
  }

  async function updateRole(id: string, role: "admin" | "salarie") {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, role } : e)));
    await supabase.from("employees").update({ role }).eq("id", id);
  }

  async function updateName(id: string, full_name: string) {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, full_name } : e)));
    await supabase.from("employees").update({ full_name }).eq("id", id);
  }

  async function deleteEmployee(id: string) {
    if (!confirm("Supprimer cette fiche salarié ? Utile pour nettoyer un doublon.")) return;
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) alert("Échec : " + error.message);
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {savedPasswordFor && (
        <div className="border border-accent/30 bg-accentSoft rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium">
            Mot de passe pour {savedPasswordFor.name} — à communiquer maintenant, il ne sera
            plus jamais réaffiché :
          </p>
          <div className="flex items-center gap-2">
            <code className="bg-white border border-line rounded px-3 py-1.5 text-sm font-mono">
              {savedPasswordFor.password}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(savedPasswordFor.password)}
              className="text-accent hover:text-accent/80 flex items-center gap-1 text-xs"
            >
              <Copy size={13} /> Copier
            </button>
          </div>
          <button
            onClick={() => setSavedPasswordFor(null)}
            className="text-xs text-ink/40 hover:text-ink"
          >
            J'ai noté, fermer
          </button>
        </div>
      )}

      {/* Équipes */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-medium">Équipes</h1>
          {isAdmin && (
            <button
              onClick={() => setAddingTeam(!addingTeam)}
              className="flex items-center gap-1.5 border border-line rounded-lg px-3 py-1.5 text-sm hover:bg-paper transition-colors"
            >
              <Plus size={14} />
              Nouvelle équipe
            </button>
          )}
        </div>

        {addingTeam && isAdmin && (
          <div className="border border-line rounded-lg p-3 bg-white flex items-center gap-2 flex-wrap">
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Nom de l'équipe (ex: DPI)"
              className="border border-line rounded-md px-2.5 py-1.5 text-sm bg-white flex-1 min-w-[140px]"
            />
            <div className="flex items-center gap-1.5">
              {PROJECT_COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => setTeamColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-5 h-5 rounded-full ${teamColor === c ? "ring-2 ring-offset-1 ring-ink/40" : ""}`}
                />
              ))}
            </div>
            <button onClick={addTeam} className="bg-accent text-white px-3 py-1.5 rounded-lg text-sm">
              Créer
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {teams.map((t) => (
            <span
              key={t.id}
              className="flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-full border border-line bg-white"
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
              {t.name}
              <span className="text-ink/40 text-xs">
                ({memberships.filter((m) => m.team_id === t.id).length})
              </span>
            </span>
          ))}
        </div>
      </section>

      {/* Salariés */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">Salariés</h2>
            <p className="text-sm text-ink/50">{employees.length} membre(s)</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setAddingEmployee(!addingEmployee)}
              className="flex items-center gap-1.5 bg-accent text-white hover:bg-accent/90 transition-colors px-3 py-1.5 rounded-lg text-sm"
            >
              <UserPlus size={14} />
              Ajouter
            </button>
          )}
        </div>

        {isAdmin && (
          <p className="text-xs text-ink/40 bg-accentSoft border border-accent/20 rounded-lg px-3 py-2">
            Ajouter un salarié crée directement son compte avec le mot de passe indiqué — il
            peut se connecter immédiatement, pas besoin d'email de confirmation. Pense à
            cocher au moins une équipe pour qu'il voie des projets.
          </p>
        )}

        {addingEmployee && isAdmin && (
          <div className="border border-line rounded-lg p-3 bg-white space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom complet"
              className="w-full border border-line rounded-md px-2.5 py-1.5 text-sm bg-white"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@structure.fr"
              type="email"
              className="w-full border border-line rounded-md px-2.5 py-1.5 text-sm bg-white"
            />
            <div className="flex items-center gap-2">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 border border-line rounded-md px-2.5 py-1.5 text-sm bg-white font-mono"
              />
              <button
                type="button"
                onClick={() => setPassword(generatePassword())}
                className="text-xs text-accent hover:text-accent/80 shrink-0"
              >
                Régénérer
              </button>
            </div>
            <button
              onClick={addEmployee}
              disabled={busy}
              className="bg-accent text-white px-3 py-1.5 rounded-lg text-sm disabled:opacity-40"
            >
              {busy ? "Création..." : "Créer le compte"}
            </button>
          </div>
        )}

        <div className="border border-line rounded-lg bg-white divide-y divide-line">
          {employees.map((emp) => (
            <div key={emp.id} className="px-4 py-2.5 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span title={emp.auth_user_id ? "Compte activé" : "Pas encore de compte"}>
                  <Circle
                    size={8}
                    className={emp.auth_user_id ? "fill-basse text-basse" : "fill-line text-line"}
                  />
                </span>
                <input
                  defaultValue={emp.full_name}
                  onBlur={(e) => e.target.value !== emp.full_name && updateName(emp.id, e.target.value)}
                  disabled={!isAdmin && emp.id !== currentEmployeeId}
                  className="text-sm bg-transparent outline-none border-b border-transparent hover:border-line focus:border-ink w-36 shrink-0 disabled:text-ink/60"
                />
                <span className="text-xs text-ink/40 w-44 truncate shrink-0">{emp.email}</span>
                {isAdmin ? (
                  <select
                    value={emp.role}
                    onChange={(e) => updateRole(emp.id, e.target.value as "admin" | "salarie")}
                    className="text-xs border border-line rounded px-1.5 py-1 bg-white shrink-0"
                  >
                    <option value="salarie">Salarié</option>
                    <option value="admin">Admin</option>
                  </select>
                ) : (
                  <span className="text-xs text-ink/40 shrink-0 capitalize">{emp.role}</span>
                )}

                <div className="flex items-center gap-1.5 flex-wrap">
                  {teams.map((t) => {
                    const active = memberships.some(
                      (m) => m.employee_id === emp.id && m.team_id === t.id
                    );
                    if (!isAdmin) {
                      return active ? (
                        <span
                          key={t.id}
                          className="text-[11px] px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: t.color }}
                        >
                          {t.name}
                        </span>
                      ) : null;
                    }
                    return (
                      <button
                        key={t.id}
                        onClick={() => toggleMembership(emp.id, t.id)}
                        className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                          active
                            ? "text-white border-transparent"
                            : "text-ink/40 border-line hover:border-ink/30"
                        }`}
                        style={active ? { backgroundColor: t.color } : undefined}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>

                {emp.id === currentEmployeeId && (
                  <span className="text-[10px] text-accent flex items-center gap-0.5 ml-auto">
                    <Check size={10} /> Toi
                  </span>
                )}
                {isAdmin && (
                  <button
                    onClick={() => {
                      setResettingId(resettingId === emp.id ? null : emp.id);
                      setResetPassword(generatePassword());
                    }}
                    title={emp.auth_user_id ? "Réinitialiser le mot de passe" : "Créer le compte"}
                    className={`text-ink/30 hover:text-accent transition-colors ${
                      emp.id !== currentEmployeeId ? "" : "ml-auto"
                    }`}
                  >
                    <KeyRound size={13} />
                  </button>
                )}
                {isAdmin && emp.id !== currentEmployeeId && (
                  <button
                    onClick={() => deleteEmployee(emp.id)}
                    title="Supprimer cette fiche"
                    className="text-ink/25 hover:text-critique transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              {resettingId === emp.id && (
                <div className="flex items-center gap-2 pl-5">
                  <input
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="flex-1 border border-line rounded-md px-2.5 py-1.5 text-sm bg-white font-mono max-w-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setResetPassword(generatePassword())}
                    className="text-xs text-accent hover:text-accent/80"
                  >
                    Régénérer
                  </button>
                  <button
                    onClick={() => submitResetPassword(emp)}
                    disabled={busy}
                    className="bg-accent text-white px-2.5 py-1.5 rounded-lg text-xs disabled:opacity-40"
                  >
                    Valider
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
