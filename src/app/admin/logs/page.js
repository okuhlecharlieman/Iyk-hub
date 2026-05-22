'use client';
import { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { FaSearch } from 'react-icons/fa';

const LogCard = ({ log }) => {
  const renderContent = () => {
    switch (log.collection) {
      case 'adminAuditLogs':
        return (
          <div>
            <p><strong>Action:</strong> {log.action}</p>
            <p><strong>Actor:</strong> {log.actorEmail}</p>
            <p><strong>Target:</strong> {log.targetType} - {log.targetId}</p>
            <p><strong>Status:</strong> {log.status}</p>
          </div>
        );
      case 'securityLogs':
        return (
          <div>
            <p><strong>Event:</strong> {log.eventType}</p>
            <p><strong>Description:</strong> {log.description}</p>
            <p><strong>Severity:</strong> {log.severity}</p>
            <p><strong>User ID:</strong> {log.userId || 'N/A'}</p>
          </div>
        );
      default:
        return <p>Unsupported log type</p>;
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-lg capitalize">{log.collection.replace('Logs', ' Log')}</span>
        <span className="text-sm text-gray-500">
          {log.createdAt?.toDate().toLocaleString()}
        </span>
      </div>
      <div className="text-sm">
        {renderContent()}
      </div>
    </div>
  );
};

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      const allLogs = [];
      const logCollections = ['adminAuditLogs', 'securityLogs', 'dataAccessLogs'];

      for (const logCollection of logCollections) {
        try {
          const q = query(collection(db, logCollection), orderBy('createdAt', 'desc'));
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach((doc) => {
            allLogs.push({ id: doc.id, collection: logCollection, ...doc.data() });
          });
        } catch (error) {
          if (error.code === 'permission-denied' || error.code === 'unimplemented') {
            console.warn(`Could not fetch ${logCollection}. It might not exist yet.`);
          } else {
            console.error(`Error fetching ${logCollection}:`, error);
          }
        }
      }

      allLogs.sort((a, b) => {
        const dateA = a.createdAt?.toDate();
        const dateB = b.createdAt?.toDate();
        if (!dateA || !dateB) return 0;
        return dateB - dateA;
      });

      setLogs(allLogs);
      setLoading(false);
    }

    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const typeMatch = filterType === 'all' || log.collection === filterType;
    const searchTermLower = searchTerm.toLowerCase();
    const searchableContent = JSON.stringify(log).toLowerCase();
    const searchMatch = searchTerm ? searchableContent.includes(searchTermLower) : true;
    return typeMatch && searchMatch;
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">System Logs</h1>

      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <div className="relative w-full md:w-1/2">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        <div className="relative w-full md:w-1/4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            <option value="all">All Logs</option>
            <option value="adminAuditLogs">Admin Audit</option>
            <option value="securityLogs">Security</option>
            <option value="dataAccessLogs">Data Access</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p>Loading logs...</p>
      ) : (
        <div className="space-y-4">
          {filteredLogs.map((log) => (
            <LogCard key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}
