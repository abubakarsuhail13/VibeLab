import express from 'express';
import { getPool } from '../db.js';
import { authenticateToken } from '../auth.js';
import { upload } from '../upload.js';

const router = express.Router();

router.post('/upload-avatar', authenticateToken, upload.single('avatar'), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const base64Image = req.file.buffer.toString('base64');
    const avatarUrl = `data:${req.file.mimetype};base64,${base64Image}`;

    await p.execute('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, req.user.userId]);

    res.json({ success: true, avatarUrl });
  } catch (error) {
    res.status(500).json({ error: 'Avatar upload failed' });
  }
});

router.post('/upload-banner', authenticateToken, upload.single('banner'), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const base64Image = req.file.buffer.toString('base64');
    const bannerUrl = `data:${req.file.mimetype};base64,${base64Image}`;

    await p.execute('UPDATE users SET banner_url = ? WHERE id = ?', [bannerUrl, req.user.userId]);

    res.json({ success: true, bannerUrl });
  } catch (error) {
    console.error('Banner upload error:', error);
    res.status(500).json({ error: 'Banner upload failed' });
  }
});

router.get('/me', authenticateToken, async (req: any, res) => {
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const [rows]: any = await p.execute(
      `SELECT id, vl_id, name, email, role, avatar_url, country,
              profile_completed, onboarding_completed, intro_completed, ideation_completed, is_verified
       FROM users WHERE id = ?`,
      [req.user.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const u = rows[0];
    res.json({
      success: true,
      user: {
        id: u.id,
        vl_id: u.vl_id,
        name: u.name,
        email: u.email,
        role: u.role,
        avatar_url: u.avatar_url,
        country: u.country,
        profile_completed: u.profile_completed === 1 || u.profile_completed === true || u.onboarding_completed === 1 || u.onboarding_completed === true,
        onboarding_completed: u.onboarding_completed === 1 || u.onboarding_completed === true || u.profile_completed === 1 || u.profile_completed === true,
        intro_completed: u.intro_completed === 1 || u.intro_completed === true,
        ideation_completed: u.ideation_completed === 1 || u.ideation_completed === true,
        is_verified: u.is_verified === 1 || u.is_verified === true
      }
    });
  } catch (error: any) {
    console.error('GET /me error:', error);
    res.status(500).json({ error: 'Failed to retrieve current user details' });
  }
});

router.post('/profile-setup', authenticateToken, async (req: any, res) => {
  const {
    avatar_url,
    date_of_birth,
    gender,
    country,
    state_province,
    city,
    institution_name,
    education_level,
    field_of_study
  } = req.body;

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    await p.execute(
      `UPDATE users SET 
        avatar_url = COALESCE(?, avatar_url),
        date_of_birth = ?,
        gender = ?,
        country = COALESCE(?, country),
        state_province = ?,
        city = ?,
        institution_name = ?,
        education_level = ?,
        field_of_study = ?,
        profile_completed = 1,
        onboarding_completed = 1,
        onboarding_completed_at = NOW()
       WHERE id = ?`,
      [
        avatar_url || null,
        date_of_birth || null,
        gender || null,
        country || null,
        state_province || null,
        city || null,
        institution_name || null,
        education_level || null,
        field_of_study || null,
        req.user.userId
      ]
    );

    res.json({
      success: true,
      message: 'Profile completed successfully',
      onboarding_completed: true,
      profile_completed: true
    });
  } catch (error: any) {
    console.error('POST /profile-setup error:', error);
    res.status(500).json({ error: `Failed to complete profile: ${error.message || error}` });
  }
});

router.patch('/profile', authenticateToken, async (req: any, res) => {
  const { name, country, bio, github_username } = req.body;
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const githubUrl = github_username ? `https://github.com/${github_username}` : null;

    await p.execute(
      'UPDATE users SET name = ?, country = ?, bio = ?, github_handle = ?, github_url = ? WHERE id = ?',
      [name, country, bio, github_username || null, githubUrl, req.user.userId]
    );

    res.json({ success: true, message: 'Profile updated' });
  } catch (error: any) {
    console.error('PATCH /profile database update error:', error);
    res.status(500).json({ error: `Failed to update profile: ${error.message || error}` });
  }
});

router.get('/badges', authenticateToken, async (req: any, res) => {
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const [rows]: any = await p.execute(
      'SELECT b.*, p.name as phase_name FROM badges b JOIN phases p ON b.phase_id = p.id WHERE b.user_id = ? ORDER BY b.created_at DESC',
      [req.user.userId]
    );

    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

router.get('/submissions', authenticateToken, async (req: any, res) => {
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const [rows]: any = await p.execute(
      'SELECT s.*, p.title as project_title FROM project_submissions s JOIN phase_projects p ON s.project_id = p.id WHERE s.user_id = ? ORDER BY s.created_at DESC',
      [req.user.userId]
    );

    res.json(rows);
  } catch (error: any) {
    console.error('Fetch Submissions Error:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

router.post('/intro-complete', authenticateToken, async (req: any, res) => {
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    await p.execute(
      'UPDATE users SET intro_completed = 1, intro_completed_at = NOW() WHERE id = ?',
      [req.user.userId]
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('Intro complete error:', error);
    res.status(500).json({ error: 'Failed to mark intro as completed' });
  }
});

export default router;
