"use client";
import { FaRegHeart, FaRegComment, FaCode, FaMusic, FaPaintBrush, FaRegUserCircle } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { getUserDoc } from '../lib/firebase/user'; // Corrected import path
import Link from 'next/link';
import CodeSnippet from './CodeSnippet';

const typeIcons = {
  art: <FaPaintBrush />,
  code: <FaCode />,
  music: <FaMusic />,
};

export default function ContentCard({ p, react, noactions }) {
  const [author, setAuthor] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    async function loadAuthor() {
      try {
        if (!p.uid) return;
        const authorDoc = await getUserDoc(p.uid);
        if (authorDoc) {
          setAuthor(authorDoc);
        }
      } catch (e) {
        setErr(e.message || 'Failed to load author');
      }
    }
    loadAuthor();
  }, [p.uid]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden transition-transform duration-300 ease-in-out hover:-translate-y-1 hover:shadow-2xl">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          {author ? (
            <Link href={`/profile/${author.id}`}>
              <img src={author.photoURL || '/logo.png'} alt={author.displayName} className="w-10 h-10 rounded-full cursor-pointer" />
            </Link>
          ) : (
            <FaRegUserCircle className="w-10 h-10 text-gray-400" />
          )}
          <div>
            <h4 className="font-bold text-gray-800 dark:text-white">{p.title}</h4>
            {author && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                by <Link href={`/profile/${author.id}`} className="hover:underline">{author.displayName || 'Anonymous'}</Link>
              </p>
            )}
          </div>
          <div className="ml-auto text-gray-400 text-xl">
            {typeIcons[p.type] || null}
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-4">{p.description}</p>
        {p.type === 'code' && p.code && (
          <CodeSnippet code={p.code} language={p.language} />
        )}
        {p.type === 'art' && p.mediaUrl && <img src={p.mediaUrl} alt={p.title} className="rounded-lg w-full" />}
        {p.type === 'music' && p.mediaUrl && <audio controls src={p.mediaUrl} className="w-full">Your browser does not support the audio element.</audio>}
      </div>
      {!noactions && (
        <div className="bg-gray-50 dark:bg-gray-700/50 px-5 py-3 flex justify-between items-center text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
                <button 
                    onClick={() => react(p.id, '❤️')} 
                    className="flex items-center gap-1.5 bg-gray-200 dark:bg-gray-600/50 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200"
                >
                    <FaRegHeart /> 
                    <span>{p.reactions?.['❤️'] || 0}</span>
                </button>
                <button className="flex items-center gap-1.5 bg-gray-200 dark:bg-gray-600/50 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200">
                    <FaRegComment /> 
                    <span>0</span>
                </button>
            </div>
            <p className="text-xs text-gray-500">{p.createdAt?.toDate().toLocaleDateString()}</p>
        </div>
      )}
      {err && <p className="text-red-500 p-4">{err}</p>}
    </div>
  );
}
