import React from "react"

interface SearchBarProps {
    value: string
    onChange: (val: string) => void
}

export const SearchBar = ({ value, onChange }: SearchBarProps) => {
    return (
        <div className="plasmo-pl-4 plasmo-pr-0 plasmo-mb-2">
            <div className="plasmo-relative plasmo-flex plasmo-items-center plasmo-w-full plasmo-h-[40px] plasmo-bg-[#f0f4f9] plasmo-rounded-full hover:plasmo-bg-[#e1e5ea] plasmo-transition-colors">
                <div className="plasmo-pl-4 plasmo-text-[#444746]">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M15.5 14H14.71L14.43 13.73C15.41 12.59 16 11.11 16 9.5C16 5.91 13.09 3 9.5 3C5.91 3 3 5.91 3 9.5C3 13.09 5.91 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.49L20.49 19L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5C5 7.01 7.01 5 9.5 5C11.99 5 14 7.01 14 9.5C14 11.99 11.99 14 9.5 14Z" fill="currentColor" />
                    </svg>
                </div>
                <input
                    className="plasmo-w-full plasmo-bg-transparent plasmo-border-none plasmo-outline-none plasmo-text-[14px] plasmo-text-[#1f1f1f] plasmo-pl-3 plasmo-pr-4 plasmo-placeholder-[#444746]"
                    placeholder="Search folders..."
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            </div>
        </div>
    )
}
