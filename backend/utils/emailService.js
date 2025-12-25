import { Resend } from "resend";
import dotenv from "dotenv";
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendLoginEmail = async (email, timezone, otp) => {
  try {
    timezone = timezone || "Asia/Kolkata";

    
    const loginTime = new Date().toLocaleString("en-US", {
      timeZone: timezone,
      hour12: true,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    const htmlContent = `
      <table width="100%" style="border-collapse: collapse;">
        <tr>
          <td align="center">
            <table style="border-collapse: collapse; text-align: center;">
              <tr>
                <td style="font-size: 28px; font-weight: bold;">
                  Welcome to Talaria
                </td>
                <td>
                  <img src="https://raw.githubusercontent.com/Shaikhuwaiz/talaria-assets/main/logo.png" 
                       width="26" />
                </td>
              </tr>
            </table>

            <p style="font-size: 16px; color: #333;">
              You logged in successfully on <strong>${loginTime}</strong>.
            </p>

            <p style="font-size: 14px; color: #777;">
              If this was not you, please reset your password immediately.
            </p>
          </td>
        </tr>
      </table>
    `;

    await resend.emails.send({
      from: "Talaria <noreply@talaria.co.in>",
      to: email,
      subject: "Login Successful – Talaria Dashboard",
      html: htmlContent
    });

  } catch (err) {
    console.error("RESEND ERROR:", err);
  }
};

export const sendOtpEmail = async (email, otp) => {
  try {
    const htmlContent = `
      <table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif;">
        <tr>
          <td align="center" style="padding: 20px;">
            <!-- Header -->
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align: middle;">
                  <img 
                    src="https://raw.githubusercontent.com/Shaikhuwaiz/talaria-assets/main/logo.png"
                    width="28"
                    alt="Talaria"
                    style="display: block;"
                  />
                </td>
                <td style="padding-left: 8px; font-size: 22px; font-weight: bold;">
                  Talaria Password Reset
                </td>
              </tr>
            </table>

            <!-- Body -->
            <p style="margin-top: 20px; font-size: 16px;">
              Your OTP is:
            </p>

            <div style="
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 6px;
              margin: 10px 0;
            ">
              ${otp}
            </div>

            <p style="font-size: 14px; color: #555;">
              Valid for 5 minutes.
            </p>

            <p style="font-size: 12px; color: #888; margin-top: 20px;">
              If you did not request this, you can safely ignore this email.
            </p>
          </td>
        </tr>
      </table>
    `;

    await resend.emails.send({
      from: "Talaria <noreply@talaria.co.in>",
      to: email,
      subject: "Password Reset OTP – Talaria",
      html: htmlContent
    });
  } catch (err) {
    console.error("OTP EMAIL ERROR:", err);
  }
};
export const sendPasswordResetSuccessEmail = async (email) => {
  try {
    const htmlContent = `
      <table width="100%" cellpadding="0" cellspacing="0"
             style="font-family: Arial, sans-serif;">
        <tr>
          <td align="center" style="padding: 20px;">
            <h2 style="margin-bottom: 10px;">
              Password Changed Successfully
            </h2>

            <p style="font-size: 15px; color: #333;">
              Your Talaria account password was updated successfully.
            </p>

            <p style="font-size: 13px; color: #666;">
              If you did not perform this action, please reset your password immediately.
            </p>
          </td>
        </tr>
      </table>
    `;

    await resend.emails.send({
      from: "Talaria <noreply@talaria.co.in>",
      to: email,
      subject: "Your Talaria password was changed",
      html: htmlContent
    });
  } catch (err) {
    console.error("RESET SUCCESS EMAIL ERROR:", err);
  }
};