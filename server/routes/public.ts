import express from 'express';
import { getPool } from '../db.js';
import { sendMail } from '../mail.js';

const router = express.Router();

router.post('/waitlist', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    await p.execute(
      'INSERT INTO waitlist (email, source) VALUES (?, ?) ON DUPLICATE KEY UPDATE source = VALUES(source), created_at = CURRENT_TIMESTAMP', 
      [email, 'vibelab_landing_v1']
    );

    await sendMail({
      to: email,
      subject: 'Welcome to the VibeLab Waitlist!',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
          <h1 style="color: #0ea5e9;">Welcome to VibeLab!</h1>
          <p>Hi there,</p>
          <p>Thank you for joining the VibeLab waitlist. We're excited to have you with us on our journey.</p>
          <p>We'll notify you as soon as we're ready for your early access.</p>
          <br/>
          <p>Best regards,<br/>The VibeLab Team</p>
        </div>
      `
    });

    const adminEmailAddr = process.env.ADMIN_EMAIL || 'vibelab@nexaforgetech.com';
    await sendMail({
      to: adminEmailAddr,
      subject: '🚀 New Waitlist Signup!',
      html: `<p><strong>New signup:</strong> ${email}</p><p>Source: vibelab_landing_v1</p>`
    });

    res.json({ success: true, message: 'Successfully joined waitlist' });
  } catch (error: any) {
    res.status(500).json({ error: 'Database error' });
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

    await sendMail({
      to: email,
      subject: 'We received your inquiry - VibeLab',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
          <h1 style="color: #0ea5e9;">Thanks for contacting VibeLab!</h1>
          <p>Hi ${name}, we've received your inquiry and our team will get back to you shortly.</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold; font-size: 12px; color: #64748b;">Your Message:</p>
            <p style="margin: 10px 0 0 0; font-style: italic;">"${message}"</p>
          </div>
          <p>Best regards,<br/>The VibeLab Team</p>
        </div>
      `
    });

    const adminEmailAddr = process.env.ADMIN_EMAIL || 'vibelab@nexaforgetech.com';
    await sendMail({
      to: adminEmailAddr,
      subject: `📩 New Contact Inquiry from ${name}`,
      html: `<p>Inquiry: ${message}</p>`
    });

    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/leaderboard', async (req, res) => {
  const { period, country } = req.query;
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    let query = `
      SELECT 
        u.id, u.name, u.avatar_url, u.country,
        COUNT(DISTINCT b.id) as points_badges,
        COUNT(DISTINCT s.id) as points_submissions,
        (SELECT COUNT(*) FROM user_phase_progress WHERE user_id = u.id AND status = 'completed') as points_phases,
        (COUNT(DISTINCT b.id) * 100 + COUNT(DISTINCT s.id) * 20 + (SELECT COUNT(*) FROM user_phase_progress WHERE user_id = u.id AND status = 'completed') * 50) as total_score
      FROM users u
      LEFT JOIN badges b ON u.id = b.user_id ${period === 'monthly' ? 'AND b.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)' : ''}
      LEFT JOIN project_submissions s ON u.id = s.user_id ${period === 'monthly' ? 'AND s.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)' : ''}
      WHERE 1=1
    `;

    const params: any[] = [];
    if (country && country !== 'Worldwide') {
      query += ' AND u.country = ?';
      params.push(country);
    }
    query += ' GROUP BY u.id HAVING total_score > 0 ORDER BY total_score DESC LIMIT 50';

    const [rows] = await p.execute(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

router.get('/user/:userId/profile', async (req, res) => {
  const { userId } = req.params;
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });
    const [rows]: any = await p.execute('SELECT id, name, avatar_url, role, country, bio, github_username, created_at FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.get('/user/:userId/submissions', async (req, res) => {
  const { userId } = req.params;
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });
    const [rows]: any = await p.execute(
      'SELECT s.*, p.title as project_title FROM project_submissions s JOIN phase_projects p ON s.project_id = p.id WHERE s.user_id = ? ORDER BY s.created_at DESC',
      [userId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

router.get('/user/:userId/badges', async (req, res) => {
  const { userId } = req.params;
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });
    const [rows]: any = await p.execute(
      'SELECT b.*, p.name as phase_name FROM badges b JOIN phases p ON b.phase_id = p.id WHERE b.user_id = ? ORDER BY b.created_at DESC',
      [userId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch badges' });
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
  try {
    const p = await getPool();
    if (!p) return res.json({ status: 'error', reason: 'No pool' });
    const [rows] = await p.execute('SELECT COUNT(*) as count FROM waitlist');
    res.json({ status: 'ok', db: true, count: (rows as any)[0].count });
  } catch (err: any) {
    res.json({ status: 'error', db: false, error: err.message });
  }
});

export default router;
