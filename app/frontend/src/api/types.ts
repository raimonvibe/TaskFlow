/** Shared API wire shapes. Snake_case matches the backend DTOs. */

export interface AuthUser {
  id: number
  name: string
  email: string
}

export interface AuthCredentialsResponse {
  message: string
  token: string
  refresh_token: string
  user: AuthUser
}

export interface RefreshResponse {
  message: string
  token: string
  refresh_token: string
}

export interface CurrentUserResponse {
  user: AuthUser & { created_at?: string | null }
}

export type TaskStatus = 'todo' | 'in_progress' | 'completed'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: number
  user_id: number
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  created_at: string | null
  updated_at: string | null
}

/** Form / create-update body. Empty due_date is intentional (backend maps '' → null). */
export interface TaskInput {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  due_date: string
}

export interface TaskFilters {
  status: '' | TaskStatus
  priority: '' | TaskPriority
}

export interface TaskListResponse {
  tasks: Task[]
  count: number
}

export interface TaskResponse {
  message?: string
  task: Task
}

export interface TaskStatsResponse {
  total: number
  byStatus: Record<TaskStatus, number>
  byPriority: Record<TaskPriority, number>
}
