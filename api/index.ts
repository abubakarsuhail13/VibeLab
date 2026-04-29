import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
const router = express.Router();

app.use(cors());
app.use(express.json());

// Email Configuration (Nodemailer)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.EMAIL_PORT || '465'),
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Helper to send emails
const sendMail = async (options: nodemailer.SendMailOptions) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Email credentials not configured. Skipping email.');
      return null;
    }
    const info = await transporter.sendMail({
      from: `"VibeLab" <${process.env.EMAIL_USER}>`,
      ...options,
    });
    console.log('Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Email Error:', error);
    return null;
  }
};

// MySQL Connection Pool (Hostinger)
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
};

let pool: any = null;

const getPool = async () => {
  if (!pool) {
    if (!process.env.DB_HOST) {
      console.warn('DB_HOST not configured.');
      return null;
    }
    try {
      pool = mysql.createPool(dbConfig);
      const connection = await pool.getConnection();
      console.log('Successfully connected to MySQL database');
      connection.release();
    } catch (err: any) {
      console.error('CRITICAL: Failed to connect to MySQL database:', {
        message: err.message,
        code: err.code,
        host: dbConfig.host,
        user: dbConfig.user
      });
      pool = null;
      return null;
    }
  }
  return pool;
};

// API Sub-Router
router.post('/waitlist', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });
    await p.execute('INSERT INTO waitlist (email, source) VALUES (?, ?)', [email, 'vibelab_landing_v1']);

    // Send Confirmation Email to User
    sendMail({
      to: email,
      subject: 'Welcome to the VibeLab Waitlist!',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
          <h1 style="color: #0ea5e9;">Welcome to VibeLab!</h1>
          <p>Hi there,</p>
          <p>Thank you for joining the VibeLab waitlist. We're excited to have you with us on our journey to redefine how schools and creators collaborate.</p>
          <p>We'll notify you as soon as we're ready for your early access.</p>
          <br/>
          <p>Best regards,<br/>The VibeLab Team</p>
        </div>
      `
    });

    // Send Notification to Admin
    sendMail({
      to: process.env.ADMIN_EMAIL || 'vibelab@nexaforgetech.com',
      subject: '🚀 New Waitlist Signup!',
      html: `<p><strong>New signup:</strong> ${email}</p><p>Source: vibelab_landing_v1</p>`
    });

    res.json({ success: true, message: 'Successfully joined waitlist' });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

router.post('/contact', async (req, res) => {
  const { name, email, organization, role, interest_type, message, source } = req.body;
  if (!name || !email || !role || !message) return res.status(400).json({ error: 'Required fields missing' });
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });
    await p.execute(
      'INSERT INTO contact_submissions (name, email, organization, role, interest_type, message, source) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, organization, role, interest_type, message, source || 'vibelab_landing_v1']
    );

    // Send Confirmation Email to User
    sendMail({
      to: email,
      subject: 'We received your inquiry - VibeLab',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
          <h1 style="color: #0ea5e9;">Thanks for contacting VibeLab!</h1>
          <p>Hi ${name},</p>
          <p>We've received your inquiry and our team will get back to you shortly.</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold; color: #64748b; font-size: 12px; text-transform: uppercase;">Your Message:</p>
            <p style="margin: 10px 0 0 0; color: #475569; font-style: italic;">"${message}"</p>
          </div>
          <br/>
          <p>Best regards,<br/>The VibeLab Team</p>
        </div>
      `
    });

    // Send Notification to Admin
    sendMail({
      to: process.env.ADMIN_EMAIL || 'vibelab@nexaforgetech.com',
      subject: `📩 New Contact Inquiry from ${name}`,
      html: `
        <h2>New Inquiry Details:</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Org:</strong> ${organization || 'N/A'}</p>
        <p><strong>Role:</strong> ${role}</p>
        <p><strong>Interest:</strong> ${interest_type}</p>
        <p><strong>Message:</strong> ${message}</p>
      `
    });

    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

router.get('/admin/data', async (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  const secureKey = process.env.VITE_ADMIN_PASSWORD || '0000';
  if (adminKey !== secureKey) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database not connected' });
    const [waitlist] = await p.execute('SELECT * FROM waitlist ORDER BY created_at DESC');
    const [submissions] = await p.execute('SELECT * FROM contact_submissions ORDER BY created_at DESC');
    res.json({ waitlist, submissions });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/health', async (req, res) => {
  const p = await getPool();
  res.json({ status: 'ok', db: !!p, env: !!process.env.DB_HOST });
});

// Mounting the router at both /api and root to be safe
app.use('/api', router);
app.use('/', router);

// Error Fallback
app.use((req, res) => {
  res.status(404).json({ error: 'API route not found', path: req.path });
});

export default app;
