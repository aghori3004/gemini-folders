export const logger = {
    log: (...args: any[]) => {
        if (process.env.NODE_ENV === "development") {
            console.log(...args)
        }
    },
    warn: (...args: any[]) => {
        if (process.env.NODE_ENV === "development") {
            console.warn(...args)
        }
    },
    error: (...args: any[]) => {
        // We might want to keep errors even in production, or restrict them.
        // Following the plan: "Ensure only critical errors are logged using console.error; replace informational logs with logger.log."
        // So this helper helps for dev-only errors, but we can stick to native console.error for critical ones in the code.
        if (process.env.NODE_ENV === "development") {
            console.error(...args)
        }
    }
}
