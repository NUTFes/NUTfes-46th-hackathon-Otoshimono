import { Pool } from "pg";

export const db = new Pool({
	connectionTimeoutMillis: 5_000,
});
