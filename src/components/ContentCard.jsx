import { memo } from 'react';
import Link from 'next/link';
import { FaHeart, FaThumbsUp, FaRegComment } from 'react-icons/fa';
import { Code, Music, FileText } from 'lucide-react';

const TYPE_STYLES = {
  art: { icon: <FileText size={20} />, color: 'text-purple-500', bg: 'bg-purple-100' },
  music: { icon: <Music size={20} />, color: 'text-green-500', bg: 'bg-green-100' },
  code: { icon: <Code size={20} />, color: 'text-blue-500', bg: 'bg-blue-100' },
  poem: { icon: <FileText size={20} />, color: 'text-orange-500', bg: 'bg-orange-100' },
};

function ContentCard({ p, react }) {
  const { icon, color, bg } = TYPE_STYLES[p.type] || TYPE_STYLES.art;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 ease-in-out">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-full p-2 ${bg} ${color}`}>
              {icon}
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">{p.title}</h3>
              <p className={`text-sm font-medium ${color}`}>{p.type?.toUpperCase()}</p>
            </div>
          </div>
          <Link href={`/profile/${p.uid}`}>
            <a className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">Profile</a>
          </Link>
        </div>

        {p.description && <p className="mt-4 text-gray-600 dark:text-gray-300">{p.description}</p>}
        
        {p.mediaUrl && (
          p.type === 'music' ? (
            <audio className="w-full mt-4" src={p.mediaUrl} controls />
          ) : (
            <img className="mt-4 rounded-xl max-h-80 w-full object-cover" src={p.mediaUrl} alt={p.title} />
          )
        )}
        
        {p.code && (
          <pre className="bg-gray-100 dark:bg-gray-900 text-sm font-mono p-4 rounded-lg mt-4 overflow-auto">
            <code>{p.code}</code>
          </pre>
        )}
      </div>
      
      <div className="bg-gray-50 dark:bg-gray-700/50 px-5 py-3 flex items-center justify-between">
        <div className="flex gap-4">
          <button onClick={() => react(p.id, '❤️')} className="flex items-center gap-2 text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-500 transition-colors">
            <FaHeart /> 
            <span className="font-medium">{(p.reactions && p.reactions['❤️']) || 0}</span>
          </button>
          <button onClick={() => react(p.id, '👍')} className="flex items-center gap-2 text-gray-600 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-500 transition-colors">
            <FaThumbsUp /> 
            <span className="font-medium">{(p.reactions && p.reactions['👍']) || 0}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(ContentCard);
