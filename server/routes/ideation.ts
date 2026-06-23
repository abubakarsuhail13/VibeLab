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

    // Fetch the context details for the current session to pass to Gemini
    const [historyRows]: any = await p.execute(
      'SELECT story_number, question_text, user_response, ai_followup FROM ideation_responses WHERE session_id = ? ORDER BY id ASC',
      [session_id]
    );

    const previousAnswersText = historyRows.map((r: any) => {
      let aiText = '';
      if (r.ai_followup) {
        try {
          const parsedFollowup = JSON.parse(r.ai_followup);
          aiText = parsedFollowup.text || '';
        } catch (_) {
          aiText = r.ai_followup;
        }
      }
      return `Question ${r.story_number}: "${r.question_text}"\nAnswer: "${r.user_response}"${aiText ? `\nFollowup Question: "${aiText}"` : ''}`;
    }).join('\n\n');

    const prompt = `
      You are a friendly AI mentor inside VibeLab for students aged 14-22.
      Help the student discover a project idea. Be warm and encouraging always.

      The student is responding to story_number: ${story_number} (${story_code}).
      The 13 questions IN ORDER:
      1. What do you enjoy doing the most?
      2. What problem or frustration do you face often?
      3. Who else faces this problem?
      4. How are people solving it today?
      5. What do you dislike about the current solution?
      6. If you could magically fix this problem, what would your solution do?
      7. Do you think AI could help solve it? How?
      8. Would a website, app, chatbot, or smart device work best?
      9. What is the most important feature of your solution?
      10. If you had only one week, what is the simplest version you could build?
      11. How would you know your solution is helping people?
      12. Why are you excited about building this project?
      13. If this project succeeds, how will someone's life become easier or better?

      Previous QA History in this session:
      ${previousAnswersText}

      Latest Question: "${question_text}"
      Latest User Response: "${user_response}"

      NATURAL LANGUAGE UNDERSTANDING & COGNITIVE DIVERSITY PROTOCOL:
      - The student may describe their ideas using English, Urdu, Roman Urdu (Urdu written in Latin letters, e.g., "mujy website banani hay", "hospital management system banana hai", "students k liye platform", "AI se resume builder banana hai"), Mixed English and Urdu, informal or beginner language, short phrases, incomplete sentences, or vague/non-technical wording.
      - Intelligently extract meaning, intended project idea, and context from the user's message without requiring any specific keywords, technical language, structured formats, or predefined schemas. Do not force them to use technical terms.
      - If the user responds in Roman Urdu, Urdu, or mixed Roman Urdu/English, respond naturally in a warm, friendly blend of Roman Urdu and simple English (Hinglish/Urdu-English code-switching) so they feel deeply understood, validated, and comfortable.
      - Always look at the previous QA history to contextualize their short/vague responses (such as "food delivery app" or "students k liye platform"). Infer reasonable context, build on their ideas, and continue the existing discovery conversation naturally without forcing them to repeat information they have already provided.
      - When the user expresses an idea like "mujy website banani hay" or "I want to build an app", immediately recognize that this is a valid project intent. Map it to their desired solution space and proceed smoothly to the next relevant question based on your current understanding.

      RULES:
      - ONE question per message. Never combine two.
      - After each answer: one sentence of encouragement, then the next question.
      - If user's latest response is under 10 words or vague, and you haven't asked a follow-up for this question (${story_number}) yet in the history, you MUST ask ONE gentle follow-up question instead of moving to the next question.
      - If you already asked a follow-up for this question previously in the history, do not ask another follow-up. Move to the next question.
      - No jargon. No formal language. Max 3 sentences total per message.
      - Ask questions in strict order. Do not skip any.

      Return ONLY valid JSON:
      {
        "ai_message": "your encouragement + next question/followup question as a single friendly message string",
        "next_story_number": <the number of the next question as integer, or the same story_number if asking a followup. If question 13 is fully answered successfully, write null>,
        "next_question": "<the text of the next question, or the followup question if asking a followup. If finished, write null>",
        "is_complete": <true if question 13 was answered and no followup is needed, false otherwise>
      }
    `;

    const response = await getGeminiClient().models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const resultText = response.text || '{}';
    let cleanText = resultText.trim();
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanText = jsonMatch[0];
    } else {
      cleanText = cleanText.replace(/```json|```/g, '').trim();
    }
    const parsed = JSON.parse(cleanText);

    let next_story_number = parsed.next_story_number;
    let next_question = parsed.next_question;
    let is_complete = !!parsed.is_complete;

    // Normalize for final completed states
    if (is_complete || (story_number >= 13 && next_story_number !== story_number)) {
      is_complete = true;
      next_story_number = null;
      next_question = null;
    }

    // Always save the AI's response message details inside ai_followup as JSON so we can rebuild history on resume
    const followupPayload = JSON.stringify({
      text: parsed.ai_message,
      next_story_number: next_story_number
    });

    await p.execute(
      'UPDATE ideation_responses SET ai_followup = ? WHERE session_id = ? AND story_number = ? ORDER BY id DESC LIMIT 1',
      [followupPayload, session_id, story_number]
    );

    res.json({
      ai_message: parsed.ai_message,
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
