import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;

async function run() {
  const sql = fs.readFileSync('./supabase/migrations/20260912164500_add_tone_metrics.sql', 'utf8');
  const client = new Client({
    connectionString: "postgres://postgres.huldnuverpwhvodgykhm:SpeedyBoi%21234%23@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  console.log("Connected");
  
  try {
    await client.query(sql);
    console.log("Migration executed successfully");
    
    // insert into schema_migrations so supabase knows it's applied
    const version = '20260912164500';
    await client.query(`INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('${version}') ON CONFLICT DO NOTHING;`);
    console.log("Recorded in schema_migrations");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
