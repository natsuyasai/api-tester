import { http, HttpResponse } from 'msw'

export const handlers = [
  // GET /api/users
  http.get('https://api.example.com/users', () => {
    return HttpResponse.json({
      users: [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
      ],
      total: 2,
      page: 1
    })
  }),

  // POST /api/users
  http.post('https://api.example.com/users', async ({ request }) => {
    let body: Record<string, unknown> = {}
    try {
      const parsed = await request.json()
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        body = parsed
      }
    } catch {
      body = {}
    }
    return HttpResponse.json(
      {
        id: 123,
        ...body,
        createdAt: '2024-01-01T10:30:00.000Z'
      },
      { status: 201 }
    )
  }),

  // 404 error endpoint
  http.get('https://api.example.com/users/999', () => {
    return HttpResponse.json(
      {
        error: 'User not found',
        code: 'NOT_FOUND'
      },
      { status: 404 }
    )
  }),

  // Slow response endpoint
  http.get('https://api.example.com/slow', async () => {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    return HttpResponse.json({
      message: 'This was a slow response'
    })
  }),

  // Text response endpoint
  http.get('https://api.example.com/health', () => {
    return new HttpResponse('This is a plain text response from the server.', {
      headers: {
        'Content-Type': 'text/plain'
      }
    })
  }),

  // GraphQL endpoint
  http.post('https://api.example.com/graphql', async ({ request }) => {
    const { query } = (await request.json()) as { query: string }

    if (query.includes('GetUsers')) {
      return HttpResponse.json({
        data: {
          users: [
            {
              id: 1,
              name: 'John Doe',
              email: 'john@example.com',
              createdAt: '2024-01-01T10:00:00.000Z'
            },
            {
              id: 2,
              name: 'Jane Smith',
              email: 'jane@example.com',
              createdAt: '2024-01-01T10:01:00.000Z'
            }
          ]
        }
      })
    }

    return HttpResponse.json(
      {
        errors: [{ message: 'Unknown query' }]
      },
      { status: 400 }
    )
  })
]
