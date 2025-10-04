const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_PASS);

const sessionsBookingController = async (req, res) => {
  const { date, email, phone, wechat } = req.body;

  if (!date || !email) {
    return res.status(400).json({ error: "Date and Email are required" });
  }

  const msg = {
    to: process.env.EMAIL_TO,
    from: '"Cipherford Free Lessons" <deriscofield1@gmail.com>',
    replyTo: email,
    subject: "New Free Lesson Booking Request",
    text: `New Booking:\nDate: ${date}\nEmail: ${email}\nPhone: ${
      phone || "N/A"
    }\nWeChat: ${wechat || "N/A"}`,
    html: `
      <h3>New Booking</h3>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone || "Not Provided"}</p>
      <p><strong>WeChat:</strong> ${wechat || "Not Provided"}</p>
    `,
  };

  try {
    await sgMail.send(msg);
    res.status(200).json({ message: "Booking email sent successfully!" });
  } catch (err) {
    console.error("SendGrid error:", err);
    res.status(500).json({ error: "Failed to send booking email" });
  }
};

module.exports = { sessionsBookingController };
