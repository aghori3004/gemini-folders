import React, { useState, useMemo, useEffect } from "react"
import type { ScrapedChat } from "~types"

interface CreateFolderModalProps {
    isOpen: boolean
    onClose: () => void
    onCreate: (name: string, selectedChatIds: string[]) => void
    availableChats: ScrapedChat[]
    existingNames: string[]
    startDeepScroll?: () => void
    stopDeepScroll?: () => void
    scrollToTop?: () => void
    isDeepScrolling?: boolean
}

export const CreateFolderModal = ({ isOpen, onClose, onCreate, availableChats, existingNames, startDeepScroll, stopDeepScroll, scrollToTop, isDeepScrolling }: CreateFolderModalProps) => {
    const [name, setName] = useState("")
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [searchQuery, setSearchQuery] = useState("")

    // Safety
    const safeChats = useMemo(() => availableChats || [], [availableChats])

    // Filter chats
    const filteredChats = useMemo(() => {
        if (!searchQuery) return safeChats
        const lowerQuery = searchQuery.toLowerCase()
        return safeChats.filter(chat =>
            chat.title.toLowerCase().includes(lowerQuery)
        )
    }, [safeChats, searchQuery])

    // Reset state on open/close
    useEffect(() => {
        if (isOpen) {
            scrollToTop?.()
        } else {
            setName("")
            setSelectedIds(new Set())
            setSearchQuery("")
        }
    }, [isOpen, scrollToTop])

    // Stop deep scroll ONLY when modal closes or unmounts
    useEffect(() => {
        if (!isOpen) {
            stopDeepScroll?.()
        }
    }, [isOpen, stopDeepScroll])

    // Validation
    const nameExists = existingNames.some(n => n.toLowerCase() === name.trim().toLowerCase())
    const isValid = name.trim().length > 0 && !nameExists

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

    const handleCreate = () => {
        if (!isValid) return
        onCreate(name.trim(), Array.from(selectedIds))
        handleClose()
    }

    if (!isOpen) return null

    return (
        <div
            className="plasmo-fixed plasmo-inset-0 plasmo-z-[9999] plasmo-flex plasmo-items-center plasmo-justify-center plasmo-bg-black/40"
            onClick={handleClose}
        >
            <div
                className="plasmo-bg-white plasmo-rounded-[20px] plasmo-w-[320px] plasmo-max-h-[85vh] plasmo-flex plasmo-flex-col plasmo-shadow-xl plasmo-overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
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
                                className="plasmo-bg-transparent plasmo-border-none plasmo-outline-none plasmo-text-[14px] plasmo-text-[#1f1f1f] plasmo-w-full"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Folder name"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && isValid) {
                                        handleCreate()
                                    }
                                    e.stopPropagation()
                                }}
                            />
                        </div>
                        {nameExists && <span className="plasmo-text-[11px] plasmo-text-red-500 plasmo-mt-1">Name already exists</span>}
                    </div>

                    <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-mb-2">
                        <div className="plasmo-text-[12px] plasmo-font-medium plasmo-text-[#1f1f1f]">
                            Add chats
                        </div>
                        {/* Search Input for Chats */}
                        <input
                            type="text"
                            placeholder="Search chats..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="plasmo-bg-[#f0f4f9] plasmo-border-none plasmo-rounded-full plasmo-px-3 plasmo-py-1 plasmo-text-[12px] plasmo-text-[#1f1f1f] plasmo-outline-none focus:plasmo-ring-2 focus:plasmo-ring-[#0b57d0]/20 plasmo-w-[140px]"
                        />
                    </div>

                    {/* Chat List */}
                    <div className="plasmo-flex-1 plasmo-overflow-y-auto plasmo-min-h-[150px] plasmo-max-h-[250px] plasmo-mb-4">
                        {filteredChats.length === 0 && (
                            <div className="plasmo-text-center plasmo-py-10 plasmo-text-[#444746] plasmo-text-[13px]">
                                {isDeepScrolling ? (
                                    <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-gap-2">
                                        <div className="plasmo-animate-spin plasmo-rounded-full plasmo-h-4 plasmo-w-4 plasmo-border-b-2 plasmo-border-[#0b57d0]"></div>
                                        <span>Searching older chats...</span>
                                    </div>
                                ) : (
                                    <div className="plasmo-flex plasmo-flex-col plasmo-items-center">
                                        <span>No matching chats found</span>
                                        <span className="plasmo-text-[11px] plasmo-text-gray-400 plasmo-mt-1">
                                            (scanned {safeChats.length} chats)
                                        </span>
                                    </div>
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
