// components/LoadingSpinner.jsx
//
// Simple loading spinner for async states
//

export default function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center p-6">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
    </div>
  );
}
