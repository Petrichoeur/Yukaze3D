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

        // Get aggregated stats across all sessions
        const stats = await sql(`
            SELECT
                COALESCE(SUM(visits), 0) as total_visits,
                COALESCE(SUM(sessions), 0) as total_sessions,
                COALESCE(SUM(interactions), 0) as total_interactions,
                COALESCE(SUM(gallery_views), 0) as total_gallery_views,
                COALESCE(SUM(music_plays), 0) as total_music_plays,
                MIN(first_visit) as earliest_visit,
                MAX(last_visit) as latest_visit,
                COUNT(DISTINCT session_id) as unique_visitors
            FROM flux_monitoring
        `);

        // Get all project views combined
        const projectViews = await sql(`
            SELECT
                key as project,
                SUM(value::int) as views
            FROM flux_monitoring,
                 jsonb_each_text(project_views)
            GROUP BY key
            ORDER BY views DESC
        `);

        // Get all section views combined
        const sectionViews = await sql(`
            SELECT
                key as section,
                SUM(value::int) as views
            FROM flux_monitoring,
                 jsonb_each_text(section_views)
            GROUP BY key
        `);

        // Get all social clicks combined
        const socialClicks = await sql(`
            SELECT
                key as platform,
                SUM(value::int) as clicks
            FROM flux_monitoring,
                 jsonb_each_text(social_clicks)
            GROUP BY key
        `);

        // Get recent events from all sessions
        const recentEvents = await sql(`
            SELECT event
            FROM flux_monitoring,
                 jsonb_array_elements(events) as event
            ORDER BY (event->>'timestamp')::timestamp DESC
            LIMIT 50
        `);

        const aggregatedData = {
            visits: parseInt(stats[0]?.total_visits || 0),
            sessions: parseInt(stats[0]?.total_sessions || 0),
            interactions: parseInt(stats[0]?.total_interactions || 0),
            galleryViews: parseInt(stats[0]?.total_gallery_views || 0),
            musicPlays: parseInt(stats[0]?.total_music_plays || 0),
            firstVisit: stats[0]?.earliest_visit,
            lastVisit: stats[0]?.latest_visit,
            uniqueVisitors: parseInt(stats[0]?.unique_visitors || 0),
            projectViews: projectViews.reduce((acc: Record<string, number>, row: any) => {
                acc[row.project] = parseInt(row.views);
                return acc;
            }, {}),
            sectionViews: sectionViews.reduce((acc: Record<string, number>, row: any) => {
                acc[row.section] = parseInt(row.views);
                return acc;
            }, {}),
            socialClicks: socialClicks.reduce((acc: Record<string, number>, row: any) => {
                acc[row.platform] = parseInt(row.clicks);
                return acc;
            }, {}),
            events: recentEvents.map((row: any) => row.event)
        };

        return new Response(JSON.stringify(aggregatedData), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error("Error aggregating flux data:", error);
        return new Response(JSON.stringify({ error: "Failed to aggregate flux data" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

export const config: Config = {
    path: "/api/flux/aggregate"
};
