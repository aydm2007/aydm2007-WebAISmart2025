import express from 'express';
import dotenv from 'dotenv';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import pythonProxy from './routes/python_proxy';
import exportRoutes from './routes/export';
import chatRouter from './routes/chat';
import analysisRouter from './routes/analysis';
import historyRouter from './routes/history';
import sqlRouter from './routes/sql';
import settingsRouter from './routes/settings';
import metaRouter from './routes/meta';
import companiesRouter from './routes/companies';
import { errorHandler } from './utils/errorHandler';
import { initializeDatabase } from './db/schema';

dotenv.config();

export function createApp() {
  const app = express();

  // تهيئة قاعدة البيانات المالية
  try {
    initializeDatabase();
    console.log('✅ Financial database initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
  }

  // خلف عكوس/حاويات
  app.set('trust proxy', 1);

  // السماح بالمصدر الأمامي (افتراضيًا: http://localhost:3000). يمكن تمرير عدة أصول مفصولة بفواصل.
  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const corsOptions: CorsOptions = {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
    credentials: false,
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions)); // دعم الـPreflight للـPOST

  // Helmet مضبوط للوضع التطويري (CSP معطل لتسهيل الاتصال عبر SSE بين المنافذ)
  app.use(
    helmet({
      contentSecurityPolicy: false, // فعّل سياسة أدق بالإنتاج
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  app.use(express.json({ limit: '2mb' }));

  // requestId + تسجيل زمني
  app.use((req: any, res, next) => {
    const start = Date.now();
    const id = Math.random().toString(36).slice(2);
    req.requestId = id;
    res.setHeader('x-request-id', id);
    res.on('finish', () => {
      const log = {
        ts: new Date().toISOString(),
        id,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        ms: Date.now() - start,
      };
      console.log(JSON.stringify(log));
    });
    next();
  });

  // حد المعدل
  const limiter = rateLimit({
    windowMs: 60_000,
    max: Number(process.env.RATE_LIMIT_MAX || 120),
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // صحة
  app.get('/healthz', (_req, res) => res.json({ ok: true }));

  // الراوترات
  app.use('/api/chat', chatRouter);
  app.use('/api/analysis', analysisRouter);
  app.use('/api/history', historyRouter);
  app.use('/api/sql', sqlRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/meta', metaRouter);
  app.use('/api/companies', companiesRouter);
  app.use('/api/financial-data', companiesRouter);
  app.use('/api/kpis', companiesRouter);
  app.use('/api/dashboard', companiesRouter);
  app.use('/export', exportRoutes);
  app.use('/python', pythonProxy);

  // معالج أخطاء أخير
  app.use(errorHandler);

  return app;
}
