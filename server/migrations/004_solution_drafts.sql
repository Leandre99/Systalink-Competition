CREATE TABLE solution_drafts (
  id uuid PRIMARY KEY,
  request_id uuid UNIQUE NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  title text NOT NULL,
  error text NOT NULL,
  cause text NOT NULL,
  fix text NOT NULL,
  tech text[] NOT NULL,
  requester_approved boolean NOT NULL DEFAULT false,
  helper_approved boolean NOT NULL DEFAULT false,
  published boolean NOT NULL DEFAULT false
);
