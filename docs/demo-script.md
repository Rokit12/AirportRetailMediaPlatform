# Demo script

This script follows the same order as the narrated video, [`docs/media/Gateline-demo.mp4`](media/Gateline-demo.mp4). The video runs 3 min 39 s; presented live with questions, allow about 15 minutes.

**Before you start**
- Open the [hosted playground](https://airportretailmediaplatform.onrender.com/) a minute early. The free hosting plan sleeps after 15 minutes without visitors and takes up to a minute to wake.
- Press **Reset** in the simulation bar. The clock returns to **14:02** on Wed 14 Oct 2026, with no injected events.
- Optional: in **Platform Admin → Decision engine**, raise *Max consecutive plays* (for example to 40) and save. The Gate 42 screen then keeps the fragrance offer during the claim, instead of rotating to the next campaign as it would in production.

| Video | Step | What to show and say |
|---|---|---|
| 0:04 | **Introduction** | Gateline puts the right offer on the right airport screen for the passengers actually in front of it. Meridian International is fictional. All feeds are mocked in real industry formats: AODB flight movements, IATA AIDX messages and ACI ACRIS queue data, each behind an adapter. Point at the AODB / AIDX / ACRIS indicators in the simulation bar. |
| 0:28 | **Platform Admin → Overview** | The live map has 182 screens coloured by health, with a heat overlay of where passengers are now. Scroll to *Passenger presence by zone*: count, nationalities, destinations, international share and dwell for the current 5-minute window. |
| 0:49 | **Passenger → Gate 42 holdroom** | Saffron Gulf's upgrade is playing because XY501 is in its boarding window, and an airline has priority at its own gate. Point out the departures strip and the QR code with its countdown. |
| 1:06 | **Split screen + Airline Rep, then "Delay XY501 +45 min"** | An IATA AIDX message goes through the feed adapter. In under a second the airline sees the delay, and the gate screen switches to *Duty-free fragrance, 15% off*: the retailer's rule (Gulf flight delayed 30+ min at gates 40–45, ×1.5) fired. |
| 1:31 | **Split screen off, Passenger → "Why this ad?"** | The crowd profile (58% holiday, 31% families), the top 3 candidates with scores, and the winning rule. The AI proposed the ranking; it only played after the deterministic checks passed: evidence exists, is fresh, the hard rules pass, and the score is reproducible. Scroll to show the evidence trail. |
| 1:54 | **Close, then scan the QR** (or click it) | On the claim page, the countdown ends when XY501 closes boarding. Tap **Share with family (second code)**, then **Redeem at the counter**. |
| 2:06 | **Retailer → Meridian Duty Free** | The redemption is in *Live redemptions* straight away, next to impressions, scans, conversion and the passenger-flow forecast near the store. |
| 2:18 | **New campaign** | Type a name, pick *T2 Gates 40–49* and *T2 Duty-free plaza*. The live preview estimates the crowd match, impressions and redemptions. Press **Best 3 slots tomorrow**. Close the builder. |
| 2:33 | **Creatives & promo codes → Generate ad page** | The brief "Festive sweets, 20% off, families flying domestic" becomes an ad page. Toggle **Kiswahili** to show the second language. No API key is needed. |
| 2:44 | **Media Manager → Inventory & yield, then Matching** | Every screen × hour, priced from predicted footfall, and the 7-day occupancy and revenue forecast. On *Matching*, the conflict view explains why one campaign beat another. |
| 2:56 | **Airline Rep → Delay goodwill → "Test: delay …"** | Past the threshold, a meal voucher co-funded with Driftwood Coffee is pushed to that flight's gate screens, and logged with its cost exposure. |
| 3:08 | **Inject event… → AI fault → Inject hallucination**, then **Platform Admin → Incidents & feeds** | The agent cites a fabricated flight. The verifier rejects it, the screen keeps the rule-based choice, and an incident is raised for data science. |
| 3:19 | **SW in the header**, then **EN** | The whole interface switches to Kiswahili. The product is white-label. Targeting is aggregated by flight, zone and time window only, never by person. |

**More to show if there is time**
- **Worked example** (simulation bar): reproduces the challenge table at Gate 42, 14:10, with scores of 0.86, 0.52 and 0.21.
- **Inject event…**: gate change, screen offline (an incident is raised after 5 simulated minutes), feed lag (AIDX evidence goes stale and screens fall back), and failed creative (the campaign switches to its other creative).
- **Media Manager → Approvals**: approve a submitted campaign or creative with the brand-safety checklist; it goes live immediately.
- **Retailer → Campaigns & history**: redemptions by audience segment, with one-click suggested weight changes, A/B creatives, and **Run again**.
- **Speed 60x**: watch the day move, with flights boarding and departing and screens re-planning.
