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
        const file = formData.get("audio") as File | null;

        if (!file) {
            return new Response(JSON.stringify({ error: "No audio file provided" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Validate file type
        const allowedTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/mp4", "audio/x-m4a", "audio/m4a"];
        if (!allowedTypes.includes(file.type)) {
            return new Response(JSON.stringify({ error: "Invalid file type. Allowed: MP3, WAV, OGG, M4A" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Validate file size (max 10MB for audio)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return new Response(JSON.stringify({ error: "File size exceeds 10MB limit" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Generate a unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        const extension = file.name.split(".").pop() || "mp3";
        const filename = `music-${timestamp}-${randomId}.${extension}`;

        // Get the music files store
        const store = getStore("music-files");

        // Convert file to ArrayBuffer and store it
        const arrayBuffer = await file.arrayBuffer();
        await store.set(filename, arrayBuffer, {
            metadata: {
                contentType: file.type,
                originalName: file.name,
                uploadedAt: new Date().toISOString(),
                fileSize: file.size
            }
        });

        // Return the filename that can be used to retrieve the audio
        return new Response(JSON.stringify({
            success: true,
            filename: filename,
            originalName: file.name,
            url: `/api/music/${filename}`,
            fileSize: file.size
        }), {
            status: 201,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error("Error uploading music:", error);
        return new Response(JSON.stringify({ error: "Failed to upload music" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

export const config: Config = {
    path: "/api/music/upload"
};
