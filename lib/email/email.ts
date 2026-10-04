import nodemailer from "nodemailer";
import { emailTemplate } from "@/lib/email/emailTemplate";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

interface SendEmailParams {
  to: string;
  type: string;
  content?: any;
}

export async function sendEmail({
  to,
  type,
  content
}: SendEmailParams) {
  try {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      throw new Error("Gmail configuration is missing");
    }

    const { subject, html } = emailTemplate({ type, content });

    const result = await transporter.sendMail({
      from: `"Grace Fresh Market" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log("Email sent successfully:", result?.messageId);
    return result;
  } catch (error) {
    console.error("Failed to send email", error);
    throw error;
  }
}