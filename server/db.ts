import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

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

export const getPool = async () => {
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

        // Seed initial projects for all phases if they are missing
        const [allPhases]: any = await connection.execute('SELECT id, order_index FROM phases ORDER BY order_index');
        
        const projectsByPhase: Record<number, any[][]> = {
          1: [
            ['Personal Portfolio Website', 'Build a stunning, responsive personal portfolio website to showcase your future projects.', 'Beginner', ['HTML5', 'CSS3', 'Vercel Deployment'], [{title:'Create homepage',desc:'Initialize your repository and set up a basic HTML structure.'},{title:'Add navigation',desc:'Create About, Projects, and Contact sections with smooth scrolling.'},{title:'Add project showcase section',desc:'Implement a clean grid to display your work.'},{title:'Make responsive',desc:'Ensure the design looks great on mobile and desktop.'},{title:'Deploy project',desc:'Connect your GitHub repo to Vercel and deploy your live site.'}]],
            ['Interactive Task Manager', 'Create a robust task management application with local storage and advanced filtering.', 'Intermediate', ['JavaScript ES6', 'LocalStorage', 'CSS Variables'], [{title:'Build task input UI',desc:'Create a functional input field and add button.'},{title:'Create task list',desc:'Build the mechanism to display and manage multiple tasks.'},{title:'Add local storage',desc:'Save task state to the browser’s local storage.'},{title:'Add filters',desc:'Allow users to filter tasks by status or category.'},{title:'Polish UI',desc:'Apply advanced CSS techniques for a professional finish.'}]]
          ],
          2: [
            ['React Dashboard', 'Build a modern analytics dashboard with React.', 'Intermediate', ['React', 'Tailwind', 'Recharts'], [{title:'Setup',desc:'Vite + React'},{title:'Comps',desc:'Sidebar + Charts'},{title:'Data',desc:'Mock stats'}]]
          ],
          3: [
            ['Social Media API', 'Build a backend for a social platform.', 'Advanced', ['Node.js', 'Express', 'JWT'], [{title:'Auth',desc:'JWT Login'},{title:'Posts',desc:'CRUD operations'},{title:'Likes',desc:'Relation logic'}]]
          ],
          4: [
            ['E-commerce Database', 'Schema design for complex inventory.', 'Advanced', ['MySQL', 'Indexing', 'Transactions'], [{title:'Schema',desc:'Tables design'},{title:'Queries',desc:'Complex joins'},{title:'Optimization',desc:'Index tune'}]]
          ],
          5: [
            ['AI Content Generator', 'Integrate Gemini for automatic blog posts.', 'Advanced', ['Gemini API', 'Node.js'], [{title:'Setup',desc:'API Key config'},{title:'Prompt',desc:'Engineering'},{title:'UI',desc:'Generation flow'}]]
          ],
          6: [
            ['Real-time Chat App', 'Socket-based communication system.', 'Expert', ['WebSockets', 'Redis'], [{title:'Socket',desc:'Connection logic'},{title:'Rooms',desc:'Channel mapping'},{title:'History',desc:'DB persistence'}]]
          ],
          7: [
            ['Capstone Product', 'Your final graduation project.', 'Expert', ['Fullstack', 'AWS/Vercel'], [{title:'Pitch',desc:'Define product'},{title:'Build',desc:'MVP features'},{title:'Launch',desc:'Live demo'}]]
          ]
        };

        for (const phase of allPhases) {
          const [existingCount]: any = await connection.execute('SELECT COUNT(*) as count FROM phase_projects WHERE phase_id = ?', [phase.id]);
          if (existingCount[0].count === 0) {
            const phaseProjects = projectsByPhase[phase.order_index] || [];
            for (const pDetails of phaseProjects) {
              await connection.execute(
                'INSERT INTO phase_projects (phase_id, title, description, difficulty, requirements, steps) VALUES (?, ?, ?, ?, ?, ?)',
                [phase.id, pDetails[0], pDetails[1], pDetails[2], JSON.stringify(pDetails[3]), JSON.stringify(pDetails[4])]
              );
            }
          }
        }

        // Seed Test User
        const [testUser]: any = await connection.execute('SELECT id FROM users WHERE email = ?', ['testbuilder@vibelab.io']);
        if (testUser.length === 0) {
          const bcrypt = await import('bcryptjs');
          const hashedPassword = await bcrypt.default.hash('Password123', 10);
          await connection.execute(
            'INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, ?, ?)',
            ['Test Builder', 'testbuilder@vibelab.io', hashedPassword, 'student', 1]
          );
          console.log('DB Debug: Test User created.');
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
      } catch (tableErr: any) {
        console.error('DB Debug: Error creating tables:', tableErr.message);
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
