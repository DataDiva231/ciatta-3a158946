DROP EXTENSION IF EXISTS pg_net;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION pg_net WITH SCHEMA extensions;

SELECT cron.unschedule('ciatta-health-sync') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ciatta-health-sync');

SELECT cron.schedule(
  'ciatta-health-sync',
  '17 * * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://project--b08088c5-97b7-47cc-8b5a-1ae97a03e2e8.lovable.app/api/public/health/sync',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_PugVtpJikkRLJajNnY2icA_N7Ez4kmb"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);