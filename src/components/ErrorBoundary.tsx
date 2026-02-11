import React from "react"

interface ErrorBoundaryState {
    hasError: boolean
}

export class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    ErrorBoundaryState
> {
    constructor(props: { children: React.ReactNode }) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true }
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error("[Gemini Folders] UI Error:", error, info.componentStack)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-p-6 plasmo-mt-4">
                    <div className="plasmo-bg-[#1e1f20] plasmo-p-5 plasmo-rounded-xl plasmo-text-center plasmo-shadow-lg plasmo-w-full">
                        <p className="plasmo-text-gray-400 plasmo-text-xs plasmo-mb-3">
                            Something went wrong with Gemini Folders.
                        </p>
                        <button
                            onClick={() => this.setState({ hasError: false })}
                            className="plasmo-bg-[#8ab4f8] plasmo-text-[#1f1f1f] plasmo-px-4 plasmo-py-2 plasmo-rounded-full plasmo-font-medium plasmo-text-xs hover:plasmo-bg-[#aecbfa] plasmo-transition plasmo-border-none plasmo-cursor-pointer"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
