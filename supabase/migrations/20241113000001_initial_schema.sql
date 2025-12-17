CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address VARCHAR(255) UNIQUE,
  name VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE TABLE pots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  archived_at TIMESTAMP WITH TIME ZONE,
  

  automerge_heads TEXT[],
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_pots_created_by ON pots(created_by);
CREATE INDEX idx_pots_archived_at ON pots(archived_at);
CREATE TABLE pot_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pot_id UUID NOT NULL REFERENCES pots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'member')) DEFAULT 'member',
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'removed')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(pot_id, user_id)
);
CREATE INDEX idx_pot_members_pot_id ON pot_members(pot_id);
CREATE INDEX idx_pot_members_user_id ON pot_members(user_id);
CREATE INDEX idx_pot_members_status ON pot_members(status);
CREATE TABLE crdt_checkpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pot_id UUID NOT NULL REFERENCES pots(id) ON DELETE CASCADE,
  

  document_data BYTEA NOT NULL,
  

  heads TEXT[] NOT NULL,
  change_count INTEGER NOT NULL DEFAULT 0,
  

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL REFERENCES users(id)
);
CREATE INDEX idx_crdt_checkpoints_pot_id ON crdt_checkpoints(pot_id);
CREATE INDEX idx_crdt_checkpoints_created_at ON crdt_checkpoints(created_at);
CREATE TABLE crdt_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pot_id UUID NOT NULL REFERENCES pots(id) ON DELETE CASCADE,
  

  change_data BYTEA NOT NULL,
  

  hash TEXT NOT NULL,
  actor TEXT NOT NULL,
  seq INTEGER NOT NULL,
  

  user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  

  UNIQUE(pot_id, hash)
);
CREATE INDEX idx_crdt_changes_pot_id ON crdt_changes(pot_id);
CREATE INDEX idx_crdt_changes_created_at ON crdt_changes(created_at);
CREATE INDEX idx_crdt_changes_hash ON crdt_changes(hash);
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pot_id UUID NOT NULL REFERENCES pots(id) ON DELETE CASCADE,
  expense_id VARCHAR(100) NOT NULL,
  

  cid VARCHAR(100) NOT NULL UNIQUE,
  filename VARCHAR(255),
  mime_type VARCHAR(100),
  size_bytes INTEGER,
  

  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_receipts_pot_id ON receipts(pot_id);
CREATE INDEX idx_receipts_expense_id ON receipts(expense_id);
CREATE INDEX idx_receipts_cid ON receipts(cid);
ALTER PUBLICATION supabase_realtime ADD TABLE crdt_changes;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pots ENABLE ROW LEVEL SECURITY;
ALTER TABLE pot_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE crdt_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE crdt_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read all users"
  ON users FOR SELECT
  USING (true);
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);
CREATE POLICY "Users can read pots they are members of"
  ON pots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pot_members
      WHERE pot_members.pot_id = pots.id
      AND pot_members.user_id = auth.uid()
      AND pot_members.status = 'active'
    )
  );
CREATE POLICY "Users can create pots"
  ON pots FOR INSERT
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Pot owners can update pots"
  ON pots FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pot_members
      WHERE pot_members.pot_id = pots.id
      AND pot_members.user_id = auth.uid()
      AND pot_members.role = 'owner'
    )
  );
CREATE POLICY "Users can read pot members if they are a member"
  ON pot_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pot_members pm
      WHERE pm.pot_id = pot_members.pot_id
      AND pm.user_id = auth.uid()
      AND pm.status = 'active'
    )
  );
CREATE POLICY "Pot owners can manage members"
  ON pot_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pot_members pm
      WHERE pm.pot_id = pot_members.pot_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
  );
CREATE POLICY "Members can read checkpoints"
  ON crdt_checkpoints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pot_members
      WHERE pot_members.pot_id = crdt_checkpoints.pot_id
      AND pot_members.user_id = auth.uid()
      AND pot_members.status = 'active'
    )
  );
CREATE POLICY "Members can create checkpoints"
  ON crdt_checkpoints FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM pot_members
      WHERE pot_members.pot_id = crdt_checkpoints.pot_id
      AND pot_members.user_id = auth.uid()
      AND pot_members.status = 'active'
    )
  );
CREATE POLICY "Members can read changes"
  ON crdt_changes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pot_members
      WHERE pot_members.pot_id = crdt_changes.pot_id
      AND pot_members.user_id = auth.uid()
      AND pot_members.status = 'active'
    )
  );
CREATE POLICY "Members can insert changes"
  ON crdt_changes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM pot_members
      WHERE pot_members.pot_id = crdt_changes.pot_id
      AND pot_members.user_id = auth.uid()
      AND pot_members.status = 'active'
    )
  );
CREATE POLICY "Members can read receipts"
  ON receipts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pot_members
      WHERE pot_members.pot_id = receipts.pot_id
      AND pot_members.user_id = auth.uid()
      AND pot_members.status = 'active'
    )
  );
CREATE POLICY "Members can upload receipts"
  ON receipts FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM pot_members
      WHERE pot_members.pot_id = receipts.pot_id
      AND pot_members.user_id = auth.uid()
      AND pot_members.status = 'active'
    )
  );
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pots_updated_at BEFORE UPDATE ON pots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE FUNCTION get_pot_members(pot_uuid UUID)
RETURNS TABLE(user_id UUID, role VARCHAR, status VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT pm.user_id, pm.role, pm.status
  FROM pot_members pm
  WHERE pm.pot_id = pot_uuid;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION is_pot_member(pot_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pot_members
    WHERE pot_id = pot_uuid
    AND user_id = user_uuid
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION cleanup_old_crdt_changes()
RETURNS void AS $$
BEGIN
  DELETE FROM crdt_changes
  WHERE id IN (
    SELECT id FROM (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY pot_id ORDER BY created_at DESC) as rn
      FROM crdt_changes
    ) t
    WHERE t.rn > 1000
  );
END;
$$ LANGUAGE plpgsql;
