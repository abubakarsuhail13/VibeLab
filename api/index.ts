// AI-REBUILD-TRIGGER: V3 (MemoryStorage and Path Logging)
import express from 'express';
import path from 'path';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import cryptoRandomString from 'crypto-random-string';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'vibelab_secret_key_2024';

// Multer Storage Configuration (using memory for serverless compatibility)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Token expired or invalid' });
    req.user = user;
    next();
  });
};

const app = express();
const router = express.Router();

app.use(cors());
app.use(express.json());

// Email Configuration (Nodemailer)
const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER;
const emailPass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
const emailHost = process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.hostinger.com';
const emailPort = parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || '587');
const isSecure = (process.env.EMAIL_PORT || process.env.SMTP_PORT || '587') === '465';

const transporterOptions: any = {
  host: emailHost,
  port: emailPort,
  secure: isSecure,
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
};

if (emailUser && emailPass) {
  transporterOptions.auth = {
    user: emailUser,
    pass: emailPass,
  };
} else {
  console.warn('Email Debug: Credentials missing. sendMail will be disabled.');
}

const transporter = nodemailer.createTransport(transporterOptions);

// Helper to send emails
const sendMail = async (options: nodemailer.SendMailOptions) => {
  try {
    const user = process.env.EMAIL_USER || process.env.SMTP_USER;
    const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
    if (!user || !pass) {
      console.warn('Email config ERROR: USER or PASS missing');
      return null;
    }
    
    console.log(`Email Debug: Attempting mail from ${user} to ${options.to}`);
    const host = process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.hostinger.com';
    const port = process.env.EMAIL_PORT || process.env.SMTP_PORT || '465';
    console.log(`Email Debug: Host ${host}:${port}`);

    const info = await transporter.sendMail({
      from: `"VibeLab" <${user}>`,
      ...options,
    });
    console.log('Email SUCCESS: %s', info.messageId);
    return info;
  } catch (error: any) {
    console.error('Email FAILURE:', {
      message: error.message,
      code: error.code,
      command: error.command
    });
    return null;
  }
};

// MySQL Connection Pool (Hostinger)
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS || process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
};

let pool: any = null;

const getPool = async () => {
  if (!pool) {
    if (!process.env.DB_HOST) {
      console.warn('DB_HOST not configured.');
      return null;
    }
    try {
      console.log('DB Debug: Connecting to Host:', dbConfig.host, 'User:', dbConfig.user, 'DB:', dbConfig.database);
      pool = mysql.createPool(dbConfig);
      const connection = await pool.getConnection();
      console.log('Successfully connected to MySQL database');
      
      // Auto-ensure tables exist
      try {
        console.log('DB Debug: Ensuring tables exist...');
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS waitlist (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL UNIQUE,
            source VARCHAR(100) DEFAULT 'vibelab_landing_v1',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS contact_submissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            organization VARCHAR(255),
            role VARCHAR(100) NOT NULL,
            interest_type VARCHAR(50),
            message TEXT NOT NULL,
            source VARCHAR(100) DEFAULT 'vibelab_landing_v1',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100),
            email VARCHAR(255) UNIQUE,
            password VARCHAR(255),
            role ENUM('student', 'teacher'),
            is_verified TINYINT DEFAULT 0,
            verification_token VARCHAR(255),
            reset_token VARCHAR(255),
            reset_token_expires DATETIME,
            avatar_url LONGTEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await connection.execute(`
          CREATE TABLE IF NOT EXISTS phases (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            order_index INT NOT NULL,
            is_locked_default TINYINT DEFAULT 1
          )
        `);

        await connection.execute(`
          CREATE TABLE IF NOT EXISTS phase_projects (
            id INT AUTO_INCREMENT PRIMARY KEY,
            phase_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            difficulty VARCHAR(50),
            requirements JSON,
            steps JSON,
            FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE CASCADE
          )
        `);

        await connection.execute(`
          CREATE TABLE IF NOT EXISTS user_phase_progress (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            phase_id INT NOT NULL,
            status ENUM('locked', 'active', 'completed') DEFAULT 'locked',
            progress_percentage INT DEFAULT 0,
            UNIQUE KEY user_phase (user_id, phase_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE CASCADE
          )
        `);

        await connection.execute(`
          CREATE TABLE IF NOT EXISTS user_project_progress (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            project_id INT NOT NULL,
            completed_steps JSON,
            is_completed TINYINT DEFAULT 0,
            UNIQUE KEY user_project (user_id, project_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (project_id) REFERENCES phase_projects(id) ON DELETE CASCADE
          )
        `);

        await connection.execute(`
          CREATE TABLE IF NOT EXISTS project_submissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            project_id INT NOT NULL,
            phase_id INT NOT NULL,
            github_url VARCHAR(255),
            live_url VARCHAR(255),
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY user_project_submission (user_id, project_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (project_id) REFERENCES phase_projects(id) ON DELETE CASCADE,
            FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE CASCADE
          )
        `);

        await connection.execute(`
          CREATE TABLE IF NOT EXISTS badges (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            phase_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY user_phase_badge (user_id, phase_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE CASCADE
          )
        `);

        // Seed initial phases if empty
        const [phaseCount]: any = await connection.execute('SELECT COUNT(*) as count FROM phases');
        if (phaseCount[0].count === 0) {
          const initialPhases = [
            ['Phase 1: Foundations', 'Master the core concepts of software engineering and web fundamentals.', 1, 0],
            ['Phase 2: Modern Frontend', 'Learn React, Tailwind CSS, and state management.', 2, 1],
            ['Phase 3: Backend & APIs', 'Build robust server-side logic and RESTful APIs.', 3, 1],
            ['Phase 4: Database Mastery', 'Design and optimize data structures for scale.', 4, 1],
            ['Phase 5: AI Integration', 'Implement LLMs and generative AI features into apps.', 5, 1],
            ['Phase 6: Fullstack Architectures', 'Design end-to-end systems that handle production loads.', 6, 1],
            ['Phase 7: Career & Portfolio', 'Final projects and interview preparation.', 7, 1]
          ];
          for (const phase of initialPhases) {
            await connection.execute('INSERT INTO phases (name, description, order_index, is_locked_default) VALUES (?, ?, ?, ?)', phase);
          }
        }

        // Seed initial projects for Phase 1 if empty
        const [projectCount]: any = await connection.execute('SELECT COUNT(*) as count FROM phase_projects');
        if (projectCount[0].count === 0) {
          const [phase1]: any = await connection.execute('SELECT id FROM phases WHERE order_index = 1');
          if (phase1.length > 0) {
            const phase1Id = phase1[0].id;
            const initialProjects = [
              [
                phase1Id,
                'Personal Portfolio Website',
                'Build a stunning, responsive personal portfolio website to showcase your future projects.',
                'Beginner',
                JSON.stringify(['HTML5', 'CSS3', 'Responsive Design', 'Vercel Deployment']),
                JSON.stringify([
                  { title: 'Project Setup', desc: 'Initialize your repository and set up a basic HTML structure.' },
                  { title: 'Responsive Layout', desc: 'Implement a mobile-first grid using CSS Flexbox or Grid.' },
                  { title: 'Navigation & Sections', desc: 'Create About, Projects, and Contact sections with smooth scrolling.' },
                  { title: 'Deployment', desc: 'Connect your GitHub repo to Vercel and deploy your live site.' }
                ])
              ],
              [
                phase1Id,
                'Interactive Task Manager',
                'Create a robust task management application with local storage and advanced filtering.',
                'Intermediate',
                JSON.stringify(['JavaScript ES6', 'LocalStorage', 'Event Delegation', 'CSS Variables']),
                JSON.stringify([
                  { title: 'UI Design', desc: 'Build a clean interface for adding and listing tasks.' },
                  { title: 'CRUD Logic', desc: 'Implement create, read, update, and delete functionality for tasks.' },
                  { title: 'Persistence', desc: 'Save task state to the browser’s local storage.' },
                  { title: 'Filters & Sorting', desc: 'Add ability to filter by status and sort by priority.' }
                ])
              ]
            ];
            for (const project of initialProjects) {
              await connection.execute(
                'INSERT INTO phase_projects (phase_id, title, description, difficulty, requirements, steps) VALUES (?, ?, ?, ?, ?, ?)',
                project
              );
            }
          }
        }

        // Ensure missing columns exist for existing tables
        const [columns]: any = await connection.execute('SHOW COLUMNS FROM users');
        const columnNames = columns.map((c: any) => c.Field);
        
        if (!columnNames.includes('is_verified')) {
          await connection.execute('ALTER TABLE users ADD COLUMN is_verified TINYINT DEFAULT 0');
        }
        if (!columnNames.includes('verification_token')) {
          await connection.execute('ALTER TABLE users ADD COLUMN verification_token VARCHAR(255)');
        }
        if (!columnNames.includes('reset_token')) {
          await connection.execute('ALTER TABLE users ADD COLUMN reset_token VARCHAR(255)');
        }
        if (!columnNames.includes('reset_token_expires')) {
          await connection.execute('ALTER TABLE users ADD COLUMN reset_token_expires DATETIME');
        }
        if (!columnNames.includes('avatar_url')) {
          await connection.execute('ALTER TABLE users ADD COLUMN avatar_url LONGTEXT');
        }
        if (!columnNames.includes('country')) {
          await connection.execute('ALTER TABLE users ADD COLUMN country VARCHAR(100) DEFAULT "Worldwide"');
        }
        if (!columnNames.includes('bio')) {
          await connection.execute('ALTER TABLE users ADD COLUMN bio TEXT');
        }
        if (!columnNames.includes('github_username')) {
          await connection.execute('ALTER TABLE users ADD COLUMN github_username VARCHAR(100)');
        }

        console.log('DB Debug: Tables verified/created.');
      } finally {
        connection.release();
      }
    } catch (err: any) {
      console.error('CRITICAL: Failed to connect to MySQL database:', {
        message: err.message,
        code: err.code,
        host: dbConfig.host,
        user: dbConfig.user
      });
      pool = null;
      return null;
    }
  }
  return pool;
};

// API Sub-Router
router.post('/waitlist', async (req, res) => {
  const { email } = req.body;
  console.log('POST /api/waitlist - Request Body:', req.body);

  if (!email) {
    console.warn('Waitlist Error: Email is missing in request body');
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const p = await getPool();
    if (!p) {
      console.error('Waitlist Error: Database connection failed');
      return res.status(503).json({ error: 'Database connection failed' });
    }

    try {
      console.log(`Waitlist DB: Attempting to insert/update ${email}`);
      await p.execute(
        'INSERT INTO waitlist (email, source) VALUES (?, ?) ON DUPLICATE KEY UPDATE source = VALUES(source), created_at = CURRENT_TIMESTAMP', 
        [email, 'vibelab_landing_v1']
      );
      console.log(`Waitlist DB: Successfully processed ${email}`);
    } catch (dbError: any) {
      console.error('Waitlist DB Error:', dbError);
      throw dbError; 
    }

    // Send Confirmation Email to User
    console.log(`Email: Attempting to send confirmation to ${email}`);
    const userEmail = await sendMail({
      to: email,
      subject: 'Welcome to the VibeLab Waitlist!',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
          <h1 style="color: #0ea5e9;">Welcome to VibeLab!</h1>
          <p>Hi there,</p>
          <p>Thank you for joining the VibeLab waitlist. We're excited to have you with us on our journey to redefine how schools and creators collaborate.</p>
          <p>We'll notify you as soon as we're ready for your early access.</p>
          <br/>
          <p>Best regards,<br/>The VibeLab Team</p>
        </div>
      `
    });
    console.log(`Email: User confirmation status: ${userEmail ? 'Sent' : 'Failed'}`);

    // Send Notification to Admin
    const adminEmailAddr = process.env.ADMIN_EMAIL || 'vibelab@nexaforgetech.com';
    console.log(`Email: Attempting to send admin notification to ${adminEmailAddr}`);
    const adminEmail = await sendMail({
      to: adminEmailAddr,
      subject: '🚀 New Waitlist Signup!',
      html: `<p><strong>New signup:</strong> ${email}</p><p>Source: vibelab_landing_v1</p>`
    });
    console.log(`Email: Admin notification status: ${adminEmail ? 'Sent' : 'Failed'}`);

    res.json({ success: true, message: 'Successfully joined waitlist' });
  } catch (error: any) {
    console.error('Waitlist DB Error:', error);
    res.status(500).json({ 
      error: 'Database error', 
      details: error.message,
      code: error.code
    });
  }
});

router.post('/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });
    const [existing]: any = await p.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'Email already registered' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = cryptoRandomString({ length: 32, type: 'url-safe' });

    const [result]: any = await p.execute(
      'INSERT INTO users (name, email, password, role, verification_token) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, role, verificationToken]
    );

    const baseUrl = process.env.VITE_APP_URL || 'https://vibe-lab-tan.vercel.app';
    await sendMail({
      to: email,
      subject: 'Verify your VibeLab Account',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
          <h1>Welcome to VibeLab!</h1>
          <p>Please verify your email address to activate your account.</p>
          <a href="${baseUrl}/verify-email?token=${verificationToken}" 
             style="display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">
            Verify Email Address
          </a>
        </div>
      `
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.'
    });
  } catch (error: any) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Database error during registration' });
  }
});

router.get('/auth/verify', async (req, res) => {
  const { token } = req.query;
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });
    const [rows]: any = await p.execute('SELECT id FROM users WHERE verification_token = ?', [token]);
    if (rows.length === 0) return res.status(400).json({ error: 'Invalid or expired verification token' });
    await p.execute('UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?', [rows[0].id]);
    res.json({ success: true, message: 'Email verified successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

router.post('/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });
    const [rows]: any = await p.execute('SELECT id, name FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.json({ success: true, message: 'Reset link sent if account exists.' });
    const user = rows[0];
    const resetToken = cryptoRandomString({ length: 32, type: 'url-safe' });
    const expires = new Date(Date.now() + 3600000);
    await p.execute('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [resetToken, expires, user.id]);
    const baseUrl = process.env.VITE_APP_URL || 'https://vibe-lab-tan.vercel.app';
    await sendMail({
      to: email,
      subject: 'Reset your VibeLab Password',
      html: `<p>Hi ${user.name}, click below to reset your password:</p><a href="${baseUrl}/reset-password?token=${resetToken}">Reset Password</a>`
    });
    res.json({ success: true, message: 'Reset link sent.' });
  } catch (error) {
    res.status(500).json({ error: 'Forgot password failed' });
  }
});

router.post('/auth/reset-password', async (req, res) => {
  const { token, password } = req.body;
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });
    const [rows]: any = await p.execute('SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()', [token]);
    if (rows.length === 0) return res.status(400).json({ error: 'Invalid token' });
    const hashedPassword = await bcrypt.hash(password, 10);
    await p.execute('UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [hashedPassword, rows[0].id]);
    res.json({ success: true, message: 'Password reset successful!' });
  } catch (error) {
    res.status(500).json({ error: 'Reset failed' });
  }
});

router.post('/user/upload-avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    const request = req as any;
    if (!request.file) return res.status(400).json({ error: 'No file' });
    
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    // Convert to base64
    const base64Image = request.file.buffer.toString('base64');
    const avatarUrl = `data:${request.file.mimetype};base64,${base64Image}`;

    await p.execute('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, request.user.userId]);
    res.json({ success: true, avatarUrl });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.patch('/user/profile', authenticateToken, async (req: any, res) => {
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

// Learning Platform APIs
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
    const [progress]: any = await p.execute('SELECT project_id, completed_steps, is_completed FROM user_project_progress WHERE user_id = ?', [req.user.userId]);
    const projectsWithProgress = projects.map((project: any) => {
      const userProgress = progress.find((pr: any) => pr.project_id === project.id);
      return {
        ...project,
        completed_steps: userProgress ? userProgress.completed_steps : [],
        is_completed: userProgress ? !!userProgress.is_completed : false
      };
    });
    res.json(projectsWithProgress);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch projects' });
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
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

router.post('/progress/update', authenticateToken, async (req: any, res) => {
  const { projectId, completedSteps, isCompleted } = req.body;
  if (!projectId) return res.status(400).json({ error: 'Project ID required' });
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });
    await p.execute(
      `INSERT INTO user_project_progress (user_id, project_id, completed_steps, is_completed) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE completed_steps = VALUES(completed_steps), is_completed = VALUES(is_completed)`,
      [req.user.userId, projectId, JSON.stringify(completedSteps || []), isCompleted ? 1 : 0]
    );
    const [project]: any = await p.execute('SELECT phase_id FROM phase_projects WHERE id = ?', [projectId]);
    if (project.length > 0) {
      const phaseId = project[0].phase_id;
      const [allProjects]: any = await p.execute('SELECT id FROM phase_projects WHERE phase_id = ?', [phaseId]);
      const totalProjects = allProjects.length;
      if (totalProjects > 0) {
        const projectIds = allProjects.map((ap: any) => ap.id);
        const [completedInPhase]: any = await p.execute(
          'SELECT COUNT(*) as count FROM user_project_progress WHERE user_id = ? AND project_id IN (?) AND is_completed = 1',
          [req.user.userId, projectIds]
        );
        const completedCount = completedInPhase[0].count;
        const percentage = Math.round((completedCount / totalProjects) * 100);
        const status = percentage === 100 ? 'completed' : 'active';
        await p.execute(
          `INSERT INTO user_phase_progress (user_id, phase_id, status, progress_percentage) 
           VALUES (?, ?, ?, ?) 
           ON DUPLICATE KEY UPDATE status = VALUES(status), progress_percentage = VALUES(progress_percentage)`,
          [req.user.userId, phaseId, status, percentage]
        );
        if (percentage === 100) {
          const [currentPhase]: any = await p.execute('SELECT order_index FROM phases WHERE id = ?', [phaseId]);
          if (currentPhase.length > 0) {
            const nextOrder = currentPhase[0].order_index + 1;
            const [nextPhase]: any = await p.execute('SELECT id FROM phases WHERE order_index = ?', [nextOrder]);
            if (nextPhase.length > 0) {
              await p.execute('INSERT IGNORE INTO user_phase_progress (user_id, phase_id, status) VALUES (?, ?, ?)', [req.user.userId, nextPhase[0].id, 'active']);
            }
          }
        }
      }
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

router.post('/submission', authenticateToken, async (req: any, res) => {
  const { projectId, phaseId, githubUrl, liveUrl, description } = req.body;
  if (!projectId || !phaseId) return res.status(400).json({ error: 'Project ID and Phase ID are required' });

  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    await p.execute(
      `INSERT INTO project_submissions (user_id, project_id, phase_id, github_url, live_url, description) 
       VALUES (?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE github_url = VALUES(github_url), live_url = VALUES(live_url), description = VALUES(description)`,
      [req.user.userId, projectId, phaseId, githubUrl, liveUrl, description]
    );

    res.json({ success: true, message: 'Submission saved successfully' });
  } catch (error: any) {
    console.error('Submission Error:', error);
    res.status(500).json({ error: 'Failed to save submission' });
  }
});

router.get('/submissions/user', authenticateToken, async (req: any, res) => {
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

router.post('/phase/:id/certify', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    // 1. Check if all projects in this phase are completed
    const [allProjects]: any = await p.execute('SELECT id FROM phase_projects WHERE phase_id = ?', [id]);
    if (allProjects.length === 0) return res.status(400).json({ error: 'No projects in this phase' });

    const projectIds = allProjects.map((ap: any) => ap.id);
    const [completed]: any = await p.execute(
      'SELECT COUNT(*) as count FROM user_project_progress WHERE user_id = ? AND project_id IN (?) AND is_completed = 1',
      [req.user.userId, projectIds]
    );

    if (completed[0].count < allProjects.length) {
      return res.status(400).json({ error: 'Complete all projects to earn certification.' });
    }

    // 2. Create Badge
    await p.execute(
      'INSERT IGNORE INTO badges (user_id, phase_id) VALUES (?, ?)',
      [req.user.userId, id]
    );

    // 3. Update Phase Progress to completed
    await p.execute(
      'INSERT INTO user_phase_progress (user_id, phase_id, status, progress_percentage) VALUES (?, ?, "completed", 100) ON DUPLICATE KEY UPDATE status = "completed", progress_percentage = 100',
      [req.user.userId, id]
    );

    // 4. Unlock Next Phase
    const [currentPhase]: any = await p.execute('SELECT order_index FROM phases WHERE id = ?', [id]);
    if (currentPhase.length > 0) {
      const nextOrder = currentPhase[0].order_index + 1;
      const [nextPhase]: any = await p.execute('SELECT id FROM phases WHERE order_index = ?', [nextOrder]);
      if (nextPhase.length > 0) {
        await p.execute(
          'INSERT IGNORE INTO user_phase_progress (user_id, phase_id, status) VALUES (?, ?, "active")',
          [req.user.userId, nextPhase[0].id]
        );
      }
    }

    res.json({ success: true, message: 'Phase certified! Badge earned.' });
  } catch (error: any) {
    console.error('Certification Error:', error);
    res.status(500).json({ error: 'Failed to certify phase' });
  }
});

router.get('/badges/user', authenticateToken, async (req: any, res) => {
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

router.get('/leaderboard', async (req, res) => {
  const { period, country } = req.query;
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });

    let query = `
      SELECT 
        u.id, 
        u.name, 
        u.avatar_url, 
        u.country,
        COUNT(DISTINCT b.id) as points_badges,
        COUNT(DISTINCT s.id) as points_submissions,
        (SELECT COUNT(*) FROM user_phase_progress WHERE user_id = u.id AND status = 'completed') as points_phases,
        (COUNT(DISTINCT b.id) * 100 + COUNT(DISTINCT s.id) * 20 + (SELECT COUNT(*) FROM user_phase_progress WHERE user_id = u.id AND status = 'completed') * 50) as total_score
      FROM users u
      LEFT JOIN badges b ON u.id = b.user_id ${period === 'monthly' ? 'AND b.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)' : ''}
      LEFT JOIN project_submissions s ON u.id = s.user_id ${period === 'monthly' ? 'AND s.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)' : ''}
      WHERE 1=1
    `;

    const params: any[] = [];
    if (country && country !== 'Worldwide') {
      query += ' AND u.country = ?';
      params.push(country);
    }

    query += `
      GROUP BY u.id
      HAVING total_score > 0
      ORDER BY total_score DESC
      LIMIT 50
    `;

    const [rows] = await p.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Leaderboard Error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

router.get('/user/:userId/profile', async (req, res) => {
  const { userId } = req.params;
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });
    const [rows]: any = await p.execute('SELECT id, name, avatar_url, role, created_at FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
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
      'SELECT b.*, p.name as phase_name FROM badges b JOIN phases p ON b.phase_id = p.id WHERE b.user_id = ? ORDER BY b.created_at DESC',
      [userId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  
  try {
    const p = await getPool();
    if (!p) return res.status(503).json({ error: 'Database connection failed' });
    
    const [rows]: any = await p.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid email or password' });
    
    const user = rows[0];

    // Check if verified
    if (!user.is_verified) {
      return res.status(403).json({ error: 'Please verify your email address before logging in.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });
    
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        avatar_url: user.avatar_url 
      }
    });
  } catch (error: any) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Database error during login' });
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

    // Send Confirmation Email to User
    console.log(`Email: Attempting to send contact confirmation to ${email}`);
    const userEmail = await sendMail({
      to: email,
      subject: 'We received your inquiry - VibeLab',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
          <h1 style="color: #0ea5e9;">Thanks for contacting VibeLab!</h1>
          <p>Hi ${name},</p>
          <p>We've received your inquiry and our team will get back to you shortly.</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold; color: #64748b; font-size: 12px; text-transform: uppercase;">Your Message:</p>
            <p style="margin: 10px 0 0 0; color: #475569; font-style: italic;">"${message}"</p>
          </div>
          <br/>
          <p>Best regards,<br/>The VibeLab Team</p>
        </div>
      `
    });
    console.log(`Email: User contact confirmation: ${userEmail ? 'Sent' : 'Failed'}`);

    // Send Notification to Admin
    const adminEmailAddr = process.env.ADMIN_EMAIL || 'vibelab@nexaforgetech.com';
    console.log(`Email: Attempting to send admin contact notification to ${adminEmailAddr}`);
    const adminEmail = await sendMail({
      to: adminEmailAddr,
      subject: `📩 New Contact Inquiry from ${name}`,
      html: `
        <h2>New Inquiry Details:</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Org:</strong> ${organization || 'N/A'}</p>
        <p><strong>Role:</strong> ${role}</p>
        <p><strong>Interest:</strong> ${interest_type}</p>
        <p><strong>Message:</strong> ${message}</p>
      `
    });
    console.log(`Email: Admin contact notification: ${adminEmail ? 'Sent' : 'Failed'}`);

    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Database error', details: error.message });
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
    res.json({ 
      status: 'ok', 
      db: true, 
      count: (rows as any)[0].count,
      env: !!process.env.DB_HOST 
    });
  } catch (err: any) {
    res.json({ 
      status: 'error', 
      db: false, 
      error: err.message,
      env: !!process.env.DB_HOST 
    });
  }
});

// Mounting the router at both /api and root to be safe
app.use((req, res, next) => {
  console.log(`API Request: ${req.method} ${req.url}`);
  next();
});

app.use('/api', router);
app.use('/', router);

// Error Fallback
app.use((req, res) => {
  console.warn(`404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'API route not found', path: req.url });
});

export default app;
