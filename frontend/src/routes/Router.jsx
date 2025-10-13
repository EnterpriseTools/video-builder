import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from '@/pages/App';
import Trim from '@/pages/trim/Trim';
import Create from '@/pages/create/Create';

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/trim', element: <Trim /> },
  { path: '/create', element: <Create /> },
  { path: '*', element: <div>Not Found</div> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
} 