/**
 * 🔐 LogOn Password Manager - Authentication Composable
 * 
 * Manages user authentication with zero-knowledge architecture.
 * Handles key derivation, login, registration, and session management.
 */

import type { User, AuthTokens, LoginCredentials, RegisterCredentials, AuthResponse } from '~/types/auth'
import { 
  generateUserSalt, 
  deriveKeys, 
  hashAuthKey, 
  generateRecoveryCode 
} from '~/lib/crypto'

export const useAuth = () => {
  // Reactive state
  const user = ref<User | null>(null)
  const tokens = ref<AuthTokens | null>(null)
  const isAuthenticated = computed(() => !!user.value && !!tokens.value)
  const isLoading = ref(false)
  
  // Store auth keys in memory only (never persisted)
  const authKeys = ref<{
    authKey: string
    encKey: string
  } | null>(null)

  // Runtime config
  const config = useRuntimeConfig()

  // Utility functions for safe localStorage usage
  const getStoredTokens = (): AuthTokens | null => {
    if (process.client && typeof window !== 'undefined') {
      const stored = localStorage.getItem('logon_tokens')
      return stored ? JSON.parse(stored) : null
    }
    return null
  }

  const storeTokens = (authTokens: AuthTokens) => {
    if (process.client && typeof window !== 'undefined') {
      localStorage.setItem('logon_tokens', JSON.stringify(authTokens))
    }
  }

  const removeStoredTokens = () => {
    if (process.client && typeof window !== 'undefined') {
      localStorage.removeItem('logon_tokens')
    }
  }

  /**
   * Initialize auth state from stored tokens
   */
  const initialize = async () => {
    const storedTokens = getStoredTokens()
    if (storedTokens) {
      try {
        tokens.value = storedTokens
        await fetchUserProfile()
      } catch (error) {
        console.error('Failed to initialize auth:', error)
        await logout()
      }
    }
  }

  /**
   * Register new user with client-side key derivation
   */
  const register = async (credentials: RegisterCredentials) => {
    // Ensure we're on the client side
    if (typeof window === 'undefined') {
      throw new Error('Authentication operations must be performed on the client side')
    }
    
    isLoading.value = true
    
    try {
      // Generate user salt
      const salt = generateUserSalt()
      
      // Derive keys from password
      const keys = await deriveKeys(credentials.password, salt)
      
      // Hash auth key for server verification
      const authHash = await hashAuthKey(keys.authKey)
      
      // Generate recovery code and its salt
      const recoveryCode = generateRecoveryCode()
      const recoveryCodeSalt = generateUserSalt()
      
      // Derive recovery key from recovery code and hash it
      const recoveryKeys = await deriveKeys(recoveryCode, recoveryCodeSalt)
      const recoveryCodeHash = await hashAuthKey(recoveryKeys.authKey)
      
      // Register user on server
      const response = await $fetch<AuthResponse>(`${config.public.apiBase}/auth/register`, {
        method: 'POST',
        body: {
          email: credentials.email,
          username: credentials.username,
          authHash,
          salt,
          recoveryCodeHash,
          recoveryCodeSalt
        }
      })
      
      // Store auth data
      user.value = response.user
      tokens.value = response.tokens
      authKeys.value = keys
      
      // Persist tokens
      storeTokens(response.tokens)
      
      // Show recovery code to user (one time only)
      return {
        success: true,
        recoveryCode
      }
    } catch (error) {
      console.error('Registration failed:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Login user with client-side key derivation
   */
  const login = async (credentials: LoginCredentials) => {
    // Ensure we're on the client side
    if (typeof window === 'undefined') {
      throw new Error('Authentication operations must be performed on the client side')
    }
    
    isLoading.value = true
    
    try {
      // Get user salt from server
      const saltResponse = await $fetch<{ salt: string }>(`${config.public.apiBase}/api/auth/salt`, {
        method: 'POST',
        body: { identifier: credentials.identifier }
      })
      
      // Derive keys from password
      const keys = await deriveKeys(credentials.password, saltResponse.salt)
      
      // Hash auth key for server verification
      const authHash = await hashAuthKey(keys.authKey)
      
      // Login request
      const response = await $fetch<AuthResponse>(`${config.public.apiBase}/api/auth/login`, {
        method: 'POST',
        body: {
          identifier: credentials.identifier,
          authHash,
          twoFactorCode: credentials.twoFactorCode
        }
      })
      
      // Check if 2FA is required
      if (response.requiresTwoFactor) {
        return { 
          success: false,
          requiresTwoFactor: true 
        }
      }
      
      // Store auth data
      user.value = response.user
      tokens.value = response.tokens
      authKeys.value = keys
      
      // Persist tokens
      storeTokens(response.tokens)
      
      return { success: true }
    } catch (error: any) {
      // Check if error indicates 2FA is required
      if (error.data?.requiresTwoFactor || error.message?.includes('2FA')) {
        return { 
          success: false,
          requiresTwoFactor: true 
        }
      }
      
      console.error('Login failed:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Verify two-factor code during login process
   */
  const verifyTwoFactor = async ({ email, code }: { email: string, code: string }) => {
    if (typeof window === 'undefined') {
      throw new Error('Authentication operations must be performed on the client side')
    }
    
    isLoading.value = true
    
    try {
      const response = await $fetch<AuthResponse>(`${config.public.apiBase}/api/auth/2fa/login-verify`, {
        method: 'POST',
        body: {
          email,
          twoFactorCode: code
        }
      })
      
      // Store auth data
      user.value = response.user
      tokens.value = response.tokens
      
      // Persist tokens
      storeTokens(response.tokens)
      
      return { success: true }
    } catch (error) {
      console.error('2FA verification failed:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Logout user and clear all data
   */
  const logout = async () => {
    try {
      if (tokens.value) {
        await $fetch(`${config.public.apiBase}/api/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokens.value.accessToken}`
          }
        })
      }
    } catch (error) {
      console.error('Logout request failed:', error)
    }
    
    // Clear all auth data
    user.value = null
    tokens.value = null
    authKeys.value = null
    
    removeStoredTokens()
  }

  /**
   * Refresh access token
   */
  const refreshToken = async (): Promise<boolean> => {
    if (!tokens.value?.refreshToken) return false
    
    try {
      const response = await $fetch<{ success: boolean; tokens: AuthTokens }>(`${config.public.apiBase}/api/auth/refresh`, {
        method: 'POST',
        body: {
          refreshToken: tokens.value.refreshToken
        }
      })
      
      if (response.success && response.tokens) {
        tokens.value = response.tokens
        storeTokens(response.tokens)
        return true
      }
      
      return false
    } catch (error) {
      console.error('Token refresh failed:', error)
      await logout()
      return false
    }
  }

  /**
   * Fetch user profile
   */
  const fetchUserProfile = async () => {
    if (!tokens.value) throw new Error('No auth tokens')
    
    const response = await $fetch<{ user: User }>(`${config.public.apiBase}/api/users/profile`, {
      headers: {
        Authorization: `Bearer ${tokens.value.accessToken}`
      }
    })
    
    user.value = response.user
  }

  /**
   * Account recovery with recovery code
   */
  const recoverAccount = async (email: string, recoveryCode: string, newPassword: string) => {
    isLoading.value = true
    
    try {
      // Hash recovery code
      const recoveryHash = await hashAuthKey(recoveryCode.replace(/-/g, ''))
      
      // Generate new salt and keys
      const salt = generateUserSalt()
      const keys = await deriveKeys(newPassword, salt)
      const authHash = await hashAuthKey(keys.authKey)
      
      // Generate new recovery code
      const newRecoveryCode = generateRecoveryCode()
      const newRecoveryHash = await hashAuthKey(newRecoveryCode)
      
      const response = await $fetch<AuthResponse>(`${config.public.apiBase}/api/auth/recover`, {
        method: 'POST',
        body: {
          email,
          recoveryCode: recoveryHash,
          newAuthHash: authHash,
          newSalt: salt,
          newRecoveryCode: newRecoveryHash
        }
      })
      
      // Store auth data
      user.value = response.user
      tokens.value = response.tokens
      authKeys.value = keys
      
      storeTokens(response.tokens)
      
      return {
        success: true,
        newRecoveryCode
      }
    } catch (error) {
      console.error('Account recovery failed:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Enable 2FA
   */
  const enable2FA = async () => {
    if (!tokens.value) throw new Error('User not authenticated')
    
    const response = await $fetch<{ secret: string, qrCode: string }>(`${config.public.apiBase}/api/auth/2fa/setup`, {
      headers: {
        Authorization: `Bearer ${tokens.value.accessToken}`
      }
    })
    
    return response
  }

  /**
   * Verify and activate 2FA
   */
  const verify2FA = async (code: string) => {
    if (!tokens.value) throw new Error('User not authenticated')
    
    await $fetch(`${config.public.apiBase}/api/auth/2fa/verify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.value.accessToken}`
      },
      body: { code }
    })
    
    // Update user profile
    if (user.value) {
      user.value.twoFactorEnabled = true
    }
  }

  /**
   * Disable 2FA
   */
  const disable2FA = async (code: string) => {
    if (!tokens.value) throw new Error('User not authenticated')
    
    await $fetch(`${config.public.apiBase}/api/auth/2fa/disable`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.value.accessToken}`
      },
      body: { code }
    })
    
    // Update user profile
    if (user.value) {
      user.value.twoFactorEnabled = false
    }
  }

  /**
   * Check authentication state
   */
  const checkAuth = async () => {
    if (!tokens.value) {
      await initialize()
    }
    return { pending: false }
  }

  /**
   * Get encryption key for current user
   */
  const getEncryptionKey = (): string => {
    if (!authKeys.value) {
      throw new Error('User not authenticated or keys not available')
    }
    return authKeys.value.encKey
  }

  return {
    // State
    user: readonly(user),
    tokens: readonly(tokens),
    isAuthenticated,
    isLoading: readonly(isLoading),
    
    // Methods
    initialize,
    checkAuth,
    register,
    login,
    logout,
    refreshToken,
    fetchUserProfile,
    recoverAccount,
    enable2FA,
    verify2FA,
    disable2FA,
    getEncryptionKey,
    verifyTwoFactor
  }
}
