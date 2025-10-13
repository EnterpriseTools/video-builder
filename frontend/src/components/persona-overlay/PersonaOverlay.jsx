import PropTypes from 'prop-types';
import './PersonaOverlay.scss';

export default function PersonaOverlay({ name, title, bio }) {
  return (
    <div className="persona-overlay show-preview">
      <div className="persona-overlay-container">
        {name && <div className="persona-name">{name}</div>}
        {title && <div className="persona-title">{title}</div>}
        {bio && <div className="persona-bio">{bio}</div>}
      </div>
    </div>
  );
}

PersonaOverlay.propTypes = {
  name: PropTypes.string,
  title: PropTypes.string,
  bio: PropTypes.string,
};
