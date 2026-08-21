-- Migration: lightweight in-app pageview log, feeding the hidden analytics
-- dashboard at /dev/analytics. This complements Google Analytics (GA4) —
-- GA4 is the authoritative, full-featured source; this table just gives a
-- quick in-app glance without needing to log into a separate GA dashboard.

CREATE TABLE IF NOT EXISTS page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path VARCHAR(500) NOT NULL,
    referrer VARCHAR(500),
    session_id VARCHAR(100),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path);
