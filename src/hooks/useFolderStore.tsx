import { useState, useEffect, useCallback } from "react"
import { useAuth } from "./useAuth"
import { db } from "../firebase"
import {
    collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, writeBatch, arrayUnion, arrayRemove
} from "firebase/firestore"
import type { Folder, ChatMetadata } from "../types"

export const useFolderStore = () => {
    const { user } = useAuth()
    const [folders, setFolders] = useState<Folder[]>([])
    const [chatMetadata, setChatMetadata] = useState<Record<string, ChatMetadata>>({})
    const [loading, setLoading] = useState(true)
    const [firestoreError, setFirestoreError] = useState<string | null>(null)

    // 1. Sync Folders
    useEffect(() => {
        if (!user) {
            setFolders([])
            return
        }
        const unsubscribe = onSnapshot(
            collection(db, "users", user.uid, "folders"),
            (snapshot) => {
                const list: Folder[] = []
                snapshot.forEach(doc => list.push(doc.data() as Folder))
                setFolders(list)
                setLoading(false)
                setFirestoreError(null)
            },
            (error) => {
                if (error.code === 'permission-denied') {
                    console.warn("[FolderStore] Firestore permission denied - user may not be fully authenticated yet")
                    setFirestoreError("Permission denied. Please sign in again.")
                } else {
                    console.error("[FolderStore] Firestore error:", error)
                    setFirestoreError("Could not load folders. Check your connection.")
                }
                setLoading(false)
            }
        )
        return () => unsubscribe()
    }, [user])

    // 2. Sync Chat Metadata
    useEffect(() => {
        if (!user) {
            setChatMetadata({})
            return
        }
        const unsubscribe = onSnapshot(
            collection(db, "users", user.uid, "chatMetadata"),
            (snapshot) => {
                const meta: Record<string, ChatMetadata> = {}
                snapshot.forEach(doc => {
                    meta[doc.id] = doc.data() as ChatMetadata
                })
                setChatMetadata(meta)
            },
            (error) => {
                if (error.code === 'permission-denied') {
                    console.warn("[FolderStore] Metadata permission denied")
                }
            }
        )
        return () => unsubscribe()
    }, [user])

    // ACTIONS
    const createFolder = useCallback(async (name: string, initialChatIds: string[] = []) => {
        if (!user) return
        // Use Firestore SDK to generate ID
        const newFolderRef = doc(collection(db, "users", user.uid, "folders"))

        const newFolder: Folder = {
            id: newFolderRef.id,
            name,
            chatIds: initialChatIds,
            collapsed: true
        }

        try {
            await setDoc(newFolderRef, newFolder)
        } catch (e) {
            console.error("Failed to create folder", e)
        }
    }, [user])

    const deleteFolder = useCallback(async (folderId: string) => {
        if (!user) return
        try {
            await deleteDoc(doc(db, "users", user.uid, "folders", folderId))
        } catch (e) {
            console.error("Failed to delete folder", e)
        }
    }, [user])



    const toggleFolderCollapse = useCallback(async (folderId: string, collapsed?: boolean) => {
        if (!user) return
        const folder = folders.find(f => f.id === folderId)
        if (!folder) return

        try {
            await updateDoc(doc(db, "users", user.uid, "folders", folderId), {
                collapsed: collapsed ?? !folder.collapsed
            })
        } catch (e) {
            console.error("Failed to toggle collapse", e)
        }
    }, [user, folders])



    const resetAndExpandFolders = useCallback(async (activeFolderIds: string[]) => {
        if (!user) return
        const batch = writeBatch(db)

        // Logic: if folder is in activeFolderIds, it MUST be open (collapsed=false)
        // if folder is NOT in activeFolderIds, it MUST be closed (collapsed=true)

        folders.forEach(f => {
            const shouldBeOpen = activeFolderIds.includes(f.id)
            const currentCollapsed = f.collapsed

            // If it should be open, but is currently collapsed (true), we set to false.
            if (shouldBeOpen && currentCollapsed) {
                const ref = doc(db, "users", user.uid, "folders", f.id)
                batch.update(ref, { collapsed: false })
            }
            // If it should be closed (not active), but is currently open (false), we set to true.
            else if (!shouldBeOpen && !currentCollapsed) {
                const ref = doc(db, "users", user.uid, "folders", f.id)
                batch.update(ref, { collapsed: true })
            }
        })

        try {
            await batch.commit()
        } catch (e) {
            console.error("Batch update failed", e)
        }
    }, [user, folders])

    const addChatsToFolder = useCallback(async (folderId: string, newChatIds: string[]) => {
        if (!user) return
        try {
            await updateDoc(doc(db, "users", user.uid, "folders", folderId), {
                chatIds: arrayUnion(...newChatIds)
            })
        } catch (e) {
            console.error("Failed to add chats", e)
        }
    }, [user])

    const removeChatFromFolder = useCallback(async (folderId: string, chatId: string) => {
        if (!user) return
        try {
            await updateDoc(doc(db, "users", user.uid, "folders", folderId), {
                chatIds: arrayRemove(chatId)
            })
        } catch (e) {
            console.error("Failed to remove chat", e)
        }
    }, [user])

    const updateChatMetadata = useCallback(async (id: string, meta: Partial<ChatMetadata>) => {
        if (!user) return

        const ref = doc(db, "users", user.uid, "chatMetadata", id)
        // We use set with merge to ensure document exists
        await setDoc(ref, meta, { merge: true })

    }, [user])

    return {
        folders,
        chatMetadata,
        createFolder,
        deleteFolder,
        renameFolder: undefined, // Reserved for future use
        toggleFolderCollapse,
        resetAndExpandFolders,
        addChatsToFolder,
        removeChatFromFolder,
        updateChatMetadata,
        loading,
        firestoreError
    }
}
