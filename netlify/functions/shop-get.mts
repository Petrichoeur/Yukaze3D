import type { Context, Config } from "@netlify/functions";
import { neon } from "@netlify/neon";

export default async (req: Request, context: Context) => {
    try {
        const sql = neon();

        // Create table if it doesn't exist
        await sql(`
            CREATE TABLE IF NOT EXISTS shop_items (
                id SERIAL PRIMARY KEY,
                fichier VARCHAR(255) NOT NULL,
                titre VARCHAR(255) NOT NULL,
                description TEXT,
                prix VARCHAR(50),
                etsy_url VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const items = await sql("SELECT * FROM shop_items ORDER BY id ASC");

        return new Response(JSON.stringify(items), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error("Error fetching shop items:", error);
        return new Response(JSON.stringify({ error: "Failed to fetch shop items" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

export const config: Config = {
    path: "/api/shop"
};
