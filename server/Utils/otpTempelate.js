const generateOtpEmail = (otp, userName = "User") => {
  const currentYear = new Date().getFullYear();

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #ddd; background-color: #fff; color: #333;">
      
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #007BFF; margin: 0;">Tutor</h1>
        <p style="font-size: 14px; color: #777;">A project by Laskon</p>
      </div>

      <!-- Greeting -->
      <div>
        <h2 style="color: #333;">Hello ${userName},</h2>
        <p style="font-size: 16px; line-height: 1.5;">
          Please use the following One-Time Password (OTP) to complete your secure login:
        </p>

        <div style="font-size: 30px; font-weight: bold; color: #007BFF; margin: 30px 0; text-align: center;">
          ${otp}
        </div>

        <p style="font-size: 14px; color: #555;">
          This OTP is valid for <strong>15 seconds</strong>. For your security, do not share this code with anyone.
        </p>
      </div>

      <!-- Info Note -->
      <div style="margin-top: 30px;">
        <p style="font-size: 13px; color: #999;">
          If you did not request this login, please ignore this email.
        </p>
      </div>

      <!-- Footer -->
      <div style="margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; text-align: center; font-size: 12px; color: #aaa;">
        <p>© ${currentYear} TUTERBY – A Project by Laskon. All rights reserved.</p>
        <p>This is an automated email. Please do not reply.</p>
      </div>
    </div>
  `;
};

module.exports = generateOtpEmail;
