import { INestApplication, ValidationPipe } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ApiExceptionFilter } from './common/api-exception.filter';

export function configureApp(app: INestApplication) {
  // Production API is reachable only through one reverse-proxy hop in Compose.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cookieParser());
  app.use((req: any, res: any, next: () => void) => {
    req.requestId = randomUUID();
    res.setHeader('x-request-id', req.requestId);
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const allowed = process.env.CORS_ORIGIN || 'http://localhost:5173';
      if (
        (req.headers.origin && req.headers.origin !== allowed) ||
        req.headers['sec-fetch-site'] === 'cross-site'
      )
        return res.status(403).json({ message: 'Origin not allowed', requestId: req.requestId });
      if (!req.is('application/json'))
        return res
          .status(415)
          .json({ message: 'Use application/json for write requests.', requestId: req.requestId });
    }
    next();
  });
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Request-Id', 'Idempotency-Key'],
  });
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
}
