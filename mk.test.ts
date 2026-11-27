(globalThis as any).window = { location: { origin: 'http://x', pathname: '/' } };
(globalThis as any).document = {};
const { clientApiFetch: api } = await import('./src/utils/clientApi');
const call = (m: string, p: string, b?: any) => api<any>(p, { method: m, body: b ? JSON.stringify(b) : undefined });
const t = Date.now();
await call('POST','/api/auth/register',{name:'عميل',contact:`e2e-d-${t}@example.com`,password:'secret12'});
for (const d of ['luxury','modern','minimal']) {
  const r = await call('POST','/api/invitations',{groomName:'أحمد',brideName:'سارة',weddingDate:'2027-02-02',venueName:'قاعة الماسة',designId:d});
  console.log('SLUG',d,r?.invitation?.slug||JSON.stringify(r).slice(0,200));
}
process.exit(0);
