// テスト用のヘルパー関数
import { ApiRequest, ApiResponse } from '@/types/types'

/**
 * 変数展開テスト用のサンプルリクエスト
 */
export const createTestRequest = (): ApiRequest => ({
  id: 'test-1',
  name: 'Test Request',
  url: 'https://{{baseUrl}}/api/{{endpoint}}',
  method: 'POST',
  headers: [
    { key: 'Authorization', value: 'Bearer {{token}}', enabled: true },
    { key: 'X-Custom-Header', value: '{{customValue}}', enabled: true }
  ],
  params: [
    { key: 'param1', value: '{{paramValue}}', enabled: true },
    { key: 'static', value: 'staticValue', enabled: true }
  ],
  body: '{"message": "{{message}}", "userId": {{userId}}}',
  bodyType: 'json',
  type: 'rest',
  auth: {
    type: 'bearer',
    bearer: {
      token: '{{authToken}}'
    }
  }
})

/**
 * 変数展開されたリクエストのサンプル
 */
export const createExpandedRequest = (): ApiRequest => ({
  id: 'test-1',
  name: 'Test Request',
  url: 'https://api.example.com/api/users',
  method: 'POST',
  headers: [
    { key: 'Authorization', value: 'Bearer abc123', enabled: true },
    { key: 'X-Custom-Header', value: 'customData', enabled: true }
  ],
  params: [
    { key: 'param1', value: 'testValue', enabled: true },
    { key: 'static', value: 'staticValue', enabled: true }
  ],
  body: '{"message": "Hello World", "userId": 12345}',
  bodyType: 'json',
  type: 'rest',
  auth: {
    type: 'bearer',
    bearer: {
      token: 'xyz789'
    }
  }
})

/**
 * テスト用のレスポンス（executedRequestあり）
 */
export const createTestResponseWithExecutedRequest = (): ApiResponse => ({
  status: 200,
  statusText: 'OK',
  headers: {
    'content-type': 'application/json',
    'x-response-id': 'resp123'
  },
  data: {
    type: 'json',
    data: { success: true, message: 'Created successfully' }
  },
  duration: 150,
  timestamp: new Date().toISOString(),
  executedRequest: createExpandedRequest() // 変数展開済みリクエスト
})

/**
 * 変数展開前後の比較テスト用
 */
export const compareRequestContent = (original: ApiRequest, executed?: ApiRequest) => {
  if (!executed) {
    console.log('No executed request found')
    return
  }

  console.log('=== Variable Expansion Comparison ===')
  console.log('Original URL:', original.url)
  console.log('Executed URL:', executed.url)
  
  console.log('\nOriginal Headers:')
  original.headers.forEach(h => console.log(`  ${h.key}: ${h.value}`))
  console.log('Executed Headers:')
  executed.headers.forEach(h => console.log(`  ${h.key}: ${h.value}`))
  
  console.log('\nOriginal Body:', original.body)
  console.log('Executed Body:', executed.body)
}