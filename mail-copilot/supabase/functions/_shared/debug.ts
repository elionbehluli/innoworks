export function dd(...args: unknown[]): never {
    console.log("--- dd ---", ...args)
    throw new Error("dd()")
}