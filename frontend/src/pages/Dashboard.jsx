import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchGoals, createGoal, toggleTask, rescheduleGoal } from '../api/goals';

const Dashboard = () => {
  const [goals, setGoals] = useState([]);
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDate, setNewGoalDate] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [riskPercentage, setRiskPercentage] = useState(0);
  const [userEmail, setUserEmail] = useState('');
  const navigate = useNavigate();

  // Load goals on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('userEmail');
    if (!token) {
      navigate('/login');
    } else {
      setUserEmail(email || 'demo@chronolith.ai');
      const loadGoalsData = async () => {
        try {
          const data = await fetchGoals();
          setGoals(data);
          if (data && data.length > 0) {
            setSelectedGoalId(data[0].id);
          }
        } catch (err) {
          console.error("Error loading goals:", err);
        } finally {
          setIsLoading(false);
        }
      };
      loadGoalsData();
    }
  }, [navigate]);

  const selectedGoal = goals.find((g) => g.id === selectedGoalId) || goals[0];

  // Dynamic Risk Calculation
  useEffect(() => {
    if (!selectedGoal || !selectedGoal.tasks || selectedGoal.tasks.length === 0) {
      setRiskPercentage(0);
      return;
    }

    const totalTasks = selectedGoal.tasks.length;
    const completedTasks = selectedGoal.tasks.filter((t) => t.completed).length;

    // 1. Progress Factor
    const completionRate = completedTasks / totalTasks;

    // 2. Days Remaining Factor
    let daysRemaining = 30;
    try {
      const targetDateStr = selectedGoal.targetDate || selectedGoal.target_date;
      const target = new Date(targetDateStr);
      const today = new Date();
      const diffTime = target.getTime() - today.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch (e) {
      daysRemaining = 30;
    }

    if (daysRemaining <= 0) {
      setRiskPercentage(completionRate === 1 ? 0 : 95);
      return;
    }

    const uncompletedTasks = totalTasks - completedTasks;
    const tasksPerDayRequired = uncompletedTasks / daysRemaining;

    // Base risk decreases as completion rate increases
    let calculatedRisk = Math.round((1 - completionRate) * 80);

    // Speed penalty: if user needs to finish more tasks per day, increase risk
    if (tasksPerDayRequired > 0.4) {
      calculatedRisk = Math.min(95, calculatedRisk + Math.round(tasksPerDayRequired * 25));
    }

    // Minimum risk for incomplete goals is 15%
    if (completionRate < 1) {
      calculatedRisk = Math.max(15, calculatedRisk);
    } else {
      calculatedRisk = 0;
    }

    setRiskPercentage(calculatedRisk);
  }, [selectedGoal, goals]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  const handleToggleTask = async (goalId, taskId) => {
    try {
      const res = await toggleTask(taskId);
      
      // Update local state with updated progress and status
      setGoals((prevGoals) =>
        prevGoals.map((g) => {
          if (g.id === goalId) {
            return {
              ...g,
              progress: res.progress,
              tasks: g.tasks.map((t) => (t.id === taskId ? { ...t, completed: res.completed } : t)),
            };
          }
          return g;
        })
      );
    } catch (err) {
      console.error("Error toggling task:", err);
    }
  };

  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!newGoalTitle || !newGoalDate) return;

    setIsGenerating(true);
    try {
      const newGoalObj = await createGoal(newGoalTitle, newGoalDate);
      setGoals((prev) => [...prev, newGoalObj]);
      setSelectedGoalId(newGoalObj.id);
      setNewGoalTitle('');
      setNewGoalDate('');
    } catch (err) {
      console.error("Error creating goal:", err);
      alert("Failed to generate AI Roadmap. Check your backend connection.");
    } finally {
      setIsGenerating(false);
    }
  };

  const triggerReschedule = async () => {
    if (!selectedGoalId) return;
    setIsRescheduling(true);
    try {
      const updatedTasks = await rescheduleGoal(selectedGoalId);
      setGoals((prevGoals) =>
        prevGoals.map((g) => {
          if (g.id === selectedGoalId) {
            return {
              ...g,
              tasks: updatedTasks,
            };
          }
          return g;
        })
      );
    } catch (err) {
      console.error("Error rescheduling:", err);
      alert("Failed to reschedule tasks. Check backend connection.");
    } finally {
      setIsRescheduling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium">Synchronizing Chronolith database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col">
      {/* Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" alt="Chronolith AI Logo" className="h-9 w-9 rounded-lg object-cover border border-slate-800" />
          <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Chronolith AI
          </span>
          <span className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs px-2.5 py-0.5 rounded-full font-medium">
            Chief-of-Staff
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-400 text-sm hidden sm:inline">{userEmail}</span>
          <button
            onClick={handleLogout}
            className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold py-2 px-4 rounded-xl border border-slate-700 hover:border-slate-600 transition duration-300 cursor-pointer"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Goals List & New Goal Input */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Active Goals list */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-slate-200">Active Goals</h2>
            <div className="space-y-3">
              {goals.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGoalId(g.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-300 ${
                    selectedGoalId === g.id
                      ? 'bg-cyan-950/20 border-cyan-500/50 shadow-md shadow-cyan-500/5'
                      : 'bg-slate-850 border-slate-800 hover:border-slate-750'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-slate-100">{g.title}</span>
                    <span className="text-xs text-slate-400">Target: {g.targetDate || g.target_date}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${g.progress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center mt-2 text-xs text-slate-400">
                    <span>{g.progress}% Complete</span>
                    <span>{g.tasks.length} subtasks</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Add Goal Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-slate-200">Set New Goal</h2>
            <form onSubmit={handleAddGoal} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase tracking-wide">
                  Goal Name
                </label>
                <input
                  type="text"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="e.g. Learn Python, Build SaaS app"
                  className="w-full p-3 bg-slate-850 rounded-xl border border-slate-800 focus:border-cyan-500/50 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase tracking-wide">
                  Target Deadline
                </label>
                <input
                  type="date"
                  value={newGoalDate}
                  onChange={(e) => setNewGoalDate(e.target.value)}
                  className="w-full p-3 bg-slate-850 rounded-xl border border-slate-800 focus:border-cyan-500/50 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 rounded-xl transition duration-300 shadow-md shadow-cyan-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? 'AI Planning Roadmap...' : 'Generate AI Roadmap'}
              </button>
            </form>
          </div>
        </div>

        {/* Center/Right Column: Roadmap Details & Risk Meter */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Top Row: Risk Meter & AI Recovery */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Deadline Risk Meter */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center text-center">
              <h3 className="text-lg font-bold text-slate-200 mb-4 self-start">Deadline Risk Meter</h3>
              <div className="relative w-36 h-36 flex items-center justify-center mb-2">
                {/* Circular Gauge */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#1e293b"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={riskPercentage > 60 ? '#f43f5e' : riskPercentage > 30 ? '#fbbf24' : '#10b981'}
                    strokeWidth="8"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * riskPercentage) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-1000 ease-out-in"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-3xl font-extrabold tracking-tight">{riskPercentage}%</span>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">Risk Level</p>
                </div>
              </div>
              <p className="text-sm text-slate-350">
                {riskPercentage > 60 ? (
                  <span className="text-rose-400 font-medium">⚠️ High delay risk! Reschedule recommended.</span>
                ) : riskPercentage > 30 ? (
                  <span className="text-amber-400 font-medium">⚡ Moderate risk. Stay on top of upcoming tasks.</span>
                ) : (
                  <span className="text-emerald-400 font-medium">✓ Safe. You are completely on track!</span>
                )}
              </p>
            </div>

            {/* AI Recovery Plan */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-200 mb-2">AI Recovery Plan</h3>
                <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                  Our scheduler analyzes your progress and automatically reshuffles remaining items to minimize deadline overrun.
                </p>
                <div className="bg-slate-850 border border-slate-800 rounded-xl p-3 text-xs text-slate-300">
                  <strong className="text-cyan-400">Current Strategy:</strong> Shift non-blocking tasks, recommend daily revision times.
                </div>
              </div>
              <button
                onClick={triggerReschedule}
                disabled={isRescheduling || riskPercentage < 20}
                className="mt-4 w-full bg-slate-800 hover:bg-slate-750 text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/40 font-semibold py-3 rounded-xl transition duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isRescheduling ? 'AI Rescheduling...' : 'Reschedule & Optimize'}
              </button>
            </div>

          </div>

          {/* Bottom Row: Selected Goal Roadmap */}
          {selectedGoal ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-200">{selectedGoal.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">AI-Generated Learning Roadmap & Milestones</p>
                </div>
                <div className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-750 text-xs font-semibold text-slate-300">
                  {selectedGoal.progress}% Complete
                </div>
              </div>

              {/* Tasks List */}
              <div className="space-y-3.5">
                {selectedGoal.tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-350 ${
                      task.completed
                        ? 'bg-slate-950/20 border-slate-850/50 opacity-60'
                        : 'bg-slate-850 border-slate-800 hover:border-slate-750 hover:translate-x-0.5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => handleToggleTask(selectedGoal.id, task.id)}
                        className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500/50 cursor-pointer"
                      />
                      <span
                        className={`text-sm text-slate-100 ${
                          task.completed ? 'line-through text-slate-500' : ''
                        }`}
                      >
                        {task.text}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-450 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
                      {task.date}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl text-center">
              <p className="text-slate-400">Select a goal or add a new one to view its roadmap.</p>
            </div>
          )}
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-slate-900/40 border-t border-slate-850 py-6 text-center text-xs text-slate-500">
        <p>&copy; 2026 Chronolith AI Productivity Companion. Built for maximum reliability.</p>
      </footer>
    </div>
  );
};

export default Dashboard;
