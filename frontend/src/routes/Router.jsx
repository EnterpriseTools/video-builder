import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import App from '@/pages/App';
import Create from '@/pages/create/Create';
import CaseStudyTemplate from '@/pages/create/CaseStudyTemplate';
import FreeFormTemplate from '@/pages/create/FreeFormTemplate';
import CSTeam from '@/pages/create/cs-team';
import AudioRecording from '@/pages/audio-recording/AudioRecording';
import CsShare from '@/pages/cs-share/CsShare';
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
      { path: '/audio-recording', element: <AudioRecording /> },
      { path: '/cs-share', element: <CsShare /> },
      { path: '/home', element: <App /> },
      { path: '*', element: <div>Not Found</div> },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
} 