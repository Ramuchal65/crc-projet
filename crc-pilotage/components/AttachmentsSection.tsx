"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TaskAttachment } from "@/lib/types";
import { Paperclip, Download, Trash2, Upload } from "lucide-react";

const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 Mo

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function AttachmentsSection({
  taskId,
  currentEmployeeId,
}: {
  taskId: string;
  currentEmployeeId: string | null;
}) {
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("task_attachments")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("Échec chargement pièces jointes :", error.message);
        setAttachments((data as TaskAttachment[]) ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);

    if (file.size > MAX_SIZE_BYTES) {
      setError(`Fichier trop volumineux (max 15 Mo, celui-ci fait ${formatSize(file.size)}).`);
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const storagePath = `${taskId}/${crypto.randomUUID()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("attachments")
      .upload(storagePath, file);

    if (uploadError) {
      setUploading(false);
      setError(`Échec de l'envoi : ${uploadError.message}`);
      return;
    }

    const newAttachment: TaskAttachment = {
      id: crypto.randomUUID(),
      task_id: taskId,
      uploaded_by: currentEmployeeId,
      file_name: file.name,
      file_size: file.size,
      storage_path: storagePath,
      created_at: new Date().toISOString(),
    };

    setAttachments((prev) => [newAttachment, ...prev]);
    const { error: insertError } = await supabase.from("task_attachments").insert(newAttachment);
    setUploading(false);

    if (insertError) {
      setError(`Échec de l'enregistrement : ${insertError.message}`);
      setAttachments((prev) => prev.filter((a) => a.id !== newAttachment.id));
      // le fichier a été envoyé mais sa fiche n'a pas pu être créée — on
      // nettoie le fichier orphelin pour ne pas gaspiller le quota
      await supabase.storage.from("attachments").remove([storagePath]);
    }
  }

  async function handleDownload(att: TaskAttachment) {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("attachments")
      .createSignedUrl(att.storage_path, 60);
    if (error || !data) {
      alert("Échec de l'ouverture du fichier : " + (error?.message ?? "erreur inconnue"));
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  async function handleDelete(att: TaskAttachment) {
    if (!confirm(`Supprimer « ${att.file_name} » ?`)) return;
    setAttachments((prev) => prev.filter((a) => a.id !== att.id));
    const supabase = createClient();
    await supabase.storage.from("attachments").remove([att.storage_path]);
    const { error } = await supabase.from("task_attachments").delete().eq("id", att.id);
    if (error) console.error("Échec suppression pièce jointe :", error.message);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-ink/50">
          <Paperclip size={12} />
          Pièces jointes {attachments.length > 0 && `(${attachments.length})`}
        </div>
        <label className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 cursor-pointer">
          <Upload size={12} />
          {uploading ? "Envoi..." : "Ajouter"}
          <input type="file" onChange={handleUpload} disabled={uploading} className="hidden" />
        </label>
      </div>

      {error && <p className="text-xs text-critique">{error}</p>}

      {loading ? (
        <p className="text-xs text-ink/30">Chargement...</p>
      ) : attachments.length === 0 ? (
        <p className="text-xs text-ink/30">Aucune pièce jointe.</p>
      ) : (
        <div className="space-y-1">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-2 border border-line rounded-md px-2.5 py-1.5 bg-white text-sm"
            >
              <button
                onClick={() => handleDownload(att)}
                className="flex-1 min-w-0 flex items-center gap-1.5 text-left hover:underline underline-offset-2 truncate"
                title={att.file_name}
              >
                <Download size={12} className="text-ink/40 shrink-0" />
                <span className="truncate">{att.file_name}</span>
              </button>
              <span className="text-[11px] text-ink/35 shrink-0">{formatSize(att.file_size)}</span>
              <button
                onClick={() => handleDelete(att)}
                className="text-ink/25 hover:text-critique shrink-0"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
