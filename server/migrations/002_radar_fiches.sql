-- Étape 3 : prise en charge des demandes, profils des aidants, fiches solutions.
ALTER TABLE requests DROP CONSTRAINT requests_status_check;
ALTER TABLE requests ADD CONSTRAINT requests_status_check CHECK (status IN ('ouverte', 'acceptee', 'fermee'));
ALTER TABLE requests ADD COLUMN helper_id uuid REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE requests ADD COLUMN accepted_at timestamptz;
CREATE INDEX requests_open_idx ON requests (created_at) WHERE status = 'ouverte';

-- Technologies que l'aidant maîtrise. La disponibilité, elle, n'existe que tant que sa page Radar est ouverte.
CREATE TABLE helper_profiles (
  user_id    uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  tech       text[] NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Fiches solutions publiées (aucun code du demandeur, seulement l'erreur, la cause et la correction).
CREATE TABLE solutions (
  id         uuid PRIMARY KEY,
  title      text NOT NULL,
  error      text NOT NULL,
  cause      text NOT NULL,
  fix        text NOT NULL,
  tech       text[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  search     tsvector GENERATED ALWAYS AS (to_tsvector('simple', title || ' ' || error || ' ' || cause || ' ' || fix)) STORED
);
CREATE INDEX solutions_search_idx ON solutions USING gin (search);
