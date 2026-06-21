import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const LOCAL_DB_DIR = './server/local_db';

// Helper function to load table data with fallback seeds
function getTableData(table: string): any[] {
  if (!fs.existsSync(LOCAL_DB_DIR)) {
    fs.mkdirSync(LOCAL_DB_DIR, { recursive: true });
  }
  const filePath = path.join(LOCAL_DB_DIR, `${table}.json`);
  if (!fs.existsSync(filePath)) {
    // Seed default data for key tables
    if (table === 'phases') {
      const defaultPhases = [
        {id: 1, name: "Phase 1 — Discovery & Ideation", description: "Discover your project idea and define your MVP.", order_index: 1, is_locked_default: 0},
        {id: 2, name: "Phase 2 — Product Creation", description: "Turn your idea into a working product. Think like a creator.", order_index: 2, is_locked_default: 1},
        {id: 3, name: "Phase 3 — Testing & Validation", description: "Test your product, understand how it works, and improve it.", order_index: 3, is_locked_default: 1},
        {id: 4, name: "Phase 4 — Deployment", description: "Launch your project and share it with the world.", order_index: 4, is_locked_default: 1},
        {id: 5, name: "Phase 5 — Portfolio & Showcase", description: "Build your portfolio and present your achievements.", order_index: 5, is_locked_default: 1}
      ];
      fs.writeFileSync(filePath, JSON.stringify(defaultPhases, null, 2), 'utf-8');
      return defaultPhases;
    }
    if (table === 'users') {
      const defaultUsers = [
        {
          id: 1,
          name: "Test Builder",
          email: "testbuilder@vibelab.io",
          password: "$2a$10$O0O/e9Bv6g5iY5.1uP9qO.rPZ/BGlxscCym6sXvG0I9eI.83W052y", //'Password123'
          role: "student",
          is_verified: 1,
          vl_id: "VL-2026-00001",
          created_at: new Date().toISOString()
        }
      ];
      fs.writeFileSync(filePath, JSON.stringify(defaultUsers, null, 2), 'utf-8');
      return defaultUsers;
    }
    if (table === 'phase_projects') {
      const defaultProjects = [
        {
          id: 1,
          phase_id: 1,
          title: "CLI Todo App",
          description: "Build a Command Line Interface todo list using Python scripts, saving output state to standard file streams.",
          difficulty: "Beginner",
          requirements: ["Python Basics", "File Handing", "Argparse"],
          steps: [
            {title: "Setup project setup", desc: "Configure Python virtual environment and create main file."},
            {title: "Add functional CRUD tasks", desc: "Write core functions to add, review, and remove tasks."},
            {title: "File serialization", desc: "Save tasks list locally in JSON format."}
          ],
          tutorial_data: [
            {
              step: 0,
              content: "Welcome to Python Development! We will draft a simple Command-Line interface list first.",
              starterCode: "def main():\n    print(\"Task: CLI Todo App Initialized!\")\n\nif __name__ == \"__main__\":\n    main()",
              instructions: "1. Save the starter code.\n2. Execute in your Python local CLI."
            }
          ]
        }
      ];
      fs.writeFileSync(filePath, JSON.stringify(defaultProjects, null, 2), 'utf-8');
      return defaultProjects;
    }
    return [];
  }
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

// Helper to save table data synchronously
function saveTableData(table: string, data: any[]) {
  if (!fs.existsSync(LOCAL_DB_DIR)) {
    fs.mkdirSync(LOCAL_DB_DIR, { recursive: true });
  }
  const filePath = path.join(LOCAL_DB_DIR, `${table}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// SQL condition parser for local JSON query filtering
function parseQueryConditions(whereClause: string, params: any[]): Record<string, any> {
  const conditions: Record<string, any> = {};
  if (!whereClause) return conditions;
  
  let paramIdx = 0;
  const parts = whereClause.split(/\s+AND\s+/i);
  for (const part of parts) {
    const match = part.match(/([a-zA-Z0-9_`\.]+)\s*(=|LIKE|IS|IN)\s*(.+)/i);
    if (match) {
      let col = match[1].replace(/[`']/g, '').trim();
      if (col.includes('.')) {
        col = col.split('.')[1];
      }
      let valPart = match[3].trim();
      let val: any = undefined;
      
      if (valPart === '?') {
        val = params[paramIdx++];
      } else if (valPart.toUpperCase() === 'NULL') {
        val = null;
      } else {
        val = valPart.replace(/['"`]/g, '').trim();
      }
      conditions[col] = val;
    }
  }
  return conditions;
}

// Mock pool representing a lightweight file-backed SQL emulator fallback
class LocalDatabasePool {
  async execute(sql: string, params: any[] = []): Promise<[any, any]> {
    return this.query(sql, params);
  }

  async query(sql: string, params: any[] = []): Promise<[any, any]> {
    const cleanedSql = sql.replace(/\s+/g, ' ').trim();
    const upperSql = cleanedSql.toUpperCase();

    // SELECT handling
    if (upperSql.startsWith('SELECT')) {
      let tableName = '';
      const fromMatch = cleanedSql.match(/FROM\s+([a-zA-Z0-9_]+)/i);
      if (fromMatch) {
        tableName = fromMatch[1];
      }

      if (upperSql.includes("SHOW TABLES")) {
        return [[{ "Tables_in_vibelab": "users" }], []];
      }
      if (upperSql.includes("SHOW COLUMNS")) {
        return [[
          { Field: 'id' }, { Field: 'name' }, { Field: 'email' }, { Field: 'password' },
          { Field: 'role' }, { Field: 'is_verified' }, { Field: 'verification_token' },
          { Field: 'vl_id' }, { Field: 'current_role' }, { Field: 'github_handle' },
          { Field: 'github_url' }, { Field: 'linkedin_url' }, { Field: 'bio' }, { Field: 'country' }, { Field: 'banner_url' },
          { Field: 'account_type' }, { Field: 'date_of_birth' }, { Field: 'gender' },
          { Field: 'state_province' }, { Field: 'city' }, { Field: 'institution_name' },
          { Field: 'education_level' }, { Field: 'field_of_study' }, { Field: 'profile_completed' },
          { Field: 'onboarding_completed' }, { Field: 'onboarding_completed_at' }
        ], []];
      }

      let data = getTableData(tableName);
      let isJoiningUsers = upperSql.includes('JOIN USERS');

      const whereIdx = upperSql.indexOf('WHERE');
      let selectWhere = '';
      if (whereIdx !== -1) {
        let endIdx = upperSql.indexOf('ORDER BY');
        if (endIdx === -1) endIdx = upperSql.indexOf('LIMIT');
        if (endIdx === -1) endIdx = cleanedSql.length;
        selectWhere = cleanedSql.substring(whereIdx + 5, endIdx).trim();
      }

      const conditions = parseQueryConditions(selectWhere, params);
      let matched = data.filter(row => {
        return Object.entries(conditions).every(([col, condVal]) => {
          let rowVal = row[col];
          if (condVal === null) {
            return rowVal === null || rowVal === undefined;
          }
          if (typeof rowVal === 'string' && typeof condVal === 'string') {
            return rowVal.toLowerCase() === condVal.toLowerCase();
          }
          return rowVal == condVal;
        });
      });

      if (isJoiningUsers && tableName === 'project_blueprints') {
        const users = getTableData('users');
        matched = matched.map(pb => {
          const u = users.find(user => user.id === pb.user_id);
          return {
            ...pb,
            student_name: u ? u.name : 'Student',
            avatar_url: u ? u.avatar_url : null
          };
        });
      }

      if (upperSql.includes('COUNT(*) AS TOTAL') || upperSql.includes('COUNT(*) AS ')) {
        const totalName = upperSql.includes('COUNT(*) AS TOTAL') ? 'total' : 'count';
        return [[{ [totalName]: matched.length }], []];
      }

      if (upperSql.includes('ORDER BY')) {
        const orderMatch = cleanedSql.match(/ORDER BY\s+([a-zA-Z0-9_`\.]+)\s*(ASC|DESC)?/i);
        if (orderMatch) {
          const col = orderMatch[1].replace(/[`']/g, '').trim().split('.').pop() as string;
          const isDesc = orderMatch[2] && orderMatch[2].toUpperCase() === 'DESC';
          matched.sort((a, b) => {
            let valA = a[col];
            let valB = b[col];
            if (valA === undefined) return 1;
            if (valB === undefined) return -1;
            if (typeof valA === 'string') {
              return isDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
            }
            return isDesc ? (valB - valA) : (valA - valB);
          });
        }
      }

      if (upperSql.includes('LIMIT')) {
        const limitMatch = cleanedSql.match(/LIMIT\s+(\d+)/i);
        if (limitMatch) {
          const lim = parseInt(limitMatch[1]);
          matched = matched.slice(0, lim);
        }
      }

      return [matched, []];
    }

    // INSERT handling
    if (upperSql.startsWith('INSERT')) {
      const intoMatch = cleanedSql.match(/INSERT\s+(?:IGNORE\s+)?INTO\s+([a-zA-Z0-9_]+)/i);
      if (!intoMatch) return [[], []];
      const tableName = intoMatch[1];

      const colsMatch = cleanedSql.match(/\(([^)]+)\)\s+VALUES/i);
      if (!colsMatch) return [[], []];
      const columns = colsMatch[1].split(',').map(c => c.trim().replace(/[`']/g, ''));

      const valuesMatch = cleanedSql.match(/VALUES\s*\(([^)]+)\)/i);
      if (!valuesMatch) return [[], []];
      const valueStrings = valuesMatch[1].split(',').map(x => x.trim());

      const item: Record<string, any> = {};
      let paramIdx = 0;
      columns.forEach((col, idx) => {
        const valStr = valueStrings[idx];
        if (!valStr) {
          item[col] = undefined;
          return;
        }
        if (valStr === '?') {
          item[col] = params[paramIdx++];
        } else if (valStr.toUpperCase() === 'NULL') {
          item[col] = null;
        } else if (valStr.startsWith("'") && valStr.endsWith("'")) {
          item[col] = valStr.substring(1, valStr.length - 1);
        } else if (valStr.startsWith('"') && valStr.endsWith('"')) {
          item[col] = valStr.substring(1, valStr.length - 1);
        } else if (!isNaN(Number(valStr))) {
          item[col] = Number(valStr);
        } else {
          item[col] = valStr;
        }
      });

      const data = getTableData(tableName);

      // Support ON DUPLICATE KEY UPDATE (specifically for user_phase_progress on user_id + phase_id)
      const duplicateIdx = upperSql.indexOf('ON DUPLICATE KEY UPDATE');
      if (duplicateIdx !== -1) {
        let existingRowIndex = -1;
        if (tableName === 'user_phase_progress') {
          existingRowIndex = data.findIndex(r => r.user_id == item.user_id && r.phase_id == item.phase_id);
        } else {
          existingRowIndex = data.findIndex(r => r.id == item.id);
        }

        if (existingRowIndex !== -1) {
          const dupPart = cleanedSql.substring(duplicateIdx + 23).trim();
          const dupParts = dupPart.split(',');
          let dupParamIdx = paramIdx; // duplicate keys can have their own parameters
          const existingRow = data[existingRowIndex];
          for (const p of dupParts) {
            const eqIdx = p.indexOf('=');
            if (eqIdx !== -1) {
              const col = p.substring(0, eqIdx).trim().replace(/[`']/g, '');
              const valPart = p.substring(eqIdx + 1).trim();
              let val: any = undefined;
              if (valPart === '?') {
                val = params[dupParamIdx++];
              } else if (valPart.toUpperCase() === 'NULL') {
                val = null;
              } else {
                val = valPart.replace(/['"`]/g, '').trim();
                if (!isNaN(Number(val))) val = Number(val);
              }
              existingRow[col] = val;
            }
          }
          saveTableData(tableName, data);
          return [{ insertId: existingRow.id, affectedRows: 1 }, []];
        }
      }

      const newId = data.length > 0 ? Math.max(...data.map(d => d.id || 0)) + 1 : 1;
      item.id = newId;
      item.created_at = new Date().toISOString();
      
      // Auto-populate vl_id if inserting users
      if (tableName === 'users' && !item.vl_id) {
        const year = new Date().getFullYear();
        item.vl_id = `VL-${year}-${newId.toString().padStart(5, '0')}`;
      }

      data.push(item);
      saveTableData(tableName, data);

      return [{ insertId: newId, affectedRows: 1 }, []];
    }

    // UPDATE handling
    if (upperSql.startsWith('UPDATE')) {
      const updateMatch = cleanedSql.match(/UPDATE\s+([a-zA-Z0-9_]+)/i);
      if (!updateMatch) return [[], []];
      const tableName = updateMatch[1];

      const data = getTableData(tableName);

      const setIdx = upperSql.indexOf('SET');
      const whereIdx = upperSql.indexOf('WHERE');
      const setPart = cleanedSql.substring(setIdx + 3, whereIdx !== -1 ? whereIdx : cleanedSql.length).trim();
      
      let updateWhere = '';
      if (whereIdx !== -1) {
        updateWhere = cleanedSql.substring(whereIdx + 5).trim();
      }

      const whereParamCount = (updateWhere.match(/\?/g) || []).length;
      const setParams = params.slice(0, params.length - whereParamCount);
      const whereParams = params.slice(params.length - whereParamCount);

      const sets: Record<string, any> = {};
      let setParamIdx = 0;
      const setParts = setPart.split(',');
      for (const p of setParts) {
        const eqIdx = p.indexOf('=');
        if (eqIdx !== -1) {
          const col = p.substring(0, eqIdx).trim().replace(/[`']/g, '');
          const valPart = p.substring(eqIdx + 1).trim();
          let setVal: any = undefined;
          if (valPart === '?') {
            setVal = setParams[setParamIdx++];
          } else if (valPart.toUpperCase() === 'NULL') {
            setVal = null;
          } else {
            setVal = valPart.replace(/['"`]/g, '').trim();
          }
          sets[col] = setVal;
        }
      }

      const conditions = parseQueryConditions(updateWhere, whereParams);
      let affectedRows = 0;
      
      const updatedData = data.map(row => {
        const isMatch = Object.entries(conditions).every(([col, condVal]) => {
          let rowVal = row[col];
          if (condVal === null) return rowVal === null || rowVal === undefined;
          return rowVal == condVal;
        });

        if (isMatch) {
          affectedRows++;
          return { ...row, ...sets };
        }
        return row;
      });

      saveTableData(tableName, updatedData);
      return [{ affectedRows }, []];
    }

    // DELETE handling
    if (upperSql.startsWith('DELETE')) {
      const fromMatch = cleanedSql.match(/FROM\s+([a-zA-Z0-9_]+)/i);
      if (!fromMatch) return [[], []];
      const tableName = fromMatch[1];

      const data = getTableData(tableName);
      const whereIdx = upperSql.indexOf('WHERE');
      let deleteWhere = '';
      if (whereIdx !== -1) {
        deleteWhere = cleanedSql.substring(whereIdx + 5).trim();
      }

      const conditions = parseQueryConditions(deleteWhere, params);
      const filtered = data.filter(row => {
        const isMatch = Object.entries(conditions).every(([col, condVal]) => {
          let rowVal = row[col];
          if (condVal === null) return rowVal === null || rowVal === undefined;
          return rowVal == condVal;
        });
        return !isMatch;
      });

      const affectedRows = data.length - filtered.length;
      saveTableData(tableName, filtered);
      return [{ affectedRows }, []];
    }

    return [[], []];
  }

  async getConnection() {
    return {
      execute: (sql: string, params: any[] = []) => this.execute(sql, params),
      query: (sql: string, params: any[] = []) => this.query(sql, params),
      release: () => {}
    };
  }
}

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS || process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 5000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
};

let pool: any = null;

export const getPool = async () => {
  if (!pool) {
    if (!process.env.DB_HOST) {
      console.warn('DB_HOST not configured. Falling back to local JSON database.');
      pool = new LocalDatabasePool();
      return pool;
    }
    try {
      console.log('DB Debug: Connecting to Host:', dbConfig.host, 'User:', dbConfig.user, 'DB:', dbConfig.database);
      pool = mysql.createPool(dbConfig);
      const connection = await pool.getConnection();
      console.log('Successfully connected to MySQL database');
      
      // Quick table presence check to bypass massive schema execution if already configured
      let isInitialized = false;
      try {
        const [rows]: any = await connection.execute("SHOW TABLES LIKE 'users'");
        isInitialized = rows.length > 0;
      } catch (e) {}

      if (isInitialized) {
        console.log('DB Debug: Database is already initialized. Skipping schema verification.');
        // Run Phase 0 - Idea Discovery Assistant migrations safely
        try {
          await connection.execute(`
            CREATE TABLE IF NOT EXISTS ideation_sessions (
              id            INT PRIMARY KEY AUTO_INCREMENT,
              user_id       INT NOT NULL,
              status        ENUM('in_progress', 'completed') DEFAULT 'in_progress',
              started_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              completed_at  TIMESTAMP NULL,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
          `);
          await connection.execute(`
            CREATE TABLE IF NOT EXISTS ideation_responses (
              id              INT PRIMARY KEY AUTO_INCREMENT,
              session_id      INT NOT NULL,
              story_number    INT NOT NULL,
              story_code      VARCHAR(10) NOT NULL,
              question_text   TEXT NOT NULL,
              user_response   TEXT NOT NULL,
              ai_followup     TEXT,
              created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (session_id) REFERENCES ideation_sessions(id) ON DELETE CASCADE
            )
          `);
          await connection.execute(`
            CREATE TABLE IF NOT EXISTS project_blueprints (
              id                    INT PRIMARY KEY AUTO_INCREMENT,
              user_id               INT NOT NULL,
              session_id            INT NOT NULL,
              problem_statement     TEXT,
              target_user_persona   TEXT,
              solution_concept      TEXT,
              ai_opportunity_map    JSON,
              mvp_definition        TEXT,
              learning_path         JSON,
              product_name          VARCHAR(255),
              product_features      JSON,
              complexity            ENUM('beginner', 'intermediate', 'advanced'),
              estimated_build_time  VARCHAR(100),
              recommended_track     VARCHAR(100),
              mvp_note              TEXT,
              generated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
              FOREIGN KEY (session_id) REFERENCES ideation_sessions(id) ON DELETE CASCADE
            )
          `);

          // Migrate Users Table Columns safely
          const [cols]: any = await connection.execute("SHOW COLUMNS FROM users");
          const names = cols.map((c: any) => c.Field);
          if (!names.includes('ideation_completed')) {
            console.log('DB Migration: Adding column ideation_completed to users...');
            await connection.execute("ALTER TABLE users ADD COLUMN ideation_completed BOOLEAN DEFAULT FALSE");
          }
          if (!names.includes('ideation_completed_at')) {
            console.log('DB Migration: Adding column ideation_completed_at to users...');
            await connection.execute("ALTER TABLE users ADD COLUMN ideation_completed_at TIMESTAMP NULL");
          }
          if (!names.includes('banner_url')) {
            console.log('DB Migration: Adding column banner_url to users...');
            await connection.execute("ALTER TABLE users ADD COLUMN banner_url LONGTEXT");
          }
          if (!names.includes('account_type')) {
            await connection.execute("ALTER TABLE users ADD COLUMN account_type VARCHAR(100)");
          }
          if (!names.includes('date_of_birth')) {
            await connection.execute("ALTER TABLE users ADD COLUMN date_of_birth VARCHAR(100)");
          }
          if (!names.includes('gender')) {
            await connection.execute("ALTER TABLE users ADD COLUMN gender VARCHAR(100)");
          }
          if (!names.includes('state_province')) {
            await connection.execute("ALTER TABLE users ADD COLUMN state_province VARCHAR(100)");
          }
          if (!names.includes('city')) {
            await connection.execute("ALTER TABLE users ADD COLUMN city VARCHAR(100)");
          }
          if (!names.includes('institution_name')) {
            await connection.execute("ALTER TABLE users ADD COLUMN institution_name VARCHAR(255)");
          }
          if (!names.includes('education_level')) {
            await connection.execute("ALTER TABLE users ADD COLUMN education_level VARCHAR(100)");
          }
          if (!names.includes('field_of_study')) {
            await connection.execute("ALTER TABLE users ADD COLUMN field_of_study VARCHAR(100)");
          }
          if (!names.includes('profile_completed')) {
            await connection.execute("ALTER TABLE users ADD COLUMN profile_completed BOOLEAN DEFAULT FALSE");
          }
          if (!names.includes('onboarding_completed')) {
            await connection.execute("ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE");
          }
          if (!names.includes('onboarding_completed_at')) {
            await connection.execute("ALTER TABLE users ADD COLUMN onboarding_completed_at TIMESTAMP NULL");
          }
          console.log('DB Migration: updating onboarding_completed for existing users...');
          try {
            await connection.execute(`
              UPDATE users
              SET onboarding_completed = TRUE,
                  onboarding_completed_at = NOW()
              WHERE (date_of_birth IS NOT NULL OR city IS NOT NULL OR state_province IS NOT NULL)
            `);
          } catch (updateErr: any) {
            console.error("Migration warning during updating onboarding_completed:", updateErr.message);
          }
          if (!names.includes('intro_completed')) {
            console.log('DB Migration: Adding column intro_completed to users...');
            await connection.execute("ALTER TABLE users ADD COLUMN intro_completed BOOLEAN DEFAULT FALSE");
          }
          if (!names.includes('intro_completed_at')) {
            console.log('DB Migration: Adding column intro_completed_at to users...');
            await connection.execute("ALTER TABLE users ADD COLUMN intro_completed_at TIMESTAMP NULL");
          }
          console.log('DB Migration: marking existing users with completed ideation as intro_completed...');
          await connection.execute(`
            UPDATE users
            SET intro_completed = TRUE,
                intro_completed_at = NOW()
            WHERE (ideation_completed = TRUE OR ideation_completed = 1) AND (intro_completed = FALSE OR intro_completed = 0)
          `);
          console.log('[DEBUG] Completed initial safety migrations, continuing to full schema verification flow...');
        } catch (migErr: any) {
          console.error("Migration error inside already-initialized DB:", migErr);
        }
      }

      
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
            intro_completed BOOLEAN DEFAULT FALSE,
            intro_completed_at TIMESTAMP NULL,
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
            last_active_step INT DEFAULT 0,
            code_state JSON,
            UNIQUE KEY user_project (user_id, project_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (project_id) REFERENCES phase_projects(id) ON DELETE CASCADE
          )
        `);

        // Migration helper for existing DB instances
        try {
          await connection.execute(`ALTER TABLE user_project_progress ADD COLUMN last_active_step INT DEFAULT 0`);
        } catch (_) {}
        try {
          await connection.execute(`ALTER TABLE user_project_progress ADD COLUMN code_state JSON`);
        } catch (_) {}

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
            earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            certificate_url TEXT,
            UNIQUE KEY user_phase_badge (user_id, phase_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE CASCADE
          )
        `);

        // Create Quiz content and habits tracking tables
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS quiz_questions (
            id INT PRIMARY KEY AUTO_INCREMENT,
            phase_id INT NOT NULL,
            question TEXT NOT NULL,
            options JSON NOT NULL,
            correct_index INT NOT NULL,
            FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE CASCADE
          )
        `);

        await connection.execute(`
          CREATE TABLE IF NOT EXISTS quiz_attempts (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            phase_id INT NOT NULL,
            score INT NOT NULL,
            passed BOOLEAN NOT NULL,
            attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE CASCADE
          )
        `);

        await connection.execute(`
          CREATE TABLE IF NOT EXISTS habit_logs (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            log_date DATE NOT NULL,
            learn_minutes INT DEFAULT 0,
            build_minutes INT DEFAULT 0,
            logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_day (user_id, log_date),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);

        await connection.execute(`
          CREATE TABLE IF NOT EXISTS phase_resources (
            id INT PRIMARY KEY AUTO_INCREMENT,
            phase_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            type ENUM('video','book','repo','article') NOT NULL,
            url TEXT NOT NULL,
            FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE CASCADE
          )
        `);

        await connection.execute(`
          CREATE TABLE IF NOT EXISTS support_messages (
            id INT PRIMARY KEY AUTO_INCREMENT,
            student_id INT NOT NULL,
            teacher_id INT DEFAULT NULL,
            sender_role VARCHAR(50) NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);

        await connection.execute(`
          CREATE TABLE IF NOT EXISTS ideation_sessions (
            id            INT PRIMARY KEY AUTO_INCREMENT,
            user_id       INT NOT NULL,
            status        ENUM('in_progress', 'completed') DEFAULT 'in_progress',
            started_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at  TIMESTAMP NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);

        await connection.execute(`
          CREATE TABLE IF NOT EXISTS ideation_responses (
            id              INT PRIMARY KEY AUTO_INCREMENT,
            session_id      INT NOT NULL,
            story_number    INT NOT NULL,
            story_code      VARCHAR(10) NOT NULL,
            question_text   TEXT NOT NULL,
            user_response   TEXT NOT NULL,
            ai_followup     TEXT,
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES ideation_sessions(id) ON DELETE CASCADE
          )
        `);

        await connection.execute(`
          CREATE TABLE IF NOT EXISTS project_blueprints (
            id                    INT PRIMARY KEY AUTO_INCREMENT,
            user_id               INT NOT NULL,
            session_id            INT NOT NULL,
            problem_statement     TEXT,
            target_user_persona   TEXT,
            solution_concept      TEXT,
            ai_opportunity_map    JSON,
            mvp_definition        TEXT,
            learning_path         JSON,
            product_name          VARCHAR(255),
            product_features      JSON,
            complexity            ENUM('beginner', 'intermediate', 'advanced'),
            estimated_build_time  VARCHAR(100),
            recommended_track     VARCHAR(100),
            mvp_note              TEXT,
            generated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (session_id) REFERENCES ideation_sessions(id) ON DELETE CASCADE
          )
        `);

        // Create Phase 2: Product Creation Tables
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS product_sessions (
            id                  INT PRIMARY KEY AUTO_INCREMENT,
            user_id             INT NOT NULL,
            ideation_session_id INT,
            current_step        ENUM(
              'blueprint','features','user_journey','screens',
              'mvp_generation','review','description',
              'feature_explanation','demo_prep','approved'
            ) DEFAULT 'blueprint',
            status              ENUM('in_progress','completed') DEFAULT 'in_progress',
            created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);

        await connection.execute(`
          CREATE TABLE IF NOT EXISTS product_blueprints (
            id                INT PRIMARY KEY AUTO_INCREMENT,
            session_id        INT NOT NULL,
            user_id           INT NOT NULL,
            project_name      VARCHAR(255),
            problem_statement TEXT,
            target_users      TEXT,
            mvp_scope         TEXT,
            student_approved  BOOLEAN DEFAULT FALSE,
            approved_at       TIMESTAMP NULL,
            FOREIGN KEY (session_id) REFERENCES product_sessions(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE
          )
        `);

        await connection.execute(`
          CREATE TABLE IF NOT EXISTS product_features (
            id                  INT PRIMARY KEY AUTO_INCREMENT,
            session_id          INT NOT NULL,
            feature_name        VARCHAR(255) NOT NULL,
            feature_description TEXT,
            category            ENUM('must_have','nice_to_have','future') NOT NULL,
            added_by            ENUM('ai','student') DEFAULT 'ai',
            is_included         BOOLEAN DEFAULT TRUE,
            student_rationale   TEXT,
            ai_feedback         TEXT,
            FOREIGN KEY (session_id) REFERENCES product_sessions(id) ON DELETE CASCADE
          )
        `);

        await connection.execute(`
          CREATE TABLE IF NOT EXISTS user_journeys (
            id          INT PRIMARY KEY AUTO_INCREMENT,
            session_id  INT NOT NULL,
            steps       JSON,
            key_actions JSON,
            approved    BOOLEAN DEFAULT FALSE,
            approved_at TIMESTAMP NULL,
            FOREIGN KEY (session_id) REFERENCES product_sessions(id) ON DELETE CASCADE
          )
        `);

        await connection.execute(`
          CREATE TABLE IF NOT EXISTS product_screens (
            id                 INT PRIMARY KEY AUTO_INCREMENT,
            session_id         INT NOT NULL,
            screen_name        VARCHAR(255),
            screen_description TEXT,
            screen_purpose     TEXT,
            layout_html        LONGTEXT,
            approved           BOOLEAN DEFAULT FALSE,
            change_requests    TEXT,
            FOREIGN KEY (session_id) REFERENCES product_sessions(id) ON DELETE CASCADE
          )
        `);

        await connection.execute(`
          CREATE TABLE IF NOT EXISTS mvp_builds (
            id                       INT PRIMARY KEY AUTO_INCREMENT,
            session_id               INT NOT NULL,
            user_id                  INT NOT NULL,
            mvp_html                 LONGTEXT,
            architecture_explanation TEXT,
            product_description      TEXT,
            demo_script              TEXT,
            key_talking_points       JSON,
            builder_reflection       TEXT,
            status                   ENUM('generating','ready_for_review','approved','ready_for_qa')
                                     DEFAULT 'generating',
            generated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            approved_at              TIMESTAMP NULL,
            FOREIGN KEY (session_id) REFERENCES product_sessions(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE
          )
        `);

        await connection.execute(`
          CREATE TABLE IF NOT EXISTS component_metadata (
            id                    INT PRIMARY KEY AUTO_INCREMENT,
            session_id            INT NOT NULL,
            component_id          VARCHAR(100) NOT NULL,
            component_type        VARCHAR(100),
            purpose               TEXT,
            business_reason       TEXT,
            simple_explanation    TEXT,
            technical_explanation TEXT,
            created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES product_sessions(id) ON DELETE CASCADE
          )
        `);

        // Safe, isolated column generator for all tables
        const addColumnIfNeeded = async (tableName: string, columnName: string, columnDef: string) => {
          try {
            const [cols]: any = await connection.execute(`SHOW COLUMNS FROM ${tableName}`);
            const names = cols.map((c: any) => c.Field);
            if (!names.includes(columnName)) {
              console.log(`DB Migration: Adding column ${columnName} to ${tableName}...`);
              await connection.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
            }
          } catch (err: any) {
            console.error(`DB Migration Warn: Failed adding ${columnName} to ${tableName}:`, err.message);
          }
        };

        // Migrate Users Table Columns at very high priority, isolated from other migrations!
        await addColumnIfNeeded('users', 'is_verified', 'TINYINT DEFAULT 0');
        await addColumnIfNeeded('users', 'verification_token', 'VARCHAR(255)');
        await addColumnIfNeeded('users', 'reset_token', 'VARCHAR(255)');
        await addColumnIfNeeded('users', 'reset_token_expires', 'DATETIME');
        await addColumnIfNeeded('users', 'avatar_url', 'LONGTEXT');
        await addColumnIfNeeded('users', 'country', 'VARCHAR(100) DEFAULT "Worldwide"');
        await addColumnIfNeeded('users', 'bio', 'TEXT');
        await addColumnIfNeeded('users', 'linkedin_url', 'VARCHAR(255)');
        await addColumnIfNeeded('users', 'github_url', 'VARCHAR(255)');
        await addColumnIfNeeded('users', 'github_handle', 'VARCHAR(100)');
        await addColumnIfNeeded('users', 'current_role', 'VARCHAR(100)');
        await addColumnIfNeeded('users', 'vl_id', 'VARCHAR(20) UNIQUE');
        await addColumnIfNeeded('users', 'banner_url', 'LONGTEXT');
        await addColumnIfNeeded('users', 'ideation_completed', 'BOOLEAN DEFAULT FALSE');
        await addColumnIfNeeded('users', 'ideation_completed_at', 'TIMESTAMP NULL');
        await addColumnIfNeeded('users', 'account_type', 'VARCHAR(100)');
        await addColumnIfNeeded('users', 'date_of_birth', 'VARCHAR(100)');
        await addColumnIfNeeded('users', 'gender', 'VARCHAR(100)');
        await addColumnIfNeeded('users', 'state_province', 'VARCHAR(100)');
        await addColumnIfNeeded('users', 'city', 'VARCHAR(100)');
        await addColumnIfNeeded('users', 'institution_name', 'VARCHAR(255)');
        await addColumnIfNeeded('users', 'education_level', 'VARCHAR(100)');
        await addColumnIfNeeded('users', 'field_of_study', 'VARCHAR(100)');
        await addColumnIfNeeded('users', 'profile_completed', 'BOOLEAN DEFAULT FALSE');
        await addColumnIfNeeded('users', 'onboarding_completed', 'BOOLEAN DEFAULT FALSE');
        await addColumnIfNeeded('users', 'onboarding_completed_at', 'TIMESTAMP NULL');

        // Mark existing users who already submitted the form as complete
        try {
          const [conn]: any = await pool.getConnection();
          try {
            await conn.execute(`
              UPDATE users
              SET onboarding_completed = TRUE,
                  onboarding_completed_at = NOW()
              WHERE (date_of_birth IS NOT NULL OR city IS NOT NULL OR state_province IS NOT NULL)
            `);
          } finally {
            conn.release();
          }
        } catch (_) {}


        // Migrate User Project Progress Columns
        await addColumnIfNeeded('user_project_progress', 'last_active_step', 'INT DEFAULT 0');
        await addColumnIfNeeded('user_project_progress', 'code_state', 'JSON');

        // Migrate MVP Builds Columns for Step 6 Self-explaining layers
        await addColumnIfNeeded('mvp_builds', 'skills_learned', 'JSON');
        await addColumnIfNeeded('mvp_builds', 'ai_contribution_summary', 'TEXT');
        await addColumnIfNeeded('mvp_builds', 'screenshot_url', 'LONGTEXT');

        // Migrate Phase Projects Columns
        await addColumnIfNeeded('phase_projects', 'tutorial_data', 'JSON');

        // Migrate User Phase Progress Columns
        await addColumnIfNeeded('user_phase_progress', 'topics_checklist', 'JSON');
        await addColumnIfNeeded('user_phase_progress', 'unlocked_at', 'TIMESTAMP NULL DEFAULT NULL');

        // Migrate Badges Columns
        await addColumnIfNeeded('badges', 'certificate_url', 'TEXT');
        await addColumnIfNeeded('badges', 'earned_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

        // Migrate Project Submissions Columns
        await addColumnIfNeeded('project_submissions', 'status', "VARCHAR(50) DEFAULT 'pending'");
        await addColumnIfNeeded('project_submissions', 'grade', "VARCHAR(10) DEFAULT NULL");
        await addColumnIfNeeded('project_submissions', 'review_comment', "TEXT DEFAULT NULL");
        await addColumnIfNeeded('project_submissions', 'reviewed_by', "INT DEFAULT NULL");
        await addColumnIfNeeded('project_submissions', 'reviewed_at', "TIMESTAMP DEFAULT NULL");

        // Migrate Quiz Questions Columns для Phase 2 Custom Quiz
        await addColumnIfNeeded('quiz_questions', 'session_id', 'INT NULL DEFAULT NULL');
        await addColumnIfNeeded('quiz_questions', 'explanation', 'TEXT NULL DEFAULT NULL');
        await addColumnIfNeeded('quiz_questions', 'section_number', 'INT NULL DEFAULT NULL');
        await addColumnIfNeeded('quiz_attempts', 'section_number', 'INT NULL DEFAULT NULL');

        // Migration query to assign vl_id for users with NULL results, running safely immediately after columns migrate
        try {
          const [usersWithoutVlId]: any = await connection.execute(
            'SELECT id, created_at FROM users WHERE vl_id IS NULL'
          );
          for (const u of usersWithoutVlId) {
            const date = u.created_at ? new Date(u.created_at) : new Date();
            const year = date.getFullYear();
            const [countRes]: any = await connection.execute(
              'SELECT COUNT(*) as total FROM users WHERE YEAR(created_at) = ? AND id < ?',
              [year, u.id]
            );
            const nextVal = (countRes[0].total + 1).toString().padStart(5, '0');
            const newVlId = `VL-${year}-${nextVal}`;

            let checkId = newVlId;
            let counter = 1;
            while (true) {
              const [checkRes]: any = await connection.execute('SELECT id FROM users WHERE vl_id = ?', [checkId]);
              if (checkRes.length === 0) break;
              checkId = `VL-${year}-${(countRes[0].total + 1 + counter).toString().padStart(5, '0')}`;
              counter++;
            }

            await connection.execute('UPDATE users SET vl_id = ? WHERE id = ?', [checkId, u.id]);
          }
        } catch (vlErr: any) {
          console.error("Error migrating vl_id for existing users:", vlErr.message);
        }

        // Check and reconstruct the curriculum to match the new 5-phase structure - Wrapped beautifully in try-catch to keep it robust against permission levels (e.g. Hostinger/shared MySQL blocks FOREIGN_KEY_CHECKS = 0)
        try {
          try {
            await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
          } catch (_) {}
          
          const [pCheck]: any = await connection.execute('SELECT id, name FROM phases WHERE order_index = 1');
          
          if (pCheck.length === 0) {
            console.log('DB Migration: Inserting Phase 1 - Discovery & Ideation...');
            await connection.execute(
              'INSERT INTO phases (name, description, order_index, is_locked_default) VALUES (?, ?, ?, ?)',
              ['Discovery & Ideation', 'Discover your project idea and define your MVP.', 1, 0]
            );
          } else if (pCheck[0].name.toLowerCase().includes('python')) {
            console.log('DB Migration: Renaming Phase 1 to Discovery & Ideation...');
            await connection.execute(
              'UPDATE phases SET name = ?, description = ? WHERE id = ?',
              ['Discovery & Ideation', 'Discover your project idea and define your MVP.', pCheck[0].id]
            );
          }

          const [oldPhasesCheck]: any = await connection.execute('SELECT COUNT(*) as count FROM phases WHERE order_index > 5');
          const [p2Check]: any = await connection.execute('SELECT COUNT(*) as count FROM phases WHERE order_index = 2 AND name LIKE "%Product Creation%"');
          
          if (oldPhasesCheck[0].count > 0 || p2Check[0].count === 0) {
            console.log('DB Migration: Transitioning old phases 2-8 to the new 5-phase structure...');
            
            // Delete old relationships first
            await connection.execute(`
              DELETE FROM user_phase_progress WHERE phase_id IN (
                SELECT id FROM phases WHERE order_index > 1
              )
            `);
            await connection.execute(`
              DELETE FROM phase_projects WHERE phase_id IN (
                SELECT id FROM phases WHERE order_index > 1
              )
            `);
            await connection.execute(`
              DELETE FROM phases WHERE order_index > 1
            `);

            // Insert new 4 phases (indices 2 to 5)
            const newPhases = [
              ['Product Creation', 'Turn your idea into a working product. Think like a creator.', 2, 1],
              ['Testing & Validation', 'Test your product, understand how it works, and improve it.', 3, 1],
              ['Deployment', 'Launch your project and share it with the world.', 4, 1],
              ['Portfolio & Showcase', 'Build your portfolio and present your achievements.', 5, 1]
            ];

            for (const phase of newPhases) {
              await connection.execute(
                'INSERT INTO phases (name, description, order_index, is_locked_default) VALUES (?, ?, ?, ?)',
                phase
              );
            }
            console.log('DB Migration: Phase migration completed successfully.');
          }
          
          try {
            await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
          } catch (_) {}
        } catch (curriculumErr: any) {
          console.error('DB Migration Error on resetting/verifying curriculum:', curriculumErr.message);
        }

        // Seed initial projects for all phases if they are missing
        const [allPhases]: any = await connection.execute('SELECT id, order_index FROM phases ORDER BY order_index');
        
        const projectsByPhase: Record<number, any[][]> = {
          1: [
            ['CLI Todo App', 'Build a Command Line Interface todo list using Python scripts, saving output state to standard file streams.', 'Beginner', ['Python Basics', 'File Handing', 'Argparse'], [
              {title:'Setup project setup',desc:'Configure Python virtual environment and create main file.'},
              {title:'Add functional CRUD tasks',desc:'Write core functions to add, review, and remove tasks.'},
              {title:'File serialization',desc:'Save tasks list locally in JSON format.'}
            ], [
              {
                step: 0,
                content: 'Welcome to Python Development! We will draft a simple Command-Line interface list first.',
                starterCode: 'def main():\n    print("Task: CLI Todo App Initialized!")\n\nif __name__ == "__main__":\n    main()',
                instructions: '1. Save the starter code.\n2. Execute in your Python local CLI.'
              }
            ]],
            ['Weather API App', 'Interact with OpenWeather REST APIs to retrieve and parse atmospheric results based on query inputs.', 'Beginner', ['APIs', 'requests', 'JSON Parsing'], [
              {title:'API credentials key',desc:'Initialize request configs and API params.'},
              {title:'Send query requests',desc:'Query REST endpoints and decode incoming headers.'}
            ]],
            ['File Organizer Script', 'Automate workflow management by reading locally populated file paths and directory trees.', 'Intermediate', ['os', 'shutil', 'Automation'], [
              {title:'Path mapping',desc:'Write loops searching folders and grouping by extensions.'}
            ]],
            ['Web Scraper', 'Parse online data fields and capture documents seamlessly using requests and BeautifulSoup.', 'Intermediate', ['BeautifulSoup4', 'Scraping'], [
              {title:'Get raw markup document',desc:'Download content streams structure.'}
            ]]
          ],
          2: [
            ['Custom Prompt Library', 'Develop a prompts management suite saving optimized prompt templates, input vars, and models parameters.', 'Intermediate', ['Prompting', 'Variables', 'JSON Mapping'], [
              {title:'Variables design model',desc:'Map system prompts with custom templates.'}
            ], [
              {
                step: 0,
                content: 'Build prompt loaders mapping template strings.',
                starterCode: 'template = "Review this code: {code}"\nprint(template.format(code="print(123)"))'
              }
            ]],
            ['Semantic Search Engine', 'Vectorize texts chunks using embeddings models and compute cosine similarity results.', 'Advanced', ['Embeddings', 'Cosine Similarity', 'Vector Math'], [
              {title:'Generate embeddings',desc:'Connect text segments into semantic vectors.'}
            ]],
            ['RAG Document Q&A Bot', 'Design complete local Retrieval-Augmented Generation workflows utilizing text search mechanisms.', 'Advanced', ['RAG', 'VectorDB', 'Retrieval'], [
              {title:'Chunk documents',desc:'Segment files and query embeddings databases.'}
            ]]
          ],
          3: [
            ['AI Chatbot', 'Build a live conversational platform maintaining active history threads and API integration.', 'Intermediate', ['Gemini API', 'History', 'React UI'], [
              {title:'Initialize client',desc:'Construct dynamic chat streams.'}
            ], [
              {
                step: 0,
                content: 'Create message arrays forwarding past items to the API.',
                starterCode: 'messages = [\n  {"role": "user", "parts": "Hello"}\n]'
              }
            ]],
            ['PDF Q&A Bot', 'Upload and scan PDF contents to summarize topics directly.', 'Intermediate', ['PDF Parsing', 'Context Chaining'], []],
            ['Voice Assistant', 'Integrate speech text transcriptions together with AI processing models.', 'Advanced', ['SpeechToText', 'Streaming API'], []],
            ['Resume Analyzer', 'Scan profile resumes identifying key fields, missing credentials, and customized matching suggestions.', 'Intermediate', ['Formatting APIs', 'Scoring Model'], []],
            ['RAG App', 'Complete enterprise-grade production level RAG builder.', 'Advanced', ['Full-stack RAG', 'Hybrid Search'], []]
          ],
          4: [
            ['Single-Agent Task Bot', 'Create autonomous agents using system tools executing CLI commands.', 'Advanced', ['Tool Calling', 'Agent Memory'], [
              {title:'Bind function definitions',desc:'Expose custom tools to agent runtime.'}
            ]],
            ['Multi-Agent Pipeline', 'Set up multi-agent networks delegating tasks sequentially between writers and reviewers.', 'Advanced', ['Agent Networks', 'Task Pipelines'], []],
            ['Auto Research Agent', 'Construct deep research engines writing comprehensive reports directly from online queries.', 'Expert', ['MCP Protocols', 'Auto-Search Systems'], []]
          ],
          5: [
            ['Paper Summary Blog Post', 'Summarize key papers focusing on ReAct, Toolformer, and Tree of Thoughts methodologies.', 'Intermediate', ['Academic Reading', 'Literature Analysis'], [
              {title:'Submit core outline',desc:'Compile paper insights and architectures differences.'}
            ]],
            ['Implement ReAct Agent', 'Code custom loops coordinating Reason and Action phases.', 'Expert', ['ReAct Paper', 'Execution Loops'], []],
            ['Discussion Presentation', 'Create interactive presentations exploring system evaluations and hallucinations mitigation.', 'Intermediate', ['Evaluation Design', 'Presentation'], []]
          ],
          6: [
            ['Course Completion Proof', 'Upload and submit valid credential proofs from LangChain or DeepLearning.AI curricula.', 'Intermediate', ['Validation', 'Certification Upload'], [
              {title:'Cert file upload',desc:'Validate proof metadata and links.'}
            ]],
            ['Capstone Project from Course', 'Build and share your final end-to-end coursework projects.', 'Expert', ['Full-stack Integration', 'Capstone Work'], []]
          ],
          7: [
            ['Deployed AI App (Live URL)', 'Deploy a production-ready application with a live domain publicly accessible.', 'Expert', ['FastAPI', 'Cloud Run', 'Production URL'], [
              {title:'Route active deployment',desc:'Configure host rules, security API proxies, and release keys.'}
            ]],
            ['Dockerized Service', 'Package full application images with optimal dependencies and configurations.', 'Advanced', ['Docker', 'Containers', 'Optimized Images'], []],
            ['CI/CD Pipeline Setup', 'Construct automated delivery workflows running lint, tests, and autodeploys on main branch commit.', 'Advanced', ['GitHub Actions', 'CI/CD Automation'], []]
          ]
        };

        for (const phase of allPhases) {
          const [existingCount]: any = await connection.execute('SELECT COUNT(*) as count FROM phase_projects WHERE phase_id = ?', [phase.id]);
          if (existingCount[0].count === 0) {
            const phaseProjects = projectsByPhase[phase.order_index] || [];
            for (const pDetails of phaseProjects) {
              await connection.execute(
                'INSERT INTO phase_projects (phase_id, title, description, difficulty, requirements, steps, tutorial_data) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [phase.id, pDetails[0], pDetails[1], pDetails[2], JSON.stringify(pDetails[3]), JSON.stringify(pDetails[4]), JSON.stringify(pDetails[5] || [])]
              );
            }
          }
        }

        // Seed 10 Quiz Questions per Phase if empty
        const [quizQuestionsCount]: any = await connection.execute('SELECT COUNT(*) as count FROM quiz_questions');
        if (quizQuestionsCount[0].count === 0) {
          console.log('Seeding 10 quiz questions per phase...');
          const questionsByPhaseOrder: Record<number, any[]> = {
            1: [
              { q: 'What is the correct file extension for Python files?', o: ['.py', '.pt', '.pyt', '.p'], c: 0 },
              { q: 'Which built-in function is used to output text in Python?', o: ['input()', 'print()', 'output()', 'log()'], c: 1 },
              { q: 'How do you create a function in Python?', o: ['function myFunc():', 'def myFunc():', 'create myFunc():', 'lambda myFunc():'], c: 1 },
              { q: 'What does list.append() do?', o: ['Adds element at the start', 'Removes last element', 'Adds element at the end', 'Sorts the list'], c: 2 },
              { q: 'Which data type is used to store key-value pairs?', o: ['list', 'tuple', 'set', 'dict'], c: 3 },
              { q: 'What is the correct way to handle exceptions in Python?', o: ['try...except', 'try...catch', 'do...except', 'try...fail'], c: 0 },
              { q: 'How do you import a module in Python?', o: ['require("module")', 'using module', 'import module', 'include module'], c: 2 },
              { q: 'What does a virtual environment do?', o: ['Speeds up execution', 'Isolates package dependencies', 'Encrypts your source code', 'Backs up code to GitHub'], c: 1 },
              { q: 'Which method is used to convert a JSON string to a dictionary?', o: ['json.dumps()', 'json.parse()', 'json.loads()', 'json.to_dict()'], c: 2 },
              { q: 'In OOP, what is the role of self?', o: ['Refers to the original parent class', 'Refers to the instance of the class', 'Defines a static method', 'Imports the class itself'], c: 1 }
            ],
            2: [
              { q: 'What is a "token" in the context of Large Language Models?', o: ['A cryptographic API key', 'A chunk of text or character sequence representing syllables/words', 'The speed rating of a model', 'A type of database index'], c: 1 },
              { q: 'What does "context window" refer to?', o: ['The GUI editor size', 'Maximum tokens the model can process at once in a prompt + response', 'The network latency of LLMs api', 'Operating system window holding the chatbot'], c: 1 },
              { q: 'What is the goal of "Prompt Engineering"?', o: ['Compiling LLM codebases', 'Designing and refining inputs to get accurate, structured outputs', 'Managing GPU cluster scheduling', 'Creating custom vector indexes'], c: 1 },
              { q: 'What does RAG stand for in AI systems?', o: ['Random Access Generation', 'Retrieval-Augmented Generation', 'Recurrent Adversarial Grouping', 'Refined Agent Gateway'], c: 1 },
              { q: 'What is the primary purpose of text Embeddings?', o: ['Translating high-level code to assembly', 'Representing words/sentences as dense numerical vectors in a semantic space', 'Encrypting prompt data dynamically', 'Compressing JSON file payloads'], c: 1 },
              { q: 'What is a vector database principally used for?', o: ['SQL nested queries', 'Caching static CSS assets', 'Storing and querying dimensional vectors for fast semantic searches', 'Managing transactional bank logs'], c: 2 },
              { q: 'Which model capability describes handling text alongside images?', o: ['Bilingual', 'Hyperdimensional', 'Multimodal', 'Recursive'], c: 2 },
              { q: 'In LLMs generation parameters, what does "temperature" adjust?', o: ['GPU operation temperatures', 'Controls randomness and creativity in generated responses', 'Maximum prompt token limits', 'Network speed rates'], c: 1 },
              { q: 'What is "hallucination" in LLMs?', o: ['Model stopping unexpectedly', 'Generating confident but false or unsupported facts', 'Retrieving documents from unauthorized sources', 'Crashing due to zero-division'], c: 1 },
              { q: 'What is "fine-tuning"?', o: ['Tuning hyperparameters during inference', 'Refining system prompt wording', 'Training an existing base model further on a curated dataset for specific tasks', 'Converting models to work on Docker'], c: 2 }
            ],
            3: [
              { q: 'How do you prevent public exposure of sensitive API keys?', o: ['Store them in window variables', 'Use server-side proxy API routes and process environment secrets', 'Include them in public index.html headers', 'Save them directly in local files inside public folders'], c: 1 },
              { q: 'Which exchange format is preferred for transmitting structured AI outputs?', o: ['YAML', 'CSV', 'JSON', 'XML'], c: 2 },
              { q: 'What sets semantic search apart from standard keyword search?', o: ['It only works inside SQL databases', 'Searching based on contextual meaning rather than matching character strings strictly', 'It requires specialized high-speed routers', 'It strictly checks spelling syntax'], c: 1 },
              { q: 'What does "chaining LLM calls" mean?', o: ['Querying multiple different API keys simultaneously', 'Directly feeding the outputs of one API call as parameters to consecutive prompts', 'Duplicating models inside Docker containers', 'Grouping API calls in a database transaction'], c: 1 },
              { q: 'Explain a primary benefit of RAG setups.', o: ['Allows models of smaller size to act instantly', 'Exposes real-time external files context without full model retraining', 'Stops models from checking spelling', 'Dramatically reduces server electric footprint'], c: 1 },
              { q: 'Which of the following belongs to Google\'s modern client SDK?', o: ['@google/genai', '@google/g-model', 'google-ai-studio-client', '@google/gemini-rest'], c: 0 },
              { q: 'Why is Tailwind helpful when building dynamic AI interfaces?', o: ['It performs GPU vector math natively', 'It styles responsive elements and layout grids instantly with convenient classes', 'It hosts models on the edge', 'It handles JWT token checks'], c: 1 },
              { q: 'In document preparation for a vector search, why is chunking necessary?', o: ['To format text into bold Markdown headers', 'To stay within LLM embedding token limits and preserve context relevance', 'To translate text to another language', 'To parse images into vectors'], c: 1 },
              { q: 'What is the purpose of setting a system-prompt or developer instructions?', o: ['It stores user profiles and emails', 'It configures the core behavior, constraints, and general persona of the agent', 'It compiles the React code', 'It speeds up network requests'], c: 1 },
              { q: 'Why is a chat history list passed on consecutive LLM API requests?', o: ['To keep track of payment billing histories', 'To give the stateless API model the full flow and context of the interaction', 'To cache results on the proxy', 'To generate analytics graphs'], c: 1 }
            ],
            4: [
              { q: 'What does MCP stand for in modern AI agent context?', o: ['Model Context Protocol', 'Micro Controller Process', 'Many Core Processor', 'Module Cache Proxy'], c: 0 },
              { q: 'What is "Tool Calling" or function-calling?', o: ['The developer writing APIs', 'The LLM planning and emitting a response specifying function names and arguments to run', 'A remote procedure call protocol', 'Installing external server dependencies'], c: 1 },
              { q: 'What constitutes an agent\'s memory?', o: ['The system hard-disk storage space', 'Persistent logging of tool execution runs and dialogue history to guide future plans', 'An API token cache', 'Using Redis servers only'], c: 1 },
              { q: 'What is the core feature of a Multi-Agent system?', o: ['A server holding multiple API keys', 'Multiple autonomous programs, each with distinct roles, collaborating together', 'Using multiple GPUs concurrently', 'A chatbot translates multiple languages'], c: 1 },
              { q: 'Which library is well-known for structuring agents or agents pipelines?', o: ['Vite', 'LangChain', 'Express', 'React Query'], c: 1 },
              { q: 'What is the ReAct loop pattern?', o: ['React state rendering lifecycle', 'Interleaving Reasoning (thoughts) and Actions (executing tools) sequentially', 'An automated testing framework', 'Encrypting API requests'], c: 1 },
              { q: 'Why must agent configurations specify maximum loops limits?', o: ['To restrict developer credentials', 'To prevent accidental infinite loops throwing the billing budget into distress', 'To structure JSON outputs', 'To force the container to reboot'], c: 1 },
              { q: 'What is an "orchestrator" agent responsible for?', o: ['Rendering graphs and charts', 'Reviewing, breaking down tasks, and assigning subtasks to specialized helper agents', 'Decrypting user sessions lists', 'Handling database connections pools'], c: 1 },
              { q: 'How does an agent signal it has finished a complex plan?', o: ['It requests user logout', 'The LLM triggers a final answer or termination tool call', 'It resets the local database', 'It returns a 404 http response'], c: 1 },
              { q: 'How does MCP assist agents operating locally?', o: ['By serving raw HTML/CSS templates', 'By standardizing the connection protocol to local databases, resources, and dev tool wrappers', 'By compiling TypeScript code', 'By compressing files sizes'], c: 1 }
            ],
            5: [
              { q: 'What mechanism is pioneered in the classic ReAct paper?', o: ['Client-side React rendering improvements', 'Interleaving text reasoning chains side-by-side with execution action steps', 'Building database triggers', 'Encrypting files over web sockets'], c: 1 },
              { q: 'What does the "Toolformer" paper showcase?', o: ['An LLM training itself to decide when and how to call external APIs dynamically', 'An early form of vector storage', 'A visual node editor for prompts', 'A compiler translating Python to JS'], c: 0 },
              { q: 'What is "Tree of Thoughts"?', o: ['Mapping folder hierarchies recursively', 'Allowing LLMs to explore multiple reasoning paths at once, with backtracking', 'A type of binary search tree in C++', 'Structuring prompts in nested layers'], c: 1 },
              { q: 'In the Reflexion paper, how do agents optimize their workflows?', o: ['By upgrading server hardware, memory, and pipelines', 'By reflecting on trial-and-error runs, writing feedback to improve subsequent trials', 'By calling support APIs', 'By requesting user clarifications'], c: 1 },
              { q: 'What does the classic RAG survey paper summarize as primary benefits?', o: ['RAG significantly reduces hallucinations and updates background knowledge easily', 'RAG removes the need to write backend code', 'RAG speeds up client-side framework builds', 'RAG removes JWT checks'], c: 0 },
              { q: 'Why should AI engineers stay up-to-date with top academic journals and arXiv prints?', o: ['To satisfy legal licensing parameters', 'To construct bleeding-edge features and apply novel algorithms before libraries adopt them', 'To format source files correctly', 'To monitor server bandwidth load'], c: 1 },
              { q: 'Which seminal paper introduced the Transformer architecture?', o: ['Attention Is All You Need', 'Deep Residual Learning for Image Recognition', 'Generative Adversarial Nets', 'BERT: Pre-training of Deep Bidirectional Transformers'], c: 0 },
              { q: 'In Tree of Thoughts, what techniques evaluate each node?', o: ['Standard unit tests', 'Heuristic search algorithms like Depth-First or Breadth-First search evaluation prompts', 'Regular expressions string tests', 'SQL indexing query timers'], c: 1 },
              { q: 'What components are cycled in the ReAct protocol?', o: ['Files, Functions, and Responses', 'Thoughts, Actions, and Observations', 'Queries, Indexes, and Documents', 'Inputs, Midpoints, and Outputs'], c: 1 },
              { q: 'In Reflexion, how is evaluation feedback preserved?', o: ['Written to public blog articles', 'Appended to agent memory as persistent context across consecutive validation attempts', 'Saved in cookies variables', 'Shared to Twitter bots'], c: 1 }
            ],
            6: [
              { q: 'Which educator is famous for launching DeepLearning.AI?', o: ['Yann LeCun', 'Andrew Ng', 'Geoffrey Hinton', 'Demis Hassabis'], c: 1 },
              { q: 'LangChain provides framework capabilities for which platforms?', o: ['Only web plugins', 'JavaScript/TypeScript, Python, and other packages ecosystems', 'Only C++ systems', 'Only Linux engines'], c: 1 },
              { q: 'When designing vector databases for production, what must be factored?', o: ['Indexing structures (e.g., HNSW), latency profiles, cost, and clustering scales', 'The background canvas image colors', 'Selecting standard SQL joins instead', 'Normalizing text tables fields'], c: 0 },
              { q: 'What does the concept of LLMOps emphasize?', o: ['Writing simpler Python models', 'Constructing full integration pipelines, logging, evaluators, drift tracking, and model monitoring', 'Adding stylish CSS gradients sheets', 'Compressing node_modules files'], c: 1 },
              { q: 'In building production-ready AI agents, which topic is crucial?', o: ['Standard HTML buttons layouts', 'Configuring evaluators, testing safety boundaries, managing costs, and tracing agents execute steps', 'Caching client router states', 'Configuring CSS media queries'], c: 1 },
              { q: 'What is the primary indicator of a successful capstone graduation build?', o: ['A clean README file', 'A working, deployed end-to-end full-stack AI application solving a concrete issue', 'Utilizing a massive quantity of CSS classes', 'An impressive PowerPoint pitch deck'], c: 1 },
              { q: 'Why is LLM evaluation tricky compared to standard unit tests?', o: ['Unit tests require API key limits', 'Model responses are highly non-deterministic and semantic, requiring soft-text validation', 'Models do not support testing tools', 'TypeScript enums compile to JS'], c: 1 },
              { q: 'What is "Prompt Injection"?', o: ['Accelerating model generation timers', 'Malicious user prompts designed to bypass/override general system instructions and safety rules', 'Injecting model data during Docker run', 'Loading vector indexes dynamically'], c: 1 },
              { q: 'What does dynamic tracing do in AI debugging?', o: ['Logs standard container load metrics', 'Allows developers to inspect the exact prompt, token count, tool execution, and output for each sub-step', 'Optimizes database query schemas', 'Hot-reloads CSS style classes'], c: 1 },
              { q: 'What is the utility of setting strict rate-limiting for public AI tools?', o: ['To force users to register higher screen accounts', 'To preserve cloud budgets, prevent API key abuse, and maintain overall service availability', 'To reduce text files outputs sizes', 'To force CSS files to minify'], c: 1 }
            ],
            7: [
              { q: 'What is FastAPI outstandingly suited for?', o: ['Serving heavy desktop graphics workloads', 'Building high-performance, asynchronous, self-documenting REST APIs in Python', 'Formatting offline document tables', 'Compiling React frontend pages'], c: 1 },
              { q: 'What does a Dockerfile declare?', o: ['Database SQL seed instructions', 'Detailed containerized system configurations, operating layers, and startup commands', 'React UI components hierarchies', 'Mail transport SMTP variables'], c: 1 },
              { q: 'What are GitHub Actions predominantly utilized for?', o: ['Recording real-time video audio transcripts', 'Executing automated linting, tests, build steps, and deployment pipelines upon code commits', 'Hosting databases on the cloud', 'Adding style presets to Tailwind modules'], c: 1 },
              { q: 'What does the acronym CI/CD highlight?', o: ['Continuous Integration and Continuous Deployment', 'Custom Interfaces and Constant Deliveries', 'Container Isolation and Client Detection', 'Cloud Interaction and Database Cache'], c: 0 },
              { q: 'Which option represents a serverless container hosting service?', o: ['Vite Server', 'AWS Fargate or GCP Cloud Run', 'MySQL Database engine', 'Local Node.js process'], c: 1 },
              { q: 'By what mechanism does FastAPI self-document APIs?', o: ['By reading comments manually', 'Natively outputting OpenAPI standards, providing built-in interactive Swagger UI tables', 'Saving Word document guides', 'Sharing code to GitHub repositories'], c: 1 },
              { q: 'What is the advantage of containerizing AI pipelines?', o: ['It avoids installing any libraries', 'It ensures absolute dependency parity (CUDA, Python versions, packages) across any hosts', 'It replaces the need for database engines', 'It automatically writes documentation'], c: 1 },
              { q: 'Why is zero-downtime deployment critical for public tools?', o: ['To satisfy SEO spiders rankings', 'To transition traffic smoothly, ensuring active users don\'t face service disruptions', 'To reduce Docker images size', 'To bypass JWT tokens verification'], c: 1 },
              { q: 'On our platform, what host port configuration is required for external entry queries?', o: ['Port 80 and 443 strictly inside containers', 'Port 3000 strictly, routed via reverse proxy', 'It changes on each container boot', 'No ports are open to the runtime'], c: 1 },
              { q: 'What is blue-green deployment?', o: ['Styling applications with blue/green CSS styles patterns', 'Maintaining dual production environments (Active/Idle) to safely test and transfer users live', 'Hosting apps on dual cloud machines', 'Writing unit tests with green outputs'], c: 1 }
            ]
          };

          for (const [phaseOrderText, list] of Object.entries(questionsByPhaseOrder)) {
            const phaseOrder = parseInt(phaseOrderText);
            const [pRow]: any = await connection.execute('SELECT id FROM phases WHERE order_index = ?', [phaseOrder]);
            if (pRow.length > 0) {
              const phaseId = pRow[0].id;
              for (const item of list) {
                await connection.execute(
                  'INSERT INTO quiz_questions (phase_id, question, options, correct_index) VALUES (?, ?, ?, ?)',
                  [phaseId, item.q, JSON.stringify(item.o), item.c]
                );
              }
            }
          }
        }

        // Seed Phase Resources if empty
        const [resourcesCount]: any = await connection.execute('SELECT COUNT(*) as count FROM phase_resources');
        if (resourcesCount[0].count === 0) {
          console.log('Seeding initial learning resources per phase...');
          const resourcesList: Record<number, any[][]> = {
            1: [
              ['Core Python For Beginners', 'video', 'https://www.youtube.com/watch?v=kqtD5dpn9C8'],
              ['BeautifulSoup Web Scraping Tutorial', 'video', 'https://www.youtube.com/watch?v=XVv6mJpFOb0'],
              ['Official Python Tutorial Documentation', 'article', 'https://docs.python.org/3/tutorial/index.html'],
              ['Python CLI Argparse Guide', 'article', 'https://docs.python.org/3/howto/argparse.html']
            ],
            2: [
              ['Large Language Models in a Nutshell', 'video', 'https://www.youtube.com/watch?v=zjkBMFhNj_g'],
              ['What is a Vector Database?', 'article', 'https://www.mongodb.com/resources/basics/databases/vector-database'],
              ['OpenAI Prompt Engineering Guide', 'repo', 'https://github.com/openai/openai-cookbook'],
              ['RAG Fundamentals Explained', 'article', 'https://blogs.nvidia.com/blog/what-is-retrieval-augmented-generation/']
            ],
            3: [
              ['Building AI Apps with Google Gemini API', 'video', 'https://www.youtube.com/watch?v=A39_eUf6M94'],
              ['LangChain Full Course for Beginners', 'video', 'https://www.youtube.com/watch?v=lG7Uxts9SXs'],
              ['NextJS Full Stack AI Templates', 'repo', 'https://github.com/steven-tey/precedency']
            ],
            4: [
              ['Model Context Protocol Introduction', 'article', 'https://modelcontextprotocol.io/introduction'],
              ['What are AI Agents?', 'video', 'https://www.youtube.com/watch?v=F8NKVhk0Kf8'],
              ['LangGraph Multi-Agent Architecture', 'repo', 'https://github.com/langchain-ai/langgraph']
            ],
            5: [
              ['ReAct: Synergizing Reasoning and Acting in Language Models', 'article', 'https://arxiv.org/abs/2210.03629'],
              ['Toolformer: Language Models Can Teach Themselves to Use Tools', 'article', 'https://arxiv.org/abs/2302.04761'],
              ['Tree of Thoughts: Deliberate Problem Solving with Language Models', 'article', 'https://arxiv.org/abs/2305.10601'],
              ['Reflexion: Language Agents with Active Learning from Self-Reflection', 'article', 'https://arxiv.org/abs/2303.11366']
            ],
            6: [
              ['LangChain Academy - Multi-Agent Systems in Production', 'video', 'https://academy.langchain.com/'],
              ['DeepLearning.AI Official Course platform', 'video', 'https://www.deeplearning.ai/']
            ],
            7: [
              ['FastAPI Production Checklist', 'article', 'https://fastapi.tiangolo.com/deployment/'],
              ['Dockerizing Node & Python Applications', 'article', 'https://docs.docker.com/language/node/'],
              ['GitHub Actions CI/CD Complete Workflows', 'article', 'https://docs.github.com/en/actions']
            ]
          };

          for (const [phaseOrderText, list] of Object.entries(resourcesList)) {
            const phaseOrder = parseInt(phaseOrderText);
            const [pRow]: any = await connection.execute('SELECT id FROM phases WHERE order_index = ?', [phaseOrder]);
            if (pRow.length > 0) {
              const phaseId = pRow[0].id;
              for (const item of list) {
                await connection.execute(
                  'INSERT INTO phase_resources (phase_id, title, type, url) VALUES (?, ?, ?, ?)',
                  [phaseId, item[0], item[1], item[2]]
                );
              }
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

        console.log('DB Debug: Tables verified/created.');
      } catch (tableErr: any) {
        console.error('DB Debug: Error creating tables:', tableErr.message);
        try {
          fs.appendFileSync('server-error.log', `[${new Date().toISOString()}] DB Schema Error: ${tableErr.stack || tableErr.message || tableErr}\n`);
        } catch (e) {}
      } finally {
        connection.release();
      }
    } catch (err: any) {
      console.warn('CRITICAL: Failed to connect to MySQL database. Falling back to local JSON database to prevent outage.', {
        message: err.message,
        code: err.code,
        host: dbConfig.host,
        user: dbConfig.user
      });
      try {
        fs.appendFileSync('server-error.log', `[${new Date().toISOString()}] DB Connection Error: ${err.stack || err.message || err}\n`);
      } catch (e) {}
      pool = new LocalDatabasePool();
      return pool;
    }
  }
  return pool;
};
