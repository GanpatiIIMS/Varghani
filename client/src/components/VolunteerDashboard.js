import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  addDoc,
  Timestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  getDocs
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
  const [submitClicked, setSubmitClicked] = useState(false);
  const [assignedCode, setAssignedCode] = useState("");
  const [timer, setTimer] = useState(600);
  const [intervalId, setIntervalId] = useState(null);
  const submitLock = useRef(false);

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
  const qrCooldownHours = 24;

  const qrNameMapping = {
    1: "Apte Prathamesh", 2: "R Megha", 3: "Ajay M P", 4: "Nishita Jagati", 5: "Abhijit Sahoo",
    6: "Mehul Patil", 7: "Naimish Jagdale", 8: "Payal Jakhotia", 9: "Kanchsuhi Yalini", 10: "Lavish Dakare",
    11: "Anish Makwana", 12: "Tripti Arora", 13: "Viren Kohli", 14: "Siddhant Kesarkar", 15: "Shweta Deshmane",
    16: "Ashish Sharma", 17: "Chada Sweatcha", 18: "Manaswini Thugutla", 19: "Grishma Joshi", 20: "Shivani Thombre",
    21: "Akshaya Balakrishna", 22: "Namrata Swain", 23: "Prerna Solanki", 24: "Mitali Kharul", 25: "Jagrati Shewaramani",
    26: "Shweta Bhanushali", 27: "Sweta Tripathy", 28: "Sanjay H R", 29: "Yash Kudesia", 30: "Riya Goyal"
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      const submissionRef = doc(db, "Ganpati_SubmissionTracker", "dailyLimit");
      const now = Timestamp.now();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istNow = new Date(now.toMillis() + istOffset);
      const resetTime = new Date(istNow);
      resetTime.setHours(5, 30, 0, 0);
      if (istNow < resetTime) resetTime.setDate(resetTime.getDate() - 1);
      const submissionSnap = await getDoc(submissionRef);

      if (submissionSnap.exists()) {
        const data = submissionSnap.data();
        const lastResetMillis = data.lastReset?.toMillis() || 0;

        if (lastResetMillis < resetTime.getTime()) {
          await setDoc(submissionRef, { count: 0, lastReset: now });
        } else if (data.count >= limitPerDay) {
          setFormDisabled(true);
          setError("300 transactions completed today. Please come back after 5:30 AM IST.");
        }
      } else {
        await setDoc(submissionRef, { count: 0, lastReset: now });
      }
      setLoading(false);
    };

    fetchInitialData();

    const stored = sessionStorage.getItem("assignedQRSlot");
    if (stored) {
      const [qrIdx, slotId] = stored.split(":");
      const slotRef = doc(db, "Ganpati_QRTracker", qrIdx, "slots", slotId);
      getDoc(slotRef).then((docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        if ((data.status === "reserved" || data.count < qrCountLimit) && data.assignedTo === user.username) {
          setQrIndex(Number(qrIdx));
          setAssignedCode(`Q${String(qrIdx).padStart(2, "0")}${slotId}`);
          setTimer(600);
          const id = setInterval(() => {
            setTimer((prev) => {
              if (prev <= 1) {
                clearInterval(id);
                handleSlotExpiry();
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
          setIntervalId(id);
        }
      });
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      const now = Date.now();
      const slotsRef = collection(db, "Ganpati_QRTracker", qrIndex.toString(), "slots");
      const snapshot = await getDocs(slotsRef);

      snapshot.forEach(async (docSnap) => {
        const data = docSnap.data();
        if (
          data.status === "reserved" &&
          data.reservedAt &&
          now - data.reservedAt.toMillis() > 10 * 60 * 1000
        ) {
          const slotRef = doc(db, "Ganpati_QRTracker", qrIndex.toString(), "slots", docSnap.id);
          await updateDoc(slotRef, {
            status: "available",
            reservedBy: "",
            reservedAt: null,
          });
        }
      });
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [qrIndex]);

  const handleSlotExpiry = async () => {
    const assignedSlotId = sessionStorage.getItem("assignedQRSlot");
    if (!assignedSlotId) return;
    const [qrIdx, slotId] = assignedSlotId.split(":");
    const slotRef = doc(db, "Ganpati_QRTracker", qrIdx, "slots", slotId);
    try {
      await updateDoc(slotRef, {
        assignedTo: null,
        assignedAt: null,
        lastUsed: Timestamp.now(),
        status: "available",
        cooldownUntil: Timestamp.fromMillis(Date.now() + 2 * 60 * 1000)
      });
    } catch (err) {
      console.error("Failed to mark slot as expired:", err);
    }
    sessionStorage.removeItem("assignedQRSlot");
    setPaymentMode("");
    setAssignedCode("");
  };

  const handlePaymentModeChange = async (mode) => {
  setPaymentMode(mode);

  if (mode !== "UPI") return;

  const trackerRef = doc(db, "Ganpati_QRTracker", "rolling");
  let trackerSnap = await getDoc(trackerRef);

  // ✅ Create if missing
  if (!trackerSnap.exists()) {
    const initCounts = {};
    const initLastUsed = {};
    for (let i = 1; i <= maxQr; i++) {
      initCounts[i] = 0;
      initLastUsed[i] = null;
    }
    await setDoc(trackerRef, {
      counts: initCounts,
      lastUsed: initLastUsed
    });
    trackerSnap = await getDoc(trackerRef); // 🔁 Refetch updated data
  }

  const now = Timestamp.now();
  const data = trackerSnap.data();
  const counts = data.counts || {};
  const lastUsed = data.lastUsed || {};

  for (let i = 1; i <= maxQr; i++) {
    const count = counts[i] || 0;
    const lastUsedTime = lastUsed[i]?.toDate?.() || new Date(0);
    const hoursSinceLast = (now.toMillis() - lastUsedTime.getTime()) / (1000 * 60 * 60);

    if (count < qrCountLimit || hoursSinceLast >= qrCooldownHours) {
      const slotId = String(Math.floor(1 + Math.random() * 10)).padStart(2, "0");
      const slotRef = doc(db, "Ganpati_QRTracker", String(i), "slots", slotId);
      const slotSnap = await getDoc(slotRef);

      if (slotSnap.exists()) {
        const slotData = slotSnap.data();
        const completedAt = slotData.completedAt?.toMillis?.() || 0;
        const nowMillis = now.toMillis();

        const isAvailable = slotData.status === "available";
        const isReservedByMe = slotData.status === "reserved" && slotData.assignedTo === user.username;
        const isCompletedExpired = slotData.status === "completed" && (nowMillis - completedAt > 24 * 60 * 60 * 1000);

        if (isAvailable || isReservedByMe || isCompletedExpired) {
          await updateDoc(slotRef, {
            assignedTo: user.username,
            assignedAt: now,
            reservedAt: now,
            status: "reserved"
          });

          sessionStorage.setItem("assignedQRSlot", `${i}:${slotId}`);
          setQrIndex(i);
          setAssignedCode(`Q${String(i).padStart(2, "0")}${slotId}`);
          setTimer(600);

          if (intervalId) {
            clearInterval(intervalId);
          }


          const id = setInterval(() => {
            setTimer((prev) => {
              if (prev <= 1) {
                clearInterval(id);
                handleSlotExpiry();
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
          setIntervalId(id);
          break;
        }
      }
    }
  }
};


  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
    setSuccessMessage("");
  };

  const handleSubmit = async () => {
  if (submitLock.current) return;
  submitLock.current = true;
  setSubmitClicked(true);

  const { name, studentId, emailId, amount } = formData;
  setError("");
  setSuccessMessage("");

  if (!name || !studentId || !emailId || !amount || !paymentMode) {
    setError("All fields are required including payment mode.");
    submitLock.current = false;
    setSubmitClicked(false);
    return;
  }

  const submissionRef = doc(db, "Ganpati_SubmissionTracker", "dailyLimit");
  const today = new Date().toISOString().split("T")[0];
  const collectionName = `Ganpati_${new Date().getFullYear()}`;
  const volunteerName = user.username;
  const now = Timestamp.now();
  let paymentDoneTo = "Cash Collection";

  try {
    const submissionSnap = await getDoc(submissionRef);

    if (submissionSnap.exists()) {
      const data = submissionSnap.data();
      if (data.date !== today) {
        await setDoc(submissionRef, { date: today, count: 1 });
      } else if (data.count >= limitPerDay) {
        setFormDisabled(true);
        setError("300 transactions completed today. Please come back tomorrow.");
        submitLock.current = false;
        setSubmitClicked(false);
        return;
      } else {
        await updateDoc(submissionRef, { count: increment(1) });
      }
    } else {
      await setDoc(submissionRef, { date: today, count: 1 });
    }

    // UPI-specific logic
    const assignedSlotId = sessionStorage.getItem("assignedQRSlot");
    if (paymentMode === "UPI" && assignedSlotId) {
      const [qrIdx, slotId] = assignedSlotId.split(":");
      const slotRef = doc(db, "Ganpati_QRTracker", qrIdx, "slots", slotId);
      const slotSnap = await getDoc(slotRef);

      if (slotSnap.exists()) {
        const slotData = slotSnap.data();
        if (slotData.status === "reserved") {
          await updateDoc(slotRef, {
            status: "completed",
            completedAt: now
          });
        }
      }

      // Update rolling tracker
      const trackerRef = doc(db, "Ganpati_QRTracker", "rolling");
      const update = {
        [`counts.${qrIdx}`]: increment(1),
        [`lastUsed.${qrIdx}`]: now
      };
      await updateDoc(trackerRef, update);

      paymentDoneTo = qrNameMapping[qrIdx] || `Person ${qrIdx}`;
      sessionStorage.removeItem("assignedQRSlot");
    }

    // Common submission to Ganpati_2025
    await addDoc(collection(db, collectionName), {
      ...formData,
      amount: parseFloat(amount),
      paymentDoneTo,
      paymentMode,
      volunteerName,
      timestamp: now,
      status: "completed"
    });

    const emailDelay = 2000; // 2 seconds

      await new Promise(resolve => setTimeout(resolve, emailDelay));

      await fetch("https://varghani.onrender.com/send-email", {
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
    setSubmitting(false);
    setTimeout(() => {
      setFormData({ name: "", studentId: "", emailId: "", amount: "" });
      setPaymentMode("");
      setSuccessMessage("");
      submitLock.current = false;
      setSubmitClicked(false);
    }, 2000);

  } catch (err) {
    console.error("Submission failed:", err);
    setError("Error submitting the form. Please try again.");
    setSubmitting(false);
    submitLock.current = false;
    setSubmitClicked(false);
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
                <label><input type="radio" name="paymentMode" value="UPI" checked={paymentMode === "UPI"} onChange={(e) => handlePaymentModeChange(e.target.value)} />UPI</label>
                <label><input type="radio" name="paymentMode" value="Cash" checked={paymentMode === "Cash"} onChange={(e) => handlePaymentModeChange(e.target.value)} />Cash</label>
              </div>
            </div>

            {paymentMode && (
              <>
                {paymentMode === "UPI" && (
                  <>
                    <img src={require(`../assets/qr${qrIndex}.jpg`)} alt={`QR ${qrIndex}`} className="qr-image" />
                    {assignedCode && (
                      <div className="qr-index-title">
                        QR ID: {assignedCode}<br />
                        Time left to submit: {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
                      </div>
                    )}
                  </>
                )}

                <div className="input-group"><label>Name:</label><input name="name" value={formData.name} onChange={handleChange} /></div>
                <div className="input-group"><label>Student ID:</label><input name="studentId" value={formData.studentId} onChange={handleChange} /></div>
                <div className="input-group"><label>Email ID:</label><input name="emailId" type="email" value={formData.emailId} onChange={handleChange} /></div>
                <div className="input-group"><label>Amount:</label><input className="amount-input" name="amount" type="number" value={formData.amount} onChange={handleChange} /></div>

                {error && <p className="error">{error}</p>}
                {successMessage && <p className="success">{successMessage}</p>}

                {!successMessage && (
                  <button onClick={handleSubmit} disabled={submitClicked}>
                    {submitClicked ? <span className="spinner"></span> : "Submit"}
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

