import App from './app';
import React, { useEffect, useState } from 'react';

export default function AppWrapper() {
  const [userId, setUserId] = useState<number | null>(null);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    // Read data from the DOM element
    const rootElement = document.getElementById('tanstack-router-root');
    if (rootElement) {
      const userId = parseInt(rootElement.dataset.userId || '0');
      const events = JSON.parse(rootElement.dataset.events || '[]');
      setUserId(userId);
      setEvents(events);
    }
  }, []);
  
  if (userId === null) {
    return <div>Loading...</div>;
  }
  
  return <App userId={userId} events={events} />;
}