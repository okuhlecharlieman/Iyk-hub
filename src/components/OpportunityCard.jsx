import { FaEdit, FaTrash, FaCheck, FaTimes, FaExternalLinkAlt } from 'react-icons/fa';

export default function OpportunityCard({ opportunity: o, isAdmin, user, onEdit, onDelete, onApprove, onReject }) {
  const canManage = isAdmin || o.ownerId === user?.uid;
  const isPending = o.status === 'pending' || !o.status; // Treat missing status as pending for admins

  const statusStyle = {
    approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  };
  const statusLabel = o.status ? o.status.charAt(0).toUpperCase() + o.slice(1) : 'Pending';

  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 group flex flex-col justify-between min-h-[220px] border border-gray-200 dark:border-gray-700">
      <div className="flex flex-col flex-grow">
        <div className='flex justify-between items-start mb-2'>
            <h3 className="font-bold text-lg text-gray-800 dark:text-white pr-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{o.title}</h3>
            <a href={o.link} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0">
                <FaExternalLinkAlt />
            </a>
        </div>
        <p className="font-semibold text-blue-600 dark:text-blue-400 text-sm mb-2">{o.org}</p>
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 flex-grow">{o.description}</p>
      </div>
      <div className="flex flex-col mt-auto">
        <div className="flex flex-wrap gap-2 mb-4">
          {o.tags?.map((tag, i) => (
            <span key={i} className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2.5 py-1 rounded-full text-xs font-medium">{tag}</span>
          ))}
        </div>
        <div className="pt-3 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between gap-2">
            <div>
                {isAdmin && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle[o.status] || statusStyle.pending}`}>
                        {statusLabel}
                    </span>
                )}
            </div>
            <div className="flex items-center justify-end gap-2">
                {isAdmin && (
                    <>
                        {(isPending || o.status === 'rejected') && (
                            <button onClick={() => onApprove(o.id)} className="flex items-center gap-2 text-sm text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-md shadow-sm transition-colors"><FaCheck /> Approve</button>
                        )}
                        {(isPending || o.status === 'approved') && (
                            <button onClick={() => onReject(o.id)} className="flex items-center gap-2 text-sm text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-md shadow-sm transition-colors"><FaTimes /> Reject</button>
                        )}
                    </>
                )}
                {canManage && (
                    <>
                        <button onClick={() => onEdit(o)} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-700/50 hover:text-blue-600 dark:hover:text-blue-300 transition-colors px-3 py-1.5 rounded-md"><FaEdit /> Edit</button>
                        <button onClick={() => onDelete(o.id)} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-700/50 hover:text-red-600 dark:hover:text-red-300 transition-colors px-3 py-1.5 rounded-md"><FaTrash /> Delete</button>
                    </>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
