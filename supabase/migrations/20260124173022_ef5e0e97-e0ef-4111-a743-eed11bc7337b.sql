-- Enable realtime for hatched_pets table so the widget gets live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.hatched_pets;