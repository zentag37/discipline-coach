
-- 1) Restrict admin SELECT on profiles to exclude Stripe billing identifiers.
--    Drop the broad admin SELECT policy and replace with a view-friendly approach:
--    revoke direct column access to stripe_* fields from authenticated; admins
--    still see all profile rows but Stripe IDs are only accessible to service_role.
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;

CREATE POLICY "Admins view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Revoke column-level access to Stripe identifiers from client roles.
REVOKE SELECT (stripe_customer_id, stripe_subscription_id) ON public.profiles FROM authenticated;
REVOKE SELECT (stripe_customer_id, stripe_subscription_id) ON public.profiles FROM anon;
-- service_role keeps full access for server-side code (webhooks, subscription fns).

-- 2) Lock down user_roles writes explicitly. RLS blocks by default with no
--    permissive policy, but make it explicit by revoking table-level write
--    privileges from client roles. Only service_role can manage roles.
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon;
GRANT ALL ON public.user_roles TO service_role;

-- 3) Restrict EXECUTE on SECURITY DEFINER has_role() to authenticated only.
--    It is used inside RLS policies which run as the calling user, so anon
--    should not be able to invoke it directly via the Data API.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;

-- handle_new_user is a trigger function on auth.users — no client should call it.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- touch_updated_at is a trigger helper — no client should call it.
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM authenticated;
