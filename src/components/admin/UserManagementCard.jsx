import { useState } from 'react';
import { FaSearch } from 'react-icons/fa';

export default function UserManagementCard({ users, onSelectUser, onDeleteUser }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(u => 
    (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Manage Users</h2>
        <div className="relative">
            <FaSearch className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
            <input 
            type="text"
            placeholder="Search by name or email"
            className="border p-2 pl-10 rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            />
        </div>
      </div>
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2 -mr-2">
        {filteredUsers.map((u) => (
          <div key={u.id} className="border dark:border-gray-700 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center">
            <div className="overflow-hidden">
              <p className="font-bold text-gray-800 dark:text-gray-200 truncate">{u.displayName || 'No Name'}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              <button 
                onClick={() => onSelectUser(u)} 
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs py-1 px-3 rounded-md transition-all shadow-sm hover:shadow-md">
                Details
              </button>
              <button 
                onClick={() => onDeleteUser(u.id)} 
                className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs py-1 px-3 rounded-md transition-all shadow-sm hover:shadow-md">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
