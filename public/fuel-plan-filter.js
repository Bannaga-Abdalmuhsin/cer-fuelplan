// Keep source rows with a usable fueling date and send the export button
// to the formula workbook. Site identifiers are displayed unchanged.
(() => {
  function csvLine(line) {
    const fields = [];
    let value = '', quoted = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && quoted && line[i + 1] === '"') { value += '"'; i++; }
      else if (char === '"') quoted = !quoted;
      else if (char === ',' && !quoted) { fields.push(value); value = ''; }
      else value += char;
    }
    fields.push(value);
    return fields;
  }

  function validDate(value) {
    const text = String(value ?? '').trim();
    if (!text || text.startsWith('#') || /^(sec site|west|south)$/i.test(text)) return false;
    const date = new Date(text);
    return !Number.isNaN(date.getTime());
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const url = String(args[0]?.url || args[0] || '');
    if (!response.ok || !url.includes('1uWbVwsJ6mgUl9WxJz-zbxMaiCW-dG3DI_9gvKkEca18') || !url.includes('format=csv')) return response;
    const text = await response.clone().text();
    const lines = text.replace(/\r/g, '').split('\n');
    const headers = csvLine(lines[0] || '').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
    const dateColumn = headers.indexOf('nextfuelingplan');
    if (dateColumn < 0) return response;
    const filtered = [lines[0], ...lines.slice(1).filter(line => line.trim() && validDate(csvLine(line)[dateColumn]))].join('\n');
    const replyHeaders = new Headers(response.headers);
    replyHeaders.set('Content-Type', 'text/csv; charset=utf-8');
    replyHeaders.set('Cache-Control', 'no-store');
    return new Response(filtered, { status: response.status, statusText: response.statusText, headers: replyHeaders });
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('downloadBtn')?.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.exportFormulaPlan();
    }, true);
  });
})();
