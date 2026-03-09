
import AdminSidebar from '../../components/AdminSidebar';
import { FaBell } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';

export default function AdminLayout({ children }) {
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Admin Panel</h1>
          <div className="flex items-center space-x-4">
            <FaBell className="text-gray-500 dark:text-gray-400" />
            {user && <img src={user.photoURL || '/logo.png'} alt="user avatar" className="w-8 h-8 rounded-full" />}
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
