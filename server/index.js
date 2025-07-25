const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const path = require("path");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.use(cors({
  origin: 'https://ganpatiiims.github.io',
  methods: ['GET', 'POST'],
  credentials: true
}));

// ---------- Send Email Route ----------
app.post("/send-email", async (req, res) => {
  try {
    const { to_name, to_email, amount, date } = req.body;
    console.log("POST /send-email route hit with data:", req.body);

    const data = {
      sender: { name: "Ganpati Varghani App", email: process.env.SENDER_EMAIL },
      to: [{ email: to_email, name: to_name }],
      subject: "Thank you for your contribution",
      htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 2px solid #d4af37; border-radius: 8px; background-color: #fff9e6;">
        <div style="text-align: center;">
          <img src="https://ganpatiiims.github.io/Assets/ganpati.png" style="width: 100%; object-fit: cover; border-radius: 8px 8px 0 0;">
          <h2 style="color: #d32f2f; margin: 20px 0 10px;"> Ganpati Varghani Receipt </h2>
          <p style="font-size: 14px; color: #555;">Jai Shree Ganesh! Thank you for your generous contribution 🪔</p>
        </div>
        <hr style="border: 1px dashed #d4af37; margin: 20px 0;">
        <table style="width: 100%; font-size: 15px; color: #333;">
          <tr><td><strong>Date:</strong></td><td>${date}</td></tr>
          <tr><td><strong>Donor Name:</strong></td><td>${to_name}</td></tr>
          <tr><td><strong>Amount:</strong></td><td>₹ ${amount} /-</td></tr>
        </table>
        <hr style="border: 1px dashed #d4af37; margin: 20px 0;">
        <div style="text-align: center;">
          <p style="font-size: 14px; color: #444;">
            The Ganpati Festival will be celebrated from <strong>27th August to 31st August</strong>.<br>
            You are cordially invited to join us and seek the blessings of Lord Ganesha!
          </p>
          <p style="margin-top: 20px; font-style: italic; color: #888;">
            "Vakratunda Mahakaya Suryakoti Samaprabha<br>
            Nirvighnam Kurume Deva Sarva Karyeshu Sarvada"
          </p>
        </div>
        <div style="margin-top: 30px; text-align: center;">
          <span style="font-size: 13px; color: #555;">Organizing Team</span><br>
          <span style="font-size: 12px; color: #999;">Ganpati 2025, IIM Shillong</span>
        </div>
      </div>`,
    };

    const headers = {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json",
    };

    const response = await axios.post("https://api.brevo.com/v3/smtp/email", data, { headers });
    console.log("Email sent:", response.data);
    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Error in /send-email:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to send email" });
  }
});


// // Serve static files from the React build folder
// app.use(express.static(path.join(__dirname, '../build')));

// // Fallback to index.html for React Router
// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, '../build', 'index.html'));
// });

app.listen(PORT, () => {
  console.log(` Server running at ${PORT}`);
});
