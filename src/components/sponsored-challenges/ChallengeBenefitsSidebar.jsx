import { FaUsers, FaTrophy, FaLightbulb } from 'react-icons/fa';

export function ChallengeBenefitsSidebar({ formData, isAdmin, platformFee, sponsorReceives }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sticky top-8">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
        Why Choose Intwana Hub?
      </h3>
      <div className="space-y-4">
        <BenefitItem icon={FaUsers} color="blue" title="Global Talent Pool" desc="Access 10,000+ skilled developers worldwide" />
        <BenefitItem icon={FaTrophy} color="purple" title="Quality Submissions" desc="Rigorous review process ensures high-quality entries" />
        <BenefitItem icon={FaLightbulb} color="green" title="Innovation Focus" desc="Discover breakthrough solutions and fresh perspectives" />
      </div>

      {formData.budget && (
        <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-lg">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Cost Breakdown</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Budget:</span>
              <span className="font-medium">R{(parseInt(formData.budget)).toFixed(2)}</span>
            </div>
            {isAdmin ? (
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold text-gray-900 dark:text-white">Platform Fee:</span>
                <span className="font-bold text-green-600">FREE (Admin)</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Platform Fee (20%):</span>
                  <span className="font-medium text-red-600">-R{platformFee}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold text-gray-900 dark:text-white">You Pay:</span>
                  <span className="font-bold text-green-600">R{sponsorReceives}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BenefitItem({ icon: Icon, color, title, desc }) {
  const bgColors = { blue: 'bg-blue-100 dark:bg-blue-900', purple: 'bg-purple-100 dark:bg-purple-900', green: 'bg-green-100 dark:bg-green-900' };
  const textColors = { blue: 'text-blue-600 dark:text-blue-400', purple: 'text-purple-600 dark:text-purple-400', green: 'text-green-600 dark:text-green-400' };
  return (
    <div className="flex items-start">
      <div className={`${bgColors[color]} rounded-full p-2 mr-3`}>
        <Icon className={`h-4 w-4 ${textColors[color]}`} />
      </div>
      <div>
        <h4 className="font-semibold text-gray-900 dark:text-white">{title}</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">{desc}</p>
      </div>
    </div>
  );
}

export function ChallengeProcessSteps() {
  const steps = [
    { num: 1, color: 'blue', title: 'Review', desc: 'Our team reviews your challenge within 24 hours' },
    { num: 2, color: 'purple', title: 'Launch', desc: 'Approved challenges go live immediately' },
    { num: 3, color: 'green', title: 'Results', desc: 'Receive submissions and select winners' },
  ];
  const bgColors = { blue: 'bg-blue-100 dark:bg-blue-900', purple: 'bg-purple-100 dark:bg-purple-900', green: 'bg-green-100 dark:bg-green-900' };
  const textColors = { blue: 'text-blue-600 dark:text-blue-400', purple: 'text-purple-600 dark:text-purple-400', green: 'text-green-600 dark:text-green-400' };
  return (
    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">What happens next?</h3>
      <div className="grid md:grid-cols-3 gap-4">
        {steps.map(({ num, color, title, desc }) => (
          <div key={num} className="text-center">
            <div className={`${bgColors[color]} rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3`}>
              <span className={`${textColors[color]} font-bold`}>{num}</span>
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{title}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
