-- Gym Management SaaS — core schema
-- Multi-tenant: every table that holds gym-specific data carries gym_id.

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

CREATE TABLE gyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) UNIQUE NOT NULL,      -- used for subdomain/routing per client gym
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(150),
    logo_url TEXT,
    brand_primary_color VARCHAR(7),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin','receptionist','trainer','customer')),
    phone VARCHAR(20),
    date_of_birth DATE,
    profile_photo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_gym_id ON users(gym_id);
CREATE INDEX idx_users_role ON users(role);

CREATE TABLE membership_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,          -- e.g. "Monthly", "Quarterly", "Annual + PT"
    duration_days INT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES membership_plans(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','frozen','cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_memberships_user_id ON memberships(user_id);
CREATE INDEX idx_memberships_end_date ON memberships(end_date); -- for renewal-reminder cron

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES memberships(id),
    plan_id UUID REFERENCES membership_plans(id),
    amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(5) DEFAULT 'INR',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed','refunded')),
    gateway VARCHAR(30),                 -- e.g. 'razorpay', 'stripe'
    order_id VARCHAR(150),               -- gateway order id, created before payment completes
    gateway_payment_id VARCHAR(150),     -- id returned by payment gateway once paid, NOT card data
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_user_id ON payments(user_id);

CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    checked_in_at TIMESTAMPTZ DEFAULT NOW(),
    checkin_date DATE DEFAULT CURRENT_DATE NOT NULL, -- plain column so the uniqueness index below doesn't need to cast checked_in_at (timezone-dependent, not allowed in an index)
    method VARCHAR(20) DEFAULT 'self' CHECK (method IN ('qr', 'manual', 'rfid', 'self', 'receptionist')),
    checked_out_at TIMESTAMPTZ,
    checkout_method VARCHAR(20) CHECK (checkout_method IS NULL OR checkout_method IN ('self', 'receptionist', 'auto'))
);

CREATE INDEX idx_attendance_user_id ON attendance(user_id);
CREATE INDEX idx_attendance_checked_in_at ON attendance(checked_in_at);
CREATE UNIQUE INDEX idx_attendance_user_checkin_date ON attendance(user_id, checkin_date);

CREATE TABLE workout_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    trainer_id UUID REFERENCES users(id),
    title VARCHAR(150),
    details JSONB NOT NULL,              -- flexible: days -> exercises -> sets/reps
    goal VARCHAR(20) CHECK (goal IN ('weight_loss', 'weight_gain', 'maintain', 'custom')),
    last_edited_by UUID REFERENCES users(id),
    last_edited_role VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE diet_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    trainer_id UUID REFERENCES users(id),
    title VARCHAR(150),
    details JSONB NOT NULL,              -- meals, calories, macros
    goal VARCHAR(20) CHECK (goal IN ('weight_loss', 'weight_gain', 'maintain', 'custom')),
    last_edited_by UUID REFERENCES users(id),
    last_edited_role VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(40) NOT NULL,           -- e.g. 'RENEWAL_REMINDER', 'PAYMENT_SUCCESS'
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('email','sms','whatsapp','push','in_app')),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID,                       -- not FK-constrained so logs survive user deletion
    actor_role VARCHAR(20),
    action VARCHAR(60) NOT NULL,
    target_type VARCHAR(50),
    target_id UUID,
    metadata JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

CREATE TABLE chatbot_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    question VARCHAR(255) NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(50)
);

CREATE TABLE community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL DEFAULT 'general' CHECK (type IN ('general', 'progress', 'birthday', 'notice')),
    content TEXT NOT NULL,
    image_url TEXT,
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_community_posts_gym_id ON community_posts(gym_id);
CREATE INDEX idx_community_posts_created_at ON community_posts(created_at DESC);

CREATE TABLE community_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_community_comments_post_id ON community_comments(post_id);

CREATE TABLE community_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    image_url TEXT,
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_community_messages_gym_id ON community_messages(gym_id);
CREATE INDEX idx_community_messages_created_at ON community_messages(created_at);

-- Emoji reactions, shared by posts and chat messages via a polymorphic target
-- (no FK on target_id since it can point at either table).
CREATE TABLE community_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type VARCHAR(10) NOT NULL CHECK (target_type IN ('post', 'message')),
    target_id UUID NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(8) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (target_type, target_id, user_id)
);

CREATE INDEX idx_community_reactions_target ON community_reactions(target_type, target_id);

CREATE TABLE bmi_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    height_cm NUMERIC(5,1) NOT NULL,
    weight_kg NUMERIC(5,1) NOT NULL,
    bmi NUMERIC(4,1) NOT NULL,
    category VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bmi_logs_user_id ON bmi_logs(user_id);

CREATE TABLE progress_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    weight_kg NUMERIC(5,1),
    notes TEXT,
    photo_url TEXT,
    diet_notes TEXT,
    diet_checklist JSONB DEFAULT '[]',
    workout_notes TEXT,
    workout_checklist JSONB DEFAULT '[]',
    water_ml INTEGER,
    mood SMALLINT CHECK (mood IS NULL OR mood BETWEEN 1 AND 5),
    waist_cm NUMERIC(5,1),
    chest_cm NUMERIC(5,1),
    arms_cm NUMERIC(5,1),
    hips_cm NUMERIC(5,1),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, log_date)
);

CREATE INDEX idx_progress_logs_user_date ON progress_logs(user_id, log_date);

-- One editable daily water intake goal per member.
CREATE TABLE progress_water_goals (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    daily_goal_ml INTEGER NOT NULL DEFAULT 2500 CHECK (daily_goal_ml > 0 AND daily_goal_ml <= 10000),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- One active goal per member — what they're working toward, powers the
-- progress-toward-goal bar on the Progress Tracker dashboard.
CREATE TABLE progress_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    goal_type VARCHAR(20) NOT NULL CHECK (goal_type IN ('lose', 'gain', 'maintain')),
    starting_weight_kg NUMERIC(5,2),
    target_weight_kg NUMERIC(5,2),
    target_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE equipment (
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

CREATE INDEX idx_equipment_gym_id ON equipment(gym_id);
CREATE INDEX idx_equipment_status ON equipment(status);

CREATE TABLE page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path VARCHAR(500) NOT NULL,
    referrer VARCHAR(500),
    session_id VARCHAR(100),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_page_views_created_at ON page_views(created_at);
CREATE INDEX idx_page_views_path ON page_views(path);
