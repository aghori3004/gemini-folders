import React from "react"
import type { ChatMetadata, Folder, ScrapedChat } from "~types"
import { FolderItem } from "./FolderItem"

interface FolderListProps {
    folders: Folder[]
    allChats: ScrapedChat[]
    metadata: Record<string, ChatMetadata>
    isNewChatActive: boolean
    currentChatId?: string
    onToggle: (id: string) => void
    onInsertChat: (folderId: string) => void
    onRenameChat: (chatId: string, newName: string) => void
    onDeleteFolder: (id: string) => void
    onAddChat: (folderId: string) => void
    onRemoveChat: (folderId: string, chatId: string) => void
    searchQuery: string
}

export const FolderList = React.memo(({
    folders,
    allChats,
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
}: FolderListProps) => {

    // Sort folders by creation or custom order (currently just array order)
    return (
        <div className="plasmo-flex plasmo-flex-col">
            {folders.map(folder => {
                // Filter chats belonging to this folder
                const folderChats = allChats.filter(c => folder.chatIds.includes(c.id))
                return (
                    <FolderItem
                        key={folder.id}
                        folder={folder}
                        chats={folderChats}
                        metadata={metadata}
                        isNewChatActive={isNewChatActive}
                        currentChatId={currentChatId}
                        onToggle={onToggle}
                        onInsertChat={onInsertChat}
                        onRenameChat={onRenameChat}
                        onDeleteFolder={onDeleteFolder}
                        onAddChat={onAddChat}
                        onRemoveChat={onRemoveChat}
                        searchQuery={searchQuery}
                    />
                )
            })}
        </div>
    )
})
