-- Add message editing support to chat_messages
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS edit_history jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Index for efficient deleted-messages history queries on a per-thread basis
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_deleted
  ON public.chat_messages (thread_id, deleted_at DESC)
  WHERE deleted_at IS NOT NULL;