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
        const body = await req.json();

        const { fichier, titre, description, prix, etsyUrl } = body;

        if (!fichier || !titre) {
            return new Response(JSON.stringify({ error: "fichier and titre are required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

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

        const result = await sql(
            `INSERT INTO shop_items (fichier, titre, description, prix, etsy_url)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [fichier, titre, description || "", prix || "", etsyUrl || ""]
        );

        return new Response(JSON.stringify(result[0]), {
            status: 201,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error("Error creating shop item:", error);
        return new Response(JSON.stringify({ error: "Failed to create shop item" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

export const config: Config = {
    path: "/api/shop/create"
};
