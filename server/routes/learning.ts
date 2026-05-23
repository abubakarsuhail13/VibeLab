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
      progress_percentage: progress.length > 0 ? progress[0].progress_percentage : 0,
      topics_checklist: progress.length > 0 && progress[0].topics_checklist ? (typeof progress[0].topics_checklist === 'string' ? JSON.parse(progress[0].topics_checklist) : progress[0].topics_checklist) : []
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

// GET specialized resources for a given phase
router.get('/phase/:id/resources', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });
    
    const [rows] = await p.execute('SELECT * FROM phase_resources WHERE phase_id = ?', [id]);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve resources' });
  }
});

// GET trivia multiple choice questions for a phase
router.get('/phase/:id/quiz', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });
    
    // Check if they already passed to show status or handle cooldown warning
    const [bestAttempt]: any = await p.execute(
      'SELECT id, score, passed, attempted_at FROM quiz_attempts WHERE user_id = ? AND phase_id = ? ORDER BY score DESC, attempted_at DESC LIMIT 1',
      [req.user.userId, id]
    );

    const [rows]: any = await p.execute('SELECT id, question, options FROM quiz_questions WHERE phase_id = ?', [id]);
    // Retrieve up to 10 randomized quiz questions
    const shuffled = rows.sort(() => 0.5 - Math.random()).slice(0, 10);
    
    res.json({
      questions: shuffled,
      previousAttempt: bestAttempt.length > 0 ? bestAttempt[0] : null
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve quiz questions' });
  }
});

// POST submit quiz answers and calculate results
router.post('/phase/:id/quiz/submit', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const { answers } = req.body; // Array of { questionId: number, selectedIndex: number }
  if (!answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'Answers must be provided as an array.' });
  }
  
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });
    
    // Cooldown verification: once passed, 24 hours cooldown operates
    const [latestPass]: any = await p.execute(
      'SELECT attempted_at FROM quiz_attempts WHERE user_id = ? AND phase_id = ? AND passed = 1 ORDER BY attempted_at DESC LIMIT 1',
      [req.user.userId, id]
    );
    if (latestPass.length > 0) {
      const lastPassTime = new Date(latestPass[0].attempted_at).getTime();
      const now = Date.now();
      const diffHours = (now - lastPassTime) / (1000 * 60 * 60);
      if (diffHours < 24) {
        return res.status(429).json({ 
          cooldown: true,
          message: `Quiz retake cooldown: You have already certified/passed this quiz. Please wait ${Math.ceil(24 - diffHours)} hours before retaking.` 
        });
      }
    }
    
    const [questions]: any = await p.execute('SELECT id, correct_index FROM quiz_questions WHERE phase_id = ?', [id]);
    let correctCount = 0;
    
    for (const ans of answers) {
      const question = questions.find((q: any) => q.id === ans.questionId);
      if (question && question.correct_index === ans.selectedIndex) {
        correctCount++;
      }
    }
    
    const totalQuestions = questions.length || 1;
    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= 70;
    
    await p.execute(
      'INSERT INTO quiz_attempts (user_id, phase_id, score, passed) VALUES (?, ?, ?, ?)',
      [req.user.userId, id, score, passed ? 1 : 0]
    );
    
    res.json({
      success: true,
      score,
      passed,
      correctCount,
      totalQuestions
    });
  } catch (err: any) {
    console.error('Quiz submit error:', err);
    res.status(500).json({ error: 'Failed to submit quiz answers' });
  }
});

// GET users habits log
router.get('/habits', authenticateToken, async (req: any, res) => {
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });
    
    const [rows] = await p.execute(
      'SELECT log_date, learn_minutes, build_minutes FROM habit_logs WHERE user_id = ? ORDER BY log_date ASC',
      [req.user.userId]
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve habit logs' });
  }
});

// POST log minutes of learn/build effort
router.post('/habits', authenticateToken, async (req: any, res) => {
  const { logDate, learnMinutes, buildMinutes } = req.body;
  if (!logDate) return res.status(400).json({ error: 'logDate is required (YYYY-MM-DD)' });
  
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });
    
    await p.execute(
      `INSERT INTO habit_logs (user_id, log_date, learn_minutes, build_minutes) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
         learn_minutes = learn_minutes + ?, 
         build_minutes = build_minutes + ?`,
      [req.user.userId, logDate, learnMinutes || 0, buildMinutes || 0, learnMinutes || 0, buildMinutes || 0]
    );
    res.json({ success: true, message: 'Habit logged successfully' });
  } catch (err: any) {
    console.error('Habit log error:', err);
    res.status(500).json({ error: 'Failed to log daily effort' });
  }
});

// Save topics checklist checklist checklist state (honesty-based)
router.post('/phase/:id/checklist', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const { checklist } = req.body; // Array list of strings
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    await p.execute(
      `INSERT INTO user_phase_progress (user_id, phase_id, topics_checklist) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE topics_checklist = VALUES(topics_checklist)`,
      [req.user.userId, id, JSON.stringify(checklist || [])]
    );
    res.json({ success: true, message: 'Checklist updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update checked topics list.' });
  }
});

function getRequiredSubmissionsCount(orderIndex: number): number {
  if (orderIndex === 1) return 2;
  if (orderIndex === 2) return 2;
  if (orderIndex === 3) return 3;
  if (orderIndex === 4) return 2;
  if (orderIndex === 5) return 1;
  if (orderIndex === 6) return 1;
  if (orderIndex === 7) return 1;
  return 1;
}

function getBadgeName(orderIndex: number): string {
  if (orderIndex === 1) return 'Python Builder';
  if (orderIndex === 2) return 'LLM Fundamentalist';
  if (orderIndex === 3) return 'AI Maker';
  if (orderIndex === 4) return 'Agent Architect';
  if (orderIndex === 5) return 'Research Reader';
  if (orderIndex === 6) return 'Course Graduate';
  if (orderIndex === 7) return 'Deployed Builder';
  return 'Certified Alumnus';
}

router.post('/phase/:id/certify', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    console.log(`[DEBUG] Starting Certification for User ${req.user.userId}, Phase ${id}`);

    // Retrieve phase sequence details
    const [currentPhase]: any = await p.execute('SELECT name, order_index FROM phases WHERE id = ?', [id]);
    if (currentPhase.length === 0) return res.status(404).json({ error: 'Phase not found' });
    const orderIndex = currentPhase[0].order_index;
    const phaseName = currentPhase[0].name;

    // Condition 1: Verify Minimum Required Project Submissions with valid GitHub URLs
    const [allProjects]: any = await p.execute('SELECT id FROM phase_projects WHERE phase_id = ?', [id]);
    if (allProjects.length === 0) return res.status(400).json({ error: 'No projects found in this phase' });

    const projectIds = allProjects.map((ap: any) => ap.id);
    const placeholders = projectIds.map(() => '?').join(',');
    const [submissions]: any = await p.execute(
      `SELECT COUNT(*) as count FROM project_submissions WHERE user_id = ? AND project_id IN (${placeholders}) AND github_url IS NOT NULL AND github_url != ''`,
      [req.user.userId, ...projectIds]
    );

    const requiredCount = getRequiredSubmissionsCount(orderIndex);
    if (submissions[0].count < requiredCount) {
      console.log(`[DEBUG] Certification Rejected: Only ${submissions[0].count}/${requiredCount} projects submitted.`);
      return res.status(400).json({ 
        error: `Certification Condition Failed: You must submit at least ${requiredCount} project(s) with valid GitHub details to certify. Successfully verified: ${submissions[0].count}/${requiredCount}` 
      });
    }

    // Condition 2: Verify Quiz Is Passed (score >= 70%)
    const [quizAttempt]: any = await p.execute(
      'SELECT score, passed FROM quiz_attempts WHERE user_id = ? AND phase_id = ? AND passed = 1 LIMIT 1',
      [req.user.userId, id]
    );
    if (quizAttempt.length === 0) {
      console.log(`[DEBUG] Certification Rejected: Quiz not passed.`);
      return res.status(400).json({ 
        error: 'Certification Condition Failed: You must complete and pass the Phase Quiz (score >= 70%) to certify. Take the Quiz inside the Phase view!'
      });
    }

    // Condition 3: Topics Checklist Reviewed (stored in user_phase_progress checklist) - self-reported
    const [progressRow]: any = await p.execute(
      'SELECT topics_checklist FROM user_phase_progress WHERE user_id = ? AND phase_id = ?',
      [req.user.userId, id]
    );
    const checklist = progressRow.length > 0 && progressRow[0].topics_checklist ? JSON.parse(progressRow[0].topics_checklist) : [];
    if (!Array.isArray(checklist) || checklist.length === 0) {
      console.log(`[DEBUG] Certification Rejected: No topics checked.`);
      return res.status(400).json({
        error: 'Certification Condition Failed: Please review and check study topics in the checklist to confirm understanding before certifying.'
      });
    }

    // CREATE BADGE entry
    const badgeNameStr = getBadgeName(orderIndex);
    await p.execute(
      'INSERT IGNORE INTO badges (user_id, phase_id) VALUES (?, ?)',
      [req.user.userId, id]
    );

    // Update Phase status to COMPLETED
    await p.execute(
      'INSERT INTO user_phase_progress (user_id, phase_id, status, progress_percentage) VALUES (?, ?, "completed", 100) ON DUPLICATE KEY UPDATE status = "completed", progress_percentage = 100',
      [req.user.userId, id]
    );

    console.log(`[DEBUG] Phase ${id} marked COMPLETED for User ${req.user.userId}`);

    // Unlock Next Phase
    let nextPhaseText = '';
    const nextOrder = orderIndex + 1;
    const [nextPhase]: any = await p.execute('SELECT id, name FROM phases WHERE order_index = ?', [nextOrder]);
    if (nextPhase.length > 0) {
      nextPhaseText = nextPhase[0].name;
      await p.execute(
        'INSERT INTO user_phase_progress (user_id, phase_id, status) VALUES (?, ?, "active") ON DUPLICATE KEY UPDATE status = "active"',
        [req.user.userId, nextPhase[0].id]
      );
      console.log(`[DEBUG] Phase ${nextPhase[0].id} UNLOCKED (status: active) for User ${req.user.userId}`);
    }

    // SEND TRANSACTIONAL EMAILS ON CERTIFICATION SUCCESS AND NEXT PHASE UNLOCKED
    const [userRow]: any = await p.execute('SELECT email, name, vl_id FROM users WHERE id = ?', [req.user.userId]);
    if (userRow.length > 0) {
      const { sendMail } = await import('../mail.js');
      const studentEmail = userRow[0].email;
      const studentName = userRow[0].name;
      const studentVlId = userRow[0].vl_id;
      const baseUrl = process.env.VITE_APP_URL || 'https://vibe-lab-tan.vercel.app';

      // 1. Send Phase Complete Email containing profile link and Badge Details
      await sendMail({
        to: studentEmail,
        subject: `${phaseName} complete 🎉`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #0f172a, #1e293b); color: white; padding: 32px; text-align: center;">
              <span style="font-size: 48px;">🏆</span>
              <h1 style="margin: 12px 0 0 0; color: #0ea5e9; font-size: 24px;">Certification Earned!</h1>
              <p style="margin: 4px 0 0 0; opacity: 0.8; font-size: 14px;">VibeLab Anti-Gatekeeping Platform</p>
            </div>
            <div style="padding: 32px; background: white;">
              <p>Dear <strong>${studentName}</strong>,</p>
              <p>Congratulations! You have met all requirements and officially certified <strong>${phaseName}</strong>.</p>
              
              <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
                <span style="display: block; font-size: 32px; margin-bottom: 8px;">🎖️</span>
                <span style="display: block; font-weight: bold; color: #0f172a; font-size: 18px;">${badgeNameStr} Badge</span>
                <span style="font-size: 12px; color: #64748b; font-family: monospace;">Student ID: ${studentVlId}</span>
              </div>

              <p>Your certified badge and completed projects lists are now published live onto your global portfolio page!</p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${baseUrl}/profile/${studentVlId}" 
                   style="display: inline-block; background: #0ea5e9; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(14,165,233,0.3);">
                  View Live Public Profile
                </a>
              </div>
              <p style="font-size: 12px; color: #64748b; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">This certification hash is cryptographically verifiable by employers via the Employer Verification system.</p>
            </div>
          </div>
        `
      });

      // 2. Send Next Phase Unlocked Email (if a next phase was unlocked)
      if (nextPhaseText) {
        await sendMail({
          to: studentEmail,
          subject: `${nextPhaseText} is now unlocked!`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
              <div style="background: #0284c7; color: white; padding: 24px; text-align: center;">
                <span style="font-size: 40px;">🚀</span>
                <h1 style="margin: 8px 0 0 0; font-size: 20px;">Next Level Unlocked</h1>
              </div>
              <div style="padding: 24px; background: white;">
                <p>Hi ${studentName},</p>
                <p>Because you completed the last phase, <strong>${nextPhaseText}</strong> has been fully unlocked in your path progression!</p>
                <p>Log back into your sandbox dashboard to explore the new curriculum, checklist study topics, and complete the next high-value project builds.</p>
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${baseUrl}/dashboard" 
                     style="display: inline-block; background: #0f172a; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px;">
                    Resume My Path
                  </a>
                </div>
                <p>Keep building and anti-gatekeeping!</p>
              </div>
            </div>
          `
        });
      }
    }

    res.json({ success: true, message: 'Phase certified! Badge earned and transactional emails delivered.' });
  } catch (error: any) {
    console.error('[ERROR] Certification failed:', error);
    res.status(500).json({ error: 'Failed to certify phase' });
  }
});

export default router;
