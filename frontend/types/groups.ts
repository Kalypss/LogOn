/**
 * 🔐 LogOn Password Manager - Groups Types
 * 
 * TypeScript interfaces for groups and group-related operations
 * Used throughout the application for type safety
 */

export interface Group {
  id: string
  name: string
  description?: string
  role: 'admin' | 'member'
  memberCount: number
  entryCount: number
  createdAt: string
  updatedAt: string
  isPending?: boolean
}

export interface GroupMember {
  id: string
  username: string
  email: string
  role: 'admin' | 'member'
  joinedAt: string
}

export interface CreateGroupData {
  name: string
  description?: string
}

export interface UpdateGroupData {
  name?: string
  description?: string
}

export interface GroupInvitation {
  id: string
  groupId: string
  groupName: string
  invitedBy: string
  email: string
  role: 'admin' | 'member'
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
  expiresAt: string
}

export interface GroupEntry {
  id: string
  title: string
  username: string
  url?: string
  groupId: string
  permissions: string[]
  createdAt: string
  updatedAt: string
}

export interface GroupStats {
  totalGroups: number
  adminGroups: number
  memberGroups: number
  totalSharedEntries: number
}

export interface GroupPermission {
  id: string
  entryId: string
  userId: string
  groupId: string
  permissions: ('read' | 'write' | 'share')[]
  grantedAt: string
  grantedBy: string
}
