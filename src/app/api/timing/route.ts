export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const t = async (label: string, fn: () => Promise<unknown>) => {
    const t0 = performance.now();
    let status = 0;
    try {
      const r = (await fn()) as Response;
      status = r.status;
      await r.text();
    } catch (e) {
      status = -1;
    }
    return `${label}=${Math.round(performance.now() - t0)}ms(${status})`;
  };
  const parts = [
    await t('jwks', () => fetch(`${url}/auth/v1/.well-known/jwks.json`, { headers: { apikey: key } })),
    await t('rest', () => fetch(`${url}/rest/v1/gigs?select=id&limit=1`, { headers: { apikey: key } })),
    await t('user', () => fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })),
  ];
  return Response.json({ region: process.env.VERCEL_REGION, parts });
}
