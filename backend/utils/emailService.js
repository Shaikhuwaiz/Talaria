import { Resend } from "resend";
import dotenv from "dotenv";
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendLoginEmail = async (email, timezone) => {
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
