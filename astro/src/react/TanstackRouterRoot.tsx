import { router } from './router';
import { RouterProvider } from '@tanstack/react-router';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';

export default function TanstackRouterRoot() {
  useEffect(() => {
    const rootElement = document.getElementById('tanstack-router-root');
    if (rootElement) {
      const root = ReactDOM.createRoot(rootElement);
      root.render(
        <React.StrictMode>
          <RouterProvider router={router} />
        </React.StrictMode>
      );
    }
  }, []);

  return null;
}