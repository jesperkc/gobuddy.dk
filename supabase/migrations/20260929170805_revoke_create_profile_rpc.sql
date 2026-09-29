-- create_profile() is the SECURITY DEFINER trigger that creates a profile row
-- on signup. It was also callable as /rest/v1/rpc/create_profile. Triggers
-- don't need EXECUTE at fire time, so revoking it only closes the API route.
revoke execute on function public.create_profile() from public, anon, authenticated;
