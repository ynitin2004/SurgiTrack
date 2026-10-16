# Discovered DB Schema (sutra_dev @ Atlas cluster0.bxriwu1)

Discovered on 2026-10-07 via `server/scripts/inspect-db.js`. The cluster hosts one app database, **`sutra_dev`**, shared with an existing application (~140 collections). The dashboard treats the whole database as **read-only** (see bottom).

Change streams: **supported** (Atlas replica set `atlas-qtp1ni-shard-0`).

> Note: this network's DNS blocks SRV lookups, so `server/.env` uses the non-SRV
> `mongodb://host1,host2,host3/?tls=true&authSource=admin&replicaSet=...` form.

## surgeon_info (1,176 docs)

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `surgeonName` | string | e.g. "Dr. Kalyan Pandey" |
| `areaOfExpertise` | string | e.g. "Oncosurgeon", "Gastrointestinal" |
| `alignedHospital` | ObjectId | ref → `hospitals._id` (`hospitals.hospitalName`) |
| `hospitalAlignedDate` | Date | |
| `hospitalHistory` | array | `{ hospitalId, from, to }` |
| `createdAt` / `updatedAt` | Date \| null | often null |

## surgeries_timesheets (13,650 docs on 2026-10-16) — current source

Written by the surgery app for every case (2022 → present). The dashboard reads only these fields:

| Field | Type | Notes |
|---|---|---|
| `hospitalInfo.surgeryDate` | Date | UTC midnight of the surgery day; 1 missing, 3 typo years (0026/0206) |
| `hospitalInfo.surgeonId` | ObjectId | → `surgeon_info._id`; 168 null/missing, ~1.9k don't resolve |
| `hospitalInfo.hospitalId` | ObjectId | → `hospitals` (names repeat across branches: use name + address) |
| `hospitalInfo.procedureTypeId` | ObjectId | → `procedure_types.procedureName / procedureCode`; 7 null/missing |
| `hospitalInfo.procedureCategoryId` | ObjectId (1 string) | → `master_procedure_categories.categoryLabel` |
| `hospitalInfo.systemId` | ObjectId | → `system_detail.systemNumber` |
| `surgeryInstrumentsInfo.instrumentsUsed[].instrumentName` | string | ~2k null; "-S" suffix variants are distinct instruments |
| `surgeryInstrumentsInfo.surgery.duration` | string | `"02:51:24"`, `"2h 42min"`, `"6h 10m"`, junk like `"145:35:00"` |
| `patientInfo` | object | PHI — never sent to the browser |

`surgeries_timesheets_delete` holds the full doc of every deleted case (+ `deletedAt`, `deletionReason`).

## surgeries_complete_list (4,537 docs) — legacy, no longer read

Stopped receiving records in Nov 2025 (`surgeries_timesheets` is a superset).

Dashboard-relevant fields (there are many more):

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `date_of_surgery` | number (epoch **ms**) | long/double mix; 1 doc missing. Convert with `$convert` + `onError/onNull` |
| `surgery_month` / `surgery_year` | number | denormalized; data spans 2023 → Oct 2025 (a few future-dated) |
| `surgeon_name` | array of `{ label, value }` | `label` = display name, `value` = string of `surgeon_info._id` (sometimes "Unknown") |
| `assistant_surgeon` | array of `{ label, value }` | often "Data Unavailable" |
| `hospital_name` / `hospital_location` / `zone_id` | string | e.g. "Apex Hospital, Jaipur" / "Jaipur" / "IN-01" |
| `system_no` | string | robot system, e.g. "SYS_038" |
| `procedure_category` | string | e.g. `general_surgery`, `urology` |
| `procedure_name` / `procedure_code` | string | e.g. "Cholecystectomy" / "CP011" |
| `surgery` | `{ start, end, duration }` | epoch ms / ms duration — **may be the string "N/A"** |
| `console`, `dock`, `undock`, `drapping`, `port_placement` | same shape | phase timings, same "N/A" caveat |
| `patient_info` | object | `patient_id`, `gender`, `age`, `bmi`, `diagnosis`… (PHI — don't surface patient_id broadly) |
| `post_surgery_info` | object | `length_of_stay_days`, `readmission`, … |
| `case_conversion`, `mortality` | string | mostly "-" / "No Conversion" |

### Data quirks (must handle in aggregations)

- Numeric fields can hold the **strings** `"N/A"`, `"-"`, `"Data Unavailable"` → always `$convert` with `onError: null` before `$avg`/`$sum`.
- `surgeon_name.value` holds the surgeon id **as a string in some docs and as an ObjectId in others** (e.g. Dr. Sanjiv Haribhakti: 42 string refs + 124 ObjectId refs). Always match both (`$in: [id, ObjectId(id)]`) or group on `$convert → string`. It can also be `"Unknown"` or `null` (~720 refs don't resolve to a `surgeon_info` doc).
- `surgeon_info.areaOfExpertise` sometimes contains a raw ObjectId string instead of text — hidden in the UI.
- `date_of_surgery` is epoch **milliseconds** stored as long or double.

## hospitals (291 docs)

`hospitalName`, `hospitalAddress`, `hospitalZoneId`, `assignSystem[]`, … — used only to resolve `surgeon_info.alignedHospital` → name.

## Read-only rule

The dashboard **never writes** to `sutra_dev`: login credentials live in `server/.env`
(`ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH`), mongoose `autoIndex`/`autoCreate` are off, and
no seed or test-insert scripts exist.

> Leftover: an early build created a `dashboard_users` collection (1 admin doc) before
> the read-only rule was set. The app no longer uses it; the DB owner can drop it with
> `db.dashboard_users.drop()`.
