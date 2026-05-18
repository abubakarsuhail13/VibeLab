import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cryptoRandomString from 'crypto-random-string';
import { getPool } from '../db.js';
import { sendMail } from '../mail.js';
import { JWT_SECRET } from '../auth.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const [existing]: any = await p.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = cryptoRandomString({ length: 32, type: 'url-safe' });

    const [result]: any = await p.execute(
      'INSERT INTO users (name, email, password, role, verification_token) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, role, verificationToken]
    );

    const userId = result.insertId;

    try {
      const [firstPhase]: any = await p.execute('SELECT id FROM phases ORDER BY order_index ASC LIMIT 1');
      if (firstPhase.length > 0) {
        await p.execute(
          'INSERT IGNORE INTO user_phase_progress (user_id, phase_id, status) VALUES (?, ?, "active")',
          [userId, firstPhase[0].id]
        );
      }
    } catch (onboardingErr) {
      console.error('Onboarding Error:', onboardingErr);
    }
    
    const baseUrl = process.env.VITE_APP_URL || 'https://vibe-lab-tan.vercel.app';
    await sendMail({
      to: email,
      subject: 'Verify your VibeLab Account',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
          <h1 style="color: #0ea5e9;">Welcome to VibeLab, ${name}!</h1>
          <p>Please verify your email address to activate your account and start your learning journey.</p>
          <a href="${baseUrl}/verify-email?token=${verificationToken}" 
             style="display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">
            Verify Email Address
          </a>
          <p style="font-size: 12px; color: #64748b;">If you didn't create an account, you can safely ignore this email.</p>
        </div>
      `
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.'
    });
  } catch (error: any) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Database error during registration' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const [rows]: any = await p.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];

    if (!user.is_verified) {
      return res.status(403).json({ error: 'Please verify your email address before logging in.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url
      }
    });
  } catch (error: any) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Database error during login' });
  }
});

router.get('/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token missing' });

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const [rows]: any = await p.execute('SELECT id FROM users WHERE verification_token = ?', [token]);
    if (rows.length === 0) return res.status(400).json({ error: 'Invalid or expired verification token' });

    const user = rows[0];
    await p.execute('UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?', [user.id]);

    res.json({ success: true, message: 'Email verified successfully! You can now log in.' });
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const [rows]: any = await p.execute('SELECT id, name FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.json({ success: true, message: 'If an account exists with that email, a reset link has been sent.' });
    }

    const user = rows[0];
    const resetToken = cryptoRandomString({ length: 32, type: 'url-safe' });
    const expires = new Date(Date.now() + 3600000); 

    await p.execute(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [resetToken, expires, user.id]
    );

    const baseUrl = process.env.VITE_APP_URL || 'https://vibe-lab-tan.vercel.app';
    await sendMail({
      to: email,
      subject: 'Reset your VibeLab Password',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
          <h1>Password Reset Request</h1>
          <p>Hi ${user.name}, we received a request to reset your password.</p>
          <p>Click the link below to set a new password (valid for 1 hour):</p>
          <a href="${baseUrl}/reset-password?token=${resetToken}" 
             style="display: inline-block; background: #1e293b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">
            Reset Password
          </a>
          <p>If you didn't request this, you can ignore this email.</p>
        </div>
      `
    });

    res.json({ success: true, message: 'Reset link sent to your email.' });
  } catch (error) {
    res.status(500).json({ error: 'Forgot password failed' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const [rows]: any = await p.execute(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    );

    if (rows.length === 0) return res.status(400).json({ error: 'Invalid or expired reset token' });

    const user = rows[0];
    const hashedPassword = await bcrypt.hash(password, 10);

    await p.execute(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );

    res.json({ success: true, message: 'Password reset successful! You can now log in with your new password.' });
  } catch (error) {
    res.status(500).json({ error: 'Password reset failed' });
  }
});

export default router;
