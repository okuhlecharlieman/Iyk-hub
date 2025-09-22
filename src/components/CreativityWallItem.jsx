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
    <div className="border rounded p-4 shadow mb-4">
      <h3 className="font-semibold mb-2">{item.title}</h3>
      <p className="mb-4">{item.description}</p>
      {item.type === "image" && <img src={item.url} alt={item.title} className="max-w-full" />}
      {item.type === "code" && (
        <pre className="bg-gray-100 p-2 rounded overflow-auto">{item.content}</pre>
      )}
      <div className="flex space-x-2 mt-4">
        {["❤️", "🎉", "👍"].map((emoji) => (
          <button key={emoji} onClick={() => handleReact(emoji)} className="text-xl">
            {emoji} {reactions[emoji] || 0}
          </button>
        ))}
      </div>
    </div>
  );
}
