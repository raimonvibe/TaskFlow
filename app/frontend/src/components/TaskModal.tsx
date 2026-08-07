import { useState, type ChangeEvent, type FormEvent, type ReactElement } from 'react'
import type { Task, TaskInput, TaskPriority, TaskStatus } from '../api/types'

function emptyForm(): TaskInput {
  return {
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    due_date: '',
  }
}

function formDataFromTask(task: Task | null | undefined): TaskInput {
  if (!task) return emptyForm()
  return {
    title: task.title || '',
    description: task.description || '',
    status: task.status || 'todo',
    priority: task.priority || 'medium',
    due_date: task.due_date ? task.due_date.split('T')[0]! : '',
  }
}

interface TaskModalInnerProps {
  onClose: () => void
  onSave: (data: TaskInput) => void
  task: Task | null
}

const TaskModalInner = ({ onClose, onSave, task }: TaskModalInnerProps): ReactElement => {
  const [formData, setFormData] = useState<TaskInput>(() => formDataFromTask(task))

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ): void => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white border border-primary-100 rounded-md w-full max-w-md mx-4 dark:bg-primary-800 dark:border-primary-600">
        <div className="flex justify-between items-center p-6 border-b border-primary-100 dark:border-primary-600">
          <h2 className="font-serif text-xl font-semibold text-ink">
            {task ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none dark:text-primary-300 dark:hover:text-primary-100"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="title" className="label">
              Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="input"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="label">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="status" className="label">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="input"
              >
                <option value={'todo' satisfies TaskStatus}>To Do</option>
                <option value={'in_progress' satisfies TaskStatus}>In Progress</option>
                <option value={'completed' satisfies TaskStatus}>Completed</option>
              </select>
            </div>

            <div>
              <label htmlFor="priority" className="label">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="input"
              >
                <option value={'low' satisfies TaskPriority}>Low</option>
                <option value={'medium' satisfies TaskPriority}>Medium</option>
                <option value={'high' satisfies TaskPriority}>High</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="due_date" className="label">
              Due Date
            </label>
            <input
              type="date"
              id="due_date"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
              className="input"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {task ? 'Update' : 'Create'} Task
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: TaskInput) => void
  task: Task | null
}

const TaskModal = ({ isOpen, onClose, onSave, task }: TaskModalProps): ReactElement | null => {
  if (!isOpen) return null
  const key = `${task?.id ?? 'new'}`
  return <TaskModalInner key={key} task={task} onClose={onClose} onSave={onSave} />
}

export default TaskModal
