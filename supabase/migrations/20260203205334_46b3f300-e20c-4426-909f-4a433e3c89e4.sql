-- Create tutor_conversations table for tracking chat sessions
CREATE TABLE public.tutor_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  context_type TEXT NOT NULL DEFAULT 'general',
  context_id UUID,
  game_title TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_context_type CHECK (
    context_type IN ('general', 'course', 'work_order', 'lesson', 'game', 'onboarding')
  )
);

-- Create tutor_messages table for storing chat messages
CREATE TABLE public.tutor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES tutor_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_role CHECK (role IN ('user', 'assistant', 'system'))
);

-- Index for user's active conversations
CREATE INDEX idx_tutor_conversations_user_active 
ON tutor_conversations(user_id, is_active, updated_at DESC);

-- Index for fetching conversation messages
CREATE INDEX idx_tutor_messages_conversation 
ON tutor_messages(conversation_id, created_at ASC);

-- Enable RLS on tutor_conversations
ALTER TABLE tutor_conversations ENABLE ROW LEVEL SECURITY;

-- Users can view their own conversations
CREATE POLICY "Users can view own conversations"
ON tutor_conversations FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Users can create their own conversations
CREATE POLICY "Users can create own conversations"
ON tutor_conversations FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own conversations
CREATE POLICY "Users can update own conversations"
ON tutor_conversations FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Users can delete their own conversations
CREATE POLICY "Users can delete own conversations"
ON tutor_conversations FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Enable RLS on tutor_messages
ALTER TABLE tutor_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages in their own conversations
CREATE POLICY "Users can view messages in own conversations"
ON tutor_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tutor_conversations 
    WHERE id = conversation_id AND user_id = auth.uid()
  )
);

-- Users can insert messages in their own conversations
CREATE POLICY "Users can insert messages in own conversations"
ON tutor_messages FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tutor_conversations 
    WHERE id = conversation_id AND user_id = auth.uid()
  )
);

-- Enable realtime for messages (live streaming updates)
ALTER PUBLICATION supabase_realtime ADD TABLE tutor_messages;

-- Create function to update conversation timestamp and message count
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tutor_conversations
  SET 
    updated_at = now(),
    message_count = message_count + 1
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update conversation on new message
CREATE TRIGGER on_tutor_message_insert
AFTER INSERT ON tutor_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_on_message();