import type { Context, Config } from "@netlify/functions";
import { neon } from "@netlify/neon";

// Max storage limit in bytes (400MB)
const MAX_STORAGE_BYTES = 400 * 1024 * 1024;

// Target cleanup - remove enough to get to 80% of max
const TARGET_STORAGE_BYTES = MAX_STORAGE_BYTES * 0.8;

export default async (req: Request, context: Context) => {
    try {
        const sql = neon();

        // Get current database size estimate for our tables
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

        // Get row counts for monitoring
        const rowCountResult = await sql(`
            SELECT
                (SELECT COUNT(*) FROM flux_monitoring) as flux_count,
                (SELECT COUNT(*) FROM shop_items) as shop_count
        `);

        const fluxCount = parseInt(rowCountResult[0]?.flux_count || '0');
        const shopCount = parseInt(rowCountResult[0]?.shop_count || '0');

        let cleanupPerformed = false;
        let deletedSessions = 0;
        let deletedEvents = 0;

        // If we're over the limit, perform cleanup
        if (currentSize > MAX_STORAGE_BYTES) {
            cleanupPerformed = true;

            // Strategy 1: Truncate events arrays in flux_monitoring (they can get large)
            // Keep only the last 50 events per session instead of 100
            await sql(`
                UPDATE flux_monitoring
                SET events = (
                    SELECT jsonb_agg(elem)
                    FROM (
                        SELECT elem
                        FROM jsonb_array_elements(events) elem
                        LIMIT 50
                    ) sub
                )
                WHERE jsonb_array_length(events) > 50
            `);

            // Strategy 2: Delete oldest sessions if still over limit
            // Keep sessions from the last 30 days, delete older ones
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const deleteResult = await sql(`
                DELETE FROM flux_monitoring
                WHERE last_visit < $1
                RETURNING id
            `, [thirtyDaysAgo.toISOString()]);

            deletedSessions = deleteResult.length;

            // Strategy 3: If still over limit, be more aggressive - keep only last 14 days
            const newSizeResult = await sql(`
                SELECT
                    COALESCE(SUM(pg_total_relation_size(c.oid)), 0) as total_size
                FROM pg_class c
                LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
                AND c.relkind IN ('r', 'i')
                AND c.relname IN ('flux_monitoring', 'shop_items', 'music_settings', 'admin_credentials')
            `);

            const newSize = parseInt(newSizeResult[0]?.total_size || '0');

            if (newSize > TARGET_STORAGE_BYTES) {
                const fourteenDaysAgo = new Date();
                fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

                const additionalDelete = await sql(`
                    DELETE FROM flux_monitoring
                    WHERE last_visit < $1
                    RETURNING id
                `, [fourteenDaysAgo.toISOString()]);

                deletedSessions += additionalDelete.length;

                // Also reduce events to last 25 per session
                await sql(`
                    UPDATE flux_monitoring
                    SET events = (
                        SELECT jsonb_agg(elem)
                        FROM (
                            SELECT elem
                            FROM jsonb_array_elements(events) elem
                            LIMIT 25
                        ) sub
                    )
                    WHERE jsonb_array_length(events) > 25
                `);
            }

            // Run VACUUM to reclaim space (this might not work in all contexts)
            try {
                await sql(`VACUUM flux_monitoring`);
            } catch (vacuumError) {
                // VACUUM might fail in some contexts, that's okay
                console.log("VACUUM skipped (may not be available in this context)");
            }
        }

        // Get final size after cleanup
        const finalSizeResult = await sql(`
            SELECT
                COALESCE(SUM(pg_total_relation_size(c.oid)), 0) as total_size
            FROM pg_class c
            LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
            AND c.relkind IN ('r', 'i')
            AND c.relname IN ('flux_monitoring', 'shop_items', 'music_settings', 'admin_credentials')
        `);

        const finalSize = parseInt(finalSizeResult[0]?.total_size || '0');

        return new Response(JSON.stringify({
            success: true,
            storage: {
                current_bytes: finalSize,
                current_mb: (finalSize / (1024 * 1024)).toFixed(2),
                max_bytes: MAX_STORAGE_BYTES,
                max_mb: (MAX_STORAGE_BYTES / (1024 * 1024)).toFixed(2),
                usage_percent: ((finalSize / MAX_STORAGE_BYTES) * 100).toFixed(2)
            },
            row_counts: {
                flux_monitoring: fluxCount,
                shop_items: shopCount
            },
            cleanup: {
                performed: cleanupPerformed,
                deleted_sessions: deletedSessions,
                previous_size_bytes: currentSize,
                previous_size_mb: (currentSize / (1024 * 1024)).toFixed(2)
            }
        }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Error checking/cleaning database storage:", error);
        return new Response(JSON.stringify({
            error: "Failed to check database storage",
            details: error instanceof Error ? error.message : "Unknown error"
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

export const config: Config = {
    path: "/api/db/cleanup"
};
