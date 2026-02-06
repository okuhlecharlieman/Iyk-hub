import { useState } from 'react';

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
        <input 
          type="text"
          placeholder="Search by name or email"
          className="border p-2 rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {filteredUsers.map((u) => (
          <div key={u.id} className="border p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center">
            <div>
              <p className="font-bold text-gray-800 dark:text-gray-200">{u.displayName || 'No Name'}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{u.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => onSelectUser(u)} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                Details
              </button>
              <button onClick={() => onDeleteUser(u.id)} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
