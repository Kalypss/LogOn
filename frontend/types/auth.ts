/**
 * 🔐 LogOn Password Manager - Authentication Types
 * 
 * TypeScript types for authentication and user management
 */

export interface User {
  id: string
  email: string
  username: string
  createdAt: string
  lastLoginAt?: string
  twoFactorEnabled: boolean
  isActive: boolean
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
}

export interface LoginCredentials {
  identifier: string // email or username
  password: string
  twoFactorCode?: string
}

export interface RegisterCredentials {
  email: string
  username: string
  password: string
}

export interface AuthResponse {
  user: User
  tokens: AuthTokens
  requiresTwoFactor?: boolean
}

export interface RecoveryResponse {
  success: boolean
  newRecoveryCode: string
}

export interface TwoFactorSetup {
  secret: string
  qrCode: string
}

export interface PasswordEntry {
  id: string
  title: string
  url?: string
  username?: string
  encryptedPassword: string
  encryptedNotes?: string
  iv: string
  tags: string[]
  favorite: boolean
  createdAt: string
  updatedAt: string
  groupId?: string
}

export interface Group {
  id: string
  name: string
  description?: string
  createdAt: string
  memberCount: number
  role: 'admin' | 'member'
}

export interface GroupMember {
  id: string
  username: string
  email: string
  role: 'admin' | 'member'
  joinedAt: string
}

export interface CreateEntryData {
  title: string
  url?: string
  username?: string
  password: string
  notes?: string
  tags: string[]
  favorite: boolean
  groupId?: string
}

export interface UpdateEntryData extends Partial<CreateEntryData> {
  id: string
}
