# Expense Tracker - Backend API (PostgreSQL)

Personal Finance Management System Backend API built with Express.js and PostgreSQL.

## Why PostgreSQL?

- Relational data structure suitable for financial transactions
- ACID compliance for data integrity
- Efficient SQL queries for complex financial reports
- Industry standard for finance applications
- Strong analytics capabilities for charts and statistics

---

## Quick Start

### Prerequisites

- Node.js 20.x or higher
- PostgreSQL 14.x or higher (local or cloud)
- npm or yarn

### Option 1: Local PostgreSQL Setup

#### Install PostgreSQL

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download from https://www.postgresql.org/download/windows/

#### Create Database
```bash
psql postgres
```
```sql
CREATE DATABASE expense_tracker;
CREATE USER expense_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE expense_tracker TO expense_user;
\q
```

### Option 2: Cloud PostgreSQL

**Railway:**
1. Visit https://railway.app/
2. Sign up with GitHub
3. Create new project and select PostgreSQL
4. Copy the DATABASE_URL

**Supabase:**
1. Visit https://supabase.com/
2. Create new project
3. Navigate to Settings > Database > Connection string
4. Copy the URI

**Neon:**
1. Visit https://neon.tech/
2. Create project
3. Copy connection string

---

## Installation
```bash
cd backend-postgresql
npm install
cp .env.example .env
```

### Configure .env

**Local PostgreSQL:**
```bash
PORT=5000
NODE_ENV=development

DATABASE_URL=postgresql://postgres:password@localhost:5432/expense_tracker

# Alternative individual parameters
DB_HOST=localhost
DB_PORT=5432
DB_NAME=expense_tracker
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=change-this-to-a-very-long-random-string-min-32-characters
JWT_EXPIRE=7d

CLIENT_URL=http://localhost:4200
```

**Cloud PostgreSQL:**
```bash
PORT=5000
NODE_ENV=development

DATABASE_URL=postgresql://user:pass@host.railway.app:5432/railway

JWT_SECRET=change-this-to-a-very-long-random-string-min-32-characters
JWT_EXPIRE=7d

CLIENT_URL=http://localhost:4200
```

---

## Run the Server
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

Expected console output:
```
PostgreSQL connection established successfully
Database tables synchronized
Server running on port 5000
Environment: development
Database: PostgreSQL
```

---

## Test the API

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@test.com",
    "password": "123456",
    "currency": "EUR"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@test.com",
    "password": "123456"
  }'
```

### Get Current User (Protected)
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Database Schema

### Tables
```sql
users
├── id (UUID, primary key)
├── name (VARCHAR 50)
├── email (VARCHAR 100, unique)
├── password (VARCHAR, hashed)
├── currency (ENUM: EUR, USD, GBP, BRL)
├── created_at
└── updated_at

categories
├── id (UUID, primary key)
├── user_id (UUID, foreign key → users.id)
├── name (VARCHAR 50)
├── type (ENUM: income, expense)
├── icon (VARCHAR 10)
├── color (VARCHAR 7)
├── is_default (BOOLEAN)
├── created_at
└── updated_at

transactions
├── id (UUID, primary key)
├── user_id (UUID, foreign key → users.id)
├── category_id (UUID, foreign key → categories.id)
├── type (ENUM: income, expense)
├── amount (DECIMAL 10,2)
├── description (VARCHAR 200)
├── date (DATE)
├── notes (TEXT)
├── created_at
└── updated_at

budgets
├── id (UUID, primary key)
├── user_id (UUID, foreign key → users.id)
├── category_id (UUID, foreign key → categories.id)
├── amount (DECIMAL 10,2)
├── month (INTEGER 1-12)
├── year (INTEGER)
├── spent (DECIMAL 10,2)
├── created_at
└── updated_at
```

### Relationships
```
User (1) ──┬── (N) Categories
           ├── (N) Transactions
           └── (N) Budgets

Category (1) ──┬── (N) Transactions
               └── (N) Budgets
```

---

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login user | Public |
| GET | `/api/auth/me` | Get current user | Private |

### Transactions

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/transactions` | Get all transactions | Private |
| POST | `/api/transactions` | Create transaction | Private |
| GET | `/api/transactions/:id` | Get single transaction | Private |
| PUT | `/api/transactions/:id` | Update transaction | Private |
| DELETE | `/api/transactions/:id` | Delete transaction | Private |

### Categories

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/categories` | Get all categories | Private |
| POST | `/api/categories` | Create category | Private |
| PUT | `/api/categories/:id` | Update category | Private |
| DELETE | `/api/categories/:id` | Delete category | Private |

### Budgets

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/budgets` | Get all budgets | Private |
| POST | `/api/budgets` | Create budget | Private |
| PUT | `/api/budgets/:id` | Update budget | Private |
| DELETE | `/api/budgets/:id` | Delete budget | Private |

---

## Technologies

- Express.js - Web framework
- PostgreSQL - Relational database
- Sequelize - ORM (Object-Relational Mapping)
- JWT - Authentication
- bcryptjs - Password hashing
- dotenv - Environment variables
- cors - Cross-origin requests

---

## Project Structure
```
backend-postgresql/
├── server.js              # Express server
├── package.json           # Dependencies
├── .env.example           # Environment template
├── .gitignore            # Git ignore rules
│
├── config/
│   └── database.js       # PostgreSQL + Sequelize config
│
├── models/
│   ├── index.js          # Model relationships
│   ├── User.js           # User model
│   ├── Category.js       # Category model
│   ├── Transaction.js    # Transaction model
│   └── Budget.js         # Budget model
│
├── controllers/
│   ├── authController.js      # Auth logic
│   ├── categoryController.js  # Category logic
│   ├── transactionController.js # Transaction logic
│   └── budgetController.js    # Budget logic
│
├── routes/
│   ├── auth.js           # Auth routes
│   ├── categories.js     # Category routes
│   ├── transactions.js   # Transaction routes
│   └── budgets.js        # Budget routes
│
└── middleware/
    └── auth.js           # JWT middleware
```

---

## View Database

### Using psql (command line)
```bash
# Connect to database
psql -U postgres -d expense_tracker

# List tables
\dt

# View users
SELECT * FROM users;

# View schema
\d users

# Exit
\q
```

### Using GUI Tools

- pgAdmin (official): https://www.pgadmin.org/
- DBeaver (multi-database): https://dbeaver.io/
- TablePlus (commercial): https://tableplus.com/

---

## Troubleshooting

### PostgreSQL not connecting
```bash
# Check if PostgreSQL is running
pg_isready

# Check service status
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql
```

### Password authentication failed
```bash
# Reset PostgreSQL password
sudo -u postgres psql
ALTER USER postgres PASSWORD 'newpassword';
\q
```

### Tables not created

Tables are created automatically on startup via `sequelize.sync()`. Check console output for errors.

### Port 5000 already in use

Change PORT in `.env` to another port (e.g., 3000 or 8000).

---

## Useful SQL Queries
```sql
-- Count users
SELECT COUNT(*) FROM users;

-- Get all transactions for a user
SELECT t.*, c.name as category_name
FROM transactions t
JOIN categories c ON t.category_id = c.id
WHERE t.user_id = 'user-uuid-here'
ORDER BY t.date DESC;

-- Total expenses by category
SELECT c.name, SUM(t.amount) as total
FROM transactions t
JOIN categories c ON t.category_id = c.id
WHERE t.user_id = 'user-uuid' AND t.type = 'expense'
GROUP BY c.name
ORDER BY total DESC;

-- Monthly spending
SELECT 
  DATE_TRUNC('month', date) as month,
  SUM(amount) as total
FROM transactions
WHERE user_id = 'user-uuid' AND type = 'expense'
GROUP BY month
ORDER BY month DESC;
```

---

## Technical Rationale

PostgreSQL was selected for this project due to:
1. Inherently relational nature of financial data
2. ACID compliance ensuring data integrity
3. SQL query capabilities for complex financial reports
4. Industry adoption in financial applications
5. Strong analytics support for reporting features

---

## Author

Felipe Costa  
Student ID: 20002814  
BSc Computing (Software Development)  
Dublin Business School

Supervisor: Jaroslaw Woznica