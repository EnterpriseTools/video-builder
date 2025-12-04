import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import App from '@/pages/App';
import Trim from '@/pages/trim/Trim';
import Create from '@/pages/create/Create';
import CaseStudyTemplate from '@/pages/create/CaseStudyTemplate';
import FreeFormTemplate from '@/pages/create/FreeFormTemplate';
import CSTeam from '@/pages/create/cs-team';
import PHRFooter from '@/components/shared/phr-footer';

// Layout component that wraps all pages with the PHR footer
function Layout() {
  return (
    <>
      <Outlet />
      <PHRFooter />
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <FreeFormTemplate /> },
      { path: '/create', element: <Create /> },
      { path: '/case-study-template', element: <CaseStudyTemplate /> },
      { path: '/free-form-template', element: <FreeFormTemplate /> },
      { path: '/cs-team', element: <CSTeam /> },
      { path: '/trim', element: <Trim /> },
      { path: '/home', element: <App /> },
      { path: '*', element: <div>Not Found</div> },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
} 