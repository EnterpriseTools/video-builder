import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from '@/pages/App';
import Trim from '@/pages/trim/Trim';
import Create from '@/pages/create/Create';
import CaseStudyTemplate from '@/pages/create/CaseStudyTemplate';
import FreeFormTemplate from '@/pages/create/FreeFormTemplate';

const router = createBrowserRouter([
  { path: '/', element: <Create /> },
  { path: '/create', element: <Create /> },
  { path: '/case-study-template', element: <CaseStudyTemplate /> },
  { path: '/free-form-template', element: <FreeFormTemplate /> },
  { path: '/trim', element: <Trim /> },
  { path: '/home', element: <App /> },
  { path: '*', element: <div>Not Found</div> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
} 