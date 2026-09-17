// Keep the export independent of the legacy dashboard bundle.
// The CSV URL is the same published source already used by the dashboard.
const sheetUrl = 'https://docs.google.com/spreadsheets/d/1uWbVwsJ6mgUl9WxJz-zbxMaiCW-dG3DI_9gvKkEca18/export?format=csv&gid=1149576218';
const normal = value => String(value ?? '').trim();
const key = value => normal(value).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

function parseCsv(text) {
  const rows = [], row = [];
  let field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(field); field = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(value => normal(value))) rows.push(row.splice(0));
      else row.length = 0;
    } else field += char;
  }
  row.push(field);
  if (row.some(value => normal(value))) rows.push(row);
  const headings = (rows.shift() || []).map(key);
  return rows.map(values => Object.fromEntries(headings.map((heading, i) => [heading, normal(values[i])])));
}

function value(row, ...names) {
  for (const name of names) {
    const result = row[key(name)];
    if (result) return result;
  }
  return '';
}

function numberOrBlank(raw) {
  const input = normal(raw).replace(/,/g, '');
  return input && Number.isFinite(Number(input)) ? Number(input) : null;
}

function dateSerial(raw) {
  const input = normal(raw);
  if (/^\d{5}(?:\.\d+)?$/.test(input)) {
    const serial = Number(input);
    return serial >= 30000 && serial < 90000 ? serial : null;
  }
  const iso = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/);
  const us = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!iso && !us) return null;
  // The connected source sheet uses en_US: month/day/year.
  const year = Number(iso ? iso[1] : us[3]);
  const month = Number(iso ? iso[2] : us[1]);
  const day = Number(iso ? iso[3] : us[2]);
  const time = Date.UTC(year, month - 1, day), checked = new Date(time);
  if (checked.getUTCFullYear() !== year || checked.getUTCMonth() + 1 !== month || checked.getUTCDate() !== day) return null;
  return Math.round(time / 86400000 + 25569);
}

function matchesRegion(region) {
  const actual = normal(region).toLowerCase();
  const selected = normal(localStorage.getItem('last_selected_region') || 'CER').toLowerCase();
  if (selected === 'cer') return ['central', 'east', 'cr', 'er', 'cer'].some(part => actual === part || actual.includes(part));
  const aliases = { central: ['central', 'cr'], east: ['east', 'er'], west: ['west', 'wr'], south: ['south', 'sr'], north: ['north', 'nr'] };
  return (aliases[selected] || [selected]).some(part => actual === part || actual.includes(part));
}

function activeSite(row) {
  const status = value(row, 'COWStatus', 'COW Status', 'SiteStatus', 'Status').toUpperCase().replace(/[\s_-]/g, '');
  return ['ONAIR', 'INPROGRESS', 'ACTIVE', 'OPERATIONAL'].includes(status) &&
    value(row, 'Site', 'SiteName', 'Site ID') &&
    matchesRegion(value(row, 'Area', 'RegionName', 'Region'));
}

function exportRows(rows, XLSX) {
  const result = rows.filter(activeSite).map(row => ({
    'Site Name': value(row, 'Site', 'SiteName', 'Site ID'),
    'Region Name': value(row, 'Area', 'RegionName', 'Region'),
    'District Name': value(row, 'districtName', 'District'),
    'City Name': value(row, 'cityName', 'City'),
    'COW Status': value(row, 'COWStatus', 'COW Status', 'Status'),
    Latitude: numberOrBlank(value(row, 'lat', 'latitude')),
    Longitude: numberOrBlank(value(row, 'lng', 'longitude')),
    'Fuel Consumption': numberOrBlank(value(row, 'Fuel Consumption', 'FuelConsumption')),
    LastFuelingDate: dateSerial(value(row, 'LastFuelingDate', 'Last Fueling Date')),
    LastFuelingQTY: numberOrBlank(value(row, 'LastFuelingQTY', 'Last Fueling QTY')),
    'Before QTY': numberOrBlank(value(row, 'Before QTY')),
    'Total QTY': null,
    Span: null,
    NextFuelingPlan: null,
    SiteLabel: value(row, 'SiteLabel', 'Site Label'),
    // Used only to select the right formula; never added to the output sheet.
    _power: value(row, 'PowerSource', 'Power Source'),
  }));
  if (!result.length) throw new Error('No data to export');
  const powerSources = result.map(row => row._power);
  result.forEach(row => delete row._power);
  const sheet = XLSX.utils.json_to_sheet(result), headers = Object.keys(result[0]);
  const col = name => XLSX.utils.encode_col(headers.indexOf(name));
  const fuel = col('Fuel Consumption'), date = col('LastFuelingDate');
  const qty = col('LastFuelingQTY'), before = col('Before QTY');
  const total = col('Total QTY'), span = col('Span');
  const border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  const headerStyle = { fill: { fgColor: { rgb: '202B6D' } }, font: { bold: true, color: { rgb: 'FFFFFF' }, size: 12 }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border };
  const style = { alignment: { vertical: 'center' }, border };
  headers.forEach((_, i) => { sheet[XLSX.utils.encode_cell({ r: 0, c: i })].s = headerStyle; });
  result.forEach((row, i) => {
    const n = i + 2;
    for (const [j, heading] of headers.entries()) {
      const ref = XLSX.utils.encode_cell({ r: i + 1, c: j });
      if (heading === 'Total QTY') sheet[ref] = { t: 'n', f: `IF(AND(ISNUMBER(${qty}${n}),ISNUMBER(${before}${n})),${qty}${n}+${before}${n},"")`, s: style };
      else if (heading === 'Span') sheet[ref] = { t: 'n', f: `IF(AND(ISNUMBER(${total}${n}),ISNUMBER(${fuel}${n}),${fuel}${n}>0),ROUNDUP(${total}${n}/${fuel}${n},0),"")`, s: style };
      else if (heading === 'NextFuelingPlan') sheet[ref] = {
        t: 'n',
        f: powerSources[i].trim().toUpperCase() === 'SG'
          ? `IF(AND(ISNUMBER(${date}${n}),ISNUMBER(${span}${n})),${date}${n}+${span}${n}-1,"")`
          : '"SEC Site"',
        z: 'dd-mmm-yyyy', s: style,
      };
      else if (sheet[ref]) { sheet[ref].s = style; if (heading === 'LastFuelingDate') sheet[ref].z = 'dd-mmm-yyyy'; }
    }
  });
  sheet['!cols'] = headers.map(name => ({ wch: name === 'NextFuelingPlan' ? 22 : 19 }));
  const workbook = XLSX.utils.book_new();
  workbook.Workbook = { CalcPr: { calcMode: 'auto', fullCalcOnLoad: true } };
  XLSX.utils.book_append_sheet(workbook, sheet, 'Central Fuel Plan');
  return workbook;
}

window.exportFormulaPlan = async function exportFormulaPlan() {
  const button = document.getElementById('downloadBtn');
  if (button?.disabled) return;
  if (!window.XLSX) { alert('Excel library is still loading. Please try again.'); return; }
  if (button) button.disabled = true;
  try {
    const response = await fetch(sheetUrl, { cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error('Fuel plan temporarily unavailable');
    const workbook = exportRows(parseCsv(await response.text()), window.XLSX);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    window.XLSX.writeFile(workbook, `Central_Fuel_Plan_${stamp}.xlsx`);
  } catch (_) { alert('Unable to export the plan right now. Please try again.'); }
  finally { if (button) button.disabled = false; }
};

export { parseCsv, dateSerial, exportRows };
