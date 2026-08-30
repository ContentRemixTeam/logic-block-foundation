REVOKE ALL ON public.replay_launch_case_collision_reviews FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.replay_launch_batch_derivations FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.replay_launch_case_collision_reviews TO service_role;
GRANT ALL ON public.replay_launch_batch_derivations TO service_role;