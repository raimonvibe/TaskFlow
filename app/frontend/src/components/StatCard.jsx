const StatCard = ({ title, value, icon, color = 'primary' }) => {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-600',
    navy: 'bg-primary-100 text-primary-600',
    gold: 'bg-accent-50 text-accent-600',
    slate: 'bg-primary-50 text-primary-400',
    green: 'bg-accent-50 text-accent-600',
    yellow: 'bg-accent-100 text-accent-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-primary-50 text-primary-500',
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-primary-500 mb-1">{title}</p>
          <p className="font-serif text-3xl font-bold text-ink">{value}</p>
        </div>
        <div className={`p-3 rounded-md ${colorClasses[color] || colorClasses.primary}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  )
}

export default StatCard
