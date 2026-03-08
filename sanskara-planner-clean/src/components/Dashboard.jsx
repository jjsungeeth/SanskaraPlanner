export default function Dashboard() {
  return (
    <div className="space-y-10 max-w-6xl mx-auto px-4 py-8">
      {/* Budget Card */}
      <div className="card">
        <h2 className="text-2xl md:text-3xl font-bold text-sans-gray mb-6 text-center md:text-left">
          Wedding Budget
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Overall Budget */}
          <div className="budget-tile text-center">
            <p className="text-sans-gray font-medium text-lg mb-2">Overall Budget</p>
            <p className="text-4xl md:text-5xl font-extrabold text-sans-pink">
              R 150,000
            </p>
          </div>

          {/* Spent */}
          <div className="budget-tile text-center">
            <p className="text-sans-gray font-medium text-lg mb-2">Spent</p>
            <p className="text-4xl md:text-5xl font-extrabold text-sans-pink">
              R 42,500
            </p>
          </div>

          {/* Remaining */}
          <div className="budget-tile text-center">
            <p className="text-sans-gray font-medium text-lg mb-2">Remaining</p>
            <p className="text-4xl md:text-5xl font-extrabold text-green-600">
              R 107,500
            </p>
          </div>
        </div>
      </div>

      {/* Chapters Card */}
      <div className="card">
        <h2 className="text-2xl md:text-3xl font-bold text-sans-gray mb-6 text-center md:text-left">
          Your Chapters
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6 border border-sans-nude hover:shadow-xl transition-shadow">
            <h3 className="text-xl font-semibold text-sans-pink mb-3">Wedding</h3>
            <p className="text-sans-gray mb-4 text-base">
              8 subchapters • 45% complete
            </p>
            <button className="btn-primary w-full py-3 text-base font-medium">
              Open
            </button>
          </div>

          {/* Placeholder */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-sans-nude opacity-60 cursor-not-allowed">
            <h3 className="text-xl font-semibold text-sans-gray mb-3">Other Chapters</h3>
            <p className="text-sans-gray">Coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}