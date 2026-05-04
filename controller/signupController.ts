import * as db from "../fake-db";
import nodemailer from "nodemailer";

const pendingVerifications: Record<
  string,
  { uname: string; password: string; email: string; code: string; expiresAt: number }
> = {};

let transporter: nodemailer.Transporter | null = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_USER !== "your-email@gmail.com") {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log("Using Ethereal test email account (no real emails sent)");
  }

  return transporter;
}

function generateCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function initiateSignup(uname: string, password: string, email: string) {
  const existingUser = db.getUserByEmail(email);
  if (existingUser) {
    return { success: false, message: "An account with this email already exists." };
  }

  const code = generateCode();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  pendingVerifications[email] = { uname, password, email, code, expiresAt };

  try {
    const mailer = await getTransporter();
    const info = await mailer.sendMail({
      from: process.env.SMTP_USER || "noreply@example.com",
      to: email,
      subject: "Your Verification Code",
      text: `Your verification code is: ${code}`,
      html: `<h2>Email Verification</h2><p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 10 minutes.</p>`,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log("Preview email at:", previewUrl);
    }
  } catch (err) {
    console.error("Failed to send email, but code is still valid.");
    console.error(err);
  }

  console.log(`[SIGNUP] Verification code for ${email}: ${code}`);
  return { success: true, message: "Verification code sent to your email." };
}

export function verifyAndCreateUser(email: string, code: string) {
  const pending = pendingVerifications[email];

  if (!pending) {
    return { success: false, message: "No pending signup found for this email." };
  }

  if (Date.now() > pending.expiresAt) {
    delete pendingVerifications[email];
    return { success: false, message: "Verification code has expired. Please sign up again." };
  }

  if (pending.code !== code) {
    return { success: false, message: "Invalid verification code." };
  }

  const user = db.addUser(pending.uname, pending.password, pending.email);
  delete pendingVerifications[email];

  return { success: true, message: "Account created successfully!", user };
}
