
import { Request, Response, NextFunction } from 'express';
import { AppError } from './errors';

export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || '';
  if (process.env.NODE_ENV !== 'test') {
    console.error('[ERROR]', { requestId, message: err?.message, stack: err?.stack });
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId
      }
    });
  }
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      requestId
    }
  });
};
