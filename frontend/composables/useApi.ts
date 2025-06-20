/**
 * 🌐 LogOn Password Manager - API Composable
 * 
 * Centralized API client with automatic token management and error handling.
 * Uses the configured API base URL and handles authentication headers.
 */

type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface ApiOptions {
  baseURL?: string
  requireAuth?: boolean
  headers?: Record<string, string>
  body?: any
  method?: ApiMethod
}

export const useApi = () => {
  const { tokens } = useAuth()
  const config = useRuntimeConfig()

  /**
   * Make authenticated API call
   */
  const apiCall = async <T = any>(
    endpoint: string, 
    options: ApiOptions = {}
  ): Promise<T> => {
    const { 
      baseURL = config.public.apiBase,
      requireAuth = true,
      headers = {},
      method = 'GET',
      body,
      ...fetchOptions 
    } = options

    // Build full URL
    const url = `${baseURL}${endpoint}`

    // Prepare headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers
    }

    // Add authentication header if required and available
    if (requireAuth && tokens.value?.accessToken) {
      requestHeaders.Authorization = `Bearer ${tokens.value.accessToken}`
    }

    try {
      const response = await $fetch<T>(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        ...fetchOptions
      })

      return response
    } catch (error: any) {
      // Handle 401 errors (token expired)
      if (error?.status === 401 && requireAuth) {
        console.warn('API call failed with 401, attempting token refresh')
        throw error // Let the auth plugin handle token refresh
      }

      console.error(`API call failed: ${endpoint}`, error)
      throw error
    }
  }

  /**
   * Convenient method shortcuts
   */
  const api = {
    get: <T = any>(endpoint: string, options: Omit<ApiOptions, 'method'> = {}) =>
      apiCall<T>(endpoint, { ...options, method: 'GET' }),

    post: <T = any>(endpoint: string, body?: any, options: Omit<ApiOptions, 'method' | 'body'> = {}) =>
      apiCall<T>(endpoint, { ...options, method: 'POST', body }),

    put: <T = any>(endpoint: string, body?: any, options: Omit<ApiOptions, 'method' | 'body'> = {}) =>
      apiCall<T>(endpoint, { ...options, method: 'PUT', body }),

    patch: <T = any>(endpoint: string, body?: any, options: Omit<ApiOptions, 'method' | 'body'> = {}) =>
      apiCall<T>(endpoint, { ...options, method: 'PATCH', body }),

    delete: <T = any>(endpoint: string, options: Omit<ApiOptions, 'method'> = {}) =>
      apiCall<T>(endpoint, { ...options, method: 'DELETE' })
  }

  return {
    apiCall,
    ...api
  }
}
