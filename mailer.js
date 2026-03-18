import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export async function sendLeadNotification(lead) {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    console.log("[mailer] Skipping email — MAIL_USER or MAIL_PASS not set");
    return;
  }

  await transporter.sendMail({
    from:    `"SynthMed" <${process.env.MAIL_USER}>`,
    to:      process.env.MAIL_USER,
    subject: `New lead #${lead.id} — ${lead.organization}`,
    html: `
      <h2>New sample request received</h2>
      <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse;">
        <tr><td style="padding:6px 16px 6px 0;color:#666;">Name</td><td><strong>${lead.name}</strong></td></tr>
        <tr><td style="padding:6px 16px 6px 0;color:#666;">Email</td><td>${lead.email}</td></tr>
        <tr><td style="padding:6px 16px 6px 0;color:#666;">Organization</td><td>${lead.organization}</td></tr>
        <tr><td style="padding:6px 16px 6px 0;color:#666;">Role</td><td>${lead.role || "—"}</td></tr>
        <tr><td style="padding:6px 16px 6px 0;color:#666;">Message</td><td>${lead.message || "—"}</td></tr>
        <tr><td style="padding:6px 16px 6px 0;color:#666;">Submitted</td><td>${lead.created_at}</td></tr>
      </table>
      <p style="margin-top:24px;font-size:13px;color:#999;">Lead ID: #${lead.id}</p>
    `,
  });

  await transporter.sendMail({
    from:    `"SynthMed" <${process.env.MAIL_USER}>`,
    to:      lead.email,
    subject: "Your SynthMed sample request — received",
    html: `
      <div style="font-family:sans-serif;max-width:520px;">
        <h2 style="color:#0a7ea4;">Thanks, ${lead.name.split(" ")[0]}.</h2>
        <p style="font-size:15px;color:#333;line-height:1.7;">
          We've received your request for a free synthetic patient dataset
          from <strong>${lead.organization}</strong>.
        </p>
        <p style="font-size:15px;color:#333;line-height:1.7;">
          We'll send your 1,000-record sample to this address within
          <strong>24 hours</strong> on business days.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="font-size:13px;color:#999;">
          Questions? Reply to this email or contact hello@synthmed.ca
        </p>
      </div>
    `,
  });

  console.log(`[mailer] Notifications sent for lead #${lead.id}`);
}