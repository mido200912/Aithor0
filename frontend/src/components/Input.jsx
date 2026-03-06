import './Input.css';

const Input = ({ label, type, name, value, onChange, placeholder, error, required }) => {
    return (
        <div className="form-group">
            {label && <label className="form-label">{label} {required && <span className="required">*</span>}</label>}
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`form-input ${error ? 'has-error' : ''}`}
            />
            {error && <span className="error-message">{error}</span>}
        </div>
    );
};

export default Input;
