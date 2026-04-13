import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const sendEmail = async (options) => {
  // Create a transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  // Define the email options
  const mailOptions = {
    from: `VOXIO Security <${process.env.SMTP_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  // Actually send the email
  await transporter.sendMail(mailOptions);
  
};

export default sendEmail;
