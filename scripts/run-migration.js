// Script to run SQL migrations against Supabase
// Usage: node scripts/run-migration.js <path-to-sql-file>
//
// Requires SUPABASE_DB_URL environment variable set to your database connection string
// Find it in Supabase Dashboard > Settings > Database > Connection string (URI)
// Example: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

const fs = require('fs');
const path = require('path');

async function runMigration() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('ERROR: Set SUPABASE_DB_URL environment variable first.');
    console.error('Find it in: Supabase Dashboard > Settings > Database > Connection string (URI)');
    console.error('');
    console.error('Usage:');
    console.error('  SUPABASE_DB_URL="postgresql://..." node scripts/run-migration.js supabase/migrations/00001_initial_schema.sql');
    process.exit(1);
  }

  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.error('ERROR: Provide a SQL file path as argument.');
    console.error('Usage: node scripts/run-migration.js supabase/migrations/00001_initial_schema.sql');
    process.exit(1);
  }

  const sqlPath = path.resolve(sqlFile);
  if (!fs.existsSync(sqlPath)) {
    console.error(`ERROR: File not found: ${sqlPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log(`Running migration: ${sqlFile}`);
  console.log(`SQL length: ${sql.length} characters`);

  // Use pg module if available, otherwise fall back to fetch-based approach
  try {
    const { Client } = require('pg');
    const client = new Client({ connectionString: dbUrl });
    await client.connect();
    console.log('Connected to database.');

    await client.query(sql);
    console.log('Migration completed successfully!');

    await client.end();
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.error('pg module not found. Installing...');
      const { execSync } = require('child_process');
      execSync('npm install pg --no-save', { stdio: 'inherit' });
      console.log('Installed pg. Please run the script again.');
    } else {
      console.error('Migration failed:', err.message);
      process.exit(1);
    }
  }
}

runMigration();
