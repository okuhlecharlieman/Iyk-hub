'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../../lib/firebase/config';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import LogFilters from '../../../components/admin/logs/LogFilters';
import LogList from '../../../components/admin/logs/LogList';

const AdminLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError(null);
      const allLogs = [];
      // Defined log collections
      const logCollections = ['adminAuditLogs', 'securityLogs', 'dataAccessLogs'];

      try {
        for (const logCollection of logCollections) {
          try {
            const q = query(collection(db, logCollection), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
              allLogs.push({ id: doc.id, collection: logCollection, ...doc.data() });
            });
          } catch (error) {
            // Firestore throws 'permission-denied' if the collection doesn't exist for the current user's rules
            // It can also throw 'unimplemented' on the first query to a collection that does not exist.
            if (error.code === 'permission-denied' || error.code === 'unimplemented') {
              console.warn(`Could not fetch ${logCollection}. It might not exist yet.`);
            } else {
              // Re-throw other errors
              throw error;
            }
          }
        }
        
        // Sort all logs by date after fetching
        allLogs.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());
        setLogs(allLogs);
      } catch (err) {
        console.error("Error fetching logs:", err);
        setError('Failed to fetch logs. Please check the console for more details.');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    let filtered = logs;

    // Filter by action/type
    if (filter !== 'all') {
      const filterMappings = {
        'user': 'user.',
        'opportunity': 'opportunity.',
        'boost': 'boost.',
        'showcase': 'showcase.',
        'admin': 'admin.',
        'security': 'security.',
        'data.access': 'data.access', // Assumes a different structure or action prefix
        'system.ttl.cleanup': 'system.ttl.cleanup',
      };
      
      const prefix = filterMappings[filter];
      if (prefix) {
          if(filter === 'data.access'){
              // Special case for data access logs based on collection name
              filtered = filtered.filter(log => log.collection === 'dataAccessLogs');
          } else {
              filtered = filtered.filter(log => log.action && log.action.startsWith(prefix));
          }
      }
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(log =>
        JSON.stringify(log).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [logs, filter, searchTerm]);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6 text-white">Admin Logs</h1>
      
      <LogFilters 
        filter={filter} 
        setFilter={setFilter}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      {loading && <p className="text-gray-400">Loading logs...</p>}
      {error && <p className="text-red-500 bg-red-900/20 p-4 rounded-md">{error}</p>}
      {!loading && !error && (
        <LogList logs={filteredLogs} />
      )}
    </div>
  );
};

export default AdminLogsPage;
