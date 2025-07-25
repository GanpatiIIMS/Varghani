import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  Timestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment
} from "firebase/firestore";
import { db, auth } from "../firebase";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./VolunteerDashboard.css";

function VolunteerDashboard({ user }) {
  const [qrIndex, setQrIndex] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    studentId: "",
    emailId: "",
    amount: ""
  });

  const navigate = useNavigate();
  const qrCountLimit = 10;
  const maxQr = 30;
  const today = new Date().toISOString().split("T")[0];

  const qrNameMapping = {
    1: "Priya Sharma", 2: "Aman Verma", 3: "Ravi Kumar", 4: "Sneha Patil", 5: "Rahul Mehta",
    6: "Kavita Joshi", 7: "Mohit Gupta", 8: "Anjali Singh", 9: "Raj Malhotra", 10: "Divya Rao",
    11: "Siddharth Menon", 12: "Pooja Desai", 13: "Nikhil Yadav", 14: "Swati Reddy", 15: "Karan Thakur",
    16: "Neha Iyer", 17: "Vikas Chauhan", 18: "Ishita Kapoor", 19: "Tushar Dey", 20: "Tanvi Pillai",
    21: "Harshit Sharma", 22: "Ritika Jain", 23: "Shreyas Joshi", 24: "Avni Shah", 25: "Deepak Khanna",
    26: "Meera Das", 27: "Yuvraj Salunke", 28: "Preeti Verma", 29: "Raghav Bhatia", 30: "Aishwarya Mohan"
  };

  useEffect(() => {
    const fetchQRIndex = async () => {
      const trackerRef = doc(db, "Ganpati_QRTracker", today);
      const docSnap = await getDoc(trackerRef);

      if (docSnap.exists()) {
        setQrIndex(docSnap.data().currentQrIndex);
      } else {
        await setDoc(trackerRef, {
          currentQrIndex: 1,
          counts: { 1: 0 }
        });
        setQrIndex(1);
      }
      setLoading(false);
    };

    fetchQRIndex();
  }, [today]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async () => {
    const { name, studentId, emailId, amount } = formData;
    if (!name || !studentId || !emailId || !amount) {
      setError("All fields are required.");
      return;
    }

    const collectionName = `Ganpati_${new Date().getFullYear()}`;
    const paymentDoneTo = qrNameMapping[qrIndex] || `Person ${qrIndex}`;
    const volunteerName = user.username;
    const trackerRef = doc(db, "Ganpati_QRTracker", today);

    try {
      const trackerSnap = await getDoc(trackerRef);
      const trackerData = trackerSnap.data();
      let currentCount = trackerData.counts[qrIndex] || 0;

      if (currentCount >= qrCountLimit) {
        let nextQr = qrIndex + 1 > maxQr ? 1 : qrIndex + 1;
        setQrIndex(nextQr);

        await updateDoc(trackerRef, {
          [`counts.${nextQr}`]: 1,
          currentQrIndex: nextQr
        });
      } else {
        await updateDoc(trackerRef, {
          [`counts.${qrIndex}`]: increment(1)
        });
      }

      await addDoc(collection(db, collectionName), {
        ...formData,
        amount: parseFloat(amount),
        paymentDoneTo,
        volunteerName,
        timestamp: Timestamp.now()
      });

      // 🔁 NEW: Send Email via your Brevo-based backend
      await fetch("https://varghani.onrender.com/send-email", {
        method: "POST",
        headers: {
        "Content-Type": "application/json"
        },
        body: JSON.stringify({
          to_name: name,
          to_email: emailId,
          amount: amount,
          date: new Date().toLocaleDateString()
        })
});


      setFormData({ name: "", studentId: "", emailId: "", amount: "" });
    } catch (err) {
      console.error("Submission failed:", err);
      setError("Error submitting form. Please try again.");
    }
  };

  const handleLogout = () => {
    auth.signOut().then(() => navigate("/"));
  };

  if (loading) return <div>Loading QR Info...</div>;

  return (
    <div className="volunteer-container">
      <div className="top-row">
        <button className="logout-button" onClick={handleLogout}>Logout</button>
      </div>

      <h2 className="welcome-text">Welcome, {user.username}</h2>

      <img
        src={`/assets/qr${qrIndex}.png`}
        alt={`QR ${qrIndex}`}
        className="qr-image"
      />

      <div className="form-wrapper">
        <div className="input-group">
          <label>Name:</label>
          <input name="name" value={formData.name} onChange={handleChange} />
        </div>
        <div className="input-group">
          <label>Student ID:</label>
          <input name="studentId" value={formData.studentId} onChange={handleChange} />
        </div>
        <div className="input-group">
          <label>Email ID:</label>
          <input name="emailId" type="email" value={formData.emailId} onChange={handleChange} />
        </div>
        <div className="input-group">
          <label>Amount:</label>
          <input name="amount" type="number" value={formData.amount} onChange={handleChange} />
        </div>

        {error && <p className="error">{error}</p>}

        <button onClick={handleSubmit}>Submit</button>
      </div>
    </div>
  );
}

export default VolunteerDashboard;

