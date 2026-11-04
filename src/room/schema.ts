// DDL exatamente como em specs/001-pokerfe-mvp/data-model.md.
export const SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS room (
  name TEXT NOT NULL,
  deck_type TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_activity_at INTEGER NOT NULL,
  facilitator_token_hash TEXT NOT NULL,
  current_round INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS participants (
  session_id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_id TEXT NULL,
  is_facilitator INTEGER NOT NULL DEFAULT 0,
  is_observer INTEGER NOT NULL DEFAULT 0,
  connected INTEGER NOT NULL DEFAULT 0,
  last_seen_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rounds (
  number INTEGER PRIMARY KEY,
  title TEXT NULL,
  status TEXT NOT NULL,
  median REAL NULL,
  mode TEXT NULL,
  revealed_at INTEGER NULL
);

CREATE TABLE IF NOT EXISTS votes (
  round_number INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  card TEXT NOT NULL,
  PRIMARY KEY (round_number, session_id)
);
`;

export function applySchema(sql: SqlStorage): void {
  sql.exec(SCHEMA_DDL);
}
