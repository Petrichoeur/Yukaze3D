import type { Context, Config } from "@netlify/functions";
import { neon } from "@netlify/neon";

// Retention period: 30 days (approximately 1 month)
const RETENTION_DAYS = 30;

export default async (req: Request, context: Context) => {
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

        // Calculate cutoff date for 30-day rolling window
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

        // Get aggregated views and clicks by article (last 30 days)
        const articleStats = await sql(`
            SELECT
                article_id,
                article_title,
                COUNT(*) FILTER (WHERE view_type = 'view') as total_views,
                COUNT(*) FILTER (WHERE view_type = 'click') as total_clicks,
                COUNT(DISTINCT session_id) as unique_visitors,
                MAX(created_at) as last_viewed
            FROM shop_article_views
            WHERE created_at >= $1
            GROUP BY article_id, article_title
            ORDER BY total_views DESC, total_clicks DESC
        `, [cutoffDate.toISOString()]);

        // Get total stats summary
        const summaryStats = await sql(`
            SELECT
                COUNT(*) FILTER (WHERE view_type = 'view') as total_views,
                COUNT(*) FILTER (WHERE view_type = 'click') as total_clicks,
                COUNT(DISTINCT session_id) as unique_visitors,
                COUNT(DISTINCT article_id) as articles_viewed
            FROM shop_article_views
            WHERE created_at >= $1
        `, [cutoffDate.toISOString()]);

        // Get daily breakdown for charts (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const dailyStats = await sql(`
            SELECT
                DATE(created_at) as date,
                COUNT(*) FILTER (WHERE view_type = 'view') as views,
                COUNT(*) FILTER (WHERE view_type = 'click') as clicks
            FROM shop_article_views
            WHERE created_at >= $1
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `, [sevenDaysAgo.toISOString()]);

        const response = {
            period: {
                days: RETENTION_DAYS,
                from: cutoffDate.toISOString(),
                to: new Date().toISOString()
            },
            summary: {
                totalViews: parseInt(summaryStats[0]?.total_views || '0'),
                totalClicks: parseInt(summaryStats[0]?.total_clicks || '0'),
                uniqueVisitors: parseInt(summaryStats[0]?.unique_visitors || '0'),
                articlesViewed: parseInt(summaryStats[0]?.articles_viewed || '0')
            },
            articles: articleStats.map((row: any) => ({
                articleId: row.article_id,
                articleTitle: row.article_title,
                views: parseInt(row.total_views || '0'),
                clicks: parseInt(row.total_clicks || '0'),
                uniqueVisitors: parseInt(row.unique_visitors || '0'),
                lastViewed: row.last_viewed
            })),
            dailyBreakdown: dailyStats.map((row: any) => ({
                date: row.date,
                views: parseInt(row.views || '0'),
                clicks: parseInt(row.clicks || '0')
            }))
        };

        return new Response(JSON.stringify(response), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error("Error aggregating shop article views:", error);
        return new Response(JSON.stringify({ error: "Failed to get shop views data" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

export const config: Config = {
    path: "/api/shop/views/aggregate"
};
