import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import StatCard from '../components/StatCard'
import { tasksAPI } from '../api/tasks'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#9CA3AF', '#3B82F6', '#10B981']

const Dashboard = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchStatistics()
  }, [])

  const fetchStatistics = async () => {
    try {
      const data = await tasksAPI.getStatistics()
      setStats(data)
    } catch (err) {
      setError('Failed to load statistics')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

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
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </Layout>
    )
  }

  const statusData = stats
    ? [
        { name: 'To Do', value: stats.byStatus.todo || 0 },
        { name: 'In Progress', value: stats.byStatus.in_progress || 0 },
        { name: 'Completed', value: stats.byStatus.completed || 0 },
      ]
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
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <button onClick={() => navigate('/tasks')} className="btn btn-primary">
            View All Tasks
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Tasks" value={stats?.total || 0} icon="📋" color="primary" />
          <StatCard
            title="To Do"
            value={stats?.byStatus.todo || 0}
            icon="⏳"
            color="yellow"
          />
          <StatCard
            title="In Progress"
            value={stats?.byStatus.in_progress || 0}
            icon="🔄"
            color="blue"
          />
          <StatCard
            title="Completed"
            value={stats?.byStatus.completed || 0}
            icon="✅"
            color="green"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Task Status Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Priority Distribution */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Task Priority Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="low" fill="#10B981" name="Low" />
                <Bar dataKey="medium" fill="#F59E0B" name="Medium" />
                <Bar dataKey="high" fill="#EF4444" name="High" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
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
