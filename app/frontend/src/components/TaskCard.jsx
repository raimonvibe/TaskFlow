const priorityColors = {
  low: 'bg-primary-50 text-primary-600 border border-primary-100',
  medium: 'bg-accent-50 text-accent-700 border border-accent-100',
  high: 'bg-primary-600 text-white border border-primary-700',
}

const statusColors = {
  todo: 'bg-primary-50 text-primary-500 border border-primary-100',
  in_progress: 'bg-primary-100 text-primary-700 border border-primary-200',
  completed: 'bg-accent-50 text-accent-700 border border-accent-100',
}

const TaskCard = ({ task, onEdit, onDelete, onStatusChange }) => {
  const formatDate = dateString => {
    if (!dateString) return 'No due date'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="card hover:border-accent-300 transition-colors duration-200">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-display text-lg font-semibold text-ink">{task.title}</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(task)}
            className="text-primary-600 hover:text-accent-600 text-sm font-medium"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="text-red-700 hover:text-red-900 text-sm font-medium"
          >
            Delete
          </button>
        </div>
      </div>

      {task.description && <p className="text-primary-500 text-sm mb-4">{task.description}</p>}

      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusColors[task.status]}`}>
          {task.status.replace('_', ' ')}
        </span>
        <span
          className={`px-2 py-1 rounded-md text-xs font-medium ${priorityColors[task.priority]}`}
        >
          {task.priority}
        </span>
      </div>

      <div className="flex justify-between items-center text-sm text-primary-400">
        <span>{formatDate(task.due_date)}</span>
        <select
          value={task.status}
          onChange={e => onStatusChange(task.id, e.target.value)}
          className="text-sm border border-primary-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-accent-400"
        >
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>
    </div>
  )
}

export default TaskCard
