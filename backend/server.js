require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL,          
  'http://localhost:4200',         
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json());


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

   
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('Database: PostgreSQL');
      console.log(`API: /api`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
}

start();

module.exports = app;