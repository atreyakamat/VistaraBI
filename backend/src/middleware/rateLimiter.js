import rateLimit from 'express-rate-limit'

/**
 * General API rate limiter
 * Limits: 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes'
  },
  // Skip rate limiting for health check endpoint
  skip: (req) => req.path === '/api/health'
})

/**
 * Strict rate limiter for upload endpoints
 * Limits: 10 uploads per 15 minutes per IP
 */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 upload requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many upload requests from this IP, please try again after 15 minutes'
  }
})

/**
 * Strict rate limiter for data processing endpoints
 * Limits: 20 requests per 15 minutes per IP
 */
export const processingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 processing requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many processing requests from this IP, please try again after 15 minutes'
  }
})

/**
 * Very strict rate limiter for expensive operations
 * Limits: 5 requests per hour per IP
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests for this resource, please try again after an hour'
  }
})
