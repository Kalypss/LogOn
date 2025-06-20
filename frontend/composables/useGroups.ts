/**
 * 🔐 LogOn Password Manager - Groups Composable
 * 
 * Manages user groups with secure sharing capabilities.
 * Handles group creation, membership, and encrypted key sharing.
 */

import type { Group, CreateGroupData, UpdateGroupData, GroupMember } from '~/types/groups'

export const useGroups = () => {
  // Reactive state
  const groups = ref<Group[]>([])
  const isLoading = ref(false)
  const selectedGroup = ref<Group | null>(null)
  
  // Get auth composable
  const { tokens } = useAuth()

  /**
   * Fetch all groups for current user
   */
  const fetchGroups = async () => {
    if (!tokens.value) throw new Error('User not authenticated')
    
    isLoading.value = true
    
    try {
      const response = await $fetch<{ groups: Group[] }>('/api/groups', {
        headers: {
          Authorization: `Bearer ${tokens.value.accessToken}`
        }
      })
      
      groups.value = response.groups
    } catch (error) {
      console.error('Failed to fetch groups:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create new group
   */
  const createGroup = async (groupData: CreateGroupData) => {
    if (!tokens.value) throw new Error('User not authenticated')
    
    isLoading.value = true
    
    try {
      const response = await $fetch<{ group: Group }>('/api/groups', {
        method: 'POST',
        body: groupData,
        headers: {
          Authorization: `Bearer ${tokens.value.accessToken}`
        }
      })
      
      groups.value.push(response.group)
      return response.group
    } catch (error) {
      console.error('Failed to create group:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Update group
   */
  const updateGroup = async (groupId: string, groupData: UpdateGroupData) => {
    if (!tokens.value) throw new Error('User not authenticated')
    
    isLoading.value = true
    
    try {
      const response = await $fetch<{ group: Group }>(`/api/groups/${groupId}`, {
        method: 'PUT',
        body: groupData,
        headers: {
          Authorization: `Bearer ${tokens.value.accessToken}`
        }
      })
      
      const index = groups.value.findIndex((g: Group) => g.id === groupId)
      if (index !== -1) {
        groups.value[index] = response.group
      }
      
      return response.group
    } catch (error) {
      console.error('Failed to update group:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Delete group
   */
  const deleteGroup = async (groupId: string) => {
    if (!tokens.value) throw new Error('User not authenticated')
    
    isLoading.value = true
    
    try {
      await $fetch(`/api/groups/${groupId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${tokens.value.accessToken}`
        }
      })
      
      groups.value = groups.value.filter((g: Group) => g.id !== groupId)
    } catch (error) {
      console.error('Failed to delete group:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Invite user to group
   */
  const inviteToGroup = async (groupId: string, inviteData: { email: string; role: string; message?: string }) => {
    if (!tokens.value) throw new Error('User not authenticated')
    
    try {
      await $fetch(`/api/groups/${groupId}/invite`, {
        method: 'POST',
        body: inviteData,
        headers: {
          Authorization: `Bearer ${tokens.value.accessToken}`
        }
      })
    } catch (error) {
      console.error('Failed to invite user:', error)
      throw error
    }
  }

  /**
   * Leave group
   */
  const leaveGroup = async (groupId: string) => {
    if (!tokens.value) throw new Error('User not authenticated')
    
    try {
      await $fetch(`/api/groups/${groupId}/leave`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.value.accessToken}`
        }
      })
      
      groups.value = groups.value.filter((g: Group) => g.id !== groupId)
    } catch (error) {
      console.error('Failed to leave group:', error)
      throw error
    }
  }

  /**
   * Get group members
   */
  const getGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
    if (!tokens.value) throw new Error('User not authenticated')
    
    try {
      const response = await $fetch<{ members: GroupMember[] }>(`/api/groups/${groupId}/members`, {
        headers: {
          Authorization: `Bearer ${tokens.value.accessToken}`
        }
      })
      
      return response.members
    } catch (error) {
      console.error('Failed to fetch group members:', error)
      throw error
    }
  }

  /**
   * Change member role
   */
  const changeMemberRole = async (groupId: string, memberId: string, role: string) => {
    if (!tokens.value) throw new Error('User not authenticated')
    
    try {
      await $fetch(`/api/groups/${groupId}/members/${memberId}/role`, {
        method: 'PUT',
        body: { role },
        headers: {
          Authorization: `Bearer ${tokens.value.accessToken}`
        }
      })
    } catch (error) {
      console.error('Failed to change member role:', error)
      throw error
    }
  }

  /**
   * Remove member from group
   */
  const removeMember = async (groupId: string, memberId: string) => {
    if (!tokens.value) throw new Error('User not authenticated')
    
    try {
      await $fetch(`/api/groups/${groupId}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${tokens.value.accessToken}`
        }
      })
    } catch (error) {
      console.error('Failed to remove member:', error)
      throw error
    }
  }

  return {
    // State
    groups: readonly(groups),
    isLoading: readonly(isLoading),
    selectedGroup: readonly(selectedGroup),
    
    // Actions
    fetchGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    inviteToGroup,
    leaveGroup,
    getGroupMembers,
    changeMemberRole,
    removeMember
  }
}
