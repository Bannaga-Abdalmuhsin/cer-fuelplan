(() => {
  "use strict";

  const SITE_DRIVERS = {"COW001":"Mudasir","COW002":"Mudasir","COW011":"Abid","COW012":"Mudasir","COW013":"Mudasir","COW016":"Nadeem","COW017":"Abid","COW019":"Abid","COW020":"Abid","COW054":"Mudasir","COW055":"Abid","COW056":"Mudasir","COW057":"Mudasir","COW058":"Abid","COW059":"Abid","COW061":"Mudasir","COW063":"Mudasir","COW303":"Sohail Habib","COW304":"Umar Khuda Bakhsh","COW305":"Lukman","COW307":"Ahmed Ali","COW308":"Javed","COW309":"Ahmed Ali","COW310":"Siddique Shameer + Azam Ismael","COW510":"Nadeem","COW511":"M Sarfraz","COW512":"Umar Khuda Bakhsh","COW516":"Amir","COW517":"Sohail Khurshid","COW518":"Mudasir","COW520":"Furqan","COW527":"Siddique Shameer + Azam Ismael","COW528":"Amir","COW529":"Javed","COW530":"Nadeem","COW531":"Javed","COW534":"Mudasir","COW535":"Javed","COW536":"Husnain","COW541":"Mudasir","COW542":"Nadeem","COW543":"Zaffar Abdul Sattar","COW544":"Mudasir","COW548":"Zaffar Abdul Sattar","COW600":"Mudasir","COW611":"Mudasir","COW615":"Nadeem","COW616":"Abid","COW618":"Lukman","COW621":"Nadeem","COW626":"Nadeem","COW634":"Javed","COW643":"Mudasir","COW653":"Harris Mukhtar","COW656":"Ehsan Ali","COW660":"Ehsan Ali","COW668":"Javed","COW713":"Mudasir","COW714":"Mudasir","COW715":"Nadeem","COW716":"Mudasir","COW720":"Mudasir","COW725":"Mudasir","COW727":"Mudasir","COW728":"Abid","COW729":"Mudasir","COW731":"Javed","COW732":"Mudasir","COW734":"Abid","COW735":"Abid","COW737":"M Sarfraz","COW738":"Mudasir","COW739":"Nadeem","COW740":"Mudasir","COW741":"Abid","COW742":"Mudasir","COW743":"Sohail Khurshid","COW744":"Mudasir","COW746":"Furqan","COW747":"Abid","COW748":"Abid","COW749":"Nadeem","COW750":"Zaffar Abdul Sattar","COW751":"Husnain","COW753":"Mudasir","COW757":"Javed","COW758":"Mudasir","COW763":"Furqan","COW764":"Mudasir","COW767":"Nadeem","COW769":"Mudasir","COW770":"Mudasir","COW771":"Javed","COW772":"Furqan","COW774":"Nadeem","COW775":"Abid","COW776":"Furqan","COW778":"Mudasir","COW779":"Nadeem","COW802":"Mudasir","COW820":"Abid","COW822":"Mudasir","COW823":"Abid","COW854":"Mudasir","COW855":"Abid","COW856":"Abid","COW857":"Abid","COW858":"Mudasir","COW859":"Abid","COW861":"Mudasir","COWA629":"Javed","COWJN1":"Ramzan Farooq","COWPC":"Abid","CWA003":"Umar Khuda Bakhsh","CWA004":"Siddique Shameer + Azam Ismael","CWH001":"Umar Khuda Bakhsh","CWH004":"Lukman","CWH006":"Javed","CWH011":"Irfan","CWH019":"Ehsan Ali","CWH023":"Siddique Shameer + Azam Ismael","CWH024":"Ehsan Ali","CWH028":"Amir","CWH029":"Siddique Shameer + Azam Ismael","CWH032":"Javed","CWH033":"Siddique Shameer + Azam Ismael","CWH041":"Amir","CWH045":"Siddique Shameer + Azam Ismael","CWH076":"Siddique Shameer + Azam Ismael","CWH077":"Harris Mukhtar","CWH084":"Lukman","CWH086":"Ehsan Ali","CWH088":"Ehsan Ali","CWH089":"Javed","CWH091":"Ahmed Ali","CWH093":"Lukman","CWH193":"Ramzan Farooq","CWH194":"Javed","CWH316":"Sohail Habib","CWH317":"Ehsan Ali","CWH937":"Zaffar Abdul Sattar","CWH941":"Zaffar Abdul Sattar","CWH945":"Ehsan Ali","CWH972":"Furqan","CWH973":"Ehsan Ali","CWN058":"Lukman","CWN918":"Furqan","CWN963":"Nadeem","CWN986":"Siddique Shameer + Azam Ismael","CWN988":"Siddique Shameer + Azam Ismael","CWS605":"Lukman","CWS800":"Ahmed Ali","CWS805":"Siddique Shameer + Azam Ismael","CWS814":"Sohail Habib","CWS816":"Zaffar Abdul Sattar","CWS820":"Abid Ali","CWS821":"Umar Khuda Bakhsh","CWS831":"Amir","CWS833":"Lukman","CWS834":"Harris Mukhtar","CWS835":"Ahmed Ali","CWS836":"Amir"};

  function siteId(value) {
    const match = String(value || "").toUpperCase().match(/\b(?:COW|CWH|CWN|CWS|CWA)[A-Z0-9]*\b/);
    return match ? match[0] : "";
  }

  function driverFor(value) {
    return SITE_DRIVERS[siteId(value)] || "Unassigned";
  }

  const tableBodies = [
    "overdueTableBody",
    "todayTableBody",
    "comingTableBody",
    "vvvipTableBody",
    "accessPermitTableBody",
  ];

  function enhanceTable(tbody) {
    if (!tbody) return;
    const table = tbody.closest("table");
    const headerRow = table?.querySelector("thead tr");
    if (!headerRow) return;

    if (!headerRow.querySelector("[data-driver-column]")) {
      const th = document.createElement("th");
      th.textContent = "Driver / Team";
      th.dataset.driverColumn = "true";
      headerRow.firstElementChild?.after(th);
    }

    tbody.querySelectorAll(":scope > tr").forEach((row) => {
      const first = row.cells[0];
      if (!first) return;

      if (first.colSpan > 1) {
        first.colSpan = headerRow.cells.length;
        return;
      }

      const id = siteId(first.textContent);
      if (!id || row.querySelector("[data-driver-cell]")) return;

      const td = document.createElement("td");
      td.textContent = driverFor(id);
      td.dataset.driverCell = "true";
      td.className = "driver-team-cell";
      first.after(td);
    });
  }

  function enhanceSearchResult() {
    const siteName = document.querySelector("#searchResult .search-result-site-name");
    const container = siteName?.closest(".search-result-item");
    if (!siteName || !container || container.querySelector("[data-search-driver]")) return;

    const driver = document.createElement("div");
    driver.dataset.searchDriver = "true";
    driver.className = "search-result-driver";
    driver.innerHTML = "<strong>Driver / Team:</strong> " + driverFor(siteName.textContent);
    siteName.parentElement?.after(driver);
  }

  function enhanceMapPopups() {
    document.querySelectorAll(".leaflet-popup-content").forEach((popup) => {
      if (popup.querySelector("[data-popup-driver]")) return;
      const heading = popup.querySelector("h4");
      const id = siteId(heading?.textContent);
      if (!id) return;

      const line = document.createElement("p");
      line.dataset.popupDriver = "true";
      line.innerHTML = "<strong>Driver / Team:</strong> " + driverFor(id);
      const header = heading.closest(".ol-popup-header");
      (header || heading).after(line);
    });
  }

  function enhance() {
    tableBodies.forEach((id) => enhanceTable(document.getElementById(id)));
    enhanceSearchResult();
    enhanceMapPopups();
  }

  const style = document.createElement("style");
  style.textContent = `
    .driver-team-cell,
    th[data-driver-column] { white-space: nowrap; }
    .search-result-driver {
      margin: 10px 0;
      padding: 8px 10px;
      background: rgba(255,255,255,.72);
      border-radius: 6px;
      color: #172554;
    }
  `;
  document.head.appendChild(style);

  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      enhance();
    });
  });

  document.addEventListener("DOMContentLoaded", () => {
    enhance();
    observer.observe(document.body, { childList: true, subtree: true });
  });

  window.getDriverForSite = driverFor;
})();
