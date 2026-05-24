import { getPool } from './server/db.js';

async function main() {
  const p = await getPool();
  if (!p) {
    console.error("No database pool available");
    return;
  }
  try {
    const [columns]: any = await p.execute('SHOW COLUMNS FROM users');
    console.log("COLUMNS IN USERS TABLE:");
    console.log(columns.map((c: any) => `${c.Field}: ${c.Type} (Null: ${c.Null}, Key: ${c.Key})`));
  } catch (error: any) {
    console.error("Error inspecting users table:", error.message);
  }
  process.exit(0);
}

main().catch(err => {
  console.error("Inspecting failed:", err);
  process.exit(1);
});
