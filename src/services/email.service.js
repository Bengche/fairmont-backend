import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";
dotenv.config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM = {
  email: process.env.FROM_EMAIL || "support@fifahotel.com",
  name: "Fairmont Château Laurier",
};

const brandStyles = `
  body { margin:0; padding:0; background:#FAF8F2; font-family:'Georgia',serif; }
  .wrapper { max-width:600px; margin:0 auto; background:#FFFFFF; }
  .header { background:#1C1C1C; padding:32px 40px; text-align:center; }
  .header h1 { color:#C9A84C; font-size:22px; letter-spacing:0.12em; margin:0; font-weight:400; text-transform:uppercase; }
  .header p { color:#999; font-size:12px; letter-spacing:0.08em; margin:6px 0 0; }
  .body { padding:40px; }
  .gold-line { height:2px; background:#C9A84C; margin:0; }
  .detail-card { background:#FAF8F2; border:1px solid #E8E4DC; padding:24px; margin:24px 0; }
  .detail-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #E8E4DC; font-size:14px; }
  .detail-label { color:#6B6B6B; }
  .detail-value { color:#1C1C1C; font-weight:600; }
  .cta-btn { display:inline-block; background:#C9A84C; color:#1C1C1C; text-decoration:none; padding:14px 32px; font-size:13px; letter-spacing:0.1em; text-transform:uppercase; margin:24px 0; font-family:'Georgia',serif; }
  .footer { background:#1C1C1C; padding:24px 40px; text-align:center; }
  .footer p { color:#666; font-size:11px; margin:4px 0; letter-spacing:0.05em; }
  h2 { color:#1C1C1C; font-size:24px; font-weight:400; letter-spacing:0.04em; margin-bottom:8px; }
  p { color:#2D2D2D; font-size:15px; line-height:1.8; }
  .ref { color:#C9A84C; font-size:22px; font-weight:700; letter-spacing:0.1em; }
`;

const emailLayout = (title, bodyContent) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${title}</title>
  <style>${brandStyles}</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>Fairmont Ch&acirc;teau Laurier</h1>
    <p>Ottawa, Canada</p>
  </div>
  <div class="gold-line"></div>
  <div class="body">${bodyContent}</div>
  <div class="gold-line"></div>
  <div class="footer">
    <p>1 Rideau Street, Ottawa, Ontario K1N 8S7, Canada</p>
    <p>support@fifahotel.com</p>
    <p style="margin-top:12px;">&copy; ${new Date().getFullYear()} Fairmont Ch&acirc;teau Laurier. All rights reserved.</p>
  </div>
</div>
</body>
</html>
`;

const detailRow = (label, value) =>
  `<div class="detail-row"><span class="detail-label">${label}</span><span class="detail-value">${value}</span></div>`;

// ─── 1. Booking Received (to guest) ─────────────────────────────────────────
export const sendBookingReceived = async (booking, bankDetails) => {
  const body = `
    <h2>Your Reservation Request Has Been Received</h2>
    <p>Dear ${booking.guest_first_name},</p>
    <p>Thank you for choosing Fairmont Ch&acirc;teau Laurier. Your booking request has been received and is awaiting payment confirmation.</p>
    <p>Your reference number is:</p>
    <p class="ref">${booking.reference_number}</p>
    <div class="detail-card">
      ${detailRow("Room", booking.room_name)}
      ${detailRow("Check-in", new Date(booking.check_in).toDateString())}
      ${detailRow("Check-out", new Date(booking.check_out).toDateString())}
      ${detailRow("Nights", booking.nights)}
      ${detailRow("Guests", `${booking.adults} adult(s)${booking.children ? ", " + booking.children + " child(ren)" : ""}`)}
      ${detailRow("Total Amount", `CAD $${Number(booking.total_amount).toFixed(2)}`)}
    </div>
    <h2 style="margin-top:32px;">Payment Instructions</h2>
    <p>To confirm your reservation, please transfer the full amount to the bank account below. Include your reference number as the payment description.</p>
    <div class="detail-card">
      ${detailRow("Bank", bankDetails.bank_name)}
      ${detailRow("Account Name", bankDetails.bank_account_name)}
      ${detailRow("Account Number", bankDetails.bank_account_number)}
      ${detailRow("Routing Number", bankDetails.bank_routing_number)}
      ${detailRow("SWIFT Code", bankDetails.bank_swift)}
      ${detailRow("Reference", booking.reference_number)}
    </div>
    <p><strong>Note:</strong> ${bankDetails.bank_instructions}</p>
    <p>Once you have completed payment, please return to the site and click <strong>"I Have Paid"</strong> to upload your proof of payment. Your reservation will be confirmed within 24 hours of verification.</p>
    <p style="margin-top:32px;">Should you require any assistance, please contact our team at <a href="mailto:support@fifahotel.com" style="color:#C9A84C;">support@fifahotel.com</a>.</p>
  `;

  await sgMail.send({
    to: booking.guest_email,
    from: FROM,
    subject: `Reservation Request — ${booking.reference_number} | Fairmont Château Laurier`,
    html: emailLayout("Reservation Request Received", body),
  });
};

// ─── 2. Payment Receipt Uploaded — to guest ─────────────────────────────────
export const sendReceiptConfirmationToGuest = async (booking) => {
  const body = `
    <h2>Payment Proof Received</h2>
    <p>Dear ${booking.guest_first_name},</p>
    <p>We have received your proof of payment for booking reference <strong class="ref">${booking.reference_number}</strong>.</p>
    <p>Our team will verify your payment within <strong>24 hours</strong>. Once confirmed, you will receive a booking confirmation email with all details of your stay.</p>
    <div class="detail-card">
      ${detailRow("Reference", booking.reference_number)}
      ${detailRow("Room", booking.room_name)}
      ${detailRow("Check-in", new Date(booking.check_in).toDateString())}
      ${detailRow("Check-out", new Date(booking.check_out).toDateString())}
      ${detailRow("Status", "Pending Verification")}
    </div>
    <p>If you have any questions, please contact us at <a href="mailto:support@fifahotel.com" style="color:#C9A84C;">support@fifahotel.com</a> quoting your reference number.</p>
  `;

  await sgMail.send({
    to: booking.guest_email,
    from: FROM,
    subject: `Payment Proof Received — ${booking.reference_number} | Fairmont Château Laurier`,
    html: emailLayout("Payment Proof Received", body),
  });
};

// ─── 3. Payment Receipt Uploaded — to support team ──────────────────────────
export const sendReceiptNotificationToSupport = async (booking, receiptUrl) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const body = `
    <h2>New Payment Receipt — Action Required</h2>
    <p>A guest has uploaded proof of payment for the following booking. Please verify and confirm.</p>
    <div class="detail-card">
      ${detailRow("Reference", booking.reference_number)}
      ${detailRow("Guest", `${booking.guest_first_name} ${booking.guest_last_name}`)}
      ${detailRow("Email", booking.guest_email)}
      ${detailRow("Phone", booking.guest_phone)}
      ${detailRow("Room", booking.room_name)}
      ${detailRow("Check-in", new Date(booking.check_in).toDateString())}
      ${detailRow("Check-out", new Date(booking.check_out).toDateString())}
      ${detailRow("Total", `CAD $${Number(booking.total_amount).toFixed(2)}`)}
    </div>
    ${receiptUrl ? `<p><a href="${receiptUrl}" style="color:#C9A84C;">View Payment Receipt</a></p>` : ""}
    <a href="${frontendUrl}/admin/bookings" class="cta-btn">Review in Admin Dashboard</a>
  `;

  await sgMail.send({
    to: "support@fifahotel.com",
    from: FROM,
    subject: `[ACTION REQUIRED] Payment Receipt — ${booking.reference_number}`,
    html: emailLayout("Payment Receipt — Action Required", body),
  });
};

// ─── 4. Booking Confirmed (to guest) ─────────────────────────────────────────
export const sendBookingConfirmed = async (booking) => {
  const body = `
    <h2>Your Reservation Is Confirmed</h2>
    <p>Dear ${booking.guest_first_name},</p>
    <p>We are delighted to confirm your reservation at Fairmont Ch&acirc;teau Laurier. We look forward to welcoming you to Ottawa's most distinguished address.</p>
    <p class="ref">${booking.reference_number}</p>
    <div class="detail-card">
      ${detailRow("Room", booking.room_name)}
      ${detailRow("Check-in", new Date(booking.check_in).toDateString())}
      ${detailRow("Check-out", new Date(booking.check_out).toDateString())}
      ${detailRow("Nights", booking.nights)}
      ${detailRow("Guests", `${booking.adults} adult(s)${booking.children ? ", " + booking.children + " child(ren)" : ""}`)}
      ${detailRow("Total Paid", `CAD $${Number(booking.total_amount).toFixed(2)}`)}
    </div>
    <h2 style="margin-top:32px;">Before You Arrive</h2>
    <p><strong>Check-in:</strong> From 3:00 PM. Early check-in subject to availability.</p>
    <p><strong>Check-out:</strong> By 12:00 PM. Late checkout available upon request.</p>
    <p><strong>Identification:</strong> Please present a valid government-issued photo ID at check-in.</p>
    <p><strong>Valet Parking:</strong> Available at the hotel entrance. Kindly advise our concierge if you require parking.</p>
    <p>We are here to ensure every aspect of your stay is extraordinary. Please do not hesitate to reach out to us at <a href="mailto:support@fifahotel.com" style="color:#C9A84C;">support@fifahotel.com</a>.</p>
  `;

  await sgMail.send({
    to: booking.guest_email,
    from: FROM,
    subject: `Reservation Confirmed — ${booking.reference_number} | Fairmont Château Laurier`,
    html: emailLayout("Reservation Confirmed", body),
  });
};

// ─── 5. Booking Cancelled (to guest) ─────────────────────────────────────────
export const sendBookingCancelled = async (booking) => {
  const body = `
    <h2>Reservation Cancellation Confirmed</h2>
    <p>Dear ${booking.guest_first_name},</p>
    <p>Your reservation with reference <strong>${booking.reference_number}</strong> has been cancelled as requested.</p>
    <div class="detail-card">
      ${detailRow("Reference", booking.reference_number)}
      ${detailRow("Room", booking.room_name)}
      ${detailRow("Original Check-in", new Date(booking.check_in).toDateString())}
    </div>
    <p>If a refund is applicable under our cancellation policy, it will be processed within 7–10 business days. Please review our <a href="https://fifahotel.com/cancellation-policy" style="color:#C9A84C;">Cancellation Policy</a> for details.</p>
    <p>We hope to welcome you to Fairmont Ch&acirc;teau Laurier on a future occasion.</p>
  `;

  await sgMail.send({
    to: booking.guest_email,
    from: FROM,
    subject: `Reservation Cancelled — ${booking.reference_number} | Fairmont Château Laurier`,
    html: emailLayout("Reservation Cancelled", body),
  });
};

// ─── 6. Welcome / Registration ───────────────────────────────────────────────
export const sendWelcomeEmail = async (user) => {
  const body = `
    <h2>Welcome to Fairmont Ch&acirc;teau Laurier</h2>
    <p>Dear ${user.first_name},</p>
    <p>Thank you for creating an account with us. You now have access to our full suite of online reservation services, your personal booking history, and our loyalty programme.</p>
    <h2 style="margin-top:24px;">Fairmont Loyalty Programme</h2>
    <p>As a member, you earn points on every eligible stay. Points may be redeemed for complimentary nights, dining credits, and exclusive experiences.</p>
    <ul style="color:#2D2D2D;font-size:15px;line-height:2;">
      <li>Silver: Entry level — earn 1 point per CAD $1 spent</li>
      <li>Gold: 10 stays or 30 nights per year — earn 1.5 points per CAD $1</li>
      <li>Platinum: 25 stays or 75 nights per year — earn 2 points per CAD $1</li>
    </ul>
    <p>We look forward to welcoming you to Ottawa's most celebrated address.</p>
  `;

  await sgMail.send({
    to: user.email,
    from: FROM,
    subject: `Welcome to Fairmont Château Laurier`,
    html: emailLayout("Welcome", body),
  });
};

// ─── 7. Password Reset ───────────────────────────────────────────────────────
export const sendPasswordReset = async (user, resetLink) => {
  const body = `
    <h2>Password Reset Request</h2>
    <p>Dear ${user.first_name},</p>
    <p>We received a request to reset the password for your account. Click the button below to set a new password. This link will expire in 1 hour.</p>
    <a href="${resetLink}" class="cta-btn">Reset My Password</a>
    <p style="margin-top:24px;font-size:13px;color:#6B6B6B;">If you did not request a password reset, please disregard this email. Your account remains secure.</p>
  `;

  await sgMail.send({
    to: user.email,
    from: FROM,
    subject: `Password Reset — Fairmont Château Laurier`,
    html: emailLayout("Password Reset", body),
  });
};

// ─── 8. Newsletter Welcome ────────────────────────────────────────────────────
export const sendNewsletterWelcome = async (email) => {
  const body = `
    <h2>Thank You for Subscribing</h2>
    <p>You are now subscribed to news and exclusive offers from Fairmont Ch&acirc;teau Laurier.</p>
    <p>As a subscriber, you will be among the first to receive:</p>
    <ul style="color:#2D2D2D;font-size:15px;line-height:2;">
      <li>Seasonal offers and exclusive packages</li>
      <li>Invitations to private events and galas</li>
      <li>Travel inspiration and Ottawa guides</li>
      <li>Early access to new dining and spa experiences</li>
    </ul>
    <p>We look forward to sharing the finest that Ottawa has to offer.</p>
  `;

  await sgMail.send({
    to: email,
    from: FROM,
    subject: `Welcome to the Fairmont Château Laurier Newsletter`,
    html: emailLayout("Newsletter Welcome", body),
  });
};
