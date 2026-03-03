import { FaPlus } from 'react-icons/fa';

export default function NewPostCard({ onClick }) {
    return (
        <div 
            onClick={onClick} 
            className="cursor-pointer bg-white/50 dark:bg-gray-800/50 h-full rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 flex flex-col items-center justify-center p-8 backdrop-blur-sm group aspect-square sm:aspect-auto">
            
            <div className="w-20 h-20 rounded-full bg-gray-100/80 dark:bg-gray-700/80 flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50">
                <FaPlus className="text-3xl text-gray-500 dark:text-gray-400 transition-colors duration-300 group-hover:text-blue-500 dark:group-hover:text-blue-400" />
            </div>

            <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-1">Create New Post</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Share your latest work with the community.</p>
        
        </div>
    );
}