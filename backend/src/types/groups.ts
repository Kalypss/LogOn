/**
 * 🔐 LogOn Password Manager - Group Types
 * 
 * Types TypeScript pour le système de groupes et partage sécurisé
 */

export interface Group {
  id: string
  name: string
  encryptedDescription?: string
  createdBy: string
  role: 'admin' | 'member'
  encryptedGroupKey: string
  joinedAt: Date
  createdAt: Date
  updatedAt: Date
  membersCount: number
  entriesCount: number
}

export interface GroupMember {
  id: string
  email: string
  role: 'admin' | 'member'
  joinedAt: Date
  lastAccessAt?: Date
}

export interface GroupEntry {
  id: string
  titleEncrypted: string
  type: 'password' | 'note' | 'card' | 'identity'
  encryptionVersion: number
  createdAt: Date
  updatedAt: Date
  lastAccessedAt?: Date
  accessCount: number
  permissions: EntryPermissions
}

export interface EntryPermissions {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
}

export interface CreateGroupData {
  name: string
  encryptedDescription?: string
  encryptedGroupKey: string
}

export interface UpdateGroupData {
  name?: string
  encryptedDescription?: string
}

export interface InviteMemberData {
  email: string
  encryptedGroupKey: string
}

export interface UpdateMemberRoleData {
  role: 'admin' | 'member'
}

export interface CreateGroupEntryData {
  titleEncrypted: string
  dataEncrypted: string
  iv: string
  authTag: string
  type: 'password' | 'note' | 'card' | 'identity'
  permissions?: EntryPermissionData[]
}

export interface EntryPermissionData {
  userId: string
  canView: boolean
  canEdit?: boolean
  canDelete?: boolean
}

export interface UpdateEntryPermissionsData {
  permissions: EntryPermissionData[]
}

export interface GroupStats {
  id: string
  name: string
  membersCount: number
  entriesCount: number
  lastEntryUpdate?: Date
}

export interface GroupCryptoData {
  groupKey: string
  encryptedKeys: Array<{
    userId: string
    encryptedKey: string
  }>
}

export interface UserKeyPair {
  publicKey: string
  privateKey: string
}

// API Response types
export interface GroupListResponse {
  success: boolean
  groups: Group[]
}

export interface GroupResponse {
  success: boolean
  group: Group
}

export interface GroupMembersResponse {
  success: boolean
  members: GroupMember[]
}

export interface GroupEntriesResponse {
  success: boolean
  entries: GroupEntry[]
  pagination: {
    limit: number
    offset: number
    total: number
  }
}

export interface GroupOperationResponse {
  success: boolean
  message: string
  group?: Partial<Group>
  member?: Partial<GroupMember>
  entry?: Partial<GroupEntry>
}

// Error types spécifiques aux groupes
export class GroupNotFoundError extends Error {
  constructor(message = 'Groupe non trouvé') {
    super(message)
    this.name = 'GroupNotFoundError'
  }
}

export class GroupAccessDeniedError extends Error {
  constructor(message = 'Accès refusé au groupe') {
    super(message)
    this.name = 'GroupAccessDeniedError'
  }
}

export class GroupPermissionError extends Error {
  constructor(message = 'Permissions insuffisantes') {
    super(message)
    this.name = 'GroupPermissionError'
  }
}

export class GroupCryptoError extends Error {
  constructor(message = 'Erreur cryptographique du groupe') {
    super(message)
    this.name = 'GroupCryptoError'
  }
}
