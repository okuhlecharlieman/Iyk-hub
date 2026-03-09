'use client';
import Link from 'next/link';
import { FaArrowRight } from 'react-icons/fa';

const UserManagementCard = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 h-full flex flex-col justify-between">
      <div>
        <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">User Management</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">View, edit, or manage user roles and permissions.</p>
      </div>
      <div className="flex justify-end">
        <Link href="/admin/users" className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold hover:gap-3 transition-all">
          Go to Users <FaArrowRight />
        </Link>
      </div>
    </div>
  );
};

export default UserManagementCard;
