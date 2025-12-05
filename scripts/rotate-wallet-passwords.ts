import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE env vars before running.');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
const randPw = () => crypto.randomBytes(32).toString('hex');

async function run() {
  let page = 1;
  let more = true;

  while (more) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const users = data?.users ?? [];
    more = users.length === 1000;
    page += 1;

    for (const user of users) {
      const addr = user.user_metadata?.wallet_address as string | undefined;
      const isWalletUser = !!addr || user.email?.startsWith('wallet.user.');
      if (!isWalletUser) continue;

      await supabase.auth.admin.updateUserById(user.id, { password: randPw() });
      await supabase.auth.admin.signOutUser(user.id);
      console.log(`Rotated password for wallet user ${user.id}`);
    }
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
