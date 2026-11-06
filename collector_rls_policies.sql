-- Anonymous collectors can submit activity and upload screenshot objects.
-- These policies cannot verify the employee_name: anonymous writes are spoofable.
-- No anonymous SELECT, UPDATE, or DELETE access is granted.

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screenshots ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON TABLE public.activity_logs, public.screenshots TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.activity_logs_id_seq, public.screenshots_id_seq TO anon;
GRANT INSERT ON TABLE storage.objects TO anon;

DROP POLICY IF EXISTS "HyrUp anon insert activity" ON public.activity_logs;
CREATE POLICY "HyrUp anon insert activity"
ON public.activity_logs
FOR INSERT
TO anon
WITH CHECK (
  employee_name IS NOT NULL
  AND length(btrim(employee_name)) BETWEEN 1 AND 200
  AND app_website IS NOT NULL
  AND length(app_website) BETWEEN 1 AND 500
  AND date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  AND timestamp ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$'
  AND duration >= 0
  AND duration <= 1440
);

DROP POLICY IF EXISTS "HyrUp anon insert screenshot metadata" ON public.screenshots;
CREATE POLICY "HyrUp anon insert screenshot metadata"
ON public.screenshots
FOR INSERT
TO anon
WITH CHECK (
  employee_name IS NOT NULL
  AND length(btrim(employee_name)) BETWEEN 1 AND 200
  AND filename IS NOT NULL
  AND filename ~ '^[A-Za-z0-9 _-]+_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}\.png$'
);

UPDATE storage.buckets
SET public = false
WHERE id = 'screenshots';

DROP POLICY IF EXISTS "HyrUp anon upload screenshots" ON storage.objects;
CREATE POLICY "HyrUp anon upload screenshots"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'screenshots'
  AND position('/' IN name) > 1
  AND lower(name) LIKE '%.png'
  AND name NOT LIKE '%..%'
);
