
CREATE TYPE public.ticket_category AS ENUM ('billing', 'technical', 'medical', 'general');
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL DEFAULT 'TKT-00000',
  user_email TEXT,
  user_name TEXT DEFAULT 'Mohammed Al-Rashidi',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category ticket_category NOT NULL DEFAULT 'general',
  priority ticket_priority NOT NULL DEFAULT 'medium',
  status ticket_status NOT NULL DEFAULT 'open',
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tickets" ON public.support_tickets FOR SELECT USING (true);
CREATE POLICY "Anyone can create tickets" ON public.support_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update tickets" ON public.support_tickets FOR UPDATE USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number = 'TKT-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.generate_ticket_number();
