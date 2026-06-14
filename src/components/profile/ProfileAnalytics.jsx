'use client';
import { FaChartLine } from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ProfileAnalytics({ analytics, accentColor }) {
  return (
    <div className="mt-8">
      <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 mb-6" style={{ color: 'var(--accent-color)' }}>
        <FaChartLine className="inline-block mr-2" />Portfolio Analytics
      </h3>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={analytics} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="count" stroke={accentColor || '#8884d8'} strokeWidth={2} name="Views" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
