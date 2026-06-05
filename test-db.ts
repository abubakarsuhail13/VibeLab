import { getPool } from './server/db.js';

async function main() {
  console.log("Database Environment Check:");
  console.log("DB_HOST configured:", !!process.env.DB_HOST);
  console.log("DB_USER configured:", !!process.env.DB_USER);
  console.log("DB_NAME configured:", !!process.env.DB_NAME);

  const p = await getPool();
  if (!p) {
    console.error("No database pool available");
    return;
  }
  try {
    const [rows]: any = await p.execute('SELECT id, name, order_index FROM phases ORDER BY order_index');
    console.log("\nPART A - CURRENT PHASES IN DATABASE:");
    console.log(JSON.stringify(rows, null, 2));
  } catch (error: any) {
    console.error("\nError executing query on phases:", error.message);
  }
  process.exit(0);
}

main().catch(err => {
  console.error("Inspecting failed:", err);
  process.exit(1);
});
