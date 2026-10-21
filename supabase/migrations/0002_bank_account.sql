-- Bank account a client receives VietQR transfers on. Run in Supabase SQL Editor.
alter table public.clients
  add column bank_bin text check (bank_bin ~ '^[0-9]{6}$'),
  add column bank_account_no text check (bank_account_no ~ '^[0-9A-Za-z]{1,19}$'),
  add column bank_account_name text;
