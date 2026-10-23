// UI strings: English + a configurable second language (Kiswahili by default, see theme.config.js).
//
// How it works: every visible English string in the app is a key in the dictionary below. When the second
// language is active, `autoTranslate()` watches the rendered DOM and swaps each text node (and placeholder /
// title / aria-label attributes) for its translation, and switches back when English is selected again.
// Engine-generated sentences (decision rules, filter reasons, alerts, feed events) are translated by the
// PATTERNS list, which keeps the data values (flight numbers, minutes, gates) intact.
// Ad creatives and the passenger claim page carry their own per-language copy and are marked data-no-i18n.
// To add another language: add a dictionary + patterns here and set THEME.secondLanguage.
import { THEME } from './theme.config.js';

const SW = {
  // roles & navigation
  'Platform Admin': 'Msimamizi wa jukwaa', Retailer: 'Muuzaji', 'Media Manager': 'Meneja wa matangazo', 'Airline Rep': 'Shirika la ndege', Passenger: 'Abiria',
  Overview: 'Muhtasari', 'Decision engine': 'Injini ya maamuzi', 'Master data': 'Data kuu', Incidents: 'Matukio', 'Data feeds': 'Mitiririko ya data',
  Dashboard: 'Dashibodi', Campaigns: 'Kampeni', Creatives: 'Matangazo', 'Promo codes': 'Misimbo ya ofa', History: 'Historia', Inventory: 'Nafasi za matangazo', Approvals: 'Idhini',
  Advertisers: 'Watangazaji', Matching: 'Ulinganisho', Packages: 'Vifurushi', 'My flights': 'Ndege zangu', 'Gate messaging': 'Ujumbe wa geti', 'Delay goodwill': 'Fidia ya kuchelewa',
  Partners: 'Washirika', 'last 30 days + today': 'siku 30 zilizopita + leo', 'Zone': 'Kanda', 'Revenue currency (code)': 'Sarafu ya mapato (msimbo)', 'Currency symbol': 'Alama ya sarafu', 'Passenger presence by zone (current 5-minute window)': 'Uwepo wa abiria kwa kanda (kipindi cha sasa cha dakika 5)', 'From AODB/AIDX flights at nearby gates and ACRIS queue gauges': 'Kutoka ndege za AODB/AIDX kwenye geti za karibu na vipimo vya foleni vya ACRIS', 'Top nationalities': 'Mataifa makuu', 'Top destinations': 'Maeneo makuu', 'Security queue': 'Foleni ya ukaguzi', wait: 'kusubiri', 'Hide full crowd profile': 'Ficha wasifu kamili wa umati', 'Show full crowd profile': 'Onyesha wasifu kamili wa umati', 'Crowd size': 'Ukubwa wa umati', 'in 30 min': 'baada ya dak 30', 'Time context': 'Muktadha wa muda', 'Median dwell': 'Muda wa kati wa kusubiri', 'Max delay': 'Kuchelewa kwa juu', Destinations: 'Maeneo yanayoenda', 'Arriving from / connecting': 'Wanaotoka / wanaounganisha', 'Trip purpose': 'Madhumuni ya safari', 'Party type': 'Aina ya kikundi', 'Age band': 'Kundi la umri', Gender: 'Jinsia', female: 'wanawake', male: 'wanaume', Cabin: 'Daraja', 'Premium economy': 'Uchumi wa hadhi', Economy: 'Uchumi', Nationalities: 'Mataifa', Languages: 'Lugha', 'All outlets': 'Maduka yote', 'choose an outlet above': 'chagua duka hapo juu', 'today, screens near this outlet': 'leo, skrini karibu na duka hili', 'Trigger rule': 'Kanuni ya kichocheo', When: 'Lini', 'A nearby flight is delayed': 'Ndege ya karibu imechelewa', 'A nearby flight changes gate': 'Ndege ya karibu imebadilisha geti', 'Boarding starts at a nearby gate': 'Upandaji umeanza kwenye geti la karibu', 'It is a festival day': 'Ni siku ya sikukuu', 'Specific screens (optional)': 'Skrini maalum (si lazima)', 'Specific gates (codes, e.g. 40,41,42)': 'Geti maalum (misimbo, mf. 40,41,42)', 'Destinations (airports)': 'Maeneo yanayoenda (viwanja vya ndege)', 'Only when a nearby flight is delayed at least (min, optional)': 'Tu ndege ya karibu ikichelewa angalau (dak, si lazima)', 'Uploaded image': 'Picha iliyopakiwa', 'Image file (PNG, JPEG, WebP or GIF, up to 2 MB)': 'Faili la picha (PNG, JPEG, WebP au GIF, hadi MB 2)', 'Image larger than 2 MB': 'Picha ni kubwa kuliko MB 2', 'Advertiser report': 'Ripoti ya mtangazaji', 'Incidents & feeds': 'Matukio na mitiririko', 'Campaigns & history': 'Kampeni na historia', 'Creatives & promo codes': 'Matangazo na misimbo ya ofa', 'Inventory & yield': 'Nafasi na mavuno', 'Advertisers & reports': 'Watangazaji na ripoti', 'Screen simulator': 'Kiigaji cha skrini', 'Split screen': 'Skrini mbili', 'Static demo: the full engine runs in this page.': 'Onyesho tuli: injini yote inaendeshwa ndani ya ukurasa huu.',
  'Connected to the API.': 'Imeunganishwa na API.', 'Data: fictional airport, airlines and brands. No passenger-level data.': 'Data: uwanja wa ndege, mashirika na chapa za kubuni. Hakuna data ya abiria mmoja mmoja.',
  'Connecting to the simulation…': 'Inaunganisha na uigaji…', Company: 'Kampuni', Language: 'Lugha', Role: 'Jukumu',

  // simulation bar
  'Simulation time': 'Muda wa uigaji', 'Simulation controls': 'Vidhibiti vya uigaji', Play: 'Cheza', Pause: 'Simamisha', 'Jump to': 'Ruka hadi', 'Jump to time': 'Ruka hadi muda', Go: 'Nenda',
  'Delay XY501 +45 min': 'Chelewesha XY501 dak +45', 'Inject event': 'Ingiza tukio', 'Inject event…': 'Ingiza tukio…', 'Worked example': 'Mfano uliofanyiwa kazi', Reset: 'Anza upya',
  'Back to 14:02 with no injected events': 'Rudi 14:02 bila matukio yaliyoingizwa', 'Push an IATA AIDX delay message for XY501 (Gate 42) through the feed adapter': 'Tuma ujumbe wa kuchelewa wa IATA AIDX kwa XY501 (Geti 42) kupitia adapta ya mtiririko',
  'Wed 14 Oct 2026': 'Jumatano 14 Okt 2026',

  // inject modal
  'Inject an event': 'Ingiza tukio', 'Delay flight': 'Chelewesha ndege', 'Gate change': 'Badiliko la geti', 'Screen offline': 'Skrini nje ya mtandao', 'Feed lag': 'Kuchelewa kwa mtiririko', 'Failed creative': 'Tangazo lililoshindwa', 'AI fault': 'Hitilafu ya AI',
  'Departure (next 4 hours)': 'Kuondoka (saa 4 zijazo)', 'Additional delay (minutes)': 'Kuchelewa zaidi (dakika)', 'New gate': 'Geti jipya', 'Send AIDX delay': 'Tuma kuchelewa kwa AIDX', 'Send AIDX gate change': 'Tuma badiliko la geti kwa AIDX',
  'Builds an IATA_AIDX_FlightLegNotifRQ with the new estimated off-block time and pushes it through the AIDX adapter, exactly like a live AODB message.': 'Huunda IATA_AIDX_FlightLegNotifRQ yenye muda mpya unaokadiriwa wa kuondoka na kuupitisha kwenye adapta ya AIDX, sawa kabisa na ujumbe halisi wa AODB.',
  'The screen stops sending heartbeats; after 5 simulated minutes an incident is raised automatically.': 'Skrini huacha kutuma ishara za uhai; baada ya dakika 5 za uigaji tukio hufunguliwa moja kwa moja.',
  'Take offline': 'Ondoa mtandaoni', 'AIDX feed silent for (minutes)': 'Mtiririko wa AIDX kimya kwa (dakika)', 'Inject feed lag': 'Ingiza kuchelewa kwa mtiririko',
  'After 5 minutes of silence the verifier marks AIDX evidence stale: AI proposals are rejected and screens fall back to the rule-based default. Buffered messages arrive when the feed recovers.': 'Baada ya dakika 5 za ukimya mthibitishaji huona ushahidi wa AIDX umepitwa na wakati: mapendekezo ya AI hukataliwa na skrini hurudi kwenye chaguo la kanuni. Jumbe zilizohifadhiwa hufika mtiririko ukirejea.',
  'Break the creative now playing on': 'Vunja tangazo linaloonyeshwa sasa kwenye', 'Fail creative': 'Fanya tangazo lishindwe',
  "The creative's media asset stops loading on players (simulated CDN 404). Validation blocks it, an incident is raised for the media desk, and the campaign falls back to its other creative or loses the slot. Fix it from Retailer → Creatives → Re-upload.": 'Faili la tangazo haliwezi kupakiwa kwenye skrini (CDN 404 ya uigaji). Uthibitishaji hulizuia, tukio hufunguliwa kwa dawati la matangazo, na kampeni hutumia tangazo lake jingine au hupoteza nafasi. Rekebisha kupitia Muuzaji → Matangazo → Pakia upya.',
  'All screens': 'Skrini zote', 'Inject hallucination': 'Ingiza uzushi wa AI', Clear: 'Futa',
  'The AI agent starts citing a fabricated flight (XY999, “delayed 95 min”) and inflates a weak campaign’s score. The deterministic verifier rejects it because the evidence is not in any trusted feed and the score cannot be reproduced.': 'Wakala wa AI anaanza kutaja ndege ya kubuni (XY999, “imechelewa dak 95”) na kuongeza alama ya kampeni dhaifu. Mthibitishaji huikataa kwa sababu ushahidi haupo kwenye mtiririko wowote unaoaminika na alama haiwezi kurudiwa.',

  // map & admin overview
  'Live network map': 'Ramani ya mtandao moja kwa moja', online: 'hewani', degraded: 'dhaifu', offline: 'nje ya mtandao', 'Heat on': 'Joto limewashwa', Off: 'Zima', 'Open screen': 'Fungua skrini',
  'Terminal map with screen status and passenger heat': 'Ramani ya jengo yenye hali ya skrini na msongamano wa abiria',
  'Screens online': 'Skrini zilizo hewani', 'Ad plays today': 'Matangazo yaliyoonyeshwa leo', Impressions: 'Watazamaji', 'Revenue today': 'Mapato leo', 'Active campaigns': 'Kampeni hai', 'Avg latency': 'Ucheleweshaji wastani',
  '15-second slots': 'nafasi za sekunde 15', 'estimated viewers': 'watazamaji wanaokadiriwa', 'screen heartbeat': 'ishara ya uhai ya skrini',
  'Incidents and alerts': 'Matukio na tahadhari', All: 'Zote', 'No open incidents': 'Hakuna matukio wazi', 'Revenue by hour': 'Mapato kwa saa', 'Data feed health': 'Afya ya mitiririko ya data', Inspect: 'Kagua',
  Feed: 'Mtiririko', Adapter: 'Adapta', 'msg/min': 'jumbe/dak', Last: 'Mwisho', snapshot: 'picha ya hali', ok: 'sawa', lagging: 'inachelewa', stale: 'imepitwa',
  'Platform performance': 'Utendaji wa jukwaa', 'API p95 latency': 'Ucheleweshaji wa API p95', 'Day rebuild on jump': 'Kujenga upya siku wakati wa kuruka', 'Screen uptime, last 7 days': 'Muda skrini zilikuwa hewani, siku 7 zilizopita',

  // decision engine
  'Rule engine settings': 'Mipangilio ya injini ya kanuni', 'Save and re-plan': 'Hifadhi na upange upya',
  'Final score = match weight × min(1, audience match × trigger boost) + performance weight × learned conversion, × budget pacing.': 'Alama ya mwisho = uzito wa ulinganifu × min(1, ulinganifu wa hadhira × nyongeza ya kichocheo) + uzito wa utendaji × ubadilishaji uliojifunzwa, × mwendo wa bajeti.',
  'Exploration (% of slots)': 'Majaribio (% ya nafasi)', 'Default frequency cap (plays / screen / hour)': 'Kikomo cha marudio (maonyesho / skrini / saa)', 'Max consecutive plays': 'Maonyesho mfululizo ya juu zaidi',
  'Airline boarding window (min before ETD)': 'Dirisha la kupanda la shirika (dak kabla ya ETD)', 'Competitor separation (no two brands of the same category back to back)': 'Kutenganisha washindani (chapa mbili za aina moja zisifuatane)',
  'Airline priority in its own boarding window': 'Kipaumbele cha shirika katika dirisha lake la kupanda', 'Decision log': 'Kumbukumbu ya maamuzi', 'Search flight, screen, campaign…': 'Tafuta ndege, skrini, kampeni…',
  'Trigger boost': 'Nyongeza ya kichocheo', 'AI rejected': 'AI imekataliwa', 'Airline priority': 'Kipaumbele cha shirika', 'Manual pin': 'Kubandika kwa mkono',
  Time: 'Muda', Screen: 'Skrini', Winner: 'Mshindi', Score: 'Alama', Rule: 'Kanuni', verified: 'imethibitishwa', fallback: 'chaguo mbadala',
  'No decisions match. Clear the search or let the simulation run.': 'Hakuna maamuzi yanayolingana. Futa utafutaji au acha uigaji uendelee.',
  'Ask the LLM agent to re-rank this slot': 'Muombe wakala wa LLM apange upya nafasi hii', 'Asking the AI agent…': 'Inamuuliza wakala wa AI…', 'Provider:': 'Mtoa huduma:',
  'none configured (mock agent in use)': 'hakuna aliyesanidiwa (wakala wa majaribio anatumika)', 'verified, would execute': 'imethibitishwa, ingetekelezwa',

  // why this ad
  'Why this ad?': 'Kwa nini tangazo hili?', 'Crowd in front of this screen': 'Umati mbele ya skrini hii', 'Top candidates': 'Wagombea wakuu', 'Winning rule': 'Kanuni iliyoshinda',
  Campaign: 'Kampeni', Match: 'Ulinganifu', Boost: 'Nyongeza', Final: 'Mwisho', Result: 'Matokeo', Plays: 'Inaonyeshwa', 'Next in rotation': 'Inayofuata kwenye mzunguko',
  'Evidence trail (every input is a recorded data point)': 'Mnyororo wa ushahidi (kila ingizo ni data iliyorekodiwa)', Source: 'Chanzo', Id: 'Kitambulisho', Value: 'Thamani', Age: 'Umri',
  missing: 'haipo', 'Cited by the AI, not found in any trusted feed': 'Imetajwa na AI, haipatikani kwenye mtiririko wowote unaoaminika', rejected: 'imekataliwa',
  'pax · median dwell': 'abiria · muda wa kati wa kusubiri', 'Flights:': 'Ndege:',

  // crowd segments
  Holiday: 'Likizo', Business: 'Biashara', Family: 'Familia', Families: 'Familia', Couple: 'Wanandoa', Couples: 'Wanandoa', Solo: 'Peke yao', Group: 'Kikundi',
  'Adults 25–54': 'Watu wazima 25–54', 'Under 12': 'Chini ya 12', '12–17': '12–17', '18–24': '18–24', '55+': '55+', 'Premium cabin': 'Daraja la juu', International: 'Kimataifa', Domestic: 'Ndani ya nchi',
  'Visiting family': 'Kutembelea familia', 'Visiting friends & family': 'Kutembelea marafiki na familia', 'Family with children': 'Familia yenye watoto', Student: 'Mwanafunzi', Religious: 'Kidini',
  'Frequent flyer': 'Msafiri wa mara kwa mara', Female: 'Wanawake', Male: 'Wanaume',

  // master data & incidents
  Terminals: 'Majengo ya abiria', 'Vendors & retailers': 'Wauzaji na wachuuzi', 'Outlets & F&B': 'Maduka na migahawa', Airlines: 'Mashirika ya ndege', 'Locations: zones': 'Maeneo: kanda', 'Locations: gates': 'Maeneo: geti',
  'Gate assignments': 'Ugawaji wa geti', 'Aircraft types': 'Aina za ndege', Screens: 'Skrini', Search: 'Tafuta', Add: 'Ongeza', Edit: 'Hariri', Save: 'Hifadhi', Saved: 'Imehifadhiwa', 'Choose…': 'Chagua…',
  records: 'rekodi', Name: 'Jina', Type: 'Aina', Category: 'Kundi', Operator: 'Mwendeshaji', Zone: 'Kanda', Unit: 'Kitengo', IATA: 'IATA', ICAO: 'ICAO', Model: 'Mfumo', Market: 'Soko', Terminal: 'Jengo', Kind: 'Aina', Gate: 'Geti',
  Size: 'Ukubwa', Orientation: 'Mwelekeo', 'Nearest gates': 'Geti za karibu', Flight: 'Ndege', Planned: 'Iliyopangwa', Occupied: 'Imekaliwa', Body: 'Umbo', 'Seat configuration': 'Mpangilio wa viti', 'Legs today': 'Safari leo', changed: 'imebadilika',
  'Code (e.g. T3)': 'Msimbo (mf. T3)', 'Role (e.g. Domestic, International)': 'Jukumu (mf. Ndani, Kimataifa)', 'IATA code': 'Msimbo wa IATA', 'ICAO code': 'Msimbo wa ICAO', 'Gate code': 'Msimbo wa geti', 'Zone id': 'Kitambulisho cha kanda',
  'Operator (advertiser id)': 'Mwendeshaji (kitambulisho cha mtangazaji)', 'Opening hours': 'Saa za kufungua', 'Nearest gates (comma separated codes)': 'Geti za karibu (misimbo iliyotenganishwa kwa koma)', 'Base CPM': 'CPM ya msingi',
  'A new terminal is created with check-in, security, plaza and arrivals zones, ready for gates and screens.': 'Jengo jipya huundwa likiwa na kanda za kuingia, ukaguzi, uwanja wa maduka na wanaowasili, tayari kwa geti na skrini.',
  'Changes are written to the database and screens are re-planned immediately.': 'Mabadiliko huandikwa kwenye hifadhidata na skrini hupangwa upya mara moja.',
  retailer: 'muuzaji', fnb: 'mgahawa', brand: 'chapa', services: 'huduma', airline: 'shirika la ndege', pier: 'gati', plaza: 'uwanja wa maduka', landside: 'upande wa umma', checkpoint: 'kituo cha ukaguzi', arrivals: 'wanaowasili', bus: 'basi',
  gate: 'geti', corridor: 'korido', ledwall: 'ukuta wa LED', security: 'ukaguzi', checkin: 'kuingia', outlet: 'duka', belt: 'mkanda wa mizigo', landscape: 'mlalo', portrait: 'wima', regional: 'kikanda', narrow: 'nyembamba', wide: 'pana',
  Open: 'Wazi', Resolved: 'Zimetatuliwa', 'Log a bug': 'Ripoti hitilafu', Raised: 'Ilifunguliwa', Severity: 'Uzito', Title: 'Kichwa', Area: 'Eneo', Owner: 'Mhusika', Status: 'Hali', resolved: 'imetatuliwa', open: 'wazi', acknowledged: 'imepokelewa',
  low: 'chini', medium: 'wastani', high: 'juu', critical: 'hatari', 'Log a bug or incident': 'Ripoti hitilafu au tukio', 'Log incident': 'Ripoti tukio', Logged: 'Imerekodiwa',
  'Field service': 'Huduma za uwandani', 'Integration on-call': 'Zamu ya muunganisho', 'Data science': 'Sayansi ya data', 'Platform team': 'Timu ya jukwaa', 'Media desk': 'Dawati la matangazo', Unassigned: 'Hajapangiwa',
  'Nothing here. Auto-raised alerts appear when a screen is offline for 5+ minutes, a feed lags, a creative fails or the AI verifier rejects fabricated evidence.': 'Hakuna kitu hapa. Tahadhari za moja kwa moja huonekana skrini ikiwa nje ya mtandao dakika 5+, mtiririko ukichelewa, tangazo likishindwa au mthibitishaji wa AI akikataa ushahidi wa kubuni.',
  Screens_: 'Skrini', Creatives_: 'Matangazo', 'Decision engine_': 'Injini ya maamuzi', 'Data feeds_': 'Mitiririko ya data', Manual: 'Kwa mkono', Bug: 'Hitilafu',

  // feeds
  'Each source sits behind an adapter; switch with one config value (AODB_SOURCE, FLIGHT_SOURCE, ACRIS_SOURCE).': 'Kila chanzo kiko nyuma ya adapta; badilisha kwa thamani moja ya mipangilio (AODB_SOURCE, FLIGHT_SOURCE, ACRIS_SOURCE).',
  'Adapter in use': 'Adapta inayotumika', 'Messages / min': 'Jumbe / dak', 'Messages today': 'Jumbe leo', 'Last message': 'Ujumbe wa mwisho', 'daily snapshot': 'picha ya kila siku', 'Raw message stream': 'Mtiririko ghafi wa jumbe',
  'Push a raw IATA AIDX message': 'Tuma ujumbe ghafi wa IATA AIDX', 'Send through adapter': 'Pitisha kwenye adapta',
  'Paste any FlightLegNotifRQ. It is parsed by the same AIDX adapter as the live feed, mapped to a canonical FlightEvent and applied within one tick.': 'Bandika FlightLegNotifRQ yoyote. Huchambuliwa na adapta ileile ya AIDX kama mtiririko halisi, hubadilishwa kuwa FlightEvent ya kawaida na kutumika ndani ya mzunguko mmoja.',
  'AODB flight movements (33-col CSV)': 'Mienendo ya ndege ya AODB (CSV ya safu 33)', 'IATA AIDX 16.1 FlightLegNotifRQ': 'IATA AIDX 16.1 FlightLegNotifRQ', 'ACI ACRIS / NGSI-LD': 'ACI ACRIS / NGSI-LD',

  // retailer
  'Dashboard · live': 'Dashibodi · moja kwa moja', live: 'moja kwa moja', 'New campaign': 'Kampeni mpya', Scans: 'Uchanganuzi', Redemptions: 'Matumizi ya ofa', Conversion: 'Ubadilishaji', 'Revenue attributed': 'Mapato yaliyotokana',
  'today, all screens': 'leo, skrini zote', 'per 1,000 impressions': 'kwa kila watazamaji 1,000', 'from real phones today': 'kutoka simu halisi leo', 'redemptions / scans': 'matumizi / uchanganuzi', 'media spend': 'gharama ya matangazo',
  'Passenger flow near my store': 'Mtiririko wa abiria karibu na duka langu', 'Next 60 min': 'Dakika 60 zijazo', 'pax boarding near': 'abiria wanapanda karibu na', 'international, top destinations': 'kimataifa, maeneo makuu wanayoenda', 'top nationalities': 'mataifa makuu',
  'Passengers in the zone, next 2 hours (5-minute windows, from upcoming departures)': 'Abiria katika kanda, saa 2 zijazo (vipindi vya dakika 5, kutoka safari zinazokuja)', now: 'sasa',
  Boarding: 'Kupanda', To: 'Kwenda', Pax: 'Abiria', 'Loading flow…': 'Inapakia mtiririko…', 'Today by hour': 'Leo kwa saa', 'Live redemptions': 'Matumizi ya ofa moja kwa moja', 'from QR scans': 'kutoka uchanganuzi wa QR',
  'Scan a QR code on a passenger screen to see it land here within a second.': 'Changanua msimbo wa QR kwenye skrini ya abiria uone ukifika hapa ndani ya sekunde moja.', 'Playing now on': 'Inaonyeshwa sasa kwenye', screens: 'skrini',
  'Campaigns today': 'Kampeni leo', Spend: 'Matumizi', Revenue: 'Mapato', Placement: 'Mahali', 'Pacing today': 'Mwendo wa leo', 'Redemptions today': 'Matumizi ya ofa leo', 'ROI to date': 'ROI hadi sasa', of: 'kati ya',
  campaigns: 'kampeni', active: 'hai', pending: 'inasubiri', paused: 'imesitishwa', completed: 'imekamilika', standby: 'akiba', approved: 'imeidhinishwa', 'out of stock': 'imeisha dukani', 'trigger rule': 'kanuni ya kichocheo',
  Pause_: 'Sitisha', Resume: 'Endelea', 'Mark out of stock': 'Weka kuwa imeisha', 'Mark in stock': 'Weka kuwa ipo', Duplicate: 'Nakili', 'Plays today': 'Maonyesho leo', 'Learned conversion': 'Ubadilishaji uliojifunzwa', 'index used in scoring': 'kipimo kinachotumika kwenye alama',
  'Budget pacing': 'Mwendo wa bajeti', 'Performance by segment': 'Utendaji kwa kundi', Segment: 'Kundi', 'Audience share': 'Sehemu ya hadhira', 'Redemption share': 'Sehemu ya matumizi', Lift: 'Ongezeko', Weight: 'Uzito',
  'Suggested weight changes': 'Mabadiliko ya uzito yanayopendekezwa', Apply: 'Tumia', 'No delivery yet today.': 'Hakuna maonyesho bado leo.', 'A/B creative comparison': 'Ulinganisho wa matangazo A/B', Creative: 'Tangazo', 'per 1,000': 'kwa 1,000', 'Leader:': 'Kiongozi:',
  'Smart recommendation': 'Pendekezo mahiri', Tomorrow: 'Kesho', 'Predicted impressions': 'Watazamaji wanaotabiriwa', 'Best 3 slots for this campaign tomorrow': 'Nafasi 3 bora kwa kampeni hii kesho', 'Best 3 slots tomorrow': 'Nafasi 3 bora kesho',
  'Impressions by screen and hour': 'Watazamaji kwa skrini na saa', Hour: 'Saa', 'records (campaign × screen × hour), stored in the impressions table': 'rekodi (kampeni × skrini × saa), zimehifadhiwa kwenye jedwali la watazamaji', 'Show more': 'Onyesha zaidi', 'Show fewer': 'Onyesha chache',
  'Campaign name': 'Jina la kampeni', 'e.g. Weekend fragrance offer': 'mf. Ofa ya manukato ya wikendi', 'Target zones': 'Kanda lengwa', 'Audience weights (0 = ignore, 1 = matters most)': 'Uzito wa hadhira (0 = puuza, 1 = muhimu zaidi)',
  Passengers: 'Abiria', 'International only': 'Kimataifa pekee', 'Domestic only': 'Ndani ya nchi pekee', 'Min dwell (min)': 'Muda wa chini wa kusubiri (dak)', 'Min crowd (pax)': 'Umati wa chini (abiria)', 'Destination regions': 'Kanda za maeneo yanayoenda',
  'Trigger rule:': 'Kanuni ya kichocheo:', 'boost when a nearby flight is delayed': 'ongeza alama ndege ya karibu ikichelewa', 'Delay over (min)': 'Kuchelewa zaidi ya (dak)', 'To region': 'Kwenda kanda', Any: 'Yoyote', 'At gates (e.g. 40,41,42)': 'Kwenye geti (mf. 40,41,42)',
  'Only play while the trigger is active': 'Onyesha tu kichocheo kikiwa hai', 'Daypart from': 'Sehemu ya siku kuanzia', to: 'hadi', 'End date': 'Tarehe ya mwisho', 'Total budget': 'Bajeti yote', 'Daily cap': 'Kikomo cha siku', 'Freq cap / screen / hour': 'Kikomo cha marudio / skrini / saa',
  'Promo / discount': 'Ofa / punguzo', 'Avg basket': 'Wastani wa ununuzi', 'CPM bid': 'Zabuni ya CPM', 'Preview on a mock screen (Gate holdroom, 16:9)': 'Onyesho kwenye skrini ya mfano (chumba cha kusubiri getini, 16:9)',
  'Live audience-match preview': 'Onyesho la ulinganifu wa hadhira moja kwa moja', 'Pick target zones to see the match.': 'Chagua kanda lengwa uone ulinganifu.', 'Submit for approval': 'Wasilisha kwa idhini', 'Save and resubmit': 'Hifadhi na uwasilishe upya',
  'Media Manager reviews brand safety before it plays.': 'Meneja wa matangazo hukagua usalama wa chapa kabla ya kuonyeshwa.', 'New gate-area message': 'Ujumbe mpya wa eneo la geti',
  'Matches': 'Inalingana na', 'of the crowd at': 'ya umati katika', from: 'kuanzia', 'expected': 'inatarajiwa', 'impressions and': 'watazamaji na', redemptions: 'matumizi ya ofa',
  'GenAI creative assistant': 'Msaidizi wa matangazo wa GenAI', Brief: 'Maelezo mafupi', 'Generate ad page': 'Tengeneza ukurasa wa tangazo', 'Generate with LLM': 'Tengeneza kwa LLM', 'Writing…': 'Inaandika…', 'Suggested targeting:': 'Ulengaji unaopendekezwa:',
  'Save to library': 'Hifadhi kwenye maktaba', Discard: 'Tupa', English: 'Kiingereza', Library: 'Maktaba', Reuse: 'Tumia tena', 'Re-upload': 'Pakia upya', failed: 'imeshindwa', 'Upload / build from template': 'Pakia / jenga kutoka kiolezo',
  Template: 'Kiolezo', Pictogram: 'Picha ishara', Accent: 'Rangi kuu', Offer: 'Ofa', Split: 'Imegawanywa', 'Flight / airline': 'Ndege / shirika', 'Save creative': 'Hifadhi tangazo', headline: 'kichwa', sub: 'maelezo', cta: 'wito wa kitendo',
  'Default: offline template engine · LLM:': 'Chaguo-msingi: injini ya violezo bila mtandao · LLM:', 'not configured': 'haijasanidiwa',
  'Codes are issued per screen and flight, and expire when the linked flight closes boarding.': 'Misimbo hutolewa kwa kila skrini na ndege, na huisha muda ndege husika ikifunga upandaji.', 'codes issued today': 'misimbo iliyotolewa leo',
  Code: 'Msimbo', 'Linked flight': 'Ndege husika', Expires: 'Inaisha', issued: 'imetolewa', redeemed: 'imetumika', expired: 'imeisha muda', 'family code from': 'msimbo wa familia kutoka', in: 'baada ya',
  'Codes appear when one of your promos is on a passenger screen. Open the Passenger view on a screen showing your ad.': 'Misimbo huonekana ofa yako ikiwa kwenye skrini ya abiria. Fungua mwonekano wa Abiria kwenye skrini inayoonyesha tangazo lako.',
  'Campaign history': 'Historia ya kampeni', 'Last 30 days and completed campaigns': 'Siku 30 zilizopita na kampeni zilizokamilika', Run: 'Muda wa kampeni', Trend: 'Mwelekeo', 'Run again': 'Endesha tena',

  // media manager
  'International premium (T2 gates + LED)': 'Kimataifa ya hadhi (geti za T2 + LED)', Today: 'Leo', Available: 'Ipo wazi', 'Partly booked': 'Imehifadhiwa kiasi', 'Premium (top-quartile footfall)': 'Ya hadhi (msongamano wa robo ya juu)', 'Sold out': 'Imeuzwa yote',
  'Screen × hour': 'Skrini × saa', 'Computing hourly footfall…': 'Inakokotoa msongamano wa kila saa…', 'Next 7 days: occupancy and revenue forecast': 'Siku 7 zijazo: utabiri wa matumizi na mapato', Date: 'Tarehe', Occupancy: 'Matumizi',
  'Footfall index': 'Kipimo cha msongamano', 'Revenue forecast': 'Utabiri wa mapato', 'Yield: suggested price per screen-hour': 'Mavuno: bei inayopendekezwa kwa skrini kwa saa', 'Screen type': 'Aina ya skrini', 'Avg / peak pax': 'Abiria wastani / kilele',
  'Off-peak': 'Nje ya kilele', 'Peak (premium)': 'Kilele (hadhi)', 'Price = predicted impressions ÷ 1,000 × CPM × 1.35 premium uplift × demand factor. Footfall comes from the ZonePresence model, not from history alone.': 'Bei = watazamaji wanaotabiriwa ÷ 1,000 × CPM × nyongeza ya hadhi 1.35 × kipengele cha mahitaji. Msongamano unatoka kwenye modeli ya ZonePresence, si historia pekee.',
  'Offer claims are accurate and time-boxed': 'Madai ya ofa ni sahihi na yana muda maalum', 'Legal / terms present': 'Masharti ya kisheria yapo', 'No competitor or real brand marks': 'Hakuna alama za washindani wala chapa halisi',
  'Alcohol: 18+ notice and family-crowd exclusion': 'Pombe: tangazo la 18+ na kuepuka umati wa familia', 'Readable at 3 m, contrast OK': 'Inasomeka kwa mita 3, utofautishaji sawa', 'Brand-safety checklist': 'Orodha ya usalama wa chapa',
  'Note to advertiser': 'Ujumbe kwa mtangazaji', Approve: 'Idhinisha', Reject: 'Kataa', 'Creatives awaiting review': 'Matangazo yanayosubiri ukaguzi', 'Used by': 'Yanatumiwa na', 'Not yet attached to a campaign': 'Bado halijaunganishwa na kampeni',
  'Automatic checks failed': 'Ukaguzi wa moja kwa moja umeshindwa', 'Automatic checks passed (template, both languages, contrast, asset loads)': 'Ukaguzi wa moja kwa moja umepita (kiolezo, lugha zote mbili, utofautishaji, faili linapakia)',
  'The approval queue is empty. New campaigns and creatives from retailers and airlines land here.': 'Foleni ya idhini iko tupu. Kampeni na matangazo mapya kutoka kwa wauzaji na mashirika ya ndege huja hapa.',
  'Targets:': 'Walengwa:', 'Placement:': 'Mahali:', Daily: 'Kila siku', 'adult product': 'bidhaa ya watu wazima', submitted: 'imewasilishwa',
  'Top advertisers by spend (30 days)': 'Watangazaji wakuu kwa matumizi (siku 30)', 'All advertisers': 'Watangazaji wote', Advertiser: 'Mtangazaji', Running: 'Zinazoendelea', 'Spend today': 'Matumizi leo', 'Spend 30d': 'Matumizi siku 30',
  Delivery: 'Uwasilishaji', 'Under-delivering': 'Inawasilisha pungufu', 'on track': 'iko sawa', Report: 'Ripoti', Back: 'Rudi', 'Copy shareable link': 'Nakili kiungo cha kushiriki', 'Save as PDF': 'Hifadhi kama PDF', 'Advertiser report': 'Ripoti ya mtangazaji',
  'Attributed revenue': 'Mapato yaliyotokana', 'Building report…': 'Inaandaa ripoti…', 'Audiences are aggregated by flight, zone and 5-minute window. No passenger-level data is collected or reported.': 'Hadhira hujumlishwa kwa ndege, kanda na kipindi cha dakika 5. Hakuna data ya abiria mmoja mmoja inayokusanywa au kuripotiwa.',
  'Shareable link copied': 'Kiungo cha kushiriki kimenakiliwa', 'Segment heatmap: audience volume by segment × hour': 'Ramani joto ya makundi: ukubwa wa hadhira kwa kundi × saa', 'Conflict view: why A beat B': 'Mwonekano wa mgongano: kwa nini A ilishinda B',
  'Campaign A': 'Kampeni A', 'Campaign B': 'Kampeni B', 'Audience match': 'Ulinganifu wa hadhira', Pacing: 'Mwendo', 'Final score': 'Alama ya mwisho', 'Booked on screen': 'Imewekwa kwenye skrini', yes: 'ndiyo', no: 'hapana',
  'Manual pin / override': 'Kubandika / kubatilisha kwa mkono', Minutes: 'Dakika', 'Reason (logged in every decision)': 'Sababu (inarekodiwa kwenye kila uamuzi)', 'Pin campaign': 'Bandika kampeni', Remove: 'Ondoa', until: 'hadi',
  'Build a package': 'Jenga kifurushi', 'Bundle discount': 'Punguzo la kifurushi', 'Weekly list price': 'Bei ya wiki', Zones: 'Kanda', 'Discount %': 'Punguzo %', Description: 'Maelezo', 'Create package': 'Unda kifurushi', 'Package created': 'Kifurushi kimeundwa', 'e.g. Gulf evening departures': 'mf. Safari za jioni za Ghuba',

  // airline
  'Departures today': 'Safari za kuondoka leo', 'Still to go': 'Zilizobaki', 'Delayed 15+ min': 'Zimechelewa dak 15+', 'Avg load factor': 'Wastani wa ujazo', 'Departing pax': 'Abiria wanaoondoka',
  'Timeline (scheduled bar, delay in amber)': 'Ratiba (mstari uliopangwa, kuchelewa kwa rangi ya kaharabu)', STD: 'STD', ETD: 'ETD', Load: 'Ujazo', '+75 min': '+75 dak', 'Send an AIDX delay message (demo)': 'Tuma ujumbe wa kuchelewa wa AIDX (maonyesho)',
  'Aggregated crowd profile, my departures today': 'Wasifu wa jumla wa umati, safari zangu za leo', passengers: 'abiria', 'top destinations': 'maeneo makuu', 'Languages:': 'Lugha:', 'Aggregated shares only; no per-passenger data.': 'Sehemu za jumla pekee; hakuna data ya abiria mmoja mmoja.',
  'Schedule gate message': 'Panga ujumbe wa geti', 'My sponsored gate-area content': 'Maudhui yangu yaliyodhaminiwa ya eneo la geti', 'all day at my gates': 'siku nzima kwenye geti zangu', 'What is playing at my gates now, and why': 'Kinachoonyeshwa kwenye geti zangu sasa, na kwa nini',
  'No departures of yours in the next three hours.': 'Huna safari za kuondoka katika saa tatu zijazo.', 'Automation rule': 'Kanuni ya kiotomatiki', 'Auto-push a voucher to gate screens when a flight is delayed': 'Tuma vocha kwenye skrini za geti moja kwa moja ndege ikichelewa',
  'Delay threshold (min)': 'Kiwango cha kuchelewa (dak)', 'F&B partner': 'Mshirika wa chakula', 'Voucher value': 'Thamani ya vocha', 'Airline share of cost': 'Sehemu ya gharama ya shirika', 'Vouchers pushed today': 'Vocha zilizotumwa leo', Delay: 'Kuchelewa', Partner: 'Mshirika', 'Max exposure': 'Gharama ya juu',
  'airline share': 'sehemu ya shirika', 'No delays past the threshold yet today. Use the test button or the simulation bar.': 'Hakuna ndege iliyochelewa kupita kiwango leo. Tumia kitufe cha majaribio au upau wa uigaji.', 'Goodwill rule saved': 'Kanuni ya fidia imehifadhiwa',
  'Co-marketing marketplace, ranked by fit for my passengers': 'Soko la masoko ya pamoja, kwa ufaafu kwa abiria wangu', Accept: 'Kubali', fit: 'ufaafu', 'No partner offers for this airline yet.': 'Bado hakuna ofa za washirika kwa shirika hili.',
  'Performance among my passengers today': 'Utendaji miongoni mwa abiria wangu leo', 'Partner revenue': 'Mapato ya washirika', 'Accepted: co-branded offer is live at your gates': 'Imekubaliwa: ofa ya chapa za pamoja inaonyeshwa kwenye geti zako',
  'Low-cost': 'Gharama nafuu', 'Full-service': 'Huduma kamili', 'Low-cost airline': 'Shirika la gharama nafuu', 'Full-service airline': 'Shirika la huduma kamili', 'Duty-free store': 'Duka la bila ushuru', 'Coffee chain': 'Mnyororo wa kahawa', 'Toy store': 'Duka la vinyago',

  // passenger
  'Choose a screen': 'Chagua skrini', 'Bilingual rotation': 'Mzunguko wa lugha mbili', 'Full screen': 'Skrini nzima', 'pax in catchment': 'abiria eneo hili', 'No signal': 'Hakuna ishara',
  'Mobile claim page (as opened by the QR code)': 'Ukurasa wa kudai kwenye simu (kama unavyofunguliwa na msimbo wa QR)', 'Click to open the claim page on this device': 'Bofya kufungua ukurasa wa kudai kwenye kifaa hiki',
  'Redeeming here records a real redemption that appears on the retailer dashboard within a second.': 'Kutumia hapa kunarekodi matumizi halisi yanayoonekana kwenye dashibodi ya muuzaji ndani ya sekunde moja.',
  Close: 'Funga', 'Loading…': 'Inapakia…', Departures: 'Kuondoka', Delayed: 'Imechelewa', 'On time': 'Kwa wakati', 'Gate closed': 'Geti limefungwa', Departed: 'Imeondoka', Scheduled: 'Imepangwa', Cancelled: 'Imefutwa', Landed: 'Imetua',
  'Scan to claim': 'Changanua upate', 'Valid for': 'Inafaa kwa',

  // toasts (static)
  'Rule engine updated; all screens re-planned': 'Injini ya kanuni imesasishwa; skrini zote zimepangwa upya', 'Pinned; screen re-planned': 'Imebandikwa; skrini imepangwa upya', Paused: 'Imesitishwa', Resumed: 'Imeendelea',
  'Creative re-uploaded; it is back in rotation': 'Tangazo limepakiwa upya; limerudi kwenye mzunguko', 'Creative saved; it is in the Media Manager approval queue': 'Tangazo limehifadhiwa; liko kwenye foleni ya idhini ya Meneja wa matangazo',
  'Saved to library (pending approval)': 'Limehifadhiwa kwenye maktaba (linasubiri idhini)', 'Campaign submitted: it is now in the Media Manager approval queue': 'Kampeni imewasilishwa: sasa iko kwenye foleni ya idhini ya Meneja wa matangazo',
  'Campaign updated and resubmitted for approval': 'Kampeni imesasishwa na kuwasilishwa upya kwa idhini', 'AI fault cleared': 'Hitilafu ya AI imeondolewa', 'AI hallucination injected': 'Uzushi wa AI umeingizwa',
  pax: 'abiria', min: 'dak', '% today': '% leo', '· live': '· moja kwa moja', 'of crowd)': 'ya umati)', 'pax in catchment ·': 'abiria eneo hili ·', offer: 'ofa', flight: 'ndege',
  '. Aggregated shares only; no per-passenger data.': '. Sehemu za jumla pekee; hakuna data ya abiria mmoja mmoja.', 'pax · median dwell': 'abiria · muda wa kati wa kusubiri',
};

// Engine-generated sentences. Order matters: longer, more specific patterns first. `$n` keeps data values.
const D = (s) => s.replace(/delayed (\d+) min/g, 'imechelewa dak $1').replace(/ boarding\b/g, ' inapanda').replace(/gate change/g, 'badiliko la geti');
const PATTERNS_SW = [
  [/^(\d+) min$/, (m) => `dak ${m[1]}`],
  [/^Security queue: (\d+) min wait$/, (m) => `Foleni ya ukaguzi: dak ${m[1]} kusubiri`],
  [/^(\S+) · gate (\S+)$/, (m) => `${m[1]} · geti ${m[2]}`],
  [/^Generated ([\d-]+ [\d:]+)$/, (m) => `Imetolewa ${m[1]}`],
  [/^If a flight( to (\S+))? is delayed more than (\d+) min(, at gates (.+))?, multiply this campaign’s match by ([\d.]+)\.$/, (m) => `Ndege${m[2] ? ` kwenda ${m[2]}` : ''} ikichelewa zaidi ya dak ${m[3]}${m[5] ? `, kwenye geti ${m[5]}` : ''}, zidisha ulinganifu wa kampeni hii kwa ${m[6]}.`],
  [/^If a nearby flight changes gate \(within 30 min\), multiply this campaign’s match by ([\d.]+)\.$/, (m) => `Ndege ya karibu ikibadilisha geti (ndani ya dak 30), zidisha ulinganifu wa kampeni hii kwa ${m[1]}.`],
  [/^While a nearby flight is boarding, multiply this campaign’s match by ([\d.]+)\.$/, (m) => `Ndege ya karibu ikiwa inapanda, zidisha ulinganifu wa kampeni hii kwa ${m[1]}.`],
  [/^On festival days in the event calendar, multiply this campaign’s match by ([\d.]+)\.$/, (m) => `Siku za sikukuu kwenye kalenda, zidisha ulinganifu wa kampeni hii kwa ${m[1]}.`],
  [/^(\d+) from real phones today$/, (m) => `${m[1]} kutoka simu halisi leo`],
  [/^(\S+) (SCH|DLY|BRD|GCL|DEP|ARR|CNL)( \+\d+m)? gate (\S+)$/, (m) => `${m[1]} ${m[2]}${m[3] || ''} geti ${m[4]}`],
  [/^(\S+) wait (\d+) min, (\d+) in queue$/, (m) => `${m[1]} kusubiri dak ${m[2]}, ${m[3]} kwenye foleni`],

  [/^(.+) (\d+):00 · ([\d,]+) pax$/, (m) => `${tr(m[1])} ${m[2]}:00 · abiria ${m[3]}`],
  [/^(\S+): passengers airside from ([\d:]+), STD ([\d:]+)$/, (m) => `${m[1]}: abiria upande wa ndani kuanzia ${m[2]}, STD ${m[3]}`],
  [/^7-day average (\d+) vs daily budget (\d+)$/, (m) => `Wastani wa siku 7 ${m[1]} dhidi ya bajeti ya siku ${m[2]}`],
  [/^([\d.—]+) per 1,000 impressions$/, (m) => `${m[1]} kwa kila watazamaji 1,000`],
  [/^(\d+) from real phones today$/, (m) => `${m[1]} kutoka simu halisi leo`],
  [/^media spend (.+)$/, (m) => `gharama ya matangazo ${m[1]}`],
  [/^(.+) beat (.+) by ([\d.]+): (.+)$/, (m) => `${m[1]} ilishinda ${m[2]} kwa ${m[3]}: ${m[4].replace(/trigger boost x([\d.]+) \((.+?)\); /, (_, b, c) => `nyongeza ya kichocheo x${b} (${D(c)}); `).replace(/audience match (\d+)% vs (\d+)%/, 'ulinganifu wa hadhira $1% dhidi ya $2%').replace(/\(strongest segment: (\w+) at (\d+)% of the crowd\)/, '(kundi lenye nguvu zaidi: $1 kwa $2% ya umati)').replace(/ is not booked on this screen\./, ' haijawekwa kwenye skrini hii.')}`],
  [/^(\S+) → (\w+), (\d+) pax in catchment, (ETD|ETA) ([\d:]+)(?: \(\+(\d+)\))?, gate (\S+)$/, (m) => `${m[1]} → ${m[2]}, abiria ${m[3]} eneo hili, ${m[4]} ${m[5]}${m[6] ? ` (+${m[6]})` : ''}, geti ${m[7]}`],
  [/^(\w+) security wait (\d+) min, (\d+) queuing$/, (m) => `${m[1]} kusubiri ukaguzi dak ${m[2]}, ${m[3]} kwenye foleni`],
  [/^boarding window \(ETD−(\d+) to ETD−(\d+)\)$/, (m) => `dirisha la kupanda (ETD−${m[1]} hadi ETD−${m[2]})`],
  [/^Airline share of cost \((\d+)%\)$/, (m) => `Sehemu ya gharama ya shirika (${m[1]}%)`],
  [/^Voucher value \((\w+)\)$/, (m) => `Thamani ya vocha (${m[1]})`], [/^Total budget \((\w+)\)$/, (m) => `Bajeti yote (${m[1]})`],
  [/^When a (.+) departure is delayed (\d+)\+ minutes, a co-funded meal voucher \((\d+)% airline \/ (\d+)% (.+)\) is pushed to the screens at that gate with airline priority, and codes expire when the flight closes boarding\.$/, (m) => `Safari ya ${m[1]} ikichelewa dakika ${m[2]}+, vocha ya chakula iliyofadhiliwa pamoja (${m[3]}% shirika / ${m[4]}% ${m[5]}) hutumwa kwenye skrini za geti hilo kwa kipaumbele cha shirika, na misimbo huisha muda ndege ikifunga upandaji.`],
  [/^Test: delay (\S+) by (\d+) min$/, (m) => `Jaribio: chelewesha ${m[1]} kwa dak ${m[2]}`],
  [/^Type a brief and generate a ready ad page in English and (.+)\.$/, (m) => `Andika maelezo mafupi na utengeneze ukurasa wa tangazo kwa Kiingereza na ${m[1]}.`],
  [/^Matches (\d+)% of the crowd at (.+) from ([\d:]+) to ([\d:]+); expected ([\d,]+) impressions and ([\d,]+) redemptions\.$/, (m) => `Inalingana na ${m[1]}% ya umati katika ${m[2]} kuanzia ${m[3]} hadi ${m[4]}; inatarajiwa watazamaji ${m[5]} na matumizi ya ofa ${m[6]}.`],
  [/^(\d+) screens · eligible in (\d+)% of screen-hours · est\. cost (.+)$/, (m) => `skrini ${m[1]} · inastahili katika ${m[2]}% ya saa za skrini · gharama inayokadiriwa ${m[3]}`],
  [/^AIDX delay sent for (\S+)$/, (m) => `Kuchelewa kwa AIDX kumetumwa kwa ${m[1]}`],
  [/^(\S+) taken offline for (\d+) min$/, (m) => `${m[1]} imeondolewa mtandaoni kwa dak ${m[2]}`],
  [/^Creative on (\S+) marked as failed$/, (m) => `Tangazo kwenye ${m[1]} limewekwa kuwa limeshindwa`],
  [/^AIDX lag injected for (\d+) min$/, (m) => `Kuchelewa kwa AIDX kumeingizwa kwa dak ${m[1]}`],
  [/^Spent (.+) of (.+) daily; expected by now (.+) \(([\d.]+)x\)\.$/, (m) => `Imetumia ${m[1]} kati ya ${m[2]} kwa siku; inayotarajiwa hadi sasa ${m[3]} (${m[4]}x).`],
  [/^Highest score with trigger boost x([\d.]+) \((.+)\)$/, (m) => `Alama ya juu zaidi na nyongeza ya kichocheo x${m[1]} (${D(m[2])})`],
  [/^Highest audience-match score$/, () => 'Alama ya juu zaidi ya ulinganifu wa hadhira'],
  [/^Airline priority: (\w+) boarding window$/, (m) => `Kipaumbele cha shirika: dirisha la kupanda la ${m[1]}`],
  [/^Delay goodwill for (\w+): airline priority at its gate$/, (m) => `Fidia ya kuchelewa kwa ${m[1]}: kipaumbele cha shirika kwenye geti lake`],
  [/^Manual pin by Media Manager: (.+)$/, (m) => `Imebandikwa na Meneja wa matangazo: ${m[1]}`],
  [/^Exploration \((\d+)% of slots test the runner-up\)$/, (m) => `Majaribio (${m[1]}% ya nafasi hujaribu wa pili)`],
  [/^Rule-based default \(AI rejected: (.+)\)$/, (m) => `Chaguo la kanuni (AI imekataliwa: ${m[1]})`],
  [/^Rule-based default \(deterministic score\)$/, () => 'Chaguo la kanuni (alama thabiti)'],
  [/^No eligible campaign: house ad$/, () => 'Hakuna kampeni inayostahili: tangazo la nyumbani'],
  [/^House ad: advertise here$/, () => 'Tangazo la nyumbani: tangaza hapa'],
  [/^Held back: competitor separation \((\S+) after (\S+)\)$/, (m) => `Imezuiwa: kutenganisha washindani (${m[1]} baada ya ${m[2]})`],
  [/^Frequency cap (\d+)\/h reached on this screen$/, (m) => `Kikomo cha marudio ${m[1]}/saa kimefikiwa kwenye skrini hii`],
  [/^Rotation: max (\d+) consecutive plays$/, (m) => `Mzunguko: maonyesho ${m[1]} mfululizo ya juu`],
  [/^Below (\d+)% match floor; served at better-fit gates$/, (m) => `Chini ya kiwango cha ulinganifu ${m[1]}%; inaonyeshwa kwenye geti zinazofaa zaidi`],
  [/^Outside daypart (\d+):00–(\d+):00$/, (m) => `Nje ya muda wa siku ${m[1]}:00–${m[2]}:00`],
  [/^Outside schedule \(not started\)$/, () => 'Nje ya ratiba (haijaanza)'], [/^Outside schedule \(ended\)$/, () => 'Nje ya ratiba (imeisha)'],
  [/^Awaiting approval$/, () => 'Inasubiri idhini'], [/^Daily budget cap reached$/, () => 'Kikomo cha bajeti ya siku kimefikiwa'], [/^Total budget exhausted$/, () => 'Bajeti yote imekwisha'],
  [/^Paused: (.+) out of stock$/, (m) => `Imesitishwa: ${m[1]} imeisha dukani`],
  [/^International only \(crowd (\d+)% intl\)$/, (m) => `Kimataifa pekee (umati ${m[1]}% wa kimataifa)`], [/^Domestic only \(crowd (\d+)% domestic\)$/, (m) => `Ndani ya nchi pekee (umati ${m[1]}% wa ndani)`],
  [/^Not a (\w+) gate area$/, (m) => `Si eneo la geti la ${m[1]}`], [/^Outside own boarding window$/, () => 'Nje ya dirisha lake la kupanda'], [/^Goodwill offer not triggered$/, () => 'Ofa ya fidia haijachochewa'],
  [/^Not at the delayed flight's gate$/, () => 'Haiko kwenye geti la ndege iliyochelewa'], [/^Trigger not active$/, () => 'Kichocheo hakiko hai'], [/^No passengers in catchment$/, () => 'Hakuna abiria katika eneo hili'],
  [/^Brand safety: adult product, family-heavy crowd$/, () => 'Usalama wa chapa: bidhaa ya watu wazima, umati wenye familia nyingi'],
  [/^Dwell (\d+) min < (\d+)$/, (m) => `Muda wa kusubiri dak ${m[1]} < ${m[2]}`], [/^Crowd (\d+) < (\d+)$/, (m) => `Umati ${m[1]} < ${m[2]}`], [/^Needs a delay of (\d+)\+ min$/, (m) => `Inahitaji kuchelewa kwa dak ${m[1]}+`],
  [/^Creative failed validation: slot skipped$/, () => 'Tangazo limeshindwa uthibitishaji: nafasi imerukwa'], [/^No approved creative$/, () => 'Hakuna tangazo lililoidhinishwa'],
  [/^(\S+) delayed (\d+) min$/, (m) => `${m[1]} imechelewa dak ${m[2]}`],
  // AI checks
  [/^(\d+) cited inputs found$/, (m) => `Maingizo ${m[1]} yaliyotajwa yamepatikana`], [/^all inputs within freshness limits$/, () => 'maingizo yote ndani ya muda unaokubalika'],
  [/^winner passed all hard filters$/, () => 'mshindi amepita vichujio vyote vikuu'], [/^claimed ([\d.]+) vs recomputed ([\d.]+)$/, (m) => `ilidaiwa ${m[1]} dhidi ya iliyokokotolewa upya ${m[2]}`],
  [/^not found in trusted feeds: (.+)$/, (m) => `haipatikani kwenye mitiririko inayoaminika: ${m[1]}`], [/^stale: (.+)$/, (m) => `imepitwa na wakati: ${m[1]}`],
  // events, incidents, toasts
  [/^(\S+) to (\w+) delayed (\d+) min \(ETD ([\d:]+)\)$/, (m) => `${m[1]} kwenda ${m[2]} imechelewa dak ${m[3]} (ETD ${m[4]})`],
  [/^(\S+) gate change (\S+) → (\S+)$/, (m) => `${m[1]} badiliko la geti ${m[2]} → ${m[3]}`],
  [/^Delay goodwill pushed: (\S+) \(\+(\d+) min\) meal voucher co-funded with (.+) at gate (\S+)$/, (m) => `Fidia ya kuchelewa imetumwa: ${m[1]} (+dak ${m[2]}) vocha ya chakula iliyofadhiliwa pamoja na ${m[3]} kwenye geti ${m[4]}`],
  [/^Code (\S+) redeemed: (.+) \((.+)\)$/, (m) => `Msimbo ${m[1]} umetumika: ${m[2]} (${m[3]})`],
  [/^Family share code (\S+) created from (\S+)$/, (m) => `Msimbo wa familia ${m[1]} umeundwa kutoka ${m[2]}`],
  [/^(CRITICAL|HIGH|MEDIUM|LOW): (.+)$/, (m) => `${{ CRITICAL: 'HATARI', HIGH: 'JUU', MEDIUM: 'WASTANI', LOW: 'CHINI' }[m[1]]}: ${tr(m[2])}`],
  [/^Screen (\S+) offline for over 5 minutes$/, (m) => `Skrini ${m[1]} imekuwa nje ya mtandao zaidi ya dakika 5`],
  [/^Feed lag: AIDX silent for over 3 minutes$/, () => 'Kuchelewa kwa mtiririko: AIDX kimya zaidi ya dakika 3'],
  [/^AI proposal rejected on (\S+): cited evidence not in trusted feeds$/, (m) => `Pendekezo la AI limekataliwa kwenye ${m[1]}: ushahidi uliotajwa haupo kwenye mitiririko inayoaminika`],
  [/^Failed creative (\S+) \((.+)\): (.+)$/, (m) => `Tangazo lililoshindwa ${m[1]} (${m[2]}): ${tr(m[3])}`],
  [/^Asset failed to load on player \(HTTP 404 from media CDN\)$/, () => 'Faili halikupakiwa kwenye skrini (HTTP 404 kutoka CDN ya media)'],
  [/^Creative (\S+) failed to load \(injected\)$/, (m) => `Tangazo ${m[1]} limeshindwa kupakiwa (limeingizwa)`],
  [/^(\S+) went offline \(injected\)$/, (m) => `${m[1]} imetoka mtandaoni (imeingizwa)`],
  [/^AIDX feed lagging for (\d+) min \(injected\): decisions citing AIDX will fail freshness checks$/, (m) => `Mtiririko wa AIDX unachelewa kwa dak ${m[1]} (umeingizwa): maamuzi yanayotaja AIDX yatashindwa ukaguzi wa muda`],
  [/^AIDX feed caught up \((\d+) buffered messages\)$/, (m) => `Mtiririko wa AIDX umerejea (jumbe ${m[1]} zilizohifadhiwa)`],
  [/^Worked example loaded: (.+)$/, () => 'Mfano uliofanyiwa kazi umepakiwa: Geti 42 saa 14:10, XY501 kwenda ZHQ imechelewa dak 45. Uigaji umesimamishwa.'],
  [/^Simulation positioned at ([\d:]+) \(day rebuilt in (\d+) ms\)$/, (m) => `Uigaji umewekwa saa ${m[1]} (siku imejengwa upya kwa ms ${m[2]})`],
  [/^AIDX delay sent: (\S+) \+(\d+) min$/, (m) => `Kuchelewa kwa AIDX kumetumwa: ${m[1]} +dak ${m[2]}`],
  [/^(\S+) delayed \+(\d+) min via AIDX$/, (m) => `${m[1]} imechelewa +dak ${m[2]} kupitia AIDX`],
  [/^(.+) (approved|rejected)$/, (m) => `${m[1]} ${m[2] === 'approved' ? 'imeidhinishwa' : 'imekataliwa'}`],
  [/^(.+) approved and live$/, (m) => `${m[1]} imeidhinishwa na inaonyeshwa`],
  [/^Weight for (\S+) set to ([\d.]+)$/, (m) => `Uzito wa ${m[1]} umewekwa ${m[2]}`],
  [/^(.+) redeemed (\d+(?:\.\d+)?)x their share of the audience$/, (m) => `${tr(m[1])} walitumia ofa mara ${m[2]} ya sehemu yao ya hadhira`],
  [/^(.+) redeemed (\d+(?:\.\d+)?)x more than their share of the audience\.?$/, (m) => `${tr(m[1])} walitumia ofa mara ${m[2]} zaidi ya sehemu yao ya hadhira.`],
  [/^(.+) converts at only ([\d.]+)x$/, (m) => `${tr(m[1])} hubadilika mara ${m[2]} tu`],
  [/^(\d+) campaigns$/, (m) => `Kampeni ${m[1]}`], [/^(\d+) records$/, (m) => `Rekodi ${m[1]}`], [/^(\d+) incidents$/, (m) => `Matukio ${m[1]}`],
  [/^(\d+) online · (\d+) degraded · (\d+) offline$/, (m) => `${m[1]} hewani · ${m[2]} dhaifu · ${m[3]} nje ya mtandao`],
  [/^(\d+) open incidents$/, (m) => `matukio ${m[1]} wazi`],
  [/^Network: (\d+) screens · (\d+) terminals · (\d+) airlines$/, (m) => `Mtandao: skrini ${m[1]} · majengo ${m[2]} · mashirika ${m[3]}`],
  [/^Playlist build \((\d+) screens, p95\)$/, (m) => `Kujenga orodha ya maonyesho (skrini ${m[1]}, p95)`],
  [/^(\d+) campaigns · (\d+) creatives waiting$/, (m) => `kampeni ${m[1]} · matangazo ${m[2]} yanasubiri`],
  [/^Playing now on (\d+) screens$/, (m) => `Inaonyeshwa sasa kwenye skrini ${m[1]}`],
  [/^(\d+) codes issued today$/, (m) => `Misimbo ${m[1]} iliyotolewa leo`],
  [/^Expected by now (.+)$/, (m) => `Inayotarajiwa hadi sasa ${m[1]}`],
];
const PATTERNS = { sw: PATTERNS_SW };
const DICTS = { en: {}, sw: SW };

let lang = 'en';
export const getLang = () => lang;
export const setLang = (l) => { lang = l; applyDom(); };
function trIn(l, s) {
  if (l === 'en') return s; const d = DICTS[l] || {};
  if (d[s] != null) return d[s];
  for (const [re, fn] of PATTERNS[l] || []) { const m = re.exec(s); if (m) return fn(m); }
  return s;
}
function tr(s) { return trIn(lang, s); }
/** Translate into a specific language without touching the UI language (passenger screens rotate languages). */
export const tIn = (l, s) => trIn(l, s);
export const t = (s) => (typeof s === 'string' ? tr(s) : s);
export const adCopy = (cr, l) => cr?.copy?.[l] || cr?.copy?.en || { headline: '', sub: '', cta: '' };
export const secondLang = () => THEME.secondLanguage.code;

// ---------- DOM auto-translation ----------
const ATTRS = ['placeholder', 'title', 'aria-label'];
const EN = new WeakMap(); const OUT = new WeakMap();
const skip = (el) => !el || el.closest?.('[data-no-i18n], script, style, textarea, code, pre');
function doText(node) {
  if (!/[A-Za-z]{2}/.test(node.nodeValue)) return;
  if (skip(node.parentElement)) return;
  const cur = node.nodeValue;
  if (OUT.get(node) === cur) return;                // our own output
  EN.set(node, cur);                                 // React wrote fresh English
  if (lang === 'en') return;
  // exact text first; then retry without leading/trailing separators (" · ", ", ") that React splits around values
  const lead = cur.match(/^\s*/)[0], trail = cur.match(/\s*$/)[0]; let core = cur.trim(); let out = tr(core); let pre = lead, post = trail;
  if (out === core) { const m = /^([\s·,:;–-]*)([\s\S]*?)([\s·,:;–-]*)$/.exec(cur); if (m[2] && m[2] !== core) { const o2 = tr(m[2]); if (o2 !== m[2]) { core = m[2]; out = o2; pre = m[1]; post = m[3]; } } }
  if (out !== core) { const v = pre + out + post; OUT.set(node, v); node.nodeValue = v; }
}
function doAttrs(el) {
  if (skip(el)) return;
  for (const a of ATTRS) {
    const v = el.getAttribute?.(a); if (!v || !/[A-Za-z]{2}/.test(v)) continue;
    const key = `__en_${a}`; if (el[`__out_${a}`] === v) continue;
    el[key] = v; if (lang === 'en') continue;
    const out = tr(v); if (out !== v) { el[`__out_${a}`] = out; el.setAttribute(a, out); }
  }
}
function walk(root) {
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n = root; do { if (n.nodeType === 3) doText(n); else if (n.nodeType === 1) doAttrs(n); } while ((n = tw.nextNode()));
}
function applyDom() {
  const root = document.getElementById('root'); if (!root) return;
  if (lang === 'en') { // restore English
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); let n;
    while ((n = tw.nextNode())) {
      if (n.nodeType === 3) { if (OUT.get(n) === n.nodeValue && EN.has(n)) { n.nodeValue = EN.get(n); OUT.delete(n); } }
      else for (const a of ATTRS) if (n[`__out_${a}`] && n.getAttribute(a) === n[`__out_${a}`]) { n.setAttribute(a, n[`__en_${a}`]); n[`__out_${a}`] = null; }
    }
    return;
  }
  walk(root);
}
let observer = null;
export function autoTranslate() {
  if (observer) return; const root = document.getElementById('root'); if (!root) return;
  observer = new MutationObserver((muts) => {
    if (lang === 'en') { for (const m of muts) if (m.type === 'characterData') EN.set(m.target, m.target.nodeValue); return; }
    for (const m of muts) {
      if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') doAttrs(m.target);
      else for (const n of m.addedNodes) { if (n.nodeType === 3) doText(n); else if (n.nodeType === 1) walk(n); }
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
