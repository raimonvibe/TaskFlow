import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import Layout from '../components/Layout'
import StatCard from '../components/StatCard'
import { tasksAPI } from '../api/tasks'
import { useTheme } from '../contexts/ThemeContext'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

// CSS custom properties, not hardcoded hex - "chart-2" (the navy tone) gets
// lightened under .dark in index.css so it still reads against a dark card.
// Keyed by category name (not array index) so colors stay stable even after
// zero-value categories are filtered out of statusData.
const STATUS_COLORS = {
  'To Do': 'var(--color-chart-1)',
  'In Progress': 'var(--color-chart-2)',
  Completed: 'var(--color-chart-3)',
}
const GRID_STROKE = 'var(--color-primary-300)'

const Dashboard = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { theme } = useTheme()

  const tooltipStyle =
    theme === 'dark'
      ? { backgroundColor: '#071224', border: '1px solid #2a4a73', color: '#f2ece0' }
      : { backgroundColor: '#fff', border: '1px solid #d9e2ec', color: '#1a1a1a' }

  useEffect(() => {
    let cancelled = false

    async function loadStatistics() {
      try {
        const data = await tasksAPI.getStatistics()
        if (!cancelled) {
          setStats(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load statistics')
          console.error(err)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadStatistics()

    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-xl">Loading dashboard...</div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded dark:bg-red-950 dark:border-red-800 dark:text-red-300">
          {error}
        </div>
      </Layout>
    )
  }

  // Zero-value slices collapse to a single angle in a pie chart, so their
  // labels stack directly on top of whichever slice they're adjacent to.
  // Dropping empty categories keeps every remaining label legible.
  const statusData = stats
    ? [
        { name: 'To Do', value: stats.byStatus.todo || 0 },
        { name: 'In Progress', value: stats.byStatus.in_progress || 0 },
        { name: 'Completed', value: stats.byStatus.completed || 0 },
      ].filter(entry => entry.value > 0)
    : []

  const priorityData = stats
    ? [
        { name: 'Low', low: stats.byPriority.low || 0 },
        { name: 'Medium', medium: stats.byPriority.medium || 0 },
        { name: 'High', high: stats.byPriority.high || 0 },
      ]
    : []

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="page-title">Dashboard</h1>
          <button onClick={() => navigate('/tasks')} className="btn btn-primary">
            View All Tasks
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Tasks" value={stats?.total || 0} icon="📋" color="primary" />
          <StatCard title="To Do" value={stats?.byStatus.todo || 0} icon="⏳" color="slate" />
          <StatCard
            title="In Progress"
            value={stats?.byStatus.in_progress || 0}
            icon="🔄"
            color="navy"
          />
          <StatCard
            title="Completed"
            value={stats?.byStatus.completed || 0}
            icon="✅"
            color="gold"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <div className="card">
            <h2 className="section-title mb-4">Task Status Distribution</h2>
            {statusData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-primary-400">
                No tasks yet - create one to see your status breakdown.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {statusData.map(entry => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Priority Distribution */}
          <div className="card">
            <h2 className="section-title mb-4">Task Priority Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} strokeOpacity={0.35} />
                <XAxis dataKey="name" stroke={GRID_STROKE} />
                <YAxis stroke={GRID_STROKE} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: GRID_STROKE, opacity: 0.1 }} />
                <Legend />
                <Bar dataKey="low" fill="var(--color-chart-1)" name="Low" />
                <Bar dataKey="medium" fill="var(--color-chart-3)" name="Medium" />
                <Bar dataKey="high" fill="var(--color-chart-2)" name="High" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="section-title mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => navigate('/tasks')} className="btn btn-primary">
              Create New Task
            </button>
            <button
              onClick={() => navigate('/tasks?status=in_progress')}
              className="btn btn-secondary"
            >
              View In Progress
            </button>
            <button onClick={() => navigate('/tasks?priority=high')} className="btn btn-secondary">
              View High Priority
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Dashboard
