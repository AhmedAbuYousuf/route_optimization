CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION
);

CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    type VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    assigned_employee_id INT REFERENCES employees(id)
);