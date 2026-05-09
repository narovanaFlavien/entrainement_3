// config/session.config.js
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pg from 'pg';
import { config } from 'dotenv';

config();

// Créer un pool pg simple pour les sessions
const pool = new pg.Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '1234',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'entrainement',
  max: 10,
  idleTimeoutMillis: 10000,
});

const PgSession = connectPgSimple(session);

export const sessionConfig = {
  store: new PgSession({
    pool: pool,
    tableName: 'Session',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || 'dev_secret_change_me_2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 jours
    sameSite: 'lax',
  },
  name: 'sessionId',
};

export default sessionConfig;