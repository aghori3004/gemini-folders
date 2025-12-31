import React, { useState, useMemo, useRef, useEffect } from "react"
import type { ScrapedChat } from "~types"
import { useChatScraper } from "~hooks/useChatScraper"

interface CreateFolderModalProps {
    isOpen: boolean
    onClose: () => void
    onCreate: (name: string, selectedChatIds: string[]) => void
    availableChats: ScrapedChat[]
    existingNames: string[]
}

export const CreateFolderModal = ({ isOpen, onClose, onCreate, availableChats, existingNames }: CreateFolderModalProps) => {
    const [name, setName] = useState("")
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    // Search removed as per UX requirement
    const { loadMoreChats, scrollToTop } = useChatScraper() // Ensure this matches the function name exported from your hook
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const prevCountRef = useRef(availableChats.length)

    useEffect(() => {
        if (isLoadingMore && availableChats.length > prevCountRef.current) {
            setIsLoadingMore(false)
        }
        prevCountRef.current = availableChats.length
    }, [availableChats.length, isLoadingMore])


    const nameExists = existingNames.some(n => n.toLowerCase() === name.trim().toLowerCase())
    const isValid = name.trim().length > 0 && !nameExists

    // Filter logic removed - using availableChats directly

    const toggleChat = (id: string) => {
        const newSet = new Set(selectedIds)
        if (newSet.has(id)) {
            newSet.delete(id)
        } else {
            newSet.add(id)
        }
        setSelectedIds(newSet)
    }

    const handleClose = () => {
        scrollToTop()
        onClose()
    }

    const handleCreate = () => {
        if (!isValid) return
        onCreate(name.trim(), Array.from(selectedIds))
        setName("")
        setSelectedIds(new Set())
        handleClose()
    }

    // Conditional return MUST be after all hooks (useState, useMemo)
    if (!isOpen) return null

    return (
        <div className="plasmo-fixed plasmo-inset-0 plasmo-z-[9999] plasmo-flex plasmo-items-center plasmo-justify-center plasmo-bg-black/40">
            <div className="plasmo-bg-white plasmo-rounded-[20px] plasmo-w-[320px] plasmo-max-h-[85vh] plasmo-flex plasmo-flex-col plasmo-shadow-xl plasmo-overflow-hidden">
                {/* Header */}
                <div className="plasmo-px-4 plasmo-pt-4 plasmo-pb-2">
                    <h2 className="plasmo-text-[16px] plasmo-text-[#1f1f1f] plasmo-font-medium">New folder</h2>
                </div>

                {/* Content */}
                <div className="plasmo-px-4 plasmo-flex plasmo-flex-col plasmo-flex-1 plasmo-overflow-hidden">
                    {/* Name Input */}
                    <div className="plasmo-mb-4">
                        <div className={`plasmo-bg-[#f0f4f9] plasmo-h-[48px] plasmo-rounded-[4px] plasmo-flex plasmo-flex-col plasmo-px-3 plasmo-justify-center plasmo-border-b-2 ${nameExists ? "plasmo-border-red-500" : "plasmo-border-[#0b57d0]"}`}>
                            <label className={`plasmo-text-[11px] ${nameExists ? "plasmo-text-red-500" : "plasmo-text-[#0b57d0]"}`}>Name</label>
                            <input
                                autoFocus
                                className="plasmo-bg-transparent plasmo-border-none plasmo-outline-none plasmo-text-[14px] plasmo-text-[#1f1f1f]"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Folder name"
                            />
                        </div>
                        {nameExists && <span className="plasmo-text-[11px] plasmo-text-red-500 plasmo-mt-1">Name already exists</span>}
                    </div>

                    <div className="plasmo-text-[12px] plasmo-font-medium plasmo-text-[#1f1f1f] plasmo-mb-2">
                        Add chats
                    </div>

                    {/* Search removed here */}

                    {/* Chat List */}
                    <div className="plasmo-flex-1 plasmo-overflow-y-auto plasmo-min-h-[150px] plasmo-max-h-[250px] plasmo-mb-4">
                        {availableChats.map(chat => (
                            <div
                                key={chat.id}
                                className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-py-2 plasmo-px-2 plasmo-cursor-pointer hover:plasmo-bg-[#f0f4f9] plasmo-rounded-lg"
                                onClick={() => toggleChat(chat.id)}
                            >
                                <div className="plasmo-flex plasmo-flex-col plasmo-flex-1 plasmo-mr-2 plasmo-overflow-hidden">
                                    <span className="plasmo-text-[13px] plasmo-text-[#1f1f1f] plasmo-truncate">{chat.title}</span>
                                    <span className="plasmo-text-[11px] plasmo-text-[#444746]">{chat.lastInteracted}</span>
                                </div>
                                <div className={`plasmo-w-4 plasmo-h-4 plasmo-border-2 plasmo-rounded-sm plasmo-flex plasmo-items-center plasmo-justify-center ${selectedIds.has(chat.id) ? "plasmo-bg-[#0b57d0] plasmo-border-[#0b57d0]" : "plasmo-border-[#444746]"}`}>
                                    {selectedIds.has(chat.id) && (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                            <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="white" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Load More Button */}
                        <div className="plasmo-px-2 plasmo-py-2">
                            <div
                                className="plasmo-flex plasmo-items-center plasmo-justify-center plasmo-h-[32px] plasmo-cursor-pointer hover:plasmo-bg-[#f0f4f9] plasmo-rounded-full plasmo-text-[#0b57d0] plasmo-text-[13px] plasmo-font-medium plasmo-mt-2"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsLoadingMore(true);
                                    loadMoreChats(); // Trigger the scroll
                                    setTimeout(() => setIsLoadingMore(false), 8000);
                                }}
                            >
                                <span className="plasmo-font-medium">{isLoadingMore ? "Loading..." : "Load more chats..."}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="plasmo-px-4 plasmo-pb-4 plasmo-pt-2 plasmo-flex plasmo-justify-end plasmo-gap-2">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="plasmo-px-4 plasmo-h-[32px] plasmo-text-[#0b57d0] plasmo-text-[12px] plasmo-font-medium hover:plasmo-bg-[#f0f4f9] plasmo-rounded-full plasmo-transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleCreate}
                        disabled={!isValid}
                        className="plasmo-px-4 plasmo-h-[32px] plasmo-bg-[#0b57d0] plasmo-text-white plasmo-text-[12px] plasmo-font-medium plasmo-rounded-full disabled:plasmo-opacity-50 disabled:plasmo-cursor-not-allowed hover:plasmo-shadow-md plasmo-transition-all"
                    >
                        Create
                    </button>
                </div>
            </div>
        </div>
    )
}
