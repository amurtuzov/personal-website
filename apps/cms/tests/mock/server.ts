import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { successResponseMock } from './response/example'

const exampleHandlers = [
  http.post(`${import.meta.env.VITE_API_BASE_URL}/example/`, async () => {
    return HttpResponse.json(successResponseMock, { status: 200 })
  }),
]

export const server = setupServer(...exampleHandlers)
