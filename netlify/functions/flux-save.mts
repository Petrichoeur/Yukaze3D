import type { Context, Config } from "@netlify/functions";
import { neon } from "@netlify/neon";

// Max storage limit in bytes (400MB)
const MAX_STORAGE_BYTES = 400 * 1024 * 1024;
// Max events to keep per session (rolling window)
const MAX_EVENTS_PER_SESSION = 100;
// Days to keep old sessions
const MAX_SESSION_AGE_DAYS = 60;

async function performRollingWindowCleanup(sql: ReturnType<typeof neon>) {
    try {
        // 1. Get estimated database size
        const sizeResult = await sql(`
            SELECT
                COALESCE(SUM(pg_total_relation_size(c.oid)), 0) as total_size
            FROM pg_class c
            LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
            AND c.relkind IN ('r', 'i')
            AND c.relname IN ('flux_monitoring', 'shop_items', 'music_settings', 'admin_credentials')
        `);

        const currentSize = parseInt(sizeResult[0]?.total_size || '0');

        // Only cleanup if over 80% of limit
        if (currentSize > MAX_STORAGE_BYTES * 0.8) {
            // Delete sessions older than MAX_SESSION_AGE_DAYS
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - MAX_SESSION_AGE_DAYS);

            await sql(`
                DELETE FROM flux_monitoring
                WHERE last_visit < $1
            `, [cutoffDate.toISOString()]);

            // Trim events arrays to MAX_EVENTS_PER_SESSION
            await sql(`
                UPDATE flux_monitoring
                SET events = (
                    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
                    FROM (
                        SELECT elem
                        FROM jsonb_array_elements(events) elem
                        LIMIT ${MAX_EVENTS_PER_SESSION}
                    ) sub
                )
                WHERE jsonb_array_length(COALESCE(events, '[]'::jsonb)) > ${MAX_EVENTS_PER_SESSION}
            `);
        }
    } catch (cleanupError) {
        // Log but don't fail the main operation
        console.warn("Rolling window cleanup warning:", cleanupError);
    }
}

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

        // Limit events array before saving (rolling window)
        let events = data.events || [];
        if (events.length > MAX_EVENTS_PER_SESSION) {
            events = events.slice(0, MAX_EVENTS_PER_SESSION);
        }

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
            JSON.stringify(events)
        ]);

        // Perform rolling window cleanup periodically (1 in 10 requests)
        if (Math.random() < 0.1) {
            performRollingWindowCleanup(sql);
        }

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
