// components/CreativityWallItem.jsx
//
// Displays a single uploaded creation with emoji reactions
//

"use client";

import { useState } from "react";

export default function CreativityWallItem({ item }) {
  const [reactions, setReactions] = useState(item.reactions || {});

  const handleReact = (emoji) => {
    setReactions((prev) => ({
      ...prev,
      [emoji]: (prev[emoji] || 0) + 1,
    }));
    // TODO: update reactions in backend firestore
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-md mb-4 transition-transform duration-300 ease-in-out hover:-translate-y-1 hover:shadow-lg">
      <h3 className="font-semibold text-lg text-gray-800 dark:text-white mb-2">{item.title}</h3>
      <p className="text-gray-600 dark:text-gray-300 mb-4">{item.description}</p>
      {item.type === "image" && <img src={item.url} alt={item.title} className="max-w-full rounded-md" />}
      {item.type === "code" && (
        <pre className="bg-gray-100 dark:bg-gray-900 text-sm font-mono p-4 rounded-lg overflow-auto"><code>{item.content}</code></pre>
      )}
      <div className="flex space-x-4 mt-4">
        {["❤️", "🎉", "👍"].map((emoji) => (
          <button key={emoji} onClick={() => handleReact(emoji)} className="flex items-center gap-2 text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-500 transition-colors">
            <span className="text-xl">{emoji}</span> {reactions[emoji] || 0}
          </button>
        ))}
      </div>
    </div>
  );
}
