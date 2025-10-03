const generateTutorApprovalEmail = (tutorName = "Tutor", reason = "") => {
  const currentYear = new Date().getFullYear();
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #ddd; background-color: #fff; color: #333;">
      
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #28a745; margin: 0;">🎉 Congratulations!</h1>
        <p style="font-size: 14px; color: #777;">TutorBy - A project by Laskon</p>
      </div>

      <!-- Greeting -->
      <div>
        <h2 style="color: #333;">Hello ${tutorName},</h2>
        <p style="font-size: 16px; line-height: 1.5;">
          We are thrilled to inform you that your tutor application has been <strong style="color: #28a745;">APPROVED</strong>!
        </p>

        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #155724; margin: 0 0 10px 0;">✅ Application Status: APPROVED</h3>
          <p style="color: #155724; margin: 0; font-size: 14px;">
            Your profile is now live and students can book sessions with you.
          </p>
        </div>

        ${reason ? `
        <div style="background-color: #f8f9fa; border-left: 4px solid #007BFF; padding: 15px; margin: 20px 0;">
          <h4 style="color: #333; margin: 0 0 10px 0;">Admin Notes:</h4>
          <p style="color: #666; margin: 0; font-style: italic;">"${reason}"</p>
        </div>
        ` : ''}

        <div style="background-color: #e7f3ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #0066cc; margin: 0 0 15px 0;">🚀 What's Next?</h3>
          <ul style="color: #333; margin: 0; padding-left: 20px;">
            <li>Your profile is now visible to students</li>
            <li>Students can book sessions with you</li>
            <li>You can start earning by sharing your knowledge</li>
            <li>Access your tutor dashboard to manage sessions</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${frontendUrl}/login" style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Access Your Dashboard
          </a>
        </div>

        <p style="font-size: 14px; color: #555; line-height: 1.5;">
          Thank you for choosing TutorBy as your teaching platform. We're excited to have you as part of our community of educators!
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

const generateTutorRejectionEmail = (tutorName = "Tutor", reason = "") => {
  const currentYear = new Date().getFullYear();
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #ddd; background-color: #fff; color: #333;">
      
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #dc3545; margin: 0;">Application Update</h1>
        <p style="font-size: 14px; color: #777;">TutorBy - A project by Laskon</p>
      </div>

      <!-- Greeting -->
      <div>
        <h2 style="color: #333;">Hello ${tutorName},</h2>
        <p style="font-size: 16px; line-height: 1.5;">
          We regret to inform you that your tutor application has been <strong style="color: #dc3545;">REJECTED</strong>.
        </p>

        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #721c24; margin: 0 0 10px 0;">❌ Application Status: REJECTED</h3>
          <p style="color: #721c24; margin: 0; font-size: 14px;">
            Unfortunately, your application does not meet our current requirements.
          </p>
        </div>

        ${reason ? `
        <div style="background-color: #f8f9fa; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0;">
          <h4 style="color: #333; margin: 0 0 10px 0;">Reason for Rejection:</h4>
          <p style="color: #666; margin: 0; font-style: italic;">"${reason}"</p>
        </div>
        ` : ''}

        <div style="background-color: #fff3cd; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #856404; margin: 0 0 15px 0;">💡 What You Can Do:</h3>
          <ul style="color: #333; margin: 0; padding-left: 20px;">
            <li>Review the feedback provided above</li>
            <li>Address any issues mentioned in the reason</li>
            <li>You can reapply after making necessary improvements</li>
            <li>Contact our support team if you have questions</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${frontendUrl}/contact" style="background-color: #007BFF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Contact Support
          </a>
        </div>

        <p style="font-size: 14px; color: #555; line-height: 1.5;">
          We appreciate your interest in joining TutorBy. We encourage you to reapply once you have addressed the concerns mentioned above.
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

const generateTutorPartialApprovalEmail = (tutorName = "Tutor", reason = "") => {
  const currentYear = new Date().getFullYear();
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #ddd; background-color: #fff; color: #333;">
      
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #ffc107; margin: 0;">🎯 Conditional Approval</h1>
        <p style="font-size: 14px; color: #777;">TutorBy - A project by Laskon</p>
      </div>

      <!-- Greeting -->
      <div>
        <h2 style="color: #333;">Hello ${tutorName},</h2>
        <p style="font-size: 16px; line-height: 1.5;">
          Your tutor application has been <strong style="color: #ffc107;">PARTIALLY APPROVED</strong> with some conditions.
        </p>

        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #856404; margin: 0 0 10px 0;">⚠️ Application Status: PARTIALLY APPROVED</h3>
          <p style="color: #856404; margin: 0; font-size: 14px;">
            You can start tutoring, but please address the conditions mentioned below.
          </p>
        </div>

        ${reason ? `
        <div style="background-color: #f8f9fa; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
          <h4 style="color: #333; margin: 0 0 10px 0;">Conditions to Address:</h4>
          <p style="color: #666; margin: 0; font-style: italic;">"${reason}"</p>
        </div>
        ` : ''}

        <div style="background-color: #e7f3ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #0066cc; margin: 0 0 15px 0;">✅ What You Can Do Now:</h3>
          <ul style="color: #333; margin: 0; padding-left: 20px;">
            <li>Your profile is live and students can book sessions</li>
            <li>You can start earning by teaching</li>
            <li>Access your tutor dashboard to manage sessions</li>
            <li>Work on addressing the conditions mentioned above</li>
          </ul>
        </div>

        <div style="background-color: #fff3cd; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #856404; margin: 0 0 15px 0;">📋 Important Notes:</h3>
          <ul style="color: #333; margin: 0; padding-left: 20px;">
            <li>Please address the conditions as soon as possible</li>
            <li>Your account status will be reviewed again</li>
            <li>Failure to meet conditions may result in account suspension</li>
            <li>Contact support if you need clarification</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${frontendUrl}/login" style="background-color: #ffc107; color: #333; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Access Your Dashboard
          </a>
        </div>

        <p style="font-size: 14px; color: #555; line-height: 1.5;">
          We're excited to have you as part of our teaching community. Please ensure you meet all the conditions to maintain your account status.
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

module.exports = {
  generateTutorApprovalEmail,
  generateTutorRejectionEmail,
  generateTutorPartialApprovalEmail
};
