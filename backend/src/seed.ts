import { query } from './utils/db';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function seed() {
  console.log('--- Database Seeding Started ---');

  try {
    // 1. Read and Execute Schema
    const schemaPath = path.join(__dirname, 'utils', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Applying schema...');
    // Split by semicolon to execute one by one (basic approach)
    const statements = schema
      .replace(/--.*$/gm, '') // remove comments
      .split(';')
      .filter(s => s.trim().length > 0);

    for (const statement of statements) {
      await query(statement);
    }
    console.log('Schema applied successfully.');

    // 2. Create Default Admin User
    const adminEmail = 'admin@davinovate.com';
    const adminPassword = 'admin123';
    
    console.log(`Checking for user: ${adminEmail}...`);
    const userRes = await query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    
    let userId;
    if (userRes.rows.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);
      const newUser = await query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
        [adminEmail, hashedPassword]
      );
      userId = newUser.rows[0].id;
      console.log('Default admin user created.');
    } else {
      userId = userRes.rows[0].id;
      console.log('Admin user already exists.');
    }

    // 3. Create a Sample Agent
    const agentRes = await query('SELECT id FROM agents WHERE user_id = $1 LIMIT 1', [userId]);
    let agentId;
    if (agentRes.rows.length === 0) {
      const newAgent = await query(
        'INSERT INTO agents (user_id, name, system_prompt) VALUES ($1, $2, $3) RETURNING id',
        [userId, 'Orion', 'You are Orion, a helpful AI assistant with access to advanced tools and a deep knowledge base.']
      );
      agentId = newAgent.rows[0].id;
      console.log('Sample agent "Orion" created.');
    } else {
      agentId = agentRes.rows[0].id;
      console.log('Sample agent already exists.');
    }

    // 4. Create Sample Skills
    const skillsRes = await query('SELECT id FROM skills WHERE user_id = $1 LIMIT 1', [userId]);
    if (skillsRes.rows.length === 0) {
      const skills = [
        {
          name: 'get_time',
          description: 'Gets the current system time.',
          schema: { type: 'object', properties: {} },
          code: `async function perform(params) { return { time: new Date().toISOString() }; }`
        },
        {
          name: 'calculator',
          description: 'Performs basic math operations.',
          schema: { 
            type: 'object', 
            properties: { 
              a: { type: 'number' }, 
              b: { type: 'number' }, 
              op: { type: 'string', enum: ['+', '-', '*', '/'] } 
            },
            required: ['a', 'b', 'op']
          },
          code: `async function perform({ a, b, op }) { 
            switch(op) {
              case "+": return a + b;
              case "-": return a - b;
              case "*": return a * b;
              case "/": return a / b;
              default: return "invalid op";
            }
          }`
        }
      ];

      for (const s of skills) {
        await query(
          'INSERT INTO skills (user_id, name, description, parameters_schema, action_code) VALUES ($1, $2, $3, $4, $5)',
          [userId, s.name, s.description, JSON.stringify(s.schema), s.code]
        );
      }
      console.log('Sample skills created.');
    }

    console.log('--- Seeding Completed Successfully ---');
    console.log(`Login with: ${adminEmail} / ${adminPassword}`);

  } catch (err: any) {
    console.error('Seeding error:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seed();
