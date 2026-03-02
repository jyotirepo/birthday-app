const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres-service',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'employeedb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
});

// Init DB
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        department VARCHAR(100),
        position VARCHAR(100),
        dob DATE NOT NULL,
        email VARCHAR(150),
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Database initialized');
  } catch (err) {
    console.error('DB init error:', err);
    setTimeout(initDB, 3000);
  }
}

initDB();

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Get all employees
app.get('/api/employees', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *, 
        TO_CHAR(dob, 'Month DD') as birthday_display,
        EXTRACT(MONTH FROM dob) as birth_month,
        EXTRACT(DAY FROM dob) as birth_day,
        DATE_PART('year', AGE(dob)) as age
      FROM employees ORDER BY EXTRACT(MONTH FROM dob), EXTRACT(DAY FROM dob)
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single employee
app.get('/api/employees/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *, DATE_PART('year', AGE(dob)) as age FROM employees WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create employee
app.post('/api/employees', async (req, res) => {
  const { name, department, position, dob, email, phone } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO employees (name, department, position, dob, email, phone)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, department, position, dob, email, phone]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update employee
app.put('/api/employees/:id', async (req, res) => {
  const { name, department, position, dob, email, phone } = req.body;
  try {
    const result = await pool.query(
      `UPDATE employees SET name=$1, department=$2, position=$3, dob=$4, email=$5, phone=$6
       WHERE id=$7 RETURNING *`,
      [name, department, position, dob, email, phone, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete employee
app.delete('/api/employees/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM employees WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get upcoming birthdays
app.get('/api/birthdays/upcoming', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *,
        DATE_PART('year', AGE(dob)) as age,
        TO_CHAR(dob, 'Month DD') as birthday_display,
        (DATE_TRUNC('year', CURRENT_DATE) + (dob - DATE_TRUNC('year', dob))
          + CASE WHEN (dob - DATE_TRUNC('year', dob)) < (CURRENT_DATE - DATE_TRUNC('year', CURRENT_DATE))
            THEN INTERVAL '1 year' ELSE INTERVAL '0' END
        ) - CURRENT_DATE as days_until
      FROM employees
      WHERE (DATE_TRUNC('year', CURRENT_DATE) + (dob - DATE_TRUNC('year', dob))
          + CASE WHEN (dob - DATE_TRUNC('year', dob)) < (CURRENT_DATE - DATE_TRUNC('year', CURRENT_DATE))
            THEN INTERVAL '1 year' ELSE INTERVAL '0' END
        ) - CURRENT_DATE BETWEEN 0 AND 30
      ORDER BY days_until
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log('Backend running on port 3001'));
