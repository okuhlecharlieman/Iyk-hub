'use client';
import { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

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
          if (error.code === 'permission-denied') {
            console.warn(`Permission denied for ${logCollection}. Skipping.`);
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">System Logs</h1>
      {loading ? (
        <p>Loading logs...</p>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <LogCard key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}
