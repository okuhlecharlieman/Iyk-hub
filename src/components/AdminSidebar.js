'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaTachometerAlt, FaTasks, FaUsers, FaSignOutAlt, FaHome } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const AdminSidebar = () => {
  const pathname = usePathname();
  const { logout } = useAuth();

  const links = [
    { href: '/admin', label: 'Dashboard', icon: <FaTachometerAlt /> },
    { href: '/admin/opportunities', label: 'Opportunities', icon: <FaTasks /> },
    { href: '/admin/users', label: 'Users', icon: <FaUsers /> },
  ];

  return (
    <aside className="bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-300 w-64 min-h-screen p-4 flex flex-col justify-between border-r dark:border-gray-700">
      <div>
        <div  className="flex items-center gap-2 mb-10">
        
          <span className="text-xl font-bold text-gray-800 dark:text-white">Admin Panel</span>
        </div>
        <nav>
          <ul>
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <li key={link.href} className="mb-2">
                  <Link
                    href={link.href}
                    className={`flex items-center py-2 px-4 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="mr-3 text-lg">{link.icon}</span>
                    <span className="font-medium">{link.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
      <div className="pt-4 border-t dark:border-gray-700">
          <Link href="/" className="flex items-center py-2 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              <span className="mr-3 text-lg"><FaHome /></span>
              <span className="font-medium">Back to Site</span>
          </Link>
          <button 
            onClick={logout} 
            className="w-full flex items-center py-2 px-4 rounded-lg text-left text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 mt-2"
          >
              <span className="mr-3 text-lg"><FaSignOutAlt /></span>
              <span className="font-medium">Logout</span>
          </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
