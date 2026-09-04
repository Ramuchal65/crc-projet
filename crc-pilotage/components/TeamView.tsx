"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Employee, Team } from "@/lib/types";
import { PROJECT_COLOR_PRESETS } from "@/lib/avatar";
import { UserPlus, Check, Circle, Plus } from "lucide-react";

interface Membership {
  team_id: string;
  employee_id: string;
}

export default function TeamView({
  initialEmployees,
  initialTeams,
  initialMemberships,
  currentEmployeeId,
}: {
  initialEmployees: Employee[];
  initialTeams: Team[];
  initialMemberships: Membership[];
  currentEmployeeId: string | null;
}) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [memberships, setMemberships] = useState<Membership[]>(initialMemberships);
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [addingTeam, setAddingTeam] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamColor, setTeamColor] = useState(PROJECT_COLOR_PRESETS[0]);
  const supabase = createClient();

  async function addEmployee() {
    if (!name.trim() || !email.trim()) return;
    const { data, error } = await supabase
      .from("employees")
      .insert({ full_name: name.trim(), email: email.trim(), role: "salarie" })
      .select()
      .single();
    if (error) {
      alert("Échec : " + error.message);
      return;
    }
    setEmployees((prev) => [...prev, data as Employee]);
    setName("");
    setEmail("");
    setAddingEmployee(false);
  }

  async function addTeam() {
    if (!teamName.trim()) return;
    const { data, error } = await supabase
      .from("teams")
      .insert({ name: teamName.trim(), color: teamColor })
      .select()
      .single();
    if (error) {
      alert("Échec : " + error.message);
      return;
    }
    setTeams((prev) => [...prev, data as Team]);
    setTeamName("");
    setTeamColor(PROJECT_COLOR_PRESETS[0]);
    setAddingTeam(false);
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

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Équipes */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-medium">Équipes</h1>
          <button
            onClick={() => setAddingTeam(!addingTeam)}
            className="flex items-center gap-1.5 border border-line rounded-lg px-3 py-1.5 text-sm hover:bg-paper transition-colors"
          >
            <Plus size={14} />
            Nouvelle équipe
          </button>
        </div>

        {addingTeam && (
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
          <button
            onClick={() => setAddingEmployee(!addingEmployee)}
            className="flex items-center gap-1.5 bg-accent text-white hover:bg-accent/90 transition-colors px-3 py-1.5 rounded-lg text-sm"
          >
            <UserPlus size={14} />
            Ajouter
          </button>
        </div>

        <p className="text-xs text-ink/40 bg-accentSoft border border-accent/20 rounded-lg px-3 py-2">
          Ajouter un salarié ici ne l'inscrit pas automatiquement — ça réserve juste son nom et
          son rôle. Il devra se connecter une première fois via la page de connexion avec la
          même adresse e-mail pour activer son compte. N'oublie pas de cocher au moins une
          équipe pour qu'il voie des projets.
        </p>

        {addingEmployee && (
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
            <button onClick={addEmployee} className="bg-accent text-white px-3 py-1.5 rounded-lg text-sm">
              Enregistrer
            </button>
          </div>
        )}

        <div className="border border-line rounded-lg bg-white divide-y divide-line">
          {employees.map((emp) => (
            <div key={emp.id} className="flex items-center gap-3 px-4 py-2.5 flex-wrap">
              <span title={emp.auth_user_id ? "Compte activé" : "Pas encore connecté"}>
                <Circle
                  size={8}
                  className={emp.auth_user_id ? "fill-basse text-basse" : "fill-line text-line"}
                />
              </span>
              <input
                defaultValue={emp.full_name}
                onBlur={(e) => e.target.value !== emp.full_name && updateName(emp.id, e.target.value)}
                className="text-sm bg-transparent outline-none border-b border-transparent hover:border-line focus:border-ink w-36 shrink-0"
              />
              <span className="text-xs text-ink/40 w-44 truncate shrink-0">{emp.email}</span>
              <select
                value={emp.role}
                onChange={(e) => updateRole(emp.id, e.target.value as "admin" | "salarie")}
                className="text-xs border border-line rounded px-1.5 py-1 bg-white shrink-0"
              >
                <option value="salarie">Salarié</option>
                <option value="admin">Admin</option>
              </select>

              <div className="flex items-center gap-1.5 flex-wrap">
                {teams.map((t) => {
                  const active = memberships.some(
                    (m) => m.employee_id === emp.id && m.team_id === t.id
                  );
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
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
