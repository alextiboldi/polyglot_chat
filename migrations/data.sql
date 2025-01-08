/*
  # Create auth tables

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key) - References auth.users.id
      - `email` (text, unique)
      - `first_name` (text)
      - `last_name` (text)
      - `language` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `profiles` table
    - Add policies for authenticated users to:
      - Read their own profile
      - Update their own profile
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  first_name text,
  last_name text,
  language text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


  -- Connection requests table
CREATE TABLE IF NOT EXISTS connection_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(from_user_id, to_user_id)
);

-- Connections table
CREATE TABLE IF NOT EXISTS connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

-- Enable RLS
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- Policies for connection_requests
CREATE POLICY "Users can create connection requests"
  ON connection_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can read connection requests they're involved in"
  ON connection_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() IN (from_user_id, to_user_id));

CREATE POLICY "Users can update their received connection requests"
  ON connection_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = to_user_id)
  WITH CHECK (auth.uid() = to_user_id);

-- Policies for connections
CREATE POLICY "Users can read their connections"
  ON connections
  FOR SELECT
  TO authenticated
  USING (auth.uid() IN (user1_id, user2_id));

-- Function to handle accepted connection requests
CREATE OR REPLACE FUNCTION handle_accepted_request()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO connections (user1_id, user2_id)
    VALUES (NEW.from_user_id, NEW.to_user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for creating connections
CREATE OR REPLACE TRIGGER on_request_accepted
  AFTER UPDATE ON connection_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_accepted_request();



-- Chats table
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES connections(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_message text,
  last_message_at timestamptz
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies for chats
CREATE POLICY "Users can read chats they're part of"
  ON chats
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM connections c
      WHERE c.id = chats.connection_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

-- Policies for messages
CREATE POLICY "Users can read messages in their chats"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats c
      JOIN connections conn ON c.connection_id = conn.id
      WHERE c.id = messages.chat_id
      AND (conn.user1_id = auth.uid() OR conn.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert messages in their chats"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats c
      JOIN connections conn ON c.connection_id = conn.id
      WHERE c.id = chat_id
      AND (conn.user1_id = auth.uid() OR conn.user2_id = auth.uid())
    )
    AND sender_id = auth.uid()
  );

-- Function to update chat's last message
CREATE OR REPLACE FUNCTION update_chat_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chats
  SET last_message = NEW.content,
      last_message_at = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update chat when new message is inserted
CREATE OR REPLACE TRIGGER on_message_inserted
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_last_message();

-- Function to create chat for new connection
CREATE OR REPLACE FUNCTION create_chat_for_connection()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO chats (connection_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create chat when connection is created
CREATE OR REPLACE TRIGGER on_connection_created
  AFTER INSERT ON connections
  FOR EACH ROW
  EXECUTE FUNCTION create_chat_for_connection();




ALTER TABLE connection_requests
ADD CONSTRAINT fk_from_user_id_profiles
FOREIGN KEY (from_user_id)
REFERENCES profiles (id)
ON DELETE CASCADE;

ALTER TABLE connections
ADD CONSTRAINT fk_user1_id_profiles
FOREIGN KEY (user1_id)
REFERENCES profiles (id)
ON DELETE CASCADE,
ADD CONSTRAINT fk_user2_id_profiles
FOREIGN KEY (user2_id)
REFERENCES profiles (id)
ON DELETE CASCADE;


/*
  # Add connection tokens table

  1. New Tables
    - `connection_tokens`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - The user who created the token
      - `token` (text) - Unique token for the connection link
      - `expires_at` (timestamptz) - When the token expires
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `connection_tokens` table
    - Add policies for token creation and reading
*/

CREATE TABLE IF NOT EXISTS connection_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE connection_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own tokens"
  ON connection_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read tokens"
  ON connection_tokens
  FOR SELECT
  TO authenticated
  USING (true);

-- Create index for token lookups
CREATE INDEX IF NOT EXISTS idx_connection_tokens_token ON connection_tokens(token);



/*
  # Add function to create connection from token

  1. New Functions
    - `create_connection_from_token`
      - Creates a connection between two users
      - Returns the created connection record
      - Handles duplicate connections gracefully

  2. Security
    - Function runs with SECURITY DEFINER to bypass RLS
    - Input validation ensures users exist
*/

CREATE OR REPLACE FUNCTION create_connection_from_token(
  p_from_user_id uuid,
  p_to_user_id uuid
)
RETURNS connections
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_connection connections;
BEGIN
  -- Check if connection already exists (in either direction)
  SELECT * INTO v_connection
  FROM connections
  WHERE (user1_id = p_from_user_id AND user2_id = p_to_user_id)
     OR (user1_id = p_to_user_id AND user2_id = p_from_user_id);

  -- If connection exists, return it
  IF FOUND THEN
    RETURN v_connection;
  END IF;

  -- Create new connection
  INSERT INTO connections (user1_id, user2_id)
  VALUES (p_from_user_id, p_to_user_id)
  RETURNING * INTO v_connection;

  RETURN v_connection;
END;
$$;