/**
 * 🔐 LogOn Password Manager - Database Types
 * 
 * TypeScript types for database entities and operations
 */

export interface User {
  id: string
  email: string
  username: string
  auth_hash: string
  salt: string
  recovery_code_hash: string
  two_factor_enabled: boolean
  two_factor_secret?: string
  created_at: Date
  last_login_at?: Date
  is_active: boolean
  createdAt?: string // API compatibility
  lastLoginAt?: string // API compatibility
  twoFactorEnabled?: boolean // API compatibility
  isActive?: boolean // API compatibility
}

export interface Session {
  id: string
  user_id: string
  refresh_token: string
  expires_at: Date
  created_at: Date
  ip_address?: string
  user_agent?: string
}

export interface PasswordEntry {
  id: string
  user_id: string
  group_id?: string
  title: string
  url?: string
  username?: string
  encrypted_password: string
  encrypted_notes?: string
  iv: string
  notes_iv?: string
  tags: string[]
  favorite: boolean
  created_at: Date
  updated_at: Date
}

export interface Group {
  id: string
  name: string
  description?: string
  created_by: string
  created_at: Date
  updated_at: Date
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: 'admin' | 'member'
  encrypted_group_key: string
  joined_at: Date
}

export interface EntryPermission {
  id: string
  entry_id: string
  group_id: string
  can_view: boolean
  can_edit: boolean
  can_delete: boolean
  visible_to_members: string[] // JSON array of user IDs
}

export interface AuditLog {
  id: string
  user_id: string
  action: string
  resource_type: string
  resource_id?: string
  ip_address?: string
  user_agent?: string
  details?: Record<string, any>
  created_at: Date
}

export interface BackupCode {
  id: string
  user_id: string
  code_hash: string
  used: boolean
  used_at?: Date
  created_at: Date
}

// API Response types
export interface DatabaseUser {
  id: string
  email: string
  username: string
  createdAt: string
  lastLoginAt?: string
  twoFactorEnabled: boolean
  isActive: boolean
}

export interface CreateUserData {
  email: string
  username: string
  authHash: string
  salt: string
  recoveryCodeHash: string
  twoFactorEnabled: boolean
}

export interface UpdateUserData {
  email?: string
  username?: string
  authHash?: string
  salt?: string
  recoveryCodeHash?: string
  twoFactorEnabled?: boolean
  twoFactorSecret?: string
}

export interface CreateEntryData {
  title: string
  url?: string
  username?: string
  encryptedPassword: string
  encryptedNotes?: string
  iv: string
  notesIv?: string
  tags: string[]
  favorite: boolean
  groupId?: string
}

export interface UpdateEntryData extends Partial<CreateEntryData> {
  id: string
}

// Query result types
export interface QueryResult<T = any> {
  rows: T[]
  rowCount: number
  command: string
}

// Database connection types
export interface DatabaseConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl?: boolean
  max?: number
  idleTimeoutMillis?: number
  connectionTimeoutMillis?: number
}
