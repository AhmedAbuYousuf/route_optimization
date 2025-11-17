-- Employees table
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL
);

-- Jobs table
CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    assigned_employee_id INT REFERENCES employees(id) ON DELETE SET NULL
);

-- Worker statistics table for AI and tracking
CREATE TABLE worker_stats (
    id SERIAL PRIMARY KEY,
    employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
    total_jobs_completed INT DEFAULT 0,
    average_job_duration_minutes DOUBLE PRECISION DEFAULT 0,
    last_job_completed_at TIMESTAMP
);