import express from 'express';
import { GoogleGenAI } from "@google/genai";
import { getPool } from '../db.js';
import { authenticateToken } from '../auth.js';

const router = express.Router();

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment settings.');
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

function parseGeminiResponse(data: any): string {
  let raw = '';
  if (data && data.content && Array.isArray(data.content)) {
    raw = data.content.map((i: any) => i.text || '').join('');
  } else if (data && data.text) {
    raw = data.text;
  } else if (data && data.candidates && data.candidates[0]?.content?.parts) {
    raw = data.candidates[0].content.parts.map((p: any) => p.text || '').join('');
  } else if (data && data.candidates && data.candidates[0]?.content) {
    const content = data.candidates[0].content;
    if (Array.isArray(content.parts)) {
      raw = content.parts.map((i: any) => i.text || '').join('');
    } else if (content.text) {
      raw = content.text;
    }
  }
  
  return raw.replace(/```json|```|```html/g, '').trim();
}

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

    const [rows]: any = await p.execute('SELECT * FROM phases WHERE id = ?', [Number(id)]);
    if (rows.length === 0) return res.status(404).json({ error: 'Phase not found' });

    const phase = rows[0];
    const [progress]: any = await p.execute('SELECT * FROM user_phase_progress WHERE user_id = ? AND phase_id = ?', [req.user.userId, Number(id)]);

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

    const [projects]: any = await p.execute('SELECT * FROM phase_projects WHERE phase_id = ?', [Number(id)]);
    const [progress]: any = await p.execute(
      'SELECT project_id, completed_steps, is_completed, last_active_step, code_state FROM user_project_progress WHERE user_id = ?',
      [req.user.userId]
    );

    const projectsWithProgress = projects.map((project: any) => {
      const userProgress = progress.find((pr: any) => pr.project_id === project.id);
      
      let parsedRequirements = [];
      try {
        parsedRequirements = project.requirements ? (typeof project.requirements === 'string' ? JSON.parse(project.requirements) : project.requirements) : [];
      } catch (e) {
        console.error("Failed to parse project.requirements", e);
      }

      let parsedSteps = [];
      try {
        parsedSteps = project.steps ? (typeof project.steps === 'string' ? JSON.parse(project.steps) : project.steps) : [];
      } catch (e) {
        console.error("Failed to parse project.steps", e);
      }

      if (!parsedSteps || parsedSteps.length === 0) {
        parsedSteps = [
          {
            title: 'Core Implementation',
            desc: 'Read the project requirements and implement them using Vibe Coding.'
          }
        ];
      }

      let parsedTutorialData = [];
      try {
        parsedTutorialData = project.tutorial_data ? (typeof project.tutorial_data === 'string' ? JSON.parse(project.tutorial_data) : project.tutorial_data) : [];
      } catch (e) {
        console.error("Failed to parse project.tutorial_data", e);
      }

      let parsedCompletedSteps = [];
      if (userProgress && userProgress.completed_steps) {
        try {
          parsedCompletedSteps = typeof userProgress.completed_steps === 'string' ? JSON.parse(userProgress.completed_steps) : userProgress.completed_steps;
        } catch (e) {
          console.error("Failed to parse userProgress.completed_steps", e);
        }
      }

      return {
        ...project,
        requirements: parsedRequirements || [],
        steps: parsedSteps || [],
        tutorial_data: parsedTutorialData || [],
        completed_steps: parsedCompletedSteps || [],
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

    const [p1Rows]: any = await p.execute('SELECT id FROM phases WHERE order_index = 1');
    const [p2Rows]: any = await p.execute('SELECT id FROM phases WHERE order_index = 2');
    const [p3Rows]: any = await p.execute('SELECT id FROM phases WHERE order_index = 3');
    const [p4Rows]: any = await p.execute('SELECT id FROM phases WHERE order_index = 4');
    const [p5Rows]: any = await p.execute('SELECT id FROM phases WHERE order_index = 5');

    const actualPhase1Id = p1Rows && p1Rows.length > 0 ? p1Rows[0].id : 1;
    const actualPhase2Id = p2Rows && p2Rows.length > 0 ? p2Rows[0].id : 2;
    const actualPhase3Id = p3Rows && p3Rows.length > 0 ? p3Rows[0].id : 3;
    const actualPhase4Id = p4Rows && p4Rows.length > 0 ? p4Rows[0].id : 4;
    const actualPhase5Id = p5Rows && p5Rows.length > 0 ? p5Rows[0].id : 5;

    if (Number(id) === actualPhase1Id) {
      return res.json([
        { id: 101, phase_id: id, title: 'What is an MVP?', type: 'Reading', url: 'https://www.productplan.com/glossary/minimum-viable-product/' },
        { id: 102, phase_id: id, title: 'How to think like a product creator', type: 'Reading', url: 'https://medium.com/product-coalition/how-to-think-like-a-product-creator-eb5e76a16c14' },
        { id: 103, phase_id: id, title: 'User journey basics', type: 'Reading', url: 'https://www.interaction-design.org/literature/article/customer-journey-map' },
        { id: 104, phase_id: id, title: 'How to keep scope under control for your 1-Week MVP', type: 'Reading', url: 'https://www.ycombinator.com/library/4D-how-to-plan-an-mvp' }
      ]);
    }

    let queryPhaseId = id;
    if (Number(id) === actualPhase2Id) {
      queryPhaseId = actualPhase1Id; // Python resources are here
    } else if (Number(id) === actualPhase3Id) {
      queryPhaseId = actualPhase2Id; // GenAI resources are here
    } else if (Number(id) === actualPhase4Id) {
      queryPhaseId = actualPhase3Id; // Agent/RAG resources are here
    } else if (Number(id) === actualPhase5Id) {
      queryPhaseId = actualPhase4Id; // ReAct/Toolformer resources are here
    }

    const [rows] = await p.execute('SELECT * FROM phase_resources WHERE phase_id = ?', [queryPhaseId]);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve resources' });
  }
});

const PHASE2_SECTIONS = [
  { step: 1, label: 'Your Project Blueprint', desc: 'Confirming foundational MVP ideas and aligning product requirements.' },
  { step: 2, label: 'Feature Discovery', desc: 'Identifying and prioritizing must-haves, nice-to-haves, and future plans to prevent scope creep.' },
  { step: 3, label: 'User Journey', desc: 'Modeling how users will navigate through the application pages/views, path mappings.' },
  { step: 4, label: 'Product Screens', desc: 'Designing mock visual layouts with interactive triggers and state controls.' },
  { step: 5, label: 'Building Your Product', desc: 'NPM package compilation, bundling source codes, and local runtime verification.' },
  { step: 6, label: 'MVP Code Walkthrough', desc: 'Synthesizing layout templates, inspecting DOM code structures, and linking views.' },
  { step: 7, label: 'Pitch Story', desc: 'Refining core marketing descriptions, value propositions, and explaining product outcomes.' },
  { step: 8, label: 'AI Mechanics', desc: 'Implementing server-side LLM secure proxy controls, configuring system instructions.' },
  { step: 9, label: 'Demo Script', desc: 'Drafting presentation scripts and preparing step-by-step product walkthrough pitches.' },
  { step: 10, label: 'All Completed', desc: 'Consolidating deliverables, verifying credentials, and final completion tasks.' }
];

// GET trivia multiple choice questions for a phase
router.get('/phase/:id/quiz', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const sectionNum = req.query.section ? Number(req.query.section) : 1;
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });
    
    const [p2Rows]: any = await p.execute('SELECT id FROM phases WHERE order_index = 2');
    const actualPhase2Id = p2Rows && p2Rows.length > 0 ? p2Rows[0].id : 2;
    const isPhase2 = Number(id) === actualPhase2Id;

    // Check latest attempt for failed cooldown check (24-hour cooldown on failed attempts)
    let latestAttempts: any[] = [];
    if (isPhase2) {
      const [rowsAttempt]: any = await p.execute(
        'SELECT id, score, passed, attempted_at FROM quiz_attempts WHERE user_id = ? AND phase_id = ? AND section_number = ? ORDER BY attempted_at DESC LIMIT 1',
        [req.user.userId, Number(id), sectionNum]
      );
      latestAttempts = rowsAttempt;
    } else {
      const [rowsAttempt]: any = await p.execute(
        'SELECT id, score, passed, attempted_at FROM quiz_attempts WHERE user_id = ? AND phase_id = ? AND section_number IS NULL ORDER BY attempted_at DESC LIMIT 1',
        [req.user.userId, Number(id)]
      );
      latestAttempts = rowsAttempt;
    }

    if (latestAttempts.length > 0 && !latestAttempts[0].passed) {
      const lastAttemptTime = new Date(latestAttempts[0].attempted_at).getTime();
      const now = Date.now();
      const diffHours = (now - lastAttemptTime) / (1000 * 60 * 60);
      if (diffHours < 24) {
        return res.status(403).json({
          cooldown: true,
          error: 'Retry Locked',
          message: `Quiz retake cooldown: You have failed your previous attempt. Please wait ${Math.ceil(24 - diffHours)} hours before retaking.`,
          cooldownExpires: lastAttemptTime + 24 * 60 * 60 * 1000,
          previousAttempt: latestAttempts[0]
        });
      }
    }

    let bestAttempt: any[] = [];
    if (isPhase2) {
      const [rowsBest]: any = await p.execute(
        'SELECT id, score, passed, attempted_at FROM quiz_attempts WHERE user_id = ? AND phase_id = ? AND section_number = ? ORDER BY score DESC, attempted_at DESC LIMIT 1',
        [req.user.userId, Number(id), sectionNum]
      );
      bestAttempt = rowsBest;
    } else {
      const [rowsBest]: any = await p.execute(
        'SELECT id, score, passed, attempted_at FROM quiz_attempts WHERE user_id = ? AND phase_id = ? AND section_number IS NULL ORDER BY score DESC, attempted_at DESC LIMIT 1',
        [req.user.userId, Number(id)]
      );
      bestAttempt = rowsBest;
    }

    const [p1Rows]: any = await p.execute('SELECT id FROM phases WHERE order_index = 1');
    const actualPhase1Id = p1Rows && p1Rows.length > 0 ? p1Rows[0].id : 1;
    const [p3Rows]: any = await p.execute('SELECT id FROM phases WHERE order_index = 3');
    const actualPhase3Id = p3Rows && p3Rows.length > 0 ? p3Rows[0].id : 3;
    const [p4Rows]: any = await p.execute('SELECT id FROM phases WHERE order_index = 4');
    const actualPhase4Id = p4Rows && p4Rows.length > 0 ? p4Rows[0].id : 4;
    const [p5Rows]: any = await p.execute('SELECT id FROM phases WHERE order_index = 5');
    const actualPhase5Id = p5Rows && p5Rows.length > 0 ? p5Rows[0].id : 5;

    let rows: any = [];
    let isMissingBlueprint = false;
    let sessionId: any = null;
    if (Number(id) === actualPhase1Id) {
      try {
        const [bpRows]: any = await p.execute(
          'SELECT id, session_id, product_name, problem_statement, target_user_persona, solution_concept, mvp_definition FROM project_blueprints WHERE user_id = ? ORDER BY id DESC LIMIT 1',
          [req.user.userId]
        );
        if (bpRows && bpRows.length > 0) {
          const bp = bpRows[0];
          sessionId = bp.id;
          const originalSessionId = bp.session_id;

          // Fetch the conversational history of user reactions/AI refinements
          let conversationContext = '';
          if (originalSessionId) {
            const [respRows]: any = await p.execute(
              'SELECT question_text, user_response, ai_followup FROM ideation_responses WHERE session_id = ? ORDER BY id ASC LIMIT 10',
              [originalSessionId]
            );
            if (respRows && respRows.length > 0) {
              conversationContext = respRows
                .map((r: any) => `AI Prompt Suggestion: "${r.question_text}"\nUser Response/Feedback: "${r.user_response}"\nAI Feedback Refinement: "${r.ai_followup || ''}"`)
                .join('\n---\n');
            }
          }

          const [existing]: any = await p.execute(
            'SELECT id, question, options FROM quiz_questions WHERE phase_id = ? AND session_id = ?',
            [actualPhase1Id, sessionId]
          );
          if (existing && existing.length > 0) {
            rows = existing;
          } else {
            console.log('[DEBUG] Executing Prompt Chain for Phase 1 Reflection Quiz Auto Generation...');
            
            // PROMPT CHAIN STEP 1: Process and analyze the human-AI co-creation history to extract key milestones and focus areas.
            const analysisPrompt = `
You are a detailed product architecture analyst. Analyze this high school student's product idea and the conversation history of how it was developed.

Student's Idea:
- Product Name: ${bp.product_name || 'Autonomous App'}
- Problem Statement: ${bp.problem_statement || 'N/A'}
- Target Users: ${bp.target_user_persona || 'N/A'}
- Solution Concept: ${bp.solution_concept || 'N/A'}
- MVP Scope: ${bp.mvp_definition || 'N/A'}

Conversational history with the AI coach during ideation:
${conversationContext || 'No conversation details available.'}

Analyze this ideation progress and output a valid JSON object with EXACTLY these three keys (no other keys, no backticks, no markdown):
{
  "collaboration_insight": "A 1-sentence analytical insight about how the AI follow-ups and user's inputs refined this specific product idea from a vague concept to a defined scope.",
  "mvp_pitfall_avoided": "A 1-sentence description of a specific over-complication or scope creep pitfall that their defined MVP successfully avoids.",
  "user_understanding_insight": "A 1-sentence descriptor of how this product directly tackles the primary core pain point of their target user persona."
}
            `;

            let analysis = {
              collaboration_insight: "The user collaboratively iterated on follow-ups to narrow down their product scope.",
              mvp_pitfall_avoided: "Over-scoping with auxiliary systems before launching the main core feature.",
              user_understanding_insight: "Providing a direct, streamlined solution for the target demographic's main pain point."
            };

            try {
              const analysisRes = await getGeminiClient().models.generateContent({
                model: "gemini-3.5-flash",
                contents: analysisPrompt,
                config: {
                  responseMimeType: "application/json"
                }
              });
              const cleanAnalysis = parseGeminiResponse(analysisRes);
              const parsedAnalysis = JSON.parse(cleanAnalysis);
              if (parsedAnalysis && parsedAnalysis.collaboration_insight) {
                analysis = parsedAnalysis;
              }
            } catch (err) {
              console.warn("[WARN] Analysis step of prompt chain failed, using sensible fallbacks:", err);
            }

            // PROMPT CHAIN STEP 2: Use the generated insights to produce 5 highly personalized, welcoming reflection questions.
            const prompt = `
You are a warm, nurturing, and extremely supportive product design coach.
Generate EXACTLY 5 highly personalized multiple-choice reflection questions for a school student who has completed Phase 1 (Discovery & Ideation) for their product idea: "${bp.product_name || 'Autonomous App'}".

Use these analytical insights from our analysis stage to make them super tailored:
1. Product Improvement/Collaboration: ${analysis.collaboration_insight}
2. MVP Focus State: ${analysis.mvp_pitfall_avoided}
3. Target User Challenge: ${analysis.user_understanding_insight}

Guidelines for the 5 questions:
1. They should NOT feel like a stressful, technical exam or knowledge memorization.
2. They should focus on student reflection, celebrating understanding, self-assessment, and prompt interaction.
3. Every option must be constructive, positive, encouraging, and highly friendly. Avoid silly, punitive, or demoralizing answers.
4. Each question's correct_index represents the most thoughtful, proactive, or structured product management approach (e.g. focusing on users, keeping MVP small, communicating with AI clearly).
5. The explanation must praise the student's progress and reinforce the core product design learning objective beautifully.

Map the 5 questions to these exact structures/topics:
Question 1 (Defining clear Problem & Persona): Reflecting on how "${bp.product_name || 'their product'}" addresses their target user’s real need.
Question 2 (AI Refinement Collaboration): Reflecting on how their prompts and replies to the AI helped refine their idea.
Question 3 (MVP Scope Control): Reflecting on keeping their MVP manageable as opposed to overloading with nice-to-haves.
Question 4 (Prompt & AI Symbiosis): Reflecting on how clear instructions can guide an AI helper, showing human-AI partnership.
Question 5 (Forward Inspiration & Next Steps): Bridging their confidence and validating their entry into Phase 2 creation & styling.

Please output as a valid JSON array of EXACTLY 5 objects with this exact structure:
[
  {
    "question": "A personalized reflection question referring to their product and AI co-creation",
    "options": ["A positive, constructive response", "Another thoughtful, reflective option", "A third positive choice", "A fourth encouraging choice"],
    "correct_index": 0,
    "explanation": "Friendly, supportive, and educational explanation of why this option represents a wonderful product-coach mindset."
  }
]

Do not return any markdown, backticks (like \`\`\`json), or text before/after the JSON array. Output strictly valid JSON.
`;

            const geminiRes = await getGeminiClient().models.generateContent({
              model: "gemini-3.5-flash",
              contents: prompt,
              config: {
                responseMimeType: "application/json"
               }
            });

            const clean = parseGeminiResponse(geminiRes);
            const parsedQuestions = JSON.parse(clean);

            if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
              const generatedList: any[] = [];
              for (const q of parsedQuestions) {
                const [insertRes]: any = await p.execute(
                  `INSERT INTO quiz_questions (phase_id, session_id, question, options, correct_index, explanation)
                   VALUES (?, ?, ?, ?, ?, ?)`,
                  [actualPhase1Id, sessionId, q.question, JSON.stringify(q.options), q.correct_index, q.explanation]
                );
                generatedList.push({
                  id: insertRes.insertId,
                  question: q.question,
                  options: q.options
                });
              }
              rows = generatedList;
            }
          }
        } else {
          isMissingBlueprint = true;
        }
      } catch (dynamicError: any) {
        console.warn('Failed to dynamically generate Phase 1 customized quiz, using static questions fallback:', dynamicError);
        rows = [];
      }

      if (rows.length === 0 && !isMissingBlueprint) {
        console.log('[DEBUG] Dynamic Phase 1 quiz generation failed/empty, inserting robust static fallback questions in the database...');
        try {
          const fallbacks = [
            {
              q: "When defining your target user's core problem, which approach ensures your product stays highly relevant?",
              o: ["Focusing on a single critical pain point first and validating it with real users", "Adding as many cool features as possible beforehand to appeal to everyone", "Waiting until the product is 100% complete before talking to any target users", "Relying solely on your own assumptions without asking for feedback"],
              c: 0,
              e: "Focusing on a single pain point first and validating it ensures you build a solution that people actually need, saving time and effort."
            },
            {
              q: "How did collaborating with our AI coach during the ideation process help refine your product concept?",
              o: ["It helped break down a broad, vague idea into structured MVP features and target personas through helpful back-and-forth prompts", "It automatically built the actual source code and database rules without my input", "It limited my creativity by forcing me to only build simple default apps", "It replaced the need for me to understand my own product scope"],
              c: 0,
              e: "Collaborative AI prompting acts as a sounding board, helping to structure, challenge, and refine your unique perspectives into concrete product parameters."
            },
            {
              q: "Why is keeping your Minimum Viable Product (MVP) scope small and focused so essential for Phase 1?",
              o: ["It allows you to build, test, and gather user feedback quickly without getting bogged down in secondary complexities", "It makes the product look simpler and less impressive to potential investors", "It is a strict requirement that prevents you from adding any advanced features in later phases", "It ensures that your application doesn't require any server-side database configuration"],
              c: 0,
              e: "A tight MVP scope allows you to launch faster, validate assumptions, and pivot easily based on actual user testing instead of guesswork."
            },
            {
              q: "When guiding an AI assistant to write code or design screens, what constitutes the most effective human-AI partnership?",
              o: ["Providing clear, descriptive prompts with specific context and reviewing the output critically", "Asking the AI to 'build a whole app' with a single sentence and expecting perfect results", "Letting the AI make all product decisions without human oversight or evaluation", "Avoiding any AI tools entirely to ensure the code is 100% written manually"],
              c: 0,
              e: "A great co-creation partner guides the AI with clear instructions, domain context, and critical oversight, blending human creativity with AI efficiency."
            },
            {
              q: "As you finalize your ideation and prepare to transition into Phase 2 (Product Creation), what is your main priority?",
              o: ["To map out the user flow, outline core styling patterns, and iteratively construct the MVP interface with your AI tutor", "To worry about writing thousands of lines of complex backend code before validating the UI", "To completely rewrite your product concept from scratch if the first attempt is not fully perfect", "To wait for other student builders to complete their projects first before proceeding"],
              c: 0,
              e: "Moving to Phase 2 means translating your ideation blueprint into layouts, views, and visual states, keeping your user's experience at the forefront."
            }
          ];

          const generatedList: any[] = [];
          for (const item of fallbacks) {
            const [insertRes]: any = await p.execute(
              `INSERT INTO quiz_questions (phase_id, session_id, question, options, correct_index, explanation)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [actualPhase1Id, sessionId || null, item.q, JSON.stringify(item.o), item.c, item.e]
            );
            generatedList.push({
              id: insertRes.insertId,
              question: item.q,
              options: item.o
            });
          }
          rows = generatedList;
        } catch (dbErr) {
          console.error('[ERROR] Failed to insert static fallbacks in DB:', dbErr);
        }
      }
    } else if (Number(id) === actualPhase2Id) {
      try {
        const [sessions]: any = await p.execute(
          'SELECT id FROM product_sessions WHERE user_id = ? ORDER BY id DESC LIMIT 1',
          [req.user.userId]
        );
        if (sessions && sessions.length > 0) {
          const sessionId = sessions[0].id;
          const [existing]: any = await p.execute(
            'SELECT id, question, options FROM quiz_questions WHERE phase_id = ? AND session_id = ? AND section_number = ?',
            [actualPhase2Id, sessionId, sectionNum]
          );
          if (existing && existing.length > 0) {
            rows = existing;
          } else {
            // Auto generate if none exist yet for this specific section!
            const [bpRows]: any = await p.execute('SELECT * FROM product_blueprints WHERE session_id = ?', [sessionId]);
            if (bpRows && bpRows.length > 0) {
              const bp = bpRows[0];
              const [features]: any = await p.execute('SELECT * FROM product_features WHERE session_id = ?', [sessionId]);
              const featuresList = features.map((f: any) => `- ${f.feature_name}: ${f.feature_description} [${f.category}]`).join('\n');

              const sectionTitle = PHASE2_SECTIONS[sectionNum - 1]?.label || `Section ${sectionNum}`;
              const sectionDesc = PHASE2_SECTIONS[sectionNum - 1]?.desc || '';

              const prompt = `
Generate EXACTLY 10 multiple choice quiz questions for a Grade 9-12 student
who is learning about Section ${sectionNum} of Phase 2 (Product Creation).

The current section is: ${sectionTitle}
Focus of this section: ${sectionDesc}

Student's product details:
Product name: ${bp.project_name || 'Autonomous App'}
Problem it solves: ${bp.problem_statement || 'N/A'}
Target Users: ${bp.target_users || 'N/A'}
MVP Scope: ${bp.mvp_scope || 'N/A'}
Key Features:
${featuresList || 'None listed'}

We want the quiz to test their knowledge on "${sectionTitle}" as it applies to their product idea and software architecture.
Ensure the questions are highly personalized to their product and target users, yet educational about product management, software engineering, and the specific learnings of Section ${sectionNum}.

Please output as a valid JSON array of EXACTLY 10 objects with this exact structure:
[
  {
    "question": "The question text, references their product directly",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_index": 0,
    "explanation": "Extremely clear explanation of why the correct option is right."
  }
]

Return ONLY the valid JSON array. Do not wrap in markdown or backticks.
`;

              const geminiRes = await getGeminiClient().models.generateContent({
                model: "gemini-3.5-flash",
                contents: prompt,
                config: {
                  responseMimeType: "application/json"
                 }
              });

              const clean = parseGeminiResponse(geminiRes);
              const parsedQuestions = JSON.parse(clean);

              if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
                const generatedList: any[] = [];
                for (const q of parsedQuestions) {
                  const [insertRes]: any = await p.execute(
                    `INSERT INTO quiz_questions (phase_id, session_id, section_number, question, options, correct_index, explanation)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [actualPhase2Id, sessionId, sectionNum, q.question, JSON.stringify(q.options), q.correct_index, q.explanation]
                  );
                  generatedList.push({
                    id: insertRes.insertId,
                    question: q.question,
                    options: q.options
                  });
                }
                rows = generatedList;
              }
            }
          }
        }
      } catch (dynamicError: any) {
        console.warn('Failed to dynamically generate phase 2 customized quiz, using static questions fallback:', dynamicError);
        rows = [];
      }
    }

    if (rows.length === 0) {
      const [staticRows]: any = await p.execute('SELECT id, question, options FROM quiz_questions WHERE phase_id = ? AND session_id IS NULL', [Number(id)]);
      rows = staticRows;
    }

    // Retrieve up to 10 randomized quiz questions - skip random shuffling for Phase 1 to preserve narrative order
    const isPhase1 = Number(id) === actualPhase1Id;
    const shuffled = isPhase1 ? rows : rows.sort(() => 0.5 - Math.random()).slice(0, 10);
    
    res.json({
      questions: shuffled,
      previousAttempt: bestAttempt.length > 0 ? bestAttempt[0] : null,
      isMissingBlueprint
    });
  } catch (err: any) {
    console.error('[ERROR] Failed to retrieve quiz questions:', err);
    res.status(500).json({ error: 'Failed to retrieve quiz questions', details: err?.message || String(err) });
  }
});

// POST submit quiz answers and calculate results
router.post('/phase/:id/quiz/submit', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const { answers, section } = req.body; // Array of { questionId: number, selectedIndex: number }
  const sectionNum = section ? Number(section) : 1;

  if (!answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'Answers must be provided as an array.' });
  }
  
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });
    
    const [p2Rows]: any = await p.execute('SELECT id FROM phases WHERE order_index = 2');
    const actualPhase2Id = p2Rows && p2Rows.length > 0 ? p2Rows[0].id : 2;
    const isPhase2 = Number(id) === actualPhase2Id;

    const [p1Rows]: any = await p.execute('SELECT id FROM phases WHERE order_index = 1');
    const actualPhase1Id = p1Rows && p1Rows.length > 0 ? p1Rows[0].id : 1;
    const isPhase1 = Number(id) === actualPhase1Id;

    // Cooldown verification on any previous failed attempt in the last 24 hours
    let latestAttempts: any[] = [];
    if (isPhase2) {
      const [rowsAttempt]: any = await p.execute(
        'SELECT score, passed, attempted_at FROM quiz_attempts WHERE user_id = ? AND phase_id = ? AND section_number = ? ORDER BY attempted_at DESC LIMIT 1',
        [req.user.userId, Number(id), sectionNum]
      );
      latestAttempts = rowsAttempt;
    } else {
      const [rowsAttempt]: any = await p.execute(
        'SELECT score, passed, attempted_at FROM quiz_attempts WHERE user_id = ? AND phase_id = ? AND section_number IS NULL ORDER BY attempted_at DESC LIMIT 1',
        [req.user.userId, Number(id)]
      );
      latestAttempts = rowsAttempt;
    }

    if (!isPhase1 && latestAttempts.length > 0 && !latestAttempts[0].passed) {
      const lastAttemptTime = new Date(latestAttempts[0].attempted_at).getTime();
      const now = Date.now();
      const diffHours = (now - lastAttemptTime) / (1000 * 60 * 60);
      if (diffHours < 24) {
        return res.status(403).json({ 
          cooldown: true,
          message: `Quiz retake cooldown is active: Please wait ${Math.ceil(24 - diffHours)} hours before retaking.` 
        });
      }
    }
    
    // Cooldown verification: once passed, 24 hours cooldown operates
    let latestPass: any[] = [];
    if (isPhase2) {
      const [rowsPass]: any = await p.execute(
        'SELECT attempted_at FROM quiz_attempts WHERE user_id = ? AND phase_id = ? AND passed = 1 AND section_number = ? ORDER BY attempted_at DESC LIMIT 1',
        [req.user.userId, Number(id), sectionNum]
      );
      latestPass = rowsPass;
    } else {
      const [rowsPass]: any = await p.execute(
        'SELECT attempted_at FROM quiz_attempts WHERE user_id = ? AND phase_id = ? AND passed = 1 AND section_number IS NULL ORDER BY attempted_at DESC LIMIT 1',
        [req.user.userId, Number(id)]
      );
      latestPass = rowsPass;
    }
    if (!isPhase1 && latestPass.length > 0) {
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
    
    const [p3Rows]: any = await p.execute('SELECT id FROM phases WHERE order_index = 3');
    const actualPhase3Id = p3Rows && p3Rows.length > 0 ? p3Rows[0].id : 3;
    const [p4Rows]: any = await p.execute('SELECT id FROM phases WHERE order_index = 4');
    const actualPhase4Id = p4Rows && p4Rows.length > 0 ? p4Rows[0].id : 4;
    const [p5Rows]: any = await p.execute('SELECT id FROM phases WHERE order_index = 5');
    const actualPhase5Id = p5Rows && p5Rows.length > 0 ? p5Rows[0].id : 5;

    let questions: any[] = [];
    if (Number(id) === actualPhase1Id) {
      const [bpRows]: any = await p.execute(
        'SELECT id FROM project_blueprints WHERE user_id = ? ORDER BY id DESC LIMIT 1',
        [req.user.userId]
      );
      if (bpRows && bpRows.length > 0) {
        const sessionId = bpRows[0].id;
        const [sessionQuestions]: any = await p.execute(
          'SELECT id, correct_index, explanation FROM quiz_questions WHERE phase_id = ? AND session_id = ?',
          [actualPhase1Id, sessionId]
        );
        questions = sessionQuestions;
      }
    } else if (Number(id) === actualPhase2Id) {
      const [sessions]: any = await p.execute(
        'SELECT id FROM product_sessions WHERE user_id = ? ORDER BY id DESC LIMIT 1',
        [req.user.userId]
      );
      if (sessions && sessions.length > 0) {
        const sessionId = sessions[0].id;
        const [sessionQuestions]: any = await p.execute(
          'SELECT id, correct_index, explanation FROM quiz_questions WHERE phase_id = ? AND session_id = ? AND section_number = ?',
          [actualPhase2Id, sessionId, sectionNum]
        );
        questions = sessionQuestions;
      }
    }

    if (questions.length === 0) {
      const [staticQuestions]: any = await p.execute(
        'SELECT id, correct_index, explanation FROM quiz_questions WHERE phase_id = ? AND session_id IS NULL',
        [Number(id)]
      );
      questions = staticQuestions;
    }

    let correctCount = 0;
    const resultDetails: Record<string, { correct: boolean; correctIndex: number; explanation: string }> = {};

    for (const ans of answers) {
      const question = questions.find((q: any) => q.id === ans.questionId);
      if (question) {
        const isCorrect = question.correct_index === ans.selectedIndex;
        if (isCorrect) {
          correctCount++;
        }
        resultDetails[ans.questionId] = {
          correct: isCorrect,
          correctIndex: question.correct_index,
          explanation: question.explanation || "Well done!"
        };
      }
    }
    
    const totalQuestions = answers.length || 1;
    let score = Math.round((correctCount / totalQuestions) * 100);
    let passed = score >= 70;
    
    if (isPhase1) {
      score = 100;
      passed = true;
    }
    
    await p.execute(
      'INSERT INTO quiz_attempts (user_id, phase_id, score, passed, section_number) VALUES (?, ?, ?, ?, ?)',
      [req.user.userId, Number(id), score, passed ? 1 : 0, sectionNum]
    );
    
    res.json({
      success: true,
      score,
      passed,
      correctCount,
      totalQuestions,
      details: resultDetails
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

    // Condition 1: Verify Minimum Required Project Submissions with valid GitHub URLs (Bypassed for Phase 2 Custom MVP Builder)
    if (orderIndex > 1 && orderIndex !== 2) {
      const [allProjects]: any = await p.execute('SELECT id FROM phase_projects WHERE phase_id = ?', [Number(id)]);
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
    }

    // Condition 2: Verify Quiz Is Passed (score >= 70%)
    const [quizAttempt]: any = await p.execute(
      'SELECT score, passed FROM quiz_attempts WHERE user_id = ? AND phase_id = ? AND passed = 1 LIMIT 1',
      [req.user.userId, Number(id)]
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
      [req.user.userId, Number(id)]
    );
    const checklist = progressRow.length > 0 && progressRow[0].topics_checklist ? JSON.parse(progressRow[0].topics_checklist) : [];
    if (orderIndex > 1 && (!Array.isArray(checklist) || checklist.length === 0)) {
      console.log(`[DEBUG] Certification Rejected: No topics checked.`);
      return res.status(400).json({
        error: 'Certification Condition Failed: Please review and check study topics in the checklist to confirm understanding before certifying.'
      });
    }

    // CREATE BADGE entry
    const badgeNameStr = getBadgeName(orderIndex);
    await p.execute(
      'INSERT IGNORE INTO badges (user_id, phase_id) VALUES (?, ?)',
      [req.user.userId, Number(id)]
    );

    // Update Phase status to COMPLETED
    await p.execute(
      'INSERT INTO user_phase_progress (user_id, phase_id, status, progress_percentage) VALUES (?, ?, "completed", 100) ON DUPLICATE KEY UPDATE status = "completed", progress_percentage = 100',
      [req.user.userId, Number(id)]
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
