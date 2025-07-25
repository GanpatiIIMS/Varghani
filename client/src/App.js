// App.js
import React, { useState } from "react";
import {  HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import VolunteerDashboard from "./components/VolunteerDashboard";
import AdminDashboard from "./components/AdminDashboard";

function App() {
  const [user, setUser] = useState(null);

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={<Login setUser={setUser} />}
        />
        <Route
          path="/volunteer"
          element={
            user?.role === "volunteer" ? (
              <VolunteerDashboard user={user} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/admin"
          element={
            user?.role === "admin" ? (
              <AdminDashboard />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
