import { FaEdit, FaTrash, FaCheck, FaTimes } from 'react-icons/fa';

export default function OpportunityCard({ opportunity: o, isAdmin, user, onEdit, onDelete, onApprove, onReject }) {
  const canManage = isAdmin || o.ownerId === user?.uid;

  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 group flex flex-col justify-between min-h-[200px] border border-transparent dark:border-gray-700/50">
      <a href={o.link} target="_blank" rel="noreferrer" className="flex flex-col flex-grow">
        <h3 className="font-bold text-lg text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{o.title}</h3>
        <p className="font-semibold text-blue-600 dark:text-blue-400 text-sm mb-2">{o.org}</p>
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 flex-grow">{o.description}</p>
      </a>
      <div className="flex flex-col mt-auto">
        <div className="flex flex-wrap gap-2 mb-4">
          {o.tags?.map((tag, i) => (
            <span key={i} className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2.5 py-1 rounded-full text-xs font-medium">{tag}</span>
          ))}
        </div>
        {o.status === 'pending' && isAdmin ? (
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button onClick={() => onApprove(o.id)} className="flex items-center gap-2 text-sm text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg shadow-sm transition-colors"><FaCheck /> Approve</button>
            <button onClick={() => onReject(o.id)} className="flex items-center gap-2 text-sm text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg shadow-sm transition-colors"><FaTimes /> Reject</button>
          </div>
        ) : canManage && o.status !== 'pending' ? (
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button onClick={() => onEdit(o)} className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"><FaEdit /> Edit</button>
            <button onClick={() => onDelete(o.id)} className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"><FaTrash /> Delete</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
