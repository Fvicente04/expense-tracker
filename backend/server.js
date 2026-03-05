require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');

const app = express();

/**
 * Normaliza URL:
 * - remove barra final
 * - garante string válida
 */
function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  return url.trim().replace(/\/+$/, '');
}

/**
 * Lista de origens permitidas:
 * - CLIENT_URL do Railway
 * - localhost dev
 * - qualquer subdomínio do Railway (pra não quebrar quando mudar deploy)
 * - (opcional) seu domínio custom quando comprar
 */
const allowedOrigins = new Set(
  [
    normalizeUrl(process.env.CLIENT_URL),
    'http://localhost:4200',
    'http://localhost:5173',
    'http://localhost:3000',
    // adicione aqui quando tiver domínio:
    // 'https://budgetflowapp.com',
  ].filter(Boolean)
);

function isAllowedOrigin(origin) {
  if (!origin) return true; // Postman/cURL/Server-to-server (sem Origin)
  const o = normalizeUrl(origin);

  // Permite os que estão na lista
  if (allowedOrigins.has(o)) return true;

  // Permite qualquer deploy do Railway
  // Ex: https://abundant-joy-production-6422.up.railway.app
  if (/^https:\/\/.*\.up\.railway\.app$/i.test(o)) return true;

  return false;
}

app.use(
  cors({
    origin: (origin, cb) => {
      if (isAllowedOrigin(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// garante preflight em todas as rotas
app.options('*', cors());

app.use(express.json());

// Rotas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/reports', require('./routes/reports'));

app.get('/api', (req, res) => {
  res.json({ message: 'BudgetFlow API is running' });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

const PORT = Number(process.env.PORT) || 5000;

async function start() {
  try {
    if (process.env.NODE_ENV !== 'test') {
      await sequelize.authenticate();
      console.log('PostgreSQL connection established successfully');

      await sequelize.sync({ alter: true });
      console.log('Database tables synchronized');
    }

    // Railway precisa 0.0.0.0
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`CLIENT_URL: ${process.env.CLIENT_URL || '(not set)'}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
}

start();

module.exports = app;