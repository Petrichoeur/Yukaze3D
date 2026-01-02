import type { Context, Config } from "@netlify/functions";
import { neon } from "@netlify/neon";

// Hash password using SHA-256
async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

        // Create admin_credentials table if it doesn't exist
        await sql(`
            CREATE TABLE IF NOT EXISTS admin_credentials (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL DEFAULT 'admin',
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Check if default credentials exist, if not insert them
        const existingCredentials = await sql(`SELECT id FROM admin_credentials WHERE username = 'admin'`);

        if (existingCredentials.length === 0) {
            // Insert default hashed password (florianlegoat)
            const defaultPasswordHash = await hashPassword('florianlegoat');
            await sql(`
                INSERT INTO admin_credentials (username, password_hash)
                VALUES ('admin', $1)
            `, [defaultPasswordHash]);
        }

        // Get the submitted password
        const { password } = await req.json();

        if (!password) {
            return new Response(JSON.stringify({ error: "Password required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Hash the submitted password
        const submittedHash = await hashPassword(password);

        // Verify against stored hash
        const credentials = await sql(`
            SELECT password_hash FROM admin_credentials WHERE username = 'admin'
        `);

        if (credentials.length === 0) {
            return new Response(JSON.stringify({ success: false, error: "No credentials configured" }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }

        const isValid = credentials[0].password_hash === submittedHash;

        if (isValid) {
            return new Response(JSON.stringify({ success: true }), {
                headers: { "Content-Type": "application/json" }
            });
        } else {
            return new Response(JSON.stringify({ success: false, error: "Invalid password" }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }
    } catch (error) {
        console.error("Error verifying password:", error);
        return new Response(JSON.stringify({ error: "Authentication failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

export const config: Config = {
    path: "/api/auth/verify"
};
