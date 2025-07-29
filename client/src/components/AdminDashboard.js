import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import "./AdminDashboard.css";

function AdminDashboard() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [grouped, setGrouped] = useState({});
  const [paymentModeTotals, setPaymentModeTotals] = useState({ Cash: 0, UPI: 0 });
  const [expandedVolunteer, setExpandedVolunteer] = useState(null);
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [showDaywise, setShowDaywise] = useState(true);
  const [todayTotal, setTodayTotal] = useState(0);
  const [todayCash, setTodayCash] = useState(0);
  const [todayUPI, setTodayUPI] = useState(0);
  const [daywiseData, setDaywiseData] = useState([]);
  const navigate = useNavigate();

  const handleLogout = () => {
    auth.signOut().then(() => navigate("/"));
  };

  const fetchData = async () => {
    try {
      const colRef = collection(db, `Ganpati_${year}`);
      const snapshot = await getDocs(colRef);
      const data = snapshot.docs.map((doc) => doc.data());

      setRecords(data);
      const totalAmt = data.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
      setTotal(totalAmt);

      const tempGroup = {};
      const tempModes = { Cash: 0, UPI: 0 };
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let totalToday = 0, cashToday = 0, upiToday = 0;
      const daySummary = {};

      data.forEach((item) => {
        const amt = parseFloat(item.amount || 0);
        const mode = item.paymentMode || "Unknown";
        const ts = item.timestamp?.toDate?.() || new Date(item.timestamp);

        tempModes[mode] = (tempModes[mode] || 0) + amt;

        if (!tempGroup[item.volunteerName]) tempGroup[item.volunteerName] = [];
        tempGroup[item.volunteerName].push(item);

        if (ts >= today) {
          totalToday += amt;
          if (mode === "Cash") cashToday += amt;
          else if (mode === "UPI") upiToday += amt;
        }

        const dateStr = ts.toISOString().split("T")[0];
        if (!daySummary[dateStr]) daySummary[dateStr] = { total: 0, cash: 0, upi: 0, count: 0 };
        daySummary[dateStr].total += amt;
        if (mode === "Cash") daySummary[dateStr].cash += amt;
        else if (mode === "UPI") daySummary[dateStr].upi += amt;
        daySummary[dateStr].count += 1;
      });

      setGrouped(tempGroup);
      setPaymentModeTotals(tempModes);
      setTodayTotal(totalToday);
      setTodayCash(cashToday);
      setTodayUPI(upiToday);
      setDaywiseData(Object.entries(daySummary).map(([date, val]) => ({
        date,
        total: val.total,
        cash: val.cash,
        upi: val.upi,
        count: val.count
      })).sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [year]);

  const downloadXLSX = (data, name) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, name);
    XLSX.writeFile(workbook, `${name}_${year}.xlsx`);
  };

  const prepareAllRecords = () =>
    records.map((e) => ({
      Name: e.name,
      StudentID: e.studentId,
      Email: e.emailId,
      Amount: e.amount,
      Mode: e.paymentMode,
      PaymentMadeTo: e.paymentDoneTo,
      Volunteer: e.volunteerName,
      Time: e.timestamp?.toDate().toLocaleString() || "—",
    }));

  const prepareVolunteerWise = () => {
    return Object.entries(grouped).flatMap(([vol, entries]) =>
      entries.map((entry) => ({
        Volunteer: vol,
        Name: entry.name,
        StudentID: entry.studentId,
        Email: entry.emailId,
        Amount: entry.amount,
        Mode: entry.paymentMode,
        PaymentMadeTo: entry.paymentDoneTo,
        Time: entry.timestamp?.toDate().toLocaleString() || "—",
      }))
    );
  };

  return (
    <div className="admin-dashboard">
      <div className="top-bar">
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
        <div className="card"><h3>Total Collection</h3><p>₹ {total}</p></div>
        <div className="card"><h3>Total UPI</h3><p>₹ {paymentModeTotals.UPI || 0}</p></div>
        <div className="card"><h3>Total Cash</h3><p>₹ {paymentModeTotals.Cash || 0}</p></div>
        <div className="card"><h3>Volunteers</h3><p>{Object.keys(grouped).length}</p></div>
      </div>

      <div className="summary-cards">
        <div className="card"><h3>Today's Total</h3><p>₹ {todayTotal}</p></div>
        <div className="card"><h3>Today's UPI</h3><p>₹ {todayUPI}</p></div>
        <div className="card"><h3>Today's Cash</h3><p>₹ {todayCash}</p></div>
      </div>

      <div className="daywise-summary">
        <h3>
          Day-wise Collection Summary
          <span
            onClick={() => setShowDaywise(!showDaywise)}
            className="expand-toggle"
          >
            {showDaywise ? "▲" : "▼"}
          </span>
        </h3>
        {showDaywise && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Cash</th>
                  <th>UPI</th>
                  <th>Transactions</th>
                </tr>
              </thead>
              <tbody>
                {daywiseData.map((row, i) => (
                  <tr key={i}>
                    <td>{row.date}</td>
                    <td>₹ {row.total}</td>
                    <td>₹ {row.cash}</td>
                    <td>₹ {row.upi}</td>
                    <td>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h3 style={{ marginTop: "25px" }}>Volunteer Contributions</h3>
      {Object.keys(grouped).map((volName) => {
        const entries = grouped[volName];
        const total = entries.reduce((sum, e) => sum + parseFloat(e.amount), 0);
        const cash = entries.filter(e => e.paymentMode === "Cash").reduce((sum, e) => sum + parseFloat(e.amount), 0);

        return (
          <div key={volName} className="volunteer-block">
            <div
              className="volunteer-header"
              onClick={() => setExpandedVolunteer(expandedVolunteer === volName ? null : volName)}
            >
              <div>{volName}</div> <div className="vol-cash">₹{total} (Cash: ₹{cash})</div>
              <span className="arrow">{expandedVolunteer === volName ? "▲" : "▼"}</span>
            </div>
            {expandedVolunteer === volName && (
              <div className="volunteer-details">
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>ID</th>
                        <th>Email</th>
                        <th>Amount</th>
                        <th>Mode</th>
                        <th>Paid To</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry, i) => (
                        <tr key={i}>
                          <td>{entry.name}</td>
                          <td>{entry.studentId}</td>
                          <td>{entry.emailId}</td>
                          <td>₹ {entry.amount}</td>
                          <td>{entry.paymentMode}</td>
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
        );
      })}

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
                  <th>ID</th>
                  <th>Email</th>
                  <th>Amount</th>
                  <th>Mode</th>
                  <th>Paid To</th>
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
                    <td>{entry.paymentMode}</td>
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

      <div className="download-buttons">
        <button className="download-button" onClick={() => downloadXLSX(daywiseData, "Daywise_Summary")}>
          Daywise Summary
        </button>
        <button className="download-button" onClick={() => downloadXLSX(prepareVolunteerWise(), "Volunteer_Wise")}>
          Volunteer-wise
        </button>
        <button className="download-button" onClick={() => downloadXLSX(prepareAllRecords(), "All_Records")}>
          All Records
        </button>
      </div>
    </div>
  );
}

export default AdminDashboard;
