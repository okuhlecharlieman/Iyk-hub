import Link from 'next/link';
import { FaCode, FaMusic, FaPaintBrush, FaThumbsUp, FaComment, FaEdit, FaTrash } from 'react-icons/fa';

const typeIcons = {
  code: <FaCode />,
  music: <FaMusic />,
  art: <FaPaintBrush />,
};

export default function PostCard({ post, author, isOwner, onEdit, onDelete }) {
  const { type, title, description, mediaUrl, createdAt, uid } = post;

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden transition-transform duration-300 hover:scale-105">
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            {author?.photoURL && (
              <Link href={`/profile/${uid}`}>
                <img src={author.photoURL} alt={author.displayName} className="w-10 h-10 rounded-full mr-3 border-2 border-gray-200 dark:border-gray-600" />
              </Link>
            )}
            <div>
              <p className="font-bold text-gray-800 dark:text-white">{author?.displayName || 'User'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(createdAt?.seconds * 1000).toLocaleString()}</p>
            </div>
          </div>
          <div className="text-gray-400 dark:text-gray-500">
            {typeIcons[type] || null}
          </div>
        </div>

        <h3 className="font-bold text-xl mb-2 text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="text-gray-700 dark:text-gray-300 text-base mb-4">{description}</p>

        {mediaUrl && (
          <div className="mb-4">
            {type === 'art' && <img src={mediaUrl} alt={title} className="rounded-lg w-full" />}
            {type === 'music' && <audio controls src={mediaUrl} className="w-full">Your browser does not support the audio element.</audio>}
          </div>
        )}

        <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-4">
            <button className="flex items-center space-x-1 hover:text-blue-500"><FaThumbsUp /> <span>{post.reactions?.['👍'] || 0}</span></button>
            <button className="flex items-center space-x-1 hover:text-green-500"><FaComment /> <span>{/* Comment count */}</span></button>
          </div>
          {isOwner && (
            <div className="flex items-center space-x-2">
              <button onClick={onEdit} className="hover:text-blue-500 p-2 rounded-full transition-colors"><FaEdit /></button>
              <button onClick={onDelete} className="hover:text-red-500 p-2 rounded-full transition-colors"><FaTrash /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
