import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_NAME = process.env.EMAIL_FROM_NAME || "LedgerNest";
const FROM_EMAIL = process.env.SMTP_USER || "noreply@ledgernest.app";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function baseTemplate(content: string) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0; padding:0; background-color:#f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="max-width:600px; margin:0 auto; padding:40px 20px;">
      <div style="background:#ffffff; border-radius:12px; padding:32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="text-align:center; margin-bottom:24px;">
          <h1 style="color:#16a34a; font-size:24px; margin:0;">💰 ${FROM_NAME}</h1>
        </div>
        ${content}
        <hr style="border:none; border-top:1px solid #e4e4e7; margin:24px 0;">
        <p style="color:#a1a1aa; font-size:12px; text-align:center; margin:0;">
          This email was sent by ${FROM_NAME}. If you didn't expect this, you can safely ignore it.
        </p>
      </div>
    </div>
  </body>
  </html>`;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.SMTP_USER) {
    console.warn("[Email] SMTP not configured, skipping email to:", to);
    console.log("[Email] Subject:", subject);
    return;
  }

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    });
    console.log(`[Email] Sent to: ${to} | Subject: ${subject}`);
  } catch (error) {
    console.error("[Email] Failed to send to:", to, error);
  }
}

// ─── Welcome / Account Created ───────────────────────────────────────
export async function sendWelcomeEmail(email: string, name: string) {
  const html = baseTemplate(`
    <h2 style="color:#18181b; margin:0 0 12px;">Welcome, ${name}! 🎉</h2>
    <p style="color:#3f3f46; line-height:1.6;">
      Your LedgerNest account has been created successfully. You can now create groups,
      track expenses, split bills, and settle up with friends.
    </p>
    <div style="text-align:center; margin:24px 0;">
      <a href="${APP_URL}/dashboard" style="display:inline-block; background:#16a34a; color:#fff; padding:12px 32px; border-radius:8px; text-decoration:none; font-weight:600;">
        Go to Dashboard
      </a>
    </div>
  `);
  await sendEmail(email, `Welcome to ${FROM_NAME}!`, html);
}

// ─── Email Verification OTP ─────────────────────────────────────────
export async function sendVerificationEmail(email: string, name: string, otp: string) {
  const html = baseTemplate(`
    <h2 style="color:#18181b; margin:0 0 12px;">Verify your email</h2>
    <p style="color:#3f3f46; line-height:1.6;">
      Hi ${name}, please use the code below to verify your email address:
    </p>
    <div style="text-align:center; margin:24px 0;">
      <div style="display:inline-block; background:#f4f4f5; border:2px dashed #16a34a; border-radius:8px; padding:16px 32px;">
        <span style="font-size:32px; font-weight:700; letter-spacing:8px; color:#16a34a;">${otp}</span>
      </div>
    </div>
    <p style="color:#71717a; font-size:14px; text-align:center;">
      This code expires in 10 minutes.
    </p>
  `);
  await sendEmail(email, `Your verification code: ${otp}`, html);
}

// ─── Password Reset OTP ─────────────────────────────────────────────
export async function sendPasswordResetEmail(email: string, name: string, otp: string) {
  const html = baseTemplate(`
    <h2 style="color:#18181b; margin:0 0 12px;">Password Reset Request</h2>
    <p style="color:#3f3f46; line-height:1.6;">
      Hi ${name}, we received a request to reset your password. Use this code:
    </p>
    <div style="text-align:center; margin:24px 0;">
      <div style="display:inline-block; background:#f4f4f5; border:2px dashed #ef4444; border-radius:8px; padding:16px 32px;">
        <span style="font-size:32px; font-weight:700; letter-spacing:8px; color:#ef4444;">${otp}</span>
      </div>
    </div>
    <p style="color:#71717a; font-size:14px; text-align:center;">
      This code expires in 10 minutes. If you didn't request this, ignore this email.
    </p>
  `);
  await sendEmail(email, `Password reset code: ${otp}`, html);
  console.log(`[Email] Sent password reset OTP to: ${email}`);
}

// ─── Group Invitation ────────────────────────────────────────────────
export async function sendInvitationEmail(
  email: string,
  inviterName: string,
  groupName: string,
  isExistingUser: boolean
) {
  const cta = isExistingUser
    ? `<a href="${APP_URL}/groups" style="display:inline-block; background:#16a34a; color:#fff; padding:12px 32px; border-radius:8px; text-decoration:none; font-weight:600;">View Group</a>`
    : `<a href="${APP_URL}/register" style="display:inline-block; background:#16a34a; color:#fff; padding:12px 32px; border-radius:8px; text-decoration:none; font-weight:600;">Create Account & Join</a>`;

  const html = baseTemplate(`
    <h2 style="color:#18181b; margin:0 0 12px;">You've been invited! 🤝</h2>
    <p style="color:#3f3f46; line-height:1.6;">
      <strong>${inviterName}</strong> invited you to join the group <strong>"${groupName}"</strong> on LedgerNest.
    </p>
    <div style="text-align:center; margin:24px 0;">
      ${cta}
    </div>
  `);
  await sendEmail(email, `${inviterName} invited you to "${groupName}"`, html);
}

// ─── New Expense Notification ────────────────────────────────────────
export async function sendExpenseNotificationEmail(
  email: string,
  recipientName: string,
  payerName: string,
  expenseTitle: string,
  totalAmount: number,
  yourShare: number,
  groupName: string,
  currency: string
) {
  const fmt = (n: number) => `${currency === "INR" ? "₹" : currency} ${n.toFixed(2)}`;
  const html = baseTemplate(`
    <h2 style="color:#18181b; margin:0 0 12px;">New Expense Added 🧾</h2>
    <p style="color:#3f3f46; line-height:1.6;">
      Hi ${recipientName}, <strong>${payerName}</strong> added a new expense in <strong>"${groupName}"</strong>:
    </p>
    <div style="background:#f4f4f5; border-radius:8px; padding:16px; margin:16px 0;">
      <table style="width:100%; border-collapse:collapse;">
        <tr><td style="color:#71717a; padding:4px 0;">Expense</td><td style="text-align:right; font-weight:600;">${expenseTitle}</td></tr>
        <tr><td style="color:#71717a; padding:4px 0;">Total</td><td style="text-align:right; font-weight:600;">${fmt(totalAmount)}</td></tr>
        <tr><td style="color:#71717a; padding:4px 0;">Your Share</td><td style="text-align:right; font-weight:700; color:#ef4444;">${fmt(yourShare)}</td></tr>
      </table>
    </div>
    <div style="text-align:center; margin:16px 0;">
      <a href="${APP_URL}/groups" style="display:inline-block; background:#16a34a; color:#fff; padding:10px 24px; border-radius:8px; text-decoration:none; font-weight:600; font-size:14px;">
        View Details
      </a>
    </div>
  `);
  await sendEmail(email, `New expense: "${expenseTitle}" in ${groupName}`, html);
}

// ─── Settlement Notification ─────────────────────────────────────────
export async function sendSettlementNotificationEmail(
  email: string,
  recipientName: string,
  payerName: string,
  amount: number,
  groupName: string,
  currency: string
) {
  const fmt = (n: number) => `${currency === "INR" ? "₹" : currency} ${n.toFixed(2)}`;
  const html = baseTemplate(`
    <h2 style="color:#18181b; margin:0 0 12px;">Settlement Recorded ✅</h2>
    <p style="color:#3f3f46; line-height:1.6;">
      Hi ${recipientName}, <strong>${payerName}</strong> settled <strong>${fmt(amount)}</strong> with you
      in group <strong>"${groupName}"</strong>.
    </p>
    <div style="text-align:center; margin:24px 0;">
      <a href="${APP_URL}/settlements" style="display:inline-block; background:#16a34a; color:#fff; padding:10px 24px; border-radius:8px; text-decoration:none; font-weight:600; font-size:14px;">
        View Settlements
      </a>
    </div>
  `);
  await sendEmail(email, `${payerName} settled ${fmt(amount)} with you`, html);
}

// ─── Budget Alert ────────────────────────────────────────────────────
export async function sendBudgetAlertEmail(
  email: string,
  name: string,
  percentage: number,
  spent: number,
  limit: number,
  currency: string
) {
  const fmt = (n: number) => `${currency === "INR" ? "₹" : currency} ${n.toFixed(2)}`;
  const isOver = percentage >= 100;
  const color = isOver ? "#ef4444" : "#f59e0b";
  const emoji = isOver ? "🚨" : "⚠️";
  const title = isOver ? "Budget Exceeded!" : "Budget Warning";

  const html = baseTemplate(`
    <h2 style="color:#18181b; margin:0 0 12px;">${emoji} ${title}</h2>
    <p style="color:#3f3f46; line-height:1.6;">
      Hi ${name}, you've used <strong style="color:${color};">${Math.round(percentage)}%</strong> of your monthly budget.
    </p>
    <div style="background:#f4f4f5; border-radius:8px; padding:16px; margin:16px 0;">
      <table style="width:100%; border-collapse:collapse;">
        <tr><td style="color:#71717a; padding:4px 0;">Spent</td><td style="text-align:right; font-weight:600; color:${color};">${fmt(spent)}</td></tr>
        <tr><td style="color:#71717a; padding:4px 0;">Budget Limit</td><td style="text-align:right; font-weight:600;">${fmt(limit)}</td></tr>
      </table>
    </div>
    <div style="text-align:center; margin:16px 0;">
      <a href="${APP_URL}/personal-expenses" style="display:inline-block; background:#16a34a; color:#fff; padding:10px 24px; border-radius:8px; text-decoration:none; font-weight:600; font-size:14px;">
        View Expenses
      </a>
    </div>
  `);
  await sendEmail(email, `${emoji} ${title} — ${Math.round(percentage)}% used`, html);
}

// ─── Password Changed Confirmation ──────────────────────────────────
export async function sendPasswordChangedEmail(email: string, name: string) {
  const html = baseTemplate(`
    <h2 style="color:#18181b; margin:0 0 12px;">Password Changed 🔒</h2>
    <p style="color:#3f3f46; line-height:1.6;">
      Hi ${name}, your password has been successfully changed. If you didn't make this change,
      please contact support immediately.
    </p>
  `);
  await sendEmail(email, "Your password has been changed", html);
}

export async function sendReminderEmail(
  email: string,
  name: string,
  fromName: string,
  amount: number | null,
  message: string | null
) {
  const amountText = amount ? ` of ₹${amount}` : "";
  const html = baseTemplate(`
    <h2 style="color:#18181b; margin:0 0 12px;">Payment Reminder 🔔</h2>
    <p style="color:#3f3f46; line-height:1.6;">
      Hi ${name}, <strong>${fromName}</strong> sent you a reminder about a pending payment${amountText}.
    </p>
    ${message ? `<p style="color:#3f3f46; line-height:1.6; font-style: italic;">"${message}"</p>` : ""}
    <div style="text-align:center; margin-top:24px;">
      <a href="${APP_URL}/settlements" style="background:#16a34a; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600;">
        View Settlements
      </a>
    </div>
  `);
  await sendEmail(email, `Payment Reminder from ${fromName}`, html);
}

// ─── Utility: generate OTP ──────────────────────────────────────────
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
