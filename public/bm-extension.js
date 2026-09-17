(() => {
  function filterCsvToValidPlans(csvText) {
    const lines = csvText.replace(/\r/g, "").split("\n");
    if (lines.length < 2) return csvText;

    const headers = parseCsvLine(lines[0]).map(normalizeKey);
    const dateColumn = headers.indexOf("nextfuelingplan");
    if (dateColumn < 0) return csvText;

    const filteredRows = lines.slice(1).filter((line) => {
      if (!line.trim()) return false;
      const values = parseCsvLine(line);
      const date = parseExportDate(values[dateColumn]);
      return Boolean(date);
    });

    return [lines[0], ...filteredRows].join("\n");
  }

  const fetchBeforeBMFilter = window.fetch.bind(window);
  window.fetch = async function (...args) {
    const response = await fetchBeforeBMFilter(...args);
    const url = String(args[0]?.url || args[0] || "");

    if (
      response.ok &&
      url.includes("1uWbVwsJ6mgUl9WxJz-zbxMaiCW-dG3DI_9gvKkEca18") &&
      url.includes("format=csv")
    ) {
      const csvText = await response.clone().text();
      const filteredCsv = filterCsvToValidPlans(csvText);
      const headers = new Headers(response.headers);
      headers.set("Content-Type", "text/csv; charset=utf-8");
      headers.set("Cache-Control", "no-store");
      return new Response(filteredCsv, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return response;
  };

  function parseShortDate(value) {
    const match = String(value || "").trim().match(/^(\d{1,2})\s+([A-Za-z]{3})$/);
    if (!match) return null;
    const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
    const month = months.indexOf(match[2].toLowerCase());
    if (month < 0) return null;
    const date = new Date(2026, month, Number(match[1]));
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function appendBM(row, qualifies) {
    const siteCell = row.cells?.[0];
    if (!siteCell || !qualifies) return;
    const name = siteCell.textContent.trim();
    if (!name.endsWith(" - BM")) siteCell.textContent = name + " - BM";
  }

  function updateBMExtensions() {
    ["overdueTableBody", "todayTableBody"].forEach((id) => {
      document.querySelectorAll("#" + id + " tr").forEach((row) => {
        const date = parseShortDate(row.cells?.[2]?.textContent);
        appendBM(row, Boolean(date));
      });
    });

    document.querySelectorAll("#comingTableBody tr").forEach((row) => {
      const days = Number(row.cells?.[2]?.textContent.trim());
      if (!Number.isFinite(days)) return;
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + days);
      appendBM(row, true);
    });
  }

  function parseExportDate(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

    const text = String(value || "").trim();
    let match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));

    match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function addBMToExport(workbook, filename) {
    if (!filename?.startsWith("Central_Fuel_Plan_")) return;

    const sheet = workbook.Sheets?.["Central Fuel Plan"];
    if (!sheet?.["!ref"]) return;

    const range = XLSX.utils.decode_range(sheet["!ref"]);
    const headers = {};
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: col })];
      if (cell?.v) headers[String(cell.v).trim().toLowerCase()] = col;
    }

    const siteCol = headers["site name"];
    const dateCol = headers["next fueling plan"];
    if (siteCol === undefined || dateCol === undefined) return;

    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      const siteCell = sheet[XLSX.utils.encode_cell({ r: row, c: siteCol })];
      const dateCell = sheet[XLSX.utils.encode_cell({ r: row, c: dateCol })];
      const date = parseExportDate(dateCell?.v);

      if (siteCell?.v && date) {
        const siteName = String(siteCell.v);
        if (!siteName.endsWith(" - BM")) {
          siteCell.v = siteName + " - BM";
          siteCell.w = siteCell.v;
        }
      }
    }
  }

  if (window.XLSX?.writeFile) {
    const originalWriteFile = window.XLSX.writeFile.bind(window.XLSX);
    window.XLSX.writeFile = function (workbook, filename, options) {
      addBMToExport(workbook, filename);
      return originalWriteFile(workbook, filename, options);
    };
  }

  function parseCsvLine(line) {
    const values = [];
    let value = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && quoted && line[i + 1] === '"') {
        value += '"';
        i++;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === "," && !quoted) {
        values.push(value);
        value = "";
      } else {
        value += char;
      }
    }
    values.push(value);
    return values;
  }

  function normalizeKey(value) {
    return String(value || "")
      .replace(/^\uFEFF/, "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  function parseCsv(text) {
    const lines = text.replace(/\r/g, "").trim().split("\n");
    const headers = parseCsvLine(lines.shift() || "").map(normalizeKey);
    return lines.filter(Boolean).map((line) => {
      const values = parseCsvLine(line);
      const row = {};
      headers.forEach((header, index) => {
        if (header) row[header] = String(values[index] || "").trim();
      });
      return row;
    });
  }

  function field(row, aliases) {
    for (const alias of aliases) {
      const value = row[normalizeKey(alias)];
      if (value !== undefined && String(value).trim()) return String(value).trim();
    }
    return "";
  }

  async function exportPlanWithBM() {
    const url =
      "https://docs.google.com/spreadsheets/d/1uWbVwsJ6mgUl9WxJz-zbxMaiCW-dG3DI_9gvKkEca18/export?format=csv&gid=1149576218&t=" +
      Date.now();
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load the current fuel plan");

    const activeRegion =
      document.querySelector(".region-tab.active")?.textContent || "CER";
    const regionMode = activeRegion.toLowerCase().includes("central region")
      ? "central"
      : activeRegion.toLowerCase().includes("east region")
        ? "east"
        : "cer";

    const rows = parseCsv(await response.text())
      .map((row) => {
        const site = field(row, ["site", "site name", "sitename", "site id"]);
        const region = field(row, ["area", "region", "region name"]);
        const status = field(row, ["cow status", "cowstatus", "site status", "status"]);
        const nextPlan = field(row, ["next fueling plan", "nextfuelingplan"]);
        const fuelingDate = parseExportDate(nextPlan);
        const suffix = fuelingDate ? " - BM" : "";
        return {
          "Site Name": site + suffix,
          "Region Name": region,
          "District Name": field(row, ["district name", "districtname", "district"]),
          "City Name": field(row, ["city name", "cityname", "city"]),
          "COW Status": status,
          Latitude: field(row, ["lat", "latitude"]),
          Longitude: field(row, ["lng", "longitude", "long"]),
          "Last Fueling Date": field(row, ["last fueling date", "lastfuelingdate"]),
          "Last Fueling QTY": field(row, ["last fueling qty", "lastfuelingqty"]),
          "Next Fueling Plan": nextPlan,
          "Site Label": field(row, ["site label", "sitelabel"]),
        };
      })
      .filter((row) => {
        const region = row["Region Name"].toLowerCase().trim();
        const status = row["COW Status"].toUpperCase().replace(/[\s_-]/g, "");
        const validStatus = ["ONAIR", "INPROGRESS", "ACTIVE", "OPERATIONAL"].includes(status);
        const validRegion =
          regionMode === "cer"
            ? region.includes("central") || region.includes("east") || ["cr", "er", "cer"].includes(region)
            : region.includes(regionMode) ||
              (regionMode === "central" && region === "cr") ||
              (regionMode === "east" && region === "er");
        return row["Site Name"] && validStatus && validRegion;
      });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 18 }, { wch: 16 }, { wch: 22 }, { wch: 20 },
      { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 20 },
      { wch: 18 }, { wch: 22 }, { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, "Central Fuel Plan");

    const now = new Date();
    const stamp = now.toISOString().replace(/[:T]/g, "-").slice(0, 19);
    XLSX.writeFile(workbook, `Central_Fuel_Plan_${stamp}.xlsx`);
  }

    document.addEventListener("DOMContentLoaded", () => {
    const exportButton = document.getElementById("downloadBtn");
    if (exportButton) {
      exportButton.addEventListener(
        "click",
        async (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          try {
            await exportPlanWithBM();
          } catch (error) {
            alert(error.message || "Failed to export the fuel plan");
          }
        },
        true,
      );
    }

    updateBMExtensions();
    const observer = new MutationObserver(updateBMExtensions);
    ["overdueTableBody", "todayTableBody", "comingTableBody"].forEach((id) => {
      const body = document.getElementById(id);
      if (body) observer.observe(body, { childList: true, subtree: true });
    });
  });
})();
