import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../api/auth';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await loginUser(email, password);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('userEmail', email);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    // Quick developer/demo login bypass to test dashboard immediately
    localStorage.setItem('token', 'demo-token-12345');
    localStorage.setItem('userEmail', 'demo@chronolith.ai');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center relative overflow-hidden font-sans">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-md relative z-10">
        <div className="text-center mb-8 flex flex-col items-center">
          <img src="/logo.jpg" alt="Chronolith AI Logo" className="w-20 h-20 rounded-xl shadow-lg border border-slate-800 mb-4" />
          <Link to="/" className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent hover:opacity-90 transition duration-300">
            Chronolith AI
          </Link>
          <p className="text-slate-400 mt-2">Welcome back. Let's achieve your goals.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-slate-300 font-medium mb-2" htmlFor="email">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full p-3.5 bg-slate-850 rounded-xl border border-slate-800 focus:border-cyan-500/50 focus:bg-slate-850 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all duration-300 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-2" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-3.5 bg-slate-850 rounded-xl border border-slate-800 focus:border-cyan-500/50 focus:bg-slate-850 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all duration-300 text-white"
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-center text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-cyan-500/20 transition duration-300 transform active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="relative flex py-4 items-center">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-4 text-slate-500 text-sm">or</span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        <button
          onClick={handleDemoLogin}
          className="w-full bg-slate-800 hover:bg-slate-750 text-cyan-400 font-medium py-3 rounded-xl border border-cyan-500/10 hover:border-cyan-500/30 transition duration-300 mb-6 cursor-pointer"
        >
          Explore via Demo Account
        </button>

        <p className="text-center text-slate-400 text-sm">
          Don't have an account?{' '}
          <Link to="/signup" className="text-cyan-400 hover:text-cyan-300 font-medium transition duration-200">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
