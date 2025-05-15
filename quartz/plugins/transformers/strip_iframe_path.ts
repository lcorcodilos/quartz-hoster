import path from "path"
import { visit } from "unist-util-visit"
import { QuartzTransformerPlugin } from "../types"
import { FilePath, slugifyFilePath } from "../../util/path"

/**
 * Options interface for the StripIFramePaths plugin.
 * Currently, no options are defined, but this is a placeholder for future extensibility.
 */
interface Options {
    obsidianRoot: string,
}

/**
 * Default options for the StripIFramePaths plugin.
 * This is an empty object since no options are currently defined.
 */
const defaultOptions: Options = {
    obsidianRoot: "",
}

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

                                node.value = node.value.replace(/src=(?:"([^"]+)"|(\S+))\s+/, (match: string, g1: string, g2: string) => {
                                    const absolutePath = g1 || g2
                                    if (!absolutePath) {
                                        console.error("[StripIFramePaths] Failed to extract src attribute value. Match:", match)
                                        return match // Return the original match if parsing fails
                                    }

                                    console.log("[StripIFramePaths] Found src attribute with path:", absolutePath)

                                    const normalizedIframePath = path.normalize(absolutePath.replace("file://" + opts.obsidianRoot, ""))

                                    console.log("[StripIFramePaths] Calculated relative path:", normalizedIframePath)

                                    const slug = slugifyFilePath(normalizedIframePath as FilePath)
                                    console.log("[StripIFramePaths] Slugified path:", slug)

                                    if (allSlugs.includes(slug)) {
                                        console.log("[StripIFramePaths] Using slugified path:", slug)
                                        return `src="${slug}"`
                                    }
                                    console.log("[StripIFramePaths] Using relative path:", normalizedIframePath)
                                    return `src="${normalizedIframePath}"`
                                })
                            }
                        })
                    }
                },
            ]
        },
    }
}