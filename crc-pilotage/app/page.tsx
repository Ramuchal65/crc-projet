import { createClient } from "@/lib/supabase/server";

const PRIORITY_LABEL: Record<string, string> = {
  haute: "Haute",
  moyenne: "Moyenne",
  basse: "Basse",
};

const STATUS_LABEL: Record<string, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  bloque: "Bloqué",
  fait: "Fait",
};

const STATUS_ORDER = ["bloque", "en_cours", "a_faire", "fait"];

export default async function TasksPage() {
  const supabase = createClient();
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*")
    .order("priority", { ascending: false })
    .order("order_index", { ascending: true });

  if (error) {
    return (
      <p className="text-critique text-sm">
        Erreur de chargement : {error.message}
      </p>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-16 text-ink/50">
        <p className="mb-3">Aucune tâche pour l'instant.</p>
        <a href="/import" className="underline underline-offset-4 text-ink">
          Importer un premier CR
        </a>
      </div>
    );
  }

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    items: tasks.filter((t) => t.status === status),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-10">
      {grouped.map((group) => (
        <section key={group.status}>
          <h2 className="text-sm font-medium uppercase tracking-wide text-ink/50 mb-3">
            {STATUS_LABEL[group.status]} ({group.items.length})
          </h2>
          <div className="space-y-2">
            {group.items.map((task) => (
              <div
                key={task.id}
                className="border border-line rounded-md p-4 bg-white flex items-start justify-between gap-4"
              >
                <div>
                  <p className="font-medium">{task.title}</p>
                  {task.description && (
                    <p className="text-sm text-ink/60 mt-1">{task.description}</p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-ink/50">
                    {task.responsible_name_raw && (
                      <span>{task.responsible_name_raw}</span>
                    )}
                    {task.due_date_raw && <span>Échéance : {task.due_date_raw}</span>}
                    {task.ref_source && (
                      <span className="font-mono">{task.ref_source}</span>
                    )}
                  </div>
                </div>
                <span
                  className={`text-xs font-medium shrink-0 text-${task.priority}`}
                >
                  {PRIORITY_LABEL[task.priority] ?? task.priority}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
