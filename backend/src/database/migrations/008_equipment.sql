-- Migration: gym equipment inventory + maintenance tracking (admin/receptionist).

CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(60),
    status VARCHAR(20) NOT NULL DEFAULT 'operational'
      CHECK (status IN ('operational', 'under_maintenance', 'out_of_service')),
    purchase_date DATE,
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipment_gym_id ON equipment(gym_id);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
