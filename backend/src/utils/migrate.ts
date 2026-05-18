import fs from 'fs';
import path from 'path';
import { query } from './db';

const migrate = async () => {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('🔄 Starting database migration...');
    
    // Split schema by ; to run individually (optional, but safer for some pg versions)
    // However, for this simple case, we can run it as a single block
    await query(schema);
    
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrate();
