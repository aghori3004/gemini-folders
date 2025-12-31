import React, { useState, useEffect, useMemo, useRef } from "react"
import { useFolderStore } from "~hooks/useFolderStore"
import { useChatScraper } from "~hooks/useChatScraper"
import { SearchBar } from "./SearchBar"
import { FolderList } from "./FolderList"
import { CreateFolderModal } from "./CreateFolderModal"
import { AddChatModal } from "./AddChatModal"
import type { ChatMetadata } from "~types"
import { FolderItem, GreyFolderIcon } from "./FolderItem" // Updated import

interface MainUIProps {
    paddingLeft?: number
    paddingRight?: number
}

export const MainUI = ({ paddingLeft = 24, paddingRight = 16 }: MainUIProps) => {
    // Stores
    const {
        folders,
        chatMetadata,
        createFolder,
        deleteFolder,
        toggleFolderCollapse,
        expandFolders,
        resetAndExpandFolders,
        addChatsToFolder,
        removeChatFromFolder,
        updateChatMetadata
    } = useFolderStore()

    const { chats } = useChatScraper()

    // Local State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [addChatFolderId, setAddChatFolderId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")

    // Derived State
    const isNewChat = window.location.pathname === "/app" || window.location.pathname === "/app/"
    const activeChat = chats.find(c => c.isActive) // Extract activeChat for easier access

    // Ref to track which chat we last auto-expanded for
    const lastExpandedChatIdRef = useRef<string | null>(null)

    // Auto-expand active folder (Exclusive Mode: Closes others)
    useEffect(() => {
        const safeFolders = folders || []

        if (activeChat) {
            // Only run if we haven't already processed this chat ID
            if (activeChat.id !== lastExpandedChatIdRef.current) {
                const containingFolderIds = safeFolders
                    .filter(f => f.chatIds.includes(activeChat.id))
                    .map(f => f.id)

                // Exclusive expand: Open these, close others
                resetAndExpandFolders(containingFolderIds)

                lastExpandedChatIdRef.current = activeChat.id
            }
        } else if (isNewChat) {
            // If on explicit new chat page and haven't reset yet
            if (lastExpandedChatIdRef.current !== "NEW_CHAT") {
                resetAndExpandFolders([]) // Close all
                lastExpandedChatIdRef.current = "NEW_CHAT"
            }
        }
    }, [activeChat, isNewChat, folders, resetAndExpandFolders])

    // Filtered Folders (Search)
    const filteredFolders = useMemo(() => {
        if (!folders || !Array.isArray(folders)) return []
        if (!searchQuery) return folders
        const query = searchQuery.toLowerCase()
        return folders.filter(folder => {
            // 1. Check Folder Name
            if (folder.name.toLowerCase().includes(query)) return true
            // 2. Check Chats inside this folder
            // We need to check if ANY chat in this folder matches the query
            // based on Real Title, Original Title, or Custom Name.
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
    }, [folders, searchQuery, chats, chatMetadata])

    // Handlers
    const [isSearchOpen, setIsSearchOpen] = useState(false)

    // Handlers
    const handleCreateFolder = (name: string, selectedChatIds: string[]) => {
        createFolder(name, selectedChatIds)
        // Update metadata for selected chats if needed
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

        // 1. Handle Adds
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

        // 2. Handle Removes
        if (removedChatIds.length > 0) {
            removedChatIds.forEach(id => {
                removeChatFromFolder(addChatFolderId, id)
            })
        }

        setAddChatFolderId(null)
    }

    const handleInsertCurrentChat = (folderId: string) => {
        const activeChat = chats.find(c => c.isActive)
        const chatId = activeChat?.id

        if (!chatId) {
            alert("Cannot insert an empty new chat. Please send a message first.")
            return
        }

        addChatsToFolder(folderId, [chatId])
        updateChatMetadata(chatId, {
            originalTitle: activeChat?.title || "Chat",
            lastInteracted: activeChat?.lastInteracted
        })
    }

    const handleDeleteFolder = (id: string) => {
        if (window.confirm("Are you sure you want to delete this folder?")) {
            deleteFolder(id)
        }
    }

    // Toggle search
    const toggleSearch = () => {
        if (isSearchOpen) {
            setSearchQuery("")
            setIsSearchOpen(false)
        } else {
            setIsSearchOpen(true)
        }
    }

    // Replace the return (...) block with this:
    // Replace the return (...) block with this:
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
                        // HEADER: Icon + Text
                        // We use gap-3 (12px) to match FolderItem's spacing
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
                currentChatId={activeChat?.id}
                onToggle={id => toggleFolderCollapse(id)}
                onInsertChat={handleInsertCurrentChat}
                onAddChat={(folderId) => setAddChatFolderId(folderId)}
                onRenameChat={(id, name) => updateChatMetadata(id, { customName: name })}
                onDeleteFolder={handleDeleteFolder}
                onRemoveChat={(folderId, chatId) => removeChatFromFolder(folderId, chatId)}
                searchQuery={searchQuery}
            />
            {/* ... Modals (CreateFolderModal, AddChatModal) ... */}
            <CreateFolderModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreateFolder}
                availableChats={chats}
                existingNames={folders?.map(f => f.name) || []}
            />

            <AddChatModal
                isOpen={!!addChatFolderId}
                onClose={() => setAddChatFolderId(null)}
                onUpdate={handleManageChats}
                availableChats={chats}
                folderName={folders?.find(f => f.id === addChatFolderId)?.name || ""}
                existingChatIds={folders?.find(f => f.id === addChatFolderId)?.chatIds || []}
            />
        </div>
    )
}
