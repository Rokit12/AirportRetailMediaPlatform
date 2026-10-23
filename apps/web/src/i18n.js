// UI strings: English + configurable second language (Kiswahili by default, see theme.config.js).
const SW = {
  'Platform Admin': 'Msimamizi wa jukwaa', Retailer: 'Muuzaji', 'Media Manager': 'Meneja wa matangazo', 'Airline Rep': 'Mwakilishi wa shirika la ndege', Passenger: 'Abiria',
  Overview: 'Muhtasari', 'Decision engine': 'Injini ya maamuzi', 'Master data': 'Data kuu', Incidents: 'Matukio', 'Data feeds': 'Mitiririko ya data',
  Dashboard: 'Dashibodi', Campaigns: 'Kampeni', Creatives: 'Matangazo', 'Promo codes': 'Misimbo ya ofa', Inventory: 'Nafasi za matangazo', Approvals: 'Idhini', Advertisers: 'Watangazaji', Matching: 'Ulinganisho',
  'My flights': 'Ndege zangu', 'Gate messaging': 'Ujumbe wa geti', 'Delay goodwill': 'Fidia ya kuchelewa', Partners: 'Washirika',
  'Screens online': 'Skrini zilizo hewani', 'Ad plays today': 'Matangazo leo', Impressions: 'Watazamaji', 'Revenue today': 'Mapato leo', 'Active campaigns': 'Kampeni hai', 'Avg latency': 'Ucheleweshaji wastani',
  Scans: 'Uchanganuzi', Redemptions: 'Matumizi ya ofa', 'Conversion': 'Ubadilishaji', 'Revenue attributed': 'Mapato yaliyotokana',
  Play: 'Cheza', Pause: 'Simamisha', 'Jump to': 'Ruka hadi', 'Inject event': 'Ingiza tukio', 'Split screen': 'Skrini mbili', 'Simulation time': 'Muda wa uigaji',
  'Why this ad?': 'Kwa nini tangazo hili?', 'Scan to claim': 'Changanua upate', 'Valid for': 'Inafaa kwa', Departures: 'Kuondoka', Gate: 'Geti', Delayed: 'Imechelewa', Boarding: 'Kupanda', 'On time': 'Kwa wakati', 'Gate closed': 'Geti limefungwa', Departed: 'Imeondoka', Scheduled: 'Imepangwa', Cancelled: 'Imefutwa',
  'Crowd in front of this screen': 'Umati mbele ya skrini hii', 'Top candidates': 'Wagombea wakuu', 'Winning rule': 'Kanuni iliyoshinda',
  'Your offer': 'Ofa yako', 'Redeem at the counter': 'Tumia kaunta', 'Share with family': 'Shiriki na familia', 'Expires in': 'Inaisha baada ya', Redeemed: 'Imetumika', Expired: 'Imeisha muda',
  'Show this code at': 'Onyesha msimbo huu katika', 'Family code': 'Msimbo wa familia', 'Passenger flow near my store': 'Mtiririko wa abiria karibu na duka langu', 'Next 60 min': 'Dakika 60 zijazo',
};
const DICTS = { en: {}, sw: SW };
let lang = 'en';
export const setLang = (l) => { lang = l; };
export const t = (s) => DICTS[lang]?.[s] || s;
export const adCopy = (cr, l) => cr?.copy?.[l] || cr?.copy?.en || { headline: '', sub: '', cta: '' };
