# Quick Start - PostgreSQL Backend

## Getting Started

Choose one of the following setup options:

---

## Option 1: Cloud PostgreSQL (Recommended)

No local installation required.

### Railway Setup

1. Visit https://railway.app/
2. Sign up with GitHub
3. Create new project
4. Select "Provision PostgreSQL"
5. Copy the DATABASE_URL from the connection settings

### Backend Configuration:
```bash
cd backend-postgresql
npm install
cp .env.example .env
```

Configure `.env`:
```bash
DATABASE_URL=postgresql://postgres:password@containers-us-west-123.railway.app:5432/railway
JWT_SECRET=your-secret-key-min-32-chars
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:4200
```

Start server:
```bash
npm run dev
```

---

## Option 2: Local PostgreSQL

### Installation

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**  
Download from https://www.postgresql.org/download/windows/

### Database Setup:
```bash
psql postgres
```
```sql
CREATE DATABASE expense_tracker;
\q
```

### Backend Configuration:
```bash
cd backend-postgresql
npm install
cp .env.example .env
```

Configure `.env`:
```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/expense_tracker
JWT_SECRET=your-secret-key-min-32-chars
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:4200
```

Start server:
```bash
npm run dev
```

---

## Option 3: Docker
```bash
docker run -d \
  --name postgres-expense \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=expense_tracker \
  -p 5432:5432 \
  postgres:14
```

Follow Option 2 backend configuration.

---

## Verification

### Health Check:
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "Expense Tracker API with PostgreSQL is running",
  "database": "PostgreSQL"
}
```

### Test Registration:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@test.com",
    "password": "123456"
  }'
```

---

## Database Management

### Command Line (psql):
```bash
psql -U postgres -d expense_tracker
```

Common commands:
```sql
\dt              -- List tables
SELECT * FROM users;
\q               -- Exit
```

### GUI Tools:

- pgAdmin: https://www.pgadmin.org/
- DBeaver: https://dbeaver.io/

---

## Troubleshooting

### Connection Refused

Start PostgreSQL:
```bash
# macOS
brew services start postgresql@14

# Ubuntu
sudo systemctl start postgresql
```

### Authentication Failed

Reset password:
```bash
sudo -u postgres psql
ALTER USER postgres PASSWORD 'newpassword';
\q
```

Update `.env` with new password.

### Tables Not Created

Check server console for errors. Tables are created automatically via `sequelize.sync()`.

---

## Database Schema

The application creates four tables:

- **users** - User accounts
- **categories** - Income/Expense categories
- **transactions** - Financial transactions
- **budgets** - Monthly budget limits

Verify with: `psql -U postgres -d expense_tracker -c "\dt"`

---

## Next Steps

1. Verify backend is running
2. Setup Angular frontend
3. Connect frontend to backend
4. Configure additional features

Refer to README.md for detailed documentation.