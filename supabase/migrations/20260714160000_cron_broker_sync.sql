-- Schedules a broker sync for every user with an active broker connection
-- every 15 minutes, via pg_cron + pg_net calling the cron-broker-sync-all
-- edge function. Auth uses a shared-secret header pulled from Vault
-- (seeded out-of-band, not stored in this file) rather than a service-role
-- JWT, since any authenticated JWT would otherwise pass the function
-- gateway's default verify_jwt check.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.schedule(
  'broker-sync-all-every-15-min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kzscqtemnymqqbpkuoeq.supabase.co/functions/v1/cron-broker-sync-all',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_broker_sync_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
