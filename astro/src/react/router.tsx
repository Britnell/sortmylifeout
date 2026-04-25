import { createRootRoute, createRoute, createRouter, Outlet, RootRoute, useParams } from '@tanstack/react-router';
import React from 'react';
import App from './app';
import AppWrapper from './AppWrapper';

// Root Route
const rootRoute = createRootRoute({
  component: () => (
    <div className="p-4">
      <Outlet />
    </div>
  ),
});

// Calendar Route (main app route)
const calendarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <AppWrapper />,
});

// Dynamic route for any app path
const DynamicRouteComponent = () => {
  const params = useParams();
  return (
    <div>
      <h2>Dynamic Route: {params.slug}</h2>
      <Outlet />
    </div>
  );
};

const dynamicRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$slug',
  component: DynamicRouteComponent,
});

// Route Tree
const routeTree = rootRoute.addChildren([calendarRoute, dynamicRoute]);

// Create the router
const router = createRouter({ routeTree });

export { router };
export type { Router as AppRouter } from '@tanstack/react-router';

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}