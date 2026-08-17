import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuditService } from '../services/auditService';
import { sendResetPasswordEmail } from '../utils/mailer';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Vui lòng nhập Email và Mật khẩu' });
      return;
    }

    const staff = await prisma.staff.findUnique({
      where: { email },
      select: { staffId: true, fullName: true, role: true, email: true, password: true, isActive: true, tokenVersion: true, requirePasswordChange: true }
    });

    if (!staff || !staff.isActive) {
      res.status(401).json({ error: 'Email không tồn tại hoặc tài khoản đã bị khóa' });
      return;
    }

    const isMatch = password === staff.password || await bcrypt.compare(password, staff.password);
    if (!isMatch) {
      res.status(401).json({ error: 'Mật khẩu không chính xác' });
      return;
    }

    const token = jwt.sign(
      { staffId: staff.staffId, role: staff.role, tokenVersion: staff.tokenVersion },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        staffId: staff.staffId,
        fullName: staff.fullName,
        role: staff.role,
        email: staff.email,
        requirePasswordChange: staff.requirePasswordChange
      }
    });
  } catch (error: any) {
    console.error('[Login Error]', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

export const impersonate = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role || '';
    const { targetStaffId } = req.body;
    if (!targetStaffId) {
      res.status(400).json({ error: 'targetStaffId is required' });
      return;
    }

    const targetStaff = await prisma.staff.findUnique({
      where: { staffId: targetStaffId }
    });

    if (!targetStaff) {
      res.status(404).json({ error: 'Target staff not found' });
      return;
    }

    const impersonator = await prisma.staff.findUnique({
      where: { staffId: req.user!.staffId }
    });

    if (!impersonator) {
      res.status(401).json({ error: 'Impersonator not found' });
      return;
    }

    if (impersonator.level >= (targetStaff as any).level) {
      res.status(403).json({ error: 'Forbidden: Cannot impersonate peer or higher level staff' });
      return;
    }

    const token = jwt.sign(
      {
        staffId: targetStaff.staffId,
        role: targetStaff.role,
        isReadOnly: true,
        impersonatorRole: userRole,
        impersonatorId: impersonator.staffId,
        tokenVersion: (targetStaff as any).tokenVersion
      },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    await AuditService.log(
      prisma,
      'IMPERSONATE_GRANTED',
      impersonator.staffId,
      { targetRole: targetStaff.role },
      targetStaff.staffId,
      targetStaff.staffId
    );

    res.json({ token, targetRole: targetStaff.role });
  } catch (error: any) {
    console.error('[Impersonate Error]', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    const staffId = req.user?.staffId;
    if (!staffId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const staff = await prisma.staff.findUnique({
      where: { staffId },
      select: { staffId: true, fullName: true, role: true, email: true, recoveryEmail: true, telegramId: true, requirePasswordChange: true }
    });

    if (!staff) {
      res.status(404).json({ error: 'Staff not found' });
      return;
    }

    res.json(staff);
  } catch (error: any) {
    console.error('[Get Me Error]', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const staffId = req.user?.staffId;
    if (!staffId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { recoveryEmail, telegramId } = req.body;

    const updated = await prisma.staff.update({
      where: { staffId },
      data: { recoveryEmail, telegramId }
    });

    res.json({ message: 'Cập nhật thành công' });
  } catch (error: any) {
    console.error('[Update Profile Error]', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const staffId = req.user?.staffId;
    if (!staffId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      res.status(400).json({ error: 'Vui lòng nhập mật khẩu cũ và mới' });
      return;
    }

    const staff = await prisma.staff.findUnique({ 
      where: { staffId },
      select: { staffId: true, password: true, requirePasswordChange: true }
    });
    if (!staff) {
      res.status(404).json({ error: 'Staff not found' });
      return;
    }

    const isMatch = await bcrypt.compare(oldPassword, staff.password);
    if (!isMatch && oldPassword !== staff.password) { // fallback for unhashed old passwords during transition
      res.status(400).json({ error: 'Mật khẩu cũ không chính xác' });
      return;
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await prisma.staff.update({
      where: { staffId },
      data: {
        password: hashedNewPassword,
        requirePasswordChange: false
      }
    });

    await AuditService.log(
      prisma,
      'PASSWORD_CHANGED',
      staffId,
      { status: 'success' },
      staffId,
      staffId
    );

    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (error: any) {
    console.error('[Change Password Error]', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { recoveryEmail } = req.body;
    if (!recoveryEmail) {
      res.status(400).json({ error: 'Vui lòng cung cấp email công ty hoặc email khôi phục' });
      return;
    }

    const staff = await prisma.staff.findFirst({
      where: {
        OR: [
          { recoveryEmail: recoveryEmail },
          { email: recoveryEmail }
        ]
      }
    });

    if (!staff) {
      // Return 200 even if not found to prevent email enumeration
      res.json({ message: 'Nếu email hợp lệ, link khôi phục sẽ được gửi tới email của bạn.' });
      return;
    }

    // Generate a temporary JWT token (15 mins)
    const resetToken = jwt.sign(
      { staffId: staff.staffId, intent: 'password-reset' },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '15m' }
    );

    try {
      const targetEmail = staff.recoveryEmail || staff.email;
      await sendResetPasswordEmail(targetEmail, resetToken, staff.email);
    } catch (emailError) {
      console.error('[Email Error] Failed to send reset email', emailError);
      res.status(500).json({ error: 'Không thể gửi email khôi phục. Vui lòng liên hệ Admin.' });
      return;
    }

    res.json({
      message: 'Nếu email hợp lệ, link khôi phục sẽ được gửi tới email của bạn.'
    });
  } catch (error: any) {
    console.error('[Forgot Password Error]', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      res.status(400).json({ error: 'Token và mật khẩu mới là bắt buộc' });
      return;
    }

    let payload: any;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      if (payload.intent !== 'password-reset') {
        throw new Error('Invalid token intent');
      }
    } catch (err) {
      res.status(400).json({ error: 'Link khôi phục không hợp lệ hoặc đã hết hạn' });
      return;
    }

    const staffId = payload.staffId;
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Bump tokenVersion to invalidate existing sessions
    await prisma.staff.update({
      where: { staffId },
      data: {
        password: hashedNewPassword,
        requirePasswordChange: false,
        tokenVersion: { increment: 1 }
      }
    });

    await AuditService.log(
      prisma,
      'PASSWORD_RESET',
      staffId,
      { method: 'email_link' },
      staffId,
      staffId
    );

    res.json({ message: 'Đặt lại mật khẩu thành công' });
  } catch (error: any) {
    console.error('[Reset Password Error]', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};
