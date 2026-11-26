// Import the express module
const express = require('express');
// Import the mysql module
const mysql = require('mysql2');
// Node's built-in crypto, used for password hashing (no extra dependency)
const crypto = require('crypto');

// Create the express app
const app = express();

// Database settings come from environment variables, never from the code
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'demoapp',
};
if (!dbConfig.user || dbConfig.password === undefined) {
  console.error('Set DB_USER and DB_PASSWORD environment variables');
  process.exit(1);
}

// Create the connection to the database
const connection = mysql.createConnection(dbConfig);
connection.connect(function (err) {
  if (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }
  console.log('Connected!');
});

// Hash a password with scrypt. Output format: "salt:hash" (hex)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

// Compare a password against a stored "salt:hash" value in constant time
function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = crypto.scryptSync(password, salt, expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

// Use the express.json() middleware to parse the request body
app.use(express.json());

// Simple GET request handler
app.get('/', (req, res) => {
  res.send('Testing!');
});

// Allow CORS to all
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'OPTIONS, GET, POST, PUT, PATCH, DELETE' // what matters here is that OPTIONS is present
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Post request handler to add a new employee to the database
app.post('/add-employee', (req, res) => {
  const { first_name, last_name, email, password } = req.body || {};
  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ status: 'failure', message: 'All fields are required' });
  }
  const sql = 'INSERT INTO employee_test (first_name, last_name, email, password) VALUES (?, ?, ?, ?)';
  connection.query(sql, [first_name, last_name, email, hashPassword(password)], function (err) {
    if (err) {
      console.error('Insert failed:', err.message);
      return res.status(500).json({ status: 'failure', message: 'Could not add employee' });
    }
    res.status(200).json({ status: 'success', message: 'Employee added succesfully' });
  });
});

// Post request handler to log an employee in at /login
app.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ status: 'failure', message: 'Email and password are required' });
  }
  // Look up by email only, then check the password hash in code
  const sql = 'SELECT password FROM employee_test WHERE email = ?';
  connection.query(sql, [email], function (err, rows) {
    if (err) {
      console.error('Login query failed:', err.message);
      return res.status(500).json({ status: 'failure', message: 'Login failed' });
    }
    const ok = rows.length > 0 && verifyPassword(password, rows[0].password);
    res.status(200).json(
      ok
        ? { status: 'success', message: 'Login successful' }
        : { status: 'failure', message: 'Login failed' }
    );
  });
});

// Set up the port to listen to
const port = 4000;
app.listen(port, () => console.log(`Listening on port ${port}`));
