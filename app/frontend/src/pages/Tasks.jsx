import { useState, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'
import TaskCard from '../components/TaskCard'
import TaskModal from '../components/TaskModal'
import { tasksAPI } from '../api/tasks'

const Tasks = () => {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [filters, setFilters] = useState({ status: '', priority: '' })

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      const data = await tasksAPI.getTasks(filters)
      setTasks(data.tasks)
    } catch (err) {
      setError('Failed to load tasks')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleCreateTask = () => {
    setEditingTask(null)
    setIsModalOpen(true)
  }

  const handleEditTask = task => {
    setEditingTask(task)
    setIsModalOpen(true)
  }

  const handleSaveTask = async taskData => {
    try {
      if (editingTask) {
        await tasksAPI.updateTask(editingTask.id, taskData)
      } else {
        await tasksAPI.createTask(taskData)
      }
      setIsModalOpen(false)
      setEditingTask(null)
      fetchTasks()
    } catch (err) {
      alert('Failed to save task: ' + (err.response?.data?.message || err.message))
    }
  }

  const handleDeleteTask = async id => {
    if (!confirm('Are you sure you want to delete this task?')) return

    try {
      await tasksAPI.deleteTask(id)
      fetchTasks()
    } catch (err) {
      alert('Failed to delete task: ' + (err.response?.data?.message || err.message))
    }
  }

  const handleStatusChange = async (id, newStatus) => {
    try {
      await tasksAPI.updateTask(id, { status: newStatus })
      fetchTasks()
    } catch (err) {
      alert('Failed to update task status: ' + (err.response?.data?.message || err.message))
    }
  }

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value }))
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>
          <button onClick={handleCreateTask} className="btn btn-primary">
            + Create Task
          </button>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex flex-wrap gap-4">
            <div>
              <label htmlFor="statusFilter" className="label">
                Filter by Status
              </label>
              <select
                id="statusFilter"
                value={filters.status}
                onChange={e => handleFilterChange('status', e.target.value)}
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
                onChange={e => handleFilterChange('priority', e.target.value)}
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
                <button
                  onClick={() => setFilters({ status: '', priority: '' })}
                  className="btn btn-secondary"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="text-xl">Loading tasks...</div>
          </div>
        ) : (
          <>
            {/* Tasks Grid */}
            {tasks.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-gray-500 text-lg mb-4">No tasks found</p>
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
                    onDelete={handleDeleteTask}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingTask(null)
        }}
        onSave={handleSaveTask}
        task={editingTask}
      />
    </Layout>
  )
}

export default Tasks
