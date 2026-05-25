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
  const { country, period } = req.query;
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const isMonthly = period === 'monthly';

    let query = `
      SELECT * FROM (
        SELECT 
          u.id, 
          u.name, 
          u.avatar_url, 
          u.country, 
          u.vl_id,
          u.current_role,
          u.role,
          u.created_at as registration_date,
          (
            SELECT COUNT(*) 
            FROM badges 
            WHERE user_id = u.id 
            ${isMonthly ? 'AND earned_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 30 DAY)' : ''}
          ) as badges_count,
          (
            SELECT COUNT(*) 
            FROM project_submissions 
            WHERE user_id = u.id 
            ${isMonthly ? 'AND created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 30 DAY)' : ''}
          ) as projects_count
        FROM users u
      ) as u_sub
      WHERE role = 'student'
    `;

    const params: any[] = [];
    if (country && country !== 'Worldwide') {
      query += ' AND country = ?';
      params.push(country);
    }
    
    query += ' ORDER BY badges_count DESC, projects_count DESC, registration_date ASC LIMIT 100';

    const [rows] = await p.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET Public Profile by permanent vl_id (no auth required)
router.get('/profile/:vl_id', async (req, res) => {
  const { vl_id } = req.params;
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    // Find user by VL-ID
    const [userRows]: any = await p.execute(
      'SELECT id, name, email, avatar_url, role, country, bio, github_url, github_handle, linkedin_url, current_role, created_at FROM users WHERE vl_id = ?',
      [vl_id]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ error: 'Learner profile not found' });
    }

    const user = userRows[0];

    // Find current active phase
    const [activePhaseRows]: any = await p.execute(
      `SELECT p.id, p.name, p.order_index 
       FROM user_phase_progress upp 
       JOIN phases p ON upp.phase_id = p.id 
       WHERE upp.user_id = ? AND upp.status = 'active' 
       ORDER BY p.order_index DESC LIMIT 1`,
      [user.id]
    );
    const activePhase = activePhaseRows.length > 0 ? activePhaseRows[0] : null;

    // Find visual bento-grid badges
    const [badgeRows]: any = await p.execute(
      `SELECT b.id, b.earned_at, b.certificate_url, p.id as phase_id, p.name as phase_name, p.order_index 
       FROM badges b 
       JOIN phases p ON b.phase_id = p.id 
       WHERE b.user_id = ? 
       ORDER BY p.order_index ASC`,
      [user.id]
    );

    // Find completed project submissions
    const [subRows]: any = await p.execute(
      `SELECT s.id, s.github_url, s.live_url, s.description, s.created_at, p.title as project_title, ph.name as phase_name 
       FROM project_submissions s 
       JOIN phase_projects p ON s.project_id = p.id 
       JOIN phases ph ON s.phase_id = ph.id 
       WHERE s.user_id = ? 
       ORDER BY s.created_at DESC`,
      [user.id]
    );

    res.json({
      user: {
        id: user.id,
        name: user.name,
        avatar_url: user.avatar_url,
        role: user.role,
        country: user.country,
        bio: user.bio,
        github_url: user.github_url,
        github_handle: user.github_handle,
        github_username: user.github_handle,
        linkedin_url: user.linkedin_url,
        current_role: user.current_role,
        vl_id,
        registration_date: user.created_at
      },
      activePhase,
      badges: badgeRows,
      submissions: subRows
    });
  } catch (err: any) {
    console.error('Public profile fetch error:', err);
    res.status(500).json({ error: 'Failed to retrieve public profile.' });
  }
});

// Employer Verification Portal (no auth required)
router.get('/verify/:vl_id', async (req, res) => {
  const { vl_id } = req.params;
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    // Validate student existence
    const [userRows]: any = await p.execute(
      'SELECT id, name FROM users WHERE vl_id = ?',
      [vl_id]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ error: 'Student ID not found in VibeLab register.' });
    }

    const student = userRows[0];

    // Get certified badges
    const [badgeRows]: any = await p.execute(
      `SELECT b.id, b.earned_at, b.certificate_url, p.name as phase_title, p.order_index 
       FROM badges b 
       JOIN phases p ON b.phase_id = p.id 
       WHERE b.user_id = ? 
       ORDER BY p.order_index ASC`,
      [student.id]
    );

    res.json({
      studentName: student.name,
      vlId: vl_id,
      accomplishments: badgeRows.map((b: any) => ({
        phaseCode: `PHASE-${b.order_index}`,
        phaseTitle: b.phase_title,
        dateCertified: b.earned_at,
        certificateUrl: b.certificate_url,
        status: 'Verified'
      }))
    });
  } catch (err: any) {
    console.error('Verification portal fetch error:', err);
    res.status(500).json({ error: 'Failed to retrieve employer verification details.' });
  }
});

// Backwards compatibility list
router.get('/user/:userId/profile', async (req, res) => {
  const { userId } = req.params;
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });
    const [rows]: any = await p.execute('SELECT id, name, avatar_url, role, country, bio, linkedin_url, github_url, github_handle, current_role, vl_id, created_at FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = rows[0];
    user.github_username = user.github_handle;
    res.json(user);
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
      'SELECT b.*, p.name as phase_name FROM badges b JOIN phases p ON b.phase_id = p.id WHERE b.user_id = ? ORDER BY b.earned_at DESC',
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
