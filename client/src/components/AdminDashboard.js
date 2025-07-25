import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

function AdminDashboard() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [grouped, setGrouped] = useState({});
  const [paymentTotals, setPaymentTotals] = useState({});
  const [expandedVolunteer, setExpandedVolunteer] = useState(null);
  const [showAllRecords, setShowAllRecords] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    auth.signOut().then(() => {
      navigate("/");
    });
  };

  const fetchData = async () => {
    try {
      const colRef = collection(db, `Ganpati_${year}`);
      const snapshot = await getDocs(colRef);
      const data = snapshot.docs.map(doc => doc.data());

      setRecords(data);

      const sum = data.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
      setTotal(sum);

      const tempGroup = {};
      const tempPayment = {};

      data.forEach(item => {
        // Group by volunteer
        if (!tempGroup[item.volunteerName]) {
          tempGroup[item.volunteerName] = [];
        }
        tempGroup[item.volunteerName].push(item);

        // Group by payment done to
        const payTo = item.paymentDoneTo || "Unknown";
        tempPayment[payTo] = (tempPayment[payTo] || 0) + parseFloat(item.amount);
      });

      setGrouped(tempGroup);
      setPaymentTotals(tempPayment);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [year]);

  return (
    <div className="admin-dashboard">
      <div className="logout-wrapper">
        <button className="logout-button" onClick={handleLogout}>Logout</button>
      </div>

      <h2>Admin Dashboard - {year}</h2>

      <div className="year-select">
        <label>Select Year:</label>
        <select value={year} onChange={(e) => setYear(e.target.value)}>
          {Array.from({ length: 6 }, (_, i) => {
            const y = 2024 + i;
            return <option key={y} value={y}>{y}</option>;
          })}
        </select>
      </div>

      <div className="summary-cards">
        <div className="card">
          <h3>Total Collection</h3>
          <p>₹ {total}</p>
        </div>
        <div className="card">
          <h3>Volunteers</h3>
          <p>{Object.keys(grouped).length}</p>
        </div>
      </div>

      <div className="payment-breakdown">
        <h3>Collection by QR Owner (Payment Made To)</h3>
        <div className="payment-grid">
          {Object.entries(paymentTotals)
            .sort((a, b) => b[1] - a[1]) // optional: sort by total descending
            .map(([name, amt]) => (
              <div className="payment-card" key={name}>
                <div className="payee-name">{name}</div>
                <div className="payee-amount">₹ {amt}</div>
              </div>
            ))}
        </div>
      </div>

      <h3 style={{ marginTop: "25px" }}>Volunteer Contributions</h3>
      {Object.keys(grouped).map((volName) => (
        <div key={volName} className="volunteer-block">
          <div
            className="volunteer-header"
            onClick={() =>
              setExpandedVolunteer(expandedVolunteer === volName ? null : volName)
            }
          >
            <strong>{volName}</strong> — ₹{" "}
            {grouped[volName].reduce((a, b) => a + parseFloat(b.amount), 0)}
            <span className="arrow">{expandedVolunteer === volName ? "▲" : "▼"}</span>
          </div>

          {expandedVolunteer === volName && (
            <div className="volunteer-details">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Student ID</th>
                      <th>Email</th>
                      <th>Amount</th>
                      <th>Payment Made To</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[volName].map((entry, i) => (
                      <tr key={i}>
                        <td>{entry.name}</td>
                        <td>{entry.studentId}</td>
                        <td>{entry.emailId}</td>
                        <td>₹ {entry.amount}</td>
                        <td>{entry.paymentDoneTo}</td>
                        <td>{entry.timestamp?.toDate().toLocaleString() || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="all-records">
        <h3 style={{ marginTop: "30px" }}>
          All Records{" "}
          <span
            onClick={() => setShowAllRecords(!showAllRecords)}
            className="expand-toggle"
          >
            {showAllRecords ? "▲ Hide" : "▼ Show"}
          </span>
        </h3>

        {showAllRecords && (
          <div className="all-table table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Student ID</th>
                  <th>Email</th>
                  <th>Amount</th>
                  <th>Payment Made To</th>
                  <th>Volunteer</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {records.map((entry, i) => (
                  <tr key={i}>
                    <td>{entry.name}</td>
                    <td>{entry.studentId}</td>
                    <td>{entry.emailId}</td>
                    <td>₹ {entry.amount}</td>
                    <td>{entry.paymentDoneTo}</td>
                    <td>{entry.volunteerName}</td>
                    <td>{entry.timestamp?.toDate().toLocaleString() || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
