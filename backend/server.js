require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { sequelize } = require('./models');

const app = express();
app.set('etag', false);
// Railway terminates TLS at its proxy; without this, express-rate-limit
// would key every request by the proxy IP instead of the real client
app.set('trust proxy', 1);
app.use(helmet());

function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  return url.trim().replace(/\/+$/, '');
}

const allowedOrigins = new Set(
  [
    normalizeUrl(process.env.CLIENT_URL),
    'http://localhost:4200',
    'http://localhost:5173',
    'http://localhost:3000',
  ].filter(Boolean)
);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  const o = normalizeUrl(origin);

  return allowedOrigins.has(o);
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

app.options('*', cors());

app.use(express.json());

// Disable HTTP caching for all API responses so filters always reflect fresh data
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts, please try again later' }
});

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/goals',   require('./routes/goals'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/credit-cards', require('./routes/creditCards'));
app.use('/api/bank', require('./routes/bank'));
app.use('/api/category-rules', require('./routes/categoryRules'));

app.get('/api', (req, res) => {
  res.json({ message: 'BudgetFlow API is running' });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

const PORT = Number(process.env.PORT) || 5000;

async function start() {
  try {
    if (process.env.NODE_ENV === 'test') return;

    await sequelize.authenticate();
    console.log('PostgreSQL connection established successfully');

    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('Database tables synchronized');
    } else {
      console.log('Production: skipping auto-sync — run npm run db:migrate before starting');
    }

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
