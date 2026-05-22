
'use client';
import { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      const allLogs = [];
      const logCollections = ['adminAuditLogs', 'securityLogs', 'dataAccessLogs'];

      for (const logCollection of logCollections) {
        const q = query(collection(db, logCollection), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          allLogs.push({ id: doc.id, collection: logCollection, ...doc.data() });
        });
      }

      allLogs.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());

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
            <div key={log.id} className="p-4 border rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-lg">{log.collection}</span>
                <span className="text-sm text-gray-500">
                  {log.createdAt?.toDate().toLocaleString()}
                </span>
              </div>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
                {JSON.stringify(log, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
