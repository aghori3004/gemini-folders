import React, { useMemo, useState, useEffect, useRef } from "react"
import type { ChatMetadata, Folder, ScrapedChat } from "~types"

interface FolderItemProps {
    folder: Folder
    chats: ScrapedChat[]
    metadata: Record<string, ChatMetadata>
    isNewChatActive: boolean
    currentChatId?: string
    onToggle: (id: string) => void
    onInsertChat: (folderId: string) => void
    onRenameChat: (chatId: string, newName: string) => void
    onDeleteFolder: (id: string) => void
    onAddChat: (id: string) => void
    onRemoveChat: (folderId: string, chatId: string) => void
    searchQuery: string
}


export const GreyFolderIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="plasmo-text-[#444746]">
        <path d="M4 19.5C3.45 19.5 2.97917 19.3042 2.5875 18.9125C2.19583 18.5208 2 18.05 2 17.5V6.5C2 5.95 2.19583 5.47917 2.5875 5.0875C2.97917 4.69583 3.45 4.5 4 4.5H9.5L11.5 6.5H20C20.55 6.5 21.0208 6.69583 21.4125 7.0875C21.8042 7.47917 22 7.95 22 8.5V17.5C22 18.05 21.8042 18.5208 21.4125 18.9125C21.0208 19.3042 20.55 19.5 20 19.5H4ZM4 17.5H20V8.5H10.675L8.675 6.5H4V17.5Z" fill="currentColor" />
    </svg>
)

const ChevronDown = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 14.975L6.675 9.65L8.075 8.25L12 12.175L15.925 8.25L17.325 9.65L12 14.975Z" fill="#444746" />
    </svg>
)

// Left arrow for "Insert here"
const ArrowLeft = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M10 18L4 12L10 6L11.4 7.4L7.8 11H20V13H7.8L11.4 16.6L10 18Z" fill="#444746" />
    </svg>
)

const PencilIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
)

const PlusIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="currentColor" />
    </svg>
)

export const FolderItem = ({
    folder,
    chats,
    metadata,
    isNewChatActive, // Legacy (can use currentChatId checks)
    currentChatId,
    onToggle,
    onInsertChat,
    onRenameChat,
    onDeleteFolder,
    onAddChat,
    onRemoveChat,
    searchQuery
}: FolderItemProps) => {
    const [isHovered, setIsHovered] = useState(false)
    const [hoveredChatId, setHoveredChatId] = useState<string | null>(null)
    const [editingChatId, setEditingChatId] = useState<string | null>(null)
    const [editName, setEditName] = useState("")

    // Safety: Handle potential missing chatIds
    const safeChatIds = folder.chatIds || []

    const isFolderMatch = useMemo(() => {
        if (!searchQuery) return false
        return folder.name.toLowerCase().includes(searchQuery.toLowerCase())
    }, [folder.name, searchQuery])

    // Should this folder be open?
    // 1. If not collapsed in DB
    // 2. OR if searchQuery is present (Force Open to show matches)
    const isOpen = !folder.collapsed || !!searchQuery

    // Renaming Handlers
    const startRenaming = (chatId: string, currentName: string) => {
        setEditingChatId(chatId)
        setEditName(currentName)
    }

    const saveRename = () => {
        if (editingChatId && editName.trim()) {
            onRenameChat(editingChatId, editName.trim())
        }
        setEditingChatId(null)
        setEditName("")
    }

    const cancelRename = () => {
        setEditingChatId(null)
        setEditName("")
    }

    const sortedChatIds = useMemo(() => {
        return [...safeChatIds].sort((a, b) => {
            const chatA = chats.find(c => c.id === a)
            const chatB = chats.find(c => c.id === b)
            const timeA = chatA?.timestamp || 0
            const timeB = chatB?.timestamp || 0
            return timeB - timeA
        })
    }, [safeChatIds, chats])

    // "Insert Here" Logic: Active Chat exists AND is NOT in this folder
    const isCurrentChatInFolder = currentChatId && safeChatIds.includes(currentChatId)
    const canInsertCurrentChat = currentChatId && !isCurrentChatInFolder
    const showInsertButton = isHovered && canInsertCurrentChat

    return (
        <div className="plasmo-flex plasmo-flex-col plasmo-mb-1">
            {/* Header */}
            <div
                className={`plasmo-flex plasmo-items-center plasmo-justify-between plasmo-h-[32px] plasmo-cursor-pointer plasmo-rounded-full plasmo-transition-colors plasmo-group plasmo-pl-[6px] plasmo-pr-2 ${isFolderMatch ? "plasmo-bg-[#e0e3eb]" : "hover:plasmo-bg-[#e0e3eb]"}`}
                onClick={() => onToggle(folder.id)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div className="plasmo-flex plasmo-items-center plasmo-gap-[14px] plasmo-flex-1 plasmo-overflow-hidden">
                    <GreyFolderIcon />
                    <span
                        className="plasmo-text-[14px] plasmo-font-medium plasmo-text-[#1f1f1f] plasmo-truncate"
                        title={folder.name}
                    >
                        {folder.name}
                    </span>
                </div>

                <div className="plasmo-flex plasmo-items-center plasmo-gap-1">
                    {/* Hover Actions */}
                    {isHovered && (
                        <>
                            {showInsertButton && (
                                <div
                                    className="plasmo-w-[20px] plasmo-h-[20px] plasmo-flex plasmo-items-center plasmo-justify-center plasmo-rounded-full hover:plasmo-bg-[#c8cdd6] plasmo-text-[#444746]"
                                    title="Insert current chat"
                                    role="button"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        onInsertChat(folder.id)
                                    }}
                                >
                                    <ArrowLeft />
                                </div>
                            )}

                            {/* Always show Add Chat if not inserting */}
                            {(!showInsertButton || safeChatIds.length > 0) && (
                                <div
                                    className="plasmo-w-[20px] plasmo-h-[20px] plasmo-flex plasmo-items-center plasmo-justify-center plasmo-rounded-full hover:plasmo-bg-[#c8cdd6] plasmo-text-[#444746]"
                                    role="button"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        onAddChat(folder.id)
                                    }}
                                    title="Add chat"
                                >
                                    <PlusIcon />
                                </div>
                            )}

                            <div
                                className="plasmo-w-[20px] plasmo-h-[20px] plasmo-flex plasmo-items-center plasmo-justify-center plasmo-rounded-full hover:plasmo-bg-[#c8cdd6] plasmo-text-[#444746]"
                                role="button"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    onDeleteFolder(folder.id)
                                }}
                                title="Delete folder"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor" />
                                </svg>
                            </div>
                        </>
                    )}

                    <div className={folder.collapsed ? "" : "plasmo-rotate-180"}>
                        <ChevronDown />
                    </div>
                </div>
            </div>

            {/* Content (Chats) */}
            {
                isOpen && (
                    <div className="plasmo-flex plasmo-flex-col plasmo-gap-1 plasmo-mt-1">
                        {sortedChatIds.map((chatId) => {
                            const chat = chats.find((c) => c.id === chatId)
                            const meta = metadata[chatId]

                            const currentCustomName = meta?.customName || chat?.title || meta?.originalTitle || "Chat"
                            const originalTitle = chat?.title || meta?.originalTitle || "Unknown"
                            // Format the date: usage of new "dateAdded" freezer field with fallback
                            // We need a helper for relative time if we are using raw timestamps
                            const formatRelativeDate = (timestamp: number | string) => {
                                if (!timestamp) return ""
                                const date = new Date(timestamp)
                                const now = new Date()
                                const diff = now.getTime() - date.getTime()
                                const days = Math.floor(diff / (1000 * 60 * 60 * 24))

                                if (days === 0) return "Today"
                                if (days === 1) return "Yesterday"
                                if (days < 7) return `${days}d ago`
                                return date.toLocaleDateString()
                            }

                            const displayDate = chat?.lastInteracted || formatRelativeDate(chat?.timestamp)

                            const isActive = chatId === currentChatId
                            const isHovered = hoveredChatId === chatId

                            const isChatMatch = searchQuery && (
                                currentCustomName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                originalTitle.toLowerCase().includes(searchQuery.toLowerCase())
                            )

                            // Visual Pills Logic
                            // Active -> Blue (#d3e3fd)
                            // Search Match (inactive) -> Grey (#e0e3eb)
                            // Hover -> Standard Hover Grey
                            let bgClass = "hover:plasmo-bg-[#e0e3eb]"
                            if (isActive) bgClass = "plasmo-bg-[#d3e3fd]"
                            else if (isChatMatch) bgClass = "plasmo-bg-[#e0e3eb]"

                            return (
                                <a
                                    key={chatId}
                                    href={chat?.url}
                                    className={`plasmo-flex plasmo-items-start plasmo-py-1.5 plasmo-pl-[40px] plasmo-pr-2 plasmo-cursor-pointer plasmo-rounded-xl plasmo-group plasmo-transition-colors plasmo-no-underline ${bgClass}`}
                                    onMouseEnter={() => setHoveredChatId(chatId)}
                                    onMouseLeave={() => setHoveredChatId(null)}
                                    onClick={(e) => {
                                        if (isActive) {
                                            e.preventDefault()
                                        }
                                    }}
                                >
                                    <div
                                        className="plasmo-flex plasmo-flex-col plasmo-flex-1 plasmo-min-w-0"
                                    >
                                        {/* Row 1: Custom Name OR Input */}
                                        {editingChatId === chatId ? (
                                            <input
                                                autoFocus
                                                onFocus={(e) => e.target.select()}
                                                className="plasmo-bg-transparent plasmo-border-none plasmo-outline-none plasmo-text-[13px] plasmo-font-medium plasmo-text-[#1f1f1f] plasmo-w-full plasmo-p-0 plasmo-m-0"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveRename()
                                                    if (e.key === 'Escape') cancelRename()
                                                    e.stopPropagation()
                                                }}
                                                onBlur={saveRename}
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    e.stopPropagation()
                                                }}
                                            />
                                        ) : (
                                            <span
                                                className={`plasmo-text-[13px] plasmo-font-medium plasmo-truncate ${isActive ? 'plasmo-text-[#0842a0]' : 'plasmo-text-[#1f1f1f]'}`}
                                                title={currentCustomName}
                                            >
                                                {currentCustomName}
                                            </span>
                                        )}

                                        {/* Row 2: Secondary Info */}
                                        <div className="plasmo-flex plasmo-items-center plasmo-text-[10px] plasmo-text-[#444746] plasmo-truncate plasmo-w-full">
                                            <span className="plasmo-truncate plasmo-max-w-[120px]" title={originalTitle}>
                                                {originalTitle}
                                            </span>
                                            {displayDate && (
                                                <>
                                                    <span className="plasmo-mx-1">•</span>
                                                    <span className="plasmo-whitespace-nowrap plasmo-opacity-80">{displayDate}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions Group (Visible on Hover & Not Editing) */}
                                    {isHovered && editingChatId !== chatId && (
                                        <div className="plasmo-flex plasmo-items-center plasmo-gap-1 plasmo-pl-2 plasmo-self-center">
                                            {/* Edit Button */}
                                            <div
                                                className="plasmo-w-[20px] plasmo-h-[20px] plasmo-flex plasmo-items-center plasmo-justify-center plasmo-rounded-full hover:plasmo-bg-[#c8cdd6] plasmo-text-[#444746]"
                                                role="button"
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    e.stopPropagation()
                                                    startRenaming(chatId, currentCustomName)
                                                }}
                                                title="Rename chat"
                                            >
                                                <PencilIcon />
                                            </div>

                                            {/* Delete Button */}
                                            <div
                                                className="plasmo-w-[20px] plasmo-h-[20px] plasmo-flex plasmo-items-center plasmo-justify-center plasmo-rounded-full hover:plasmo-bg-[#c8cdd6] plasmo-text-[#444746]"
                                                role="button"
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    e.stopPropagation()
                                                    onRemoveChat(folder.id, chatId)
                                                }}
                                                title="Remove chat from folder"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor" />
                                                </svg>
                                            </div>
                                        </div>
                                    )}
                                </a>
                            )
                        })}
                        {safeChatIds.length === 0 && (
                            <div className="plasmo-pl-10 plasmo-text-[12px] plasmo-text-gray-400 plasmo-italic plasmo-py-1">
                                Empty folder
                            </div>
                        )}
                        {safeChatIds.length === 0 && (
                            <div
                                className="plasmo-flex plasmo-items-center plasmo-h-[28px] plasmo-pl-[56px] plasmo-pr-2 plasmo-cursor-pointer hover:plasmo-bg-[#e0e3eb] plasmo-rounded-full plasmo-text-[13px] plasmo-text-[#444746] plasmo-mt-1"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    onAddChat(folder.id)
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="plasmo-mr-2">
                                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor" />
                                </svg>
                                Add chat
                            </div>
                        )}
                    </div>
                )
            }
        </div>
    )
}
