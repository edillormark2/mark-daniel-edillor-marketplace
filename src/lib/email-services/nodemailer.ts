// src/lib/email-services/nodemailer.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendEmailWithNodemailer(emailData: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}) {
  try {
    const mailOptions = {
      from: `"Campus Marketplace" <${process.env.GMAIL_USER}>`,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      replyTo: emailData.replyTo,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, data: info };
  } catch (error) {
    console.error("Nodemailer error:", error);
    return { success: false, error: "Failed to send email" };
  }
}

// Optional: Add a function to verify the transporter configuration
export async function verifyEmailConfiguration() {
  try {
    await transporter.verify();
    console.log("Email transporter is ready");
    return { success: true };
  } catch (error) {
    console.error("Email transporter verification failed:", error);
    return { success: false, error };
  }
}
