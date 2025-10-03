const nodemailer = require("nodemailer");
require("dotenv").config();

const sendEmail = async (to, subject, htmlContent) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: process.env.EMAIL_PORT || 587,
      secure: false, // 465 => true, 587 => false
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: `"Tutorby" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text: "Please view this email in an HTML supported client.", // fallback
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    throw error;
  }
};

module.exports = sendEmail;
