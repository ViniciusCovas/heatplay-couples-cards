-- Fix security warnings from the linter

-- Fix function search path mutable warnings
ALTER FUNCTION public.validate_room_phase_transition() SET search_path = 'public';
ALTER FUNCTION public.anonymous_can_access_room(uuid, text) SET search_path = 'public';