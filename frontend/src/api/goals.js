const API_URL = 'http://127.0.0.1:8000';

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

export const askAssistant = async (message) => {
  const response = await fetch(`${API_URL}/assistant`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to communicate with assistant');
  }

  return response.json();
};

export const fetchFutureSelf = async (goalId) => {
  const response = await fetch(`${API_URL}/goals/${goalId}/future-self`, {
    method: 'POST',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to fetch future self projection');
  }

  return response.json();
};

export const smartInterruption = async (goalId, eventText) => {
  const response = await fetch(`${API_URL}/goals/${goalId}/smart-interruption`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ event_text: eventText }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to report smart interruption');
  }

  return response.json();
};


