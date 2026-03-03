export type HTTPError<T> = {
  status?: number
  data: T
}

export type ErrorMessage = string | string[]

export type DefaultError = {
  statusCode: number
  message: ErrorMessage
  error?: string
}
