import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export default async (req: Request, context: Context) => {
    try {
        const filename = context.params.filename;

        if (!filename) {
            return new Response(JSON.stringify({ error: "Filename is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Get the shop images store
        const store = getStore("shop-images");

        // Get the image with metadata
        const result = await store.getWithMetadata(filename, { type: "arrayBuffer" });

        if (!result || !result.data) {
            return new Response(JSON.stringify({ error: "Image not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        const contentType = result.metadata?.contentType || "image/jpeg";

        return new Response(result.data, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, immutable"
            }
        });
    } catch (error) {
        console.error("Error serving image:", error);
        return new Response(JSON.stringify({ error: "Failed to serve image" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

export const config: Config = {
    path: "/api/images/:filename"
};
