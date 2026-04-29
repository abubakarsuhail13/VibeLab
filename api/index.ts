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
  secure: process.env.EMAIL_PORT === '465', // true for 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false // Often needed for Hostinger
  }
});

// Helper to send emails
const sendMail = async (options: nodemailer.SendMailOptions) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Email config ERROR: EMAIL_USER or EMAIL_PASS missing');
      return null;
    }
    
    console.log(`Email Debug: Attempting mail from ${process.env.EMAIL_USER} to ${options.to}`);
    console.log(`Email Debug: Host ${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT} (Secure: ${process.env.EMAIL_PORT === '465'})`);

    const info = await transporter.sendMail({
      from: `"VibeLab" <${process.env.EMAIL_USER}>`,
      ...options,
    });
    console.log('Email SUCCESS: %s', info.messageId);
    return info;
  } catch (error: any) {
    console.error('Email FAILURE:', {
      message: error.message,
      code: error.code,
      command: error.command
    });
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
      console.log('DB Debug: Connecting to Host:', dbConfig.host, 'User:', dbConfig.user, 'DB:', dbConfig.database);
      pool = mysql.createPool(dbConfig);
      const connection = await pool.getConnection();
      console.log('Successfully connected to MySQL database');
      
      // Auto-ensure tables exist
      try {
        console.log('DB Debug: Ensuring tables exist...');
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS waitlist (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL UNIQUE,
            source VARCHAR(100) DEFAULT 'vibelab_landing_v1',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS contact_submissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            organization VARCHAR(255),
            role VARCHAR(100) NOT NULL,
            interest_type VARCHAR(50),
            message TEXT NOT NULL,
            source VARCHAR(100) DEFAULT 'vibelab_landing_v1',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('DB Debug: Tables verified/created.');
      } catch (tableErr: any) {
        console.error('DB Debug: Error creating tables:', tableErr.message);
      }
      
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
  console.log('POST /api/waitlist - Request Body:', req.body);

  if (!email) {
    console.warn('Waitlist Error: Email is missing in request body');
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const p = await getPool();
    if (!p) {
      console.error('Waitlist Error: Database connection failed');
      return res.status(503).json({ error: 'Database connection failed' });
    }

    try {
      console.log(`Waitlist DB: Attempting to insert ${email}`);
      await p.execute('INSERT INTO waitlist (email, source) VALUES (?, ?)', [email, 'vibelab_landing_v1']);
      console.log(`Waitlist DB: Successfully added ${email}`);
    } catch (dbError: any) {
      if (dbError.code === 'ER_DUP_ENTRY') {
        console.log(`Waitlist DB: Duplicate entry for ${email}`);
        return res.json({ success: true, message: 'You are already on the waitlist!' });
      }
      console.error('Waitlist DB Insertion Error:', dbError);
      throw dbError; // Rethrow to be caught by outer catch
    }

    // Send Confirmation Email to User
    console.log(`Email: Attempting to send confirmation to ${email}`);
    const userEmail = await sendMail({
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
    console.log(`Email: User confirmation status: ${userEmail ? 'Sent' : 'Failed'}`);

    // Send Notification to Admin
    const adminEmailAddr = process.env.ADMIN_EMAIL || 'vibelab@nexaforgetech.com';
    console.log(`Email: Attempting to send admin notification to ${adminEmailAddr}`);
    const adminEmail = await sendMail({
      to: adminEmailAddr,
      subject: '🚀 New Waitlist Signup!',
      html: `<p><strong>New signup:</strong> ${email}</p><p>Source: vibelab_landing_v1</p>`
    });
    console.log(`Email: Admin notification status: ${adminEmail ? 'Sent' : 'Failed'}`);

    res.json({ success: true, message: 'Successfully joined waitlist' });
  } catch (error: any) {
    console.error('Waitlist DB Error:', error);
    res.status(500).json({ 
      error: 'Database error', 
      details: error.message,
      code: error.code
    });
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
    console.log(`Email: Attempting to send contact confirmation to ${email}`);
    const userEmail = await sendMail({
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
    console.log(`Email: User contact confirmation: ${userEmail ? 'Sent' : 'Failed'}`);

    // Send Notification to Admin
    const adminEmailAddr = process.env.ADMIN_EMAIL || 'vibelab@nexaforgetech.com';
    console.log(`Email: Attempting to send admin contact notification to ${adminEmailAddr}`);
    const adminEmail = await sendMail({
      to: adminEmailAddr,
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
    console.log(`Email: Admin contact notification: ${adminEmail ? 'Sent' : 'Failed'}`);

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
