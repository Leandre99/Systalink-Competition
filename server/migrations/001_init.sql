-- Utilisateurs connectés via GitHub (ou en mode démo).
CREATE TABLE users (
  id          uuid PRIMARY KEY,
  provider    text NOT NULL CHECK (provider IN ('github', 'dev')),
  provider_id text NOT NULL,
  login       text NOT NULL,
  name        text,
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_id)
);

-- Seule l'empreinte SHA-256 du jeton est stockée.
CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- Demandes SOS. Le code (payload) est effacé à expires_at (24 h maximum).
CREATE TABLE requests (
  id         uuid PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status     text NOT NULL DEFAULT 'ouverte' CHECK (status IN ('ouverte', 'fermee')),
  tech       text[] NOT NULL,
  command    text NOT NULL,
  exit_code  integer NOT NULL,
  payload    jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX requests_user_created_idx ON requests (user_id, created_at DESC);
CREATE INDEX requests_expires_idx ON requests (expires_at);
CREATE INDEX sessions_expires_idx ON sessions (expires_at);
