import type { Context, Config } from "@netlify/functions";
import { neon } from "@netlify/neon";

export default async (req: Request, context: Context) => {
    if (req.method !== "PUT" && req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const sql = neon();
        const body = await req.json();

        const { id, fichier, titre, description, prix, etsyUrl } = body;

        if (!id) {
            return new Response(JSON.stringify({ error: "id is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const result = await sql(
            `UPDATE shop_items
             SET fichier = $1, titre = $2, description = $3, prix = $4, etsy_url = $5, updated_at = CURRENT_TIMESTAMP
             WHERE id = $6
             RETURNING *`,
            [fichier, titre, description || "", prix || "", etsyUrl || "", id]
        );

        if (result.length === 0) {
            return new Response(JSON.stringify({ error: "Item not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        return new Response(JSON.stringify(result[0]), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error("Error updating shop item:", error);
        return new Response(JSON.stringify({ error: "Failed to update shop item" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

export const config: Config = {
    path: "/api/shop/update"
};
