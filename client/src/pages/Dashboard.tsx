import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import API from "../api/axios";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(true);
  const [error, setError] = useState("");
  const { refresh, setUser, user, logout } = useAuth();

  // useEffect(() => {
  //   (async () => await checkAuth())();
  //   if (!isAuth) navigate("/login");
  // }, [isAuth]);

  useEffect(() => {
    if (
      error == "token not found" ||
      error == "Field refreshToken missing in your cookies" ||
      error == "jwt expired"
    ) {
      navigate("/login");
    }
    // if (error == "jwt expired") {
    //   async () => await refresh();
    //   navigate("/login");
    // }
  }, [error]);
  //
  // console.log(`error: ${error}`);

  useEffect(() => {
    API.get("/auth/user")
      .then((res) => {
        setUser(res.data);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load profile");
      })
      .finally(() => {
        setPending(false);
      });
  }, []);

  if (pending) {
    return (
      <div className="form-container">
        <h2 className="form-title">Loading Profile...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="form-container">
        <h2 className="form-title">Dashboard</h2>
        <span className="error-message">{error}</span>
      </div>
    );
  }

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      localStorage.removeItem("accessToken");
      window.location.href = "/login";
    }
  };

  const handleKillDevice = async () => {
    try {
      await API.delete("/auth/logout-device");
      localStorage.removeItem("accessToken");
      window.location.href = "/login";
    } catch (err) {
      console.error("Failed to kill device", err);
    }
  };

  return (
    <div className="form-container dashboard-container">
      <div className="dashboard-profile-picture">
        {user.picture ? (
          <img
            src={user.picture || "https://via.placeholder.com/150"}
            alt="Profile"
            className="dashboard-avatar"
          />
        ) : (
          <img
            style={{
              width: "100px",
              justifyContent: "center",
              alignItems: "center",
            }}
            src="walk.gif"
          />
        )}
      </div>

      <div className="dashboard-grid">
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <div className="dashboard-card-value">{user.fullname}</div>
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <div className="dashboard-card-value">{user.email}</div>
        </div>

        <div className="form-group">
          <label className="form-label">Role</label>
          <div className="dashboard-card-value">{user.roles[0]}</div>
        </div>

        <div className="form-group">
          <label className="form-label">Email verified</label>
          <div className="dashboard-card-value">
            {user.isVerified ? "Yes" : "No"}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Devices</label>
          <div className="dashboard-list">
            {user.platforms.map((platform, index) => (
              <div key={index} className="dashboard-list-item">
                {platform}
              </div>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Auth methods</label>
          <div className="dashboard-list">
            {user.methods.map((method, index) => (
              <div key={index} className="dashboard-list-item">
                {method}
              </div>
            ))}
          </div>
        </div>

        {/* <div className="form-group"> */}
        {/*   <label className="form-label">Two Factor Authentication</label> */}
        {/*   <div className="dashboard-card-value"> */}
        {/*     {user.isTwoFactor ? "Enabled" : "Disabled"} */}
        {/*   </div> */}
        {/* </div> */}

        <div className="form-group">
          <button
            type="button"
            className="kill-device-btn"
            onClick={handleKillDevice}
          >
            Kill Current Device
          </button>
        </div>

        <div className="form-group">
          <button type="button" className="submit-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
