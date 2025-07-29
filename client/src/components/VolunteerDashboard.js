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
import { useNavigate } from "react-router-dom";
import "./VolunteerDashboard.css";

function VolunteerDashboard({ user }) {
  const [qrIndex, setQrIndex] = useState(1);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formDisabled, setFormDisabled] = useState(false);
  const [upiLimitReached, setUpiLimitReached] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    studentId: "",
    emailId: "",
    amount: ""
  });
  const [paymentMode, setPaymentMode] = useState("");

  const navigate = useNavigate();
  const qrCountLimit = 10;
  const maxQr = 30;
  const limitPerDay = 300;

  const qrNameMapping = {
    1: "Apte Prathamesh", 2: "R Megha(SBI)", 3: "Ajay M P", 4: "Nishita Jagati", 5: "Abhijit Sahoo",
    6: "Mehul Patil", 7: "Naimish Jagdale", 8: "Payal Jakhotia", 9: "Kanchsuhi Yalini", 10: "Lavish Dakare",
    11: "Anish Makwana", 12: "Tripti Arora", 13: "Viren Kohli", 14: "Siddhant Kesarkar", 15: "Shweta Deshmane",
    16: "Ashish Sharma", 17: "Chada Sweatcha", 18: "Manaswini Thugutla", 19: "Grishma Joshi", 20: "Shivani Thombre",
    21: "Akshaya Balakrishna", 22: "Namrata Swain", 23: "Prerna Solanki", 24: "Mitali Kharul", 25: "Jagrati Shewaramani",
    26: "Shweta Bhanushali", 27: "Sweta Tripathy", 28: "Sanjay H R", 29: "Yash Kudesia", 30: "Riya Goyal"
  };

  useEffect(() => {
    const fetchInitialData = async () => {
  const qrTrackerRef = doc(db, "Ganpati_QRTracker", "rolling");
  const submissionRef = doc(db, "Ganpati_SubmissionTracker", "dailyLimit");

  const now = Timestamp.now();
  const nowDate = new Date(now.toMillis());

  // Convert to IST
  const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 mins
  const istNow = new Date(nowDate.getTime() + istOffset);

  // Set reset time to 5:30 AM IST of today
  const resetTime = new Date(istNow);
  resetTime.setHours(5, 30, 0, 0);
  if (istNow < resetTime) {
    resetTime.setDate(resetTime.getDate() - 1); // Use yesterday's 5:30 AM
  }

  // ------------------ QR ROTATION ------------------
  const qrSnap = await getDoc(qrTrackerRef);
  if (qrSnap.exists()) {
    const data = qrSnap.data();
    const lastUpdated = data.lastUpdated?.toMillis() || 0;

    if (lastUpdated < resetTime.getTime()) {
      await setDoc(qrTrackerRef, {
        currentQrIndex: 1,
        counts: { 1: 0 },
        lastUpdated: now
      });
      setQrIndex(1);
    } else {
      setQrIndex(data.currentQrIndex || 1);

      // Optional: Check if all QR slots are full
      const counts = data.counts || {};
      const allFilled = Object.keys(counts).length === maxQr &&
        Object.values(counts).every(c => c >= qrCountLimit);
      if (allFilled) {
        setUpiLimitReached(true);
      }
    }
  } else {
    await setDoc(qrTrackerRef, {
      currentQrIndex: 1,
      counts: { 1: 0 },
      lastUpdated: now
    });
    setQrIndex(1);
  }

  // ------------------ DAILY LIMIT ------------------
  const submissionSnap = await getDoc(submissionRef);
  if (submissionSnap.exists()) {
    const data = submissionSnap.data();
    const lastResetMillis = data.lastReset?.toMillis() || 0;

    if (lastResetMillis < resetTime.getTime()) {
      await setDoc(submissionRef, {
        count: 0,
        lastReset: now
      });
    } else if (data.count >= limitPerDay) {
      setFormDisabled(true);
      setError("300 transactions completed today. Please come back after 5:30 AM IST.");
    }
  } else {
    await setDoc(submissionRef, {
      count: 0,
      lastReset: now
    });
  }

  setLoading(false);
};

    fetchInitialData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
    setSuccessMessage("");
  };

  const handleSubmit = async () => {
    const { name, studentId, emailId, amount } = formData;
    setError("");
    setSuccessMessage("");

    if (!name || !studentId || !emailId || !amount || !paymentMode) {
      setError("All fields are required including payment mode.");
      return;
    }

    const submissionRef = doc(db, "Ganpati_SubmissionTracker", "dailyLimit");
    const today = new Date().toISOString().split("T")[0];
    const submissionSnap = await getDoc(submissionRef);

    if (submissionSnap.exists()) {
      const data = submissionSnap.data();
      if (data.date !== today) {
        await setDoc(submissionRef, { date: today, count: 1 });
      } else if (data.count >= limitPerDay) {
        setFormDisabled(true);
        setError("300 transactions completed today. Please come back tomorrow.");
        return;
      } else {
        await updateDoc(submissionRef, {
          count: increment(1)
        });
      }
    }

    setSubmitting(true);
    const collectionName = `Ganpati_${new Date().getFullYear()}`;
    const volunteerName = user.username;
    const now = Timestamp.now();
    let paymentDoneTo = "Cash Collection";

    try {
      if (paymentMode === "UPI") {
        const trackerRef = doc(db, "Ganpati_QRTracker", "rolling");
        const trackerSnap = await getDoc(trackerRef);
        const trackerData = trackerSnap.data();
        let currentCount = trackerData.counts[qrIndex] || 0;

        paymentDoneTo = qrNameMapping[qrIndex] || `Person ${qrIndex}`;

        if (currentCount >= qrCountLimit) {
          let nextQr = qrIndex + 1 > maxQr ? 1 : qrIndex + 1;
          setQrIndex(nextQr);

          await updateDoc(trackerRef, {
            [`counts.${nextQr}`]: 1,
            currentQrIndex: nextQr,
            lastUpdated: now
          });
        } else {
          await updateDoc(trackerRef, {
            [`counts.${qrIndex}`]: increment(1),
            lastUpdated: now
          });
        }
      }

      await addDoc(collection(db, collectionName), {
        ...formData,
        amount: parseFloat(amount),
        paymentDoneTo,
        paymentMode,
        volunteerName,
        timestamp: now
      });

      await fetch("http://localhost:8080/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_name: name,
          to_email: emailId,
          amount: amount,
          date: new Date().toLocaleDateString()
        })
      });

      setSuccessMessage("Submitted successfully!");

      // Wait before resetting
      setTimeout(() => {
        setFormData({ name: "", studentId: "", emailId: "", amount: "" });
        setPaymentMode("");
        setSuccessMessage("");
        setSubmitting(false);
      }, 2000);

    } catch (err) {
      console.error("Submission failed:", err);
      setError("Error submitting form. Please try again.");
      setSubmitting(false);
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

      <div className="form-wrapper">
        {formDisabled ? (
          <p className="error">{error}</p>
        ) : (
          <>
            <div className="input-group">
              <label>Payment Mode:</label>
              <div className="radio-options">
                <label>
                  <input
                    type="radio"
                    name="paymentMode"
                    value="UPI"
                    checked={paymentMode === "UPI"}
                    onChange={(e) => setPaymentMode(e.target.value)}
                  />
                  UPI
                </label>
                <label>
                  <input
                    type="radio"
                    name="paymentMode"
                    value="Cash"
                    checked={paymentMode === "Cash"}
                    onChange={(e) => setPaymentMode(e.target.value)}
                  />
                  Cash
                </label>
              </div>
            </div>

            {paymentMode && (
              <>
                {paymentMode === "UPI" && (
                  <img
                    src={require(`../assets/qr${qrIndex}.jpg`)}
                    alt={`QR ${qrIndex}`}
                    className="qr-image"
                  />
                )}

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

                {successMessage ? (
                  <p className="success">{successMessage}</p>
                ) : (
                  <button onClick={handleSubmit} disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit"}
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default VolunteerDashboard;
