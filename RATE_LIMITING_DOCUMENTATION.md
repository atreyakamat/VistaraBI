# Rate Limiting Security Enhancement

## Overview

This document describes the rate limiting implementation added to the VistaraBI backend API to protect against abuse, brute force attacks, and DoS attacks.

## Implementation Details

### Package Used
- **express-rate-limit** v7.x - Industry-standard rate limiting middleware for Express applications

### Rate Limiting Tiers

The API implements multiple tiers of rate limiting based on endpoint sensitivity and resource usage:

#### 1. General API Rate Limiter
- **Limit:** 100 requests per 15 minutes per IP address
- **Applied to:** All `/api/*` endpoints (except those with specific limiters)
- **Use case:** General API protection
- **Routes affected:**
  - `/api/dashboard`
  - `/api/projects`
  - `/api/test`
  - Other general API endpoints

#### 2. Upload Rate Limiter (Strict)
- **Limit:** 10 requests per 15 minutes per IP address
- **Applied to:** `/api/v1/upload`
- **Use case:** Prevent upload abuse and resource exhaustion
- **Rationale:** File uploads are resource-intensive operations

#### 3. Processing Rate Limiter
- **Limit:** 20 requests per 15 minutes per IP address
- **Applied to:**
  - `/api/v1/clean` - Data cleaning operations
  - `/api/v1/domain` - Domain detection
  - `/api/v1/kpi` - KPI extraction
- **Use case:** Protect CPU-intensive data processing operations
- **Rationale:** These endpoints perform complex computations

#### 4. Strict Rate Limiter (Available for future use)
- **Limit:** 5 requests per hour per IP address
- **Applied to:** Currently not applied, available for very expensive operations
- **Use case:** Extremely resource-intensive operations
- **Example use cases:** AI model inference, large-scale exports, bulk operations

### Excluded Endpoints
- `/api/health` - Health check endpoint is excluded from rate limiting to allow monitoring systems to check service status freely

## Response Headers

When rate limiting is active, the following headers are included in responses:

- `RateLimit-Limit` - Maximum number of requests allowed in the time window
- `RateLimit-Remaining` - Number of requests remaining in current window
- `RateLimit-Reset` - Timestamp when the rate limit window resets

### Rate Limit Exceeded Response

When a client exceeds the rate limit, they receive:

**Status Code:** `429 Too Many Requests`

**Response Body:**
```json
{
  "error": "Too many requests from this IP, please try again after 15 minutes"
}
```

Different error messages are provided for different limiters:
- Upload limiter: "Too many upload requests from this IP, please try again after 15 minutes"
- Processing limiter: "Too many processing requests from this IP, please try again after 15 minutes"
- Strict limiter: "Too many requests for this resource, please try again after an hour"

## Configuration Files

### Middleware Configuration
**File:** `backend/src/middleware/rateLimiter.js`

Contains the configuration for all rate limiting tiers. Each limiter can be individually adjusted by modifying:
- `windowMs` - Time window in milliseconds
- `max` - Maximum number of requests allowed in the window
- `message` - Custom error message

### Server Integration
**File:** `backend/src/server.js`

Rate limiters are applied in the middleware chain before route handlers:
1. General limiter applied to all `/api/` routes
2. Specific limiters applied to individual route groups
3. Order matters - more specific limiters override general ones

## Testing

### Manual Testing

Run the test script to verify rate limiting is working:

```bash
cd backend
node test-rate-limiting.js
```

This script tests:
- Health endpoint is not rate limited
- General endpoints have rate limiting headers
- Rate limit enforcement works correctly

### Testing Rate Limit Behavior

To test rate limiting in development:

1. Start the backend server:
```bash
npm run dev
```

2. Make repeated requests to an endpoint:
```bash
# Test general API limiter
for i in {1..105}; do
  curl -i http://localhost:5000/
  echo "Request $i"
done

# Test upload limiter
for i in {1..12}; do
  curl -i -X POST http://localhost:5000/api/v1/upload
  echo "Request $i"
done
```

3. Observe the 429 response after exceeding limits

## Production Considerations

### Adjusting Rate Limits

Rate limits should be adjusted based on:
- **Traffic patterns** - Monitor actual usage to set appropriate limits
- **Server capacity** - Ensure limits align with infrastructure capabilities
- **User experience** - Avoid being too restrictive for legitimate users
- **Security needs** - Balance between protection and usability

### Using Redis for Distributed Rate Limiting

For production deployments with multiple server instances, consider using Redis as a shared store:

```javascript
import rateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import { createClient } from 'redis'

const client = createClient({
  url: process.env.REDIS_URL
})

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  store: new RedisStore({
    client: client,
    prefix: 'rate-limit:'
  })
})
```

### Monitoring

Monitor rate limiting metrics:
- Number of requests hitting rate limits (429 responses)
- Top IP addresses being rate limited
- Patterns of abuse or legitimate traffic
- Adjust limits based on observed patterns

### Whitelisting

To whitelist specific IPs (e.g., internal services, monitoring tools):

```javascript
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => {
    const whitelistedIPs = ['127.0.0.1', '::1', process.env.INTERNAL_IP]
    return whitelistedIPs.includes(req.ip) || req.path === '/api/health'
  }
})
```

## Security Benefits

This implementation provides protection against:

1. **Brute Force Attacks** - Limits rapid authentication or password guessing attempts
2. **DoS Attacks** - Prevents single IP from overwhelming the server
3. **Resource Exhaustion** - Protects expensive operations (uploads, processing)
4. **API Abuse** - Prevents excessive use of API resources
5. **Cost Control** - Limits resource consumption in cloud environments

## Limitations

Current rate limiting is IP-based, which has limitations:

- **Shared IPs** - Users behind NAT/proxy share the same limit
- **VPN/Proxy** - Attackers can rotate IPs to bypass limits
- **Mobile networks** - Users on mobile may share carrier-grade NAT IPs

For more sophisticated rate limiting, consider:
- User-based rate limiting (after authentication)
- API key-based rate limiting
- Combination of IP and user-based limits
- CAPTCHA challenges for suspicious patterns

## Future Enhancements

Potential improvements for future iterations:

1. **User-based rate limiting** - Authenticated users get higher limits
2. **Dynamic rate limiting** - Adjust limits based on system load
3. **Redis integration** - Distributed rate limiting for horizontal scaling
4. **Custom rate limit rules** - Per-endpoint fine-tuning
5. **Rate limit analytics** - Dashboard for monitoring patterns
6. **Graceful degradation** - Slower responses instead of hard blocks
7. **API key system** - Different tiers of service with different limits

## Compliance

This implementation helps meet security requirements for:
- OWASP API Security Top 10 (API4:2019 - Lack of Resources & Rate Limiting)
- PCI DSS requirements for rate limiting
- General security best practices

## Related Files

- `backend/src/middleware/rateLimiter.js` - Rate limiter configurations
- `backend/src/server.js` - Rate limiter application
- `backend/package.json` - Dependencies
- `backend/test-rate-limiting.js` - Test script

## Support

For questions or issues with rate limiting:
1. Check the logs for rate limit hits
2. Review the configuration in `rateLimiter.js`
3. Test with the provided test script
4. Adjust limits based on legitimate usage patterns
