
import React from 'react';

const CodeSnippet = ({ code, language }) => {
  return (
    <div className="my-4 rounded-lg bg-gray-900 text-white p-4 overflow-x-auto">
      <pre className={`language-${language}`}>
        <code>{code}</code>
      </pre>
    </div>
  );
};

export default CodeSnippet;
