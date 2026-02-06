export default function Tabs({ tabs, activeTab, setActiveTab }) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="-mb-px flex space-x-6 md:space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.name}
            onClick={() => setActiveTab(tab.name)}
            className={`whitespace-nowrap py-3 px-4 font-medium text-sm transition-all duration-200 outline-none rounded-t-lg
              ${tab.name === activeTab
                ? 'border-b-2 border-blue-500 bg-blue-50 dark:bg-gray-700/50 text-blue-600 dark:text-blue-400'
                : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
              }`}
            aria-current={tab.name === activeTab ? 'page' : undefined}
          >
            {tab.name} {tab.count !== undefined && <span className={`ml-2 py-1 px-2.5 rounded-full text-xs font-bold ${tab.name === activeTab ? 'bg-blue-100 dark:bg-blue-500/30 text-blue-600 dark:text-blue-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-200'}`}>{tab.count}</span>}
          </button>
        ))}
      </nav>
    </div>
  );
}
