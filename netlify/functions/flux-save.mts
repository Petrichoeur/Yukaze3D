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
            CREATE TABLE IF NOT EXISTS flux_monitoring (
                id SERIAL PRIMARY KEY,
                session_id VARCHAR(255) UNIQUE NOT NULL,
                visits INTEGER DEFAULT 0,
                sessions INTEGER DEFAULT 0,
                first_visit TIMESTAMP,
                last_visit TIMESTAMP,
                interactions INTEGER DEFAULT 0,
                gallery_views INTEGER DEFAULT 0,
                music_plays INTEGER DEFAULT 0,
                project_views JSONB DEFAULT '{}',
                section_views JSONB DEFAULT '{}',
                social_clicks JSONB DEFAULT '{}',
                events JSONB DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const data = await req.json();
        const sessionId = data.sessionId || 'default';

        // Upsert the flux data
        await sql(`
            INSERT INTO flux_monitoring (
                session_id, visits, sessions, first_visit, last_visit,
                interactions, gallery_views, music_plays,
                project_views, section_views, social_clicks, events, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP
            )
            ON CONFLICT (session_id) DO UPDATE SET
                visits = $2,
                sessions = $3,
                first_visit = COALESCE(flux_monitoring.first_visit, $4),
                last_visit = $5,
                interactions = $6,
                gallery_views = $7,
                music_plays = $8,
                project_views = $9,
                section_views = $10,
                social_clicks = $11,
                events = $12,
                updated_at = CURRENT_TIMESTAMP
        `, [
            sessionId,
            data.visits || 0,
            data.sessions || 0,
            data.firstVisit || null,
            data.lastVisit || null,
            data.interactions || 0,
            data.galleryViews || 0,
            data.musicPlays || 0,
            JSON.stringify(data.projectViews || {}),
            JSON.stringify(data.sectionViews || {}),
            JSON.stringify(data.socialClicks || {}),
            JSON.stringify(data.events || [])
        ]);

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error("Error saving flux data:", error);
        return new Response(JSON.stringify({ error: "Failed to save flux data" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

export const config: Config = {
    path: "/api/flux/save"
};
