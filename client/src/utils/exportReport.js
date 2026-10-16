import { tierFor } from './tier';
import { fmtCategory, fmtDate, fmtDuration } from './format';

// Surgeon report (GET …/report?period=) -> PowerPoint / Excel. The heavy
// libraries load on demand so they never weigh on the normal page load.

// light-mode tokens from index.css (exports are always light)
const PIE = ['4A3AA7', '008300', 'EDA100', 'E87BA4'];
const PIE_OTHER = 'C9C7BD';
const ACCENT = '0D9488';
const BRAND = '0F766E';
const BRAND_DARK = '0B3B37';
const MINT = 'CCFBF1';
const INK = '0F1F1E';
const INK2 = '4A5A58';
const MUTED = '7C8A88';
const LINE = 'E3EAE8';
const PAGE = 'F3F7F6';
const AMBER = 'EDA100';
const FONT = 'Calibri';

const nf = new Intl.NumberFormat('en-IN');
const num = (n) => nf.format(n || 0);
const slug = (s) => String(s || 'surgeon').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'surgeon';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS[m - 1]} ${String(y).slice(2)}`;
};
const pct = (share) => `${(share * 100).toFixed(share < 0.1 ? 1 : 0)}%`;
const plural = (n, word) => `${num(n)} ${word}${n === 1 ? '' : 's'}`;

// Everything both formats need, in display order.
export function buildModel(rep) {
  const s = rep.surgeon;
  const cats = (rep.byCategory || []).filter((c) => c.count > 0);
  const total = cats.reduce((n, c) => n + c.count, 0);
  const slices = cats.slice(0, 4).map((c, i) => ({ label: fmtCategory(c.category), count: c.count, color: PIE[i] }));
  const rest = cats.slice(4);
  if (rest.length) {
    slices.push({ label: `Other (${rest.length} type${rest.length > 1 ? 's' : ''})`, count: rest.reduce((n, c) => n + c.count, 0), color: PIE_OTHER });
  }
  const p = rep.period;
  const range =
    p.from != null ? `${fmtDate(p.from)} – ${fmtDate(p.to)}` : rep.firstSurgeryDate ? `${fmtDate(rep.firstSurgeryDate)} – ${fmtDate(rep.lastSurgeryDate)}` : '';
  const hospitals = rep.hospitalsServedList || [];
  return {
    name: s.surgeonName || 'Surgeon',
    hospital: s.hospitalName || '',
    expertise: s.areaOfExpertise || '',
    tier: tierFor(rep.allTimeSurgeryCount).label,
    allTime: rep.allTimeSurgeryCount,
    periodLabel: p.label,
    periodType: p.type,
    range,
    fileTag: p.type === 'all' ? 'all-surgeries' : p.value,
    generated: new Date(rep.generatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    count: rep.surgeryCount,
    empty: !rep.surgeryCount,
    avgDuration: rep.avgDurationMin ? fmtDuration(rep.avgDurationMin * 60000) : '—',
    lastSurgery: rep.lastSurgeryDate ? fmtDate(rep.lastSurgeryDate) : '—',
    topType: cats[0] ? { label: fmtCategory(cats[0].category), count: cats[0].count, share: total ? cats[0].count / total : 0 } : null,
    distinctProcedures: rep.distinctProcedures,
    procedures: rep.procedures.map((x) => ({ ...x, share: rep.surgeryCount ? x.count / rep.surgeryCount : 0 })),
    slices: slices.map((c) => ({ ...c, share: total ? c.count / total : 0 })),
    categories: cats.map((c) => ({ label: fmtCategory(c.category), count: c.count, share: total ? c.count / total : 0 })),
    catTotal: total,
    instruments: rep.instruments.map((i) => ({ label: i.name, count: i.count })),
    distinctInstruments: rep.distinctInstruments,
    hospitals,
    unlisted: rep.unlistedHospitalCases || 0,
    trend: rep.trend.map((t) => ({ month: t.month, label: monthLabel(t.month), count: t.count })),
    cases: rep.cases.map((r) => ({
      date: r.date_of_surgery ? fmtDate(r.date_of_surgery) : '—',
      dateValue: r.date_of_surgery ? new Date(r.date_of_surgery) : null,
      procedure: r.procedure_name || 'Not recorded',
      code: r.procedure_code || '',
      type: fmtCategory(r.procedure_category),
      hospital: r.hospital_name || '—',
      system: r.system_no || '—',
      duration: fmtDuration(r.surgery?.duration),
      durationMin: r.surgery?.duration ? Math.round(r.surgery.duration / 60000) : null,
    })),
    casesTruncated: rep.casesTruncated,
  };
}

function download(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// ---------------------------------------------------------------- PowerPoint

const PPT_CASE_ROWS = 11; // rows per case-log slide
const PPT_CASE_SLIDES = 3; // full log lives in the Excel export

export async function exportPpt(rep) {
  const { default: PptxGenJS } = await import('pptxgenjs');
  const m = buildModel(rep);
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in
  pptx.title = `${m.name} — surgery report (${m.periodLabel})`;
  pptx.company = 'SurgiTrack';
  const W = 13.333;
  const H = 7.5;
  let page = 1;

  const txt = (slide, text, o) => slide.addText(text, { fontFace: FONT, color: INK, margin: 0, ...o });

  const frame = (title, subtitle) => {
    const slide = pptx.addSlide();
    slide.background = { color: PAGE };
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: H, fill: { color: BRAND }, line: { color: BRAND } });
    txt(slide, title, { x: 0.6, y: 0.35, w: 9.5, h: 0.6, fontSize: 26, bold: true });
    if (subtitle) txt(slide, subtitle, { x: 0.6, y: 0.95, w: 11, h: 0.35, fontSize: 13, color: MUTED });
    txt(slide, `${m.name} · ${m.periodLabel}`, { x: 9.2, y: 0.42, w: 3.6, h: 0.3, fontSize: 11, color: BRAND, bold: true, align: 'right' });
    page += 1;
    txt(slide, `SurgiTrack surgery report · generated ${m.generated}`, { x: 0.6, y: H - 0.42, w: 8, h: 0.25, fontSize: 9, color: MUTED });
    txt(slide, String(page), { x: W - 1.1, y: H - 0.42, w: 0.6, h: 0.25, fontSize: 9, color: MUTED, align: 'right' });
    return slide;
  };
  const card = (slide, x, y, w, h, fill = 'FFFFFF') =>
    slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.1, fill: { color: fill }, line: { color: LINE, width: 0.75 } });
  const emptyNote = (slide, text, y = 3.4) =>
    txt(slide, text, { x: 0.6, y, w: W - 1.2, h: 0.5, fontSize: 15, color: MUTED, align: 'center' });

  // 1 · cover
  {
    const slide = pptx.addSlide();
    slide.background = { color: BRAND_DARK };
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 8.3, h: H, fill: { color: BRAND }, line: { color: BRAND } });
    slide.addShape(pptx.ShapeType.ellipse, { x: 4.8, y: -1.6, w: 3.2, h: 3.2, fill: { color: 'FFFFFF', transparency: 90 }, line: { color: BRAND, transparency: 100 } });
    txt(slide, 'SURGERY PERFORMANCE REPORT', { x: 0.8, y: 0.9, w: 7, h: 0.4, fontSize: 13, bold: true, color: MINT, charSpacing: 3 });
    txt(slide, m.name, { x: 0.8, y: 1.45, w: 7.2, h: 1.1, fontSize: 40, bold: true, color: 'FFFFFF', fit: 'shrink' });
    txt(slide, [m.expertise, m.hospital].filter(Boolean).join(' · ') || ' ', { x: 0.8, y: 2.6, w: 7.2, h: 0.5, fontSize: 15, color: 'E6FFFA', fit: 'shrink' });
    txt(slide, `${m.tier} surgeon · ${num(m.allTime)} surgeries in career`, {
      x: 0.8, y: 3.3, w: 4.6, h: 0.45, fontSize: 13, bold: true, color: '3F2F99', align: 'center',
      fill: { color: 'ECE8FB' }, shape: pptx.ShapeType.roundRect, rectRadius: 0.22,
    });
    txt(slide, 'REPORTING PERIOD', { x: 0.8, y: 4.6, w: 7, h: 0.3, fontSize: 11, bold: true, color: MINT, charSpacing: 2 });
    txt(slide, m.periodLabel, { x: 0.8, y: 4.95, w: 7.2, h: 0.6, fontSize: 26, bold: true, color: 'FFFFFF' });
    txt(slide, m.range, { x: 0.8, y: 5.55, w: 7.2, h: 0.35, fontSize: 13, color: 'E6FFFA' });
    txt(slide, `Generated ${m.generated} · SurgiTrack`, { x: 0.8, y: H - 0.7, w: 7, h: 0.3, fontSize: 10, color: MINT });
    const stats = [
      ['Surgeries in period', num(m.count)],
      ['Different procedures', num(m.distinctProcedures)],
      ['Hospitals', num(m.hospitals.length)],
    ];
    stats.forEach(([label, value], i) => {
      const y = 1.3 + i * 1.75;
      txt(slide, value, { x: 8.9, y, w: 3.9, h: 0.9, fontSize: 44, bold: true, color: 'FFFFFF' });
      txt(slide, label, { x: 8.9, y: y + 0.9, w: 3.9, h: 0.35, fontSize: 13, color: MINT });
    });
  }

  // 2 · overview: KPI tiles, top procedures, hospitals
  {
    const slide = frame('Overview', m.range ? `${m.periodLabel} · ${m.range}` : m.periodLabel);
    const kpis = [
      { label: 'Surgeries', value: num(m.count), note: m.periodType === 'all' ? 'all recorded cases' : 'in this period', hero: true },
      { label: 'Top surgery type', value: m.topType?.label || '—', note: m.topType ? `${plural(m.topType.count, 'case')} · ${pct(m.topType.share)}` : '' },
      { label: 'Avg. surgery time', value: m.avgDuration, note: 'cases with a valid timing' },
      { label: 'Last surgery', value: m.lastSurgery, note: `${plural(m.distinctProcedures, 'different procedure')}` },
    ];
    const tw = (W - 1.2 - 3 * 0.25) / 4;
    kpis.forEach((k, i) => {
      const x = 0.6 + i * (tw + 0.25);
      if (k.hero) slide.addShape(pptx.ShapeType.roundRect, { x, y: 1.55, w: tw, h: 1.75, rectRadius: 0.1, fill: { color: BRAND }, line: { color: BRAND } });
      else card(slide, x, 1.55, tw, 1.75);
      const c = k.hero ? 'FFFFFF' : INK;
      txt(slide, k.label.toUpperCase(), { x: x + 0.25, y: 1.72, w: tw - 0.5, h: 0.3, fontSize: 10, bold: true, color: k.hero ? MINT : INK2, charSpacing: 1 });
      txt(slide, k.value, { x: x + 0.25, y: 2.05, w: tw - 0.5, h: 0.75, fontSize: k.value.length > 12 ? 20 : k.value.length > 9 ? 24 : 32, bold: true, color: c, valign: 'middle', fit: 'shrink' });
      txt(slide, k.note, { x: x + 0.25, y: 2.82, w: tw - 0.5, h: 0.3, fontSize: 10, color: k.hero ? MINT : MUTED });
    });

    card(slide, 0.6, 3.55, 7.1, 3.35);
    txt(slide, 'Top procedures', { x: 0.85, y: 3.72, w: 5, h: 0.35, fontSize: 15, bold: true });
    const top = m.procedures.slice(0, 5);
    if (!top.length) txt(slide, 'No procedures recorded in this period', { x: 0.85, y: 4.3, w: 6.5, h: 0.35, fontSize: 12, color: MUTED });
    const maxP = top[0]?.count || 1;
    top.forEach((p, i) => {
      const y = 4.2 + i * 0.52;
      txt(slide, `${i + 1}`, { x: 0.85, y, w: 0.3, h: 0.3, fontSize: 12, bold: true, color: MUTED });
      txt(slide, p.name, { x: 1.2, y, w: 4.9, h: 0.3, fontSize: 12, fit: 'shrink' });
      txt(slide, num(p.count), { x: 6.6, y, w: 0.85, h: 0.3, fontSize: 12, bold: true, align: 'right' });
      slide.addShape(pptx.ShapeType.rect, { x: 1.2, y: y + 0.33, w: 6.25, h: 0.07, fill: { color: 'FBEFD0' }, line: { color: 'FBEFD0' } });
      slide.addShape(pptx.ShapeType.rect, { x: 1.2, y: y + 0.33, w: Math.max(0.08, 6.25 * (p.count / maxP)), h: 0.07, fill: { color: AMBER }, line: { color: AMBER } });
    });

    card(slide, 7.95, 3.55, 4.78, 3.35);
    txt(slide, 'Hospitals served', { x: 8.2, y: 3.72, w: 4, h: 0.35, fontSize: 15, bold: true });
    if (!m.hospitals.length) txt(slide, 'No hospital recorded in this period', { x: 8.2, y: 4.3, w: 4.3, h: 0.35, fontSize: 12, color: MUTED });
    m.hospitals.slice(0, 5).forEach((h, i) => {
      const y = 4.2 + i * 0.52;
      txt(slide, h.name, { x: 8.2, y, w: 3.45, h: 0.45, fontSize: 12, fit: 'shrink', valign: 'top' });
      txt(slide, num(h.count), { x: 11.7, y, w: 0.8, h: 0.3, fontSize: 12, bold: true, align: 'right' });
    });
    if (m.unlisted) {
      txt(slide, `+${num(m.unlisted)} case${m.unlisted === 1 ? '' : 's'} at a hospital missing from the hospital list`, {
        x: 8.2, y: 6.5, w: 4.3, h: 0.3, fontSize: 10, color: MUTED,
      });
    }
  }

  if (m.empty) {
    const slide = frame('No surgeries in this period', m.periodLabel);
    emptyNote(slide, 'There are no recorded surgeries for this surgeon in the selected period.');
    await pptx.writeFile({ fileName: `${slug(m.name)}-report-${m.fileTag}.pptx` });
    return;
  }

  // 3 · monthly trend (only when the period spans more than one month)
  if (m.trend.length > 1) {
    const slide = frame('Surgeries per month', `${num(m.count)} surgeries · ${m.trend.length} months`);
    card(slide, 0.6, 1.5, W - 1.2, 5.4);
    slide.addChart(pptx.ChartType.bar, [{ name: 'Surgeries', labels: m.trend.map((t) => t.label), values: m.trend.map((t) => t.count) }], {
      x: 0.85, y: 1.7, w: W - 1.7, h: 5.0, barDir: 'col', chartColors: [ACCENT], barGapWidthPct: 45,
      catAxisLabelColor: INK2, catAxisLabelFontSize: m.trend.length > 24 ? 9 : 11, catAxisLabelFontFace: FONT, catAxisLineShow: true,
      catAxisLabelFrequency: m.trend.length > 24 ? Math.ceil(m.trend.length / 18) : 1,
      valAxisLabelColor: MUTED, valAxisLabelFontSize: 10, valGridLine: { color: LINE, size: 0.75 }, valAxisLineShow: false,
      showValue: m.trend.length <= 18, dataLabelPosition: 'outEnd', dataLabelColor: INK, dataLabelFontSize: 10,
      showLegend: false,
    });
  }

  // 4 · surgery types: native doughnut + legend
  {
    const slide = frame('Surgery types', 'Share of surgeries by type');
    card(slide, 0.6, 1.5, W - 1.2, 5.4);
    slide.addChart(pptx.ChartType.doughnut, [{ name: 'Surgeries', labels: m.slices.map((c) => c.label), values: m.slices.map((c) => c.count) }], {
      x: 1.0, y: 1.75, w: 4.9, h: 4.9, holeSize: 60, chartColors: m.slices.map((c) => c.color),
      showLegend: false, showValue: false, showPercent: false, showLabel: false, dataBorder: { pt: 1.5, color: 'FFFFFF' },
    });
    txt(slide, num(m.catTotal), { x: 2.45, y: 3.75, w: 2, h: 0.6, fontSize: 30, bold: true, align: 'center' });
    txt(slide, 'surgeries', { x: 2.45, y: 4.33, w: 2, h: 0.3, fontSize: 12, color: MUTED, align: 'center' });
    txt(slide, 'TYPE', { x: 7.0, y: 2.0, w: 3, h: 0.3, fontSize: 10, bold: true, color: MUTED });
    txt(slide, 'SURGERIES', { x: 10.0, y: 2.0, w: 1.4, h: 0.3, fontSize: 10, bold: true, color: MUTED, align: 'right' });
    txt(slide, 'SHARE', { x: 11.5, y: 2.0, w: 1.0, h: 0.3, fontSize: 10, bold: true, color: MUTED, align: 'right' });
    m.slices.forEach((c, i) => {
      const y = 2.5 + i * 0.62;
      slide.addShape(pptx.ShapeType.roundRect, { x: 7.0, y: y + 0.07, w: 0.22, h: 0.22, rectRadius: 0.04, fill: { color: c.color }, line: { color: c.color } });
      txt(slide, c.label, { x: 7.4, y, w: 2.6, h: 0.36, fontSize: 14 });
      txt(slide, num(c.count), { x: 10.0, y, w: 1.4, h: 0.36, fontSize: 14, bold: true, align: 'right' });
      txt(slide, pct(c.share), { x: 11.5, y, w: 1.0, h: 0.36, fontSize: 13, color: MUTED, align: 'right' });
      slide.addShape(pptx.ShapeType.line, { x: 7.0, y: y + 0.5, w: 5.5, h: 0, line: { color: LINE, width: 0.75 } });
    });
  }

  // 5 · instruments: native horizontal bars
  {
    const slide = frame('Most used instruments', `Times each instrument was used · ${num(m.distinctInstruments)} different instruments`);
    card(slide, 0.6, 1.5, W - 1.2, 5.4);
    if (m.instruments.length) {
      const rows = m.instruments.slice(0, 10);
      slide.addChart(pptx.ChartType.bar, [{ name: 'Uses', labels: rows.map((i) => i.label), values: rows.map((i) => i.count) }], {
        x: 0.85, y: 1.7, w: W - 1.7, h: 5.0, barDir: 'bar', chartColors: [ACCENT], barGapWidthPct: 55,
        catAxisOrientation: 'maxMin', catAxisLabelColor: INK2, catAxisLabelFontSize: 12, catAxisLabelFontFace: FONT,
        valAxisHidden: true, valGridLine: { style: 'none' }, catAxisLineShow: false,
        showValue: true, dataLabelPosition: 'outEnd', dataLabelColor: INK, dataLabelFontSize: 11, dataLabelFontFace: FONT,
        showLegend: false,
      });
    } else emptyNote(slide, 'No instruments recorded in this period');
  }

  // 6 · every procedure in the period
  if (m.procedures.length > 1) {
    const slide = frame('Procedures', `${num(m.distinctProcedures)} different procedures`);
    const rows = m.procedures.slice(0, 13);
    const th = (t, align = 'left') => ({ text: t, options: { bold: true, color: 'FFFFFF', fill: { color: BRAND }, fontSize: 11, align } });
    slide.addTable(
      [
        [th('#', 'center'), th('Procedure'), th('Cases', 'right'), th('Share', 'right')],
        ...rows.map((p, i) => [
          { text: String(i + 1), options: { align: 'center', color: MUTED } },
          { text: p.name },
          { text: num(p.count), options: { align: 'right', bold: true } },
          { text: pct(p.share), options: { align: 'right', color: MUTED } },
        ]),
      ],
      {
        x: 0.6, y: 1.5, w: W - 1.2, colW: [0.6, 8.9, 1.3, 1.33], fontFace: FONT, fontSize: 12, color: INK, rowH: 0.36,
        fill: { color: 'FFFFFF' }, border: { type: 'solid', pt: 0.5, color: LINE }, margin: [0.04, 0.12, 0.04, 0.12],
      }
    );
    if (m.procedures.length > rows.length) {
      txt(slide, `+ ${m.procedures.length - rows.length} more procedures in the Excel export`, { x: 0.6, y: 6.75, w: 8, h: 0.25, fontSize: 10, color: MUTED });
    }
  }

  // 7+ · case log (most recent first)
  {
    const all = m.cases;
    const shown = all.slice(0, PPT_CASE_ROWS * PPT_CASE_SLIDES);
    for (let i = 0; i < shown.length; i += PPT_CASE_ROWS) {
      const chunk = shown.slice(i, i + PPT_CASE_ROWS);
      const part = shown.length > PPT_CASE_ROWS ? ` (${i / PPT_CASE_ROWS + 1}/${Math.ceil(shown.length / PPT_CASE_ROWS)})` : '';
      const slide = frame(`Case log${part}`, all.length > shown.length ? `Latest ${shown.length} of ${num(all.length)} cases — the full list is in the Excel export` : `${num(all.length)} case${all.length === 1 ? '' : 's'}, most recent first`);
      const th = (t, align = 'left') => ({ text: t, options: { bold: true, color: 'FFFFFF', fill: { color: BRAND }, fontSize: 11, align } });
      slide.addTable(
        [
          [th('Date'), th('Procedure'), th('Type'), th('Hospital'), th('Duration', 'right')],
          ...chunk.map((c, r) => {
            const fill = { color: r % 2 ? 'F7FAF9' : 'FFFFFF' };
            return [
              { text: c.date, options: { fill } },
              { text: c.procedure, options: { fill } },
              { text: c.type, options: { fill, color: INK2 } },
              { text: c.hospital, options: { fill, color: INK2 } },
              { text: c.duration, options: { fill, align: 'right' } },
            ];
          }),
        ],
        {
          x: 0.6, y: 1.5, w: W - 1.2, colW: [1.35, 4.1, 1.6, 3.95, 1.13], fontFace: FONT, fontSize: 11, color: INK, rowH: 0.38,
          border: { type: 'solid', pt: 0.5, color: LINE }, margin: [0.03, 0.1, 0.03, 0.1], valign: 'middle',
        }
      );
    }
  }

  await pptx.writeFile({ fileName: `${slug(m.name)}-report-${m.fileTag}.pptx` });
}

// --------------------------------------------------------------------- Excel

export async function exportXlsx(rep) {
  const [{ default: ExcelJS }, charts] = await Promise.all([import('exceljs'), import('./chartImages')]);
  const m = buildModel(rep);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SurgiTrack';
  wb.created = new Date();

  const argb = (hex) => `FF${hex}`;
  const thin = { style: 'thin', color: { argb: argb('D7E1DF') } };
  const styleHeader = (row) => {
    row.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: argb('FFFFFF') } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(BRAND) } };
      cell.alignment = { vertical: 'middle' };
      cell.border = { bottom: thin };
    });
    row.height = 20;
  };
  // data sheet with a styled header, zebra rows, frozen header and filters
  const table = (name, columns, rows, { emptyText = 'No data in this period', totals } = {}) => {
    const ws = wb.addWorksheet(name, {
      views: [{ state: 'frozen', ySplit: 1 }],
      // prints landscape, one page wide, header repeated on every page
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '1:1' },
    });
    ws.columns = columns;
    styleHeader(ws.getRow(1));
    if (!rows.length) {
      ws.addRow({ [columns[0].key]: emptyText }).font = { italic: true, color: { argb: argb(MUTED) } };
      return ws;
    }
    rows.forEach((r, i) => {
      const row = ws.addRow(r);
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = { bottom: thin };
        if (i % 2) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb('F7FAF9') } };
      });
    });
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
    if (totals) {
      const row = ws.addRow(totals);
      row.font = { bold: true };
      row.eachCell((cell) => (cell.border = { top: { style: 'medium', color: { argb: argb(BRAND) } } }));
    }
    return ws;
  };

  // Summary: header block, KPI grid, chart images
  const ws = wb.addWorksheet('Summary', { views: [{ showGridLines: false }], pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  ws.columns = [{ width: 2 }, { width: 24 }, { width: 22 }, { width: 24 }, { width: 22 }, { width: 2 }];
  ws.mergeCells('B1:E1');
  const banner = ws.getCell('B1');
  banner.value = 'SURGERY PERFORMANCE REPORT';
  banner.font = { bold: true, size: 10, color: { argb: argb('FFFFFF') } };
  banner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(BRAND) } };
  banner.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(1).height = 22;
  ws.mergeCells('B2:E2');
  ws.getCell('B2').value = m.name;
  ws.getCell('B2').font = { bold: true, size: 20, color: { argb: argb(INK) } };
  ws.getRow(2).height = 30;
  ws.mergeCells('B3:E3');
  ws.getCell('B3').value = [`${m.tier} surgeon (${num(m.allTime)} career surgeries)`, m.expertise, m.hospital].filter(Boolean).join('  ·  ');
  ws.getCell('B3').font = { color: { argb: argb(INK2) } };
  ws.mergeCells('B4:E4');
  ws.getCell('B4').value = `Period: ${m.periodLabel}${m.range ? `  (${m.range})` : ''}   ·   Generated ${m.generated}`;
  ws.getCell('B4').font = { color: { argb: argb(MUTED) }, size: 10 };

  const kpis = [
    ['Surgeries', num(m.count)],
    ['Top surgery type', m.topType ? `${m.topType.label} (${num(m.topType.count)})` : '—'],
    ['Avg. surgery time', m.avgDuration],
    ['Last surgery', m.lastSurgery],
    ['Different procedures', num(m.distinctProcedures)],
    ['Hospitals served', num(m.hospitals.length)],
  ];
  kpis.forEach(([label, value], i) => {
    const row = 6 + Math.floor(i / 2) * 2;
    const col = i % 2 ? 4 : 2;
    const l = ws.getCell(row, col);
    l.value = label.toUpperCase();
    l.font = { bold: true, size: 9, color: { argb: argb(INK2) } };
    const v = ws.getCell(row + 1, col);
    v.value = value;
    v.font = { bold: true, size: 14, color: { argb: argb(i === 0 ? BRAND : INK) } };
    [l, v].forEach((c) => (c.border = { left: { style: 'medium', color: { argb: argb(i === 0 ? BRAND : 'C9D4D2') } } }));
  });

  let row = 13;
  const section = (title) => {
    ws.getCell(row, 2).value = title;
    ws.getCell(row, 2).font = { bold: true, size: 12, color: { argb: argb(INK) } };
    ws.getCell(row, 2).border = { bottom: { style: 'medium', color: { argb: argb(ACCENT) } } };
    row += 1;
  };
  const image = (png) => {
    const id = wb.addImage({ base64: png.dataUrl, extension: 'png' });
    const w = png.width / 2;
    const h = png.height / 2;
    ws.addImage(id, { tl: { col: 1, row: row - 1 + 0.2 }, ext: { width: w, height: h } });
    row += Math.ceil(h / 20) + 1;
  };
  if (m.trend.length > 1) {
    section('Surgeries per month');
    image(charts.columnChartPng(m.trend));
  }
  section('Surgery types');
  image(charts.donutChartPng(m.slices, m.catTotal));
  section('Most used instruments');
  image(charts.barChartPng(m.instruments, 'uses'));
  section('Top procedures');
  if (!m.procedures.length) ws.getCell(row++, 2).value = 'No procedures recorded in this period';
  m.procedures.slice(0, 5).forEach((p, i) => {
    ws.getCell(row, 2).value = `${i + 1}. ${p.name}`;
    ws.mergeCells(row, 2, row, 4);
    ws.getCell(row, 5).value = p.count;
    ws.getCell(row, 5).font = { bold: true };
    row += 1;
  });

  table(
    'Monthly trend',
    [{ header: 'Month', key: 'label', width: 14 }, { header: 'Month (YYYY-MM)', key: 'month', width: 16 }, { header: 'Surgeries', key: 'count', width: 12 }],
    m.trend,
    { totals: m.trend.length ? { label: 'Total', count: m.trend.reduce((n, t) => n + t.count, 0) } : null }
  );
  table(
    'Surgery types',
    [{ header: 'Surgery type', key: 'label', width: 34 }, { header: 'Surgeries', key: 'count', width: 12 }, { header: 'Share', key: 'share', width: 10, style: { numFmt: '0.0%' } }],
    m.categories,
    { totals: m.categories.length ? { label: 'Total', count: m.catTotal, share: 1 } : null }
  );
  table(
    'Procedures',
    [{ header: '#', key: 'rank', width: 5 }, { header: 'Procedure', key: 'name', width: 56 }, { header: 'Cases', key: 'count', width: 10 }, { header: 'Share', key: 'share', width: 10, style: { numFmt: '0.0%' } }],
    m.procedures.map((p, i) => ({ rank: i + 1, ...p }))
  );
  table('Instruments', [{ header: 'Instrument', key: 'label', width: 42 }, { header: 'Times used', key: 'count', width: 12 }], m.instruments);
  const hs = table(
    'Hospitals served',
    [{ header: 'Hospital', key: 'name', width: 56 }, { header: 'Cases', key: 'count', width: 10 }, { header: 'First case', key: 'first', width: 14 }, { header: 'Latest case', key: 'last', width: 14 }],
    m.hospitals.map((h) => ({ ...h, first: h.first ? fmtDate(h.first) : '—', last: h.last ? fmtDate(h.last) : '—' }))
  );
  if (m.unlisted) hs.addRow({ name: 'Hospital missing from the hospital list', count: m.unlisted }).font = { italic: true, color: { argb: argb(MUTED) } };
  const cs = table(
    'Cases',
    [
      { header: 'Date', key: 'dateValue', width: 13, style: { numFmt: 'dd mmm yyyy' } },
      { header: 'Procedure', key: 'procedure', width: 46 },
      { header: 'Code', key: 'code', width: 9 },
      { header: 'Type', key: 'type', width: 24 },
      { header: 'Hospital', key: 'hospital', width: 44 },
      { header: 'System', key: 'system', width: 13 },
      { header: 'Duration (min)', key: 'durationMin', width: 14 },
    ],
    m.cases
  );
  if (m.casesTruncated) cs.addRow({ procedure: `Showing the first ${m.cases.length} cases` });

  const buf = await wb.xlsx.writeBuffer();
  download(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${slug(m.name)}-report-${m.fileTag}.xlsx`
  );
}
