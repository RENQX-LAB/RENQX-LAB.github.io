const response = await fetch('./index-Bi3gUn52.js', { cache: 'no-store' });
if (!response.ok) throw new Error('APP_BUNDLE_UNAVAILABLE');
const wrapper = await response.text();
const match = wrapper.match(/^const b='([^']+)'/);
if (!match) throw new Error('APP_BUNDLE_INVALID');
const bytes = Uint8Array.from(atob(match[1]), char => char.charCodeAt(0));
let source = await new Response(
  new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
).text();
source = source.replaceAll('/re-NQX/', '/Re-NQX-Pages/');
source = source.replace(
  './qr-scanner-worker.min-CJaXo3yu.js',
  '/Re-NQX-Pages/assets/qr-scanner-worker.min-CJaXo3yu.js'
);
const moduleUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
try {
  await import(moduleUrl);
} finally {
  URL.revokeObjectURL(moduleUrl);
}
