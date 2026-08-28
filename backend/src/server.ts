import path from 'path';
import dotenv from 'dotenv';
import http from 'http';
import express, { Express } from 'express';
import cors from 'cors';

// 1. Load environment variables using dotenv
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // 2. Import Sequelize instance from ./config/database
    const { default: sequelize } = await import('./config/database');

    // 3. Import model association setup from ./models/Associations
    await import('./models/Associations');

    // 4. Authenticate Sequelize database connection
    await sequelize.authenticate();
    console.log('Database connection authenticated successfully.');

    // 5. Initialize Express application, CORS & JSON middleware
    const app: Express = express();
    app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
    app.use(express.json());

    // 6. Register Auth, Profile, Job & Application routes
    const { default: authRoutes } = await import('./routes/authRoutes');
    const { default: profileRoutes } = await import('./routes/profileRoutes');
    const { default: jobRoutes } = await import('./routes/jobRoutes');
    const { default: applicationRoutes } = await import('./routes/applicationRoutes');
    app.use('/api/auth', authRoutes);
    app.use('/api/profiles', profileRoutes);
    app.use('/api/jobs', jobRoutes);
    app.use('/api/applications', applicationRoutes);

    // Health check route
    app.get('/', (req, res) => {
      res.json({ status: 'ok', message: 'Backend service is running' });
    });

    // 7. Start basic HTTP server
    const server = http.createServer(app);

    // 8. Listen on PORT and print server URL
    server.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
}

startServer();
