// White-label theme config. Everything brand-specific in the UI comes from here:
// product name, operator, airport display name, logo, colours, second language and currency.
// No real airport, airline or brand marks are used anywhere in the product.
export const THEME = {
  productName: 'Gateline',
  tagline: 'Airport retail media',
  operator: 'Meridian Airport Media',          // shown on house ads, reports and the claim page footer
  airportName: 'Meridian International',      // shown on the passenger claim page
  // Logo: inline SVG markup (drawn on the signal colour) or an image URL / data URI.
  logo: '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M6 24h20M16 6v18M9 13l7-7 7 7" stroke="currentColor" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  colors: {
    signal: '#FFC425',      // primary accent: wayfinding yellow
    signalInk: '#14181D',   // text/icons on the accent; also the dark brand surface
    nav: '#14181D',         // header background
    data: '#0F766E',        // charts (light theme)
    dataDark: '#2CC2AE',    // charts (dark control-room theme)
    ok: '#2E9E5B', warn: '#D99A00', bad: '#D64545', info: '#2F6FD6',
  },
  secondLanguage: { code: 'sw', label: 'Kiswahili', short: 'SW' },
  currency: { code: 'USD', symbol: '$' },
};

/** Push the config into CSS variables, favicon and title. Called once at boot. */
export function applyTheme(theme = THEME) {
  const r = document.documentElement.style; const c = theme.colors;
  r.setProperty('--signal', c.signal); r.setProperty('--signal-ink', c.signalInk); r.setProperty('--nav-bg', c.nav);
  r.setProperty('--ok', c.ok); r.setProperty('--warn', c.warn); r.setProperty('--bad', c.bad);
  r.setProperty('--brand-data-light', c.data); r.setProperty('--brand-data-dark', c.dataDark); r.setProperty('--brand-info', c.info);
  document.title = `${theme.productName} · ${theme.airportName}`;
  const svg = theme.logo.trim().startsWith('<svg') ? `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='${c.signal}'/><g color='${c.signalInk}'>${theme.logo.replace(/<\/?svg[^>]*>/g, '')}</g></svg>` : null;
  let link = document.querySelector('link[rel=icon]'); if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
  link.href = svg ? `data:image/svg+xml,${encodeURIComponent(svg)}` : theme.logo;
}
