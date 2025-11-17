CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password VARCHAR(200) NOT NULL,
    role VARCHAR(20) DEFAULT 'worker' -- 'worker' or 'admin'
);