import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import AppRouter from '@/routes/Router';
import ErrorBoundary from '@/components/shared/error-boundary/ErrorBoundary';
import Spinner from '@/components/shared/spinner/Spinner';
import '@/styles/main.scss';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<Spinner />}>
        <AppRouter />
      </Suspense>
    </ErrorBoundary>
  </React.StrictMode>
);