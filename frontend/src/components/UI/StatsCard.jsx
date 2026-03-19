import React from 'react'

const StatsCard = ({ title, value, icon: Icon, color, bgColor, trend, trendValue, subtitle, actionLabel, onAction }) => {
  return (
    <div className="card">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
            {trend && (
              <div className={`flex items-center mt-2 text-sm ${
                trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                <span>{trend === 'up' ? '↗' : '↘'}</span>
                <span className="ml-1">{trendValue}</span>
              </div>
            )}
            {actionLabel && onAction && (
              <button
                type="button"
                onClick={onAction}
                className="text-xs font-medium text-primary-600 hover:text-primary-700 mt-2"
              >
                {actionLabel}
              </button>
            )}
          </div>
          <div className={`p-3 rounded-full ${bgColor}`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatsCard