ALTER TABLE organizations ADD COLUMN catalog_number TEXT;
ALTER TABLE organizations ADD COLUMN source_record_id TEXT;
ALTER TABLE organizations ADD COLUMN source_hierarchy_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE organizations ADD COLUMN missing_fields_json TEXT NOT NULL DEFAULT '[]';
