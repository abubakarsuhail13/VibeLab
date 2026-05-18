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

router.patch('/profile', authenticateToken, async (req: any, res) => {
  const { name, country, bio, github_username } = req.body;
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    await p.execute(
      'UPDATE users SET name = ?, country = ?, bio = ?, github_username = ? WHERE id = ?',
      [name, country, bio, github_username, req.user.userId]
    );

    res.json({ success: true, message: 'Profile updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
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

export default router;
