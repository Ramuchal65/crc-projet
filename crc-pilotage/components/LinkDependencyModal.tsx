"use client";

import { Task } from "@/lib/types";
import { Link2 } from "lucide-react";

export default function LinkDependencyModal({
  taskA,
  taskB,
  onChoose,
  onCancel,
}: {
  taskA: Task;
  taskB: Task;
  onChoose: (dependentId: string, dependsOnId: string) => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/30 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-ink/70">
          <Link2 size={15} />
          Créer une dépendance
        </div>
        <p className="text-sm text-ink/50">
          Dans quel sens lier ces deux tâches ?
        </p>
        <div className="space-y-2">
          <button
            onClick={() => onChoose(taskA.id, taskB.id)}
            className="w-full text-left border border-line rounded-lg px-3 py-2.5 text-sm hover:border-accent hover:bg-accentSoft transition-colors"
          >
            <span className="font-medium">{taskA.title}</span>
            <span className="text-ink/40"> dépend de </span>
            <span className="font-medium">{taskB.title}</span>
          </button>
          <button
            onClick={() => onChoose(taskB.id, taskA.id)}
            className="w-full text-left border border-line rounded-lg px-3 py-2.5 text-sm hover:border-accent hover:bg-accentSoft transition-colors"
          >
            <span className="font-medium">{taskB.title}</span>
            <span className="text-ink/40"> dépend de </span>
            <span className="font-medium">{taskA.title}</span>
          </button>
        </div>
        <button
          onClick={onCancel}
          className="text-sm text-ink/40 hover:text-ink w-full text-center pt-1"
        >
          Annuler — je voulais juste déplacer la carte
        </button>
      </div>
    </div>
  );
}
