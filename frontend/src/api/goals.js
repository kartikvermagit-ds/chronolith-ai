const API_URL = 'http://localhost:8000';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export const fetchGoals = async () => {
  const response = await fetch(`${API_URL}/goals`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to fetch goals');
  }

  return response.json();
};

export const createGoal = async (title, targetDate) => {
  const response = await fetch(`${API_URL}/goals`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ title, target_date: targetDate }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to create goal');
  }

  return response.json();
};

export const toggleTask = async (taskId) => {
  const response = await fetch(`${API_URL}/tasks/${taskId}/toggle`, {
    method: 'POST',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to toggle task');
  }

  return response.json();
};

export const rescheduleGoal = async (goalId) => {
  const response = await fetch(`${API_URL}/goals/${goalId}/reschedule`, {
    method: 'POST',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to reschedule goal');
  }

  return response.json();
};
