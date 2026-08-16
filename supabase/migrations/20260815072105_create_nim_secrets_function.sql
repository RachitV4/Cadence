
-- Create a SECURITY DEFINER function that reads NIM credentials from vault.
-- Edge functions call this RPC to get the NVIDIA NIM API key, URL, and model name.
-- Only callable by the service role (which edge functions use).

CREATE OR REPLACE FUNCTION public.get_nim_secrets()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'nim_api_key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'NIM_API_KEY' LIMIT 1),
    'nim_api_url', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'NIM_API_URL' LIMIT 1),
    'nim_model', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'NIM_MODEL' LIMIT 1)
  )
$$;

-- Revoke all access from anon and authenticated, then grant only to service_role
REVOKE ALL ON FUNCTION public.get_nim_secrets() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_nim_secrets() TO service_role;
