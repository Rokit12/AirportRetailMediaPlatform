# 15-minute demo script

Open the playground. The simulation starts at **14:02** on Wed 14 Oct 2026 at Meridian International.

**0:00–2:00 · The network (Platform Admin).**
- Show the live map: 182 screens, the heat overlay of passenger presence, and the KPI strip ticking.
- Open **Data feeds**: AODB snapshot, the AIDX message stream, ACRIS queue measurements, and the adapter in use for each.
- Say: "Going live is one adapter and one config value."

**2:00–5:00 · Cause and effect (Split screen).**
1. Turn on **Split screen**. The passenger screen for Gate 42 is on the left. Put **Airline Rep → Saffron Gulf** on the right.
2. Gate 42 currently shows Saffron Gulf's upgrade offer, because XY501 is in its boarding window.
3. Click **Delay XY501 +45 min**.
   - The AIDX message is visible in Admin → Data feeds.
   - The airline view shows *Delayed +45*.
   - Gate 42 switches to *Duty-free fragrance, 15% off*: the retailer's "Gulf flight delayed > 30 min at gates 40–45" rule, ×1.5.
   - The FIDS strip shows the new time.
4. Switch the right side to **Retailer → Meridian Duty Free → Dashboard**. The footfall forecast for the next hour rose because those 240 passengers now stay 45 minutes longer.

**5:00–7:00 · The passenger claims (phone).**
1. Scan the QR on the passenger screen with a phone. If the phone can't open the playground link, click the QR to open the same claim page in-app.
2. Show the countdown: the code expires when XY501 closes boarding.
3. Tap **Share with family** to issue a second code.
4. Tap **Redeem**. The redemption toast lands on the retailer dashboard, and *Live redemptions* updates within a second.

**7:00–9:00 · Why this ad? (trust).**
1. Press **Worked example**. This reproduces the challenge table at 14:10: 71% → 0.86 plays, 49% → 0.52 next, 18% → 0.21 below the floor.
2. Open **Why this ad?** and walk through the crowd bars, the top 3, the winning rule, the four verifier checks, and the evidence trail with AIDX message ids.
3. **Inject event → AI fault**. The agent cites a fabricated "XY999". The verifier rejects it, the screen keeps the rule-based choice, and an incident is raised.

**9:00–11:00 · Retailer self-serve.**
1. **Campaigns → New campaign**: pick zones and weights, and watch the live sentence ("Matches 58% … expected 18,293 impressions").
2. Try **Best 3 slots tomorrow**, then submit.
3. **Creatives**: type "Festive sweets, 20% off, families flying domestic" and get an EN/Kiswahili ad page.
4. Open a running campaign to show segment lift ("Families redeemed 3x") and **Apply** a suggested weight.

**11:00–13:00 · Media Manager.**
1. **Approvals**: tick the brand-safety checklist and approve the new campaign, which goes live immediately.
2. **Inventory**: premium cells and suggested prices; the 7-day revenue forecast.
3. **Matching**: the heatmap, the conflict view (why perfume beat toys), and pinning a make-good with a reason.

**13:00–15:00 · Airline and close.**
1. **Delay goodwill**: delay another XY departure by 75 min. A meal voucher co-funded with Driftwood Coffee auto-pushes to its gate.
2. **Partners**: accept a co-marketing offer with one click.
3. Close on the admin incidents (screen offline, feed lag) and on privacy: aggregated by flight, zone and time window, with no personal data.
