import { createBrowserRouter } from 'react-router'
import { HealthPage } from '../features/health/HealthPage.tsx'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HealthPage />,
  },
])
