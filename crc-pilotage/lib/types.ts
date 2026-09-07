export type Priority = "haute" | "moyenne" | "basse";
export type Status = "a_faire" | "en_cours" | "bloque" | "fait";

export interface ActivityLogEntry {
  id: string;
  project_id: string;
  task_id: string | null;
  employee_id: string | null;
  action: "created" | "status" | "priority" | "assignee" | "due_date" | "comment";
  message: string;
  created_at: string;
}

export interface Notification {
  id: string;
  employee_id: string;
  type: "assigned" | "comment";
  task_id: string | null;
  message: string;
  read: boolean;
  created_at: string;
}

export interface Employee {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string | null;
  role: "admin" | "salarie";
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  team_id: string;
  default_visibility: "public" | "private";
  created_at: string;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  project_id: string;
  ref_source: string | null;
  title: string;
  description: string | null;
  responsible_name_raw: string | null;
  task_type: string | null;
  priority: Priority;
  status: Status;
  due_date_raw: string | null;
  due_date: string | null;
  start_date: string | null;
  order_index: number;
  subtasks: Subtask[];
  visibility: "public" | "private" | null;
  assignee_employee_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const STATUS_LABEL: Record<Status, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  bloque: "Bloqué",
  fait: "Fait",
};

export const STATUS_ORDER: Status[] = ["a_faire", "en_cours", "bloque", "fait"];

export const PRIORITY_LABEL: Record<Priority, string> = {
  haute: "Haute",
  moyenne: "Moyenne",
  basse: "Basse",
};

export const PRIORITY_ORDER: Priority[] = ["haute", "moyenne", "basse"];

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_name: string;
  body: string;
  created_at: string;
}
