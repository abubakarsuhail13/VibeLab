import express from 'express';
import { getPool } from '../db.js';
import { authenticateToken } from '../auth.js';

const router = express.Router();

// Middleware to verify if the user has a "teacher" role
const verifyTeacher = (req: any, res: any, next: any) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Access denied: Teacher role required' });
  }
  next();
};

// 1. GET all students registered in the university/platform (Teacher only)
router.get('/students', authenticateToken, verifyTeacher, async (req: any, res) => {
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const [students]: any = await p.execute(`
      SELECT u.id, u.name, u.email, u.vl_id, u.avatar_url, u.created_at, u.country, u.current_role,
             (SELECT COUNT(*) FROM user_project_progress WHERE user_id = u.id AND is_completed = 1) as completed_projects,
             (SELECT COUNT(*) FROM project_submissions WHERE user_id = u.id) as total_submissions,
             (SELECT COUNT(*) FROM badges WHERE user_id = u.id) as total_badges
      FROM users u
      WHERE u.role = 'student'
      ORDER BY u.created_at DESC
    `);

    // Fetch active/completed phases for each student to enrich dashboard
    for (const student of students) {
      const [phases]: any = await p.execute(`
        SELECT upp.phase_id, upp.status, upp.progress_percentage, ph.name as phase_name
        FROM user_phase_progress upp
        JOIN phases ph ON upp.phase_id = ph.id
        WHERE upp.user_id = ?
      `, [student.id]);
      student.phases = phases;
    }

    res.json(students);
  } catch (error: any) {
    console.error('Failed to get students:', error);
    res.status(500).json({ error: 'Failed to retrieve students list' });
  }
});

// 2. GET all submissions across students (Teacher only)
router.get('/submissions', authenticateToken, verifyTeacher, async (req: any, res) => {
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const [submissions]: any = await p.execute(`
      SELECT ps.id, ps.user_id as student_id, ps.project_id, ps.phase_id, 
             ps.github_url, ps.live_url, ps.description, ps.created_at,
             ps.status, ps.grade, ps.review_comment, ps.reviewed_at,
             u.name as student_name, u.email as student_email, u.vl_id as student_vl_id,
             pp.title as project_title, ph.name as phase_name,
             upp.code_state
      FROM project_submissions ps
      JOIN users u ON ps.user_id = u.id
      JOIN phase_projects pp ON ps.project_id = pp.id
      JOIN phases ph ON ps.phase_id = ph.id
      LEFT JOIN user_project_progress upp ON (upp.user_id = ps.user_id AND upp.project_id = ps.project_id)
      ORDER BY ps.created_at DESC
    `);

    res.json(submissions);
  } catch (error: any) {
    console.error('Failed to get submissions:', error);
    res.status(500).json({ error: 'Failed to retrieve project submissions' });
  }
});

// 3. POST grade and review comment on a student project submission (Teacher only)
router.post('/review', authenticateToken, verifyTeacher, async (req: any, res) => {
  const { submissionId, status, grade, reviewComment } = req.body;
  if (!submissionId || !status) {
    return res.status(400).json({ error: 'Submission ID and status are required' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    // Update submission
    await p.execute(`
      UPDATE project_submissions 
      SET status = ?, grade = ?, review_comment = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, grade || null, reviewComment || null, req.user.userId, submissionId]);

    // Retrieve details to synchronize progress
    const [sub]: any = await p.execute(
      'SELECT user_id, project_id, phase_id FROM project_submissions WHERE id = ?',
      [submissionId]
    );

    if (sub.length > 0) {
      const { user_id: studentId, project_id: projectId, phase_id: phaseId } = sub[0];

      // If APPROVED, ensure progress completion is synchronised
      const isCompleted = status === 'approved' ? 1 : 0;
      await p.execute(`
        INSERT INTO user_project_progress (user_id, project_id, is_completed)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE is_completed = VALUES(is_completed)
      `, [studentId, projectId, isCompleted]);

      // Force recalculate phase progress percentages
      const [allProjects]: any = await p.execute('SELECT id FROM phase_projects WHERE phase_id = ?', [phaseId]);
      const totalProjects = allProjects.length;

      if (totalProjects > 0) {
        const projectIds = allProjects.map((ap: any) => ap.id);
        const placeholders = projectIds.map(() => '?').join(',');
        const [completedInPhase]: any = await p.execute(
          `SELECT COUNT(*) as count FROM user_project_progress WHERE user_id = ? AND project_id IN (${placeholders}) AND is_completed = 1`,
          [studentId, ...projectIds]
        );

        const completedCount = completedInPhase[0].count;
        const percentage = Math.round((completedCount / totalProjects) * 100);

        await p.execute(`
          INSERT INTO user_phase_progress (user_id, phase_id, progress_percentage)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE progress_percentage = VALUES(progress_percentage)
        `, [studentId, phaseId, percentage]);
      }
    }

    res.json({ success: true, message: 'Review and grade recorded successfully.' });
  } catch (error: any) {
    console.error('Failed to update submission review:', error);
    res.status(500).json({ error: 'Failed to record review outcomes.' });
  }
});

// 4. POST Manual override of a phase lock or progress level for custom pacing (Teacher only)
router.post('/override-progress', authenticateToken, verifyTeacher, async (req: any, res) => {
  const { studentId, phaseId, status, progressPercentage } = req.body;
  if (!studentId || !phaseId || !status) {
    return res.status(400).json({ error: 'Student ID, Phase ID, and status are required' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    await p.execute(`
      INSERT INTO user_phase_progress (user_id, phase_id, status, progress_percentage)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE status = VALUES(status), progress_percentage = VALUES(progress_percentage)
    `, [studentId, phaseId, status, progressPercentage || 0]);

    res.json({ success: true, message: 'Manual progress override saved successfully.' });
  } catch (error: any) {
    console.error('Failed to override progress:', error);
    res.status(500).json({ error: 'Failed to apply manual progress override.' });
  }
});

// 5. GET support channels thread sessions
// Get list of student chat threads for teacher, or chat logs for a selected student session
router.get('/support/sessions', authenticateToken, async (req: any, res) => {
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    if (req.user.role === 'teacher') {
      // Get all unique student conversations
      const [students]: any = await p.execute(`
        SELECT DISTINCT u.id, u.name, u.email, u.vl_id, u.avatar_url,
               (SELECT message FROM support_messages WHERE student_id = u.id ORDER BY created_at DESC LIMIT 1) as last_message,
               (SELECT created_at FROM support_messages WHERE student_id = u.id ORDER BY created_at DESC LIMIT 1) as last_message_at
        FROM users u
        JOIN support_messages sm ON u.id = sm.student_id
        ORDER BY last_message_at DESC
      `);
      res.json(students);
    } else {
      // Students can only see their own thread summary
      res.json([{ id: req.user.userId, name: 'Faculty Support Helpdesk', vl_id: 'VIBELAB-HELP' }]);
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to load support threads' });
  }
});

// GET support messages list for a session (Both Student & Teacher)
router.get('/support/messages', authenticateToken, async (req: any, res) => {
  const { studentId } = req.query;
  const targetStudentId = req.user.role === 'teacher' ? studentId : req.user.userId;

  if (!targetStudentId) {
    return res.status(400).json({ error: 'studentId query param required' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const [messages]: any = await p.execute(`
      SELECT sm.id, sm.student_id, sm.teacher_id, sm.sender_role, sm.message, sm.created_at,
             u.name as sender_name, u.avatar_url as sender_avatar
      FROM support_messages sm
      LEFT JOIN users u ON (
        (sm.sender_role = 'student' AND sm.student_id = u.id) OR 
        (sm.sender_role = 'teacher' AND sm.teacher_id = u.id)
      )
      WHERE sm.student_id = ?
      ORDER BY sm.created_at ASC
    `, [targetStudentId]);

    res.json(messages);
  } catch (error: any) {
    console.error('Failed to fetch support messages:', error);
    res.status(500).json({ error: 'Failed to load support communication chat logs.' });
  }
});

// POST send message in support thread (Both Student & Teacher)
router.post('/support/messages', authenticateToken, async (req: any, res) => {
  const { message, studentId } = req.body;
  if (!message) return res.status(400).json({ error: 'Message content required' });

  // If teacher, studentId must be provided. If student, studentId is they themselves.
  const targetStudentId = req.user.role === 'teacher' ? studentId : req.user.userId;
  const teacherId = req.user.role === 'teacher' ? req.user.userId : null;

  if (!targetStudentId) {
    return res.status(400).json({ error: 'studentId is required for teachers' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    await p.execute(`
      INSERT INTO support_messages (student_id, teacher_id, sender_role, message)
      VALUES (?, ?, ?, ?)
    `, [targetStudentId, teacherId, req.user.role, message]);

    res.json({ success: true, message: 'Support message transmitted successfully.' });
  } catch (error: any) {
    console.error('Failed to save support message:', error);
    res.status(500).json({ error: 'Failed to send support message' });
  }
});

export default router;
