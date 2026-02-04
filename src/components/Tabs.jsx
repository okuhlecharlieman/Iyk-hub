export default function Tabs({ tabs, activeTab, setActiveTab }) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.name}
            onClick={() => setActiveTab(tab.name)}
            className={`${tab.name === activeTab
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            aria-current={tab.name === activeTab ? 'page' : undefined}
          >
            {tab.name} {tab.count ? <span className={`ml-2 py-0.5 px-2 rounded-full text-xs font-medium ${tab.name === activeTab ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-200'}`}>{tab.count}</span> : ''}
          </button>
        ))}
      </nav>
    </div>
  );
}
