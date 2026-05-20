import express from 'express';
import { getPool } from '../db.js';
import { authenticateToken } from '../auth.js';

const router = express.Router();

router.get('/phases', authenticateToken, async (req: any, res) => {
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const [phases]: any = await p.execute('SELECT * FROM phases ORDER BY order_index ASC');
    const [progress]: any = await p.execute('SELECT * FROM user_phase_progress WHERE user_id = ?', [req.user.userId]);

    const phasesWithProgress = phases.map((phase: any) => {
      const userProgress = progress.find((pr: any) => pr.phase_id === phase.id);
      return {
        ...phase,
        status: userProgress ? userProgress.status : (phase.is_locked_default ? 'locked' : 'active'),
        progress_percentage: userProgress ? userProgress.progress_percentage : 0
      };
    });

    res.json(phasesWithProgress);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch phases' });
  }
});

router.get('/phase/:id', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const [rows]: any = await p.execute('SELECT * FROM phases WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Phase not found' });

    const phase = rows[0];
    const [progress]: any = await p.execute('SELECT * FROM user_phase_progress WHERE user_id = ? AND phase_id = ?', [req.user.userId, id]);

    res.json({
      ...phase,
      status: progress.length > 0 ? progress[0].status : (phase.is_locked_default ? 'locked' : 'active'),
      progress_percentage: progress.length > 0 ? progress[0].progress_percentage : 0
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch phase' });
  }
});

router.get('/phase/:id/projects', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const [projects]: any = await p.execute('SELECT * FROM phase_projects WHERE phase_id = ?', [id]);
    const [progress]: any = await p.execute(
      'SELECT project_id, completed_steps, is_completed, last_active_step, code_state FROM user_project_progress WHERE user_id = ?',
      [req.user.userId]
    );

    const projectsWithProgress = projects.map((project: any) => {
      const userProgress = progress.find((pr: any) => pr.project_id === project.id);
      return {
        ...project,
        completed_steps: userProgress ? userProgress.completed_steps : [],
        last_active_step: userProgress ? userProgress.last_active_step : 0,
        code_state: userProgress ? (typeof userProgress.code_state === 'string' ? JSON.parse(userProgress.code_state) : userProgress.code_state) : null,
        is_completed: userProgress ? !!userProgress.is_completed : false
      };
    });

    res.json(projectsWithProgress);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

router.post('/progress/update', authenticateToken, async (req: any, res) => {
  const { projectId, completedSteps, isCompleted, lastActiveStep, codeState } = req.body;
  if (!projectId) return res.status(400).json({ error: 'Project ID required' });

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    console.log(`[DEBUG] Updating progress for User ${req.user.userId}, Project ${projectId}`);

    await p.execute(
      `INSERT INTO user_project_progress (user_id, project_id, completed_steps, is_completed, last_active_step, code_state) 
       VALUES (?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
         completed_steps = VALUES(completed_steps), 
         is_completed = VALUES(is_completed), 
         last_active_step = VALUES(last_active_step),
         code_state = VALUES(code_state)`,
      [
        req.user.userId, 
        projectId, 
        JSON.stringify(completedSteps || []), 
        isCompleted ? 1 : 0, 
        lastActiveStep || 0,
        codeState ? JSON.stringify(codeState) : null
      ]
    );

    const [project]: any = await p.execute('SELECT phase_id FROM phase_projects WHERE id = ?', [projectId]);
    if (project.length > 0) {
      const phaseId = project[0].phase_id;
      const [allProjects]: any = await p.execute('SELECT id FROM phase_projects WHERE phase_id = ?', [phaseId]);
      const totalProjects = allProjects.length;
      
      if (totalProjects > 0) {
        const projectIds = allProjects.map((ap: any) => ap.id);
        const placeholders = projectIds.map(() => '?').join(',');
        const [completedInPhase]: any = await p.execute(
          `SELECT COUNT(*) as count FROM user_project_progress WHERE user_id = ? AND project_id IN (${placeholders}) AND is_completed = 1`,
          [req.user.userId, ...projectIds]
        );
        
        const completedCount = completedInPhase[0].count;
        const percentage = Math.round((completedCount / totalProjects) * 100);
        
        // Only mark as completed IF they also have submissions? 
        // Actually, status 'completed' should be reserved for AFTER certification (badge) 
        // Let's keep status 'active' even at 100% until they certify.
        const status = percentage === 100 ? 'active' : 'active'; 
        
        console.log(`[DEBUG] Phase ${phaseId} Progress: ${percentage}% for User ${req.user.userId}`);

        await p.execute(
          `INSERT INTO user_phase_progress (user_id, phase_id, status, progress_percentage) 
           VALUES (?, ?, ?, ?) 
           ON DUPLICATE KEY UPDATE progress_percentage = VALUES(progress_percentage)`,
          [req.user.userId, phaseId, 'active', percentage]
        );
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('[ERROR] Progress Update Failed:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

router.post('/submission', authenticateToken, async (req: any, res) => {
  const { projectId, phaseId, githubUrl, liveUrl, description } = req.body;
  if (!projectId || !phaseId) return res.status(400).json({ error: 'Project ID and Phase ID are required' });

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    console.log(`[DEBUG] Saving submission for User ${req.user.userId}, Project ${projectId}`);

    await p.execute(
      `INSERT INTO project_submissions (user_id, project_id, phase_id, github_url, live_url, description) 
       VALUES (?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE github_url = VALUES(github_url), live_url = VALUES(live_url), description = VALUES(description)`,
      [req.user.userId, projectId, phaseId, githubUrl, liveUrl, description]
    );

    res.json({ success: true, message: 'Submission saved successfully' });
  } catch (error: any) {
    console.error('[ERROR] Submission Save Failed:', error);
    res.status(500).json({ error: 'Failed to save submission' });
  }
});

router.get('/progress', authenticateToken, async (req: any, res) => {
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const [phaseProgress]: any = await p.execute('SELECT * FROM user_phase_progress WHERE user_id = ?', [req.user.userId]);
    const [projectProgress]: any = await p.execute('SELECT * FROM user_project_progress WHERE user_id = ?', [req.user.userId]);

    res.json({ phaseProgress, projectProgress });
  } catch (error: any) {
    console.error('[ERROR] Fetch Progress Failed:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

router.post('/phase/:id/certify', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    console.log(`[DEBUG] Starting Certification for User ${req.user.userId}, Phase ${id}`);

    // 1. Check all projects completed
    const [allProjects]: any = await p.execute('SELECT id FROM phase_projects WHERE phase_id = ?', [id]);
    if (allProjects.length === 0) return res.status(400).json({ error: 'No projects found in this phase' });

    const projectIds = allProjects.map((ap: any) => ap.id);
    const placeholders = projectIds.map(() => '?').join(',');
    const [completed]: any = await p.execute(
      `SELECT COUNT(*) as count FROM user_project_progress WHERE user_id = ? AND project_id IN (${placeholders}) AND is_completed = 1`,
      [req.user.userId, ...projectIds]
    );

    if (completed[0].count < allProjects.length) {
      console.log(`[DEBUG] Certification Rejected: Only ${completed[0].count}/${allProjects.length} projects completed.`);
      return res.status(400).json({ error: 'Complete all builds to earn certification.' });
    }

    // 2. Check all projects submitted
    const [submissions]: any = await p.execute(
      `SELECT COUNT(*) as count FROM project_submissions WHERE user_id = ? AND project_id IN (${placeholders})`,
      [req.user.userId, ...projectIds]
    );

    if (submissions[0].count < allProjects.length) {
      console.log(`[DEBUG] Certification Rejected: Only ${submissions[0].count}/${allProjects.length} projects submitted.`);
      return res.status(400).json({ error: 'Project submissions (GitHub URL) are required for all builds.' });
    }

    // 3. Create Badge
    await p.execute(
      'INSERT IGNORE INTO badges (user_id, phase_id) VALUES (?, ?)',
      [req.user.userId, id]
    );

    // 4. Update Current Phase to COMPLETED
    await p.execute(
      'INSERT INTO user_phase_progress (user_id, phase_id, status, progress_percentage) VALUES (?, ?, "completed", 100) ON DUPLICATE KEY UPDATE status = "completed", progress_percentage = 100',
      [req.user.userId, id]
    );

    console.log(`[DEBUG] Phase ${id} marked COMPLETED for User ${req.user.userId}`);

    // 5. Unlock Next Phase
    const [currentPhase]: any = await p.execute('SELECT order_index FROM phases WHERE id = ?', [id]);
    if (currentPhase.length > 0) {
      const nextOrder = currentPhase[0].order_index + 1;
      const [nextPhase]: any = await p.execute('SELECT id FROM phases WHERE order_index = ?', [nextOrder]);
      if (nextPhase.length > 0) {
        await p.execute(
          'INSERT INTO user_phase_progress (user_id, phase_id, status) VALUES (?, ?, "active") ON DUPLICATE KEY UPDATE status = "active"',
          [req.user.userId, nextPhase[0].id]
        );
        console.log(`[DEBUG] Phase ${nextPhase[0].id} UNLOCKED (status: active) for User ${req.user.userId}`);
      }
    }

    res.json({ success: true, message: 'Phase certified! Badge earned.' });
  } catch (error: any) {
    console.error('[ERROR] Certification failed:', error);
    res.status(500).json({ error: 'Failed to certify phase' });
  }
});

export default router;
