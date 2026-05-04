function StatCard({ title, value, subtitle }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <p className="text-3xl font-bold mt-1 text-gray-900">
        {value ?? '—'}
      </p>
      {subtitle && (
        <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
      )}
    </div>
  )
}

export default StatCard
