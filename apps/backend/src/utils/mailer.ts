import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL || '',
    pass: process.env.SMTP_PASSWORD || ''
  }
});

export const sendResetPasswordEmail = async (to: string, resetToken: string, companyEmail: string) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetLink = `${frontendUrl}/?resetToken=${resetToken}`;

  const mailOptions = {
    from: `"FanE System" <${process.env.SMTP_EMAIL}>`,
    to,
    subject: '[FanE] Khôi phục mật khẩu của bạn',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1a1a1f; color: #ffffff; padding: 20px; border-radius: 8px;">
        <h2 style="color: #9d4edd; text-align: center;">FanE Traffic Management</h2>
        <p style="font-size: 16px; color: #e0e0e0;">Chào bạn,</p>
        <p style="font-size: 16px; color: #e0e0e0;">Chúng tôi nhận được yêu cầu khôi phục mật khẩu cho tài khoản có email công ty là: <b style="color: #ffffff;">${companyEmail}</b>.</p>
        <p style="font-size: 16px; color: #e0e0e0;">Vui lòng click vào nút bên dưới để đặt lại mật khẩu mới:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #9d4edd; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Đặt lại mật khẩu</a>
        </div>
        <p style="font-size: 14px; color: #a0a0a0; margin-top: 20px;">Hoặc copy và dán đường link sau vào trình duyệt của bạn:</p>
        <p style="font-size: 14px; color: #818cf8; word-break: break-all;">
          <a href="${resetLink}" style="color: #818cf8;">${resetLink}</a>
        </p>
        <hr style="border: 0; border-top: 1px solid #333; margin: 30px 0;" />
        <p style="font-size: 12px; color: #888;">Lưu ý: Đường link này chỉ có hiệu lực trong vòng 15 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
        <p style="font-size: 12px; color: #888;">Trân trọng,<br>Đội ngũ hỗ trợ FanE</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Email Sent] Reset link sent to ${to}`);
  } catch (error) {
    console.error('[Email Error] Failed to send email:', error);
    throw error;
  }
};
