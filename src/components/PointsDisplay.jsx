import { FaStar } from 'react-icons/fa';

export default function PointsDisplay({ points }) {
  return (
    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl shadow-xl p-6 text-white text-center">
      <h3 className="text-lg font-semibold uppercase tracking-wider">Total Points</h3>
      <div className="flex items-center justify-center mt-2">
        <FaStar className="text-yellow-200 text-4xl mr-3" />
        <span className="text-5xl font-extrabold">{points?.lifetime || 0}</span>
      </div>
      <p className="text-sm mt-2 opacity-80">Keep up the great work!</p>
    </div>
  );
}
