import { FaEdit, FaTrash, FaCheck, FaTimes } from 'react-icons/fa';

export default function OpportunityCard({ opportunity: o, isAdmin, user, onEdit, onDelete, onApprove, onReject }) {
  const canManage = isAdmin || o.ownerId === user?.uid;

  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 group flex flex-col justify-between min-h-[200px]">
      <div>
        <a href={o.link} target="_blank" rel="noreferrer" className="block">
          <h3 className="font-bold text-lg text-gray-800 dark:text-white">{o.title}</h3>
          <p className="font-semibold text-blue-600 dark:text-blue-400 text-sm mb-2">{o.org}</p>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">{o.description}</p>
        </a>
      </div>
      <div className="flex flex-col">
        <div className="flex flex-wrap gap-2 mb-4">
          {o.tags?.map((tag, i) => (
            <span key={i} className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-full text-xs font-medium">{tag}</span>
          ))}
        </div>
        {o.status === 'pending' && isAdmin ? (
          <div className="flex items-center justify-end gap-2 mt-auto">
            <button onClick={() => onApprove(o.id)} className="flex items-center gap-2 text-sm text-white bg-green-500 hover:bg-green-600 px-3 py-2 rounded-lg shadow-sm transition-colors"><FaCheck /> Approve</button>
            <button onClick={() => onReject(o.id)} className="flex items-center gap-2 text-sm text-white bg-red-500 hover:bg-red-600 px-3 py-2 rounded-lg shadow-sm transition-colors"><FaTimes /> Reject</button>
          </div>
        ) : canManage && o.status !== 'pending' ? (
          <div className="flex items-center justify-end gap-2 mt-auto opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(o)} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-500 px-3 py-2 rounded-lg"><FaEdit /> Edit</button>
            <button onClick={() => onDelete(o.id)} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-red-500 px-3 py-2 rounded-lg"><FaTrash /> Delete</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
