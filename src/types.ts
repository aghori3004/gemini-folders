export interface Folder {
    id: string
    name: string
    chatIds: string[]
    collapsed: boolean
    color?: string
}

export interface ChatMetadata {
    id: string // The URL or a unique part of it
    title: string
    originalTitle: string
    lastInteracted?: string
    customName?: string
}

export interface ScrapedChat {
    id: string
    title: string
    lastInteracted: string // Display string: "Today", "Yesterday", "Dec 29"
    timestamp: number      // Raw unix timestamp for sorting
    url: string
    isActive: boolean
}
