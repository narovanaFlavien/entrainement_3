import express from 'express';
import cors from 'cors';
import { config } from "dotenv";
import session from 'express-session';
import { sessionConfig } from './config/session.config.js';
import utilisateursRoutes from './Routes/utilisateursRoute.js';
import * as models from './models/index.js'; // Vos modèles Sequelize

config()
const PORT = process.env.SERVER_PORT;
const app = express()

app.use(cors());
app.use(express.urlencoded())
app.use(express.json())
app.use("/uploads", express.static("uploads"));

app.use(session(sessionConfig));
// Rendre les modèles accessibles dans toute l'application
app.set('models', models);

// Routes
app.use('/api/utilisateurs', utilisateursRoutes(models));

app.listen(PORT, ()=> console.log(`Server is running on port ${PORT}`))