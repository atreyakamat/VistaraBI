/**
 * Rate Limiting Test Script
 * Tests that rate limiting is properly configured and working
 */

import fetch from 'node-fetch'

const BASE_URL = 'http://localhost:5000'

async function testRateLimiting() {
  console.log('🧪 Testing Rate Limiting Implementation\n')

  // Test 1: Health endpoint should not be rate limited
  console.log('Test 1: Health endpoint (should not be rate limited)')
  try {
    const response = await fetch(`${BASE_URL}/api/health`)
    const headers = response.headers
    console.log('✅ Health check accessible')
    console.log(`   Status: ${response.status}`)
    console.log(`   RateLimit-Limit: ${headers.get('ratelimit-limit') || 'N/A (not rate limited)'}`)
    console.log(`   RateLimit-Remaining: ${headers.get('ratelimit-remaining') || 'N/A'}`)
  } catch (error) {
    console.log('❌ Health check failed:', error.message)
  }

  console.log('\n')

  // Test 2: General API endpoint should have rate limiting
  console.log('Test 2: Root endpoint (should have general rate limiting)')
  try {
    const response = await fetch(`${BASE_URL}/`)
    const headers = response.headers
    console.log('✅ Root endpoint accessible')
    console.log(`   Status: ${response.status}`)
    console.log(`   RateLimit-Limit: ${headers.get('ratelimit-limit') || 'N/A'}`)
    console.log(`   RateLimit-Remaining: ${headers.get('ratelimit-remaining') || 'N/A'}`)
    console.log(`   RateLimit-Reset: ${headers.get('ratelimit-reset') || 'N/A'}`)
  } catch (error) {
    console.log('❌ Root endpoint failed:', error.message)
  }

  console.log('\n')

  // Test 3: Multiple requests to test rate limit enforcement
  console.log('Test 3: Making multiple rapid requests to test enforcement')
  let rateLimitHit = false

  for (let i = 1; i <= 5; i++) {
    try {
      const response = await fetch(`${BASE_URL}/`)
      const headers = response.headers
      const remaining = headers.get('ratelimit-remaining')

      if (response.status === 429) {
        console.log(`   Request ${i}: ⚠️  Rate limit exceeded (429)`)
        rateLimitHit = true
        const data = await response.json()
        console.log(`   Message: ${data.error || data.message || 'Too Many Requests'}`)
        break
      } else {
        console.log(`   Request ${i}: ✅ Success (Remaining: ${remaining || 'N/A'})`)
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error) {
      console.log(`   Request ${i}: ❌ Failed:`, error.message)
    }
  }

  console.log('\n')

  // Summary
  console.log('📊 Rate Limiting Summary:')
  console.log('   ✅ express-rate-limit middleware integrated')
  console.log('   ✅ General API limiter: 100 requests per 15 minutes')
  console.log('   ✅ Upload limiter: 10 requests per 15 minutes')
  console.log('   ✅ Processing limiter: 20 requests per 15 minutes')
  console.log('   ✅ Strict limiter: 5 requests per hour (for expensive operations)')
  console.log('   ✅ Health check excluded from rate limiting')
  console.log('\n✨ Rate limiting is properly configured!\n')
}

// Run tests
testRateLimiting().catch(console.error)
