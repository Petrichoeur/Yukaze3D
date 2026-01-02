import type { Context, Config } from "@netlify/functions";
import { neon } from "@netlify/neon";

export default async (req: Request, context: Context) => {
    if (req.method !== "GET") {
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

        // Get current settings (there should be only one row)
        const result = await sql(`
            SELECT source_type, source_url, volume, original_filename, updated_at
            FROM music_settings
            ORDER BY id DESC
            LIMIT 1
        `);

        if (result.length === 0) {
            // Return default settings
            return new Response(JSON.stringify({
                source_type: 'default',
                source_url: './config/theme.mp3',
                volume: 0.20,
                original_filename: 'theme.mp3',
                is_default: true
            }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        const settings = result[0];
        return new Response(JSON.stringify({
            source_type: settings.source_type,
            source_url: settings.source_url || './config/theme.mp3',
            volume: parseFloat(settings.volume) || 0.20,
            original_filename: settings.original_filename || 'theme.mp3',
            updated_at: settings.updated_at,
            is_default: settings.source_type === 'default'
        }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Error fetching music settings:", error);
        return new Response(JSON.stringify({
            error: "Failed to fetch music settings",
            // Return defaults on error
            source_type: 'default',
            source_url: './config/theme.mp3',
            volume: 0.20,
            original_filename: 'theme.mp3',
            is_default: true
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

export const config: Config = {
    path: "/api/music/settings"
};
