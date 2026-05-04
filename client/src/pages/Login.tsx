import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { parseBackendErrors } from "../functions/parseBackendErrors";

export default function Login() {
  const navigate = useNavigate();
  const { checkAuth, isAuth, login } = useAuth();

  useEffect(() => {
    if (isAuth === null) {
      checkAuth();
    }
  }, []);

  useEffect(() => {
    if (isAuth) navigate("/");
  }, [isAuth]);

  const [state, setState] = useState({
    email: "",
    password: "",
    error: "",
  });
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});
  const [pending, setPending] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState((prev) => ({
      ...prev,
      [e.target.name]: String(e.target.value),
    }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setState((prev) => ({ ...prev }));

    try {
      await login(state.email, state.password);
      navigate("/");
    } catch (err: any) {
      const messages = Array.isArray(err.response?.data?.message)
        ? err.response.data.message
        : [err.response?.data?.message || "Something went wrong"];

      setErrors(parseBackendErrors(messages));
      setState((prev) => ({ ...prev }));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="form-container">
      <h2 className="form-title">Sign In</h2>

      <form className="form" onSubmit={handleLogin}>
        {state.error && <span className="error-message">{state.error}</span>}

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
            placeholder="Enter your password"
            value={state.password}
            onChange={handleChange}
            required
          />
        </div>
        {errors.password && (
          <span className="error-message">{errors.password}</span>
        )}

        {errors.general && (
          <span className="error-message">{errors.general}</span>
        )}

        <button type="submit" className="submit-btn" disabled={pending}>
          {pending ? "Signing In..." : "Login"}
        </button>
      </form>

      <button
        className="google-signin-btn google-signin-btn--dark"
        type="button"
        onClick={() =>
          (window.location.href = "http://localhost:3000/auth/google")
        }
      >
        Sign in with Google
      </button>

      <div style={{ textAlign: "center" }}>
        <p style={{ color: "white" }}>
          Don&apos;t have an account?{" "}
          <Link className="dont-have-acc" to="/register">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
