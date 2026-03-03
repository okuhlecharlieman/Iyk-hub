export default function StatCard({ title, value, icon }) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-white">{value}</p>
        </div>
        {icon}
      </div>
    );
  }
  