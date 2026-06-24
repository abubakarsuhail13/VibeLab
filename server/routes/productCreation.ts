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

// Safe Gemini parse pattern for ALL calls in this file:
// const raw = data.content.map(i => i.text || '').join('');
// const clean = raw.replace(/```json|```|```html/g, '').trim();
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

function safeParseJSON(val: any, fallback: any = []) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (err) {
    return fallback;
  }
}

// 1. POST /api/product/start
router.post('/start', authenticateToken, async (req: any, res) => {
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const userId = req.user.userId;

    // Get user's latest completed ideation blueprint
    const [blueprints]: any = await p.execute(
      'SELECT * FROM project_blueprints WHERE user_id = ? ORDER BY id DESC LIMIT 1',
      [userId]
    );

    if (!blueprints || blueprints.length === 0) {
      return res.status(400).json({ error: 'Please complete Phase 1: Discovery & Ideation first.' });
    }

    const pb = blueprints[0];

    // Create a new in-progress product session
    const [sessResult]: any = await p.execute(
      'INSERT INTO product_sessions (user_id, ideation_session_id, current_step, status) VALUES (?, ?, "blueprint", "in_progress")',
      [userId, pb.session_id || pb.id]
    );
    const sessionId = sessResult.insertId;

    // Call Gemini to pre-generate concrete blueprint from ideation data
    const prompt = `
      You are an expert AI Product Manager. Convert the following Phase 1: Discovery & Ideation data into a structured product blueprint.
      
      Product name idea: ${pb.product_name || 'Autonomous App'}
      Problem Statement: ${pb.problem_statement || 'N/A'}
      Target User Persona: ${pb.target_user_persona || 'N/A'}
      Solution Concept: ${pb.solution_concept || 'N/A'}
      AI Opportunity Map: ${pb.ai_opportunity_map || '[]'}
      MVP Definition: ${pb.mvp_definition || 'N/A'}
      Product Features: ${pb.product_features || '[]'}
      
      Format the output as a valid JSON object matching the schema below:
      {
        "project_name": "Polished name for the project",
        "problem_statement": "Refined, impact-focused problem statement (1-2 sentences)",
        "target_users": "Clear definition of who benefits from this product (1-2 sentences)",
        "mvp_scope": "Focused scope of what the MVP will accomplish (2-3 sentences)"
      }
      
      Return ONLY a valid JSON object matching the schema, with no markdown formatting and no preamble.
    `;

    let blueprintObj = {
      project_name: pb.product_name || 'Autonomous App',
      problem_statement: pb.problem_statement || 'A painful manual challenge requiring automation.',
      target_users: pb.target_user_persona || 'Students and professionals looking to optimize their workflow.',
      mvp_scope: pb.mvp_definition || 'A lightweight, high-productivity tool targeting core functional outputs.'
    };

    try {
      const geminiRes = await getGeminiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const clean = parseGeminiResponse(geminiRes);
      const parsed = JSON.parse(clean);
      if (parsed && parsed.project_name) {
        blueprintObj = {
          project_name: parsed.project_name || blueprintObj.project_name,
          problem_statement: parsed.problem_statement || blueprintObj.problem_statement,
          target_users: parsed.target_users || blueprintObj.target_users,
          mvp_scope: parsed.mvp_scope || blueprintObj.mvp_scope
        };
      }
    } catch (geminiError) {
      console.warn('Failed to pre-generate blueprint via Gemini, falling back to smart defaults:', geminiError);
    }

    // Save pre-generated blueprint to product_blueprints
    await p.execute(
      `INSERT INTO product_blueprints (session_id, user_id, project_name, problem_statement, target_users, mvp_scope, student_approved)
       VALUES (?, ?, ?, ?, ?, ?, FALSE)`,
      [sessionId, userId, blueprintObj.project_name, blueprintObj.problem_statement, blueprintObj.target_users, blueprintObj.mvp_scope]
    );

    // Retrieve saved blueprint
    const [savedBp]: any = await p.execute(
      'SELECT * FROM product_blueprints WHERE session_id = ?',
      [sessionId]
    );

    res.json({
      session_id: sessionId,
      blueprint: savedBp[0]
    });
  } catch (error: any) {
    console.error('Failed to start product session:', error);
    res.status(500).json({ error: error.message || 'Failed to start product creation session' });
  }
});

// 2. GET /api/product/session
router.get('/session', authenticateToken, async (req: any, res) => {
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const userId = req.user.userId;

    const [sessions]: any = await p.execute(
      'SELECT * FROM product_sessions WHERE user_id = ? ORDER BY id DESC LIMIT 1',
      [userId]
    );

    if (!sessions || sessions.length === 0) {
      return res.json({
        session: null,
        blueprint: null,
        features: [],
        user_journey: null,
        screens: [],
        mvp: null
      });
    }

    const session = sessions[0];
    const sessionId = session.id;

    const [bpRows]: any = await p.execute('SELECT * FROM product_blueprints WHERE session_id = ?', [sessionId]);
    let blueprint = bpRows && bpRows.length > 0 ? bpRows[0] : null;

    if (!blueprint || !blueprint.project_name || !blueprint.problem_statement) {
      const [projBpRows]: any = await p.execute(
        `SELECT id, product_name, problem_statement, target_user_persona, mvp_definition 
         FROM project_blueprints WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
        [userId]
      );
      if (projBpRows && projBpRows.length > 0) {
        const pb = projBpRows[0];
        blueprint = {
          id: blueprint?.id || pb.id,
          session_id: sessionId,
          user_id: userId,
          project_name: blueprint?.project_name || pb.product_name || '',
          problem_statement: blueprint?.problem_statement || pb.problem_statement || '',
          target_users: blueprint?.target_users || pb.target_user_persona || '',
          mvp_scope: blueprint?.mvp_scope || pb.mvp_definition || '',
          student_approved: blueprint?.student_approved || 0
        };
      }
    }

    const [features]: any = await p.execute('SELECT * FROM product_features WHERE session_id = ?', [sessionId]);

    const [journeyRows]: any = await p.execute('SELECT * FROM user_journeys WHERE session_id = ?', [sessionId]);
    const user_journey = journeyRows && journeyRows.length > 0 ? {
      ...journeyRows[0],
      steps: safeParseJSON(journeyRows[0].steps, []),
      key_actions: safeParseJSON(journeyRows[0].key_actions, [])
    } : null;

    const [screens]: any = await p.execute('SELECT * FROM product_screens WHERE session_id = ?', [sessionId]);

    const [mvpRows]: any = await p.execute('SELECT * FROM mvp_builds WHERE session_id = ?', [sessionId]);
    const mvp = mvpRows && mvpRows.length > 0 ? {
      ...mvpRows[0],
      key_talking_points: safeParseJSON(mvpRows[0].key_talking_points, []),
      skills_learned: safeParseJSON(mvpRows[0].skills_learned, [])
    } : null;

    const [components]: any = await p.execute('SELECT * FROM component_metadata WHERE session_id = ?', [sessionId]);

    res.json({
      session,
      blueprint,
      features: features || [],
      user_journey,
      screens: screens || [],
      mvp,
      component_metadata: components || []
    });
  } catch (error: any) {
    console.error('Failed to get product session:', error);
    res.status(500).json({ error: 'Failed to retrieve active product creation session' });
  }
});

// 3. POST /api/product/blueprint/approve
router.post('/blueprint/approve', authenticateToken, async (req: any, res) => {
  const { session_id, project_name, problem_statement, target_users, mvp_scope } = req.body;

  if (!session_id || !project_name || !problem_statement || !target_users || !mvp_scope) {
    return res.status(400).json({ error: 'Missing required blueprint approval fields' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const userId = req.user.userId;

    // Save edited fields, set student_approved = TRUE, register approval timestamp
    await p.execute(
      `UPDATE product_blueprints 
       SET project_name = ?, problem_statement = ?, target_users = ?, mvp_scope = ?, student_approved = TRUE, approved_at = CURRENT_TIMESTAMP
       WHERE session_id = ?`,
      [project_name, problem_statement, target_users, mvp_scope, session_id]
    );

    // 1. Check if cache already exists for this session to keep it AI-efficient (ONLY ONCE PER PROJECT)
    const [cacheRows]: any = await p.execute(
      'SELECT id FROM phase2_cache WHERE project_id = ? LIMIT 1',
      [session_id]
    );

    if (cacheRows && cacheRows.length > 0) {
      // Return preloaded features instantly from DB
      const [allFeatures]: any = await p.execute(
        'SELECT * FROM product_features WHERE session_id = ?',
        [session_id]
      );
      return res.json({ features: allFeatures });
    }

    // 2. Trigger Batch AI Generation
    const category = getProductCategory(project_name, problem_statement, mvp_scope);

    const batchPrompt = `
      You are an elite Product Architect. You are performing a ONE-TIME complete batch generation for a student's high-fidelity MVP product.
      
      Below are the approved details of the product:
      - Product Name: ${project_name}
      - Problem Statement: ${problem_statement}
      - Target Users: ${target_users}
      - MVP Scope: ${mvp_scope}
      - Product Category (for styling and feature set): ${category}
      
      Your task is to generate and return a single, massive, perfectly formatted JSON object that contains the complete data structure for Step 2 through Step 6.
      
      This object MUST strictly match the following JSON schema:
      {
        "features": [
          {
            "feature_name": "Short, clear title of feature",
            "feature_description": "1-2 sentence description explaining its functionality and beginner-friendly value.",
            "category": "must_have" or "nice_to_have" or "future"
          }
        ],
        "user_journey": {
          "steps": [
            {
              "step_number": 1,
              "title": "Short title",
              "description": "Short explanation of user task and behavior (1-2 sentences)"
            }
          ],
          "key_actions": [
            "First core action the user can perform",
            "Second core action..."
          ]
        },
        "screens": [
          {
            "screen_name": "Title of the screen",
            "screen_description": "Short summary explaining the view and elements.",
            "screen_purpose": "Core task or value of this screen",
            "layout_html": "Responsive, visual container HTML of this screen, using pure Tailwind classes. Include headers, grids, cards, data displays, realistic mock status values, or beautiful custom layout components to represent a high-fidelity visual preview. Use category-adaptive styling matching the product category."
          }
        ],
        "mvp": {
          "mvp_html": "Generate a completely working, interactive, single-file HTML/CSS/JS prototype with integrated views. Ensure it includes: \\n- A beautiful dark or responsive layout with Tailwind CSS. \\n- Seamless JS navigation (show/hide screen view divs when tabs are clicked). \\n- Realistic sample data and mock action buttons. \\n- A footer stating 'Built with VibeLab 🚀'. \\n- Crucial: Every meaningful interactive element must include these data attributes adjacent to each other in this precise order: data-component-id=\\"unique_id_here\\" data-component-type=\\"button|form|nav|display|input\\" data-purpose=\\"short description of what this does\\". Aim for 8-15 tagged elements.",
          "architecture_explanation": "🏗️ How It's Built\\nDescribe how it was made using simple self-contained HTML/CSS/JS in a child-friendly way.\\n\\n✨ What It Does\\nWrite a clear list of the working mock features.\\n\\n👥 Who It Helps\\nWrite who this solves a problem for and how it changes their day.",
          "components": [
            {
              "component_id": "The exact ID used as data-component-id in your mvp_html",
              "business_reason": "Clear explanation of why this exists in the product",
              "simple_explanation": "Simple analogy or plain description for beginners",
              "technical_explanation": "Slightly technical description of what it does"
            }
          ],
          "skills_learned": [
            { "skill": "User Interface Construction", "demonstrated": true },
            { "skill": "Interactive Controller Bindings", "demonstrated": true }
          ],
          "ai_contribution_summary": "A short 1-2 sentence summary of how the AI helped construct the MVP sandbox."
        },
        "walkthrough_explanations": [
          "Friendly, encouraging explanation for 'The File Structure' (max 3 sentences)",
          "Friendly, encouraging explanation for 'The Navigation System' (max 3 sentences)",
          "Friendly, encouraging explanation for 'The Core Feature' (max 3 sentences)",
          "Friendly, encouraging explanation for 'The Additional Feature' (max 3 sentences)",
          "Friendly, encouraging explanation for 'The Sample Database / Memory Store' (max 3 sentences)"
        ]
      }
      
      CRITICAL INSTRUCTIONS:
      1. Under "features", provide exactly 6-8 features (at least 3 must_have, 2 nice_to_have, 1-2 future).
      2. Under "user_journey", provide exactly 4-6 sequence steps + exactly 3-5 key actions.
      3. Under "screens", provide exactly 3 beautiful, category-appropriate high-fidelity screens.
      4. Under "mvp_html", build a robust, beautiful, high-quality, fully interactive prototype. It should have tabs for the 3 screens so they are fully clickable and functional inside the workspace!
      5. Under "walkthrough_explanations", provide exactly 5 elements matching the 5 walkthough sections in order.
      6. Return ONLY a valid JSON object matching this schema. Do not enclose the JSON in markdown code blocks or add any description outside the JSON object. Ensure all strings are correctly escaped.
    `;

    let batchObj: any = null;
    try {
      const geminiRes = await getGeminiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: batchPrompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const clean = parseGeminiResponse(geminiRes);
      batchObj = JSON.parse(clean);
    } catch (geminiError: any) {
      console.warn('Batch generation failed via Gemini, compiling click-to-cycle tab prototype local fallback:', geminiError.message || geminiError);
      batchObj = generateBatchFallback(project_name, problem_statement, target_users, mvp_scope, category, userId, session_id);
    }

    // Save Features suggestions
    await p.execute('DELETE FROM product_features WHERE session_id = ?', [session_id]);
    for (const f of batchObj.features) {
      await p.execute(
        `INSERT INTO product_features (session_id, feature_name, feature_description, category, added_by, is_included)
         VALUES (?, ?, ?, ?, 'ai', TRUE)`,
        [session_id, f.feature_name, f.feature_description, f.category]
      );
    }

    // Save User Journey
    await p.execute('DELETE FROM user_journeys WHERE session_id = ?', [session_id]);
    await p.execute(
      `INSERT INTO user_journeys (session_id, steps, key_actions, approved, approved_at)
       VALUES (?, ?, ?, TRUE, CURRENT_TIMESTAMP)`,
      [session_id, JSON.stringify(batchObj.user_journey.steps), JSON.stringify(batchObj.user_journey.key_actions)]
    );

    // Save Screens Layouts
    await p.execute('DELETE FROM product_screens WHERE session_id = ?', [session_id]);
    for (const s of batchObj.screens) {
      await p.execute(
        `INSERT INTO product_screens (session_id, screen_name, screen_description, screen_purpose, layout_html, approved)
         VALUES (?, ?, ?, ?, ?, TRUE)`,
        [session_id, s.screen_name, s.screen_description, s.screen_purpose, s.layout_html]
      );
    }

    // Save Component Metadata explanations
    await p.execute('DELETE FROM component_metadata WHERE session_id = ?', [session_id]);
    for (const comp of (batchObj.mvp.components || [])) {
      await p.execute(
        `INSERT INTO component_metadata (session_id, component_id, component_type, purpose, business_reason, simple_explanation, technical_explanation)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          session_id,
          comp.component_id,
          comp.component_type || 'display',
          comp.purpose || 'Interactive capabilities',
          comp.business_reason || '',
          comp.simple_explanation || '',
          comp.technical_explanation || ''
        ]
      );
    }

    // Save MVP build
    await p.execute('DELETE FROM mvp_builds WHERE session_id = ?', [session_id]);
    await p.execute(
      `INSERT INTO mvp_builds (session_id, user_id, mvp_html, architecture_explanation, status, skills_learned, ai_contribution_summary)
       VALUES (?, ?, ?, ?, 'ready_for_review', ?, ?)`,
      [
        session_id,
        userId,
        batchObj.mvp.mvp_html,
        batchObj.mvp.architecture_explanation,
        JSON.stringify(batchObj.mvp.skills_learned || []),
        batchObj.mvp.ai_contribution_summary || ''
      ]
    );

    // Save step data to Cache-First store table
    await p.execute(
      `INSERT INTO phase2_cache (project_id, user_id, step1, step2, step3, step4, step5, step6, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        session_id,
        userId,
        JSON.stringify({ project_name, problem_statement, target_users, mvp_scope }),
        JSON.stringify(batchObj.features),
        JSON.stringify(batchObj.user_journey),
        JSON.stringify(batchObj.screens),
        JSON.stringify(batchObj.mvp),
        JSON.stringify(batchObj.walkthrough_explanations || [])
      ]
    );

    // Update session current_step = 'features'
    await p.execute(
      "UPDATE product_sessions SET current_step = 'features' WHERE id = ?",
      [session_id]
    );

    // Retrieve and return all features for the current session
    const [allFeatures]: any = await p.execute(
      'SELECT * FROM product_features WHERE session_id = ?',
      [session_id]
    );

    res.json({ features: allFeatures });
  } catch (error: any) {
    console.error('Failed to approve blueprint:', error);
    res.status(500).json({ error: error.message || 'Failed to approve blueprint and generate feature scope' });
  }
});

// 4. POST /api/product/features/update
router.post('/features/update', authenticateToken, async (req: any, res) => {
  const { session_id, features } = req.body;

  if (!session_id || !Array.isArray(features)) {
    return res.status(400).json({ error: 'Missing or invalid parameters' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    for (const f of features) {
      await p.execute(
        `UPDATE product_features 
         SET is_included = ?, category = ?, student_rationale = ? 
         WHERE id = ? AND session_id = ?`,
        [f.is_included ? 1 : 0, f.category, f.student_rationale || null, f.id, session_id]
      );
    }

    res.json({ updated: true });
  } catch (error: any) {
    console.error('Failed to update features:', error);
    res.status(500).json({ error: 'Failed to update feature selection' });
  }
});

// 4b. POST /api/product/features/add
router.post('/features/add', authenticateToken, async (req: any, res) => {
  const { session_id, feature_name, feature_description, category } = req.body;

  if (!session_id || !feature_name || !feature_description) {
    return res.status(400).json({ error: 'Missing feature parameters' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const [result]: any = await p.execute(
      `INSERT INTO product_features (session_id, feature_name, feature_description, category, added_by, is_included)
       VALUES (?, ?, ?, ?, 'student', TRUE)`,
      [session_id, feature_name, feature_description, category || 'must_have']
    );

    const newFeatureId = result.insertId;

    res.json({
      success: true,
      feature: {
        id: newFeatureId,
        feature_name,
        feature_description,
        category: category || 'must_have',
        is_included: true,
        added_by: 'student',
        student_rationale: ''
      }
    });
  } catch (error: any) {
    console.error('Failed to add custom feature:', error);
    res.status(500).json({ error: 'Failed to add custom feature' });
  }
});

// 5. POST /api/product/features/approve
router.post('/features/approve', authenticateToken, async (req: any, res) => {
  const { session_id } = req.body;

  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    // Check if user journey is already pre-generated and cached in the DB
    const [existingJourneys]: any = await p.execute('SELECT * FROM user_journeys WHERE session_id = ?', [session_id]);
    if (existingJourneys && existingJourneys.length > 0) {
      // Update current_step = 'user_journey'
      await p.execute(
        "UPDATE product_sessions SET current_step = 'user_journey' WHERE id = ?",
        [session_id]
      );

      const savedJourney = {
        ...existingJourneys[0],
        steps: safeParseJSON(existingJourneys[0].steps, []),
        key_actions: safeParseJSON(existingJourneys[0].key_actions, [])
      };

      return res.json({ user_journey: savedJourney });
    }

    // Fetch blueprint and approved features
    const [bpRows]: any = await p.execute('SELECT * FROM product_blueprints WHERE session_id = ?', [session_id]);
    if (!bpRows || bpRows.length === 0) {
      return res.status(404).json({ error: 'Blueprint not found' });
    }
    const bp = bpRows[0];

    const [featureRows]: any = await p.execute(
      'SELECT * FROM product_features WHERE session_id = ? AND is_included = 1',
      [session_id]
    );

    // Call Gemini to generate user journey
    const prompt = `
      You are an expert AI UX Researcher. Map out a detailed step-by-step User Journey for the product based on its blueprint and final features list.
      
      Project Name: ${bp.project_name}
      Problem Statement: ${bp.problem_statement}
      Target Users: ${bp.target_users}
      MVP Scope: ${bp.mvp_scope}
      
      Final Selected / Included Features:
      ${featureRows.map((f: any) => `- ${f.feature_name}: ${f.feature_description} (${f.category})`).join('\n')}
      
      Generate 4 to 6 sequence steps describing how a user starts, performs core activities, and achieves a success state using the features.
      Also describe 3 to 5 key actions the user takes during this flow.
      
      Return ONLY a valid JSON object matching this schema with no markdown backticks and no preamble:
      {
        "steps": [
          {
            "step_number": 1,
            "title": "Clear Action Title",
            "description": "Short explanation of the user task and interaction behavior (1-2 sentences)"
          }
        ],
        "key_actions": [
          "First action text",
          "Second action text"
        ]
      }
    `;

    let parsedJourney;
    try {
      const geminiRes = await getGeminiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const clean = parseGeminiResponse(geminiRes);
      parsedJourney = JSON.parse(clean);
    } catch (geminiError) {
      console.warn('Failed to dynamically generate User Journey via Gemini, using smart fallback:', geminiError);
      parsedJourney = {
        steps: [
          {
            step_number: 1,
            title: "Onboarding & Account Entry",
            description: `The user signs up and enters the customizable ${bp.project_name} portal designed specifically for ${bp.target_users}.`
          },
          {
            step_number: 2,
            title: "Dashboard & Main Hub Overview",
            description: `The system displays the primary dashboard loaded with core widgets and features to solve the major problem: "${bp.problem_statement}".`
          },
          {
            step_number: 3,
            title: "Initiating Key Activity Flow",
            description: `The user activates the primary action modules, including: ${featureRows.slice(0, 3).map((f: any) => f.feature_name).join(', ')}.`
          },
          {
            step_number: 4,
            title: "Executing core actions & Customizing State",
            description: `The user inputs their custom settings, completes the main workflow tasks, and adjusts high-value components.`
          },
          {
            step_number: 5,
            title: "Viewing Results & Success Insights",
            description: `The user observes success feedback metrics and completes the core MVP journey with data-rich confirmation details.`
          }
        ],
        key_actions: [
          `Register new user account profile tailored to ${bp.target_users}.`,
          `Browse and configure core dashboard components.`,
          `Trigger main interactive action solvers.`,
          `Review activity records, analytics visualizations, and final success metrics.`
        ]
      };
    }

    // Save to user_journeys table
    await p.execute(
      `INSERT INTO user_journeys (session_id, steps, key_actions, approved, approved_at)
       VALUES (?, ?, ?, TRUE, CURRENT_TIMESTAMP)`,
      [session_id, JSON.stringify(parsedJourney.steps), JSON.stringify(parsedJourney.key_actions)]
    );

    // Update current_step = 'user_journey'
    await p.execute(
      "UPDATE product_sessions SET current_step = 'user_journey' WHERE id = ?",
      [session_id]
    );

    const [journeyRows]: any = await p.execute('SELECT * FROM user_journeys WHERE session_id = ?', [session_id]);
    const savedJourney = {
      ...journeyRows[0],
      steps: safeParseJSON(journeyRows[0].steps, []),
      key_actions: safeParseJSON(journeyRows[0].key_actions, [])
    };

    res.json({ user_journey: savedJourney });
  } catch (error: any) {
    console.error('Failed to approve features:', error);
    res.status(500).json({ error: error.message || 'Failed to approve features and generate user journey' });
  }
});

function getProductCategory(name: string, problem: string, scope: string): string {
  const combined = `${name} ${problem} ${scope}`.toLowerCase();
  if (combined.includes('learn') || combined.includes('study') || combined.includes('school') || combined.includes('course') || combined.includes('student') || combined.includes('quiz') || combined.includes('teacher') || combined.includes('education')) {
    return 'education';
  }
  if (combined.includes('health') || combined.includes('fitness') || combined.includes('well') || combined.includes('calm') || combined.includes('workout') || combined.includes('mind') || combined.includes('meditation') || combined.includes('breath') || combined.includes('doctor')) {
    return 'health';
  }
  if (combined.includes('money') || combined.includes('shop') || combined.includes('budget') || combined.includes('finance') || combined.includes('delivery') || combined.includes('food') || combined.includes('buy') || combined.includes('sell') || combined.includes('payment') || combined.includes('order')) {
    return 'finance_ecommerce';
  }
  if (combined.includes('social') || combined.includes('connect') || combined.includes('friend') || combined.includes('chat') || combined.includes('community') || combined.includes('forum') || combined.includes('group')) {
    return 'social';
  }
  return 'productivity';
}

function generateAdaptiveFallbackScreens(bp: any, featureRows: any[]): any[] {
  const category = getProductCategory(bp.project_name || '', bp.problem_statement || '', bp.mvp_scope || '');
  const projName = bp.project_name || 'VibeLab App';
  const targetUsers = bp.target_users || 'target users';
  const problem = bp.problem_statement || 'painful legacy process';
  
  const featureListHtml = featureRows.slice(0, 4).map((f: any) => `
    <div class="flex items-start gap-3">
      <span class="text-indigo-500 dark:text-indigo-400 mt-0.5">✓</span>
      <div>
        <div class="text-xs font-bold text-slate-800 dark:text-slate-100">${f.feature_name}</div>
        <div class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">${f.feature_description}</div>
      </div>
    </div>
  `).join('');

  if (category === 'education') {
    return [
      {
        screen_name: "🎓 Study Quest Portal",
        screen_description: `Main student learning hub tailored for ${targetUsers}. Displays enrolled revision tracks, active tasks, and personal stats.`,
        screen_purpose: "Central hub for monitoring learning milestones, resuming smart courses, and accessing customized reference materials.",
        layout_html: `
          <div class="p-6 bg-slate-900 text-white font-sans rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
            <div class="absolute -right-16 -top-16 w-32 h-32 bg-violet-600/10 rounded-full blur-2xl"></div>
            <div class="flex items-center justify-between mb-8">
              <div>
                <div class="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-1">Quest Deck</div>
                <h1 class="text-2xl font-black tracking-tight">${projName}</h1>
              </div>
              <div class="flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-full text-xs text-violet-300 font-semibold">
                <span class="w-1.5 h-1.5 bg-violet-400 rounded-full"></span> Smart Sandbox
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              <div class="p-5 bg-slate-800/40 rounded-xl border border-slate-700/30">
                <div class="text-[10px] text-violet-300 uppercase tracking-wider font-extrabold mb-1">Target Learner</div>
                <div class="text-sm font-bold text-slate-100">${targetUsers}</div>
              </div>
              <div class="p-5 bg-slate-800/40 rounded-xl border border-slate-700/30">
                <div class="text-[10px] text-violet-300 uppercase tracking-wider font-extrabold mb-1">Quest Goal</div>
                <div class="text-xs font-medium text-slate-300 line-clamp-3">${problem}</div>
              </div>
              <div class="p-5 bg-slate-800/40 rounded-xl border border-slate-700/30">
                <div class="text-[10px] text-violet-300 uppercase tracking-wider font-extrabold mb-1">Learning Streak</div>
                <div class="text-lg font-black text-violet-400 font-mono">🔥 5 Days Live</div>
              </div>
            </div>
            <div class="bg-slate-800/20 border border-slate-700/30 rounded-xl p-5 mb-6">
              <h3 class="text-xs font-extrabold text-violet-300 uppercase tracking-widest mb-3">Core Modules Installed</h3>
              <div class="space-y-3">
                ${featureListHtml}
              </div>
            </div>
            <div class="flex justify-between items-center pt-3 border-t border-slate-800/60">
              <span class="text-[10px] font-mono text-slate-500">Workspace active</span>
              <button class="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all hover:shadow-lg">
                Start Lesson
              </button>
            </div>
          </div>
        `
      },
      {
        screen_name: "📝 Adaptive Practice Engine",
        screen_description: "Smart review dashboard equipped with instant grading metrics and personalized study tips.",
        screen_purpose: "Enables interactive testing and diagnostics of target topics, displaying step-by-step guidance.",
        layout_html: `
          <div class="p-6 bg-slate-900 text-white font-sans rounded-2xl border border-slate-800 shadow-2xl">
            <div class="flex items-center gap-3 mb-6">
              <div class="w-10 h-10 bg-violet-600/20 border border-violet-500/30 rounded-xl flex items-center justify-center text-violet-400 text-lg">📝</div>
              <div>
                <h2 class="text-lg font-black tracking-tight">Adaptive Test Suite</h2>
                <p class="text-xs text-slate-400">Review dynamic questions calibrated to your skill level.</p>
              </div>
            </div>
            <div class="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30 mb-6">
              <div class="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-1">Question 1 of 5</div>
              <p class="text-xs text-slate-200 font-medium mb-4">How does ${projName} optimize the learning workflow to resolve issues for ${targetUsers}?</p>
              <div class="space-y-2">
                <label class="flex items-center gap-3 p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/40 rounded-lg cursor-pointer">
                  <input type="radio" name="q1" class="text-violet-500 focus:ring-violet-500" />
                  <span class="text-xs text-slate-300">By automating manual scheduling and highlighting critical pain points.</span>
                </label>
                <label class="flex items-center gap-3 p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/40 rounded-lg cursor-pointer">
                  <input type="radio" name="q1" class="text-violet-500 focus:ring-violet-500" />
                  <span class="text-xs text-slate-300">By providing direct reference libraries and gamified learning badges.</span>
                </label>
              </div>
            </div>
            <div class="flex justify-between items-center pt-4 border-t border-slate-800">
              <span class="text-[10px] font-mono text-slate-500">Diagnostic track active</span>
              <button class="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl">
                Submit Answer
              </button>
            </div>
          </div>
        `
      },
      {
        screen_name: "🏆 Quest Achievements & Milestones",
        screen_description: "Achievements gallery containing earned badges, score trackers, and learning level meters.",
        screen_purpose: "Inspires students with responsive rewards, level promotions, and gamified progress review loops.",
        layout_html: `
          <div class="p-6 bg-slate-900 text-white font-sans rounded-2xl border border-slate-800 shadow-2xl">
            <div class="flex justify-between items-center mb-6">
              <div>
                <h2 class="text-lg font-black tracking-tight">My Accomplishments</h2>
                <p class="text-xs text-slate-400">Unlock ranks as you master new skills.</p>
              </div>
              <div class="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold rounded-lg">
                ⭐ Level 3 Explorer
              </div>
            </div>
            <div class="grid grid-cols-3 gap-3 mb-6">
              <div class="p-3 bg-slate-800/40 border border-slate-700/30 rounded-xl text-center">
                <span class="text-2xl block mb-1">🔥</span>
                <div class="text-[10px] font-bold text-slate-200">Consistency</div>
                <div class="text-[9px] text-violet-400 mt-0.5">5-Day Streak</div>
              </div>
              <div class="p-3 bg-slate-800/40 border border-slate-700/30 rounded-xl text-center">
                <span class="text-2xl block mb-1">🎯</span>
                <div class="text-[10px] font-bold text-slate-200">Accuracy</div>
                <div class="text-[9px] text-violet-400 mt-0.5">92% Average</div>
              </div>
              <div class="p-3 bg-slate-800/40 border border-slate-700/30 rounded-xl text-center">
                <span class="text-2xl block mb-1">👑</span>
                <div class="text-[10px] font-bold text-slate-200">Champ</div>
                <div class="text-[9px] text-violet-400 mt-0.5">15 Quizzes</div>
              </div>
            </div>
            <div class="p-4 bg-violet-600/10 border border-violet-500/20 rounded-xl">
              <div class="text-xs text-violet-300 font-bold mb-1">🚀 Smart Progression Insight</div>
              <p class="text-[11px] text-slate-400 leading-relaxed">Completing 2 more study quest drills will upgrade your badge rank to 'Topic Master'!</p>
            </div>
          </div>
        `
      }
    ];
  }

  if (category === 'health') {
    return [
      {
        screen_name: "🌿 Wellness Dashboard",
        screen_description: `Mindful health tracker engineered for ${targetUsers}. Provides active habit lists, water logs, and daily health metrics.`,
        screen_purpose: "A calm workspace to view habit completion logs, keep tabs on vital hydration, and review wellness streaks.",
        layout_html: `
          <div class="p-6 bg-slate-900 text-white font-sans rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
            <div class="absolute -right-16 -top-16 w-32 h-32 bg-emerald-600/10 rounded-full blur-2xl"></div>
            <div class="flex items-center justify-between mb-8">
              <div>
                <div class="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Serene Space</div>
                <h1 class="text-2xl font-black tracking-tight">${projName}</h1>
              </div>
              <div class="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs text-emerald-300 font-semibold">
                <span class="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span> Calm Active
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              <div class="p-5 bg-slate-800/40 rounded-xl border border-slate-700/30">
                <div class="text-[10px] text-emerald-300 uppercase tracking-wider font-extrabold mb-1">Active User</div>
                <div class="text-sm font-bold text-slate-100">${targetUsers}</div>
              </div>
              <div class="p-5 bg-slate-800/40 rounded-xl border border-slate-700/30">
                <div class="text-[10px] text-emerald-300 uppercase tracking-wider font-extrabold mb-1">Our Wellness Goal</div>
                <div class="text-xs font-medium text-slate-300 line-clamp-3">${problem}</div>
              </div>
              <div class="p-5 bg-slate-800/40 rounded-xl border border-slate-700/30">
                <div class="text-[10px] text-emerald-300 uppercase tracking-wider font-extrabold mb-1">Hydration Index</div>
                <div class="text-lg font-black text-emerald-400 font-mono">💧 75% Checked</div>
              </div>
            </div>
            <div class="bg-slate-800/20 border border-slate-700/30 rounded-xl p-5 mb-6">
              <h3 class="text-xs font-extrabold text-emerald-300 uppercase tracking-widest mb-3">Habits & Targets Enabled</h3>
              <div class="space-y-3">
                ${featureListHtml}
              </div>
            </div>
            <div class="flex justify-between items-center pt-3 border-t border-slate-800/60">
              <span class="text-[10px] font-mono text-slate-500">Wellness environment loaded</span>
              <button class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all hover:shadow-lg">
                Log Habit
              </button>
            </div>
          </div>
        `
      },
      {
        screen_name: "🧘 Mindful Breath & Focus Center",
        screen_description: "Focused interactive controller facilitating circular relaxation exercises, timer logs, and breathing cues.",
        screen_purpose: "Enables direct stress reduction through paced breathing cycles and dynamic auditory loops.",
        layout_html: `
          <div class="p-6 bg-slate-900 text-white font-sans rounded-2xl border border-slate-800 shadow-2xl">
            <div class="flex items-center gap-3 mb-8">
              <div class="w-10 h-10 bg-emerald-600/20 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 text-lg">🧘</div>
              <div>
                <h2 class="text-lg font-black tracking-tight">Breathing Pacer</h2>
                <p class="text-xs text-slate-400">Calibrate your breathing rhythm to find focus.</p>
              </div>
            </div>
            <div class="flex flex-col items-center justify-center py-6 mb-6">
              <div class="relative w-28 h-28 flex items-center justify-center mb-4">
                <div class="absolute w-full h-full bg-emerald-500/10 rounded-full border border-emerald-500/30 animate-ping"></div>
                <div class="absolute w-20 h-20 bg-emerald-500/25 rounded-full border border-emerald-500/40 animate-pulse"></div>
                <span class="text-xs font-extrabold text-emerald-300 uppercase tracking-widest z-10">Breathe In</span>
              </div>
              <span class="text-xs text-slate-400 mt-2">Pace: 4s inhale • 4s exhale</span>
            </div>
            <div class="flex justify-between items-center pt-4 border-t border-slate-800">
              <span class="text-[10px] font-mono text-slate-500">Pacer session loaded</span>
              <button class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl">
                Start Session
              </button>
            </div>
          </div>
        `
      },
      {
        screen_name: "📈 Wellness Analytics & Progress",
        screen_description: "Track completion indexes, weekly habit checklists, and analytical summaries for stress relief patterns.",
        screen_purpose: "Assists users in reviewing historical habit schedules and logging wellness goals.",
        layout_html: `
          <div class="p-6 bg-slate-900 text-white font-sans rounded-2xl border border-slate-800 shadow-2xl">
            <div class="flex justify-between items-center mb-6">
              <div>
                <h2 class="text-lg font-black tracking-tight">Wellness Report</h2>
                <p class="text-xs text-slate-400">Review weekly goal alignments and summaries.</p>
              </div>
              <button class="px-3 py-1.5 bg-slate-800 border border-slate-700/40 hover:bg-slate-700 text-xs rounded-xl text-slate-300 font-bold">
                📥 Export Log
              </button>
            </div>
            <div class="space-y-3 mb-6">
              <div class="flex items-center justify-between p-3.5 bg-slate-800/40 border border-slate-700/30 rounded-xl">
                <span class="text-xs font-bold text-slate-200">Daily Water Targets</span>
                <span class="text-xs font-bold text-emerald-400 font-mono">6 / 8 Glasses</span>
              </div>
              <div class="flex items-center justify-between p-3.5 bg-slate-800/40 border border-slate-700/30 rounded-xl">
                <span class="text-xs font-bold text-slate-200">Mindful Breathing Drills</span>
                <span class="text-xs font-bold text-emerald-400 font-mono">2 / 2 Sessions (100%)</span>
              </div>
              <div class="flex items-center justify-between p-3.5 bg-slate-800/40 border border-slate-700/30 rounded-xl">
                <span class="text-xs font-bold text-slate-200">Step Counts Logged</span>
                <span class="text-xs font-bold text-emerald-400 font-mono">8,450 / 10,000 Steps</span>
              </div>
            </div>
            <div class="p-3.5 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
              <div class="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">💡 Mindful Suggestion</div>
              <p class="text-[11px] text-slate-400 leading-relaxed">Completing habits before 12:00 PM usually boosts consistency levels by up to 35%!</p>
            </div>
          </div>
        `
      }
    ];
  }

  if (category === 'finance_ecommerce') {
    return [
      {
        screen_name: "🛍️ Smart Catalog & Orders Portal",
        screen_description: `Modern product inventory grid and shopping desk customized for ${targetUsers}. Provides catalog filters and transaction indicators.`,
        screen_purpose: "Enables discovery of key product inventories, shopping lists, and checkout modules.",
        layout_html: `
          <div class="p-6 bg-slate-900 text-white font-sans rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
            <div class="absolute -right-16 -top-16 w-32 h-32 bg-amber-600/10 rounded-full blur-2xl"></div>
            <div class="flex items-center justify-between mb-8">
              <div>
                <div class="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">Store Console</div>
                <h1 class="text-2xl font-black tracking-tight">${projName}</h1>
              </div>
              <div class="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full text-xs text-amber-300 font-semibold">
                <span class="w-1.5 h-1.5 bg-amber-400 rounded-full"></span> Store Open
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              <div class="p-5 bg-slate-800/40 rounded-xl border border-slate-700/30">
                <div class="text-[10px] text-amber-300 uppercase tracking-wider font-extrabold mb-1">Shopping Group</div>
                <div class="text-sm font-bold text-slate-100">${targetUsers}</div>
              </div>
              <div class="p-5 bg-slate-800/40 rounded-xl border border-slate-700/30">
                <div class="text-[10px] text-amber-300 uppercase tracking-wider font-extrabold mb-1">Problem Solved</div>
                <div class="text-xs font-medium text-slate-300 line-clamp-3">${problem}</div>
              </div>
              <div class="p-5 bg-slate-800/40 rounded-xl border border-slate-700/30">
                <div class="text-[10px] text-amber-300 uppercase tracking-wider font-extrabold mb-1">Total Savings</div>
                <div class="text-lg font-black text-amber-400 font-mono">💲 $120.45 Split</div>
              </div>
            </div>
            <div class="bg-slate-800/20 border border-slate-700/30 rounded-xl p-5 mb-6">
              <h3 class="text-xs font-extrabold text-amber-300 uppercase tracking-widest mb-3">Features & Integrations Loaded</h3>
              <div class="space-y-3">
                ${featureListHtml}
              </div>
            </div>
            <div class="flex justify-between items-center pt-3 border-t border-slate-800/60">
              <span class="text-[10px] font-mono text-slate-500">Marketplace active</span>
              <button class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs uppercase tracking-wider rounded-xl transition-all hover:shadow-lg">
                View Catalog
              </button>
            </div>
          </div>
        `
      },
      {
        screen_name: "💳 Expense Solver & Checkout Hub",
        screen_description: "Splits purchase balances in real-time, displays item totals, and triggers transaction gateways.",
        screen_purpose: "Assists users in compiling custom budget selections, dividing costs, and processing orders.",
        layout_html: `
          <div class="p-6 bg-slate-900 text-white font-sans rounded-2xl border border-slate-800 shadow-2xl">
            <div class="flex items-center gap-3 mb-6">
              <div class="w-10 h-10 bg-amber-600/20 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-400 text-lg">💳</div>
              <div>
                <h2 class="text-lg font-black tracking-tight">Interactive Bill Solver</h2>
                <p class="text-xs text-slate-400">Calculate splits and complete transaction configurations.</p>
              </div>
            </div>
            <div class="space-y-4 mb-6">
              <div>
                <label class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">Total Amount to Process</label>
                <div class="relative">
                  <span class="absolute left-4 top-3.5 text-slate-400 font-bold text-xs">$</span>
                  <input type="number" value="150.00" class="w-full bg-slate-800/40 border border-slate-700/60 focus:border-amber-500 text-xs px-8 py-3.5 rounded-xl outline-none text-slate-200 font-mono font-bold" />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">Splitting Between</label>
                  <input type="number" value="3" class="w-full bg-slate-800/40 border border-slate-700/60 focus:border-amber-500 text-xs px-4 py-3.5 rounded-xl outline-none text-slate-200 font-mono font-bold" />
                </div>
                <div>
                  <label class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">Each Person Pays</label>
                  <div class="w-full bg-amber-500/10 border border-amber-500/20 text-xs px-4 py-3.5 rounded-xl text-amber-400 font-mono font-black text-center">
                    $50.00 / person
                  </div>
                </div>
              </div>
            </div>
            <div class="flex justify-between items-center pt-4 border-t border-slate-800">
              <span class="text-[10px] font-mono text-slate-500">Split calculation verified</span>
              <button class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs uppercase tracking-wider rounded-xl">
                Execute Payment
              </button>
            </div>
          </div>
        `
      },
      {
        screen_name: "📦 Live Order & Tracker Suite",
        screen_description: "Order status timeline showing delivery statuses, fulfillment milestones, and transaction historical tables.",
        screen_purpose: "Allows target clients to verify completed transactions and follow delivery tracking journeys.",
        layout_html: `
          <div class="p-6 bg-slate-900 text-white font-sans rounded-2xl border border-slate-800 shadow-2xl">
            <div class="flex justify-between items-center mb-6">
              <div>
                <h2 class="text-lg font-black tracking-tight">Transaction Status Logs</h2>
                <p class="text-xs text-slate-400">Review status logs of active split baskets.</p>
              </div>
              <span class="px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] uppercase font-mono rounded">
                Active
              </span>
            </div>
            <div class="relative pl-6 border-l-2 border-amber-500/30 space-y-6 mb-6">
              <div class="relative">
                <span class="absolute -left-[30px] top-0 w-3.5 h-3.5 rounded-full bg-amber-500 border-4 border-slate-900"></span>
                <div class="text-xs font-bold text-slate-100">Order Placed & Split Completed</div>
                <p class="text-[11px] text-slate-400 mt-0.5">3 out of 3 group members successfully approved their splits.</p>
              </div>
              <div class="relative">
                <span class="absolute -left-[30px] top-0 w-3.5 h-3.5 rounded-full bg-slate-700 border-4 border-slate-900 animate-pulse"></span>
                <div class="text-xs font-bold text-slate-300">Awaiting Dispatch</div>
                <p class="text-[11px] text-slate-500 mt-0.5">Fulfillment center compiling order package contents.</p>
              </div>
            </div>
            <div class="p-3.5 bg-amber-500/5 rounded-xl border border-amber-500/10">
              <div class="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">💡 Split Savings Tip</div>
              <p class="text-[11px] text-slate-400 leading-normal">Splitting orders with your peers saved you an average of $4.50 in delivery service fees today!</p>
            </div>
          </div>
        `
      }
    ];
  }

  if (category === 'social') {
    return [
      {
        screen_name: "💬 Community Channels Portal",
        screen_description: `Dynamic social board and active channels hub tailored for ${targetUsers}. Displays discussion panels, hot topics, and active user feeds.`,
        screen_purpose: "Enables direct engagement with online interest channels, chat lobbies, and trending discussion boards.",
        layout_html: `
          <div class="p-6 bg-slate-900 text-white font-sans rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
            <div class="absolute -right-16 -top-16 w-32 h-32 bg-pink-600/10 rounded-full blur-2xl"></div>
            <div class="flex items-center justify-between mb-8">
              <div>
                <div class="text-[10px] font-bold text-pink-400 uppercase tracking-widest mb-1">Buzz Center</div>
                <h1 class="text-2xl font-black tracking-tight">${projName}</h1>
              </div>
              <div class="flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 px-3 py-1.5 rounded-full text-xs text-pink-300 font-semibold">
                <span class="w-1.5 h-1.5 bg-pink-400 rounded-full"></span> 42 Online
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              <div class="p-5 bg-slate-800/40 rounded-xl border border-slate-700/30">
                <div class="text-[10px] text-pink-300 uppercase tracking-wider font-extrabold mb-1">Primary Community</div>
                <div class="text-sm font-bold text-slate-100">${targetUsers}</div>
              </div>
              <div class="p-5 bg-slate-800/40 rounded-xl border border-slate-700/30">
                <div class="text-[10px] text-pink-300 uppercase tracking-wider font-extrabold mb-1">Topic Challenge</div>
                <div class="text-xs font-medium text-slate-300 line-clamp-3">${problem}</div>
              </div>
              <div class="p-5 bg-slate-800/40 rounded-xl border border-slate-700/30">
                <div class="text-[10px] text-pink-300 uppercase tracking-wider font-extrabold mb-1">Discussion Index</div>
                <div class="text-lg font-black text-pink-400 font-mono">💬 14 active threads</div>
              </div>
            </div>
            <div class="bg-slate-800/20 border border-slate-700/30 rounded-xl p-5 mb-6">
              <h3 class="text-xs font-extrabold text-pink-300 uppercase tracking-widest mb-3">Community Features Enabled</h3>
              <div class="space-y-3">
                ${featureListHtml}
              </div>
            </div>
            <div class="flex justify-between items-center pt-3 border-t border-slate-800/60">
              <span class="text-[10px] font-mono text-slate-500">Lobby environment active</span>
              <button class="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all hover:shadow-lg">
                Enter Discussion
              </button>
            </div>
          </div>
        `
      },
      {
        screen_name: "📨 Interactive Discussion Room",
        screen_description: "Rich group-texting workspace containing custom formatted message bubbles, active typing indicators, and text input forms.",
        screen_purpose: "Connects target users in clean, high-contrast message environments to share thoughts and solve pain points.",
        layout_html: `
          <div class="p-6 bg-slate-900 text-white font-sans rounded-2xl border border-slate-800 shadow-2xl">
            <div class="flex items-center justify-between mb-6 pb-3 border-b border-slate-800">
              <div class="flex items-center gap-3">
                <span class="text-lg">📨</span>
                <div>
                  <h2 class="text-base font-bold text-white">#general-discussion</h2>
                  <p class="text-[10px] text-slate-400">Connecting ${targetUsers}</p>
                </div>
              </div>
              <span class="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
            </div>
            <div class="space-y-4 mb-6 max-h-48 overflow-y-auto font-sans">
              <div class="flex items-start gap-3">
                <div class="w-7 h-7 bg-pink-600/20 border border-pink-500/30 rounded-full flex items-center justify-center text-xs font-bold text-pink-300 shrink-0 font-sans">JD</div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-200 font-sans">Jane Doe</span>
                    <span class="text-[9px] text-slate-500 font-mono">2 min ago</span>
                  </div>
                  <p class="text-xs text-slate-300 mt-1 bg-slate-850 p-2.5 rounded-lg border border-slate-800 font-sans">Has anyone tried using ${projName} to solve: "${problem}" yet? It's awesome!</p>
                </div>
              </div>
              <div class="flex items-start gap-3 justify-end">
                <div class="text-right">
                  <div class="flex items-center gap-2 justify-end">
                    <span class="text-[9px] text-slate-500 font-mono">Just Now</span>
                    <span class="text-xs font-bold text-pink-400 font-sans">You (Student)</span>
                  </div>
                  <p class="text-xs text-white bg-pink-600 p-2.5 rounded-lg mt-1 text-left shadow-md font-sans">Absolutely! It streamlines everything for ${targetUsers} perfectly!</p>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <input type="text" placeholder="Type your comment..." class="flex-1 bg-slate-800/40 border border-slate-700/60 focus:border-pink-500 text-xs px-4 py-3 rounded-xl outline-none text-slate-200" />
              <button class="p-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl transition-all">
                Send
              </button>
            </div>
          </div>
        `
      },
      {
        screen_name: "👥 Social Meetup Clubs",
        screen_description: "Discover localized study clubs, startup project interest circles, and community-driven meetups.",
        screen_purpose: "Encourages group alignment and peer collaboration through interactive signup forms and event schedules.",
        layout_html: `
          <div class="p-6 bg-slate-900 text-white font-sans rounded-2xl border border-slate-800 shadow-2xl">
            <div class="flex justify-between items-center mb-6">
              <div>
                <h2 class="text-lg font-black tracking-tight">Meetup Circles</h2>
                <p class="text-xs text-slate-400 font-sans">Discover and join local peer groups today.</p>
              </div>
            </div>
            <div class="space-y-3.5 mb-6">
              <div class="p-4 bg-slate-800/40 border border-slate-700/30 rounded-xl flex items-center justify-between">
                <div>
                  <div class="text-xs font-bold text-slate-100 font-sans">🚀 Startup Pioneers Group</div>
                  <div class="text-[10px] text-slate-400 mt-0.5 font-sans">12 Members • Meets Weekly</div>
                </div>
                <button class="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-lg font-sans">
                  Join Circle
                </button>
              </div>
              <div class="p-4 bg-slate-800/40 border border-slate-700/30 rounded-xl flex items-center justify-between">
                <div>
                  <div class="text-xs font-bold text-slate-100 font-sans">🎓 Academic Collaboration Lab</div>
                  <div class="text-[10px] text-slate-400 mt-0.5 font-sans">8 Members • Meets Bi-weekly</div>
                </div>
                <button class="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-lg font-sans">
                  Join Circle
                </button>
              </div>
            </div>
            <div class="p-3.5 bg-pink-500/5 rounded-xl border border-pink-500/10 text-center font-sans">
              <span class="text-xs font-medium text-slate-400 font-sans">Don't see your niche? <span class="text-pink-400 font-bold hover:underline cursor-pointer">Create a New Circle</span></span>
            </div>
          </div>
        `
      }
    ];
  }

  // Fallback productivity / generic category
  return [
    {
      screen_name: "📊 Productivity Console",
      screen_description: `Operational command center customized for ${targetUsers}. Displays active workspace tasks, performance logs, and diagnostic states.`,
      screen_purpose: "Consolidates workflow metrics, shows productivity statistics, and outlines critical tasks.",
      layout_html: `
        <div class="p-6 bg-slate-900 text-white font-sans rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
          <div class="absolute -right-16 -top-16 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl"></div>
          <div class="flex items-center justify-between mb-8">
            <div>
              <div class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Central Hub</div>
              <h1 class="text-2xl font-black tracking-tight">${projName}</h1>
            </div>
            <div class="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full text-xs text-indigo-300 font-semibold">
              <span class="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span> Running
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <div class="p-5 bg-slate-800/40 rounded-xl border border-slate-700/30">
              <div class="text-[10px] text-indigo-300 uppercase tracking-wider font-extrabold mb-1">Target Client</div>
              <div class="text-sm font-bold text-slate-100">${targetUsers}</div>
            </div>
            <div class="p-5 bg-slate-800/40 rounded-xl border border-slate-700/30">
              <div class="text-[10px] text-indigo-300 uppercase tracking-wider font-extrabold mb-1">Pain Point Handled</div>
              <div class="text-xs font-medium text-slate-300 line-clamp-3">${problem}</div>
            </div>
            <div class="p-5 bg-slate-800/40 rounded-xl border border-slate-700/30">
              <div class="text-[10px] text-indigo-300 uppercase tracking-wider font-extrabold mb-1">Workspace Status</div>
              <div class="text-lg font-black text-indigo-400 font-mono">📊 100% Calibrated</div>
            </div>
          </div>
          <div class="bg-slate-800/20 border border-slate-700/30 rounded-xl p-5 mb-6">
            <h3 class="text-xs font-extrabold text-indigo-300 uppercase tracking-widest mb-3">Core Functions Deployed</h3>
            <div class="space-y-3">
              ${featureListHtml}
            </div>
          </div>
          <div class="flex justify-between items-center pt-3 border-t border-slate-800/60">
            <span class="text-[10px] font-mono text-slate-500">Command track running</span>
            <button class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all hover:shadow-lg">
              Open Board
            </button>
          </div>
        </div>
      `
    },
    {
      screen_name: "⚙️ Automated Workflow Solver",
      screen_description: "Active solution and action-configurator engine to process parameters and compute results.",
      screen_purpose: "Enables manual user setups and executes smart automated simulation rules.",
      layout_html: `
        <div class="p-6 bg-slate-900 text-white font-sans rounded-2xl border border-slate-800 shadow-2xl">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 bg-indigo-600/20 border border-indigo-500/30 rounded-xl flex items-center justify-center text-indigo-400 text-lg">⚙️</div>
            <div>
              <h2 class="text-lg font-black tracking-tight">Workflow Automator</h2>
              <p class="text-xs text-slate-400 font-sans">Configure parameters to resolve your core issues instantly.</p>
            </div>
          </div>
          <div class="space-y-4 mb-6">
            <div>
              <label class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">Target Variable Setup</label>
              <input type="text" placeholder="Specify variable parameters..." class="w-full bg-slate-800/40 border border-slate-700/60 focus:border-indigo-500 text-xs px-4 py-3 rounded-xl outline-none text-slate-200" />
            </div>
            <div>
              <label class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">Detailed Context Settings</label>
              <textarea rows="3" placeholder="Provide extra detail descriptors..." class="w-full bg-slate-800/40 border border-slate-700/60 focus:border-indigo-500 text-xs px-4 py-3 rounded-xl outline-none text-slate-200 resize-none"></textarea>
            </div>
          </div>
          <div class="flex justify-between items-center pt-4 border-t border-slate-800">
            <span class="text-[10px] font-mono text-slate-500">Simulation engine ready</span>
            <button class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl">
              Run Automator
            </button>
          </div>
        </div>
      `
    },
    {
      screen_name: "📋 Workspace Kanban Board",
      screen_description: "Consolidated work boards splitting active tasks into Todo, Doing, and Done categories.",
      screen_purpose: "Displays historical operations, manages project progress, and coordinates task priorities.",
      layout_html: `
        <div class="p-6 bg-slate-900 text-white font-sans rounded-2xl border border-slate-800 shadow-2xl">
          <div class="flex justify-between items-center mb-6 font-sans">
            <div>
              <h2 class="text-lg font-black tracking-tight">Kanban Task Board</h2>
              <p class="text-xs text-slate-400 font-sans">Track and manage task development progress.</p>
            </div>
            <button class="px-3 py-1.5 bg-slate-800 border border-slate-700/40 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-300 font-sans">
              📥 Export CSV
            </button>
          </div>
          <div class="grid grid-cols-3 gap-3 mb-6 font-sans">
            <div class="p-3 bg-slate-800/40 border border-slate-700/30 rounded-xl">
              <div class="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2 font-sans text-center">Todo</div>
              <div class="p-2 bg-slate-900 border border-slate-800 rounded text-[11px] font-medium text-slate-300 text-center font-sans">Calibrate app settings</div>
            </div>
            <div class="p-3 bg-slate-800/40 border border-slate-700/30 rounded-xl">
              <div class="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2 font-sans text-center">Doing</div>
              <div class="p-2 bg-slate-900 border border-slate-800 rounded text-[11px] font-medium text-slate-300 text-center font-sans">Wire visual charts</div>
            </div>
            <div class="p-3 bg-slate-800/40 border border-slate-700/30 rounded-xl">
              <div class="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2 font-sans text-center">Done</div>
              <div class="p-2 bg-slate-900 border border-slate-800 rounded text-[11px] font-medium text-slate-300 text-center font-sans">Draft wireframe maps</div>
            </div>
          </div>
          <div class="p-3.5 bg-indigo-500/5 rounded-xl border border-indigo-500/10 font-sans">
            <div class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1 font-sans">💡 Workspace Tip</div>
            <p class="text-[11px] text-slate-400 leading-normal font-sans">Operational charts demonstrate a 25% boost in task completion speed when visual cards are aligned early.</p>
          </div>
        </div>
      `
    }
  ];
}

// 6. POST /api/product/journey/approve
router.post('/journey/approve', authenticateToken, async (req: any, res) => {
  const { session_id } = req.body;

  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    // Check if screens are already pre-generated and cached in the DB
    const [existingScreens]: any = await p.execute('SELECT * FROM product_screens WHERE session_id = ?', [session_id]);
    if (existingScreens && existingScreens.length > 0) {
      // Update session current_step = 'screens'
      await p.execute(
        "UPDATE product_sessions SET current_step = 'screens' WHERE id = ?",
        [session_id]
      );
      return res.json({ screens: existingScreens });
    }

    const [bpRows]: any = await p.execute('SELECT * FROM product_blueprints WHERE session_id = ?', [session_id]);
    if (!bpRows || bpRows.length === 0) {
      return res.status(404).json({ error: 'Blueprint not found' });
    }
    const bp = bpRows[0];

    const [journeyRows]: any = await p.execute('SELECT * FROM user_journeys WHERE session_id = ?', [session_id]);
    const journey = journeyRows[0] || {};

    const [featureRows]: any = await p.execute(
      'SELECT * FROM product_features WHERE session_id = ? AND is_included = 1',
      [session_id]
    );

    const prompt = `
      You are an expert Frontend Designer. Generate 3 to 4 core product user screens as beautiful, responsive, glassmorphic layout modules built with Tailwind CSS.
      
      Project details:
      Name: ${bp.project_name}
      Problem Statement: ${bp.problem_statement}
      Target Users: ${bp.target_users}
      MVP Scope: ${bp.mvp_scope}
      
      User Journey:
      ${journey.steps ? JSON.stringify(safeParseJSON(journey.steps)) : ''}
      
      Approved Features:
      ${featureRows.map((f: any) => `- ${f.feature_name}: ${f.feature_description}`).join('\n')}
      
      Create 3 or 4 distinctive, fully responsive screen components. The 'layout_html' for each screen MUST be a clean container HTML body utilizing standard Tailwind utility classes, complete with elegant typography, spacing, mock action buttons, beautiful SVG icons, grids, and mock data tables/charts to represent a high-fidelity visual preview. Use deep slate dark modes or classy clean layouts.
      
      Return ONLY a valid JSON list of screens, with no markdown backticks and no preamble:
      [
        {
          "screen_name": "Screen Title (e.g. Dashboard)",
          "screen_description": "Summary explaining the views and context.",
          "screen_purpose": "Core task or action for the user on this screen",
          "layout_html": "FULL container HTML styled with Tailwind classes"
        }
      ]
    `;

    let suggestedScreens;
    try {
      const geminiRes = await getGeminiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const clean = parseGeminiResponse(geminiRes);
      suggestedScreens = JSON.parse(clean);
    } catch (geminiError) {
      console.warn('Failed to dynamically compile screen layouts via Gemini, using high-fidelity Tailwind fallbacks:', geminiError);
      suggestedScreens = [
        {
          screen_name: "Central Command Dashboard",
          screen_description: `Main interface landing page for ${bp.project_name}, showing live status summaries, active trackers, and personalized metrics for ${bp.target_users}.`,
          screen_purpose: "To provide a complete operational bird's-eye view, review quick stats, and launch core task modules.",
          layout_html: `
            <div class="p-6 bg-slate-900 text-white font-sans rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
              <div class="flex items-center justify-between mb-8">
                <div>
                  <div class="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Central Console</div>
                  <h1 class="text-2xl font-black tracking-tight">${bp.project_name}</h1>
                </div>
                <div class="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full text-xs text-blue-400 font-semibold animate-pulse">
                  <span class="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> Active Prototype
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                <div class="p-5 bg-slate-800/40 rounded-xl border border-slate-700/30">
                  <div class="text-xs text-slate-400 uppercase tracking-wider font-semibold">Primary Target Users</div>
                  <div class="text-lg font-bold mt-1 text-slate-100">${bp.target_users}</div>
                </div>
                <div class="p-5 bg-slate-800/40 rounded-xl border border-slate-700/30">
                  <div class="text-xs text-slate-400 uppercase tracking-wider font-semibold">Identified Core Painpoint</div>
                  <div class="text-sm font-medium mt-1 text-slate-100 line-clamp-2">${bp.problem_statement}</div>
                </div>
                <div class="p-5 bg-slate-800/40 rounded-xl border border-slate-700/30">
                  <div class="text-xs text-slate-400 uppercase tracking-wider font-semibold">Build Status</div>
                  <div class="text-lg font-bold mt-1 text-green-400 font-mono">100% Core Ready</div>
                </div>
              </div>
              <div class="bg-slate-800/20 border border-slate-700/30 rounded-xl p-5 mb-6">
                <h3 class="text-sm font-bold text-slate-300 mb-3">Included MVP Features</h3>
                <div class="space-y-2.5">
                  ${featureRows.slice(0, 4).map((f: any) => `
                    <div class="flex items-start gap-3">
                      <span class="text-blue-500 mt-0.5">✓</span>
                      <div>
                        <div class="text-xs font-bold text-slate-100">${f.feature_name}</div>
                        <div class="text-[11px] text-slate-400 font-medium">${f.feature_description}</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
              <div class="flex justify-end pt-2 border-t border-slate-800/60">
                <button class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-transform hover:-translate-y-0.5">
                  Explore Workspace
                </button>
              </div>
            </div>
          `
        },
        {
          screen_name: "Action Solver Engine",
          screen_description: `High-fidelity main working canvas solving: "${bp.problem_statement}". Allows user inputs and real-time computation.`,
          screen_purpose: "To handle main user configuration steps, perform core platform operations, and display responsive calculated actions.",
          layout_html: `
            <div class="p-6 bg-slate-900 text-white font-sans rounded-2xl border border-slate-800 shadow-2xl">
              <div class="flex items-center gap-3 mb-6">
                <div class="w-10 h-10 bg-blue-600/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-500 text-lg font-bold">⚙️</div>
                <div>
                  <h2 class="text-lg font-black tracking-tight">Interactive Solution Suite</h2>
                  <p class="text-xs text-slate-400">Perform live computational tasks and generate responsive outputs.</p>
                </div>
              </div>
              <div class="space-y-5 mb-6">
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Configure Target Variables</label>
                  <input type="text" placeholder="Enter variable/metadata inputs..." class="w-full bg-slate-800/40 border border-slate-700/60 focus:border-blue-500 text-xs px-4 py-3 rounded-xl outline-none text-slate-200 font-medium placeholder:text-slate-500" />
                </div>
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Specify Focus Parameters</label>
                  <textarea rows="3" placeholder="Define custom settings details..." class="w-full bg-slate-800/40 border border-slate-700/60 focus:border-blue-500 text-xs px-4 py-3 rounded-xl outline-none text-slate-200 font-medium resize-none placeholder:text-slate-500"></textarea>
                </div>
              </div>
              <div class="flex items-center justify-between pt-4 border-t border-slate-800">
                <span class="text-[11px] font-mono text-slate-500">Inputs will process dynamically</span>
                <button class="px-5 py-2.5 bg-blue-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md">
                  Execute Simulation
                </button>
              </div>
            </div>
          `
        },
        {
          screen_name: "Audit Logs & Success Insights",
          screen_description: "The historical logs dashboard keeping trace of all user actions, downloadable export spreadsheets, and high-impact reports.",
          screen_purpose: "Review historical work, verify completed tasks, and download compiled custom analytics report summaries.",
          layout_html: `
            <div class="p-6 bg-slate-900 text-white font-sans rounded-2xl border border-slate-800 shadow-2xl">
              <div class="flex justify-between items-center mb-6">
                <div>
                  <h2 class="text-lg font-black tracking-tight">Optimization Logs & Analytics</h2>
                  <p class="text-xs text-slate-400">Browse historical operations and audit trial states.</p>
                </div>
                <button class="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs text-slate-300 border border-slate-700/40 font-bold">
                  📥 Export CSV
                </button>
              </div>
              <div class="overflow-hidden border border-slate-800 rounded-xl mb-6 bg-slate-850">
                <table class="w-full text-left text-xs text-slate-300">
                  <thead class="bg-slate-800/60 text-slate-400 font-bold border-b border-slate-850 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th class="p-3.5">Timestamp</th>
                      <th class="p-3.5">Activity Operation</th>
                      <th class="p-3.5">Status Check</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800/40">
                    <tr>
                      <td class="p-3.5 font-mono text-slate-400">Just Now</td>
                      <td class="p-3.5 font-medium">Initial system configuration launched</td>
                      <td class="p-3.5"><span class="px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 font-mono text-[9px] uppercase tracking-wider rounded">Completed</span></td>
                    </tr>
                    <tr>
                      <td class="p-3.5 font-mono text-slate-400">2 Hours ago</td>
                      <td class="p-3.5 font-medium">Custom environment parameters calibrated</td>
                      <td class="p-3.5"><span class="px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 font-mono text-[9px] uppercase tracking-wider rounded">Completed</span></td>
                    </tr>
                    <tr>
                      <td class="p-3.5 font-mono text-slate-400">Yesterday</td>
                      <td class="p-3.5 font-medium">Database verification completed</td>
                      <td class="p-3.5"><span class="px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 font-mono text-[9px] uppercase tracking-wider rounded">Completed</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10">
                <div class="text-xs text-blue-400 font-bold mb-1">💡 Pro Insight Tip</div>
                <p class="text-[11px] text-slate-400 leading-normal">Operational trials indicate a 40% reduction in workflow context-switching when utilizing this consolidated MVP framework.</p>
              </div>
            </div>
          `
        }
      ];
    }

    // Save screens to product_screens table
    for (const s of suggestedScreens) {
      await p.execute(
        `INSERT INTO product_screens (session_id, screen_name, screen_description, screen_purpose, layout_html)
         VALUES (?, ?, ?, ?, ?)`,
        [session_id, s.screen_name, s.screen_description, s.screen_purpose, s.layout_html]
      );
    }

    // Update current_step = 'screens'
    await p.execute(
      "UPDATE product_sessions SET current_step = 'screens' WHERE id = ?",
      [session_id]
    );

    const [allScreens]: any = await p.execute(
      'SELECT * FROM product_screens WHERE session_id = ?',
      [session_id]
    );

    res.json({ screens: allScreens });
  } catch (error: any) {
    console.error('Failed to approve journey:', error);
    res.status(500).json({ error: error.message || 'Failed to approve user journey and generate screens' });
  }
});

// 7. POST /api/product/screens/approve
router.post('/screens/approve', authenticateToken, async (req: any, res) => {
  const { session_id, change_requests } = req.body;

  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    // If change_requests is empty/null, check if MVP is already pre-generated and cached in the DB
    if (!change_requests || change_requests.trim() === '') {
      const [existingMvp]: any = await p.execute('SELECT * FROM mvp_builds WHERE session_id = ?', [session_id]);
      if (existingMvp && existingMvp.length > 0) {
        // Update session current_step = 'review'
        await p.execute(
          "UPDATE product_sessions SET current_step = 'review' WHERE id = ?",
          [session_id]
        );
        return res.json({
          mvp_html: existingMvp[0].mvp_html,
          architecture_explanation: existingMvp[0].architecture_explanation
        });
      }
    }

    const [bpRows]: any = await p.execute('SELECT * FROM product_blueprints WHERE session_id = ?', [session_id]);
    if (!bpRows || bpRows.length === 0) {
      return res.status(404).json({ error: 'Blueprint not found' });
    }
    const bp = bpRows[0];

    const [featureRows]: any = await p.execute(
      'SELECT * FROM product_features WHERE session_id = ? AND is_included = 1',
      [session_id]
    );

    const [screenRows]: any = await p.execute(
      'SELECT * FROM product_screens WHERE session_id = ?',
      [session_id]
    );

    // If change_requests exists, regenerate screens
    if (change_requests && change_requests.trim() !== '') {
      let regeneratedScreens;
      try {
        const prompt = `
          You are an expert Frontend Designer. The student requested these custom adjustments to their screens:
          "${change_requests}"
          
          Here are the current screens:
          ${JSON.stringify(screenRows)}
          
          Regenerate the updated screens incorporating the student's feedback. Maintain 3-4 distinct screens, styled with rich modern Tailwind CSS classes and high-contrast elegant layouts, fully optimized for display previews.
          
          Return ONLY a valid JSON list of screens matching the previous schema, with no markdown backticks and no preamble:
          [
            {
              "screen_name": "Screen Title",
              "screen_description": "...",
              "screen_purpose": "...",
              "layout_html": "..."
            }
          ]
        `;

        const geminiRes = await getGeminiClient().models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        });

        const clean = parseGeminiResponse(geminiRes);
        regeneratedScreens = JSON.parse(clean);
      } catch (geminiError) {
        console.warn('Failed to regenerate screens via Gemini, keeping existing with change markers:', geminiError);
        // Fallback: Use existing screens but attach request log info
        regeneratedScreens = screenRows.map((s: any) => ({
          screen_name: s.screen_name,
          screen_description: s.screen_description + " (Custom revisions: " + change_requests + ")",
          screen_purpose: s.screen_purpose,
          layout_html: s.layout_html
        }));
      }

      // Clean existing screens for session
      await p.execute('DELETE FROM product_screens WHERE session_id = ?', [session_id]);

      // Save regenerated screens in database
      for (const s of regeneratedScreens) {
        await p.execute(
          `INSERT INTO product_screens (session_id, screen_name, screen_description, screen_purpose, layout_html, change_requests)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [session_id, s.screen_name, s.screen_description, s.screen_purpose, s.layout_html, change_requests]
        );
      }

      const [newScreens]: any = await p.execute(
        'SELECT * FROM product_screens WHERE session_id = ?',
        [session_id]
      );

      return res.json({
        screens: newScreens,
        regenerated: true,
        current_step: 'screens'
      });
    }

    // Else: approve screens, generate MVP
    const userId = req.user.userId;

    const systemPrompt = `You are a frontend developer building a working MVP prototype for a student aged 13-16.
Generate a complete single-file HTML with embedded CSS and JavaScript.

Rules:
- HTML, CSS, vanilla JS only — no external libraries or CDN links
- Fully self-contained — works when opened directly in any browser
- All product screens as separate views, navigated with JS (show/hide divs)
- Realistic placeholder/sample data so it looks real and usable
- Clean design: white background, clear fonts, obvious buttons
- Add footer: "Built with VibeLab 🚀"
- Prototype quality — simple and clear, not complex

ADDITIONAL REQUIREMENT — Component tagging:
Every meaningful interactive element (buttons, forms, key sections, navigation, data displays) must include these HTML data attributes:
  data-component-id="unique_id_here"
  data-component-type="button | form | nav | display | input"
  data-purpose="short description of what this does"

Example:
<button data-component-id="submit_attendance" data-component-type="button" data-purpose="Submits the student's attendance record">Submit</button>

Tag only meaningful elements — not every single div or span.
Aim for 8-15 tagged elements per product depending on complexity.
You MUST write these attributes exactly adjacent to each other in this precise order: data-component-id="..." data-component-type="..." data-purpose="..." inside the HTML tags, with only spaces separating them.

Return ONLY the complete HTML file.
No markdown. No explanation. No code fences. Just the raw HTML.`;

    const prompt = `
      You are compiling an MVP for a student product session. Build a complete working MVP prototype for:
      Name: ${bp.project_name}
      Problem: ${bp.problem_statement}
      Scope: ${bp.mvp_scope}
      
      Approved Features:
      ${featureRows.map((f: any) => `- ${f.feature_name}: ${f.feature_description}`).join('\n')}
      
      Visual Reference Screens to map:
      ${screenRows.map((s: any) => `* Screen: ${s.screen_name}\nDescription: ${s.screen_description}\nPurpose: ${s.screen_purpose}`).join('\n')}
      
      Return a JSON response matching the following schema, with no markdown backticks and no preamble:
      {
        "mvp_html": "The complete, single-file HTML generated strictly in accordance with the system instruction.",
        "architecture_explanation": "🏗️ How It's Built\\nDescribe how it was made using simple self-contained HTML/CSS/JS in a child-friendly way.\\n\\n✨ What It Does\\nWrite a clear list of the working mock features.\\n\\n👥 Who It Helps\\nWrite who this solves a problem for and how it changes their day."
      }
    `;

    let parsedMvp;
    try {
      const geminiRes = await getGeminiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json"
        }
      });

      const clean = parseGeminiResponse(geminiRes);
      try {
        parsedMvp = JSON.parse(clean);
      } catch (parseErr) {
        console.warn('JSON.parse failed on Gemini response, attempting custom regex-based robust parsing extraction...', parseErr);
        
        let extractedHtml = '';
        const htmlBlockMatch = clean.match(/(<!DOCTYPE[\s\S]*?<\/html>|<html[\s\S]*?<\/html>)/i);
        if (htmlBlockMatch) {
          extractedHtml = htmlBlockMatch[0];
          if (extractedHtml.includes('\\"')) {
            extractedHtml = extractedHtml
              .replace(/\\"/g, '"')
              .replace(/\\n/g, '\n')
              .replace(/\\t/g, '\t')
              .replace(/\\\\/g, '\\');
          }
        }
        
        let extractedArch = '';
        const archMatch = clean.match(/"architecture_explanation"\s*:\s*"([\s\S]*?)"\s*(?:,|\s*})/i);
        if (archMatch) {
          extractedArch = archMatch[1];
          if (extractedArch.includes('\\"')) {
            extractedArch = extractedArch
              .replace(/\\"/g, '"')
              .replace(/\\n/g, '\n')
              .replace(/\\t/g, '\t')
              .replace(/\\\\/g, '\\');
          }
        } else {
          const alternativeArchMatch = clean.match(/architecture_explanation[\s\S]*?:\s*"([\s\S]*?)"/i);
          if (alternativeArchMatch) {
            extractedArch = alternativeArchMatch[1];
            if (extractedArch.includes('\\"')) {
              extractedArch = extractedArch
                .replace(/\\"/g, '"')
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t')
                .replace(/\\\\/g, '\\');
            }
          }
        }
        
        if (extractedHtml) {
          parsedMvp = {
            mvp_html: extractedHtml,
            architecture_explanation: extractedArch || `🏗️ Custom-Built MVP\n\n✨ Features Loaded\nRendered customized pages and styled panels dynamically leveraging system templates.\n\n👥 Audience\nBuilt for the specified target demographic users.`
          };
        } else {
          throw parseErr;
        }
      }
    } catch (geminiError) {
      console.warn('Failed to dynamically draft custom MVP HTML via Gemini, compiling click-to-cycle tab prototype local fallback:', geminiError);
      
      const fallbackHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${bp.project_name} - MVP Prototype</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
    </style>
</head>
<body class="bg-indigo-950/20 text-slate-150 min-h-screen flex flex-col font-sans">
    <header data-component-id="app_header" data-component-type="nav" data-purpose="Application navigation and header summary" class="bg-slate-900 border-b border-indigo-900/30 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div class="flex items-center gap-3">
            <span class="text-xl">🚀</span>
            <div>
                <h1 class="text-sm md:text-base font-black tracking-tight text-white">${bp.project_name}</h1>
                <p class="text-[9px] uppercase font-bold tracking-wider text-indigo-400">Interactive MVP Prototyping Module</p>
            </div>
        </div>
        <div class="flex items-center gap-2 text-[10px] font-semibold text-slate-400 bg-slate-950 px-3 py-1.5 rounded-full border border-indigo-950">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Live Draft
        </div>
    </header>

    <main class="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8">
        <div data-component-id="target_demographics" data-component-type="display" data-purpose="Target demographics banner explaining solved problem statement and key user focus" class="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-5 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <span class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-0.5">Focus Demographics</span>
                <p class="text-sm font-semibold text-slate-200">Target Users: <span class="text-white font-extrabold">${bp.target_users}</span></p>
                <p class="text-xs text-slate-400 line-clamp-1 mt-0.5">Unlocking solutions for: "${bp.problem_statement}"</p>
            </div>
            <div data-component-id="prototype_badge" data-component-type="display" data-purpose="Static status badge labeling sandbox environments" class="bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-bold text-[10px] uppercase px-3 py-2 rounded-lg shrink-0">
                MVP Prototype Kit
            </div>
        </div>

        <div data-component-id="tab_navigation" data-component-type="nav" data-purpose="Control bar to switch views between designed screens inside the prototype" class="flex flex-wrap gap-2 mb-6 border-b border-indigo-900/10 pb-4">
            \${screenRows.map((s, idx) => \`
                <button onclick="switchScreen(\\\${idx})" id="tab-\\\${idx}" data-component-id="screen_tab_\\\${idx}" data-component-type="button" data-purpose="Switch active presentation view to \\\${s.screen_name}" class="tab-btn px-4 py-2.5 rounded-xl text-xs font-bold transition-all border \\\${idx === 0 ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-300'\}">
                    \\\${s.screen_name\}
                </button>
            \`).join('')\}
        </div>

        <div data-component-id="screen_views_group" data-component-type="display" data-purpose="Container rendering layout modules of active screen views" class="space-y-6">
            \${screenRows.map((s, idx) => \`
                <div id="screen-\\\${idx}" class="screen-view \\\${idx === 0 ? 'block' : 'hidden'\}">
                    <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-2xl">
                        <div class="mb-5 pb-3 border-b border-slate-800">
                            <h3 class="text-[10px] font-bold text-indigo-400 tracking-wider uppercase mb-0.5">Visual Preview Model</h3>
                            <h2 class="text-base font-bold text-white">\\\${s.screen_name\}</h2>
                            <p class="text-xs text-slate-400 mt-1">\\\${s.screen_description\}</p>
                        </div>
                        <div data-component-id="rendered_layout_\\\${idx}" data-component-type="display" data-purpose="Actual presentation view showing widgets and controls of \\\${s.screen_name}" class="bg-slate-950/80 rounded-xl overflow-hidden p-3 border border-slate-800 shadow-inner">
                            \\\${s.layout_html\}
                        </div>
                    </div>
                </div>
            \`).join('')\}
        </div>
    </main>

    <footer class="bg-slate-950/90 text-center py-6 text-[11px] text-slate-500 mt-12 border-t border-slate-900">
        <p class="mb-1">Built with <strong>VibeLab 🚀</strong></p>
        <p class="text-slate-600">Prototyping Sandbox Studio | All Rights Reserved 2026</p>
    </footer>

    <script>
        function switchScreen(activeIdx) {
            document.querySelectorAll('.screen-view').forEach((el, idx) => {
                if (idx === activeIdx) {
                    el.classList.remove('hidden');
                    el.classList.add('block');
                } else {
                    el.classList.add('hidden');
                }
            });

            document.querySelectorAll('.tab-btn').forEach((btn, idx) => {
                if (idx === activeIdx) {
                    btn.className = "tab-btn px-4 py-2.5 rounded-xl text-xs font-bold transition-all border bg-indigo-600 border-indigo-600 text-white shadow-lg";
                } else {
                    btn.className = "tab-btn px-4 py-2.5 rounded-xl text-xs font-bold transition-all border bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-300";
                }
            });
        }
    </script>
</body>
</html>`;

      // Interpolate screen and feature arrays into fallback HTML correctly
      const interpolatedFallback = fallbackHtml
        .replace(/\\\${idx}/g, (_, i) => `idx`) // placeholder replace helper
        .replace(/\\\${s\.screen_name}/g, screenRows[0]?.screen_name || 'Home')
        .replace(/\${screenRows\.map\([\s\S]+?\}\.join\(''\)\}/g, screenRows.map((s: any, idx: number) => `
          <button onclick="switchScreen(${idx})" id="tab-${idx}" data-component-id="screen_tab_${idx}" data-component-type="button" data-purpose="Switch active presentation view to ${s.screen_name}" class="tab-btn px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${idx === 0 ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-300'}">
              ${s.screen_name}
          </button>
        `).join(''))
        .replace(/\${screenRows\.map\([\s\S]+?rendered_layout_\\\${idx}[\s\S]+?\}\.join\(''\)\}/g, screenRows.map((s: any, idx: number) => `
          <div id="screen-${idx}" class="screen-view ${idx === 0 ? 'block' : 'hidden'}">
              <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-2xl">
                  <div class="mb-5 pb-3 border-b border-slate-800">
                      <h3 class="text-[10px] font-bold text-indigo-400 tracking-wider uppercase mb-0.5">Visual Preview Model</h3>
                      <h2 class="text-base font-bold text-white">${s.screen_name}</h2>
                      <p class="text-xs text-slate-400 mt-1">${s.screen_description}</p>
                  </div>
                  <div data-component-id="rendered_layout_${idx}" data-component-type="display" data-purpose="Actual presentation view showing widgets and controls of ${s.screen_name}" class="bg-slate-950/80 rounded-xl overflow-hidden p-3 border border-slate-800 shadow-inner">
                      ${s.layout_html}
                  </div>
              </div>
          </div>
        `).join(''));

      parsedMvp = {
        mvp_html: interpolatedFallback,
        architecture_explanation: `🏗️ How It's Built\nConfigured as an elegant, interactive single-file browser prototype using self-contained HTML frame modules and tailored Tailwind component visuals.\n\n✨ What It Does\nSets up click-to-navigate live tabs mapping these designed views: ${screenRows.map((s: any) => s.screen_name).join(', ')}, equipped with status parameters and layout outlines.\n\n👥 Who It Helps\nEmpowers ${bp.target_users} to interactively review operational screens and validate workflow logic seamlessly.`
      };
    }

    // Capture component attributes from generated build code matching requested regex list
    const mvpHtml = parsedMvp.mvp_html;
    const componentMatches = mvpHtml.matchAll(
      /data-component-id="([^"]+)"\s+data-component-type="([^"]+)"\s+data-purpose="([^"]+)"/g
    );

    const components: Array<{ id: string; type: string; purpose: string }> = [];
    const seenIds = new Set<string>();

    for (const match of componentMatches) {
      const id = match[1];
      const type = match[2];
      const purpose = match[3];
      if (!seenIds.has(id)) {
        seenIds.add(id);
        components.push({ id, type, purpose });
      }
    }

    // Extra resilient backup element parser in case attributes were formatted with different spacing
    if (components.length === 0) {
      const fallbackRegex = /<[^>]+data-component-id="([^"]+)"[^>]*>/g;
      const elementMatches = [...mvpHtml.matchAll(fallbackRegex)];
      for (const em of elementMatches) {
        const tagContent = em[0];
        const idMatch = tagContent.match(/data-component-id="([^"]+)"/);
        const typeMatch = tagContent.match(/data-component-type="([^"]+)"/);
        const purposeMatch = tagContent.match(/data-purpose="([^"]+)"/);
        if (idMatch && !seenIds.has(idMatch[1])) {
          seenIds.add(idMatch[1]);
          components.push({
            id: idMatch[1],
            type: typeMatch ? typeMatch[1] : 'display',
            purpose: purposeMatch ? purposeMatch[1] : 'Interactive UI section'
          });
        }
      }
    }

    // Absolute fallback: Ensure we always have metadata for explanations tab
    if (components.length === 0) {
      components.push({
        id: 'app_header',
        type: 'nav',
        purpose: 'Top navigation to display product name'
      });
      screenRows.forEach((s: any, idx: number) => {
        components.push({
          id: `screen_tab_${idx}`,
          type: 'button',
          purpose: `Navigate to the ${s.screen_name} application page`
        });
      });
    }

    // Ask Gemini for Simple & Technical explanations + skills learned JSON + AI contribution summary in a single batch call.
    let explanationsJson: any = {
      components: [],
      skills_learned: [],
      ai_contribution_summary: ""
    };

    try {
      const explanationPrompt = `
        You are explaining parts of a student's own product in plain language.
        Student's product: ${bp.project_name}
        Problem it solves: ${bp.problem_statement}

        For each component below, generate two explanations:
        1. Simple — one sentence, no technical terms, for a beginner
        2. Technical — one sentence, may use basic technical terms

        Components:
        ${components.map(c => `- ID: ${c.id}, Type: ${c.type}, Purpose: ${c.purpose}`).join('\n')}

        In addition, based on the features the student approved (${featureRows.map((f: any) => f.feature_name).join(', ')}), infer 3-5 key skills learned (like "User Authentication", "State Management", "Data Display", "Form Handling") indicating if they were demonstrated (true/false) as well as a short 1-2 sentence AI contribution summary of how the AI helped build this applet.

        Return ONLY a valid JSON object matching this schema, with no markdown backticks and no description outside the JSON:
        {
          "components": [
            {
              "component_id": "submit_attendance",
              "business_reason": "why this exists in the product",
              "simple_explanation": "...",
              "technical_explanation": "..."
            }
          ],
          "skills_learned": [
            { "skill": "User Authentication", "demonstrated": true },
            { "skill": "Form Handling", "demonstrated": true }
          ],
          "ai_contribution_summary": "..."
        }
      `;

      const explRes = await getGeminiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: explanationPrompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const cleanExpl = parseGeminiResponse(explRes);
      explanationsJson = JSON.parse(cleanExpl);
    } catch (err) {
      console.warn('Failed to generate explanations with Gemini, formulating programmatic high-quality fallback:', err);
      explanationsJson.components = components.map(c => ({
        component_id: c.id,
        business_reason: `To facilitate interactive ${c.type} capabilities within the user interface.`,
        simple_explanation: `This part of the app lets you: ${c.purpose}.`,
        technical_explanation: `An interactive ${c.type} block that lets clients trigger state updates for ${c.purpose}.`
      }));
      explanationsJson.skills_learned = [
        { skill: 'User Interface Construction', demonstrated: true },
        { skill: 'Interactive Controller Bindings', demonstrated: true },
        { skill: 'Responsive Page Layouts', demonstrated: true }
      ];
      explanationsJson.ai_contribution_summary = "Formulated the robust HTML mockup and registered responsive data-component hooks to enable hover inspectability and sandbox rendering.";
    }

    // Clean previous session component explanations
    await p.execute('DELETE FROM component_metadata WHERE session_id = ?', [session_id]);

    // Insert to component_metadata table
    for (const comp of (explanationsJson.components || [])) {
      const origComp = components.find(c => c.id === comp.component_id);
      await p.execute(
        `INSERT INTO component_metadata (session_id, component_id, component_type, purpose, business_reason, simple_explanation, technical_explanation)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          session_id,
          comp.component_id,
          origComp ? origComp.type : 'display',
          origComp ? origComp.purpose : 'App action capability',
          comp.business_reason || '',
          comp.simple_explanation || '',
          comp.technical_explanation || ''
        ]
      );
    }

    // Save to mvp_builds table with skills_learned and ai_contribution_summary included
    const skillsJsonStr = JSON.stringify(explanationsJson.skills_learned || []);
    const aiContribStr = explanationsJson.ai_contribution_summary || '';

    await p.execute(
      `INSERT INTO mvp_builds (session_id, user_id, mvp_html, architecture_explanation, status, skills_learned, ai_contribution_summary)
       VALUES (?, ?, ?, ?, 'ready_for_review', ?, ?)`,
      [session_id, userId, parsedMvp.mvp_html, parsedMvp.architecture_explanation, skillsJsonStr, aiContribStr]
    );

    // Update session current_step = 'review'
    await p.execute(
      "UPDATE product_sessions SET current_step = 'review' WHERE id = ?",
      [session_id]
    );

    res.json({
      mvp_html: parsedMvp.mvp_html,
      architecture_explanation: parsedMvp.architecture_explanation
    });
  } catch (error: any) {
    console.error('Failed to approve screens:', error);
    res.status(500).json({ error: error.message || 'Failed to approve screens and compile MVP build' });
  }
});

// 8. POST /api/product/mvp/approve
router.post('/mvp/approve', authenticateToken, async (req: any, res) => {
  const { session_id, builder_reflection } = req.body;

  if (!session_id || builder_reflection === undefined) {
    return res.status(400).json({ error: 'Missing session_id or builder_reflection' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const userId = req.user.userId;

    // Fetch details for copywriting context
    const [bpRows]: any = await p.execute('SELECT * FROM product_blueprints WHERE session_id = ?', [session_id]);
    const bp = bpRows[0] || {};

    const [mvpRows]: any = await p.execute('SELECT * FROM mvp_builds WHERE session_id = ?', [session_id]);
    const mvp = mvpRows[0] || {};

    // Generate Marketing Pitch & Pitching Materials
    const prompt = `
      You are an expert AI Product Marketer. The student has completed and approved their product MVP.
      Generate compelling copywriting and presentation materials for launching/pitching their app:
      
      Project: ${bp.project_name}
      Problem Statement: ${bp.problem_statement}
      MVP Scope: ${bp.mvp_scope}
      Student reflection on build: "${builder_reflection}"
      
      Generate:
      1. Product Description: A polished marketing pitch (2-3 paragraphs) capturing the problem, the innovative solution concept, and target users.
      2. Demo Script: A step-by-step presentation narrative script (approx 250-300 words) guiding the student on how to show of the working single-file MVP to prospective users or pitch to investors.
      3. Talking Points: 4 to 5 high-impact bulleted benefits focusing on user value, technical execution speed, and future scalability.
      
      Return ONLY a valid JSON object matching the schema below, without Markdown comments and no preamble:
      {
        "product_description": "Compelling launch description text...",
        "demo_script": "Step-by-step narrative script...",
        "key_talking_points": ["First talking point", "Second talking point", "Third talking point"]
      }
    `;

    let parsedDeliverables;
    try {
      const geminiRes = await getGeminiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const clean = parseGeminiResponse(geminiRes);
      parsedDeliverables = JSON.parse(clean);
    } catch (geminiError) {
      console.warn('Failed to dynamically draft marketing deliverables via Gemini, utilizing tailored copywriting fallbacks:', geminiError);
      parsedDeliverables = {
        product_description: `Introducing ${bp.project_name || 'My App'}, a pioneering solution intentionally designed to address the unique challenges of ${bp.target_users || 'our target users'}. By focusing specifically on "${bp.problem_statement || 'the core problem'}", this platform simplifies complex workflow barriers and introduces powerful automation to boost everyday productivity.\n\nBuilt as a lightweight, robust MVP prototype, ${bp.project_name || 'our product'} addresses core pain points and replaces clumsy legacy options with an elegant, responsive interface. It is optimized to perform flawlessly while maintaining user privacy and configuration versatility.`,
        demo_script: `Welcome everyone! Today I'm thrilled to demonstrate ${bp.project_name || 'our app'}, an interactive hub specifically engineered for ${bp.target_users || 'our target users'}.\n\nLet's begin by looking at our main layout console, designed to highlight primary stats and upcoming operations instantly. Next, notice how easily we can enter variable parameters inside our Solution Suite. With one simple click, the underlying workspace executes our workflow, saving active checklists and updating historical logs in real-time.\n\nUltimately, this prototype proves we can turn beautiful designs into fully operational solutions in record time. Thank you, and I look forward to answering any questions you have!`,
        key_talking_points: [
          `Specifically designed for ${bp.target_users || 'our target users'} to solve: "${bp.problem_statement || 'the core problem'}".`,
          `High-fidelity single-file architecture guarantees ultra-low load times and zero server footprint during test phases.`,
          `Configured with extensible structural layouts prepared for responsive database integration and multi-device support.`
        ]
      };
    }

    // Save deliverables, update status to approved, approved_at to NOW
    // Fetch approved features
    const [featureRows]: any = await p.execute(
      `SELECT feature_name FROM product_features WHERE session_id = ? AND is_included = 1`,
      [session_id]
    );
    const approved_features_list = featureRows.map((f: any) => f.feature_name).join(', ');

    // Get recommended track / product type
    const [sessionRows]: any = await p.execute(
      `SELECT pb.recommended_track 
       FROM product_sessions ps
       LEFT JOIN project_blueprints pb ON ps.ideation_session_id = pb.session_id
       WHERE ps.id = ?`,
      [session_id]
    );
    const recommended_track = sessionRows[0]?.recommended_track || 'Web Application';

    const skillsPrompt = `
      Based on these approved product features, analyze what this Grade 9-12 student demonstrated by building this product.
      
      Features: ${approved_features_list || 'Static Screen Design, Multi-screen Prototype'}
      Product type: ${recommended_track}
      
      Return ONLY valid JSON, no markdown:
      {
        "skills_demonstrated": [
          { "skill": "skill name", "demonstrated": true }
        ],
        "overall_skill_percentage": 65,
        "next_skills": ["Authentication", "Search", "Data Storage"]
      }
    `;

    let skillsJson = {
      skills_demonstrated: [
        { skill: 'HTML Structure & Layout', demonstrated: true },
        { skill: 'Interactive Sandbox Elements', demonstrated: true },
        { skill: 'Responsive Screen Design', demonstrated: true }
      ],
      overall_skill_percentage: 65,
      next_skills: ["Authentication", "Search", "Data Storage"]
    };

    try {
      const skillsRes = await getGeminiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: skillsPrompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      const cleanSkills = parseGeminiResponse(skillsRes);
      skillsJson = JSON.parse(cleanSkills);
    } catch (skillsError) {
      console.warn('Failed to dynamically analyze skills via Gemini, utilizing tailored fallbacks:', skillsError);
    }

    const projectNameStr = bp.project_name || 'your product';
    const ai_contribution_summary = `AI helped build the code structure and screens. You decided which features mattered most and how users would interact with ${projectNameStr}.`;

    await p.execute(
      `UPDATE mvp_builds
       SET product_description = ?, demo_script = ?, key_talking_points = ?, builder_reflection = ?, status = 'approved', approved_at = CURRENT_TIMESTAMP, skills_learned = ?, ai_contribution_summary = ?
       WHERE session_id = ?`,
      [
        parsedDeliverables.product_description,
        parsedDeliverables.demo_script,
        JSON.stringify(parsedDeliverables.key_talking_points),
        builder_reflection,
        JSON.stringify(skillsJson),
        ai_contribution_summary,
        session_id
      ]
    );

    // Update product_sessions table
    await p.execute(
      "UPDATE product_sessions SET status = 'completed', current_step = 'approved' WHERE id = ?",
      [session_id]
    );

    // Fetch Phase IDs
    const [p1Rows]: any = await p.execute('SELECT id FROM phases WHERE order_index = 1');
    const [p2Rows]: any = await p.execute('SELECT id FROM phases WHERE order_index = 2');
    const [p3Rows]: any = await p.execute('SELECT id FROM phases WHERE order_index = 3');
    const phase1Id = p1Rows[0]?.id;
    const phase2Id = p2Rows[0]?.id;
    const phase3Id = p3Rows[0]?.id;

    // Complete Phase 1 and 2, and Unlock Phase 3 (Testing & Validation - order_index=3) inside user_phase_progress
    if (phase1Id) {
      await p.execute(
        `INSERT INTO user_phase_progress (user_id, phase_id, status, progress_percentage)
         VALUES (?, ?, 'completed', 100)
         ON DUPLICATE KEY UPDATE status = 'completed', progress_percentage = 100`,
        [userId, phase1Id]
      );
    }
    if (phase2Id) {
      await p.execute(
        `INSERT INTO user_phase_progress (user_id, phase_id, status, progress_percentage)
         VALUES (?, ?, 'completed', 100)
         ON DUPLICATE KEY UPDATE status = 'completed', progress_percentage = 100`,
        [userId, phase2Id]
      );
    }
    if (phase3Id) {
      await p.execute(
        `INSERT INTO user_phase_progress (user_id, phase_id, status, unlocked_at)
         VALUES (?, ?, 'active', CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE status = 'active', unlocked_at = CURRENT_TIMESTAMP`,
        [userId, phase3Id]
      );
    }

    res.json({
      deliverables: {
        product_description: parsedDeliverables.product_description,
        demo_script: parsedDeliverables.demo_script,
        key_talking_points: parsedDeliverables.key_talking_points
      },
      toast: {
        title: "Phase 2 Complete 🎉",
        message: "Your MVP is ready. Phase 3 — Testing & Validation is now unlocked."
      }
    });
  } catch (error: any) {
    console.error('Failed to approve MVP:', error);
    res.status(500).json({ error: error.message || 'Failed to approve MVP and prepare launch kit' });
  }
});

// 9. GET /api/product/deliverables
router.get('/deliverables', authenticateToken, async (req: any, res) => {
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const userId = req.user.userId;

    // Retrieve the user's latest completed product session
    let [sessRows]: any = await p.execute(
      "SELECT * FROM product_sessions WHERE user_id = ? AND status = 'completed' ORDER BY id DESC LIMIT 1",
      [userId]
    );

    // Fallback if none are fully completed yet
    if (!sessRows || sessRows.length === 0) {
      const [allSess]: any = await p.execute(
        "SELECT * FROM product_sessions WHERE user_id = ? ORDER BY id DESC LIMIT 1",
        [userId]
      );
      sessRows = allSess;
    }

    if (!sessRows || sessRows.length === 0) {
      return res.status(404).json({ error: 'No active or completed product creation session found' });
    }

    const sessionId = sessRows[0].id;

    // Fetch all related tables
    const [bpRows]: any = await p.execute('SELECT * FROM product_blueprints WHERE session_id = ?', [sessionId]);
    const blueprint = bpRows[0] || null;

    const [features]: any = await p.execute('SELECT * FROM product_features WHERE session_id = ? AND is_included = 1', [sessionId]);

    const [journeyRows]: any = await p.execute('SELECT * FROM user_journeys WHERE session_id = ?', [sessionId]);
    const user_journey = journeyRows[0] ? {
      ...journeyRows[0],
      steps: safeParseJSON(journeyRows[0].steps, []),
      key_actions: safeParseJSON(journeyRows[0].key_actions, [])
    } : null;

    const [screens]: any = await p.execute('SELECT * FROM product_screens WHERE session_id = ?', [sessionId]);

    const [mvpRows]: any = await p.execute('SELECT * FROM mvp_builds WHERE session_id = ?', [sessionId]);
    const mvp = mvpRows[0] || null;

    res.json({
      blueprint,
      features: features || [],
      user_journey,
      screens: screens || [],
      mvp_html: mvp?.mvp_html || null,
      product_description: mvp?.product_description || null,
      demo_script: mvp?.demo_script || null,
      talking_points: mvp?.key_talking_points ? safeParseJSON(mvp.key_talking_points, []) : [],
      builder_reflection: mvp?.builder_reflection || null,
      architecture_explanation: mvp?.architecture_explanation || null
    });
  } catch (error: any) {
    console.error('Failed to retrieve deliverables:', error);
    res.status(500).json({ error: 'Failed to retrieve final product deliverables' });
  }
});

// 10. POST /api/product/description/save
router.post('/description/save', authenticateToken, async (req: any, res) => {
  const { session_id, product_description } = req.body;

  if (!session_id || product_description === undefined) {
    return res.status(400).json({ error: 'Missing session_id or product_description' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    await p.execute(
      `UPDATE mvp_builds SET product_description = ? WHERE session_id = ?`,
      [product_description, session_id]
    );

    res.json({ success: true, message: 'Description updated successfully' });
  } catch (error: any) {
    console.error('Failed to save description:', error);
    res.status(500).json({ error: error.message || 'Failed saving description' });
  }
});

// 11. POST /api/product/features/explain
router.post('/features/explain', authenticateToken, async (req: any, res) => {
  const { session_id, feature_id, student_rationale } = req.body;

  if (!session_id || !feature_id || student_rationale === undefined) {
    return res.status(400).json({ error: 'Missing session_id, feature_id or student_rationale' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    // Fetch feature details
    const [featRows]: any = await p.execute(
      'SELECT id, feature_name, feature_description FROM product_features WHERE id = ? AND session_id = ?',
      [feature_id, session_id]
    );

    if (!featRows || featRows.length === 0) {
      return res.status(404).json({ error: 'Feature not found.' });
    }

    const feat = featRows[0];
    let feedbackText = '';

    if (student_rationale.trim().length > 0) {
      const prompt = `
        You are an empathetic, encouraging startup mentor for a student aged 13-16.
        Review the student's rationale for including a specific feature in their app.
        
        Feature Name: ${feat.feature_name}
        Feature Description: ${feat.feature_description}
        Student's Rationale of why they included it: "${student_rationale}"
        
        Write exactly one professional, highly encouraging sentence of feedback addressing their logic.
        Keep the tone warm, positive, validating, and direct. Use plain, friendly, zero-jargon language. Say things like "Great thinking — this shows real empathy for your users." or "This is a super smart way to make your app easy for everyday users to trust."
        
        Return ONLY the one-sentence feedback. No markdown, no quotes, no extra text.
      `;

      try {
        const geminiRes = await getGeminiClient().models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt
        });

        feedbackText = parseGeminiResponse(geminiRes).trim();
      } catch (geminiError) {
        console.warn('Failed to obtain AI startup advisor review response feedback, using dynamic fallback:', geminiError);
        feedbackText = `Outstanding thinking! Including "${feat.feature_name}" shows great engineering maturity and deep empathy for your target audience's core workflow.`;
      }
    } else {
      feedbackText = 'Explain your rationale above to receive a helpful mentor review!';
    }

    // Save to database
    await p.execute(
      `UPDATE product_features SET student_rationale = ?, ai_feedback = ? WHERE id = ? AND session_id = ?`,
      [student_rationale, feedbackText, feature_id, session_id]
    );

    res.json({
      success: true,
      student_rationale,
      ai_feedback: feedbackText
    });
  } catch (error: any) {
    console.error('Failed feature explain:', error);
    res.status(500).json({ error: error.message || 'Failed to save rationale' });
  }
});

// 12. POST /api/product/demo/save
router.post('/demo/save', authenticateToken, async (req: any, res) => {
  const { session_id, demo_script, key_talking_points } = req.body;

  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const updates: string[] = [];
    const params: any[] = [];

    if (demo_script !== undefined) {
      updates.push('demo_script = ?');
      params.push(demo_script);
    }

    if (key_talking_points !== undefined) {
      updates.push('key_talking_points = ?');
      params.push(JSON.stringify(key_talking_points));
    }

    if (updates.length > 0) {
      params.push(session_id);
      await p.execute(
        `UPDATE mvp_builds SET ${updates.join(', ')} WHERE session_id = ?`,
        params
      );
    }

    res.json({ success: true, message: 'Demo presentation prepared!' });
  } catch (error: any) {
    console.error('Failed to save demo details:', error);
    res.status(500).json({ error: error.message || 'Failed saving demo details' });
  }
});

// POST /api/product/walkthrough/explain
router.post('/walkthrough/explain', authenticateToken, async (req: any, res) => {
  const { session_id, section_index, project_name, feature_name } = req.body;
  if (session_id === undefined || section_index === undefined) {
    return res.status(400).json({ error: 'Missing session_id or section_index' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    // Check phase2_cache for preloaded step6 explanations
    const [cacheRows]: any = await p.execute(
      'SELECT step6 FROM phase2_cache WHERE project_id = ? LIMIT 1',
      [session_id]
    );

    if (cacheRows && cacheRows.length > 0 && cacheRows[0].step6) {
      const explanations = safeParseJSON(cacheRows[0].step6, []);
      const cachedExpl = explanations[section_index];
      if (cachedExpl) {
        return res.json({ success: true, explanation: cachedExpl });
      }
    }

    const sectionNames = [
      'The File Structure',
      'The Navigation System',
      `The Core Feature: ${feature_name || 'Main Operation'}`,
      `The Additional Feature: ${feature_name || 'Sub-system'}`,
      'The Sample Database / Memory Store'
    ];
    const sectionName = sectionNames[section_index] || 'The Codebase';

    const prompt = `
      You are an inspiring, friendly technical mentor teaching code to high-school beginners (13-16 years old).
      The student is building an app named "${project_name || 'MVP Product'}" and needs to understand its code walkthrough.
      Write a clear, non-technical, plain English explanation (3 sentences maximum) for the file section: "${sectionName}".
      Explain *what this part of the code does* using a simple, relatable real-world analogy. Avoid any deep technical terms like "array.prototype.reduce" or "event loops". Keep the tone extremely positive and encouraging!
      Example style: "Think of this like your app's main highway. It sets up the rules so your clicks know exactly which digital screen to visit next, keeping everything organized and fast!"
      
      Return ONLY the explanation text. No markdown quotes, no labels, no extra text.
    `;

    let explanation = '';
    try {
      const geminiRes = await getGeminiClient().models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt
      });

      explanation = parseGeminiResponse(geminiRes).trim();
    } catch (geminiError) {
      console.warn('Failed to obtain AI technical explanations via Gemini, utilizing friendly backup analogies:', geminiError);
      
      const fallbacksMap: Record<string, string> = {
        'The File Structure': `Think of this like a neat cookbook index. It groups the folders containing layouts, styles, and buttons so you always know exactly where to locate key parts of ${project_name || 'your app'} without getting lost!`,
        'The Navigation System': `This is like the magic maps and hallways in a grand castle. It monitors which navigation tab user clicks, making sure they jump smoothly between different screens of your product in a flash!`,
        'The Core Feature': `This represents the primary engine of ${project_name || 'your product'}. It receives user inputs, performs the heavy lifting calculation, and returns success feedback immediately like a smart kitchen blender!`,
        'The Additional Feature': `This is a helpful bonus gadget for ${project_name || 'your workspace'}. It works in the background to simplify actions, display analytics tips, or format tables beautifully for your target users!`,
        'The Sample Database / Memory Store': `Think of this like your app's digital backpack. It stores completed activities, reports, and approved values safely so they persist when navigating around different views!`
      };
      
      const matchedKey = Object.keys(fallbacksMap).find(key => sectionName.includes(key)) || 'The File Structure';
      explanation = fallbacksMap[matchedKey];
    }
    res.json({ success: true, explanation });
  } catch (error: any) {
    console.error('Walkthrough explanation generation failed:', error);
    res.status(500).json({ error: error.message || 'Failed to explain section' });
  }
});

// POST /api/product/step/complete
router.post('/step/complete', authenticateToken, async (req: any, res) => {
  const { session_id, step } = req.body;
  if (!session_id || !step) {
    return res.status(400).json({ error: 'Missing session_id or step name' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    // Map the completed step to the next database current_step value
    const nextSteps: Record<string, string> = {
      'code_walkthrough': 'description',
      'description': 'explain',
      'explain': 'demo',
      'demo': 'complete'
    };

    const nextStepName = nextSteps[step];
    if (nextStepName) {
      await p.execute(
        'UPDATE product_sessions SET current_step = ? WHERE id = ?',
        [nextStepName, session_id]
      );
    }

    res.json({ success: true, current_step: nextStepName || step });
  } catch (error: any) {
    console.error('Failed to update step progress:', error);
    res.status(500).json({ error: 'Failed to update step progress' });
  }
});

// 13. POST /api/product/quiz/generate
router.post('/quiz/generate', authenticateToken, async (req: any, res) => {
  const { session_id } = req.body;
  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id' });
  }

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const [p2Rows]: any = await p.execute('SELECT id FROM phases WHERE order_index = 2');
    const actualPhase2Id = p2Rows && p2Rows.length > 0 ? p2Rows[0].id : 2;

    // 1. Check if quiz questions already exist for this session
    const [existing]: any = await p.execute(
      'SELECT id, quiz_questions.phase_id, question, options, correct_index, explanation FROM quiz_questions WHERE phase_id = ? AND session_id = ?',
      [actualPhase2Id, session_id]
    );

    if (existing && existing.length > 0) {
      return res.json({ success: true, questions: existing });
    }

    // 2. Fetch blueprint details
    const [bpRows]: any = await p.execute('SELECT * FROM product_blueprints WHERE session_id = ?', [session_id]);
    if (!bpRows || bpRows.length === 0) {
      return res.status(404).json({ error: 'Product blueprint not found for this session.' });
    }
    const bp = bpRows[0];

    // 3. Fetch product features
    const [features]: any = await p.execute('SELECT * FROM product_features WHERE session_id = ?', [session_id]);
    const featuresList = features.map((f: any) => `- ${f.feature_name}: ${f.feature_description} [${f.category}]`).join('\n');

    // 4. Generate questions using Gemini-3.5-flash
    const prompt = `
Generate 10 multiple choice quiz questions for a Grade 9-12 student
who just built the following product:

Product name: ${bp.project_name || 'Autonomous App'}
Problem it solves: ${bp.problem_statement || 'N/A'}
Target Users: ${bp.target_users || 'N/A'}
MVP Scope: ${bp.mvp_scope || 'N/A'}
Key Features:
${featuresList || 'None listed'}

We want to test if they understand how their product is designed, how it works, and key software design/theory decisions.
Ensure the questions are highly personalized to their product and target users, yet educational about product management, software logic, and MVP design.

Please output as a valid JSON array of objects with this exact structure:
[
  {
    "question": "The question text, references their product directly",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_index": 0,
    "explanation": "Extremely clear explanation of why the correct option is right based on product design and theory."
  }
]

Return ONLY the valid JSON array. Do not wrap in markdown or backticks.
`;

    let parsedQuestions;
    try {
      const geminiRes = await getGeminiClient().models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const clean = parseGeminiResponse(geminiRes);
      parsedQuestions = JSON.parse(clean);
    } catch (geminiError) {
      console.warn('Failed to dynamically compile customized quiz questions via Gemini, using smart product theory fallbacks:', geminiError);
      parsedQuestions = [
        {
          question: `What is the primary objective of your new product ${bp.project_name || 'My App'}?`,
          options: [
            `To directly resolve: "${bp.problem_statement || 'the core problem statement'}"`,
            "To build the most complex software code possible",
            "To add visual screens without user relevance",
            "To test different third-party database engines"
          ],
          correct_index: 0,
          explanation: `Your MVP blueprint starts by identifying a clear target problem and persona, making the primary focus of ${bp.project_name || 'My App'} directly addressing your user's actual pain points.`
        },
        {
          question: `Who are the primary target users who benefit from ${bp.project_name || 'My App'}?`,
          options: [
            "We don't know who our target group is",
            `${bp.target_users || 'The specific audience defined in the blueprint'}`,
            "Experienced senior developers only",
            "General cloud operations administrators"
          ],
          correct_index: 1,
          explanation: "Defining and prioritizing a target demographic ensures your product's layouts and functionality exactly match real user needs."
        },
        {
          question: "When launching an MVP (Minimum Viable Product), what is the most recommended design guideline?",
          options: [
            "Delay launching until you have built every single future feature concept",
            "Focus strictly on core, high-value must-have features that solve the target problem",
            "Avoid gathering early user feedback completely",
            "Change the product scope daily based on visual inspirations"
          ],
          correct_index: 1,
          explanation: "Launching a lean MVP with essential core functions lets you learn from early real-world user interactions and iterate fast."
        },
        {
          question: "What is the main role of a 'User Journey Map' during application development?",
          options: [
            "To draw decorative shapes in design boards",
            "To visualize the sequential steps a user takes to achieve their goal using your software features",
            "To compile binary machine layout files",
            "To set up secure network firewalls"
          ],
          correct_index: 1,
          explanation: "Mapping the user journey ensures development remains usercentric, tracing exactly how screens and interaction widgets help a user succeed."
        },
        {
          question: "How does the 'Code Walkthrough' stage benefit young software founders?",
          options: [
            "It teaches key programming logic, architectural organization, and code readability",
            "It makes the app run faster automatically",
            "It deletes unapproved databases",
            "It registers corporate trademarks"
          ],
          correct_index: 0,
          explanation: "Going through clean, well-commented code builds strong developer literacy and helps teams debug and adapt their apps."
        }
      ];
    }

    if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
      throw new Error("Invalid format returned by Gemini model.");
    }

    // 5. Insert generated questions into the database
    const questionsToFetch: any[] = [];
    for (const q of parsedQuestions) {
      const [insertRes]: any = await p.execute(
        `INSERT INTO quiz_questions (phase_id, session_id, question, options, correct_index, explanation)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [actualPhase2Id, session_id, q.question, JSON.stringify(q.options), q.correct_index, q.explanation]
      );
      questionsToFetch.push({
        id: insertRes.insertId,
        question: q.question,
        options: q.options,
        correct_index: q.correct_index,
        explanation: q.explanation
      });
    }

    res.json({ success: true, questions: questionsToFetch });
  } catch (error: any) {
    console.error('Failed to generate product quiz questions:', error);
    res.status(500).json({ error: error.message || 'Failed to generate quiz questions' });
  }
});

// Added save-progress helpers for Phase 2 Stepper
router.post('/blueprint/save', authenticateToken, async (req: any, res) => {
  const { session_id, project_name, problem_statement, target_users, mvp_scope } = req.body;
  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id' });
  }
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });
    await p.execute(
      `UPDATE product_blueprints 
       SET project_name = ?, problem_statement = ?, target_users = ?, mvp_scope = ?
       WHERE session_id = ?`,
      [project_name || '', problem_statement || '', target_users || '', mvp_scope || '', session_id]
    );
    res.json({ success: true, message: 'Blueprint draft saved!' });
  } catch (error: any) {
    console.error('Failed to save blueprint draft:', error);
    res.status(500).json({ error: 'Failed to save blueprint draft' });
  }
});

router.post('/screens/save-requests', authenticateToken, async (req: any, res) => {
  const { session_id, change_requests } = req.body;
  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id' });
  }
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });
    await p.execute(
      `UPDATE product_screens SET change_requests = ? WHERE session_id = ?`,
      [change_requests || '', session_id]
    );
    res.json({ success: true, message: 'Screen modifications saved!' });
  } catch (err: any) {
    console.error('Failed to save screen requests:', err);
    res.status(500).json({ error: 'Failed to save screen requests' });
  }
});

router.post('/tutor/ask', authenticateToken, async (req: any, res) => {
  const { session_id, component_id, question } = req.body;
  if (!session_id || !question) {
    return res.status(400).json({ error: 'Missing session_id or question' });
  }
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    // Fetch component details
    const [compRows]: any = await p.execute(
      `SELECT * FROM component_metadata WHERE session_id = ? AND component_id = ?`,
      [session_id, component_id || '']
    );

    const comp = compRows && compRows.length > 0 ? compRows[0] : null;
    const component_type = comp ? comp.component_type : 'UI Component';
    const purpose = comp ? comp.purpose : 'Provide interactive sandbox features';
    const business_reason = comp ? comp.business_reason : 'Facilitate user experience trials';

    const prompt = `
      You are a friendly AI tutor helping a student understand their own product. Answer their question about this specific component in 2-3 sentences. Simple language. Encouraging tone.
      Component: ${component_type} — ${purpose}
      Business reason: ${business_reason}
      Student's question: ${question}
    `;

    const geminiRes = await getGeminiClient().models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt
    });

    const answer = parseGeminiResponse(geminiRes).trim();
    res.json({ answer });
  } catch (err: any) {
    console.error('Failed to answer student question via tutor:', err);
    res.status(500).json({ error: 'Failed to answer student question via tutor' });
  }
});

// GET /api/product/components/:session_id
router.get('/components/:session_id', authenticateToken, async (req: any, res) => {
  const { session_id } = req.params;
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    const [compRows]: any = await p.execute(
      `SELECT * FROM component_metadata WHERE session_id = ?`,
      [session_id]
    );
    res.json(compRows || []);
  } catch (err: any) {
    console.error('Failed to retrieve component metadata:', err);
    res.status(500).json({ error: 'Failed to retrieve component metadata' });
  }
});

// POST /api/product/screenshot/save
router.post('/screenshot/save', authenticateToken, async (req: any, res) => {
  const { session_id, screenshot_base64 } = req.body;
  if (!session_id || !screenshot_base64) {
    return res.status(400).json({ error: 'Missing session_id or screenshot_base64' });
  }
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    await p.execute(
      `UPDATE mvp_builds SET screenshot_url = ? WHERE session_id = ?`,
      [screenshot_base64, session_id]
    );
    res.json({ success: true });
  } catch (err: any) {
    console.error('Failed to save screenshot:', err);
    res.status(500).json({ error: 'Failed to save screenshot' });
  }
});

function generateBatchFallback(
  project_name: string,
  problem_statement: string,
  target_users: string,
  mvp_scope: string,
  category: string,
  userId: number,
  session_id: number
) {
  const projName = project_name || 'My VibeLab App';
  const target = target_users || 'Students and professionals';
  const problem = problem_statement || 'A manual tracking process';

  let features: any[] = [];
  let steps: any[] = [];
  let key_actions: string[] = [];
  let screens: any[] = [];
  let walkthrough_explanations: string[] = [];
  let components: any[] = [];
  let skills_learned: any[] = [];
  let ai_contribution_summary = '';
  let interactiveWidgetHtml = '';
  let interactiveWidgetScript = '';
  let primaryColor = 'indigo';
  let categoryIcon = '🚀';

  if (category === 'education') {
    primaryColor = 'violet';
    categoryIcon = '🎓';
    features = [
      { feature_name: "Smart Lesson Navigator", feature_description: "Organizes revision guides and step-by-step tracks personalized for you.", category: "must_have" },
      { feature_name: "Interactive Quest Cards", feature_description: "Gamified cards with revision questions and instant scoring feedback.", category: "must_have" },
      { feature_name: "Personal Learning Streak", feature_description: "Displays daily task completions to keep you motivated.", category: "must_have" },
      { feature_name: "Resource Library Desk", feature_description: "Save and search key textbooks or formulas.", category: "nice_to_have" },
      { feature_name: "Quiz Performance Exporter", feature_description: "Enables saving scores and sharing study logs.", category: "nice_to_have" },
      { feature_name: "AI Peer Study Matcher", feature_description: "Connect with students studying similar topics.", category: "future" }
    ];
    steps = [
      { step_number: 1, title: "Create Study Account", description: "The student registers and configures their grade level and target topics." },
      { step_number: 2, title: "Review Personalized Tracks", description: "The app displays lesson decks aligned with the student's revision roadmap." },
      { step_number: 3, title: "Engage in Flashcard Practice", description: "The student clicks interactive quest cards to answer review questions." },
      { step_number: 4, title: "Submit and See Scores", description: "The practice engine grades the answers instantly and logs progress." },
      { step_number: 5, title: "Observe Learning Streak", description: "The daily progress counter increments, confirming study milestones." }
    ];
    key_actions = [
      "Select revision subjects and difficulty level.",
      "Activate a study quest card.",
      "Check interactive question answers.",
      "View performance feedback dashboard."
    ];
    screens = [
      {
        screen_name: "🎓 Study Quest Deck",
        screen_description: "Main dashboard listing revision tracks, active tasks, and learning statistics.",
        screen_purpose: "Observe study progress and launch lessons",
        layout_html: `
          <div class="space-y-4">
            <div class="p-4 bg-slate-900 border border-violet-500/30 rounded-xl">
              <span class="text-[9px] text-violet-400 font-bold uppercase tracking-wider block mb-1">Active Study Tracks</span>
              <h5 class="text-xs text-white font-extrabold uppercase mb-2">My Courses</h5>
              <div class="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                <div>
                  <p class="text-xs font-bold text-white">Introduction to Web Layouts</p>
                  <p class="text-[10px] text-slate-500">3 of 5 lessons completed</p>
                </div>
                <button class="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-[10px] font-bold">Resume</button>
              </div>
            </div>
          </div>
        `
      },
      {
        screen_name: "📝 Interactive Practice Deck",
        screen_description: "Interactive revision deck for smart diagnostics and answering study cards.",
        screen_purpose: "Test subject comprehension with immediate answers",
        layout_html: `
          <div class="p-4 bg-slate-900 border border-violet-500/30 rounded-xl">
            <h5 class="text-xs text-white font-extrabold uppercase mb-2">Topic Review Quest</h5>
            <p class="text-xs font-bold text-slate-200 mb-3">Why is rapid prototyping helpful?</p>
            <div class="space-y-2">
              <button class="w-full text-left p-2.5 bg-slate-950 border border-slate-850 rounded-lg text-xs hover:bg-slate-800 text-slate-300 font-medium">A) It solves PostgreSQL scale limitations</button>
              <button class="w-full text-left p-2.5 bg-slate-950 border border-slate-850 rounded-lg text-xs hover:bg-slate-800 text-slate-300 font-medium">B) It lets you gather early feedback from target users quickly</button>
            </div>
          </div>
        `
      },
      {
        screen_name: "📊 Student Performance Analytics",
        screen_description: "Dashboard panel plotting revision stats, task metrics, and certificate locks.",
        screen_purpose: "Analyze grades and milestones attained",
        layout_html: `
          <div class="p-4 bg-slate-900 border border-violet-500/30 rounded-xl">
            <h5 class="text-xs text-white font-extrabold uppercase mb-2">Study Statistics</h5>
            <div class="grid grid-cols-3 gap-2">
              <div class="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-center">
                <span class="text-[8px] text-slate-500 font-bold uppercase">Accuracy</span>
                <p class="text-sm font-black text-violet-400 font-mono mt-1">94%</p>
              </div>
              <div class="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-center">
                <span class="text-[8px] text-slate-500 font-bold uppercase">Lessons</span>
                <p class="text-sm font-black text-violet-400 font-mono mt-1">12</p>
              </div>
              <div class="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-center">
                <span class="text-[8px] text-slate-500 font-bold uppercase">Streak</span>
                <p class="text-sm font-black text-violet-400 font-mono mt-1">5 Days</p>
              </div>
            </div>
          </div>
        `
      }
    ];
    interactiveWidgetHtml = `
      <div class="bg-slate-900 border border-violet-500/30 rounded-2xl p-5 mb-6">
        <h3 class="text-xs font-black uppercase text-violet-400 tracking-wider mb-2">🎓 Live Interactive Practice Deck</h3>
        <p class="text-[11px] text-slate-300 mb-4">Validate your understanding of standard web layouts instantly.</p>
        <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div class="text-xs font-bold text-slate-200 mb-2">Question: Why is responsive styling important for mobile learners?</div>
          <div class="space-y-2">
            <button onclick="checkAnswer(1)" id="q-btn-1" class="w-full text-left p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs hover:bg-slate-850 text-slate-300 transition">A) It blocks users from turning their screens sideways</button>
            <button onclick="checkAnswer(2)" id="q-btn-2" class="w-full text-left p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs hover:bg-slate-850 text-slate-300 transition">B) It adapts the app's size dynamically to fit phone dimensions</button>
          </div>
          <div id="quiz-feedback" class="text-xs mt-3 hidden font-semibold"></div>
        </div>
      </div>
    `;
    interactiveWidgetScript = `
      function checkAnswer(ans) {
        const fb = document.getElementById('quiz-feedback');
        fb.classList.remove('hidden');
        if (ans === 2) {
          fb.className = "text-xs mt-3 font-semibold text-emerald-400";
          fb.innerHTML = "✓ Correct! Responsive design lets students learn on any phone screen size smoothly.";
          document.getElementById('q-btn-2').className = "w-full text-left p-2.5 bg-emerald-950/40 border border-emerald-500 rounded-lg text-xs text-emerald-200 font-semibold";
          document.getElementById('q-btn-1').className = "w-full text-left p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs hover:bg-slate-850 text-slate-400 transition";
        } else {
          fb.className = "text-xs mt-3 font-semibold text-rose-400";
          fb.innerHTML = "✗ Incorrect. Try again! Think about mobile layout flexibility.";
          document.getElementById('q-btn-1').className = "w-full text-left p-2.5 bg-rose-950/40 border border-rose-500 rounded-lg text-xs text-rose-200 font-semibold";
          document.getElementById('q-btn-2').className = "w-full text-left p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs hover:bg-slate-850 text-slate-400 transition";
        }
      }
    `;
    components = [
      { component_id: "quiz_deck", component_type: "form", purpose: "Interactive quest cards with instant feedback on review topics", business_reason: "To allow students to validate subject comprehension in a gamified, reward-backed simulator", simple_explanation: "This displays revision cards and lets you click cards to confirm answers.", technical_explanation: "Renders clickable buttons capturing selection index values and triggering DOM feedback." }
    ];
    skills_learned = [
      { skill: "Gamified Study Layouts", demonstrated: true },
      { skill: "Dynamic Score Assessors", demonstrated: true },
      { skill: "Daily Streak Counters", demonstrated: true }
    ];
    ai_contribution_summary = "Formulated the robust violet-themed flashcard interface and registered smart quiz checkers with responsive score updates.";
    walkthrough_explanations = [
      `Think of this like a organized binder structure. It categorizes files into clean layouts, components, and interactive controllers so you always know where to find parts of ${projName}!`,
      `This is like the magic maps and hallways in a grand castle. It monitors which navigation tab user clicks, making sure they jump smoothly between different screens of your product in a flash!`,
      `This represents the primary learning engine of ${projName}. It grabs the student's quiz answers, grades them, and triggers rewards or streak increments immediately like a proud school teacher!`,
      `This is a helpful bonus review drawer. It logs incorrect answers and showcases stats in visual summaries to help you focus on tough topics!`,
      `Think of this like a secure digital backpack. It saves completed quizzes, active tracks, and streaks in your browser's local memory so they persist when you restart!`
    ];
  } else if (category === 'health') {
    primaryColor = 'emerald';
    categoryIcon = '🧘';
    features = [
      { feature_name: "Zen Breathing Engine", feature_description: "An animated, self-guided breathing circle tracking inhale and exhale timing.", category: "must_have" },
      { feature_name: "Daily Wellness Journal", feature_description: "Log your daily active hydration, hours of sleep, and active mood logs.", category: "must_have" },
      { feature_name: "Vital Signs Dashboard", feature_description: "Displays live status summaries and healthy parameter charts.", category: "must_have" },
      { feature_name: "Mindfulness Activity History", feature_description: "Save completed breathing logs and active history logs.", category: "nice_to_have" },
      { feature_name: "Reminders alert manager", feature_description: "Configurable alert timers to remind you to take brief wellness breaks.", category: "nice_to_have" },
      { feature_name: "AI Predictive Wellness Coach", feature_description: "Suggests breathing goals based on historical fatigue indices.", category: "future" }
    ];
    steps = [
      { step_number: 1, title: "Configure Wellness Goals", description: "The user logs into their customized dashboard and inputs their hydration and sleep targets." },
      { step_number: 2, title: "Select Mindful Breath Rate", description: "The user chooses a comfortable breathing pace (e.g. 4 seconds inhale, 4 seconds exhale)." },
      { step_number: 3, title: "Activate Breathing Ring", description: "The user follows the animated expanding ring to inhale, hold, and exhale deeply." },
      { step_number: 4, title: "Log Completed Session", description: "The session completes and updates the user's daily habits tracker automatically." },
      { step_number: 5, title: "View Progress Reports", description: "The user reviews their weekly health logs, vital indicators, and historical logs." }
    ];
    key_actions = [
      "Select desired breathing loop rate.",
      "Engage the interactive breathing ring.",
      "Input active daily wellness metrics.",
      "Download weekly health logs and reports."
    ];
    screens = [
      {
        screen_name: "🧘 Breathing Portal",
        screen_description: "Main workspace equipped with the interactive visual breathing regulator ring.",
        screen_purpose: "Reduce daily stress through controlled breathing exercises",
        layout_html: `
          <div class="p-4 bg-slate-900 border border-emerald-500/30 rounded-xl text-center">
            <span class="text-[9px] text-emerald-400 font-bold uppercase tracking-wider block mb-1">Breathing Guide</span>
            <h5 class="text-xs text-white font-extrabold uppercase mb-2">Breathe & Recenter</h5>
            <div class="flex flex-col items-center gap-3 py-2">
              <div class="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500 rounded-full flex items-center justify-center text-[10px] text-emerald-300 font-bold">Resting</div>
            </div>
          </div>
        `
      },
      {
        screen_name: "📝 Wellness Journal Tracker",
        screen_description: "Habit tracking interface to log daily hydration, sleep, and physical activity status.",
        screen_purpose: "Record vital metrics and daily habits",
        layout_html: `
          <div class="p-4 bg-slate-900 border border-emerald-500/30 rounded-xl">
            <h5 class="text-xs text-white font-extrabold uppercase mb-2">Habit Log Tracker</h5>
            <div class="space-y-2">
              <div class="flex items-center justify-between p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs">
                <span class="text-slate-300">💧 Hydration Intake</span>
                <span class="font-mono text-emerald-400">4 / 8 glasses</span>
              </div>
              <div class="flex items-center justify-between p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs">
                <span class="text-slate-300">🛌 Sleep Hours</span>
                <span class="font-mono text-emerald-400">7.5 hours</span>
              </div>
            </div>
          </div>
        `
      },
      {
        screen_name: "📊 Health Analytics Panel",
        screen_description: "Visualization summary plotting average sleep durations and breathing success rate ratios.",
        screen_purpose: "Review wellness analytics and streaks completed",
        layout_html: `
          <div class="p-4 bg-slate-900 border border-emerald-500/30 rounded-xl">
            <h5 class="text-xs text-white font-extrabold uppercase mb-2">Wellness Analytics</h5>
            <div class="grid grid-cols-2 gap-2 text-center">
              <div class="p-2 bg-slate-950 border border-slate-800 rounded-lg">
                <p class="text-[8px] text-slate-500 font-bold uppercase">Consistency</p>
                <p class="text-xs font-black text-emerald-400 mt-1 font-mono">92%</p>
              </div>
              <div class="p-2 bg-slate-950 border border-slate-800 rounded-lg">
                <p class="text-[8px] text-slate-500 font-bold uppercase">Zen Minutes</p>
                <p class="text-xs font-black text-emerald-400 mt-1 font-mono">45 mins</p>
              </div>
            </div>
          </div>
        `
      }
    ];
    interactiveWidgetHtml = `
      <div class="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 mb-6 text-center">
        <h3 class="text-xs font-black uppercase text-emerald-400 tracking-wider mb-2">🧘 Zen Breathing Regulator</h3>
        <p class="text-[11px] text-slate-300 mb-4">Click below to start a relaxing 6-second breathing exercise.</p>
        <div class="flex flex-col items-center gap-4">
          <div id="breath-circle" class="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500 rounded-full flex items-center justify-center text-[10px] text-emerald-300 font-bold transition-all duration-3000">Inhale</div>
          <button onclick="breatheLoop()" id="breath-btn" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition">Start Breathing</button>
          <div class="text-[11px] text-slate-400">Completed: <span id="breath-count" class="font-bold text-emerald-400">0</span> breaths</div>
        </div>
      </div>
    `;
    interactiveWidgetScript = `
      let breathState = 'idle';
      let breathCount = 0;
      let breathInterval;
      function breatheLoop() {
        const circle = document.getElementById('breath-circle');
        const btn = document.getElementById('breath-btn');
        const cnt = document.getElementById('breath-count');
        if (breathState === 'idle') {
          breathState = 'inhale';
          btn.innerHTML = 'Stop Session';
          circle.innerHTML = 'Inhale...';
          circle.style.transform = 'scale(1.2)';
          circle.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
          let isScale = true;
          breathInterval = setInterval(() => {
            if (isScale) {
              circle.innerHTML = 'Exhale...';
              circle.style.transform = 'scale(1.0)';
              circle.style.backgroundColor = 'rgba(16, 185, 129, 0.05)';
              breathCount++;
              cnt.innerHTML = breathCount;
            } else {
              circle.innerHTML = 'Inhale...';
              circle.style.transform = 'scale(1.2)';
              circle.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
            }
            isScale = !isScale;
          }, 3000);
        } else {
          clearInterval(breathInterval);
          breathState = 'idle';
          btn.innerHTML = 'Start Breathing';
          circle.innerHTML = 'Rest';
          circle.style.transform = 'scale(1.0)';
          circle.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
        }
      }
    `;
    components = [
      { component_id: "breath_controller", component_type: "button", purpose: "Animates breathing cycles and tracks completion statistics", business_reason: "Provide immediate tactile breathing regulation exercises to manage stressful situations", simple_explanation: "This lets you practice paced breathing with an expanding visual ring.", technical_explanation: "Uses a state-dependent interval clock triggering cyclic scale CSS transformations on elements." }
    ];
    skills_learned = [
      { skill: "Wellness Interface Construction", demonstrated: true },
      { skill: "Paced Timer Events", demonstrated: true },
      { skill: "Self-Report Loggers", demonstrated: true }
    ];
    ai_contribution_summary = "Engineered the emerald-themed guided breathing controller, complete with seamless CSS animations and auto-save counters.";
    walkthrough_explanations = [
      `Think of this like a neat cookbook index. It groups the folders containing layouts, styles, and buttons so you always know exactly where to locate key parts of ${projName} without getting lost!`,
      `This is like the magic maps and hallways in a grand castle. It monitors which navigation tab user clicks, making sure they jump smoothly between different screens of your product in a flash!`,
      `This represents the primary engine of ${projName}. It receives user inputs, performs the heavy lifting calculation, and returns success feedback immediately like a smart kitchen blender!`,
      `This is a helpful bonus wellness tracker. It formats tables and graphs so you can track hydration trends and mindfulness achievements beautifully!`,
      `Think of this like your app's digital backpack. It stores completed activities, reports, and approved values safely so they persist when navigating around different views!`
    ];
  } else if (category === 'finance_ecommerce') {
    primaryColor = 'cyan';
    categoryIcon = '💰';
    features = [
      { feature_name: "Smart Budget Command Center", feature_description: "A centralized dashboard illustrating active spending balances, purchase logs, and budget limits.", category: "must_have" },
      { feature_name: "Adaptive Category Vaults", feature_description: "Allocate and partition customized funds into distinct buckets such as food, transport, and gaming.", category: "must_have" },
      { feature_name: "Interactive Cart & Billing Portal", feature_description: "Add items to your checkout cart, calculate total fees, and simulate digital card payments.", category: "must_have" },
      { feature_name: "Digital Receipt Archiving Grid", feature_description: "Upload and review transaction receipts in a high-fidelity tabular view.", category: "nice_to_have" },
      { feature_name: "Peer Spending Reminder Console", feature_description: "Triggers notification alerts if active transactions exceed your target vault limit.", category: "nice_to_have" },
      { feature_name: "AI Spending Trend Forecaster", feature_description: "Predicts budget exhaustion dates based on previous spending patterns.", category: "future" }
    ];
    steps = [
      { step_number: 1, title: "Create Sandbox Wallet", description: "The user registers and initializes their sandbox account with a customizable pre-loaded wallet balance." },
      { step_number: 2, title: "Configure Fund Allocations", description: "The user sets up budget ceilings across specific category vaults (e.g., $100 for dining)." },
      { step_number: 3, title: "Simulate Shopping Experience", description: "The user browses mock catalog items, adding desired selections to their digital cart." },
      { step_number: 4, title: "Process Payments and Check Balance", description: "The user executes mock checkout payments, deducting total costs from their active wallet automatically." },
      { step_number: 5, title: "Analyze Spending Performance", description: "The dashboard displays real-time chart summaries and alerts if any vault limit is breached." }
    ];
    key_actions = [
      "Partition pre-loaded cash into category vaults.",
      "Add catalog products to the digital cart.",
      "Process mock card checkouts.",
      "Filter transactions by category vaults."
    ];
    screens = [
      {
        screen_name: "💰 Smart Vault Dashboard",
        screen_description: "Provides a central overview of preloaded funds, spending limits, and vault partition charts.",
        screen_purpose: "Configure active budgets and view wallet metrics",
        layout_html: `
          <div class="p-4 bg-slate-900 border border-cyan-500/30 rounded-xl">
            <div class="flex items-center justify-between mb-3">
              <span class="text-[9px] text-cyan-400 font-bold uppercase tracking-wider block mb-1">Wallet Balance</span>
              <span class="text-xs text-emerald-400 font-mono font-bold">$250.00 left</span>
            </div>
            <h5 class="text-xs text-white font-extrabold uppercase mb-2">Category Budgets</h5>
            <div class="space-y-2">
              <div class="p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs flex justify-between">
                <span>🍔 Food & Dining</span>
                <span class="font-mono text-cyan-400">$60 / $100</span>
              </div>
              <div class="p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs flex justify-between">
                <span>🎮 Tech & Gaming</span>
                <span class="font-mono text-cyan-400">$40 / $50</span>
              </div>
            </div>
          </div>
        `
      },
      {
        screen_name: "🛒 Checkout & Cart Simulator",
        screen_description: "Interactive checkout portal displaying catalog items, shopping cart, and transaction checkers.",
        screen_purpose: "Simulate purchase transactions and validate deduct rules",
        layout_html: `
          <div class="p-4 bg-slate-900 border border-cyan-500/30 rounded-xl">
            <h5 class="text-xs text-white font-extrabold uppercase mb-2">Mock Products</h5>
            <div class="grid grid-cols-2 gap-2 text-center mb-3">
              <div class="p-2 bg-slate-950 border border-slate-850 rounded-lg text-xs">
                <p class="font-bold text-slate-200">Study Deck Pro</p>
                <p class="text-[10px] text-cyan-400 font-mono mt-0.5">$15.00</p>
              </div>
              <div class="p-2 bg-slate-950 border border-slate-850 rounded-lg text-xs">
                <p class="font-bold text-slate-200">Zen Earbuds</p>
                <p class="text-[10px] text-cyan-400 font-mono mt-0.5">$35.00</p>
              </div>
            </div>
          </div>
        `
      },
      {
        screen_name: "📊 Spend Analytics Ledger",
        screen_description: "Displays complete historical receipts, categorized bills, and budget analysis reports.",
        screen_purpose: "Audit transaction logs and historical files",
        layout_html: `
          <div class="p-4 bg-slate-900 border border-cyan-500/30 rounded-xl">
            <h5 class="text-xs text-white font-extrabold uppercase mb-2">Transaction Logs</h5>
            <div class="p-2 bg-slate-950 border border-slate-800 rounded-lg text-[10px] text-slate-400 font-mono space-y-1">
              <p class="flex justify-between"><span>[06/24] Food purchase</span> <span class="text-rose-400">-$12.50</span></p>
              <p class="flex justify-between"><span>[06/23] Study Deck Pro</span> <span class="text-rose-400">-$15.00</span></p>
            </div>
          </div>
        `
      }
    ];
    interactiveWidgetHtml = `
      <div class="bg-slate-900 border border-cyan-500/30 rounded-2xl p-5 mb-6">
        <h3 class="text-xs font-black uppercase text-cyan-400 tracking-wider mb-2">🛒 Interactive Shopping Checkout</h3>
        <p class="text-[11px] text-slate-300 mb-4">Add products to your catalog cart and simulate wallet checkout deductions.</p>
        <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div class="flex items-center justify-between mb-3 border-b border-slate-850 pb-2">
            <span class="text-xs font-bold text-slate-200">Product List</span>
            <span class="text-[11px] font-bold text-emerald-400">Wallet: $<span id="wallet-balance-val">150.00</span></span>
          </div>
          <div class="flex gap-2 mb-4">
            <button onclick="addToCart('Study Deck', 15.00)" class="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-[11px] text-slate-200 font-bold">📚 Study Deck ($15)</button>
            <button onclick="addToCart('Zen Earbuds', 35.00)" class="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-[11px] text-slate-200 font-bold">🎧 Zen Buds ($35)</button>
          </div>
          <div class="text-[11px] text-slate-400 mb-3">Cart Total: <span class="font-bold text-cyan-400">$<span id="cart-total-val">0.00</span></span> (<span id="cart-items-count">0</span> items)</div>
          <button onclick="processCheckout()" id="checkout-btn" class="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition">Complete Purchase</button>
          <div id="checkout-feedback" class="text-xs mt-3 hidden font-semibold text-center"></div>
        </div>
      </div>
    `;
    interactiveWidgetScript = `
      let walletBalance = 150.00;
      let cartTotal = 0.00;
      let cartItems = 0;
      function addToCart(name, price) {
        cartTotal += price;
        cartItems++;
        document.getElementById('cart-total-val').innerHTML = cartTotal.toFixed(2);
        document.getElementById('cart-items-count').innerHTML = cartItems;
        const fb = document.getElementById('checkout-feedback');
        fb.classList.add('hidden');
      }
      function processCheckout() {
        const fb = document.getElementById('checkout-feedback');
        fb.classList.remove('hidden');
        if (cartItems === 0) {
          fb.className = "text-xs mt-3 font-semibold text-rose-400";
          fb.innerHTML = "✗ Your cart is empty! Add items first.";
          return;
        }
        if (cartTotal > walletBalance) {
          fb.className = "text-xs mt-3 font-semibold text-rose-400";
          fb.innerHTML = "✗ Insufficient wallet funds! Cart total exceeds balance.";
          return;
        }
        walletBalance -= cartTotal;
        cartTotal = 0.00;
        cartItems = 0;
        document.getElementById('wallet-balance-val').innerHTML = walletBalance.toFixed(2);
        document.getElementById('cart-total-val').innerHTML = "0.00";
        document.getElementById('cart-items-count').innerHTML = "0";
        fb.className = "text-xs mt-3 font-semibold text-emerald-400";
        fb.innerHTML = "✓ Purchase successful! Deducted funds and cleared your cart.";
      }
    `;
    components = [
      { component_id: "checkout_portal", component_type: "form", purpose: "Simulates checkout pipelines and updates wallet balance values", business_reason: "Provide students with a practical checkout simulator to learn financial deduct mechanics safely", simple_explanation: "This displays shopping catalog items and lets you execute checkout transactions.", technical_explanation: "Binds cart counter variables and deducts totals from wallet values using state-altering scripts." }
    ];
    skills_learned = [
      { skill: "Financial Ledger Design", demonstrated: true },
      { skill: "Transaction Deduct Calculators", demonstrated: true },
      { skill: "Cart State Management", demonstrated: true }
    ];
    ai_contribution_summary = "Formulated the robust cyan-themed ecommerce checkout simulator, matching inventory prices to balance deductions.";
    walkthrough_explanations = [
      `Think of this like a organized binder structure. It categorizes files into clean layouts, components, and interactive controllers so you always know where to find parts of ${projName}!`,
      `This is like the magic maps and hallways in a grand castle. It monitors which navigation tab user clicks, making sure they jump smoothly between different screens of your product in a flash!`,
      `This represents the primary engine of ${projName}. It receives user inputs, performs the heavy lifting calculation, and returns success feedback immediately like a smart kitchen blender!`,
      `This is a helpful bonus budget planner. It formats tables and progress bars so you can allocate cash boundaries across categories beautifully!`,
      `Think of this like your app's digital backpack. It stores completed activities, reports, and approved values safely so they persist when navigating around different views!`
    ];
  } else if (category === 'social') {
    primaryColor = 'fuchsia';
    categoryIcon = '💬';
    features = [
      { feature_name: "Interactive Discussion Feed", feature_description: "A social community board displaying chronological posts, user avatars, and hearts likes.", category: "must_have" },
      { feature_name: "Member Circle Navigator", feature_description: "Connect and filter discussions across customized interest circles.", category: "must_have" },
      { feature_name: "Live Feed Composer Input", feature_description: "Compose and append custom messages directly into the community timeline.", category: "must_have" },
      { feature_name: "Notifications Alert Center", feature_description: "Tracks active updates, likes received, and invitations in a clean dropdown.", category: "nice_to_have" },
      { feature_name: "User Portfolio Card Planner", feature_description: "Allows customizing profile bios and selecting custom visual banners.", category: "nice_to_have" },
      { feature_name: "AI Spark Conversation Coach", feature_description: "Generates smart suggested icebreaker prompts based on circle interests.", category: "future" }
    ];
    steps = [
      { step_number: 1, title: "Create Member Profile", description: "The student registers, writes their customizable biography, and chooses an avatar profile." },
      { step_number: 2, title: "Browse Interest Circles", description: "The system displays custom circles (e.g., #webdesign, #gaming) focused on target goals." },
      { step_number: 3, title: "Compose and Publish Post", description: "The student drafts a message inside the feed composer and clicks 'Share' to publish it." },
      { step_number: 4, title: "Interact and Express Likes", description: "The student reviews community updates, liking posts and checking notification alerts." },
      { step_number: 5, title: "View Community Analytics", description: "The user reviews active member directories and community metrics." }
    ];
    key_actions = [
      "Customize member biography and avatar.",
      "Publish community posts inside discussion feeds.",
      "Like updates published by other members.",
      "Filter feeds by interest circles."
    ];
    screens = [
      {
        screen_name: "💬 Community Board Feed",
        screen_description: "The primary community timeline listing chronological posts, likes counters, and composer elements.",
        screen_purpose: "Share ideas and review collaborative feedback",
        layout_html: `
          <div class="p-4 bg-slate-900 border border-fuchsia-500/30 rounded-xl">
            <span class="text-[9px] text-fuchsia-400 font-bold uppercase tracking-wider block mb-1">Live Updates</span>
            <h5 class="text-xs text-white font-extrabold uppercase mb-2">Global Discussion</h5>
            <div class="p-3 bg-slate-950 border border-slate-850 rounded-lg text-xs space-y-1 mb-2">
              <p class="font-bold text-fuchsia-300">@AlexTheCoder</p>
              <p class="text-slate-300">Building prototypes in VibeLab is super fast! Check out my design.</p>
            </div>
          </div>
        `
      },
      {
        screen_name: "👥 Interest Circles Hub",
        screen_description: "Interest-based directory showing active learning communities, circles tags, and member stats.",
        screen_purpose: "Join targeted sub-groups to share topic-specific feedback",
        layout_html: `
          <div class="p-4 bg-slate-900 border border-fuchsia-500/30 rounded-xl">
            <h5 class="text-xs text-white font-extrabold uppercase mb-2">Interest Groups</h5>
            <div class="space-y-2 text-xs">
              <div class="p-2 bg-slate-950 border border-slate-800 rounded-lg flex justify-between">
                <span>🎨 UI & Web Design</span>
                <span class="text-fuchsia-400 font-bold">12 Active</span>
              </div>
              <div class="p-2 bg-slate-950 border border-slate-800 rounded-lg flex justify-between">
                <span>💻 Code Builders</span>
                <span class="text-fuchsia-400 font-bold">8 Active</span>
              </div>
            </div>
          </div>
        `
      },
      {
        screen_name: "🔔 Notifications Center",
        screen_description: "Displays like counts, new follower updates, and alerts indicating direct messages.",
        screen_purpose: "Observe social feedback and stay connected",
        layout_html: `
          <div class="p-4 bg-slate-900 border border-fuchsia-500/30 rounded-xl">
            <h5 class="text-xs text-white font-extrabold uppercase mb-2">Recent Alerts</h5>
            <div class="p-2 bg-slate-950 border border-slate-800 rounded-lg text-[10px] text-slate-400 font-mono space-y-1">
              <p>❤ @Jane Doe liked your profile bio update.</p>
              <p>👤 @AlexTheCoder started following you.</p>
            </div>
          </div>
        `
      }
    ];
    interactiveWidgetHtml = `
      <div class="bg-slate-900 border border-fuchsia-500/30 rounded-2xl p-5 mb-6">
        <h3 class="text-xs font-black uppercase text-fuchsia-400 tracking-wider mb-2">💬 Interactive Community Feed</h3>
        <p class="text-[11px] text-slate-300 mb-4">Type a short message below to post a live update to your community feed.</p>
        <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div class="flex gap-2 mb-3">
            <input type="text" id="post-text-input" placeholder="What's on your mind?" class="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl focus:outline-none focus:border-fuchsia-500">
            <button onclick="addPost()" class="px-4 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold text-xs rounded-xl transition">Post</button>
          </div>
          <div id="posts-list" class="space-y-2 mt-2">
            <div class="p-2.5 bg-slate-900 border border-slate-855 rounded-lg text-xs">
              <p class="font-bold text-fuchsia-300">@JaneTheCreator</p>
              <p class="text-slate-300">Welcome to the collaborative community board!</p>
            </div>
          </div>
        </div>
      </div>
    `;
    interactiveWidgetScript = `
      function addPost() {
        const input = document.getElementById('post-text-input');
        const txt = input.value.trim();
        if (!txt) return;
        const postsList = document.getElementById('posts-list');
        const newCard = document.createElement('div');
        newCard.className = "p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs transition animate-fade-in";
        newCard.innerHTML = \`<p class="font-bold text-fuchsia-300">@GuestUser</p><p class="text-slate-300">\${txt}</p>\`;
        postsList.insertBefore(newCard, postsList.firstChild);
        input.value = '';
      }
    `;
    components = [
      { component_id: "community_feed", component_type: "form", purpose: "Composes and appends chronological posts to a live timeline", business_reason: "Provide students with a practical post composer to learn peer feedback mechanics", simple_explanation: "This lets you write updates and see them published in the feed instantly.", technical_explanation: "Uses DOM manipulation scripts to dynamically append nested card nodes into container divs." }
    ];
    skills_learned = [
      { skill: "Social Board Layouts", demonstrated: true },
      { skill: "DOM Message Appenders", demonstrated: true },
      { skill: "Circle Filtering Controls", demonstrated: true }
    ];
    ai_contribution_summary = "Formulated the responsive fuchsia-themed community feed, equipped with interactive DOM composers and posts counters.";
    walkthrough_explanations = [
      `Think of this like a organized binder structure. It categorizes files into clean layouts, components, and interactive controllers so you always know where to find parts of ${projName}!`,
      `This is like the magic maps and hallways in a grand castle. It monitors which navigation tab user clicks, making sure they jump smoothly between different screens of your product in a flash!`,
      `This represents the primary engine of ${projName}. It receives user inputs, performs the heavy lifting calculation, and returns success feedback immediately like a smart kitchen blender!`,
      `This is a helpful bonus alerts drawer. It tracks likes and new group entries, displaying alerts in summaries beautifully!`,
      `Think of this like your app's digital backpack. It stores completed activities, reports, and approved values safely so they persist when navigating around different views!`
    ];
  } else {
    // productivity / default
    primaryColor = 'blue';
    categoryIcon = '⏱️';
    features = [
      { feature_name: "Central Task Board", feature_description: "A structured command board showing active priorities, task cards, and checklists.", category: "must_have" },
      { feature_name: "Pomodoro Focus Clock", feature_description: "An integrated focus session timer with pre-set countdown blocks and ticking status.", category: "must_have" },
      { feature_name: "Dynamic Priority Ticker", feature_description: "Enables tagging items as urgent, medium, or low priority.", category: "must_have" },
      { feature_name: "Work History Exporter", feature_description: "Generate and download a completed work log report.", category: "nice_to_have" },
      { feature_name: "Goal Notifications Reminder", feature_description: "Triggers smart browser alerts when the focus clock expires.", category: "nice_to_have" },
      { feature_name: "AI Priority Suggester", feature_description: "Recommends task ordering based on historical productivity logs.", category: "future" }
    ];
    steps = [
      { step_number: 1, title: "Create Task Workspace", description: "The user boots their workspace and logs active items into the central registry." },
      { step_number: 2, title: "Set Priority Badges", description: "The user classifies active items as high, medium, or low-urgency priorities." },
      { step_number: 3, title: "Trigger Focus Session", description: "The user starts the Pomodoro timer, keeping focused until the ticker hits zero." },
      { step_number: 4, title: "Check Task as Completed", description: "The task checkbox is marked as completed, updating task performance metrics." },
      { step_number: 5, title: "Download Performance Report", description: "The user exports their daily completed task logs for future reviews." }
    ];
    key_actions = [
      "Add priority tasks to task queues.",
      "Control Pomodoro Focus timers.",
      "Filter command lists by priority tags.",
      "Export completed activity reports."
    ];
    screens = [
      {
        screen_name: "🗂️ Task Command Board",
        screen_description: "Central workspace mapping active priorities, description details, and completed checkboxes.",
        screen_purpose: "Organize daily tasks and review project goals",
        layout_html: `
          <div class="p-4 bg-slate-900 border border-blue-500/30 rounded-xl">
            <span class="text-[9px] text-blue-400 font-bold uppercase tracking-wider block mb-1">Command Board</span>
            <h5 class="text-xs text-white font-extrabold uppercase mb-2">My Task Checklist</h5>
            <div class="space-y-2 text-xs">
              <div class="p-2 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
                <span class="text-slate-300">✔ Implement Phase 2 database cache</span>
                <span class="px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-[9px] text-blue-300 rounded font-bold">Urgent</span>
              </div>
            </div>
          </div>
        `
      },
      {
        screen_name: "⏱️ Focus Session Clock",
        screen_description: "Custom countdown timer allowing students to trigger focused intervals.",
        screen_purpose: "Enhance mental focus using a classic Pomodoro clock tracker",
        layout_html: `
          <div class="p-4 bg-slate-900 border border-blue-500/30 rounded-xl text-center">
            <h5 class="text-xs text-white font-extrabold uppercase mb-2">Pomodoro Ticker</h5>
            <p class="text-2xl font-black font-mono text-blue-400 py-1">25:00</p>
          </div>
        `
      },
      {
        screen_name: "📊 Productivity Analytics",
        screen_description: "Plots daily tasks resolved, total focus hours, and weekly performance charts.",
        screen_purpose: "Evaluate performance ratings and streaks",
        layout_html: `
          <div class="p-4 bg-slate-900 border border-blue-500/30 rounded-xl">
            <h5 class="text-xs text-white font-extrabold uppercase mb-2">Completed Logs</h5>
            <div class="grid grid-cols-2 gap-2 text-center">
              <div class="p-2 bg-slate-950 border border-slate-800 rounded-lg">
                <p class="text-[8px] text-slate-500 font-bold uppercase">Completed</p>
                <p class="text-xs font-black text-blue-400 mt-1 font-mono">14 tasks</p>
              </div>
              <div class="p-2 bg-slate-950 border border-slate-800 rounded-lg">
                <p class="text-[8px] text-slate-500 font-bold uppercase">Focus Hours</p>
                <p class="text-xs font-black text-blue-400 mt-1 font-mono">5.2 hrs</p>
              </div>
            </div>
          </div>
        `
      }
    ];
    interactiveWidgetHtml = `
      <div class="bg-slate-900 border border-blue-500/30 rounded-2xl p-5 mb-6">
        <h3 class="text-xs font-black uppercase text-blue-400 tracking-wider mb-2">⏱️ Interactive Task Command Board</h3>
        <p class="text-[11px] text-slate-300 mb-4">Add urgent items to your checklists and check tasks off to update the status meter.</p>
        <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div class="flex gap-2 mb-3">
            <input type="text" id="task-input" placeholder="Type a task..." class="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl focus:outline-none focus:border-blue-500">
            <button onclick="addTask()" class="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition">Add Task</button>
          </div>
          <div id="todo-tasks-list" class="space-y-2 mt-2 max-h-32 overflow-y-auto">
            <div class="p-2 bg-slate-900 border border-slate-850 rounded-lg text-xs flex justify-between items-center">
              <span class="text-slate-300">Draft MVP Prototype architecture</span>
              <button onclick="this.parentElement.remove()" class="text-xs text-blue-400 hover:text-blue-300 font-bold">✔ Complete</button>
            </div>
          </div>
        </div>
      </div>
    `;
    interactiveWidgetScript = `
      function addTask() {
        const input = document.getElementById('task-input');
        const txt = input.value.trim();
        if (!txt) return;
        const tasksList = document.getElementById('todo-tasks-list');
        const newCard = document.createElement('div');
        newCard.className = "p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs flex justify-between items-center transition animate-fade-in";
        newCard.innerHTML = \`<span class="text-slate-300">\${txt}</span><button onclick="this.parentElement.remove()" class="text-xs text-blue-400 hover:text-blue-300 font-bold">✔ Complete</button>\`;
        tasksList.insertBefore(newCard, tasksList.firstChild);
        input.value = '';
      }
    `;
    components = [
      { component_id: "checklist_planner", component_type: "form", purpose: "Adds urgent items and updates checkbox completion queues", business_reason: "Provide students with a practical priority list solver to learn workflow scheduling", simple_explanation: "This displays task boards and lets you write checklist items.", technical_explanation: "Binds click triggers to append checkbox rows and deduct items from task list totals." }
    ];
    skills_learned = [
      { skill: "Checklist Interface Construction", demonstrated: true },
      { skill: "Priority Tag Allocators", demonstrated: true },
      { skill: "Local Storage Array Filters", demonstrated: true }
    ];
    ai_contribution_summary = "Formulated the robust blue-themed task command board, equipped with interactive checkbox items and task count logs.";
    walkthrough_explanations = [
      `Think of this like a organized binder structure. It categorizes files into clean layouts, components, and interactive controllers so you always know where to find parts of ${projName}!`,
      `This is like the magic maps and hallways in a grand castle. It monitors which navigation tab user clicks, making sure they jump smoothly between different screens of your product in a flash!`,
      `This represents the primary engine of ${projName}. It receives user inputs, performs the heavy lifting calculation, and returns success feedback immediately like a smart kitchen blender!`,
      `This is a helpful bonus focus timer. It sets up countdown ticking behaviors and alerts you of completed milestones beautifully!`,
      `Think of this like your app's digital backpack. It stores completed activities, reports, and approved values safely so they persist when navigating around different views!`
    ];
  }

  const mvp_html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projName} - VibeLab Prototype</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 0.25s ease-out forwards; }
    </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans">
    <header data-component-id="app_header" data-component-type="nav" data-purpose="Application navigation and header summary" class="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div class="flex items-center gap-3">
            <span class="text-xl">${categoryIcon}</span>
            <div>
                <h1 class="text-sm md:text-base font-black tracking-tight text-white">${projName}</h1>
                <p class="text-[9px] uppercase font-bold tracking-wider text-${primaryColor}-400">Interactive VibeLab MVP Draft</p>
            </div>
        </div>
        <div class="flex items-center gap-2 text-[10px] font-semibold text-slate-400 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Live Sandbox
        </div>
    </header>

    <main class="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8">
        <div data-component-id="target_demographics" data-component-type="display" data-purpose="Target demographics banner explaining solved problem statement and key user focus" class="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <span class="text-[10px] font-bold text-${primaryColor}-400 uppercase tracking-widest block mb-0.5">Project Blueprint Overview</span>
                <p class="text-xs text-slate-300">Target Audience: <span class="text-white font-extrabold">${target}</span></p>
                <p class="text-[11px] text-slate-400 mt-1">Challenge addressed: "${problem}"</p>
            </div>
            <div class="bg-slate-800 text-slate-300 text-[10px] uppercase font-black px-3 py-1.5 rounded-lg border border-slate-700">
                Category: ${category.toUpperCase()}
            </div>
        </div>

        <div data-component-id="tab_navigation" data-component-type="nav" data-purpose="Control bar to switch views between designed screens inside the prototype" class="flex flex-wrap gap-2 mb-6 border-b border-slate-800 pb-4">
            ${screens.map((s, idx) => `
                <button onclick="switchScreen(${idx})" id="tab-${idx}" data-component-id="screen_tab_${idx}" data-component-type="button" data-purpose="Switch active view to ${s.screen_name}" class="tab-btn px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${idx === 0 ? `bg-${primaryColor}-600 border-${primaryColor}-600 text-white shadow-lg` : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-300'}">
                    ${s.screen_name}
                </button>
            `).join('')}
        </div>

        <div data-component-id="screen_views_group" data-component-type="display" data-purpose="Container rendering layout modules of active screen views" class="space-y-6 mb-8">
            ${screens.map((s, idx) => `
                <div id="screen-${idx}" class="screen-view ${idx === 0 ? 'block' : 'hidden'}">
                    <div class="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-2xl">
                        <div class="mb-4 pb-3 border-b border-slate-800">
                            <span class="text-[9px] text-${primaryColor}-400 font-bold uppercase tracking-wider block mb-0.5">Visual Preview Screen</span>
                            <h2 class="text-sm font-bold text-white">${s.screen_name}</h2>
                            <p class="text-[11px] text-slate-400 mt-0.5">${s.screen_description}</p>
                        </div>
                        <div class="bg-slate-950/80 rounded-xl overflow-hidden p-4 border border-slate-800 shadow-inner">
                            ${s.layout_html}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>

        ${interactiveWidgetHtml}
    </main>

    <footer class="bg-slate-950 text-center py-6 text-[10px] text-slate-500 mt-12 border-t border-slate-900">
        <p class="mb-1">Built with <strong>VibeLab 🚀</strong></p>
        <p class="text-slate-600">Prototyping Sandbox Studio | All Rights Reserved 2026</p>
    </footer>

    <script>
        function switchScreen(activeIdx) {
            document.querySelectorAll('.screen-view').forEach((el, idx) => {
                if (idx === activeIdx) {
                    el.classList.remove('hidden');
                    el.classList.add('block');
                } else {
                    el.classList.add('hidden');
                }
            });

            document.querySelectorAll('.tab-btn').forEach((btn, idx) => {
                if (idx === activeIdx) {
                    btn.className = "tab-btn px-4 py-2.5 rounded-xl text-xs font-bold transition-all border bg-${primaryColor}-600 border-${primaryColor}-600 text-white shadow-lg";
                } else {
                    btn.className = "tab-btn px-4 py-2.5 rounded-xl text-xs font-bold transition-all border bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-300";
                }
            });
        }
        
        ${interactiveWidgetScript}
    </script>
</body>
</html>`;

  return {
    features,
    user_journey: { steps, key_actions },
    screens,
    mvp: {
      mvp_html,
      architecture_explanation: `🏗️ How It's Built\nConfigured as a self-contained single-file browser prototype using modern responsive Tailwind utility elements and client-side tab navigations.\n\n✨ What It Does\nSets up a fully operational interactive simulator complete with active buttons, lists, counters, and view togglers.\n\n👥 Who It Helps\nAllows ${target} to test operational flows and review design templates instantly.`,
      components,
      skills_learned,
      ai_contribution_summary
    },
    walkthrough_explanations
  };
}

export default router;
