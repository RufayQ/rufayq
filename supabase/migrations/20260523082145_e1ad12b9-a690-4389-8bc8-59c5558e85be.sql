
CREATE TABLE IF NOT EXISTS public.chat_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_cmr_message ON public.chat_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_cmr_user ON public.chat_message_reactions(user_id);

ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view reactions"
ON public.chat_message_reactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.chat_messages m
    JOIN public.chat_participants p ON p.thread_id = m.thread_id
    WHERE m.id = chat_message_reactions.message_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Participants can add own reactions"
ON public.chat_message_reactions
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.chat_messages m
    JOIN public.chat_participants p ON p.thread_id = m.thread_id
    WHERE m.id = chat_message_reactions.message_id
      AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can remove own reactions"
ON public.chat_message_reactions
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reactions;
