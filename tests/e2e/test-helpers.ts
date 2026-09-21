import { Client } from 'pg';

const DB_CONNECTION = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

export async function resetSeedPasswords() {
  const client = new Client({ connectionString: DB_CONNECTION });
  await client.connect();
  
  // Set all seed user passwords to 'Password123!' and confirm emails
  await client.query(
    `UPDATE auth.users 
     SET encrypted_password = '$2a$10$buUGKz.eBCjj9BaCKFo.buKZhM/GqW9REgA691fNVhOxcfysSBO6q', 
         email_confirmed_at = now() 
     WHERE email LIKE '%@manch.app'`
  );

  // Ensure sample live gig is active
  await client.query(
    `UPDATE public.gigs 
     SET status = 'live', pin = '4821' 
     WHERE id = '30000000-0000-0000-0000-000000000001'`
  );

  // Remove Priya from gig_members so she can test joining via PIN
  await client.query(
    `DELETE FROM public.gig_members 
     WHERE gig_id = '30000000-0000-0000-0000-000000000001' 
       AND user_id = '00000000-0000-0000-0000-000000000004'`
  );

  await client.end();
}
