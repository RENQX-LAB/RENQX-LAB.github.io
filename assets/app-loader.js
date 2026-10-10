const base = new URL('../', import.meta.url);
const response = await fetch(new URL('assets/index-Bi3gUn52.js', base), { cache: 'no-store' });
if (!response.ok) throw new Error('APP_BUNDLE_UNAVAILABLE');
const wrapper = await response.text();
const match = wrapper.match(/^const b='([^']+)'/);
if (!match) throw new Error('APP_BUNDLE_INVALID');
const bytes = Uint8Array.from(atob(match[1]), char => char.charCodeAt(0));
let source = await new Response(
  new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
).text();
const basePath = base.pathname.endsWith('/') ? base.pathname : `${base.pathname}/`;
source = source.replaceAll('/re-NQX/', basePath);
source = source.replace(
  './qr-scanner-worker.min-CJaXo3yu.js',
  new URL('assets/qr-scanner-worker.min-CJaXo3yu.js', base).href
);
const moduleUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
try {
  await import(moduleUrl);
} finally {
  URL.revokeObjectURL(moduleUrl);
}
