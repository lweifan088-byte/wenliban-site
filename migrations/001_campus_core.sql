CREATE TABLE IF NOT EXISTS campus_users (
  username varchar(32) PRIMARY KEY,
  display_name varchar(60) NOT NULL,
  role varchar(16) NOT NULL CHECK (role IN ('student','admin','club')),
  club_id varchar(80),
  club_name varchar(80),
  password_salt varchar(64),
  password_hash varchar(128),
  profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  app_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE campus_users ADD COLUMN IF NOT EXISTS app_state jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE TABLE IF NOT EXISTS campus_community (
  id smallint PRIMARY KEY CHECK (id=1),
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS campus_sessions (
  token_hash char(64) PRIMARY KEY,
  username varchar(32) NOT NULL REFERENCES campus_users(username) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS campus_sessions_expiry_idx ON campus_sessions(expires_at);
CREATE TABLE IF NOT EXISTS campus_audit (
  id uuid PRIMARY KEY,
  actor varchar(32) NOT NULL,
  action varchar(80) NOT NULL,
  target_type varchar(40) NOT NULL,
  target_id varchar(120) NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS campus_audit_created_idx ON campus_audit(created_at DESC);
CREATE TABLE IF NOT EXISTS campus_media (
  id uuid PRIMARY KEY,
  owner varchar(32) NOT NULL REFERENCES campus_users(username) ON DELETE CASCADE,
  mime_type varchar(100) NOT NULL,
  filename varchar(180) NOT NULL,
  data bytea NOT NULL,
  size_bytes integer NOT NULL CHECK(size_bytes > 0 AND size_bytes <= 15728640),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS campus_media_owner_idx ON campus_media(owner,created_at DESC);
CREATE TABLE IF NOT EXISTS campus_reports (
  id uuid PRIMARY KEY,
  reporter varchar(32) NOT NULL REFERENCES campus_users(username) ON DELETE CASCADE,
  post_id varchar(120) NOT NULL,
  reason varchar(500) NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','resolved','dismissed')),
  reviewer varchar(32) REFERENCES campus_users(username) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
CREATE INDEX IF NOT EXISTS campus_reports_status_idx ON campus_reports(status,created_at DESC);

