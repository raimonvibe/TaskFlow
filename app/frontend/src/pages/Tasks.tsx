import { useState, type ReactElement } from 'react'
import Layout from '../components/Layout'
import TaskCard from '../components/TaskCard'
import TaskModal from '../components/TaskModal'
import { useTasks } from '../hooks/useTasks'
import type { Task, TaskInput } from '../api/types'

const Tasks = (): ReactElement => {
  const {
    tasks,
    loading,
    error,
    filters,
    updateFilter,
    clearFilters,
    saveTask,
    deleteTask,
    changeStatus,
  } = useTasks()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const handleCreateTask = (): void => {
    setEditingTask(null)
    setIsModalOpen(true)
  }

  const handleEditTask = (task: Task): void => {
    setEditingTask(task)
    setIsModalOpen(true)
  }

  const handleSaveTask = async (taskData: TaskInput): Promise<void> => {
    const ok = await saveTask(taskData, editingTask?.id ?? null)
    if (ok) {
      setIsModalOpen(false)
      setEditingTask(null)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="page-title">My Tasks</h1>
          <button onClick={handleCreateTask} className="btn btn-primary">
            + Create Task
          </button>
        </div>

        <div className="card">
          <div className="flex flex-wrap gap-4">
            <div>
              <label htmlFor="statusFilter" className="label">
                Filter by Status
              </label>
              <select
                id="statusFilter"
                value={filters.status}
                onChange={e => updateFilter('status', e.target.value)}
                className="input"
              >
                <option value="">All Statuses</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label htmlFor="priorityFilter" className="label">
                Filter by Priority
              </label>
              <select
                id="priorityFilter"
                value={filters.priority}
                onChange={e => updateFilter('priority', e.target.value)}
                className="input"
              >
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            {(filters.status || filters.priority) && (
              <div className="flex items-end">
                <button onClick={clearFilters} className="btn btn-secondary">
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded dark:bg-red-950 dark:border-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="text-xl">Loading tasks...</div>
          </div>
        ) : (
          <>
            {tasks.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-gray-500 dark:text-primary-300 text-lg mb-4">No tasks found</p>
                <button onClick={handleCreateTask} className="btn btn-primary">
                  Create Your First Task
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={handleEditTask}
                    onDelete={id => void deleteTask(id)}
                    onStatusChange={(id, status) => void changeStatus(id, status)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingTask(null)
        }}
        onSave={data => void handleSaveTask(data)}
        task={editingTask}
      />
    </Layout>
  )
}

export default Tasks
