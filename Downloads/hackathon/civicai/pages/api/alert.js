import sgMail from '@sendgrid/mail'
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { complaint } = req.body
  if (!complaint) return res.status(400).json({ error: 'No complaint data' })

  const msg = {
    to: process.env.ALERT_EMAIL,
    from: 'citizencare-alerts@yourdomain.com',
    subject: `[CRITICAL] Complaint Alert — ${complaint.department} Department`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#DC2626;color:white;padding:20px;border-radius:8px 8px 0 0;">
          <h1 style="margin:0;font-size:20px;">🔴 Critical Complaint Alert</h1>
          <p style="margin:4px 0 0;opacity:.9;font-size:14px;">CitizenCare Automated Alert</p>
        </div>
        <div style="background:#fff;border:1px solid #E5E7EB;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr style="border-bottom:1px solid #F3F4F6;">
              <td style="padding:10px 0;color:#6B7280;width:160px;">Complaint ID</td>
              <td style="padding:10px 0;font-family:monospace;">${complaint.id}</td>
            </tr>
            <tr style="border-bottom:1px solid #F3F4F6;">
              <td style="padding:10px 0;color:#6B7280;">Department</td>
              <td style="padding:10px 0;font-weight:bold;">${complaint.department}</td>
            </tr>
            <tr style="border-bottom:1px solid #F3F4F6;">
              <td style="padding:10px 0;color:#6B7280;">Location</td>
              <td style="padding:10px 0;">${complaint.location || 'Not specified'}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#6B7280;">ETA</td>
              <td style="padding:10px 0;">${complaint.estimated_resolution}</td>
            </tr>
          </table>
          <div style="background:#FEF3C7;border-left:4px solid #F59E0B;padding:16px;margin:20px 0;border-radius:0 8px 8px 0;">
            <p style="margin:0;color:#78350F;font-size:14px;">${complaint.summary}</p>
          </div>
          <ul style="margin:0;padding-left:20px;color:#374151;font-size:14px;line-height:2;">
            ${(complaint.action_items||[]).map(a=>`<li>${a}</li>`).join('')}
          </ul>
          <p style="margin-top:24px;font-size:12px;color:#9CA3AF;">
            Logged at ${new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST
          </p>
        </div>
      </div>`
  }
  try {
    await sgMail.send(msg)
    res.status(200).json({ sent: true })
  } catch (err) {
    res.status(500).json({ error: 'Alert failed', detail: err.message })
  }
}
