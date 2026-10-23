// GenAI creative assistant. Default provider is an offline template engine (no API key needed);
// a real LLM provider can be plugged in (server: ANTHROPIC_API_KEY; playground: claude.ai `sample`).
const PRODUCTS = [
  { re: /sweet|candy|confection|mithai|chocolate/i, en: 'Festive sweets', sw: 'Peremende za sikukuu', icon: 'sweets', category: 'confectionery', pal: ['#FFF1E6', '#4A2511', '#D9480F'] },
  { re: /coffee|latte|espresso|flat white/i, en: 'Fresh coffee', sw: 'Kahawa safi', icon: 'coffee', category: 'coffee', pal: ['#F3E9DC', '#2E1B0F', '#8B5E34'] },
  { re: /perfume|fragrance|scent/i, en: 'Fragrances', sw: 'Manukato', icon: 'perfume', category: 'perfume', pal: ['#2B1442', '#F7EDE2', '#E9B44C'] },
  { re: /toy|game|kids/i, en: 'Toys', sw: 'Vinyago', icon: 'toy', category: 'toys', pal: ['#FFF4E0', '#3B1F0B', '#E8590C'] },
  { re: /book|read/i, en: 'Books', sw: 'Vitabu', icon: 'book', category: 'books', pal: ['#EEF3EA', '#1C3324', '#2F6F4E'] },
  { re: /headphone|electronic|gadget|charger/i, en: 'Travel tech', sw: 'Vifaa vya kielektroniki', icon: 'headphones', category: 'electronics', pal: ['#0B1530', '#E7ECFF', '#4F7BFF'] },
  { re: /meal|lunch|dinner|burger|food|restaurant/i, en: 'Hot meals', sw: 'Milo moto', icon: 'meal', category: 'restaurant', pal: ['#F1F6EA', '#22300F', '#5C7C3A'] },
  { re: /lounge|shower|quiet/i, en: 'Lounge access', sw: 'Sebule ya kupumzika', icon: 'lounge', category: 'lounge', pal: ['#0F1E3D', '#EAF0FB', '#7FB2FF'] },
  { re: /wine|whisky|spirit|liquor|beer/i, en: 'Spirits', sw: 'Vinywaji', icon: 'bottle', category: 'liquor', pal: ['#1A1206', '#FFF7E6', '#D4A017'] },
  { re: /dress|fashion|wear|cloth/i, en: 'Travel fashion', sw: 'Mavazi ya safari', icon: 'dress', category: 'fashion', pal: ['#FFF0F6', '#4A0D2B', '#BE185D'] },
  { re: /juice|smoothie/i, en: 'Fresh juice', sw: 'Juisi safi', icon: 'juice', category: 'restaurant', pal: ['#FFFBEB', '#422006', '#CA8A04'] },
];
const AUD = [
  { re: /famil|kids|children/i, w: { family: 1, kids: 0.6 }, en: 'Treats for the whole family before you fly.', sw: 'Zawadi kwa familia nzima kabla ya safari.' },
  { re: /business|work|executive/i, w: { business: 1, ff: 0.5 }, en: 'Made for travellers on a schedule.', sw: 'Kwa wasafiri wenye ratiba ngumu.' },
  { re: /holiday|vacation|beach|leisure/i, w: { holiday: 1, couple: 0.5 }, en: 'Start your holiday here.', sw: 'Anza likizo yako hapa.' },
  { re: /student|young/i, w: { student: 1, young: 0.7 }, en: 'Fuel for the journey ahead.', sw: 'Nguvu kwa safari iliyo mbele.' },
];
export function mockCreative(brief, { secondLang = 'sw' } = {}) {
  const prod = PRODUCTS.find((p) => p.re.test(brief)) || { en: (brief.split(',')[0] || 'Special offer').trim(), sw: 'Ofa maalum', icon: 'gift', category: 'retail', pal: ['#F4F7FB', '#0F172A', '#2563EB'] };
  const pct = brief.match(/(\d{1,2})\s?%/); const bogo = brief.match(/buy\s?(\d)\s?get\s?(\d)/i); const two = /2[- ]for[- ]1|two for one/i.test(brief);
  const disc = pct ? `${pct[1]}%` : bogo ? `Buy ${bogo[1]} get ${bogo[2]}` : two ? '2-for-1' : null;
  const discSw = pct ? `punguzo la ${pct[1]}%` : bogo ? `nunua ${bogo[1]} upate ${bogo[2]}` : two ? '2 kwa 1' : 'ofa maalum';
  const aud = AUD.find((a) => a.re.test(brief));
  const weights = { ...(aud?.w || {}) };
  if (/domestic/i.test(brief)) weights.domestic = 0.8; if (/international/i.test(brief)) weights.intl = 0.8;
  const filters = /domestic/i.test(brief) ? { nature: 'domestic' } : /international/i.test(brief) ? { nature: 'intl' } : {};
  return {
    provider: 'mock-template', template: 'offer', icon: prod.icon, category: prod.category, palette: { bg: prod.pal[0], fg: prod.pal[1], accent: prod.pal[2] },
    copy: {
      en: { headline: disc ? `${prod.en}, ${pct ? disc + ' off' : disc.toLowerCase()}` : prod.en, sub: aud?.en || 'A little something for the journey, two minutes from your gate.', cta: 'Scan to claim' },
      [secondLang]: { headline: `${prod.sw}, ${discSw}`, sub: aud?.sw || 'Kitu kidogo kwa safari, dakika mbili kutoka geti lako.', cta: 'Changanua upate' },
    },
    suggestedWeights: weights, suggestedFilters: filters, discount: disc,
  };
}
export function creativePrompt(brief, secondLang = 'Kiswahili') {
  return `Write airport digital-signage ad copy for this brief: "${brief}". Return JSON only:
{"headline_en":"<=6 words","sub_en":"<=14 words","cta_en":"<=3 words","headline_2":"same in ${secondLang}","sub_2":"same in ${secondLang}","cta_2":"same in ${secondLang}"}
Plain, friendly, no exclamation marks, no real brand names.`;
}
export function mergeLlmCreative(base, text, secondLang = 'sw') {
  const j = JSON.parse(String(text).replace(/```json|```/g, '').match(/\{[\s\S]*\}/)[0]);
  return { ...base, provider: 'llm', copy: { en: { headline: j.headline_en, sub: j.sub_en, cta: j.cta_en }, [secondLang]: { headline: j.headline_2, sub: j.sub_2, cta: j.cta_2 } } };
}
