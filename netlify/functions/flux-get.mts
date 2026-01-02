import type { Context, Config } from "@netlify/functions";
import { neon } from "@netlify/neon";

export default async (req: Request, context: Context) => {
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

        const url = new URL(req.url);
        const sessionId = url.searchParams.get('sessionId') || 'default';

        const result = await sql(
            "SELECT * FROM flux_monitoring WHERE session_id = $1",
            [sessionId]
        );

        if (result.length === 0) {
            return new Response(JSON.stringify(null), {
                headers: { "Content-Type": "application/json" }
            });
        }

        const row = result[0];
        const data = {
            visits: row.visits,
            sessions: row.sessions,
            firstVisit: row.first_visit,
            lastVisit: row.last_visit,
            interactions: row.interactions,
            galleryViews: row.gallery_views,
            musicPlays: row.music_plays,
            projectViews: row.project_views || {},
            sectionViews: row.section_views || {},
            socialClicks: row.social_clicks || {},
            events: row.events || []
        };

        return new Response(JSON.stringify(data), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error("Error fetching flux data:", error);
        return new Response(JSON.stringify({ error: "Failed to fetch flux data" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

export const config: Config = {
    path: "/api/flux"
};
