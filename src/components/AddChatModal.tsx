import React, { useState, useEffect, useMemo } from "react"
import type { ScrapedChat } from "~types"

interface AddChatModalProps {
    isOpen: boolean
    onClose: () => void
    onUpdate: (addedChatIds: string[], removedChatIds: string[]) => void
    availableChats: ScrapedChat[]
    folderName: string
    existingChatIds: string[]
    startDeepScroll?: () => void
    stopDeepScroll?: () => void
    scrollToTop?: () => void
    isDeepScrolling?: boolean
}

export const AddChatModal = ({ isOpen, onClose, onUpdate, availableChats, folderName, existingChatIds, startDeepScroll, stopDeepScroll, scrollToTop, isDeepScrolling }: AddChatModalProps) => {

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [initialIds, setInitialIds] = useState<Set<string>>(new Set())
    const [searchQuery, setSearchQuery] = useState("")

    // Safety check for availableChats
    const safeChats = useMemo(() => availableChats || [], [availableChats])

    // Initialize state when modal opens
    useEffect(() => {
        if (isOpen) {
            const initial = new Set(existingChatIds || [])
            setInitialIds(initial)
            setSelectedIds(initial)
            setSearchQuery("")
            scrollToTop?.()
        } else {
            setSelectedIds(new Set())
            setInitialIds(new Set())
            setSearchQuery("")
        }
    }, [isOpen, existingChatIds, scrollToTop])

    // Stop deep scroll ONLY when modal closes or unmounts
    useEffect(() => {
        if (!isOpen) {
            stopDeepScroll?.()
        }
    }, [isOpen, stopDeepScroll])

    // In manage mode, we show ALL chats
    const displayChats = safeChats

    // Filter chats based on search query
    const filteredChats = useMemo(() => {
        if (!searchQuery) return displayChats
        return displayChats.filter(chat =>
            chat.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [displayChats, searchQuery])

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
        scrollToTop?.()
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
        <div
            className="plasmo-fixed plasmo-inset-0 plasmo-z-[9999] plasmo-flex plasmo-items-center plasmo-justify-center plasmo-bg-black/40"
            onClick={handleClose}
        >
            <div
                className="plasmo-bg-white plasmo-rounded-[20px] plasmo-w-[360px] plasmo-max-h-[85vh] plasmo-flex plasmo-flex-col plasmo-shadow-xl plasmo-overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="plasmo-px-4 plasmo-pt-4 plasmo-pb-2">
                    <h2 className="plasmo-text-[16px] plasmo-text-[#1f1f1f] plasmo-font-medium plasmo-mb-2">
                        Manage "{folderName}"
                    </h2>
                    {/* Search Input */}
                    <input
                        type="text"
                        placeholder="Search chats to add..."
                        className="plasmo-w-full plasmo-bg-[#f0f4f9] plasmo-border-none plasmo-rounded-full plasmo-px-4 plasmo-py-2 plasmo-text-[13px] plasmo-text-[#1f1f1f] plasmo-outline-none focus:plasmo-ring-2 focus:plasmo-ring-[#0b57d0]/20"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                </div>

                {/* Content */}
                <div className="plasmo-px-4 plasmo-flex plasmo-flex-col plasmo-flex-1 plasmo-overflow-hidden">

                    {/* Chat List */}
                    <div className="plasmo-flex-1 plasmo-overflow-y-auto plasmo-min-h-[200px] plasmo-max-h-[350px] plasmo-mb-4">
                        {filteredChats.length === 0 && (
                            <div className="plasmo-text-center plasmo-py-10 plasmo-text-[#444746] plasmo-text-[13px]">
                                {isDeepScrolling ? (
                                    <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-gap-2">
                                        <div className="plasmo-animate-spin plasmo-rounded-full plasmo-h-4 plasmo-w-4 plasmo-border-b-2 plasmo-border-[#0b57d0]"></div>
                                        <span>Searching older chats...</span>
                                    </div>
                                ) : (
                                    "No chats found"
                                )}
                            </div>
                        )}
                        {filteredChats.map(chat => (
                            <div
                                key={chat.id}
                                className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-py-2 plasmo-px-2 plasmo-cursor-pointer hover:plasmo-bg-[#f0f4f9] plasmo-rounded-lg"
                                onClick={() => toggleChat(chat.id)}
                            >
                                <div className="plasmo-flex plasmo-flex-col plasmo-flex-1 plasmo-mr-2 plasmo-overflow-hidden">
                                    <span className="plasmo-text-[13px] plasmo-text-[#1f1f1f] plasmo-truncate" title={chat.title}>{chat.title}</span>
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

                        {/* Deep Search Button */}
                        <div className="plasmo-px-2 plasmo-py-2">
                            <button
                                type="button"
                                className="plasmo-flex plasmo-items-center plasmo-justify-center plasmo-w-full plasmo-h-[32px] plasmo-cursor-pointer hover:plasmo-bg-[#f0f4f9] plasmo-rounded-full plasmo-text-[#0b57d0] plasmo-text-[12px] plasmo-font-medium plasmo-mt-2 plasmo-border-none plasmo-bg-transparent"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    startDeepScroll?.()
                                }}
                            >
                                {isDeepScrolling ? (
                                    <div className="plasmo-flex plasmo-items-center plasmo-gap-2">
                                        <div className="plasmo-animate-spin plasmo-rounded-full plasmo-h-3 plasmo-w-3 plasmo-border-b-2 plasmo-border-[#0b57d0]"></div>
                                        <span>Searching older chats...</span>
                                    </div>
                                ) : (
                                    "Deep Search Older Chats..."
                                )}
                            </button>
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
