const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');
const seedDemoData = require('./config/seeder');

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Initialize Database connection & seed data
const initApp = async () => {
  await connectDB();
  await seedDemoData();
};
initApp();

// Serve public static assets
app.use(express.static(path.join(__dirname, 'public')));

// Mount API routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tenants', require('./routes/tenantRoutes'));
app.use('/api/bills', require('./routes/billRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// Fallback for SPA navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n=============================================================`);
  console.log(`Server started successfully on port ${PORT}`);
  console.log(`Access the application: http://localhost:${PORT}`);
  console.log(`Default Seed Account: landlord@example.com / password123`);
  console.log(`=============================================================\n`);
});
