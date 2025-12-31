import React, { useMemo, useState } from "react"
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
    searchQuery: string
}

// Icons extracted to prevent re-creation on render
const FolderIcon = () => (
    <svg fill="none" viewBox="0 0 24 24" width="20" height="20" className="plasmo-text-gray-500">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
)

// Replace the existing GreyFolderIcon component with this:
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
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
)

const PlusIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="currentColor" />
    </svg>
)

// AddChatModal import removed

export const FolderItem = ({
    folder,
    chats,
    metadata,
    isNewChatActive,
    currentChatId,
    onToggle,
    onInsertChat,
    onRenameChat,
    onDeleteFolder,
    onAddChat,
    onRemoveChat,
    searchQuery
}: FolderItemProps & { onDeleteFolder: (id: string) => void, onAddChat: (id: string) => void, onRemoveChat: (folderId: string, chatId: string) => void }) => {
    const [isHovered, setIsHovered] = useState(false)
    const [hoveredChatId, setHoveredChatId] = useState<string | null>(null)
    const [editingChatId, setEditingChatId] = useState<string | null>(null)
    const [editName, setEditName] = useState("")

    // Highlight Logic
    const isFolderMatch = useMemo(() => {
        if (!searchQuery) return false
        return folder.name.toLowerCase().includes(searchQuery.toLowerCase())
    }, [folder.name, searchQuery])

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

    // SAFETY: Handle legacy data where chatIds might be missing or named 'chats'
    const safeChatIds = folder.chatIds || (folder as any).chats || []

    const sortedChatIds = useMemo(() => {
        return [...safeChatIds].sort((a, b) => {
            const chatA = chats.find(c => c.id === a)
            const chatB = chats.find(c => c.id === b)
            const timeA = chatA?.timestamp || 0
            const timeB = chatB?.timestamp || 0
            return timeB - timeA
        })
    }, [safeChatIds, chats])

    const isCurrentChatInFolder = currentChatId && safeChatIds.includes(currentChatId)
    const showInsertButton = isHovered && (isNewChatActive || (currentChatId && !isCurrentChatInFolder))

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

                    {/* Add Chat Button removed */}

                    {/* Show Delete/Insert buttons only on hover */}
                    {isHovered && (
                        <>
                            {showInsertButton && (
                                <div
                                    className="plasmo-w-[20px] plasmo-h-[20px] plasmo-flex plasmo-items-center plasmo-justify-center plasmo-rounded-full hover:plasmo-bg-[#c8cdd6] plasmo-text-[#444746]"
                                    title="Insert current chat"
                                    role="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onInsertChat(folder.id)
                                    }}
                                >
                                    <ArrowLeft />
                                </div>
                            )}
                            {safeChatIds.length > 0 && (
                                <div
                                    className="plasmo-w-[20px] plasmo-h-[20px] plasmo-flex plasmo-items-center plasmo-justify-center plasmo-rounded-full hover:plasmo-bg-[#c8cdd6] plasmo-text-[#444746]"
                                    role="button"
                                    onClick={(e) => {
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

                    {/* Chevron always visible */}
                    <div className={folder.collapsed ? "" : "plasmo-rotate-180"}>
                        <ChevronDown />
                    </div>
                </div>
            </div>

            {/* Content (Chats) */}
            {
                !folder.collapsed && (
                    <div className="plasmo-flex plasmo-flex-col plasmo-gap-1 plasmo-mt-1">
                        {sortedChatIds.map((chatId) => {
                            const chat = chats.find((c) => c.id === chatId)
                            const meta = metadata[chatId]

                            const currentCustomName = meta?.customName || chat?.title || meta?.originalTitle || "Chat"
                            const originalTitle = chat?.title || meta?.originalTitle || "Unknown"
                            const dateDisplay = chat?.lastInteracted || meta?.lastInteracted || ""

                            const isActive = chatId === currentChatId
                            const isHovered = hoveredChatId === chatId

                            const isChatMatch = searchQuery && (
                                currentCustomName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                originalTitle.toLowerCase().includes(searchQuery.toLowerCase())
                            )

                            // Determine Class logic
                            // Active -> Blue (#d3e3fd)
                            // Match -> Grey (#e0e3eb)
                            // Default -> Hover Grey
                            let bgClass = "hover:plasmo-bg-[#e0e3eb]"
                            if (isActive) bgClass = "plasmo-bg-[#d3e3fd]"
                            else if (isChatMatch) bgClass = "plasmo-bg-[#e0e3eb]"

                            return (
                                <div
                                    key={chatId}
                                    onClick={() => {
                                        if (!isActive) {
                                            window.postMessage({
                                                type: "GEMINI_NAVIGATE_REQUEST",
                                                url: chat.url
                                            }, "*")
                                        }
                                    }}
                                    className={`plasmo-flex plasmo-items-start plasmo-py-1.5 plasmo-pl-[40px] plasmo-pr-2 plasmo-cursor-pointer plasmo-rounded-xl plasmo-group plasmo-transition-colors ${bgClass}`}
                                    onMouseEnter={() => setHoveredChatId(chatId)}
                                    onMouseLeave={() => setHoveredChatId(null)}
                                >
                                    <div
                                        className="plasmo-flex plasmo-flex-col plasmo-flex-1 plasmo-min-w-0"
                                    >
                                        {/* Row 1: Custom Name OR Input */}
                                        {editingChatId === chatId ? (
                                            <input
                                                autoFocus
                                                className="plasmo-bg-transparent plasmo-border-none plasmo-outline-none plasmo-text-[13px] plasmo-font-medium plasmo-text-[#1f1f1f] plasmo-w-full plasmo-p-0 plasmo-m-0"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveRename()
                                                    if (e.key === 'Escape') cancelRename()
                                                    e.stopPropagation()
                                                }}
                                                onBlur={saveRename}
                                                onClick={(e) => e.stopPropagation()}
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
                                            {dateDisplay && (
                                                <>
                                                    <span className="plasmo-mx-1">•</span>
                                                    <span className="plasmo-whitespace-nowrap plasmo-opacity-80">{dateDisplay}</span>
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
                                </div>
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

            {/* Add Chat Modal removed from here */}
        </div>
    )
}
