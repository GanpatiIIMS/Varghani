const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const path = require("path");
const fs = require('fs');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://ganpatiiims.github.io"
  ],
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.json());

// ---------- Send Email Route ----------
app.post("/send-email", async (req, res) => {
  try {
    const { to_name, to_email, amount, date } = req.body;
    console.log("POST /send-email route hit with data:", req.body);

    const data = {
      sender: { name: "Ganpati Vargani App", email: process.env.SENDER_EMAIL },
      to: [{ email: to_email, name: to_name }],
      subject: "Thank you for your contribution!",
      htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 2px solid #d4af37; border-radius: 8px; background-color: #fff9e6;;">
  <div style="text-align: center;">
    <img src="https://ganpatiiims.github.io/Assets/ganpati_receipt.png" style="width: 100%; object-fit: cover; border-radius: 8px 8px 0 0;">
    <h2 style="color: #d32f2f; margin: 20px 0 10px;"> Ganeshotsav 2025  </h2>
    <h3 style="color: #000000ff; margin: 0px 0 10px;">Vargani Receipt</h3>
  <div style="text-align: center;">
    <p style="font-size: 14px; color: #444;">
      We warmly invite you to celebrate the auspicious occasion of Ganeshotsav with us!
      <p>From <strong>27th August</strong> to <strong>31st August</strong> 2025</p>
    </p>

  <hr style="border: 1px dashed #d4af37; margin: 20px 0;">
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
  <tr>
    <!-- Left Side: Receipt Info -->
    <td width="66%" valign="top" style="border-right: 2px dotted #d4af37; padding-right: 15px;">
      <table width="100%" cellpadding="5" cellspacing="0" style="font-size: 15px; color: #333; line-height: 1.8;">
        <tr>
          <td width="45%"><strong>Receipt Date</strong></td>
          <td width="5%">:</td>
          <td width="50%">${date}</td>
        </tr>
        <tr>
          <td><strong>Name</strong></td>
          <td>:</td>
          <td>${to_name}</td>
        </tr>
        <tr>
          <td><strong>Amount</strong></td>
          <td>:</td>
          <td>₹ ${amount} /-</td>
        </tr>
      </table>
    </td>

    <!-- Right Side: Logo and Text -->
    <td width="34%" valign="top" align="center" style="padding-left: 15px;">
      <img src="https://ganpatiiims.github.io/Assets/logo.png" alt="Logo" style="width: 70px; height: auto; margin-bottom: 10px;">
      <div style="font-size: 13px; color: #444;">Organizing Team</div>
      <div style="font-size: 12px; color: #999;">Ganeshotsav Mandal, IIM Shillong</div>
    </td>
  </tr>
</table>
<hr style="border: 1px dashed #d4af37; margin: 20px 0;">
    <p style="font-size: 14px; color: #555;">Thank you for your generous contribution!</p>
</div>
`
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
  //console.log(` Server running at ${PORT}`);
});



