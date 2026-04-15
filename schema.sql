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

-- Index for faster lookups by email or role if needed
CREATE INDEX idx_email ON contact_submissions(email);
CREATE INDEX idx_role ON contact_submissions(role);
