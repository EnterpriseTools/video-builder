import './PHRFooter.scss';

/**
 * PHRFooter Component
 * 
 * Displays the PHR logo at the bottom of all pages with a tooltip
 * linking to contact information.
 */
export default function PHRFooter() {
  return (
    <footer className="phr-footer">
      <div className="phr-footer__content">
        <img 
          src="/phr.svg" 
          alt="PHR Logo" 
          className="phr-footer__logo"
        />
        <div className="phr-footer__tooltip">
          Reach out to our{' '}
          <a 
            href="https://axon.enterprise.slack.com/archives/C09LQE3AYK0" 
            target="_blank" 
            rel="noopener noreferrer"
            className="phr-footer__link"
          >
            Slack channel
          </a>
          {' '}for support.
        </div>
      </div>
    </footer>
  );
}

