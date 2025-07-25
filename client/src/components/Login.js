import React, { useState } from "react";
import {
  getDoc,
  setDoc,
  doc
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from "firebase/auth";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import "./Login.css";

function Login({ setUser }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleLogin = async () => {
    const { email, password } = formData;

    if (!email || !password) {
      setError("All fields are required.");
      return;
    }

    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      const uid = res.user.uid;

      const docRef = doc(db, "users", uid);
      const userSnap = await getDoc(docRef);

      if (!userSnap.exists()) {
        setError("No role information found. Contact admin.");
        return;
      }

      const userData = userSnap.data();

      if (isAdmin && userData.role !== "admin") {
        setError("You are not registered as an admin.");
        return;
      }

      if (!isAdmin && userData.role !== "volunteer") {
        setError("Not a volunteer account.");
        return;
      }

      setUser({ username: userData.name, uid, role: userData.role });
      navigate(userData.role === "admin" ? "/admin" : "/volunteer");

    } catch (err) {
      console.error(err);
      setError("Login failed. Check credentials.");
    }
  };

  const handleCreateAccount = async () => {
    const { email, password, name } = formData;

    if (!email || !password || !name) {
      setError("All fields are required.");
      return;
    }

    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      const uid = res.user.uid;

      await setDoc(doc(db, "users", uid), {
        uid,
        email,
        name,
        role: "volunteer"
      });

      alert("Account created! You can now log in.");
      setIsCreating(false);
      setFormData({ name: "", email: "", password: "" });
    } catch (err) {
      console.error(err);
      setError("Error creating account.");
    }
  };

  const handleForgotPassword = async () => {
    const { email } = formData;

    if (!email) {
      setError("Please enter your email to reset password.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset link has been sent to your email.");
    } catch (err) {
      console.error("Password reset failed:", err);
      setError("Failed to send reset email. Make sure the email is correct.");
    }
  };

  return (
    <div className="login-container">
      <h2>{isAdmin ? "Admin Login" : isCreating ? "Create Account" : "Volunteer Login"}</h2>

      {!isAdmin && isCreating && (
        <div className="input-group">
          <label>Name:</label>
          <input name="name" value={formData.name} onChange={handleChange} />
        </div>
      )}

      <div className="input-group">
        <label>Email:</label>
        <input name="email" value={formData.email} onChange={handleChange} />
      </div>

      <div className="input-group">
        <label>Password:</label>
        <input type="password" name="password" value={formData.password} onChange={handleChange} />
      </div>

      {!isCreating && (
        <p className="forgot-password" onClick={handleForgotPassword}>
          Forgot Password?
        </p>
      )}

      <div className="checkbox-container">
        <input
          type="checkbox"
          checked={isAdmin}
          onChange={() => {
            setIsAdmin(!isAdmin);
            setIsCreating(false);
            setFormData({ name: "", email: "", password: "" });
          }}
        />
        <label>Login as Admin</label>
      </div>

      {error && <p className="error">{error}</p>}

      <button onClick={isCreating ? handleCreateAccount : handleLogin}>
        {isCreating ? "Create Account" : "Login"}
      </button>

      {!isAdmin && (
        <p style={{ marginTop: "15px" }}>
          {isCreating ? (
            <>
              Already have an account?{" "}
              <span className="toggle-link" onClick={() => setIsCreating(false)}>Login</span>
            </>
          ) : (
            <>
              New volunteer?{" "}
              <span className="toggle-link" onClick={() => setIsCreating(true)}>Create Account</span>
            </>
          )}
        </p>
      )}
    </div>
  );
}

export default Login;

