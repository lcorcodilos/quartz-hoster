import path from "path"
import { visit } from "unist-util-visit"
import { QuartzTransformerPlugin } from "../types"
import { FilePath, slugifyFilePath } from "../../util/path"

/**
 * Options interface for the StripIFramePaths plugin.
 * Currently, no options are defined, but this is a placeholder for future extensibility.
 */
interface Options {}

/**
 * Default options for the StripIFramePaths plugin.
 * This is an empty object since no options are currently defined.
 */
const defaultOptions: Options = {}

/**
 * StripIFramePaths Quartz Transformer Plugin
 *
 * This plugin processes Markdown files to find `<iframe>` elements and modifies their `src` attributes.
 * Specifically, it converts absolute paths in the `src` attribute to relative paths based on the shared root
 * directory between the Markdown file and the iframe's source file.
 *
 * Example:
 * - Markdown file path: `/home/user/quartz/content/notes/march/march_10.md`
 * - Iframe `src` path: `/Users/me/Documents/Obsidian/notes/my_page.html`
 * - Resulting relative path: `notes/my_page.html`
 *
 * The plugin ensures compatibility with Quartz by slugifying the resulting relative path if it matches
 * an existing slug in the Quartz system.
 */
export const StripIFramePaths: QuartzTransformerPlugin<Partial<Options>> = (userOpts) => {
    const opts = { ...defaultOptions, ...userOpts }
    console.log("[StripIFramePaths] Plugin initialized with options:", opts)

    return {
        name: "StripIFramePaths",
        markdownPlugins(ctx) {
            console.log("[StripIFramePaths] markdownPlugins called with context:", ctx)

            return [
                () => {
                    const { allSlugs } = ctx
                    console.log("[StripIFramePaths] Processing Markdown AST")

                    return (tree: any, file: any) => {
                        const markdownFilePath = file.path
                        console.log("[StripIFramePaths] Processing file:", markdownFilePath)

                        visit(tree, "html", (node: any) => {
                            if (node.value.startsWith("<iframe")) {
                                console.log("[StripIFramePaths] Found <iframe> node:", node.value)

                                node.value = node.value.replace(/src=(["']?)([^"'>\s]+)\1?/, (match: string, _quote: string, absolutePath: string) => {
                                    if (!absolutePath) {
                                        console.error("[StripIFramePaths] Failed to extract src attribute value. Match:", match)
                                        return match // Return the original match if parsing fails
                                    }

                                    console.log("[StripIFramePaths] Found src attribute with path:", absolutePath)

                                    const normalizedMarkdownPath = path.normalize(markdownFilePath)
                                    const normalizedIframePath = path.normalize(absolutePath.replace("file://", "")) // Remove the `file://` prefix

                                    const markdownParts = normalizedMarkdownPath.split(path.sep)
                                    const iframeParts = normalizedIframePath.split(path.sep)

                                    // Find the first matching segment to identify the shared root
                                    let sharedRootIndexMarkdown = -1
                                    let sharedRootIndexIframe = -1

                                    for (let i = 0; i < markdownParts.length; i++) {
                                        const markdownPart = markdownParts[i]
                                        const iframeIndex = iframeParts.indexOf(markdownPart)
                                        if (iframeIndex !== -1) {
                                            sharedRootIndexMarkdown = i
                                            sharedRootIndexIframe = iframeIndex
                                            break
                                        }
                                    }

                                    if (sharedRootIndexMarkdown === -1 || sharedRootIndexIframe === -1) {
                                        console.error("[StripIFramePaths] No shared root directory found.")
                                        return match // Return the original match if no shared root is found
                                    }

                                    console.log("[StripIFramePaths] Shared root found at:", markdownParts[sharedRootIndexMarkdown])

                                    // Strip everything before the shared root
                                    const relativeMarkdownParts = markdownParts.slice(sharedRootIndexMarkdown + 1)
                                    const relativeIframeParts = iframeParts.slice(sharedRootIndexIframe + 1)

                                    // Calculate the relative path from the Markdown file to the iframe file
                                    const relativePath = path.join(
                                        ...Array(relativeMarkdownParts.length).fill(".."), // Go up for each remaining Markdown part
                                        ...relativeIframeParts // Add the remaining iframe parts
                                    )

                                    console.log("[StripIFramePaths] Calculated relative path:", relativePath)

                                    const slug = slugifyFilePath(relativePath as FilePath)
                                    console.log("[StripIFramePaths] Slugified path:", slug)

                                    if (allSlugs.includes(slug)) {
                                        console.log("[StripIFramePaths] Using slugified path:", slug)
                                        return `src="${slug}"`
                                    }
                                    console.log("[StripIFramePaths] Using relative path:", relativePath)
                                    return `src="${relativePath}"`
                                })
                            }
                        })
                    }
                },
            ]
        },
    }
}