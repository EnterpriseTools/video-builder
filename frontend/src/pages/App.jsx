import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import './App.scss';

export default function App() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    api.get('/health')
      .then(setHealth)
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="app">
      <div className="app-content">
        <h1>Video Template Generator</h1>
        <p>Create professional videos with our template-based system</p>

        <div className="cta-section">
         
          <Link to="/create" className="btn btn--secondary btn--large cta-link">
            Create Video
          </Link>
          <Link to="/trim" className="btn btn--secondary btn--large cta-link">
            Video Trim Tool
          </Link>
        </div>
      </div>
    </div>
  );
}