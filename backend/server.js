require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/reports', require('./routes/reports'));

app.get('/api', (req, res) => {
  res.json({ message: 'Expense Tracker API is running' });
});

const PORT = process.env.PORT || 5000;

sequelize.authenticate()
  .then(() => {
    console.log('PostgreSQL connection established successfully');
    return sequelize.sync({ alter: true });
  })
  .then(() => {
    console.log('Database tables synchronized');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('Database: PostgreSQL');
      console.log(`API: http://localhost:${PORT}/api`);
    });
  })
  .catch((error) => {
    console.error('Unable to connect to the database:', error);
  });

module.exports = app;