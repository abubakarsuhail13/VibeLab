import { getPool } from './server/db.js';

async function main() {
  const p = await getPool();
  if (!p) {
    console.error("Database connection failed");
    return;
  }

  const userId = 1;
  const phase1Id = 1;
  const phase2Id = 2;
  const sectionNum = 1;

  console.log("--- TEST QUERY 1: quiz_attempts for Phase 1 ---");
  try {
    const [rows]: any = await p.execute(
      'SELECT id, score, passed, attempted_at FROM quiz_attempts WHERE user_id = ? AND phase_id = ? AND section_number IS NULL ORDER BY attempted_at DESC LIMIT 1',
      [userId, phase1Id]
    );
    console.log("Success, attempts count:", rows.length);
  } catch (err: any) {
    console.error("FAIL:", err.message);
  }

  console.log("\n--- TEST QUERY 2: quiz_attempts for Phase 2 ---");
  try {
    const [rows]: any = await p.execute(
      'SELECT id, score, passed, attempted_at FROM quiz_attempts WHERE user_id = ? AND phase_id = ? AND section_number = ? ORDER BY attempted_at DESC LIMIT 1',
      [userId, phase2Id, sectionNum]
    );
    console.log("Success, attempts count:", rows.length);
  } catch (err: any) {
    console.error("FAIL:", err.message);
  }

  console.log("\n--- TEST QUERY 3: project_blueprints for Phase 1 ---");
  try {
    const [bpRows]: any = await p.execute(
      'SELECT id, session_id, product_name, problem_statement, target_user_persona, solution_concept, mvp_definition FROM project_blueprints WHERE user_id = ? ORDER BY id DESC LIMIT 1',
      [userId]
    );
    console.log("Success, blueprint exists:", bpRows.length > 0);
  } catch (err: any) {
    console.error("FAIL:", err.message);
  }

  console.log("\n--- TEST QUERY 4: quiz_questions for Phase 1 with Session ---");
  try {
    const [existing]: any = await p.execute(
      'SELECT id, question, options FROM quiz_questions WHERE phase_id = ? AND session_id = ?',
      [phase1Id, 1]
    );
    console.log("Success, questions exists:", existing.length);
  } catch (err: any) {
    console.error("FAIL:", err.message);
  }

  console.log("\n--- TEST QUERY 5: quiz_questions for Phase 2 ---");
  try {
    const [existing]: any = await p.execute(
      'SELECT id, question, options FROM quiz_questions WHERE phase_id = ? AND session_id = ? AND (section_number = ? OR (? IS NULL AND section_number IS NULL))',
      [phase2Id, 1, sectionNum, sectionNum]
    );
    console.log("Success, questions exists:", existing.length);
  } catch (err: any) {
    console.error("FAIL:", err.message);
  }

  console.log("\n--- TEST QUERY 6: Static quiz_questionsfallback select ---");
  try {
    const [staticRows]: any = await p.execute(
      'SELECT id, question, options FROM quiz_questions WHERE phase_id = ? AND session_id IS NULL',
      [phase1Id]
    );
    console.log("Success, static rows:", staticRows.length);
  } catch (err: any) {
    console.error("FAIL:", err.message);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
