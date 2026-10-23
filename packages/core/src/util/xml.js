// Tiny namespace-tolerant XML parser: enough for IATA AIDX messages (elements, attributes, text).
// Returns nodes { name, attrs, children, text }. No dependencies so it runs in browser and Node alike.
export function parseXml(xml) {
  const src = xml.replace(/<\?xml[^>]*\?>/g, '').replace(/<!--[\s\S]*?-->/g, '');
  const root = { name: '#root', attrs: {}, children: [], text: '' };
  const stack = [root]; const re = /<(\/?)([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*"[^"]*")*)\s*(\/?)>|([^<]+)/g; let m;
  while ((m = re.exec(src))) {
    const top = stack[stack.length - 1];
    if (m[5] !== undefined) { const t = m[5].trim(); if (t) top.text += decode(t); continue; }
    const [, close, rawName, rawAttrs, selfClose] = m; const name = rawName.split(':').pop();
    if (close) { stack.pop(); continue; }
    const attrs = {}; rawAttrs.replace(/([\w:.-]+)\s*=\s*"([^"]*)"/g, (_, k, v) => { attrs[k.split(':').pop()] = decode(v); });
    const node = { name, attrs, children: [], text: '' }; top.children.push(node);
    if (!selfClose) stack.push(node);
  }
  return root.children[0];
}
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
export const escXml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const child = (n, name) => n?.children.find((c) => c.name === name);
export const children = (n, name) => (n ? n.children.filter((c) => c.name === name) : []);
export const path = (n, ...names) => names.reduce((acc, nm) => child(acc, nm), n);
