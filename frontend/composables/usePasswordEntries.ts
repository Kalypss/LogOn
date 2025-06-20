/**
 * 🔐 LogOn Password Manager - Password Entries Composable
 * 
 * Manages password entries with client-side encryption/decryption.
 * Provides CRUD operations for encrypted password storage.
 */

import type { PasswordEntry, CreateEntryData, UpdateEntryData } from '~/types/auth'
import { encrypt, decrypt } from '~/lib/crypto'

export const usePasswordEntries = () => {
  // Reactive state
  const entries = ref<PasswordEntry[]>([])
  const isLoading = ref(false)
  const selectedEntry = ref<PasswordEntry | null>(null)
  
  // Get auth composable
  const { tokens, getEncryptionKey } = useAuth()

  /**
   * Fetch all entries for current user
   */
  const fetchEntries = async () => {
    if (!tokens.value) throw new Error('User not authenticated')
    
    isLoading.value = true
    
    try {
      const response = await $fetch<{ entries: PasswordEntry[] }>('/api/entries', {
        headers: {
          Authorization: `Bearer ${tokens.value.accessToken}`
        }
      })
      
      entries.value = response.entries
    } catch (error) {
      console.error('Failed to fetch entries:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create new password entry with client-side encryption
   */
  const createEntry = async (entryData: CreateEntryData) => {
    if (!tokens.value) throw new Error('User not authenticated')
    
    isLoading.value = true
    
    try {
      const encryptionKey = getEncryptionKey()
      
      // Encrypt sensitive data
      const encryptedPassword = await encrypt(entryData.password, encryptionKey)
      const encryptedNotes = entryData.notes 
        ? await encrypt(entryData.notes, encryptionKey)
        : null
      
      // Prepare encrypted entry data
      const encrypted = {
        title: entryData.title,
        url: entryData.url,
        username: entryData.username,
        encryptedPassword: encryptedPassword.encrypted,
        encryptedNotes: encryptedNotes?.encrypted,
        iv: encryptedPassword.iv,
        notesIv: encryptedNotes?.iv,
        tags: entryData.tags,
        favorite: entryData.favorite,
        groupId: entryData.groupId
      }
      
      const response = await $fetch<{ entry: PasswordEntry }>('/api/entries', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.value.accessToken}`
        },
        body: encrypted
      })
      
      // Add to local state
      entries.value.push(response.entry)
      
      return response.entry
    } catch (error) {
      console.error('Failed to create entry:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Update existing password entry
   */
  const updateEntry = async (entryData: UpdateEntryData) => {
    if (!tokens.value) throw new Error('User not authenticated')
    if (!entryData.id) throw new Error('Entry ID is required')
    
    isLoading.value = true
    
    try {
      const encryptionKey = getEncryptionKey()
      
      // Prepare update data
      const updateData: any = {
        title: entryData.title,
        url: entryData.url,
        username: entryData.username,
        tags: entryData.tags,
        favorite: entryData.favorite,
        groupId: entryData.groupId
      }
      
      // Encrypt password if provided
      if (entryData.password) {
        const encryptedPassword = await encrypt(entryData.password, encryptionKey)
        updateData.encryptedPassword = encryptedPassword.encrypted
        updateData.iv = encryptedPassword.iv
      }
      
      // Encrypt notes if provided
      if (entryData.notes !== undefined) {
        if (entryData.notes) {
          const encryptedNotes = await encrypt(entryData.notes, encryptionKey)
          updateData.encryptedNotes = encryptedNotes.encrypted
          updateData.notesIv = encryptedNotes.iv
        } else {
          updateData.encryptedNotes = null
          updateData.notesIv = null
        }
      }
      
      const response = await $fetch<{ entry: PasswordEntry }>(`/api/entries/${entryData.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${tokens.value.accessToken}`
        },
        body: updateData
      })
      
      // Update local state
      const index = entries.value.findIndex(e => e.id === entryData.id)
      if (index !== -1) {
        entries.value[index] = response.entry
      }
      
      return response.entry
    } catch (error) {
      console.error('Failed to update entry:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Delete password entry
   */
  const deleteEntry = async (entryId: string) => {
    if (!tokens.value) throw new Error('User not authenticated')
    
    isLoading.value = true
    
    try {
      await $fetch(`/api/entries/${entryId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${tokens.value.accessToken}`
        }
      })
      
      // Remove from local state
      entries.value = entries.value.filter(e => e.id !== entryId)
      
      if (selectedEntry.value?.id === entryId) {
        selectedEntry.value = null
      }
    } catch (error) {
      console.error('Failed to delete entry:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Decrypt password for display
   */
  const decryptPassword = async (entry: PasswordEntry): Promise<string> => {
    try {
      const encryptionKey = getEncryptionKey()
      return await decrypt(entry.encryptedPassword, entry.iv, encryptionKey)
    } catch (error) {
      console.error('Failed to decrypt password:', error)
      throw new Error('Impossible de déchiffrer le mot de passe')
    }
  }

  /**
   * Decrypt notes for display
   */
  const decryptNotes = async (entry: PasswordEntry): Promise<string | null> => {
    if (!entry.encryptedNotes) return null
    
    try {
      const encryptionKey = getEncryptionKey()
      return await decrypt(entry.encryptedNotes, entry.iv, encryptionKey)
    } catch (error) {
      console.error('Failed to decrypt notes:', error)
      throw new Error('Impossible de déchiffrer les notes')
    }
  }

  /**
   * Get entry by ID
   */
  const getEntry = (entryId: string): PasswordEntry | undefined => {
    return entries.value.find(e => e.id === entryId)
  }

  /**
   * Search entries by title, username, or URL
   */
  const searchEntries = (query: string): PasswordEntry[] => {
    if (!query.trim()) return entries.value
    
    const searchTerm = query.toLowerCase().trim()
    
    return entries.value.filter(entry => 
      entry.title.toLowerCase().includes(searchTerm) ||
      entry.username?.toLowerCase().includes(searchTerm) ||
      entry.url?.toLowerCase().includes(searchTerm) ||
      entry.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    )
  }

  /**
   * Filter entries by tags
   */
  const filterByTags = (tags: string[]): PasswordEntry[] => {
    if (tags.length === 0) return entries.value
    
    return entries.value.filter(entry =>
      tags.some(tag => entry.tags.includes(tag))
    )
  }

  /**
   * Filter entries by group
   */
  const filterByGroup = (groupId: string | null): PasswordEntry[] => {
    return entries.value.filter(entry => entry.groupId === groupId)
  }

  /**
   * Get favorite entries
   */
  const getFavorites = (): PasswordEntry[] => {
    return entries.value.filter(entry => entry.favorite)
  }

  /**
   * Get all unique tags
   */
  const getAllTags = (): string[] => {
    const tagSet = new Set<string>()
    entries.value.forEach(entry => {
      entry.tags.forEach(tag => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }

  /**
   * Toggle favorite status
   */
  const toggleFavorite = async (entryId: string) => {
    const entry = entries.value.find(e => e.id === entryId)
    if (!entry) return
    
    await updateEntry({
      id: entryId,
      favorite: !entry.favorite
    })
  }

  /**
   * Duplicate entry
   */
  const duplicateEntry = async (entryId: string) => {
    const entry = entries.value.find(e => e.id === entryId)
    if (!entry) throw new Error('Entry not found')
    
    // Decrypt password to re-encrypt for new entry
    const password = await decryptPassword(entry)
    const notes = await decryptNotes(entry)
    
    const duplicateData: CreateEntryData = {
      title: `${entry.title} (copie)`,
      url: entry.url,
      username: entry.username,
      password,
      notes: notes || undefined,
      tags: [...entry.tags],
      favorite: false,
      groupId: entry.groupId
    }
    
    return await createEntry(duplicateData)
  }

  /**
   * Copy password to clipboard
   */
  const copyToClipboard = async (text: string, label: string = 'Mot de passe') => {
    try {
      await navigator.clipboard.writeText(text)
      
      // Show notification (you can implement your notification system)
      console.log(`✅ ${label} copié dans le presse-papiers`)
      
      return true
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      
      console.log(`✅ ${label} copié dans le presse-papiers`)
      return true
    }
  }

  return {
    // State
    entries: readonly(entries),
    selectedEntry,
    isLoading: readonly(isLoading),
    
    // Methods
    fetchEntries,
    createEntry,
    updateEntry,
    deleteEntry,
    decryptPassword,
    decryptNotes,
    getEntry,
    searchEntries,
    filterByTags,
    filterByGroup,
    getFavorites,
    getAllTags,
    toggleFavorite,
    duplicateEntry,
    copyToClipboard
  }
}
