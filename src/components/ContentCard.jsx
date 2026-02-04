import { memo } from 'react';
import Link from 'next/link';
import { File, Code, Music, Globe } from 'lucide-react';
import { FaGlobe, FaMusic, FaCode, FaFileAlt } from 'react-icons/fa';

const ICONS = {
  art: <FaFileAlt />,
  music: <FaMusic />,
  code: <FaCode />,
  poem: <FaGlobe />,
};

function ContentCard({ p, react }) {
  return (
    <div key={p.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-center mb-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-3">
          {ICONS[p.type] || <FaFileAlt />}
        </div>
        <div>
          <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">{p.title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{p.type?.toUpperCase()}</p>
        </div>
      </div>
      {p.mediaUrl && (
        p.type === 'music' ? (
          <audio className="w-full mt-2" src={p.mediaUrl} controls />
        ) : (
          <img className="mt-2 rounded-lg max-h-64 w-full object-cover" src={p.mediaUrl} alt={p.title} />
        )
      )}
      {p.code && (
        <pre className="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-3 rounded-lg mt-2 overflow-auto text-sm font-mono"><code>{p.code}</code></pre>
      )}
      {p.description && <p className="mt-3 text-gray-700 dark:text-gray-300">{p.description}</p>}
      <div className="flex items-center justify-between mt-4 text-gray-500 dark:text-gray-400">
        <div className="flex gap-3">
          {['❤️', '🎉', '👍'].map((e) => (
            <button
              key={e}
              onClick={() => react(p.id, e)}
              className="border-none rounded-full px-3 py-1 text-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              {e} <span className="text-sm">{(p.reactions && p.reactions[e]) || 0}</span>
            </button>
          ))}
        </div>
        <Link href={`/profile/${p.uid}`} className="text-sm hover:underline">
          View Profile
        </Link>
      </div>
    </div>
  );
}

export default memo(ContentCard);
