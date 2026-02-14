'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import { listAllUsers } from '../../../lib/firebase/helpers';
import LoadingSpinner from '../../../components/LoadingSpinner';

const UserRow = ({ user, onSetRole }) => {
  const [loading, setLoading] = useState(false);
  const { user: authUser } = useAuth();

  const handleSetRole = async (role) => {
    setLoading(true);
    if (!authUser) {
      console.error("Not authenticated");
      setLoading(false);
      return;
    }
    // ... (rest of the function)
  };

  // ... (rest of the component)
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, userProfile } = useAuth();

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      listAllUsers().then(setUsers).finally(() => setLoading(false));
    }
  }, [userProfile]);

  const handleSetRole = (uid, role) => {
    // Implement the logic to set user role here
    console.log(`Setting role for ${uid} to ${role}`);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (userProfile?.role !== 'admin') {
    return <p>You are not authorized to view this page.</p>;
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Admin: All Users</h1>
        <div className="bg-white shadow-md rounded-lg overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserRow key={user.uid} user={user} onSetRole={handleSetRole} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ProtectedRoute>
  );
}
