import React from 'react';

const LogFilters = ({ filter, setFilter, searchTerm, setSearchTerm }) => {
  const handleFilterChange = (e) => setFilter(e.target.value);
  const handleSearchChange = (e) => setSearchTerm(e.target.value);

  return (
    <div className="flex items-center space-x-4 mb-6">
      <input
        type="text"
        placeholder="Search logs..."
        value={searchTerm}
        onChange={handleSearchChange}
        className="flex-grow px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <select
        value={filter}
        onChange={handleFilterChange}
        className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="all">All Logs</option>
        <option value="user">User Management</option>
        <option value="opportunity">Opportunities</option>
        <option value="boost">Creator Boosts</option>
        <option value="showcase">Showcase</option>
        <option value="system.ttl.cleanup">TTL Cleanup</option>
      </select>
    </div>
  );
};

export default LogFilters;
