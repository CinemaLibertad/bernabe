-- Canonical, public National Judicial Catalog.
-- Source content is never replaced by firm-private notes or Firebase records.

CREATE TABLE IF NOT EXISTS jurisdictions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  level TEXT NOT NULL,
  parent_id TEXT REFERENCES jurisdictions(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  publisher TEXT NOT NULL,
  source_url TEXT NOT NULL,
  format TEXT,
  license_name TEXT,
  terms_url TEXT,
  update_frequency TEXT,
  last_checked_at TEXT,
  last_imported_at TEXT,
  review_status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  official_name TEXT NOT NULL,
  organization_type TEXT NOT NULL,
  branch TEXT,
  instance TEXT,
  power TEXT,
  jurisdiction_id TEXT REFERENCES jurisdictions(id),
  province_code TEXT,
  province_name TEXT,
  region TEXT,
  judicial_district TEXT,
  locality TEXT,
  parent_organization_id TEXT REFERENCES organizations(id),
  status TEXT NOT NULL DEFAULT 'active',
  source_last_verified_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS organization_aliases (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  alias_type TEXT,
  source_id TEXT REFERENCES sources(id),
  UNIQUE (organization_id, alias)
);

CREATE TABLE IF NOT EXISTS organization_contacts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL,
  label TEXT,
  value TEXT NOT NULL,
  details TEXT,
  source_id TEXT REFERENCES sources(id),
  valid_from TEXT,
  valid_to TEXT,
  is_current INTEGER NOT NULL DEFAULT 1 CHECK (is_current IN (0, 1))
);

CREATE TABLE IF NOT EXISTS organization_links (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL,
  label TEXT,
  url TEXT NOT NULL,
  source_id TEXT REFERENCES sources(id),
  is_current INTEGER NOT NULL DEFAULT 1 CHECK (is_current IN (0, 1))
);

CREATE TABLE IF NOT EXISTS organization_relations (
  id TEXT PRIMARY KEY,
  from_organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  to_organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL,
  valid_from TEXT,
  valid_to TEXT,
  source_id TEXT REFERENCES sources(id),
  CHECK (from_organization_id <> to_organization_id),
  UNIQUE (from_organization_id, to_organization_id, relation_type)
);

CREATE TABLE IF NOT EXISTS authority_appointments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  role TEXT NOT NULL,
  started_on TEXT,
  ended_on TEXT,
  appointment_status TEXT NOT NULL DEFAULT 'unknown',
  source_id TEXT REFERENCES sources(id),
  source_url TEXT,
  verified_at TEXT
);

-- Field-level provenance permits data from several official sources without
-- pretending an unavailable value was supplied or verified.
CREATE TABLE IF NOT EXISTS field_provenance (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  field_path TEXT NOT NULL,
  source_id TEXT NOT NULL REFERENCES sources(id),
  source_url TEXT NOT NULL,
  retrieved_at TEXT NOT NULL,
  verified_at TEXT,
  source_license TEXT,
  source_record_key TEXT,
  UNIQUE (entity_type, entity_id, field_path, source_id, source_record_key)
);

-- Append-only audit log; old values are retained when an official datum changes.
CREATE TABLE IF NOT EXISTS change_events (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  field_path TEXT NOT NULL,
  change_type TEXT NOT NULL,
  old_value_json TEXT,
  new_value_json TEXT,
  changed_at TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  source_id TEXT REFERENCES sources(id),
  source_url TEXT,
  review_note TEXT
);

-- Rebuildable search projection. Keep separate from canonical records and
-- regenerate from organization names, aliases and jurisdiction metadata.
CREATE VIRTUAL TABLE IF NOT EXISTS organization_search USING fts5(
  organization_id UNINDEXED,
  searchable_text,
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE INDEX IF NOT EXISTS idx_organizations_jurisdiction ON organizations(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_organizations_province ON organizations(province_code);
CREATE INDEX IF NOT EXISTS idx_organizations_province_name ON organizations(province_name);
CREATE INDEX IF NOT EXISTS idx_organizations_region ON organizations(region);
CREATE INDEX IF NOT EXISTS idx_organizations_district ON organizations(judicial_district);
CREATE INDEX IF NOT EXISTS idx_organizations_locality ON organizations(locality);
CREATE INDEX IF NOT EXISTS idx_organizations_branch ON organizations(branch);
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(organization_type);
CREATE INDEX IF NOT EXISTS idx_aliases_org ON organization_aliases(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_org_current ON organization_contacts(organization_id, is_current);
CREATE INDEX IF NOT EXISTS idx_links_org_current ON organization_links(organization_id, is_current);
CREATE INDEX IF NOT EXISTS idx_authorities_org_period ON authority_appointments(organization_id, ended_on);
CREATE INDEX IF NOT EXISTS idx_provenance_entity ON field_provenance(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_changes_entity_time ON change_events(entity_type, entity_id, changed_at DESC);
