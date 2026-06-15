/**
 * Alertsx component.
 */
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';

/** ErrorAlert React component. */
export const ErrorAlert = ({ message, onClose = null, details = null }) => {
  return (
    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-4">
      <div className="flex-shrink-0 mt-0.5">
        <FaExclamationTriangle className="h-5 w-5 text-red-500" />
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">{message}</h3>
        {details && <p className="text-sm text-red-700 dark:text-red-300 mt-1">{details}</p>}
      </div>
      {onClose && (
        <button onClick={onClose} className="text-red-500 hover:text-red-700">
          <FaTimes className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

/** ErrorEmptyState React component. */
export const ErrorEmptyState = ({ 
  title = "Error Loading Content", 
  message = "We encountered an issue loading this page.",
  onRetry = null,
  showRetry = true 
}) => {
  return (
    <div className="text-center py-16">
      <FaExclamationTriangle className="mx-auto h-16 w-16 text-red-500 mb-6" />
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">{message}</p>
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold"
        >
          Try Again
        </button>
      )}
    </div>
  );
};

/** EmptyState React component. */
export const EmptyState = ({ 
  icon: Icon, 
  title, 
  message, 
  actionLabel = null, 
  onAction = null,
  actionUrl = null 
}) => {
  return (
    <div className="text-center py-16">
      {Icon && <Icon className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-600 mb-6" />}
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">{message}</p>
      {(actionLabel && onAction) && (
        <button
          onClick={onAction}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold"
        >
          {actionLabel}
        </button>
      )}
      {actionUrl && (
        <a
          href={actionUrl}
          className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold"
        >
          {actionLabel}
        </a>
      )}
    </div>
  );
};
