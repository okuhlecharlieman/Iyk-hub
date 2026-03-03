import { useEffect, useRef } from 'react';

export default function Modal({ open, onClose, title, children }) {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) onClose();
    };
    window.addEventListener('keydown', handleEsc);

    // Focus first focusable element inside modal when opened and lock body scroll
    const prevOverflow = document.body.style.overflow;
    if (modalRef.current) {
      const focusable = modalRef.current.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable) focusable.focus();
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm transition-opacity duration-300"
      onClick={onClose}
      role="presentation"
    >
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl w-full max-w-lg m-4 transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-up border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()} // Prevent closing on modal content click
      >
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 id="modal-title" className="text-xl font-bold text-gray-800 dark:text-white">{title}</h2>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full text-gray-400 hover:bg-gray-200/50 hover:text-gray-600 dark:hover:bg-gray-700/50 dark:hover:text-gray-300 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <div className="p-5">
          {children}
        </div>
      </div>
       <style jsx>{`
        @keyframes fade-in-up {
          from {
            transform: scale(0.95) translateY(10px);
            opacity: 0;
          }
          to {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
