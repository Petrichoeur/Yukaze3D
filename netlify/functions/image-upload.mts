import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export default async (req: Request, context: Context) => {
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("image") as File | null;

        if (!file) {
            return new Response(JSON.stringify({ error: "No image file provided" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Validate file type
        const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            return new Response(JSON.stringify({ error: "Invalid file type. Allowed: JPEG, PNG, GIF, WEBP" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            return new Response(JSON.stringify({ error: "File size exceeds 5MB limit" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Generate a unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        const extension = file.name.split(".").pop() || "jpg";
        const filename = `shop-${timestamp}-${randomId}.${extension}`;

        // Get the shop images store
        const store = getStore("shop-images");

        // Convert file to ArrayBuffer and store it
        const arrayBuffer = await file.arrayBuffer();
        await store.set(filename, arrayBuffer, {
            metadata: {
                contentType: file.type,
                originalName: file.name,
                uploadedAt: new Date().toISOString()
            }
        });

        // Return the filename that can be used to retrieve the image
        return new Response(JSON.stringify({
            success: true,
            filename: filename,
            url: `/api/images/${filename}`
        }), {
            status: 201,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error("Error uploading image:", error);
        return new Response(JSON.stringify({ error: "Failed to upload image" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

export const config: Config = {
    path: "/api/images/upload"
};
