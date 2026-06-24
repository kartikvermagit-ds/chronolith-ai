import { Link } from 'react-router-dom';

function LandingPage() {
  return (
    <div className="bg-slate-900 min-h-screen text-white font-sans">
      {/* Header */}
      <header className="container mx-auto px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Chronolith AI</h1>
        <Link to="/login" className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-full transition duration-300">
          Sign In
        </Link>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 text-center py-20 md:py-28">
        <h2 className="text-4xl md:text-6xl font-extrabold leading-tight mb-4">
          One AI. Every Goal. <span className="text-cyan-400">On Time.</span>
        </h2>
        <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
          The autonomous AI productivity companion that plans your work, manages deadlines, and creates recovery plans so you never fall behind.
        </p>
        <Link to="/signup" className="bg-cyan-500 hover:bg-cyan-600 text-white font-extrabold py-4 px-8 rounded-full text-lg transition duration-300 transform hover:scale-105 inline-block">
          Start Achieving Your Goals
        </Link>
      </main>

      {/* Features Section */}
      <section id="features" className="bg-slate-950 py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Your Personal AI Chief-of-Staff</h2>
            <p className="text-slate-400 mt-4 max-w-2xl mx-auto">Instead of just reminding you, Chronolith AI actively works with you to ensure success.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg text-center">
              <div className="mb-4 text-4xl">🗺️</div>
              <h3 className="text-xl font-bold text-white mb-2">AI-Generated Roadmaps</h3>
              <p className="text-slate-400">Turn any goal into a step-by-step plan. From "Learn Python" to "Crack GATE", get a clear path forward.</p>
            </div>
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg text-center">
              <div className="mb-4 text-4xl">🚨</div>
              <h3 className="text-xl font-bold text-white mb-2">Deadline Risk Meter</h3>
              <p className="text-slate-400">Our AI predicts if you're falling behind and quantifies the risk, so you can act before it's too late.</p>
            </div>
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg text-center">
              <div className="mb-4 text-4xl">🚀</div>
              <h3 className="text-xl font-bold text-white mb-2">Automatic Recovery Plans</h3>
              <p className="text-slate-400">Missed a few tasks? Don't worry. The AI automatically reshuffles your schedule to get you back on track.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 text-center text-slate-500">
        <p>&copy; 2026 Vibe2Ship Hackathon - Chronolith AI</p>
      </footer>
    </div>
  )
}

export default LandingPage;