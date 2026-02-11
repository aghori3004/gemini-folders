import React, { useState, useEffect, useMemo, useRef } from "react"
import { useFolderStore } from "~hooks/useFolderStore"
import { useChatScraper } from "~hooks/useChatScraper"
import { useAuth } from "~hooks/useAuth"
import { FolderList } from "./FolderList"
import { CreateFolderModal } from "./CreateFolderModal"
import { AddChatModal } from "./AddChatModal"

interface MainUIProps {
    paddingLeft?: number
    paddingRight?: number
}

export const MainUI = ({ paddingLeft = 24, paddingRight = 16 }: MainUIProps) => {
    // Auth
    const { user, loading: authLoading, login } = useAuth()

    // Stores
    const {
        folders,
        chatMetadata,
        createFolder,
        deleteFolder,
        toggleFolderCollapse,
        resetAndExpandFolders,
        addChatsToFolder,
        removeChatFromFolder,
        updateChatMetadata,
        firestoreError
    } = useFolderStore()

    const { chats, activeChatId, startDeepScroll, stopDeepScroll, scrollToTop, isDeepScrolling } = useChatScraper()

    // Local State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [addChatFolderId, setAddChatFolderId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)



    // Derived State
    const activeChat = chats.find(c => c.id === activeChatId)
    const isNewChat = activeChatId === null || activeChatId === undefined || window.location.pathname.endsWith("/app")

    // Ref to track which chat we last auto-expanded for
    const lastExpandedChatIdRef = useRef<string | null>(null)

    // Navigation: Auto-expand active folder
    useEffect(() => {
        if (!user) return

        // If we are on /app (no active chat), explicitly DO NOTHING.
        // This allows the folders to maintain the exact open/closed state 
        // from the user's previous session via Firestore.
        if (!activeChatId) {
            lastExpandedChatIdRef.current = null
            return
        }

        const safeFolders = folders || []

        // If the active chat changed (via native sidebar click or custom folder click)
        if (activeChatId !== lastExpandedChatIdRef.current) {
            lastExpandedChatIdRef.current = activeChatId

            // Find all folders containing this specific chat
            const foldersToOpen = safeFolders
                .filter(f => f.chatIds.includes(activeChatId))
                .map(f => f.id)

            // This atomic batch write will open the matched folders AND close all others.
            // If foldersToOpen is empty, it will correctly close everything.
            resetAndExpandFolders(foldersToOpen)
        }
    }, [activeChatId, folders, resetAndExpandFolders, user])

    // Handlers
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")

    // Debounce Search - Wait 300ms after last keystroke
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    // Filtered Folders (Search)
    const filteredFolders = useMemo(() => {
        if (!folders || !Array.isArray(folders)) return []
        if (!debouncedSearchQuery) return folders
        const query = debouncedSearchQuery.toLowerCase()
        return folders.filter(folder => {
            // 1. Check Folder Name
            if (folder.name.toLowerCase().includes(query)) return true
            // 2. Check Chats inside this folder
            return folder.chatIds.some(chatId => {
                const chat = chats.find(c => c.id === chatId)
                const meta = chatMetadata[chatId]
                const realTitle = chat?.title || ""
                const originalTitle = meta?.originalTitle || ""
                const customName = meta?.customName || ""
                return (
                    realTitle.toLowerCase().includes(query) ||
                    originalTitle.toLowerCase().includes(query) ||
                    customName.toLowerCase().includes(query)
                )
            })
        })
    }, [folders, debouncedSearchQuery, chats, chatMetadata])

    // Handlers
    const handleCreateFolder = (name: string, selectedChatIds: string[]) => {
        createFolder(name, selectedChatIds)
        selectedChatIds.forEach(id => {
            const chat = chats.find(c => c.id === id)
            if (chat) {
                updateChatMetadata(id, {
                    originalTitle: chat.title,
                    lastInteracted: chat.lastInteracted
                })
            }
        })
    }

    const handleManageChats = (addedChatIds: string[], removedChatIds: string[]) => {
        if (!addChatFolderId) return

        if (addedChatIds.length > 0) {
            addChatsToFolder(addChatFolderId, addedChatIds)
            addedChatIds.forEach(id => {
                const chat = chats.find(c => c.id === id)
                if (chat) {
                    updateChatMetadata(id, {
                        originalTitle: chat.title,
                        lastInteracted: chat.lastInteracted
                    })
                }
            })
        }

        if (removedChatIds.length > 0) {
            removedChatIds.forEach(id => {
                removeChatFromFolder(addChatFolderId, id)
            })
        }
        setAddChatFolderId(null)
    }

    const handleInsertCurrentChat = (folderId: string) => {
        if (!activeChatId) {
            // Brief non-blocking toast (content scripts can't use alert())
            const toast = document.createElement('div')
            toast.textContent = 'Please open a chat first.'
            toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#323232;color:#fff;padding:8px 16px;border-radius:8px;font-size:13px;z-index:99999;'
            document.body.appendChild(toast)
            setTimeout(() => toast.remove(), 2500)
            return
        }
        addChatsToFolder(folderId, [activeChatId])
        const chat = chats.find(c => c.id === activeChatId)
        updateChatMetadata(activeChatId, {
            originalTitle: chat?.title || "Chat",
            lastInteracted: chat?.lastInteracted
        })
    }

    const handleDeleteFolder = (id: string) => {
        setConfirmDeleteId(id)
    }

    const confirmDelete = () => {
        if (confirmDeleteId) {
            deleteFolder(confirmDeleteId)
            setConfirmDeleteId(null)
        }
    }

    const cancelDelete = () => {
        setConfirmDeleteId(null)
    }

    const toggleSearch = () => {
        if (isSearchOpen) {
            setSearchQuery("")
            setIsSearchOpen(false)
        } else {
            setIsSearchOpen(true)
        }
    }

    const handleOpenPopup = () => {
        // Send message to background to open the extension popup
        chrome.runtime.sendMessage({ action: "openPopup" })
    }

    // --- RENDER ---

    if (authLoading) {
        return (
            <div className="plasmo-flex plasmo-items-center plasmo-justify-center plasmo-py-8">
                <div className="plasmo-animate-spin plasmo-rounded-full plasmo-h-6 plasmo-w-6 plasmo-border-b-2 plasmo-border-blue-500"></div>
            </div>
        )
    }

    if (firestoreError && user) {
        return (
            <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-p-4 plasmo-mt-4">
                <div className="plasmo-bg-[#2b2b2f] plasmo-p-4 plasmo-rounded-xl plasmo-text-center plasmo-w-full">
                    <p className="plasmo-text-gray-400 plasmo-text-xs plasmo-mb-3">{firestoreError}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="plasmo-bg-[#8ab4f8] plasmo-text-[#1f1f1f] plasmo-px-4 plasmo-py-1.5 plasmo-rounded-full plasmo-font-medium plasmo-text-xs hover:plasmo-bg-[#aecbfa] plasmo-transition plasmo-border-none plasmo-cursor-pointer"
                    >
                        Reload Page
                    </button>
                </div>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-p-6 plasmo-mt-8">
                <div className="plasmo-bg-[#1e1f20] plasmo-p-5 plasmo-rounded-xl plasmo-text-center plasmo-shadow-lg plasmo-w-full">
                    <div className="plasmo-flex plasmo-justify-center plasmo-mb-3">
                        <div className="plasmo-h-10 plasmo-w-10 plasmo-bg-blue-600 plasmo-rounded-xl plasmo-flex plasmo-items-center plasmo-justify-center plasmo-text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="plasmo-w-5 plasmo-h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                            </svg>
                        </div>
                    </div>
                    <h2 className="plasmo-text-white plasmo-text-base plasmo-font-medium plasmo-mb-2">Gemini Folders</h2>
                    <p className="plasmo-text-gray-400 plasmo-text-xs plasmo-mb-4">Sign in to organize your chats into folders</p>
                    <button
                        onClick={handleOpenPopup}
                        className="plasmo-bg-[#8ab4f8] plasmo-text-[#1f1f1f] plasmo-px-4 plasmo-py-2 plasmo-rounded-full plasmo-font-medium plasmo-text-xs hover:plasmo-bg-[#aecbfa] plasmo-transition plasmo-w-full"
                    >
                        Open Extension to Sign In
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div
            className="plasmo-w-full plasmo-flex plasmo-flex-col plasmo-font-sans"
            style={{
                color: '#1f1f1f',
                marginTop: "16px",
                marginBottom: "0px",
                paddingLeft: `${paddingLeft}px`,
                paddingRight: `${paddingRight}px`
            }}
        >
            {/* Header */}
            <div
                className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-group plasmo-relative"
                style={{
                    height: "32px", // Native row height
                    marginBottom: "4px"
                }}
            >
                {/* Title Section */}
                <div className="plasmo-flex plasmo-items-center plasmo-flex-1 plasmo-overflow-hidden">
                    {isSearchOpen ? (
                        <div className="plasmo-flex plasmo-items-center plasmo-w-full plasmo-bg-[#f0f4f9] plasmo-rounded-full plasmo-h-[32px] plasmo-px-3 plasmo-mr-2">
                            <input
                                autoFocus
                                className="plasmo-bg-transparent plasmo-border-none plasmo-outline-none plasmo-text-[13px] plasmo-text-[#1f1f1f] plasmo-w-full"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onBlur={() => {
                                    if (!searchQuery) setIsSearchOpen(false)
                                }}
                            />
                        </div>
                    ) : (
                        <div className="plasmo-flex plasmo-items-center plasmo-gap-3">
                            <span className="plasmo-text-[14px] plasmo-font-medium plasmo-text-[#1f1f1f] plasmo-select-none">
                                Folders
                            </span>
                        </div>
                    )}
                </div>

                {/* Actions (Aligned to Right) */}
                <div className="plasmo-flex plasmo-items-center">
                    <button
                        type="button"
                        className={`plasmo-flex plasmo-items-center plasmo-justify-center 
                         plasmo-w-[32px] plasmo-h-[32px] plasmo-rounded-full 
                         plasmo-text-[#444746] hover:plasmo-text-[#1f1f1f] 
                         plasmo-cursor-pointer plasmo-border-none plasmo-bg-transparent
                         plasmo-transition-colors plasmo-duration-200
                         hover:plasmo-bg-[#e0e3eb] ${isSearchOpen ? 'plasmo-bg-[#e0e3eb]' : ''}`}
                        onClick={toggleSearch}
                        onMouseDown={(e) => e.preventDefault()}
                        title="Search folders"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M15.5 14H14.71L14.43 13.73C15.41 12.59 16 11.11 16 9.5C16 5.91 13.09 3 9.5 3C5.91 3 3 5.91 3 9.5C3 13.09 5.91 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.49L20.49 19L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5C5 7.01 7.01 5 9.5 5C11.99 5 14 7.01 14 9.5C14 11.99 11.99 14 9.5 14Z" fill="currentColor" />
                        </svg>
                    </button>

                    <button
                        type="button"
                        className="plasmo-flex plasmo-items-center plasmo-justify-center 
                         plasmo-w-[32px] plasmo-h-[32px] plasmo-rounded-full 
                         plasmo-text-[#444746] hover:plasmo-text-[#1f1f1f] 
                         plasmo-cursor-pointer plasmo-border-none plasmo-bg-transparent
                         plasmo-transition-colors plasmo-duration-200
                         hover:plasmo-bg-[#e0e3eb] plasmo-ml-1"
                        title="Create new folder"
                        onClick={() => setIsCreateModalOpen(true)}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="currentColor" />
                        </svg>
                    </button>
                </div>
            </div>

            <FolderList
                folders={filteredFolders}
                allChats={chats}
                metadata={chatMetadata || {}}
                isNewChatActive={isNewChat}
                currentChatId={activeChatId}
                onToggle={id => toggleFolderCollapse(id)}
                onInsertChat={handleInsertCurrentChat}
                onAddChat={(folderId) => setAddChatFolderId(folderId)}
                onRenameChat={(id, name) => updateChatMetadata(id, { customName: name })}
                onDeleteFolder={handleDeleteFolder}
                onRemoveChat={(folderId, chatId) => removeChatFromFolder(folderId, chatId)}
                searchQuery={searchQuery}
            />

            <CreateFolderModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreateFolder}
                availableChats={chats}
                existingNames={folders?.map(f => f.name) || []}
                startDeepScroll={startDeepScroll}
                stopDeepScroll={stopDeepScroll}
                scrollToTop={scrollToTop}
                isDeepScrolling={isDeepScrolling}
            />

            <AddChatModal
                isOpen={!!addChatFolderId}
                onClose={() => setAddChatFolderId(null)}
                onUpdate={handleManageChats}
                availableChats={chats}
                folderName={folders?.find(f => f.id === addChatFolderId)?.name || ""}
                existingChatIds={folders?.find(f => f.id === addChatFolderId)?.chatIds || []}
                startDeepScroll={startDeepScroll}
                stopDeepScroll={stopDeepScroll}
                scrollToTop={scrollToTop}
                isDeepScrolling={isDeepScrolling}
            />

            {/* Delete Confirmation Dialog */}
            {confirmDeleteId && (
                <div
                    className="plasmo-fixed plasmo-inset-0 plasmo-flex plasmo-items-center plasmo-justify-center plasmo-z-[99999]"
                    style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
                    onClick={cancelDelete}
                >
                    <div
                        className="plasmo-bg-[#2b2b2f] plasmo-rounded-2xl plasmo-p-6 plasmo-shadow-xl plasmo-max-w-[300px] plasmo-w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="plasmo-text-white plasmo-text-sm plasmo-font-medium plasmo-mb-2">Delete folder?</h3>
                        <p className="plasmo-text-gray-400 plasmo-text-xs plasmo-mb-5">This will remove the folder but not the chats themselves.</p>
                        <div className="plasmo-flex plasmo-justify-end plasmo-gap-2">
                            <button
                                onClick={cancelDelete}
                                className="plasmo-px-4 plasmo-py-2 plasmo-rounded-full plasmo-text-xs plasmo-text-gray-300 hover:plasmo-bg-[#3c3c42] plasmo-border-none plasmo-bg-transparent plasmo-cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="plasmo-px-4 plasmo-py-2 plasmo-rounded-full plasmo-text-xs plasmo-text-white plasmo-bg-[#c53929] hover:plasmo-bg-[#d94234] plasmo-border-none plasmo-cursor-pointer"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
