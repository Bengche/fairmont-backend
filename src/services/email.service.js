import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";
dotenv.config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM = {
  email: process.env.FROM_EMAIL || "support@fifahotel.com",
  name: "Moxy NYC Times Square",
};

// ─── Table-based email layout — works in all clients including Gmail/Outlook ─
const emailLayout = (title, bodyContent) => `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    /* Reset */
    body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
    body { margin:0; padding:0; background-color:#FAF8F2; font-family:Georgia,'Times New Roman',serif; }
    a { color:#C9A84C; }
    /* Mobile */
    @media only screen and (max-width:620px) {
      .email-wrapper { width:100% !important; }
      .email-body { padding:28px 20px !important; }
      .email-header { padding:28px 20px !important; }
      .email-footer { padding:20px 20px !important; }
      .detail-table { width:100% !important; }
      .detail-label-cell { width:45% !important; font-size:12px !important; }
      .detail-value-cell { font-size:13px !important; }
      .cta-btn-cell { padding:28px 0 !important; }
      .ref-text { font-size:20px !important; }
      .h2-text { font-size:20px !important; }
      .body-text { font-size:14px !important; }
      .amount-text { font-size:26px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#FAF8F2;">
  <!-- Outer wrapper -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#FAF8F2;">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <!-- Card -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="email-wrapper" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:2px;box-shadow:0 2px 20px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td class="email-header" style="background-color:#1C1C1C;padding:36px 44px;text-align:center;border-radius:2px 2px 0 0;">
              <p style="margin:0;font-family:Georgia,serif;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#C9A84C;font-weight:400;">Moxy NYC</p>
              <h1 style="margin:8px 0 0;font-family:Georgia,serif;font-size:24px;font-weight:400;letter-spacing:0.1em;color:#FFFFFF;line-height:1.2;">Times Square</h1>
              <p style="margin:10px 0 0;font-size:11px;letter-spacing:0.12em;color:rgba(255,255,255,0.4);font-family:Arial,sans-serif;text-transform:uppercase;">New York &nbsp;&bull;&nbsp; United States</p>
            </td>
          </tr>

          <!-- Gold line -->
          <tr><td style="height:3px;background-color:#C9A84C;font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Body -->
          <tr>
            <td class="email-body" style="padding:44px 44px 36px;background:#FFFFFF;">
              ${bodyContent}
            </td>
          </tr>

          <!-- Gold line -->
          <tr><td style="height:2px;background-color:#C9A84C;font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Footer -->
          <tr>
            <td class="email-footer" style="background-color:#1C1C1C;padding:28px 44px;text-align:center;border-radius:0 0 2px 2px;">
              <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.5);letter-spacing:0.04em;">485 7th Ave, New York, NY 10018, United States</p>
              <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.5);">
                <a href="mailto:support@fifahotel.com" style="color:#C9A84C;text-decoration:none;">support@fifahotel.com</a>
              </p>
              <p style="margin:16px 0 0;font-family:Arial,sans-serif;font-size:11px;color:rgba(255,255,255,0.3);">&copy; ${new Date().getFullYear()} Moxy NYC Times Square. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ─── Reusable helpers ────────────────────────────────────────────────────────

const detailRow = (label, value) => `
<tr>
  <td class="detail-label-cell" style="padding:11px 14px 11px 0;font-family:Arial,sans-serif;font-size:12px;color:#8A7E6A;vertical-align:top;border-bottom:1px solid #EDE9E0;width:40%;">${label}</td>
  <td class="detail-value-cell" style="padding:11px 0 11px 14px;font-family:Arial,sans-serif;font-size:13px;color:#1C1C1C;font-weight:600;vertical-align:top;border-bottom:1px solid #EDE9E0;">${value}</td>
</tr>`;

const detailCard = (rows) => `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" class="detail-table" style="background:#FAF8F2;border:1px solid #E8E4DC;border-radius:2px;margin:24px 0;">
  <tr><td style="padding:0 20px;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      ${rows}
    </table>
  </td></tr>
</table>`;

const ctaButton = (href, label) => `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td class="cta-btn-cell" align="center" style="padding:32px 0;">
      <a href="${href}" style="display:inline-block;background:#C9A84C;color:#1C1C1C;text-decoration:none;padding:16px 40px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;border-radius:1px;">${label}</a>
    </td>
  </tr>
</table>`;

const h2 = (text, marginTop = "0") =>
  `<h2 class="h2-text" style="margin:${marginTop} 0 12px;font-family:Georgia,serif;font-size:22px;font-weight:400;color:#1C1C1C;letter-spacing:0.03em;line-height:1.3;">${text}</h2>`;

const para = (text, extraStyle = "") =>
  `<p class="body-text" style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:14px;color:#3A3530;line-height:1.85;${extraStyle}">${text}</p>`;

const divider = () =>
  `<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td style="height:1px;background:#EDE9E0;font-size:0;line-height:0;margin:8px 0;">&nbsp;</td></tr></table>`;

const refBadge = (ref) => `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td align="center" style="padding:20px 0 28px;">
      <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#8A7E6A;">Booking Reference</p>
      <p class="ref-text" style="margin:0;font-family:Georgia,serif;font-size:26px;font-weight:700;letter-spacing:0.12em;color:#C9A84C;">${ref}</p>
    </td>
  </tr>
</table>`;

// ─── 1. Booking Received (to guest) ─────────────────────────────────────────
export const sendBookingReceived = async (booking, bankDetails) => {
  const body = `
    ${h2("Your Reservation Request Has Been Received")}
    ${para(`Dear ${booking.guest_first_name},`)}
    ${para("Thank you for choosing Moxy NYC Times Square. Your booking request has been received and is awaiting payment confirmation.")}
    ${refBadge(booking.reference_number)}
    ${detailCard(
      detailRow("Room", booking.room_name) +
        detailRow("Check-in", new Date(booking.check_in).toDateString()) +
        detailRow("Check-out", new Date(booking.check_out).toDateString()) +
        detailRow("Nights", booking.nights) +
        detailRow(
          "Guests",
          `${booking.adults} adult(s)${booking.children ? ", " + booking.children + " child(ren)" : ""}`,
        ) +
        detailRow(
          "Total Amount",
          `USD $${Number(booking.total_amount).toFixed(2)}`,
        ),
    )}
    ${divider()}
    ${h2("Payment Instructions", "28px")}
    ${para("To confirm your reservation, please transfer the full amount to the bank account below. Include your reference number as the payment description.")}
    ${detailCard(
      detailRow("Bank", bankDetails.bank_name) +
        detailRow("Account Name", bankDetails.bank_account_name) +
        detailRow("Account Number", bankDetails.bank_account_number) +
        detailRow("Routing Number", bankDetails.bank_routing_number) +
        detailRow("SWIFT Code", bankDetails.bank_swift) +
        detailRow(
          "Payment Reference",
          `<span style="color:#C9A84C;font-weight:700;">${booking.reference_number}</span>`,
        ),
    )}
    ${para(`<strong>Note:</strong> ${bankDetails.bank_instructions}`)}
    ${para('Once payment is complete, click <strong>"I Have Paid"</strong> on the booking site to upload your proof of payment. Your reservation will be confirmed within 24 hours.')}
    ${para("Should you need assistance, contact us at <a href='mailto:support@fifahotel.com' style='color:#C9A84C;text-decoration:none;'>support@fifahotel.com</a>.", "margin-top:20px;")}
  `;

  await sgMail.send({
    to: booking.guest_email,
    from: FROM,
    subject: `Reservation Request — ${booking.reference_number} | Moxy NYC Times Square`,
    html: emailLayout("Reservation Request Received", body),
  });
};

// ─── 2. Payment Receipt Uploaded — to guest ─────────────────────────────────
export const sendReceiptConfirmationToGuest = async (booking) => {
  const body = `
    ${h2("Payment Proof Received")}
    ${para(`Dear ${booking.guest_first_name},`)}
    ${para(`We have received your proof of payment for booking reference <strong style="color:#C9A84C;">${booking.reference_number}</strong>.`)}
    ${para("Our team will verify your payment within <strong>24 hours</strong>. Once confirmed, you will receive a booking confirmation email with all details of your stay.")}
    ${detailCard(
      detailRow("Reference", booking.reference_number) +
        detailRow("Room", booking.room_name) +
        detailRow("Check-in", new Date(booking.check_in).toDateString()) +
        detailRow("Check-out", new Date(booking.check_out).toDateString()) +
        detailRow(
          "Status",
          '<span style="color:#B8860B;font-weight:700;">Pending Verification</span>',
        ),
    )}
    ${para("If you have any questions, please contact us at <a href='mailto:support@fifahotel.com' style='color:#C9A84C;text-decoration:none;'>support@fifahotel.com</a> quoting your reference number.")}
  `;

  await sgMail.send({
    to: booking.guest_email,
    from: FROM,
    subject: `Payment Proof Received — ${booking.reference_number} | Moxy NYC Times Square`,
    html: emailLayout("Payment Proof Received", body),
  });
};

// ─── 3. Payment Receipt Uploaded — to support team ──────────────────────────
export const sendReceiptNotificationToSupport = async (booking, receiptUrl) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const body = `
    ${h2("New Payment Receipt — Action Required")}
    ${para("A guest has uploaded proof of payment for the following booking. Please verify and confirm.")}
    ${detailCard(
      detailRow("Reference", booking.reference_number) +
        detailRow(
          "Guest",
          `${booking.guest_first_name} ${booking.guest_last_name}`,
        ) +
        detailRow("Email", booking.guest_email) +
        detailRow("Phone", booking.guest_phone) +
        detailRow("Room", booking.room_name) +
        detailRow("Check-in", new Date(booking.check_in).toDateString()) +
        detailRow("Check-out", new Date(booking.check_out).toDateString()) +
        detailRow("Total", `USD $${Number(booking.total_amount).toFixed(2)}`),
    )}
    ${receiptUrl ? para(`<a href="${receiptUrl}" style="color:#C9A84C;">View uploaded payment receipt &rarr;</a>`) : ""}
    ${ctaButton(`${frontendUrl}/admin/bookings`, "Review in Admin Dashboard")}
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
    ${h2("Your Reservation Is Confirmed")}
    ${para(`Dear ${booking.guest_first_name},`)}
    ${para("We are delighted to confirm your reservation at Moxy NYC Times Square. We look forward to welcoming you to New York City's most vibrant address.")}
    ${refBadge(booking.reference_number)}
    ${detailCard(
      detailRow("Room", booking.room_name) +
        detailRow("Check-in", new Date(booking.check_in).toDateString()) +
        detailRow("Check-out", new Date(booking.check_out).toDateString()) +
        detailRow("Nights", booking.nights) +
        detailRow(
          "Guests",
          `${booking.adults} adult(s)${booking.children ? ", " + booking.children + " child(ren)" : ""}`,
        ) +
        detailRow(
          "Total Paid",
          `USD $${Number(booking.total_amount).toFixed(2)}`,
        ),
    )}
    ${divider()}
    ${h2("Before You Arrive", "28px")}
    ${para("<strong>Check-in:</strong> From 3:00 PM. Early check-in subject to availability.")}
    ${para("<strong>Check-out:</strong> By 12:00 PM. Late checkout available upon request.")}
    ${para("<strong>Identification:</strong> Please present a valid government-issued photo ID at check-in.")}
    ${para("<strong>Valet Parking:</strong> Available at the hotel entrance. Kindly advise our concierge if you require parking.")}
    ${para("We are here to ensure every aspect of your stay is extraordinary. Please do not hesitate to reach out at <a href='mailto:support@fifahotel.com' style='color:#C9A84C;text-decoration:none;'>support@fifahotel.com</a>.", "margin-top:20px;")}
  `;

  await sgMail.send({
    to: booking.guest_email,
    from: FROM,
    subject: `Reservation Confirmed — ${booking.reference_number} | Moxy NYC Times Square`,
    html: emailLayout("Reservation Confirmed", body),
  });
};

// ─── 5. Booking Cancelled (to guest) ─────────────────────────────────────────
export const sendBookingCancelled = async (booking) => {
  const body = `
    ${h2("Reservation Cancellation Confirmed")}
    ${para(`Dear ${booking.guest_first_name},`)}
    ${para(`Your reservation with reference <strong>${booking.reference_number}</strong> has been cancelled as requested.`)}
    ${detailCard(
      detailRow("Reference", booking.reference_number) +
        detailRow("Room", booking.room_name) +
        detailRow(
          "Original Check-in",
          new Date(booking.check_in).toDateString(),
        ),
    )}
    ${para("If a refund is applicable under our cancellation policy, it will be processed within 7–10 business days. Please review our <a href='https://fifahotel.com/cancellation-policy' style='color:#C9A84C;text-decoration:none;'>Cancellation Policy</a> for details.")}
    ${para("We hope to welcome you to Moxy NYC Times Square on a future occasion.")}
  `;

  await sgMail.send({
    to: booking.guest_email,
    from: FROM,
    subject: `Reservation Cancelled — ${booking.reference_number} | Moxy NYC Times Square`,
    html: emailLayout("Reservation Cancelled", body),
  });
};

// ─── 6. Welcome / Registration ───────────────────────────────────────────────
export const sendWelcomeEmail = async (user) => {
  const body = `
    ${h2("Welcome to Moxy NYC Times Square")}
    ${para(`Dear ${user.first_name},`)}
    ${para("Thank you for creating an account with us. You now have access to our full suite of online reservation services, your personal booking history, and our loyalty programme.")}
    ${divider()}
    ${h2("Moxy Rewards Programme", "24px")}
    ${para("As a member, you earn points on every eligible stay. Points may be redeemed for complimentary nights, dining credits, and exclusive experiences.")}
    ${detailCard(
      detailRow("Select", "Entry level — earn 1 point per USD $1 spent") +
        detailRow(
          "Silver",
          "10 stays or 30 nights per year — earn 1.5 pts / $1",
        ) +
        detailRow(
          "Gold",
          "25 stays or 75 nights per year — earn 2 pts / $1",
        ),
    )}
    ${para("We look forward to welcoming you to New York's most vibrant address.")}
  `;

  await sgMail.send({
    to: user.email,
    from: FROM,
    subject: `Welcome to Moxy NYC Times Square`,
    html: emailLayout("Welcome", body),
  });
};

// ─── 7. Password Reset ───────────────────────────────────────────────────────
export const sendPasswordReset = async (user, resetLink) => {
  const body = `
    ${h2("Password Reset Request")}
    ${para(`Dear ${user.first_name},`)}
    ${para("We received a request to reset the password for your account. Click the button below to set a new password. This link will expire in <strong>1 hour</strong>.")}
    ${ctaButton(resetLink, "Reset My Password")}
    ${para("If you did not request a password reset, please disregard this email. Your account remains secure.", "font-size:12px;color:#8A7E6A;margin-top:0;")}
  `;

  await sgMail.send({
    to: user.email,
    from: FROM,
    subject: `Password Reset — Moxy NYC Times Square`,
    html: emailLayout("Password Reset", body),
  });
};

// ─── 8. Newsletter Welcome ────────────────────────────────────────────────────
export const sendNewsletterWelcome = async (email) => {
  const body = `
    ${h2("Thank You for Subscribing")}
    ${para("You are now subscribed to news and exclusive offers from Moxy NYC Times Square.")}
    ${para("As a subscriber, you will be among the first to receive:")}
    ${detailCard(
      detailRow("&#9670;", "Seasonal offers and exclusive packages") +
        detailRow("&#9670;", "Invitations to private events and galas") +
        detailRow("&#9670;", "Travel inspiration and New York City guides") +
        detailRow("&#9670;", "Early access to new dining and spa experiences"),
    )}
    ${para("We look forward to sharing the finest that New York City has to offer.")}
  `;

  await sgMail.send({
    to: email,
    from: FROM,
    subject: `Welcome to the Moxy NYC Times Square Newsletter`,
    html: emailLayout("Newsletter Welcome", body),
  });
};
