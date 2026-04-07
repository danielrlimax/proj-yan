

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  trend?: { value: string; positive: boolean };
  color?: 'emerald' | 'blue' | 'violet' | 'amber' | 'rose' | 'cyan';
}

const bgMap = {
  emerald: 'bg-emerald-500/10',
  blue: 'bg-blue-500/10',
  violet: 'bg-violet-500/10',
  amber: 'bg-amber-500/10',
  rose: 'bg-rose-500/10',
  cyan: 'bg-cyan-500/10',
};

export default function MetricCard({ title, value, subtitle, icon, trend, color = 'emerald' }: MetricCardProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl ${bgMap[color]} flex items-center justify-center`}>
          <div className={`w-5 h-5 text-${color}-400`}>{icon}</div>
        </div>
        {trend && (
          <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
            trend.positive
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-rose-500/10 text-rose-400'
          }`}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">{title}</p>
      <p className="text-white text-2xl font-bold leading-tight">{value}</p>
      {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
    </div>
  );
}
