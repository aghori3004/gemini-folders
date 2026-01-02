import { useState, useEffect, useCallback } from "react"
import { useAuth } from "./useAuth"
import { db } from "../firebase"
import {
    collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, writeBatch
} from "firebase/firestore"
import type { Folder, ChatMetadata } from "../types"

export const useFolderStore = () => {
    const { user } = useAuth()
    const [folders, setFolders] = useState<Folder[]>([])
    const [chatMetadata, setChatMetadata] = useState<Record<string, ChatMetadata>>({})
    const [loading, setLoading] = useState(true)

    // 1. Sync Folders
    useEffect(() => {
        if (!user) {
            setFolders([])
            return
        }
        const unsubscribe = onSnapshot(collection(db, "users", user.uid, "folders"), (snapshot) => {
            const list: Folder[] = []
            snapshot.forEach(doc => list.push(doc.data() as Folder))
            setFolders(list)
            setLoading(false)
        })
        return () => unsubscribe()
    }, [user])

    // 2. Sync Chat Metadata
    useEffect(() => {
        if (!user) {
            setChatMetadata({})
            return
        }
        const unsubscribe = onSnapshot(collection(db, "users", user.uid, "chatMetadata"), (snapshot) => {
            const meta: Record<string, ChatMetadata> = {}
            snapshot.forEach(doc => {
                meta[doc.id] = doc.data() as ChatMetadata
            })
            setChatMetadata(meta)
        })
        return () => unsubscribe()
    }, [user])

    // ACTIONS
    const createFolder = useCallback(async (name: string, initialChatIds: string[] = []) => {
        if (!user) return
        const id = crypto.randomUUID()
        const newFolder: Folder = {
            id,
            name,
            chatIds: initialChatIds,
            collapsed: true // Default collapsed
        }
        await setDoc(doc(db, "users", user.uid, "folders", id), newFolder)
    }, [user])

    const deleteFolder = useCallback(async (folderId: string) => {
        if (!user) return
        await deleteDoc(doc(db, "users", user.uid, "folders", folderId))
    }, [user])

    const renameFolder = useCallback(async (folderId: string, newName: string) => {
        if (!user) return
        await updateDoc(doc(db, "users", user.uid, "folders", folderId), { name: newName })
    }, [user])

    const toggleFolderCollapse = useCallback(async (folderId: string, collapsed?: boolean) => {
        if (!user) return
        // Get current state if not provided
        // But for optimization, we assume the UI passed the desired state or we toggle based on local
        // Ideally we read the specific doc, but relying on local state is faster for UI.
        const folder = folders.find(f => f.id === folderId)
        if (!folder) return

        await updateDoc(doc(db, "users", user.uid, "folders", folderId), {
            collapsed: collapsed ?? !folder.collapsed
        })
    }, [user, folders])

    const expandFolders = useCallback(async (folderIds: string[]) => {
        if (!user) return
        const batch = writeBatch(db)

        // This function sets collapsed=false for specific folders
        folderIds.forEach(id => {
            const ref = doc(db, "users", user.uid, "folders", id)
            batch.update(ref, { collapsed: false })
        })

        await batch.commit()
    }, [user])

    const resetAndExpandFolders = useCallback(async (activeFolderIds: string[]) => {
        if (!user) return
        const batch = writeBatch(db)

        folders.forEach(f => {
            const shouldBeOpen = activeFolderIds.includes(f.id)
            // Only update if changed (Minimize writes)
            if (f.collapsed === shouldBeOpen) {
                // Wait, if collapsed is true, and shouldBeOpen is true (it should be open), then we update.
                // If collapsed=true (closed) and shouldBeOpen=true, we update to false.
                // If collapsed=false (open) and shouldBeOpen=false, we update to true.
                // Wait.
                // collapsed: true. shouldBeOpen: true. -> Needs update to false.
                // collapsed: false. shouldBeOpen: true. -> No update.

                // Logic: collapsed should be !shouldBeOpen
            }

            if (f.collapsed === shouldBeOpen) {
                const ref = doc(db, "users", user.uid, "folders", f.id)
                batch.update(ref, { collapsed: !shouldBeOpen })
            }
        })

        await batch.commit()
    }, [user, folders])

    const addChatsToFolder = useCallback(async (folderId: string, newChatIds: string[]) => {
        if (!user) return
        const folder = folders.find(f => f.id === folderId)
        if (!folder) return

        const newSet = new Set([...folder.chatIds, ...newChatIds])
        await updateDoc(doc(db, "users", user.uid, "folders", folderId), {
            chatIds: Array.from(newSet)
        })
    }, [user, folders])

    const removeChatFromFolder = useCallback(async (folderId: string, chatId: string) => {
        if (!user) return
        const folder = folders.find(f => f.id === folderId)
        if (!folder) return

        const newIds = folder.chatIds.filter(id => id !== chatId)
        await updateDoc(doc(db, "users", user.uid, "folders", folderId), {
            chatIds: newIds
        })
    }, [user, folders])

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
        renameFolder,
        toggleFolderCollapse,
        expandFolders,
        resetAndExpandFolders,
        addChatsToFolder,
        removeChatFromFolder,
        updateChatMetadata,
        loading
    }
}
