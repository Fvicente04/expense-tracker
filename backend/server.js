require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');

const app = express();

/**
 * CORS
 * - Em produção, libere apenas o domínio do frontend (CLIENT_URL)
 * - Em dev, libere localhost:4200
 */
const allowedOrigins = [
  process.env.CLIENT_URL,          // ex: https://expense-tracker-production-f359.up.railway.app
  'http://localhost:4200'
].filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    // Permite requests sem origin (health checks, curl, Postman, etc.)
    if (!origin) return cb(null, true);

    if (allowedOrigins.includes(origin)) return cb(null, true);

    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Responder preflight (OPTIONS) para todas as rotas
app.options('*', cors(corsOptions));

app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/reports', require('./routes/reports'));

// Health / Root
app.get('/api', (req, res) => {
  res.json({ message: 'BudgetFlow API is running' });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Port (Railway fornece PORT)
const PORT = Number(process.env.PORT) || 5000;

async function start() {
  try {
    if (process.env.NODE_ENV !== 'test') {
      await sequelize.authenticate();
      console.log('PostgreSQL connection established successfully');

      await sequelize.sync({ alter: true });
      console.log('Database tables synchronized');
    }

    // IMPORTANTE: 0.0.0.0 para aceitar conexões externas no Railway
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('Database: PostgreSQL');
      console.log('API: /api');
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
}

start();

module.exports = app;