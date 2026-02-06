import { FaPlusCircle } from 'react-icons/fa';

export default function NewPostCard({ onClick }) {
  return (
    <div 
      onClick={onClick}
      className="cursor-pointer bg-gray-100 dark:bg-gray-800/50 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center text-center p-6 hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors duration-300 h-full min-h-[200px]"
    >
      <FaPlusCircle className="text-4xl text-gray-400 dark:text-gray-500 mb-3" />
      <h3 className="font-bold text-lg text-gray-700 dark:text-gray-300">Share Your Work</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">Click here to upload your project.</p>
    </div>
  );
}
