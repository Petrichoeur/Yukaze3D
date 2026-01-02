import type { Context, Config } from "@netlify/functions";
import { neon } from "@netlify/neon";

export default async (req: Request, context: Context) => {
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const sql = neon();

        // Create table if it doesn't exist
        await sql(`
            CREATE TABLE IF NOT EXISTS music_settings (
                id SERIAL PRIMARY KEY,
                source_type VARCHAR(50) NOT NULL DEFAULT 'default',
                source_url TEXT,
                volume DECIMAL(3,2) DEFAULT 0.20,
                original_filename VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const data = await req.json();

        // Validate volume is between 0 and 1
        const volume = Math.max(0, Math.min(1, parseFloat(data.volume) || 0.20));

        // Validate source type
        const validSourceTypes = ['default', 'url', 'uploaded'];
        const sourceType = validSourceTypes.includes(data.source_type) ? data.source_type : 'default';

        // Set source URL based on type
        let sourceUrl = data.source_url || './config/theme.mp3';
        if (sourceType === 'default') {
            sourceUrl = './config/theme.mp3';
        }

        const originalFilename = data.original_filename || 'theme.mp3';

        // Delete all existing settings and insert new one (keep only latest)
        await sql(`DELETE FROM music_settings`);

        await sql(`
            INSERT INTO music_settings (source_type, source_url, volume, original_filename, updated_at)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        `, [sourceType, sourceUrl, volume, originalFilename]);

        return new Response(JSON.stringify({
            success: true,
            settings: {
                source_type: sourceType,
                source_url: sourceUrl,
                volume: volume,
                original_filename: originalFilename
            }
        }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Error saving music settings:", error);
        return new Response(JSON.stringify({ error: "Failed to save music settings" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

export const config: Config = {
    path: "/api/music/settings/save"
};
