import type { Context, Config } from "@netlify/functions";
import { neon } from "@netlify/neon";

export default async (req: Request, context: Context) => {
    if (req.method !== "DELETE" && req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const sql = neon();
        const body = await req.json();

        const { id } = body;

        if (!id) {
            return new Response(JSON.stringify({ error: "id is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const result = await sql(
            `DELETE FROM shop_items WHERE id = $1 RETURNING *`,
            [id]
        );

        if (result.length === 0) {
            return new Response(JSON.stringify({ error: "Item not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        return new Response(JSON.stringify({ success: true, deleted: result[0] }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error("Error deleting shop item:", error);
        return new Response(JSON.stringify({ error: "Failed to delete shop item" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

export const config: Config = {
    path: "/api/shop/delete"
};
