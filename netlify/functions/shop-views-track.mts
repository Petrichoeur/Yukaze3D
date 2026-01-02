import type { Context, Config } from "@netlify/functions";
import { neon } from "@netlify/neon";

// Retention period: 30 days (approximately 1 month)
const RETENTION_DAYS = 30;

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
            CREATE TABLE IF NOT EXISTS shop_article_views (
                id SERIAL PRIMARY KEY,
                article_id VARCHAR(255) NOT NULL,
                article_title VARCHAR(255) NOT NULL,
                session_id VARCHAR(255),
                view_type VARCHAR(50) DEFAULT 'view',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create index for faster queries if it doesn't exist
        await sql(`
            CREATE INDEX IF NOT EXISTS idx_shop_article_views_created_at
            ON shop_article_views(created_at)
        `);

        await sql(`
            CREATE INDEX IF NOT EXISTS idx_shop_article_views_article_id
            ON shop_article_views(article_id)
        `);

        const data = await req.json();
        const { articleId, articleTitle, sessionId, viewType = 'view' } = data;

        if (!articleId || !articleTitle) {
            return new Response(JSON.stringify({ error: "Missing required fields: articleId and articleTitle" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Insert new view record
        await sql(`
            INSERT INTO shop_article_views (article_id, article_title, session_id, view_type)
            VALUES ($1, $2, $3, $4)
        `, [articleId, articleTitle, sessionId || null, viewType]);

        // Perform rolling window cleanup (delete records older than 30 days)
        // Run cleanup on ~5% of requests to optimize performance
        if (Math.random() < 0.05) {
            await performRollingWindowCleanup(sql);
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error("Error tracking shop article view:", error);
        return new Response(JSON.stringify({ error: "Failed to track view" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

async function performRollingWindowCleanup(sql: ReturnType<typeof neon>) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

        const result = await sql(`
            DELETE FROM shop_article_views
            WHERE created_at < $1
        `, [cutoffDate.toISOString()]);

        console.log(`Rolling window cleanup: removed old shop article views`);
    } catch (cleanupError) {
        console.warn("Rolling window cleanup warning:", cleanupError);
    }
}

export const config: Config = {
    path: "/api/shop/views/track"
};
