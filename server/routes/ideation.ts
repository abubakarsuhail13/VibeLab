import express from 'express';
import { GoogleGenAI, Type } from "@google/genai";
import { getPool } from '../db.js';
import { authenticateToken } from '../auth.js';

const router = express.Router();

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment settings. If you are deploying on Vercel, please define GEMINI_API_KEY in your Project Dashboard Environment Variables.');
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// 1. POST /api/ideation/start
router.post('/start', authenticateToken, async (req: any, res) => {
  const { force_new } = req.body || {};
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const userId = req.user.userId;

    if (force_new) {
      // Mark any prior in_progress sessions as completed to archive them
      await p.execute(
        'UPDATE ideation_sessions SET status = "completed", completed_at = CURRENT_TIMESTAMP WHERE user_id = ? AND status = "in_progress"',
        [userId]
      );
    } else {
      // Check if there is already an active in_progress session to resume
      const [existing]: any = await p.execute(
        'SELECT id FROM ideation_sessions WHERE user_id = ? AND status = "in_progress" ORDER BY id DESC LIMIT 1',
        [userId]
      );

      if (existing && existing.length > 0) {
        return res.json({
          session_id: existing[0].id,
          opening_message: "Let's pick up where we left off."
        });
      }
    }

    // Create a brand new in-progress ideation session
    const [result]: any = await p.execute(
      'INSERT INTO ideation_sessions (user_id, status) VALUES (?, ?)',
      [userId, 'in_progress']
    );

    res.json({
      session_id: result.insertId,
      opening_message: "Let's discover what is worth building."
    });
  } catch (error: any) {
    console.error('Ideation Start Error:', error);
    res.status(500).json({ error: 'Failed to start ideation session' });
  }
});

// GET /api/ideation/active-session
router.get('/active-session', authenticateToken, async (req: any, res) => {
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const userId = req.user.userId;

    const [rows]: any = await p.execute(
      'SELECT id FROM ideation_sessions WHERE user_id = ? AND status = "in_progress" ORDER BY id DESC LIMIT 1',
      [userId]
    );

    if (rows && rows.length > 0) {
      return res.json({ session_id: rows[0].id });
    }

    res.json({ session_id: null });
  } catch (error: any) {
    console.error('Fetch Active Session Error:', error);
    res.status(500).json({ error: 'Failed to check active session' });
  }
});

// GET /api/ideation/session/:sessionId/history
router.get('/session/:sessionId/history', authenticateToken, async (req: any, res) => {
  const { sessionId } = req.params;
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const [responses]: any = await p.execute(
      'SELECT id, story_number, story_code, question_text, user_response, ai_followup FROM ideation_responses WHERE session_id = ? ORDER BY id ASC',
      [sessionId]
    );

    if (responses.length === 0) {
      return res.json({
        history: [],
        currIndex: 0,
        completedPercent: 0
      });
    }

    // Reconstruct history
    const history: any[] = [
      {
        id: "init-1",
        sender: "ai",
        text: "Let's discover what is worth building."
      },
      {
        id: "init-2",
        sender: "ai",
        text: responses[0].question_text
      }
    ];

    let lastNextStoryNum = 1;

    for (let i = 0; i < responses.length; i++) {
      const r = responses[i];
      let aiText = '';
      let nextNum = r.story_number + 1;

      if (r.ai_followup) {
        try {
          const parsed = JSON.parse(r.ai_followup);
          aiText = parsed.text || '';
          if (parsed.next_story_number) {
            nextNum = parsed.next_story_number;
          }
        } catch (_) {
          aiText = r.ai_followup;
        }
      }

      // User Answer
      history.push({
        id: `user-${r.id}`,
        sender: "user",
        text: r.user_response
      });

      // AI follow-up / next question message
      if (aiText) {
        history.push({
          id: `ai-${r.id}`,
          sender: "ai",
          text: aiText
        });
      }

      lastNextStoryNum = nextNum;
    }

    // Find currIndex corresponding to lastNextStoryNum
    let currIndex = lastNextStoryNum ? (lastNextStoryNum - 1) : 0;
    if (currIndex < 0) currIndex = 0;
    if (currIndex > 12) currIndex = 12;

    const completedPercent = Math.round((currIndex / 13) * 100);

    res.json({
      history,
      currIndex,
      completedPercent
    });
  } catch (error: any) {
    console.error('Fetch Session History Error:', error);
    res.status(500).json({ error: 'Failed to retrieve session history' });
  }
});

// 2. POST /api/ideation/respond
router.post('/respond', authenticateToken, async (req: any, res) => {
  const { session_id, story_number, story_code, question_text, user_response } = req.body;

  if (!session_id || !story_number || !story_code || !question_text || user_response === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    // Save user response first
    await p.execute(
      'INSERT INTO ideation_responses (session_id, story_number, story_code, question_text, user_response) VALUES (?, ?, ?, ?, ?)',
      [session_id, story_number, story_code, question_text, user_response]
    );

    // Standard list of questions to find next questions and descriptions
    const QUESTIONS = [
      { number: 1, text: "What do you enjoy doing the most?" },
      { number: 2, text: "What problem or frustration do you face often?" },
      { number: 3, text: "Who else faces this problem?" },
      { number: 4, text: "How are people solving it today?" },
      { number: 5, text: "What do you dislike about the current solution?" },
      { number: 6, text: "If you could magically fix this problem, what would your solution do?" },
      { number: 7, text: "Do you think AI could help solve it? How?" },
      { number: 8, text: "Would a website, app, chatbot, or smart device work best?" },
      { number: 9, text: "What is the most important feature of your solution?" },
      { number: 10, text: "If you had only one week, what is the simplest version you could build?" },
      { number: 11, text: "How would you know your solution is helping people?" },
      { number: 12, text: "Why are you excited about building this project?" },
      { number: 13, text: "If this project succeeds, how will someone's life become easier or better?" }
    ];

    const encouragements: Record<number, string> = {
      1: "Awesome! Let's explore that deeper.",
      2: "That sounds like a real frustration. Let's look at who else experiences this.",
      3: "It's always great to identify who we're helping. How are they solving it today?",
      4: "Interesting to see how they manage now. What do you dislike about those solutions?",
      5: "Exactly, that's where your opportunity lies! If you could magically fix it, what would your solution do?",
      6: "That is a brilliant vision! Do you think AI could help solve it? How?",
      7: "AI can definitely add a lot of value there. Would a website, app, chatbot, or smart device work best?",
      8: "Perfect choice for this kind of solution. What is the most important feature of your solution?",
      9: "Focusing on that key feature is super smart. If you had only one week, what is the simplest version you could build?",
      10: "An excellent way to scope down the MVP. How would you know your solution is helping people?",
      11: "A great metric to measure impact. Why are you excited about building this project?",
      12: "That passion is what will drive this project! If this project succeeds, how will someone's life become easier or better?",
      13: "Beautifully said. This will make a real difference."
    };

    const followUps: Record<number, string> = {
      1: "Boht khoob! Kya aap is baare me thora aur bata sakte hain? What do you like most about it?",
      2: "Ye to kafi pareshan-kun hai. How often do you face this issue in your daily life?",
      3: "I see. Do your friends, family, or other students also talk about this problem?",
      4: "Sahi. Wo abhi isko hal karne ke liye kya tareeqa ya tools use karte hain?",
      5: "Got it. What makes that current solution slow, expensive, or annoying?",
      6: "That sounds amazing! If there were no limits, what is the main feature of this solution?",
      7: "AI can do wonders. Do you imagine it predicting something, generating text, or classifying data?",
      8: "Nice choice. Why do you think that specific format (web/app/device) is the best fit?",
      9: "Zabardast! Is feature ko chalate waqt user ko sab se pehle kya dikhega or do?",
      10: "Keep it simple! What is the absolute bare minimum screen or feature you need first?",
      11: "Good metric. Would you look at daily active users, or positive feedback ratings?",
      12: "Love that motivation! What is the single biggest thing you hope to learn from it?",
      13: "That's a powerful vision. Can you sum up that impact in a few words?"
    };

    // Determine if the current answer is vague/short (less than 4 words)
    const words = user_response.trim().split(/\s+/).filter(Boolean);
    const isVagueOrShort = words.length < 4;

    // Check if we've already asked a follow-up for this story_number in this session
    const [existingRows]: any = await p.execute(
      'SELECT id FROM ideation_responses WHERE session_id = ? AND story_number = ?',
      [session_id, story_number]
    );
    const alreadyAskedFollowUp = existingRows.length > 1;

    let ai_message = "";
    let next_story_number: number | null = null;
    let next_question: string | null = null;
    let is_complete = false;

    if (isVagueOrShort && !alreadyAskedFollowUp && followUps[story_number]) {
      // Ask follow-up for the current story number
      ai_message = followUps[story_number];
      next_story_number = story_number;
      next_question = question_text;
      is_complete = false;
    } else {
      // Progress to the next question
      if (story_number >= 13) {
        is_complete = true;
        ai_message = "Mubarak ho! We have completed all 13 discovery questions. Now I am ready to generate your customized product blueprint. Let's do it!";
        next_story_number = null;
        next_question = null;
      } else {
        next_story_number = story_number + 1;
        const nextQObj = QUESTIONS.find(q => q.number === next_story_number);
        next_question = nextQObj ? nextQObj.text : null;
        is_complete = false;
        ai_message = `${encouragements[story_number]} Next question: ${next_question}`;
      }
    }

    // Always save the AI's response message details inside ai_followup as JSON so we can rebuild history on resume
    const followupPayload = JSON.stringify({
      text: ai_message,
      next_story_number: next_story_number
    });

    await p.execute(
      'UPDATE ideation_responses SET ai_followup = ? WHERE session_id = ? AND story_number = ? ORDER BY id DESC LIMIT 1',
      [followupPayload, session_id, story_number]
    );

    res.json({
      ai_message,
      next_story_number,
      next_question,
      is_complete
    });
  } catch (error: any) {
    console.error('Ideation Respond Error:', error);
    res.status(500).json({ error: error.message || 'Failed to process response' });
  }
});

// 3. POST /api/ideation/generate-blueprint
router.post('/generate-blueprint', authenticateToken, async (req: any, res) => {
  const { session_id } = req.body;
  if (!session_id) return res.status(400).json({ error: 'Session ID is required' });

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const userId = req.user.userId;

    // Fetch all 13 responses from responses table ordered sequentially
    const [responses]: any = await p.execute(
      'SELECT story_number, question_text, user_response FROM ideation_responses WHERE session_id = ? ORDER BY id ASC',
      [session_id]
    );

    if (responses.length === 0) {
      return res.status(404).json({ error: 'No answers found for this session' });
    }

    const answersSummary = responses.map((r: any) => {
      return `Question ${r.story_number} ("${r.question_text}"):\nAnswer: "${r.user_response}"`;
    }).join('\n\n');

     const prompt = `
      You are an AI product analyst for VibeLab. A student aged 14-22 answered 13 questions.
      Generate their Product Blueprint from these answers.

      Student's Responses:
      ${answersSummary}

      NATURAL LANGUAGE COMPREHENSION RULE:
      - The student's responses may be written in English, Urdu, Roman Urdu (e.g., "mujy website banani hay"), or Mixed English and Urdu.
      - Intelligently parse and translate these responses into standard, clear, and professional English to populate the blueprint fields.

      RULES:
      - Simple, encouraging language only.
      - Honest about complexity: beginner = 1-2 weeks basic Python + one API,
        intermediate = 2-4 weeks with AI integration, advanced = 4+ weeks multi-system.
      - Learning path must be ordered easiest first.
      - AI opportunity map must name SPECIFIC AI approaches, not vague descriptions.
      - If idea is too large, scope it down and explain in mvp_note.

      Return ONLY valid JSON, no markdown, no backticks, no preamble:
      {
        "problem_statement": "one clear sentence",
        "target_user_persona": "2-3 sentences about who they are and why this matters",
        "solution_concept": "1-2 sentences on what the product does",
        "ai_opportunity_map": ["specific AI approach 1", "specific AI approach 2", "specific AI approach 3"],
        "mvp_definition": "simplest 1-week build that proves the idea (2-3 sentences)",
        "learning_path": ["Skill 1 — why needed", "Skill 2 — why needed", "Skill 3 — why needed"],
        "product_name": "short catchy name",
        "product_features": ["Feature 1", "Feature 2", "Feature 3"],
        "complexity": "beginner | intermediate | advanced",
        "estimated_build_time": "e.g. 2 weeks",
        "recommended_track": "Software + AI | Hardware + AI | Data + AI",
        "mvp_note": "only if scoped down — explain what was simplified and why — otherwise null"
      }
    `;

    const response = await getGeminiClient().models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const raw = response.text || '';
    let cleanText = raw.trim();
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanText = jsonMatch[0];
    } else {
      cleanText = cleanText.replace(/```json|```/g, '').trim();
    }
    const blueprint = JSON.parse(cleanText);

    // Save blueprint to project_blueprints table
    await p.execute(
      `INSERT INTO project_blueprints (
        user_id, session_id, problem_statement, target_user_persona, solution_concept,
        ai_opportunity_map, mvp_definition, learning_path, product_name, product_features,
        complexity, estimated_build_time, recommended_track, mvp_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        session_id,
        blueprint.problem_statement,
        blueprint.target_user_persona,
        blueprint.solution_concept,
        JSON.stringify(blueprint.ai_opportunity_map),
        blueprint.mvp_definition,
        JSON.stringify(blueprint.learning_path),
        blueprint.product_name,
        JSON.stringify(blueprint.product_features),
        blueprint.complexity,
        blueprint.estimated_build_time,
        blueprint.recommended_track,
        blueprint.mvp_note
      ]
    );

    // Set ideation_session status = completed
    await p.execute(
      'UPDATE ideation_sessions SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['completed', session_id]
    );

    // Mark user ideation completion
    await p.execute(
      'UPDATE users SET ideation_completed = TRUE, ideation_completed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );

    // Fetch Phase 1 Id and Phase 2 Id
    const [p1Rows]: any = await p.execute('SELECT id FROM phases WHERE order_index = 1');
    const [p2Rows]: any = await p.execute('SELECT id FROM phases WHERE order_index = 2');
    const phase1Id = (p1Rows && p1Rows.length > 0) ? p1Rows[0].id : null;
    const phase2Id = (p2Rows && p2Rows.length > 0) ? p2Rows[0].id : null;

    // Set user progress to completed for Phase 1
    if (phase1Id) {
      await p.execute(
        'INSERT INTO user_phase_progress (user_id, phase_id, status, progress_percentage) VALUES (?, ?, "completed", 100) ON DUPLICATE KEY UPDATE status = "completed", progress_percentage = 100',
        [userId, phase1Id]
      );
    }

    // Set user progress active for Phase 2 (Product Creation)
    if (phase2Id) {
      await p.execute(
        'INSERT INTO user_phase_progress (user_id, phase_id, status) VALUES (?, ?, "active") ON DUPLICATE KEY UPDATE status = "active"',
        [userId, phase2Id]
      );
    }

    res.json({ blueprint });
  } catch (error: any) {
    console.error('Blueprint Generation Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate product blueprint' });
  }
});

// 4. GET /api/ideation/blueprint
router.get('/blueprint', authenticateToken, async (req: any, res) => {
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const userId = req.user.userId;

    const [rows]: any = await p.execute(
      'SELECT * FROM project_blueprints WHERE user_id = ? ORDER BY id DESC LIMIT 1',
      [userId]
    );

    if (rows.length === 0) {
      return res.json(null);
    }

    const blueprint = rows[0];
    try { blueprint.ai_opportunity_map = typeof blueprint.ai_opportunity_map === 'string' ? JSON.parse(blueprint.ai_opportunity_map) : blueprint.ai_opportunity_map; } catch (_) {}
    try { blueprint.learning_path = typeof blueprint.learning_path === 'string' ? JSON.parse(blueprint.learning_path) : blueprint.learning_path; } catch (_) {}
    try { blueprint.product_features = typeof blueprint.product_features === 'string' ? JSON.parse(blueprint.product_features) : blueprint.product_features; } catch (_) {}

    res.json(blueprint);
  } catch (error: any) {
    console.error('Fetch Blueprint Error:', error);
    res.status(500).json({ error: 'Failed to retrieve blueprint' });
  }
});

// 4b. GET /api/ideation/blueprints
router.get('/blueprints', authenticateToken, async (req: any, res) => {
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const userId = req.user.userId;

    const [rows]: any = await p.execute(
      'SELECT * FROM project_blueprints WHERE user_id = ? ORDER BY id DESC',
      [userId]
    );

    // parse JSON fields
    for (const row of rows) {
      try { row.ai_opportunity_map = typeof row.ai_opportunity_map === 'string' ? JSON.parse(row.ai_opportunity_map) : row.ai_opportunity_map; } catch (_) {}
      try { row.learning_path = typeof row.learning_path === 'string' ? JSON.parse(row.learning_path) : row.learning_path; } catch (_) {}
      try { row.product_features = typeof row.product_features === 'string' ? JSON.parse(row.product_features) : row.product_features; } catch (_) {}
    }

    res.json(rows);
  } catch (error: any) {
    console.error('Fetch Blueprints Error:', error);
    res.status(500).json({ error: 'Failed to retrieve blueprints' });
  }
});

// 4c. POST /api/ideation/blueprints/:id/reuse
router.post('/blueprints/:id/reuse', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const userId = req.user.userId;

    const [rows]: any = await p.execute(
      'SELECT * FROM project_blueprints WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Blueprint not found' });
    }

    const blueprint = rows[0];

    // Create a new copy of it to make it the latest one (LIMIT 1)
    await p.execute(
      `INSERT INTO project_blueprints (
        user_id, session_id, problem_statement, target_user_persona, solution_concept,
        ai_opportunity_map, mvp_definition, learning_path, product_name, product_features,
        complexity, estimated_build_time, recommended_track, mvp_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        blueprint.session_id,
        blueprint.problem_statement,
        blueprint.target_user_persona,
        blueprint.solution_concept,
        typeof blueprint.ai_opportunity_map === 'string' ? blueprint.ai_opportunity_map : JSON.stringify(blueprint.ai_opportunity_map),
        blueprint.mvp_definition,
        typeof blueprint.learning_path === 'string' ? blueprint.learning_path : JSON.stringify(blueprint.learning_path),
        blueprint.product_name,
        typeof blueprint.product_features === 'string' ? blueprint.product_features : JSON.stringify(blueprint.product_features),
        blueprint.complexity,
        blueprint.estimated_build_time,
        blueprint.recommended_track,
        blueprint.mvp_note
      ]
    );

    res.json({ success: true, message: 'Blueprint restored as active!' });
  } catch (error: any) {
    console.error('Reuse Blueprint Error:', error);
    res.status(500).json({ error: 'Failed to restore blueprint' });
  }
});

// 4d. DELETE /api/ideation/blueprints/:id
router.delete('/blueprints/:id', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const userId = req.user.userId;

    await p.execute(
      'DELETE FROM project_blueprints WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    res.json({ success: true, message: 'Blueprint deleted successfully' });
  } catch (error: any) {
    console.error('Delete Blueprint Error:', error);
    res.status(500).json({ error: 'Failed to delete blueprint' });
  }
});

// 5. GET /api/ideation/blueprint/:vl_id
router.get('/blueprint/:vl_id', async (req: any, res) => {
  const { vl_id } = req.params;
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const [rows]: any = await p.execute(
      `SELECT pb.*, u.name as student_name, u.avatar_url 
       FROM project_blueprints pb
       JOIN users u ON pb.user_id = u.id
       WHERE u.vl_id = ?
       ORDER BY pb.id DESC LIMIT 1`,
      [vl_id]
    );

    if (rows.length === 0) {
      return res.json(null);
    }

    const blueprint = rows[0];
    try { blueprint.ai_opportunity_map = typeof blueprint.ai_opportunity_map === 'string' ? JSON.parse(blueprint.ai_opportunity_map) : blueprint.ai_opportunity_map; } catch (_) {}
    try { blueprint.learning_path = typeof blueprint.learning_path === 'string' ? JSON.parse(blueprint.learning_path) : blueprint.learning_path; } catch (_) {}
    try { blueprint.product_features = typeof blueprint.product_features === 'string' ? JSON.parse(blueprint.product_features) : blueprint.product_features; } catch (_) {}

    const [mvpRows]: any = await p.execute(
      `SELECT mb.screenshot_url, mb.skills_learned
       FROM mvp_builds mb
       JOIN product_sessions ps ON mb.session_id = ps.id
       JOIN users u ON ps.user_id = u.id
       WHERE u.vl_id = ? AND mb.status = 'approved'
       ORDER BY mb.id DESC LIMIT 1`,
      [vl_id]
    );

    if (mvpRows.length > 0) {
      blueprint.screenshot_url = mvpRows[0].screenshot_url;
      blueprint.skills_learned = mvpRows[0].skills_learned;
    }

    res.json(blueprint);
  } catch (error: any) {
    console.error('Fetch Public Blueprint Error:', error);
    res.status(500).json({ error: 'Failed to retrieve public blueprint' });
  }
});

// 4e. PUT /api/ideation/blueprint
router.put('/blueprint', authenticateToken, async (req: any, res) => {
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const userId = req.user.userId;

    // Check if Phase 1 has been certified (hasBadge is true for Phase 1)
    const [p1Rows]: any = await p.execute('SELECT id FROM phases WHERE order_index = 1');
    if (p1Rows && p1Rows.length > 0) {
      const p1Id = p1Rows[0].id;
      const [certified]: any = await p.execute(
        'SELECT id FROM badges WHERE user_id = ? AND phase_id = ?',
        [userId, p1Id]
      );
      if (certified.length > 0) {
        return res.status(400).json({ error: 'Certified Idea Blueprint Locked: This idea is certified as part of your certified Phase 1 portfolio and cannot be modified.' });
      }
    }

    const { product_name, problem_statement, target_user_persona, solution_concept } = req.body;

    // First check if there is an existing blueprint
    const [existing]: any = await p.execute(
      'SELECT id FROM project_blueprints WHERE user_id = ? ORDER BY id DESC LIMIT 1',
      [userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'No blueprint found to update' });
    }

    const bpId = existing[0].id;

    await p.execute(
      `UPDATE project_blueprints 
       SET product_name = ?, problem_statement = ?, target_user_persona = ?, solution_concept = ?
       WHERE id = ? AND user_id = ?`,
      [product_name, problem_statement, target_user_persona, solution_concept, bpId, userId]
    );

    res.json({ success: true, message: 'Blueprint updated successfully!' });
  } catch (error: any) {
    console.error('Update Blueprint Error:', error);
    res.status(500).json({ error: 'Failed to update blueprint' });
  }
});

export default router;
