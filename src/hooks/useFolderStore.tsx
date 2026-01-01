import { useStorage } from "@plasmohq/storage/hook"
import { Storage } from "@plasmohq/storage"
import { useCallback } from "react"
import type { Folder, ChatMetadata, ScrapedChat } from "../types"

// Sync storage for user settings/folders (Cross-device)
const storage = new Storage({
    area: "sync"
})

// Local storage for heavy chat cache (Device-specific, high capacity)
const localStorage = new Storage({
    area: "local"
})

export const useFolderStore = () => {
    // Sync Storage State
    const [folders, setFolders] = useStorage<Folder[]>({
        key: "folders",
        instance: storage
    }, [])

    const [chatMetadata, setChatMetadata] = useStorage<Record<string, ChatMetadata>>({
        key: "chat-metadata",
        instance: storage
    }, {})

    // Local Storage State (Read/Write via this hook if needed, but primarily used by Scraper)
    const [cachedChats, setCachedChats] = useStorage<ScrapedChat[]>({
        key: "cached-chats",
        instance: localStorage
    }, [])

    const createFolder = useCallback(async (name: string, initialChatIds: string[] = []) => {
        const newFolder: Folder = {
            id: crypto.randomUUID(),
            name,
            chatIds: initialChatIds,
            collapsed: true
        }
        await setFolders((prev) => [...(prev || []), newFolder])
    }, [setFolders])

    const deleteFolder = useCallback(async (folderId: string) => {
        await setFolders((prev) => prev.filter((f) => f.id !== folderId))
    }, [setFolders])

    const renameFolder = useCallback(async (folderId: string, newName: string) => {
        await setFolders((prev) => prev.map((f) => (f.id === folderId ? { ...f, name: newName } : f)))
    }, [setFolders])

    const toggleFolderCollapse = useCallback(async (folderId: string, collapsed?: boolean) => {
        await setFolders((prev) => prev.map((f) => {
            if (f.id !== folderId) return f
            return { ...f, collapsed: collapsed ?? !f.collapsed }
        }))
    }, [setFolders])

    const expandFolders = useCallback(async (folderIds: string[]) => {
        await setFolders((prev) => prev.map((f) => {
            if (folderIds.includes(f.id)) {
                return { ...f, collapsed: false }
            }
            return f
        }))
    }, [setFolders])

    const addChatsToFolder = useCallback(async (folderId: string, chatIds: string[]) => {
        await setFolders((prev) => prev.map((f) => {
            if (f.id !== folderId) return f
            // dedicated set to avoid duplicates
            const newSet = new Set([...f.chatIds, ...chatIds])
            return { ...f, chatIds: Array.from(newSet) }
        }))
    }, [setFolders])

    const removeChatFromFolder = useCallback(async (folderId: string, chatId: string) => {
        await setFolders((prev) => prev.map((f) => {
            if (f.id !== folderId) return f
            return { ...f, chatIds: f.chatIds.filter(id => id !== chatId) }
        }))
    }, [setFolders])

    const updateChatMetadata = useCallback(async (id: string, meta: Partial<ChatMetadata>) => {
        await setChatMetadata((prev) => ({
            ...prev,
            [id]: { ...(prev?.[id] || { id, title: "", originalTitle: "" }), ...meta }
        }))
    }, [setChatMetadata])

    const resetAndExpandFolders = useCallback(async (targetFolderIds: string[]) => {
        await setFolders((prev) => {
            const safeFolders = Array.isArray(prev) ? prev : []
            return safeFolders.map((f) => ({
                ...f,
                collapsed: !targetFolderIds.includes(f.id)
            }))
        })
    }, [setFolders])

    return {
        folders,
        chatMetadata,
        cachedChats,
        createFolder,
        deleteFolder,
        renameFolder,
        toggleFolderCollapse,
        expandFolders,
        resetAndExpandFolders,
        addChatsToFolder,
        removeChatFromFolder,
        updateChatMetadata
    }
}

