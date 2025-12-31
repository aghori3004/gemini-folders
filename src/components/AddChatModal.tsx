import React, { useState, useEffect, useMemo, useRef } from "react"
import type { ScrapedChat } from "~types"
import { useChatScraper } from "~hooks/useChatScraper"

interface AddChatModalProps {
    isOpen: boolean
    onClose: () => void
    onUpdate: (addedChatIds: string[], removedChatIds: string[]) => void
    availableChats: ScrapedChat[]
    folderName: string
    existingChatIds: string[]
}

export const AddChatModal = ({ isOpen, onClose, onUpdate, availableChats, folderName, existingChatIds }: AddChatModalProps) => {
    const { loadMoreChats, scrollToTop } = useChatScraper()

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [initialIds, setInitialIds] = useState<Set<string>>(new Set())

    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const prevCountRef = useRef(availableChats.length)

    useEffect(() => {
        if (isLoadingMore && availableChats.length > prevCountRef.current) {
            setIsLoadingMore(false)
        }
        prevCountRef.current = availableChats.length
    }, [availableChats.length, isLoadingMore])

    // Initialize state when modal opens
    useEffect(() => {
        if (isOpen) {
            const initial = new Set(existingChatIds || [])
            setInitialIds(initial)
            setSelectedIds(initial)
            scrollToTop()
        } else {
            setSelectedIds(new Set())
            setInitialIds(new Set())
        }
    }, [isOpen, existingChatIds])

    // In manage mode, we show ALL chats, simply checking the ones that are already in the folder
    const displayChats = availableChats

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

    const handleSave = () => {
        const added: string[] = []
        const removed: string[] = []

        // Calculate diff
        selectedIds.forEach(id => {
            if (!initialIds.has(id)) added.push(id)
        })
        initialIds.forEach(id => {
            if (!selectedIds.has(id)) removed.push(id)
        })

        if (added.length === 0 && removed.length === 0) {
            handleClose()
            return
        }

        onUpdate(added, removed)
        handleClose()
    }

    if (!isOpen) return null

    return (
        <div className="plasmo-fixed plasmo-inset-0 plasmo-z-[9999] plasmo-flex plasmo-items-center plasmo-justify-center plasmo-bg-black/40">
            <div className="plasmo-bg-white plasmo-rounded-[20px] plasmo-w-[360px] plasmo-max-h-[85vh] plasmo-flex plasmo-flex-col plasmo-shadow-xl plasmo-overflow-hidden">
                {/* Header */}
                <div className="plasmo-px-4 plasmo-pt-4 plasmo-pb-2">
                    <h2 className="plasmo-text-[16px] plasmo-text-[#1f1f1f] plasmo-font-medium">
                        Manage "{folderName}"
                    </h2>
                </div>

                {/* Content */}
                <div className="plasmo-px-4 plasmo-flex plasmo-flex-col plasmo-flex-1 plasmo-overflow-hidden">

                    {/* Chat List */}
                    <div className="plasmo-flex-1 plasmo-overflow-y-auto plasmo-min-h-[200px] plasmo-max-h-[350px] plasmo-mb-4">
                        {displayChats.length === 0 && (
                            <div className="plasmo-text-center plasmo-py-10 plasmo-text-[#444746] plasmo-text-[13px]">
                                No chats loaded
                            </div>
                        )}
                        {displayChats.map(chat => (
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
                                className="plasmo-flex plasmo-items-center plasmo-justify-center plasmo-h-[32px] plasmo-cursor-pointer hover:plasmo-bg-[#f0f4f9] plasmo-rounded-full plasmo-text-[#0b57d0] plasmo-text-[13px] plasmo-font-medium plasmo-mt-2 plasmo-transition-colors"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsLoadingMore(true);
                                    loadMoreChats?.();
                                    // Safety fallback
                                    setTimeout(() => setIsLoadingMore(false), 8000);
                                }}
                            >
                                <span className="plasmo-font-medium">{isLoadingMore ? "Loading..." : "Load more chats..."}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="plasmo-px-4 plasmo-pb-4 plasmo-pt-2 plasmo-flex plasmo-justify-end plasmo-gap-2 plasmo-border-t">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="plasmo-px-4 plasmo-h-[32px] plasmo-text-[#0b57d0] plasmo-text-[12px] plasmo-font-medium hover:plasmo-bg-[#f0f4f9] plasmo-rounded-full plasmo-transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="plasmo-px-4 plasmo-h-[32px] plasmo-bg-[#0b57d0] plasmo-text-white plasmo-text-[12px] plasmo-font-medium plasmo-rounded-full hover:plasmo-shadow-md plasmo-transition-all"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    )
}
