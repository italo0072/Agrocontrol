import { test } from "node:test";
import assert from "node:assert/strict";
import { GET } from "../src/app/api/data/route";
import { POST } from "../src/app/api/commands/route";
test("API falla de forma controlada sin configuración ni sesión", async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  try {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    assert.equal(
      (await GET(new Request("http://localhost/api/data"))).status,
      503,
    );
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-public-key";
    const r = await GET(new Request("http://localhost/api/data"));
    assert.equal(r.status, 401);
    assert.equal(r.headers.get("cache-control"), "no-store");
    assert.equal(
      (
        await POST(
          new Request("http://localhost/api/commands", {
            method: "POST",
            body: "{}",
          }),
        )
      ).status,
      401,
    );
    assert.equal(
      (
        await POST(
          new Request("http://localhost/api/commands", {
            method: "POST",
            headers: { "content-length": "40000" },
            body: "{}",
          }),
        )
      ).status,
      413,
    );
  } finally {
    if (url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = url;
    if (key === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = key;
  }
});
