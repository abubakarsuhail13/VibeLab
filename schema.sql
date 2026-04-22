-- SQL Script to create the VibeLab Contact Submissions table
-- Use this in your Hostinger MySQL Database (phpMyAdmin or similar)

CREATE TABLE IF NOT EXISTS contact_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    organization VARCHAR(255),
    role VARCHAR(100) NOT NULL,
    interest_type VARCHAR(50),
    message TEXT NOT NULL,
    source VARCHAR(100) DEFAULT 'vibelab_landing_v1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS waitlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    source VARCHAR(100) DEFAULT 'vibelab_landing_v1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX idx_waitlist_email ON waitlist(email);
