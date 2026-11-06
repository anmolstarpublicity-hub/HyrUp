# HyrUp

## Collector backend setup

Collectors write activity and screenshots directly to Supabase with the publishable key and the anonymous `anon` database role. Apply `collector_rls_policies.sql` in the new project's SQL Editor, keep the `screenshots` bucket private, and set a storage upload size limit and PNG-only MIME allowlist in Supabase.

**Anonymous writes are intentionally public and spoofable:** anyone who obtains the collector or publishable key can submit activity/screenshot metadata with any employee name and upload PNG files. RLS limits anonymous access to inserts only; it does not authenticate employees. Do not add anonymous read, update, or delete policies, and do not place a Supabase secret/service-role key on employee PCs.

Keep the Railway backend configured with its server-only Supabase secret for dashboard reads and screenshot retrieval. `HYRUP_COLLECTOR_KEYS` must be a JSON object mapping each exact employee name to a unique random 64-character hexadecimal collector token; this token is used only for Railway screenshot commands and live Socket.IO. Configure Railway `SUPABASE_URL`, `SUPABASE_KEY`, `HYRUP_COLLECTOR_KEYS`, and `HYRUP_API_KEY` before deploying.

Install the collector with the new Supabase Project URL, the publishable key (`sb_publishable_...`, or the legacy anon key), that employee's Railway collector token, and the Railway backend URL. Build and distribute the updated collector; do not distribute the old binary or installer. Windows 7 uses the separate best-effort `build_collector_win7.bat` legacy build.
