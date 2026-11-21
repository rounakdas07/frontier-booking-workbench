# Booking Workbench — Frontier Health

[Open the tool](https://rounakdas07.github.io/frontier-booking-workbench/)

A business-development and pilot-planning tool for Frontier Health. Choose an NHS trust and a booking workflow, inspect the reported activity, then export a sourced discovery brief and measurement plan. No login, model API or patient data is required.

The default example is Leicester: 80,540 hospital-cancelled or postponed first-appointment records in 2025/26, compared with 85,475 in 2024/25. Those are historical reported events, not an unresolved work queue. Its November 2026 board report identifies booking-contact problems; the tool also flags existing Accurx, OTTO and imaging-automation activity before any new proposal.

## What the tool does

- Search 148 NHS trusts appearing in the current annual extract; filter reported workloads, reviewed local context and known Frontier deployments.
- Switch between hospital rescheduling, missed first appointments and patient cancellations.
- Review two annual source components and open the original NHS file for each figure.
- Export a filtered trust CSV with source links and explicit missing values.
- Enter pilot weeks and scope share. Add handling-time assumptions only if you have them.
- Download or copy an editable brief containing the baseline, existing-system checks, discovery question, workflow, measurement plan and public enquiry route where verified.
- Copy a link that restores the selected trust, workflow and numeric planning assumptions.

## Why Frontier

Frontier's [own product page](https://www.frontierhealth.ai/) lists appointment booking, rescheduling and follow-up. Its [Deployment Strategist job description](https://jobs.mmc.vc/companies/frontier-health-2-7b2d8156-877b-4b10-adb2-e6e0698eb9fd/jobs/89818611-deployment-strategist) describes workflow scoping, integration, procurement and measured impact. The vacancy was closed when reviewed; this is evidence of the deployment approach, not an open-role claim.

The NHS publication already has a provider dashboard, and NHS FDP and commercial booking systems cover operational functions. This project adds a sourced, editable pilot brief with local incumbent checks. It does not claim to replace those systems or to offer novel underlying data.

## Data and reproducibility

Snapshot researched 21 November 2026. This is a fixed annual snapshot, not a live feed.

| Source | Publication | Rows in original CSV |
|---|---|---:|
| HES Outpatient Activity 2024/25 | [NHS England](https://digital.nhs.uk/data-and-information/publications/statistical/hospital-outpatient-activity/2024-25) | 45,506 |
| HES Outpatient Activity 2025/26 | [NHS England](https://digital.nhs.uk/data-and-information/publications/statistical/hospital-outpatient-activity/2025-26) | 55,845 |

The pipeline processes 101,351 aggregate rows. It retains 4,155 provider attendance-category rows across 154 distinct trust codes in either year, with 148 appearing in 2025/26. These are aggregate statistical records, not individual patient records. `data/manifest.json` contains original file URLs, publication/retrieval dates, byte counts and SHA-256 hashes. `data/source-records.csv` preserves the logical CSV record number (header = 1), original measure, raw value and source URL.

Only geography `03.Provider`, a three-character alphanumeric ODS code and `NHS` in the published name qualify. Independent providers, sites, national and regional rows are excluded from the finder. This is a reproducible selection rule, not an assertion that it is a complete contemporary NHS organisation register.

Workflow totals use the provider CSV's measure prefixes:

| Workflow | Components |
|---|---|
| Hospital rescheduling | 16 + 17: cancelled/postponed first, and first tele |
| Missed first appointments | 06 + 07: DNA first, and first tele |
| Patient cancellations | 11 + 12: cancelled first, and first tele |

The first-appointment denominator in the export uses 01, 02, 06, 07, 11, 12, 16 and 17. Subsequent and first/subsequent-unknown categories are never included. Provider CSV prefixes should not be confused with other NHS attendance code systems.

### Missing values and disclosure control

[NHS disclosure methodology](https://digital.nhs.uk/data-and-information/data-tools-and-services/data-services/hospital-episode-statistics/disclosure-control-methodology-for-hospital-episode-statistics-and-emergency-care-data-set) suppresses subnational counts of 1–7; other non-zero counts are rounded to the nearest five. The downloaded CSVs use `*` for suppressed values. True zero stays zero. Absent rows and suppressed values remain unavailable. A two-component total is shown only when both are reported. Derived totals and rates are approximate sums of already rounded components.

[NHS publication notes](https://digital.nhs.uk/data-and-information/publications/statistical/hospital-outpatient-activity/2025-26/about-this-publication) explain that some providers report attended appointments only. Low cancellation reporting does not establish low need. Year comparisons match the same ODS code without adjustment for mergers, service moves or reporting changes.

### Local context

`data/trust-research.json` attaches publicly documented context and enquiry routes for Leicester, Nottingham, Imperial and Lincolnshire. Not all have complete counts in every selected workflow. Imperial's example concerns follow-up bookings and is explicitly labelled as a comparator. Other trusts have no verified local problem statement in this build. The fuller source inventory is in `data/company-research.json`.

East Sussex (`RXC`, distinct from `RYR`) is a published Frontier deployment and is hidden from the default finder. Absence of a published relationship for other trusts does not prove they are not customers. The ordering is workload, not buying probability.

## Planning calculation

`annual reported events / 52 * pilot weeks * scope share / 100`

The default 8 weeks and 5% are editable planning choices, not measured eligibility or a prediction. Leicester yields approximately 620 records for review. These may include repeat people or already-resolved events. Validate the live inflow and eligible share locally.

No handling times are prefilled. If both are supplied:

`unrounded scenario records * (minutes before - minutes after) / 60`

This is a user-specified staff-time difference, not measured JUNO performance, a financial saving, an effect estimate or a guarantee. Negative values mean extra work. The brief keeps staff review, local policy, exclusions and measurement explicit.

## Run and refresh

Python 3 and Node.js 18+ are sufficient. There are no application dependencies.

```sh
python scripts/fetch_data.py
python scripts/prepare_data.py
npm test
npm run build
```

The fetch script downloads the two explicit original CSVs into ignored `data/raw/`. The preparation script extracts and joins them. Source URLs must be reviewed when a new annual publication is released. The research JSON requires separate manual source checking; it is not refreshed by downloading the CSVs.

`dist/` is the static build for preview hosting. GitHub Pages can serve this folder's root directly because imports and data URLs are relative. No build credentials, environment variables or server are needed for the public app.

## Validation

Eight Node tests cover exact component totals, disclosure/missingness, separate workflows, comparisons, filtering, scope arithmetic, CSV escaping and brief provenance. Two Python checks cover disclosure parsing and all 4,155 source-row pointers and hashes against the original downloads. The original-file integrity test skips only when the raw files have not yet been downloaded.

Browser checks cover trust search/filtering, three workflows, missing-data handling, exact-source dialogs, editable scope, invalid inputs, copy/download exports, share-link restoration and a 375px layout.

## Attribution and limits

Independent project by Rounak Das; not commissioned or endorsed by Frontier Health or NHS England. NHS data is attributed to the source publication and reused under the Open Government Licence where stated by the publisher. Source summaries link to their original trust, company or government pages.

No patient records, live bookings, diagnostic decisions or real outreach messages are created by this tool. Calculations remain in the browser; a share link contains only the trust, workflow and numeric scope inputs.
