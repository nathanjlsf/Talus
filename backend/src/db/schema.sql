PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT,
    description TEXT,
    distance_miles REAL NOT NULL,
    estimated_time_minutes INTEGER NOT NULL,
    elevation_gain_feet INTEGER NOT NULL,
    elevation_status TEXT NOT NULL DEFAULT 'pending',
    elevation_attempts INTEGER NOT NULL DEFAULT 0,
    elevation_error TEXT,
    difficulty TEXT NOT NULL,
    terrain TEXT NOT NULL,
    scenic_score REAL,
    nature_score REAL,
    solitude_score REAL,
    water_score REAL,
    source TEXT,
    source_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trail_geometry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trail_id INTEGER NOT NULL,
    way_id INTEGER NOT NULL,
    sequence INTEGER NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,

    FOREIGN KEY (trail_id) REFERENCES trails(id) ON DELETE CASCADE,

    UNIQUE(trail_id, way_id, sequence)
);

CREATE TABLE IF NOT EXISTS elevation_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    elevation_feet REAL NOT NULL,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(latitude, longitude)
);

CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    trail_id INTEGER NOT NULL,

    started_at TEXT,
    ended_at TEXT,

    distance_miles REAL,
    elevation_gain_feet INTEGER,
    duration_seconds INTEGER,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (trail_id) REFERENCES trails(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS experiences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id INTEGER NOT NULL UNIQUE,

    overall_rating INTEGER NOT NULL,
    scenic_rating INTEGER,
    difficulty_rating INTEGER,
    solitude_rating INTEGER,

    notes TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS preference_comparisons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,

    winner_trail_id INTEGER NOT NULL,
    loser_trail_id INTEGER NOT NULL,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (winner_trail_id) REFERENCES trails(id) ON DELETE CASCADE,
    FOREIGN KEY (loser_trail_id) REFERENCES trails(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    attribute TEXT NOT NULL,

    score REAL NOT NULL DEFAULT 0,
    confidence REAL NOT NULL DEFAULT 0,

    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, attribute),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);