import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchGoals, createGoal, toggleTask, rescheduleGoal, askAssistant, fetchFutureSelf, smartInterruption } from '../api/goals';

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

  // Active AI Widget States
  const [assistantMessages, setAssistantMessages] = useState([
    { sender: 'assistant', text: 'Welcome to your AI Productivity Coach. I am here to help you stay on track, optimize your study plans, and build consistent habits.\n\nAsk me anything about your active roadmap, discuss focus techniques, or ask for study guides. Actionable steps will automatically sync to your Coach Board on the right!' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [futureSelfTimeline, setFutureSelfTimeline] = useState(null);
  const [isSimulatingFuture, setIsSimulatingFuture] = useState(false);
  const [advisorNotes, setAdvisorNotes] = useState([
    "Set an active goal to initialize a custom learning plan.",
    "Click 'Simulate Future Self' to preview your 1-year progress vector.",
    "Ask Chronolith: 'Suggest a study schedule for my goal' to get started.",
    "Add subtasks and complete them to decrease deadline risk."
  ]);

  // Priority 1-4 Feature States
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [isReportingInterruption, setIsReportingInterruption] = useState(false);
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' or 'calendar'
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'goals', 'calendar', 'coach', 'habits', 'analytics', 'settings'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'goals', label: 'Goals', icon: '🎯' },
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'coach', label: 'AI Coach', icon: '🤖' },
    { id: 'habits', label: 'Habits', icon: '🔥' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];
  
  // Pomodoro Focus Timer
  const [pomodoroTime, setPomodoroTime] = useState(3000); // 50 mins = 3000 seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState('work'); // 'work' or 'break'

  // Habits Tracker (Priority 2)
  const [habits, setHabits] = useState(() => {
    try {
      const saved = localStorage.getItem('daily_habits');
      if (saved && saved !== 'undefined') {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Error parsing daily_habits from localStorage:", e);
    }
    return {
      coding: { checked: false, streak: 0 },
      sleep: { checked: false, streak: 0 },
      workout: { checked: false, streak: 0 },
      reading: { checked: false, streak: 0 },
      meditation: { checked: false, streak: 0 }
    };
  });

  // Task Notes & Resource Attachments (Priority 2)
  const [taskNotes, setTaskNotes] = useState(() => {
    try {
      const saved = localStorage.getItem('task_notes_resources');
      if (saved && saved !== 'undefined') {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Error parsing task_notes_resources from localStorage:", e);
    }
    return {};
  });
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [resourceType, setResourceType] = useState('Youtube');
  const [resourceUrl, setResourceUrl] = useState('');

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
          if (data && Array.isArray(data)) {
            setGoals(data);
            if (data.length > 0) {
              setSelectedGoalId(data[0].id);
            } else {
              setSelectedGoalId(null);
            }
          } else {
            console.error("fetchGoals returned non-array data:", data);
            setGoals([]);
            setSelectedGoalId(null);
          }
        } catch (err) {
          console.error("Error loading goals:", err);
          setGoals([]);
          setSelectedGoalId(null);
          // Redirect if token expired/invalid
          if (err.message && (err.message.includes("validate credentials") || err.message.includes("Unauthorized") || err.message.includes("401"))) {
            localStorage.removeItem('token');
            localStorage.removeItem('userEmail');
            navigate('/login');
          }
        } finally {
          setIsLoading(false);
        }
      };
      loadGoalsData();
    }
  }, [navigate]);

  const selectedGoal = (goals && Array.isArray(goals) && goals.length > 0)
    ? (goals.find((g) => g.id === selectedGoalId) || goals[0])
    : null;

  // Reset future self simulation when switching goals
  useEffect(() => {
    setFutureSelfTimeline(null);
  }, [selectedGoalId]);

  // Pomodoro timer decrement logic
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && pomodoroTime > 0) {
      interval = setInterval(() => {
        setPomodoroTime(prev => prev - 1);
      }, 1000);
    } else if (pomodoroTime === 0) {
      setIsTimerRunning(false);
      if (timerMode === 'work') {
        alert("Pomodoro Work Session complete! Take a 10 minute break.");
        setTimerMode('break');
        setPomodoroTime(600); // 10 mins
      } else {
        alert("Break complete! Back to focus.");
        setTimerMode('work');
        setPomodoroTime(3000); // 50 mins
      }
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, pomodoroTime, timerMode]);

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
        (Array.isArray(prevGoals) ? prevGoals : []).map((g) => {
          if (g.id === goalId) {
            return {
              ...g,
              progress: res.progress,
              tasks: (g.tasks || []).map((t) => (t.id === taskId ? { ...t, completed: res.completed } : t)),
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
      setGoals((prev) => [...(Array.isArray(prev) ? prev : []), newGoalObj]);
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
        (Array.isArray(prevGoals) ? prevGoals : []).map((g) => {
          if (g.id === selectedGoalId) {
            return {
              ...g,
              tasks: updatedTasks,
            };
          }
          return g;
        })
      );
      
      // Notify the chat log that reschedule was successful
      const targetDate = selectedGoal ? (selectedGoal.targetDate || selectedGoal.target_date) : '';
      setAssistantMessages((prev) => [
        ...prev,
        { sender: 'assistant', text: `✨ Goal timeline optimized! I have successfully rescheduled your remaining tasks up to ${targetDate} based on active priority and safety coefficients.` }
      ]);
    } catch (err) {
      console.error("Error rescheduling:", err);
      alert("Failed to reschedule tasks. Check backend connection.");
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleSendChatMessage = async (e, customMsg = null) => {
    if (e) e.preventDefault();
    const msgToSend = customMsg || chatInput;
    if (!msgToSend.trim()) return;

    setAssistantMessages((prev) => [...prev, { sender: 'user', text: msgToSend }]);
    if (!customMsg) setChatInput('');
    setIsChatLoading(true);

    // Provide context if active goal exists
    const tasksArray = selectedGoal && Array.isArray(selectedGoal.tasks) ? selectedGoal.tasks : [];
    const contextPrompt = selectedGoal 
      ? `(Context: My active goal is "${selectedGoal.title}" with a target deadline of ${selectedGoal.targetDate || selectedGoal.target_date} and current risk level is ${riskPercentage}%. Complete tasks: ${tasksArray.filter(t => t.completed).length}/${tasksArray.length}.) User request: ${msgToSend}`
      : msgToSend;

    try {
      const res = await askAssistant(contextPrompt);
      setAssistantMessages((prev) => [...prev, { sender: 'assistant', text: res.reply }]);
      
      // Parse the reply for bullet points or numbered lists to update the Solution Board
      const lines = res.reply.split('\n');
      const bullets = lines
        .map(line => line.trim())
        .filter(line => line.startsWith('-') || line.startsWith('*') || /^\d+\./.test(line))
        .map(line => line.replace(/^[-*\s]+|^\d+\.\s*/, ''));
        
      if (bullets.length > 0) {
        setAdvisorNotes((prev) => {
          const combined = [...bullets, ...prev];
          return Array.from(new Set(combined)).slice(0, 8);
        });
      }
    } catch (err) {
      console.error("Chat error:", err);
      setAssistantMessages((prev) => [...prev, { sender: 'assistant', text: "I'm having trouble connecting to my backend networks. Please verify the API is running." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSimulateFutureSelf = async () => {
    if (!selectedGoalId) return;
    setIsSimulatingFuture(true);
    setFutureSelfTimeline(null);
    try {
      const data = await fetchFutureSelf(selectedGoalId);
      setFutureSelfTimeline(data);
    } catch (err) {
      console.error("Error generating future self timeline:", err);
      alert("Failed to simulate future self. Please try again.");
    } finally {
      setIsSimulatingFuture(false);
    }
  };

  // voice input handler
  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please use Google Chrome or Edge.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsVoiceListening(true);
    };

    recognition.onend = () => {
      setIsVoiceListening(false);
    };

    recognition.onresult = (event) => {
      const speechToText = event.results[0][0].transcript;
      setNewGoalTitle(speechToText);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsVoiceListening(false);
    };

    recognition.start();
  };

  // handle smart interruptions
  const handleReportInterruption = async () => {
    if (!selectedGoalId) return;
    const eventText = prompt("Describe the schedule interruption (e.g. 'Exam tomorrow', 'Sick today'). Chronolith will dynamically reschedule tasks around this conflict:");
    if (!eventText || !eventText.trim()) return;

    setIsReportingInterruption(true);
    try {
      const updatedTasks = await smartInterruption(selectedGoalId, eventText);
      setGoals(prevGoals =>
        (Array.isArray(prevGoals) ? prevGoals : []).map(g => {
          if (g.id === selectedGoalId) {
            return { ...g, tasks: updatedTasks };
          }
          return g;
        })
      );
      setAssistantMessages(prev => [
        ...prev,
        { sender: 'assistant', text: `⚠️ Schedule updated for event: "${eventText}". Conflicting milestones have been moved to clear your schedule.` }
      ]);
    } catch (err) {
      console.error("Smart interruption error:", err);
      alert("Failed to reschedule tasks for interruption. Check backend.");
    } finally {
      setIsReportingInterruption(false);
    }
  };

  // Habit Tracker Toggle
  const toggleHabit = (key) => {
    setHabits(prev => {
      const habit = prev[key];
      const newChecked = !habit.checked;
      const updated = {
        ...prev,
        [key]: {
          checked: newChecked,
          streak: newChecked ? habit.streak + 1 : Math.max(0, habit.streak - 1)
        }
      };
      localStorage.setItem('daily_habits', JSON.stringify(updated));
      return updated;
    });
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Task Notes & Resources Local Storage Update
  const updateTaskNoteText = (taskId, text) => {
    setTaskNotes(prev => {
      const current = prev[taskId] || { notes: '', resources: [] };
      const updated = {
        ...prev,
        [taskId]: { ...current, notes: text }
      };
      localStorage.setItem('task_notes_resources', JSON.stringify(updated));
      return updated;
    });
  };

  const handleAddResource = (taskId) => {
    if (!resourceUrl.trim()) return;
    setTaskNotes(prev => {
      const current = prev[taskId] || { notes: '', resources: [] };
      const currentResources = current.resources || [];
      const updated = {
        ...prev,
        [taskId]: {
          ...current,
          resources: [...currentResources, { type: resourceType, url: resourceUrl }]
        }
      };
      localStorage.setItem('task_notes_resources', JSON.stringify(updated));
      return updated;
    });
    setResourceUrl('');
  };

  const handleRemoveResource = (taskId, index) => {
    setTaskNotes(prev => {
      const current = prev[taskId];
      if (!current || !current.resources) return prev;
      const updated = {
        ...prev,
        [taskId]: {
          ...current,
          resources: current.resources.filter((_, i) => i !== index)
        }
      };
      localStorage.setItem('task_notes_resources', JSON.stringify(updated));
      return updated;
    });
  };

  // Helper to format messages with basic markdown support (bold, lists) and strip JSON if returned by mistake
  const formatMessageText = (text) => {
    if (typeof text !== 'string') return '';
    let cleanText = text;
    
    if (cleanText.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(cleanText);
        cleanText = parsed.response || parsed.reply || parsed.message || parsed.text || cleanText;
      } catch (e) {}
    }
    
    return cleanText.split('\n').map((line, idx) => {
      let formattedLine = line;
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      
      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        parts.push(
          <strong key={match.index} className="text-cyan-400 font-bold bg-cyan-950/20 px-1 py-0.5 rounded border border-cyan-800/10">
            {match[1]}
          </strong>
        );
        lastIndex = boldRegex.lastIndex;
      }
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }
      
      const lineContent = parts.length > 0 ? parts : formattedLine;
      
      if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
        return (
          <li key={idx} className="ml-5 list-disc my-1.5 text-slate-300 leading-relaxed">
            {line.replace(/^[-*\s]+/, '')}
          </li>
        );
      }
      if (/^\d+\./.test(line.trim())) {
        return (
          <li key={idx} className="ml-5 list-decimal my-1.5 text-slate-300 leading-relaxed">
            {line.replace(/^\d+\.\s*/, '')}
          </li>
        );
      }
      
      return line.trim() === '' ? (
        <div key={idx} className="h-2"></div>
      ) : (
        <p key={idx} className="my-1.5 leading-relaxed text-slate-200 text-sm">
          {lineContent}
        </p>
      );
    });
  };

  // Dynamic progress predictions
  const calculatePrediction = () => {
    if (!selectedGoal || !selectedGoal.tasks || selectedGoal.tasks.length === 0) return { speed: 0, completionChance: 0, daysOffset: 0 };
    const total = selectedGoal.tasks.length;
    const done = selectedGoal.tasks.filter(t => t.completed).length;
    
    // Simulate study speed (done tasks / days elapsed)
    const speed = done === 0 ? 0.4 : Math.min(2.0, parseFloat((done / 4).toFixed(1))); // Simulated 4 days elapsed
    const remaining = total - done;
    
    let daysRemaining = 30;
    try {
      const deadline = new Date(selectedGoal.targetDate || selectedGoal.target_date);
      daysRemaining = Math.max(1, Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24)));
    } catch (e) {}

    const projectDaysNeeded = speed === 0 ? remaining * 2 : Math.ceil(remaining / speed);
    const offset = projectDaysNeeded - daysRemaining;
    const chance = Math.max(10, Math.min(99, Math.round(100 - (offset > 0 ? offset * 8 : 0))));

    return { speed, completionChance: chance, daysOffset: offset };
  };
  const forecast = calculatePrediction();

  // Detect Missed Backlog tasks (incomplete tasks with dates in the past)
  const getMissedBacklog = () => {
    if (!selectedGoal || !selectedGoal.tasks) return [];
    return selectedGoal.tasks.filter(t => {
      if (t.completed) return false;
      try {
        const tDate = new Date(t.date);
        const today = new Date();
        tDate.setHours(0,0,0,0);
        today.setHours(0,0,0,0);
        return tDate < today;
      } catch (e) {
        return false;
      }
    });
  };
  const missedBacklog = getMissedBacklog();

  // Calendar cell builder
  const renderCalendarView = () => {
    if (!selectedGoal || !selectedGoal.tasks) return null;
    
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    
    const cells = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`blank-${i}`} className="bg-slate-900/10 min-h-[90px] border border-slate-900/40 p-1"></div>);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTasks = selectedGoal.tasks.filter(t => t.date === dateStr);
      
      cells.push(
        <div key={`day-${day}`} className="bg-slate-950/60 border border-slate-850 p-2 min-h-[90px] flex flex-col justify-between hover:border-slate-700 transition-colors">
          <span className="text-[10px] font-bold text-slate-500 font-mono">{day}</span>
          <div className="flex-1 overflow-y-auto space-y-1 mt-1">
            {dayTasks.map(t => (
              <button
                key={t.id}
                onClick={() => handleToggleTask(selectedGoal.id, t.id)}
                title={t.text}
                className={`w-full text-left truncate text-[9px] px-1.5 py-0.5 rounded font-medium border leading-tight ${
                  t.completed
                    ? 'bg-emerald-950/20 text-emerald-450 border-emerald-900/30 line-through'
                    : 'bg-cyan-950/20 text-cyan-400 border-cyan-900/30'
                }`}
              >
                {t.text}
              </button>
            ))}
          </div>
        </div>
      );
    }
    
    return (
      <div className="bg-slate-950/30 rounded-xl p-5 border border-slate-850 shadow-inner mt-4">
        <h4 className="text-center font-bold text-slate-300 mb-4 font-mono text-sm tracking-wide">
          {monthNames[month]} {year}
        </h4>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 border-b border-slate-900 pb-2">
          <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells}
        </div>
      </div>
    );
  };
    const getQuickAISuggestion = () => {
    if (!selectedGoal) return "Add an active goal to get customized productivity tips.";
    if (riskPercentage > 60) return "⚠️ High deadline risk detected! Try rescheduling your milestones or break down your upcoming task into smaller subtasks.";
    if (riskPercentage > 30) return "⚡ Moderate risk. Try to complete your tasks scheduled for today to stay on track.";
    if (missedBacklog.length > 0) return `Timeline slippage detected! You have ${missedBacklog.length} missed milestone(s). Consider using the Auto-Reschedule engine in Analytics.`;
    const codingHabit = habits?.coding;
    if (codingHabit && !codingHabit.checked) return "🔥 Don't lose your habit streak! Remember to check off your daily coding routine today.";
    return "✓ Everything is on track! Keep up the great pace and focus on your daily goals.";
  };

  const renderDashboardHome = () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayTasks = (selectedGoal && selectedGoal.tasks)
      ? selectedGoal.tasks.filter(t => t.date === todayStr)
      : [];
    
    const hour = today.getHours();
    let greeting = 'Good Evening 🌙';
    if (hour >= 4 && hour < 12) greeting = 'Good Morning ☀';
    else if (hour >= 12 && hour < 18) greeting = 'Good Afternoon 🌤';

    return (
      <div className="space-y-8 max-w-[1200px] mx-auto">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-cyan-900/40 via-indigo-900/30 to-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-500 to-indigo-500"></div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-100 flex items-center gap-2">
                Welcome, {userEmail ? userEmail.split('@')[0] : 'Kartik'}
              </h1>
              <p className="text-cyan-400 font-bold text-lg mt-1">{greeting}</p>
            </div>
            {selectedGoal && (
              <div className="bg-slate-950/60 border border-slate-850 px-4 py-3 rounded-2xl flex flex-col items-center min-w-[150px]">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Active Goal</span>
                <span className="text-sm font-bold text-slate-200 truncate max-w-[130px]">{selectedGoal.title}</span>
              </div>
            )}
          </div>
        </div>

        {/* Widgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Today's Focus - Pomodoro */}
          <div className="bg-slate-900/50 backdrop-blur-md border border-indigo-500/20 rounded-3xl p-6 shadow-xl flex flex-col justify-between min-h-[260px]">
            <div>
              <h2 className="text-lg font-bold text-slate-100 mb-2 flex items-center gap-2">
                <span>⏱️</span> Today's Focus
              </h2>
              <p className="text-slate-400 text-xs mb-4">Deep work blocks maximize learning velocity. Commit to a 50m focus sprint.</p>
            </div>
            
            <div className="flex flex-col items-center py-2">
              <span className="text-4xl font-extrabold font-mono tracking-wider text-indigo-400 mb-4 filter drop-shadow-[0_0_8px_rgba(99,102,241,0.25)]">
                {formatTimer(pomodoroTime)}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="bg-slate-950 hover:bg-slate-900 text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 text-xs font-bold py-2 px-4 rounded-lg transition cursor-pointer"
                >
                  {isTimerRunning ? 'Pause' : 'Start Focus'}
                </button>
                <button
                  onClick={() => {
                    setIsTimerRunning(false);
                    setTimerMode('work');
                    setPomodoroTime(3000);
                  }}
                  className="bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-300 border border-slate-850 text-xs py-2 px-4 rounded-lg transition cursor-pointer"
                >
                  Reset
                </button>
              </div>
              <span className="text-[9px] text-slate-500 uppercase tracking-widest mt-3 font-bold">
                Mode: {timerMode === 'work' ? '💻 Work Session' : '☕ Break Time'}
              </span>
            </div>
          </div>

          {/* Today's Progress */}
          {selectedGoal ? (
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between min-h-[260px]">
              <div>
                <h2 className="text-lg font-bold text-slate-100 mb-2 flex items-center gap-2">
                  <span>📊</span> Today's Progress
                </h2>
                <p className="text-slate-450 text-xs mb-4">Your current roadmap path. Complete daily milestones to reduce deadline risk.</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm font-bold text-slate-300">
                  <span>{selectedGoal.title}</span>
                  <span className="text-cyan-400 font-mono">{selectedGoal.progress}%</span>
                </div>
                
                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-855">
                  <div
                    className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${selectedGoal.progress}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span>Deadline: {selectedGoal.targetDate || selectedGoal.target_date}</span>
                  <span>{selectedGoal.tasks ? selectedGoal.tasks.filter(t => t.completed).length : 0}/{selectedGoal.tasks ? selectedGoal.tasks.length : 0} Completed</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center min-h-[260px] text-center">
              <p className="text-slate-400 text-sm">Select an active goal in the Goals tab to track your progress vector.</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Today's Tasks */}
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-xl min-h-[280px] flex flex-col">
            <h2 className="text-lg font-bold text-slate-100 mb-3 flex items-center gap-2">
              <span>📅</span> Today's Tasks
            </h2>
            
            <div className="flex-1 overflow-y-auto max-h-[220px] pr-1 space-y-3 custom-scrollbar">
              {todayTasks.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-10">No tasks scheduled for today. Rest or accelerate future milestones!</p>
              ) : (
                todayTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 p-3 bg-slate-950/40 rounded-xl border border-slate-850 transition-all hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={t.completed}
                      onChange={() => handleToggleTask(selectedGoal.id, t.id)}
                      className="w-4 h-4 rounded text-cyan-500 bg-slate-950 border-slate-800 focus:ring-cyan-500/50 cursor-pointer"
                    />
                    <span className={`text-xs text-slate-300 font-medium truncate ${t.completed ? 'line-through text-slate-500' : ''}`}>
                      {t.text}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick AI Suggestion */}
          <div className="bg-slate-900/50 backdrop-blur-md border border-cyan-500/20 rounded-3xl p-6 shadow-xl min-h-[280px] flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-100 mb-3 flex items-center gap-2">
                <span>💡</span> Quick AI Suggestion
              </h2>
              <p className="text-xs text-slate-400 leading-normal mb-4">Contextual insights from your AI Coach based on deadline risks and habit vectors:</p>
            </div>

            <div className="bg-slate-950/70 border border-slate-850 rounded-2xl p-4 flex-1 flex items-center">
              <p className="text-xs text-slate-200 leading-relaxed italic font-medium">
                "{getQuickAISuggestion()}"
              </p>
            </div>
            
            <div className="mt-3 text-[10px] text-slate-500 font-bold uppercase tracking-wider flex justify-between">
              <span>AI Coach Engine v2.0</span>
              <span className="text-cyan-400">Live Feedback</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCalendarTab = () => {
    return (
      <div className="max-w-[1200px] mx-auto space-y-8">
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2.5">
            <span>📅</span> Master Study Calendar
          </h2>
          <p className="text-slate-450 text-xs mt-1.5 mb-6">Full calendar mapping of your study tasks and milestones. Click any task to toggle status.</p>
          {selectedGoal ? renderCalendarView() : (
            <div className="text-center py-10 text-slate-500 text-sm">
              Please select an active goal to view calendar milestones.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderRoadmapTab = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Goals List & New Goal */}
        <div className="lg:col-span-1 space-y-8">
          {/* Active Goals list */}
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-[0_0_25px_rgba(0,0,0,0.35)]">
            <h2 className="text-xl font-bold mb-4 text-slate-100 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)] animate-pulse"></span> Active Goals
            </h2>
            <div className="space-y-4">
              {(!goals || !Array.isArray(goals) || goals.length === 0) ? (
                <p className="text-sm text-slate-500 text-center py-6">No active goals. Add one below!</p>
              ) : (
                goals.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGoalId(g.id)}
                    className={`w-full text-left p-5 rounded-xl border transition-all duration-300 group cursor-pointer ${
                      selectedGoalId === g.id
                        ? 'bg-cyan-950/25 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                        : 'bg-slate-900/30 border-slate-800/60 hover:border-slate-700 hover:bg-slate-900/50'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="font-bold text-base text-slate-200 group-hover:text-cyan-400 transition-colors">
                        {g.title}
                      </span>
                      <span className="text-xs font-mono text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded border border-slate-855">
                        {g.targetDate || g.target_date}
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-855">
                      <div
                        className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${g.progress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center mt-2.5 text-xs text-slate-400">
                      <span className="font-semibold text-cyan-400">{g.progress}% Complete</span>
                      <span>{g.tasks ? g.tasks.length : 0} subtasks</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Add Goal Form with voice recognition */}
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-[0_0_25px_rgba(0,0,0,0.35)]">
            <h2 className="text-xl font-bold mb-4 text-slate-100 flex items-center gap-2">
              <span className="text-cyan-400">✨</span> Set New Goal
            </h2>
            <form onSubmit={handleAddGoal} className="space-y-5">
              <div>
                <label className="block text-slate-400 text-xs font-bold mb-2 uppercase tracking-widest">
                  Goal Name
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={newGoalTitle}
                    onChange={(e) => setNewGoalTitle(e.target.value)}
                    placeholder="e.g. Learn Python, Build SaaS app"
                    className="w-full pr-12 p-4 bg-slate-950/80 rounded-xl border border-slate-850 focus:border-cyan-500/50 focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all text-sm text-slate-200"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    title="Speak Goal Title (Web Speech API)"
                    className={`absolute right-3 p-2 rounded-lg transition-colors cursor-pointer ${
                      isVoiceListening ? 'bg-rose-500/20 text-rose-450 border border-rose-500/40 animate-pulse' : 'hover:bg-slate-900 text-slate-400'
                    }`}
                  >
                    🎙️
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-bold mb-2 uppercase tracking-widest">
                  Target Deadline
                </label>
                <input
                  type="date"
                  value={newGoalDate}
                  onChange={(e) => setNewGoalDate(e.target.value)}
                  className="w-full p-4 bg-slate-955/80 rounded-xl border border-slate-855 focus:border-cyan-500/50 focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all text-sm text-slate-300"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white font-bold py-3.5 rounded-xl transition duration-300 shadow-lg shadow-cyan-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-widest font-extrabold"
              >
                {isGenerating ? 'AI Planning Roadmap...' : 'Generate AI Roadmap'}
              </button>
            </form>
          </div>
        </div>

        {/* Center/Right Columns: Content timeline & simulator */}
        <div className="lg:col-span-2 space-y-8">
          {/* Timeline list of tasks */}
          {selectedGoal ? (
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-[0_0_25px_rgba(0,0,0,0.35)]">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-100">{selectedGoal.title}</h3>
                <p className="text-xs text-slate-455 mt-1">AI-Generated Learning Roadmap & Glowing Milestones</p>
              </div>

              {selectedGoal.tasks && selectedGoal.tasks.length > 0 ? (
                <div className="relative pl-8 border-l border-slate-800 space-y-6 ml-3 mt-4">
                  {selectedGoal.tasks.map((task, idx) => {
                    const isCompleted = task.completed;
                    const hasNotes = taskNotes[task.id];
                    const isExpanded = expandedTaskId === task.id;
                    const diffColors = task.difficulty === 'Easy' 
                      ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/30'
                      : task.difficulty === 'Hard'
                        ? 'bg-rose-955/20 text-rose-455 border-rose-900/30'
                        : 'bg-amber-955/20 text-amber-455 border-amber-900/30';

                    return (
                      <div key={task.id} className="relative group">
                        <div className={`absolute -left-[39px] top-1.5 w-4 h-4 rounded-full border-2 border-slate-950 flex items-center justify-center transition-all duration-300 ${
                          isCompleted 
                            ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' 
                            : riskPercentage > 60
                              ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)] animate-pulse'
                              : 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]'
                        }`}>
                          {isCompleted && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        
                        <div className={`bg-slate-900/30 backdrop-blur-sm border rounded-xl p-5 transition-all duration-300 ${
                          isCompleted 
                            ? 'border-slate-850/60 opacity-60' 
                            : 'border-slate-800 hover:border-slate-750 shadow-sm hover:shadow-[0_0_15px_rgba(6,182,212,0.03)]'
                        }`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <input
                                type="checkbox"
                                checked={task.completed}
                                onChange={() => handleToggleTask(selectedGoal.id, task.id)}
                                className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500/50 cursor-pointer transition-all duration-300 scale-110"
                              />
                              <span className={`text-sm text-slate-200 ${isCompleted ? 'line-through text-slate-500 font-normal' : 'font-semibold'}`}>
                                {task.text}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                              <span className={`text-[9px] font-bold font-mono tracking-wider border px-2 py-0.5 rounded uppercase ${diffColors}`}>
                                {task.difficulty || 'Medium'}
                              </span>
                              <span className="text-[9px] font-bold font-mono tracking-wider text-indigo-400 bg-indigo-950/20 px-2 py-0.5 rounded border border-indigo-900/30">
                                ⏳ {task.estimated_hours || 2} hrs
                              </span>
                              <span className="text-xs font-mono text-slate-455 bg-slate-950 px-2.5 py-1 rounded border border-slate-855">
                                {task.date}
                              </span>
                              <button
                                type="button"
                                onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-955 border border-slate-850 ml-1 cursor-pointer font-bold"
                              >
                                {isExpanded ? 'Hide Notes' : 'Edit Notes'}
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-slate-900/80 space-y-4">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Personal Task Notes</label>
                                <textarea
                                  value={hasNotes ? hasNotes.notes : ''}
                                  onChange={(e) => updateTaskNoteText(task.id, e.target.value)}
                                  placeholder="Write your study notes, solutions, or comments here..."
                                  className="w-full p-3 bg-slate-950 rounded-xl border border-slate-850 focus:border-cyan-500/50 focus:outline-none text-xs text-slate-200"
                                  rows="3"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Attached Resources</label>
                                {hasNotes && Array.isArray(hasNotes.resources) && hasNotes.resources.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mb-3">
                                    {hasNotes.resources.map((res, rIdx) => (
                                      <div key={rIdx} className="flex items-center gap-2 bg-slate-950/80 border border-slate-855 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
                                        <span className="text-[10px] font-bold text-cyan-400">[{res.type}]</span>
                                        <a href={res.url.startsWith('http') ? res.url : `https://${res.url}`} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 truncate max-w-[120px] underline">
                                          {res.url}
                                        </a>
                                        <button type="button" onClick={() => handleRemoveResource(task.id, rIdx)} className="text-slate-500 hover:text-rose-455 ml-1 cursor-pointer font-bold">×</button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                <div className="flex gap-2">
                                  <select
                                    value={resourceType}
                                    onChange={(e) => setResourceType(e.target.value)}
                                    className="p-2 bg-slate-955 rounded-xl border border-slate-850 text-xs text-slate-300 focus:outline-none"
                                  >
                                    <option value="Youtube">Youtube</option>
                                    <option value="Github">Github</option>
                                    <option value="PDF">PDF Link</option>
                                    <option value="Article">Article</option>
                                  </select>
                                  <input
                                    type="text"
                                    value={resourceUrl}
                                    onChange={(e) => setResourceUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="flex-1 p-2 bg-slate-950 rounded-xl border border-slate-850 text-xs text-slate-200 focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAddResource(task.id)}
                                    className="bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-xs px-4 rounded-xl cursor-pointer"
                                  >
                                    Add Link
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-6">No tasks found for this goal.</p>
              )}
            </div>
          ) : (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 shadow-xl text-center">
              <p className="text-slate-400">Select a goal or add a new one to view its roadmap.</p>
            </div>
          )}

          {/* AI Future Self Simulator */}
          {selectedGoal && (
            <div className="bg-slate-900/50 backdrop-blur-md border border-indigo-500/20 rounded-2xl p-6 shadow-[0_0_20px_rgba(99,102,241,0.05)]">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <span className="text-lg">🔮</span> AI Future Self Simulator
                  </h3>
                  <p className="text-xs text-slate-450 mt-0.5">Project your growth vector milestone by milestone once you finish this goal.</p>
                </div>
                <button
                  type="button"
                  onClick={handleSimulateFutureSelf}
                  disabled={isSimulatingFuture}
                  className="bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-semibold py-2 px-4 rounded-xl shadow-lg shadow-indigo-655/10 hover:shadow-indigo-655/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSimulatingFuture ? 'Running Projection...' : 'Simulate Future Self'}
                </button>
              </div>

              {isSimulatingFuture && (
                <div className="flex flex-col items-center justify-center py-10 space-y-3">
                  <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-indigo-400 font-medium animate-pulse">Running quantum life projections based on target milestones...</p>
                </div>
              )}

              {!isSimulatingFuture && futureSelfTimeline && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
                  {futureSelfTimeline.map((item, idx) => (
                    <div key={idx} className="bg-slate-950/60 border border-slate-850 hover:border-indigo-500/40 p-4 rounded-xl transition-all duration-300 relative group overflow-hidden shadow-md">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-60"></div>
                      <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase block mb-1">{item.day}</span>
                      <h4 className="font-bold text-xs text-slate-200 mb-1">{item.title}</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{item.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {!isSimulatingFuture && !futureSelfTimeline && (
                <div className="bg-slate-955/30 rounded-xl p-4 text-center border border-slate-850/60">
                  <p className="text-xs text-slate-500">Click the button above to simulate your personal growth vector and visualize your transformed future state.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderHabitsTab = () => {
    return (
      <div className="space-y-8 max-w-[1000px] mx-auto">
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-orange-500 to-amber-500"></div>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 mb-8 border-b border-slate-800 pb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2.5">
                <span className="text-3xl">🔥</span> Daily Habit Studio
              </h2>
              <p className="text-slate-450 text-xs mt-1.5">Track your daily routines, maintain streaks, and build consistent performance vectors.</p>
            </div>
            <div className="flex gap-4">
              <div className="bg-slate-955 border border-slate-855 px-4 py-2.5 rounded-xl text-center">
                <span className="text-[9px] font-bold text-slate-550 uppercase tracking-widest block mb-0.5">Active Routine</span>
                <span className="text-base font-extrabold text-amber-400 font-mono">
                  {Object.keys(habits || {}).length} Habits
                </span>
              </div>
              <div className="bg-slate-955 border border-slate-855 px-4 py-2.5 rounded-xl text-center">
                <span className="text-[9px] font-bold text-slate-550 uppercase tracking-widest block mb-0.5">Daily Completion</span>
                <span className="text-base font-extrabold text-emerald-455 font-mono">
                  {Object.keys(habits || {}).filter(k => habits[k].checked).length} / {Object.keys(habits || {}).length}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(habits ? Object.keys(habits) : []).map((key) => {
              const h = habits[key] || { checked: false, streak: 0 };
              return (
                <div 
                  key={key} 
                  className={`flex items-center justify-between p-5 border rounded-2xl transition-all duration-300 ${
                    h.checked
                      ? 'bg-slate-950/20 border-slate-850/60 opacity-80'
                      : 'bg-slate-900/20 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={h.checked || false}
                      onChange={() => toggleHabit(key)}
                      className="w-6 h-6 rounded border-slate-700 bg-slate-950 text-orange-500 focus:ring-orange-500/50 cursor-pointer scale-110"
                    />
                    <div>
                      <span className="text-sm font-extrabold uppercase text-slate-200 tracking-wider block">{key}</span>
                      <span className="text-[10px] text-slate-550 font-bold block mt-0.5">
                        {h.checked ? '✓ COMPLETED TODAY' : '⚡ ROUTINE ACTIVE'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-bold text-slate-550 uppercase tracking-widest">Streak Count</span>
                    <span className="text-sm font-black text-orange-455 bg-orange-950/15 border border-orange-900/30 px-3 py-1 rounded-lg mt-1 font-mono flex items-center gap-1.5">
                      🔥 {h.streak || 0} days
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderCoachTab = () => {
    return (
      <div className="space-y-8">
        <div className="bg-slate-900/50 backdrop-blur-md border border-cyan-500/20 rounded-2xl p-6 shadow-[0_0_30px_rgba(6,182,212,0.04)]">
          <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-slate-800">
            <div className="w-3.5 h-3.5 rounded-full bg-cyan-400 animate-ping"></div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span>🤖</span> Your AI Productivity Coach
              </h2>
              <p className="text-xs text-slate-400">Ask questions, plan focus blocks, or request study guides. Actionable points sync to your Coach Board.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Conversation Hub */}
            <div className="lg:col-span-3 flex flex-col border border-slate-800/80 bg-slate-950/40 rounded-xl p-4 h-[550px]">
              <div className="text-[10px] font-bold text-slate-400 tracking-wider mb-3 pb-2 border-b border-slate-900/80 flex justify-between items-center">
                <span>COACH CHAT</span>
                <span className="text-cyan-400 font-mono">ACTIVE FEED</span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 max-h-[400px] custom-scrollbar flex flex-col">
                {assistantMessages.map((msg, index) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div
                      key={index}
                      className={`flex gap-3 max-w-[88%] ${isUser ? 'self-end flex-row-reverse' : 'self-start'}`}
                    >
                      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold text-xs shadow-sm ${
                        isUser 
                          ? 'bg-cyan-600 text-white' 
                          : 'bg-indigo-950 border border-indigo-500/30 text-cyan-400'
                      }`}>
                        {isUser ? 'U' : 'Coach'}
                      </div>
                      <div className={`rounded-2xl py-3 px-4 ${
                        isUser
                          ? 'bg-slate-800/75 border border-slate-700/50 rounded-tr-none text-slate-100 shadow-sm'
                          : 'bg-slate-900/40 border-slate-850/60 rounded-tl-none text-slate-200'
                      }`}>
                        <div className="text-xs leading-relaxed">
                          {formatMessageText(msg.text)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {isChatLoading && (
                  <div className="flex gap-3 self-start max-w-[80%]">
                    <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-indigo-950 border border-indigo-500/30 text-cyan-400 font-bold text-xs">
                      Coach
                    </div>
                    <div className="rounded-2xl rounded-tl-none py-3 px-4 bg-slate-900/40 border border-slate-855/60 flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-900/60 flex flex-wrap gap-1.5">
                {[
                  "Suggest a study schedule for my goal",
                  "Where can I find free resources?",
                  "How do I balance this goal?"
                ].map((chipText) => (
                  <button
                    key={chipText}
                    type="button"
                    onClick={(e) => handleSendChatMessage(e, chipText)}
                    disabled={isChatLoading}
                    className="text-[10px] bg-slate-900/80 hover:bg-cyan-950/20 text-slate-300 hover:text-cyan-400 border border-slate-855 hover:border-cyan-500/20 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
                  >
                    {chipText}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSendChatMessage} className="mt-3.5 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask your Coach a question..."
                  className="flex-1 p-3 bg-slate-955 rounded-xl border border-slate-855 focus:border-cyan-500/50 focus:outline-none text-xs text-slate-200 focus:ring-1 focus:ring-cyan-500/20"
                  disabled={isChatLoading}
                />
                <button
                  type="submit"
                  disabled={isChatLoading}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-bold px-5 rounded-xl transition duration-300 cursor-pointer disabled:opacity-50 uppercase tracking-wider shadow-md"
                >
                  Send
                </button>
              </form>
            </div>

            {/* AI Coach Strategy Board */}
            <div className="lg:col-span-2 flex flex-col border border-slate-800/80 bg-slate-950/40 rounded-xl p-5 h-[550px]">
              <div className="text-[10px] font-bold text-slate-400 tracking-wider mb-3 pb-2 border-b border-slate-900/80 flex justify-between items-center">
                <span>AI COACH STRATEGY BOARD</span>
                <span className="text-indigo-400 font-mono">LIVE SYNC</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-sm custom-scrollbar">
                {selectedGoal && (
                  <div className="bg-indigo-950/15 border border-indigo-500/15 rounded-xl p-4 shadow-inner">
                    <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide mb-1">Active Target Goal</h4>
                    <p className="text-sm font-bold text-slate-200">{selectedGoal.title}</p>
                    <p className="text-xs text-slate-400 mt-1.5 leading-normal">
                      Coach Recommendation: Break down milestones, review weekly. Ask Coach to auto-generate guides.
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Extracted Action Steps & Solutions:</h4>
                  {advisorNotes.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No notes populated yet. Chat with the Coach to compile guidelines.</p>
                  ) : (
                    <ul className="space-y-3">
                      {advisorNotes.map((note, idx) => (
                        <li key={idx} className="flex gap-2.5 text-xs text-slate-300 items-start">
                          <span className="text-cyan-400 mt-0.5 text-[10px]">✦</span>
                          <span className="leading-relaxed font-medium">{note}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-900/60 flex justify-between items-center text-[10px] text-slate-500">
                <span>Updates dynamically from conversation</span>
                <button 
                  type="button"
                  onClick={() => setAdvisorNotes([
                    "Set an active goal to initialize a custom learning plan.",
                    "Click 'Simulate Future Self' to preview your 1-year progress vector.",
                    "Ask Coach: 'Suggest a study schedule for my goal' to get started."
                  ])}
                  className="text-slate-455 hover:text-rose-455 transition-colors font-semibold"
                >
                  Reset Board
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAnalyticsTab = () => {
    return (
      <div className="space-y-8 max-w-[1200px] mx-auto">
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-400 to-indigo-500"></div>
          
          <div className="mb-6 pb-6 border-b border-slate-800">
            <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2.5">
              <span>📊</span> AI Analytics & Optimization Hub
            </h2>
            <p className="text-slate-450 text-xs mt-1.5">Monitor project deviation paths, track deadline threat risk, and trigger scheduler engine recoveries.</p>
          </div>

          {/* Missed Backlog reschedule banner */}
          {selectedGoal && missedBacklog.length >= 2 && (
            <div className="bg-amber-955/20 border border-amber-500/30 rounded-2xl p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-[0_0_25px_rgba(245,158,11,0.06)] animate-pulse mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 text-lg shrink-0">
                  ⚡
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-455 uppercase tracking-wider">Timeline Slippage Detected</h4>
                  <p className="text-xs text-slate-300 mt-1 leading-normal">
                    AI detected <strong className="text-white">{missedBacklog.length} missed milestones</strong> in your backlog. Shift them automatically to weekend slots?
                  </p>
                </div>
              </div>
              <button
                onClick={triggerReschedule}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl transition duration-300 cursor-pointer self-start sm:self-auto shrink-0 shadow-md"
              >
                Auto-Reschedule Now
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Deadline Risk Meter */}
            <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-6 shadow-md flex flex-col items-center justify-center text-center min-h-[220px]">
              <h3 className="text-sm font-bold text-slate-355 mb-4 self-start flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.6)]"></span> Deadline Risk Meter
              </h3>
              
              <div className="relative w-36 h-36 flex items-center justify-center mb-3">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="#0f172a" strokeWidth="8" fill="transparent" />
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
                    className="transition-all duration-1000 ease-out-in filter drop-shadow-[0_0_10px_rgba(6,182,212,0.35)]"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-4xl font-extrabold tracking-tight bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
                    {riskPercentage}%
                  </span>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">Risk Factor</p>
                </div>
              </div>

              <p className="text-xs">
                {riskPercentage > 60 ? (
                  <span className="text-rose-400 font-bold drop-shadow-[0_0_4px_rgba(244,63,94,0.2)]">⚠️ HIGH DELAY RISK! Reschedule required.</span>
                ) : riskPercentage > 30 ? (
                  <span className="text-amber-450 font-bold">⚡ MODERATE RISK. Accelerate milestones.</span>
                ) : (
                  <span className="text-emerald-455 font-bold">✓ SAFE. Plan is completely optimized!</span>
                )}
              </p>
            </div>

            {/* AI Recovery Plan */}
            <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-6 shadow-md flex flex-col justify-between min-h-[220px]">
              <div>
                <h3 className="text-sm font-bold text-slate-355 mb-2.5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]"></span> AI Rescheduling Engine
                </h3>
                <p className="text-slate-400 text-xs mb-4 leading-relaxed">
                  Our scheduler analyzes your progress constraints and reshuffles upcoming items to minimize total deadline overruns.
                </p>
                <div className="flex gap-2.5">
                  <button
                    onClick={triggerReschedule}
                    disabled={isRescheduling || riskPercentage < 15}
                    className="flex-1 bg-slate-950 hover:bg-cyan-955/20 text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 hover:border-cyan-500/40 font-bold py-3.5 rounded-xl transition duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-xs uppercase tracking-widest"
                  >
                    {isRescheduling ? 'Optimizing...' : 'Reschedule'}
                  </button>
                  <button
                    onClick={handleReportInterruption}
                    disabled={isReportingInterruption}
                    className="flex-1 bg-slate-955 hover:bg-rose-955/20 text-rose-455 hover:text-rose-350 border border-rose-500/20 hover:border-rose-500/40 font-bold py-3.5 rounded-xl transition duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-xs uppercase tracking-widest"
                  >
                    {isReportingInterruption ? 'Rescheduling...' : 'Report Event'}
                  </button>
                </div>
              </div>
              <div className="bg-slate-950/80 border border-slate-850 rounded-xl p-3.5 text-xs text-slate-350 leading-normal">
                <strong className="text-cyan-400">Smart Reschedule:</strong> Instantly report scheduling conflicts (exams, sickness) to push milestone blocks.
              </div>
            </div>
          </div>

          {/* Progress Prediction & SVG Line Chart */}
          {selectedGoal && (
            <div className="bg-slate-955/30 border border-slate-850 rounded-2xl p-6 shadow-md">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-4">
                <span>📈</span> Progress Prediction & Velocity Forecast
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-5">
                <div className="bg-slate-955/60 p-4 border border-slate-850 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-slate-550 block mb-1">CURRENT VELOCITY</span>
                  <span className="text-lg font-bold text-cyan-400 font-mono">{forecast.speed} Tasks/day</span>
                </div>
                <div className="bg-slate-955/60 p-4 border border-slate-850 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-slate-550 block mb-1">SUCCESS PROJECTION</span>
                  <span className={`text-lg font-bold font-mono ${forecast.completionChance > 70 ? 'text-emerald-450' : 'text-amber-450'}`}>
                    {forecast.completionChance}% Confidence
                  </span>
                </div>
                <div className="bg-slate-955/60 p-4 border border-slate-850 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-slate-550 block mb-1">DEADLINE DEVIATION</span>
                  <span className={`text-lg font-bold font-mono ${forecast.daysOffset <= 0 ? 'text-emerald-455' : 'text-rose-400'}`}>
                    {forecast.daysOffset <= 0 ? 'On Track' : `Miss by ${forecast.daysOffset} days`}
                  </span>
                </div>
              </div>

              {/* SVG Line Graph */}
              <div className="bg-slate-950/80 border border-slate-850 rounded-xl p-4 flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-555 uppercase tracking-wider mb-2 self-start">Velocity Burn-up Projection</span>
                <svg className="w-full max-w-[500px] h-[150px] overflow-visible" viewBox="0 0 300 120">
                  <line x1="20" y1="100" x2="280" y2="100" stroke="#1e293b" strokeWidth="1" />
                  <line x1="20" y1="60" x2="280" y2="60" stroke="#1e293b" strokeWidth="1" strokeDasharray="3" />
                  <line x1="20" y1="20" x2="280" y2="20" stroke="#1e293b" strokeWidth="1" />
                  
                  <text x="5" y="103" fill="#64748b" className="text-[8px] font-mono">0%</text>
                  <text x="5" y="63" fill="#64748b" className="text-[8px] font-mono">50%</text>
                  <text x="5" y="23" fill="#64748b" className="text-[8px] font-mono">100%</text>
                  
                  <line x1="20" y1="100" x2="280" y2="20" stroke="#6366f1" strokeWidth="2" strokeDasharray="4" />
                  <text x="180" y="45" fill="#818cf8" className="text-[7px] font-bold tracking-wider uppercase">Target Path</text>
                  
                  <path
                    d={`M 20 100 L 100 ${100 - ((selectedGoal.progress || 0) * 0.8)} L 280 ${100 - ((selectedGoal.progress || 0) * 0.8)}`}
                    stroke="#06b6d4"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    className="filter drop-shadow-[0_0_6px_rgba(6,182,212,0.35)]"
                  />
                  <text x="80" y="80" fill="#22d3ee" className="text-[7px] font-bold tracking-wider uppercase">Actual Path</text>
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSettingsTab = () => {
    const totalGoals = goals ? goals.length : 0;
    const totalTasks = goals ? goals.reduce((acc, g) => acc + (g.tasks ? g.tasks.length : 0), 0) : 0;
    const completedTasks = goals ? goals.reduce((acc, g) => acc + (g.tasks ? g.tasks.filter(t => t.completed).length : 0), 0) : 0;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return (
      <div className="max-w-[1000px] mx-auto space-y-8">
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500"></div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 pb-6 border-b border-slate-800">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center text-3xl shadow-lg shadow-cyan-500/20 text-white font-extrabold">
                {userEmail ? userEmail.substring(0, 1).toUpperCase() : 'K'}
              </div>
              <div className="text-center md:text-left">
                <h2 className="text-2xl font-black text-slate-100">{userEmail ? userEmail.split('@')[0] : 'Kartik'}</h2>
                <p className="text-slate-400 text-xs mt-1 font-semibold tracking-wide uppercase">Member since 2026</p>
                <div className="mt-3 flex flex-wrap gap-2.5 justify-center md:justify-start">
                  <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/20 border border-cyan-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Verified Scholar
                  </span>
                  <span className="text-[10px] font-bold text-indigo-400 bg-indigo-950/20 border border-indigo-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    AI Coach Active
                  </span>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-455 border border-rose-500/30 hover:border-rose-500/50 text-xs font-extrabold py-3 px-6 rounded-xl transition duration-300 uppercase tracking-widest cursor-pointer shadow-md"
            >
              Log Out
            </button>
          </div>

          {/* Account Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-slate-950/60 p-5 border border-slate-855 rounded-2xl text-center">
              <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block mb-2">Total Roadmaps</span>
              <span className="text-3xl font-black text-slate-200 font-mono">{totalGoals}</span>
            </div>
            <div className="bg-slate-950/60 p-5 border border-slate-855 rounded-2xl text-center">
              <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block mb-2">Milestones Total</span>
              <span className="text-3xl font-black text-slate-200 font-mono">{totalTasks}</span>
            </div>
            <div className="bg-slate-950/60 p-5 border border-slate-855 rounded-2xl text-center">
              <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block mb-2">Completed</span>
              <span className="text-3xl font-black text-emerald-455 font-mono">{completedTasks}</span>
            </div>
            <div className="bg-slate-950/60 p-5 border border-slate-855 rounded-2xl text-center">
              <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block mb-2">Completion Rate</span>
              <span className="text-3xl font-black text-indigo-400 font-mono">{completionRate}%</span>
            </div>
          </div>

          {/* Habit Achievements & Streaks */}
          <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-bold text-slate-200 mb-4 flex items-center gap-2">
              <span>🔥</span> Habit Achievements & Streaks
            </h3>
            {(!habits || Object.keys(habits).length === 0) ? (
              <p className="text-xs text-slate-550 italic py-2">No habits configured yet. Go to Habit Tracker to start streaks.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {Object.keys(habits).map((key) => {
                  const h = habits[key] || { checked: false, streak: 0 };
                  return (
                    <div key={key} className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 truncate">{key}</span>
                      <span className="text-lg font-black text-orange-455 block font-mono">🔥 {h.streak || 0}</span>
                      <span className="text-[9px] text-slate-500 font-bold block mt-1.5">
                        {h.checked ? 'COMPLETED TODAY' : 'PENDING'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col md:flex-row relative overflow-x-hidden">
      {/* Futuristic Background Blur Blobs */}
      <div className="absolute top-10 right-10 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="absolute bottom-10 left-10 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none z-0"></div>

      {/* Mobile Header Bar */}
      <header className="md:hidden bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-6 py-4 flex justify-between items-center sticky top-0 z-40 w-full">
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" alt="Chronolith AI Logo" className="h-8 w-8 rounded-lg object-cover border border-slate-800 shadow-[0_0_15px_rgba(6,182,212,0.25)]" />
          <span className="text-xl font-extrabold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent tracking-tight">
            Chronolith AI
          </span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900/50 cursor-pointer text-lg font-bold"
        >
          {isSidebarOpen ? '✕' : '☰'}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`fixed md:sticky top-0 left-0 bottom-0 z-30 w-64 bg-slate-950 md:bg-slate-950/40 border-r border-slate-900 p-6 flex flex-col justify-between transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } h-screen`}>
        <div className="space-y-8">
          {/* Logo Brand Header */}
          <div className="flex items-center gap-3.5 pb-2 border-b border-slate-900">
            <img src="/logo.jpg" alt="Chronolith AI Logo" className="h-10 w-10 rounded-lg object-cover border border-slate-800 shadow-[0_0_15px_rgba(6,182,212,0.25)]" />
            <div className="flex flex-col">
              <span className="text-xl font-black bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent tracking-tight leading-none">
                Chronolith AI
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-550 mt-1">Productivity Coach</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3.5 px-4.5 py-3 rounded-xl border text-left text-sm font-bold tracking-wide transition-all duration-300 cursor-pointer ${
                    isActive
                      ? 'bg-cyan-950/25 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.12)]'
                      : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card at Bottom of Sidebar */}
        <div className="pt-4 border-t border-slate-900 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center font-extrabold text-white text-xs">
              {userEmail ? userEmail.substring(0, 1).toUpperCase() : 'K'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-200 truncate">{userEmail ? userEmail.split('@')[0] : 'Kartik'}</span>
              <span className="text-[9px] text-slate-500 font-mono truncate">{userEmail || 'demo@chronolith.ai'}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Backdrop overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden"
        ></div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-6 md:p-8 max-w-[1400px] mx-auto w-full z-10 relative overflow-y-auto h-screen custom-scrollbar animate-fadeIn">
        {activeTab === 'dashboard' && renderDashboardHome()}
        {activeTab === 'goals' && renderRoadmapTab()}
        {activeTab === 'calendar' && renderCalendarTab()}
        {activeTab === 'coach' && renderCoachTab()}
        {activeTab === 'habits' && renderHabitsTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </main>
    </div>
  );
};

export default Dashboard;
