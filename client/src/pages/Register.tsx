import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { parseBackendErrors } from "../functions/parseBackendErrors";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const navigate = useNavigate();
  const { register, checkAuth, isAuth, login } = useAuth();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuth) navigate("/");
  }, [isAuth]);

  const [pending, setPending] = useState(false);
  const [state, setState] = useState({
    fullname: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });
  const [errors, setErrors] = useState<{
    fullname?: string;
    email?: string;
    password?: string;
    passwordConfirm?: string;
    general?: string;
  }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (state.password !== state.passwordConfirm) {
      setErrors((prev) => ({
        ...prev,
        password: "Passwords do not match",
      }));
    }

    setPending(true);
    setState((prev) => ({ ...prev }));

    try {
      await register(
        state.fullname,
        state.email,
        state.password,
        state.passwordConfirm,
      );
      await login(state.email, state.password);

      navigate("/");
    } catch (err: any) {
      const messages = Array.isArray(err.response?.data?.message)
        ? err.response.data.message
        : [err.response?.data?.message || "Something went wrong"];

      setErrors(parseBackendErrors(messages));
      setState((prev) => ({
        ...prev,
      }));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="form-container">
      <h2 className="form-title">Sign Up</h2>

      <form className="form" onSubmit={handleRegister}>
        <div className="form-group">
          <label htmlFor="fullname" className="form-label">
            Full Name
          </label>
          <input
            type="text"
            id="fullname"
            name="fullname"
            className="form-input"
            placeholder="Enter your full name"
            value={state.fullname}
            onChange={handleChange}
            required
          />
        </div>

        {errors.fullname && (
          <span className="error-message">{errors.fullname}</span>
        )}

        <div className="form-group">
          <label htmlFor="email" className="form-label">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            className="form-input"
            placeholder="Enter your email"
            value={state.email}
            onChange={handleChange}
            required
          />
        </div>

        {errors.email && <span className="error-message">{errors.email}</span>}

        <div className="form-group">
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            className="form-input"
            placeholder="Create a password"
            value={state.password}
            onChange={handleChange}
            required
          />
        </div>
        {errors.password && (
          <span className="error-message">{errors.password}</span>
        )}

        <div className="form-group">
          <label htmlFor="passwordConfirm" className="form-label">
            Confirm Password
          </label>
          <input
            type="password"
            id="passwordConfirm"
            name="passwordConfirm"
            className="form-input"
            placeholder="Confirm your password"
            value={state.passwordConfirm}
            onChange={handleChange}
            required
          />
        </div>
        {errors.passwordConfirm && (
          <span className="error-message">{errors.passwordConfirm}</span>
        )}

        {errors.general && (
          <span className="error-message">{errors.general}</span>
        )}
        <button type="submit" className="submit-btn" disabled={pending}>
          {pending ? "Creating Account..." : "Create Account"}
        </button>

        <div style={{ textAlign: "center" }}>
          <p style={{ color: "white" }}>
            Already registered?{" "}
            <Link className="dont-have-acc" to="/login">
              Sign In
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
