// ╔══════════════════════════════════════════════════════════╗
// ║  Tumbuh Kembang Bayi — Shafiyyah & Athiyyah             ║
// ║  Google Apps Script API                                  ║
// ╚══════════════════════════════════════════════════════════╝

const SPREADSHEET_ID = "ISI_ID_GOOGLE_SHEET_KAMU";
const SECRET_KEY     = "bayi-fauzan-venska-rahasia";
const SHEET_DATA     = "data";
const SHEET_IMUN     = "imunisasi";

function doGet(e) {
  const p        = (e && e.parameter) ? e.parameter : {};
  const action   = p.action   || "ping";
  const callback = p.callback || "";

  if (action !== "ping" && p.key !== SECRET_KEY)
    return respond({ error: "Unauthorized" }, callback);

  let result;
  try {
    if      (action === "ping")           result = { status:"ok" };
    else if (action === "get_data")       result = getData(p.nama || "");
    else if (action === "add_data")       result = addData(p);
    else if (action === "delete_data")    result = deleteData(p.id);
    else if (action === "get_imunisasi")  result = getImunisasi(p.nama || "");
    else if (action === "add_imunisasi")  result = addImunisasi(p);
    else if (action === "toggle_imun")    result = toggleImun(p.id);
    else result = { error: "Unknown action" };
  } catch(err) {
    result = { error: err.message };
  }
  return respond(result, callback);
}

function doPost(e) { return doGet(e); }

// ── SHEET ────────────────────────────────────────────────────

function getSheet(name, headers) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  let   sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1,1,1,headers.length).setFontWeight("bold");
  }
  return sheet;
}

// ── DATA TUMBUH KEMBANG ───────────────────────────────────────

function getData(nama) {
  const sheet = getSheet(SHEET_DATA, ["id","nama","tanggal","berat","tinggi","lingkar_kepala","usia_bulan","catatan"]);
  const last  = sheet.getLastRow();
  if (last < 2) return [];
  const rows = sheet.getRange(2, 1, last-1, 8).getValues();
  return rows.filter(r => r[0] && (!nama || r[1] === nama))
    .map(r => ({
      id: Number(r[0]), nama: r[1],
      tanggal: tglStr(r[2]), berat: Number(r[3]),
      tinggi: Number(r[4]), lingkar_kepala: Number(r[5]),
      usia_bulan: Number(r[6]), catatan: r[7]
    })).sort((a,b) => new Date(b.tanggal) - new Date(a.tanggal));
}

function addData(p) {
  const sheet  = getSheet(SHEET_DATA, ["id","nama","tanggal","berat","tinggi","lingkar_kepala","usia_bulan","catatan"]);
  const newId  = nextId(sheet);
  const today  = p.tanggal || fmtDate(new Date());
  sheet.appendRow([newId, p.nama||"Shafiyyah", today,
    Number(p.berat)||0, Number(p.tinggi)||0,
    Number(p.lingkar_kepala)||0, Number(p.usia_bulan)||0, p.catatan||""]);
  return { success: true, id: newId };
}

function deleteData(id) {
  const sheet = getSheet(SHEET_DATA, ["id","nama","tanggal","berat","tinggi","lingkar_kepala","usia_bulan","catatan"]);
  return deleteRow(sheet, id);
}

// ── IMUNISASI ─────────────────────────────────────────────────

function getImunisasi(nama) {
  const sheet = getSheet(SHEET_IMUN, ["id","nama","vaksin","usia_target","tanggal_realisasi","status","catatan"]);
  const last  = sheet.getLastRow();
  if (last < 2) return initImunisasi(nama);
  const rows = sheet.getRange(2,1,last-1,7).getValues();
  const existing = rows.filter(r => r[0] && (!nama || r[1] === nama))
    .map(r => ({
      id: Number(r[0]), nama: r[1], vaksin: r[2],
      usia_target: r[3], tanggal_realisasi: tglStr(r[4]),
      status: r[5], catatan: r[6]
    }));
  if (existing.length) return existing;
  return initImunisasi(nama);
}

const JADWAL_IMUN = [
  "HB-0 (0 hari)","BCG (1 bulan)","Polio 1 (1 bulan)",
  "DPT-HB-Hib 1 (2 bulan)","Polio 2 (2 bulan)","PCV 1 (2 bulan)",
  "DPT-HB-Hib 2 (3 bulan)","Polio 3 (3 bulan)","PCV 2 (3 bulan)",
  "DPT-HB-Hib 3 (4 bulan)","Polio 4 (4 bulan)","IPV (4 bulan)",
  "Campak/MR (9 bulan)","PCV 3 (12 bulan)","MR Booster (18 bulan)",
  "DPT Booster (18 bulan)"
];
const USIA_TARGET = [
  "0 hari","1 bulan","1 bulan","2 bulan","2 bulan","2 bulan",
  "3 bulan","3 bulan","3 bulan","4 bulan","4 bulan","4 bulan",
  "9 bulan","12 bulan","18 bulan","18 bulan"
];

function initImunisasi(nama) {
  const sheet  = getSheet(SHEET_IMUN, ["id","nama","vaksin","usia_target","tanggal_realisasi","status","catatan"]);
  const lastId = getLastId(sheet);
  const rows   = JADWAL_IMUN.map((v, i) => [lastId+i+1, nama||"Shafiyyah", v, USIA_TARGET[i], "", "belum", ""]);
  if (rows.length) sheet.getRange(sheet.getLastRow()+1,1,rows.length,7).setValues(rows);
  return getImunisasi(nama);
}

function addImunisasi(p) {
  const sheet = getSheet(SHEET_IMUN, ["id","nama","vaksin","usia_target","tanggal_realisasi","status","catatan"]);
  const newId = nextId(sheet);
  sheet.appendRow([newId, p.nama||"Shafiyyah", p.vaksin||"", p.usia_target||"", p.tanggal_realisasi||"", p.status||"belum", p.catatan||""]);
  return { success: true, id: newId };
}

function toggleImun(id) {
  const sheet = getSheet(SHEET_IMUN, ["id","nama","vaksin","usia_target","tanggal_realisasi","status","catatan"]);
  const last  = sheet.getLastRow();
  const ids   = sheet.getRange(2,1,last-1,1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (Number(ids[i][0]) === Number(id)) {
      const row    = i + 2;
      const status = sheet.getRange(row,6).getValue();
      const newSt  = status === "selesai" ? "belum" : "selesai";
      const today  = newSt === "selesai" ? fmtDate(new Date()) : "";
      sheet.getRange(row,5).setValue(today);
      sheet.getRange(row,6).setValue(newSt);
      return { success: true, status: newSt };
    }
  }
  return { error: "Not found" };
}

// ── UTIL ──────────────────────────────────────────────────────

function tglStr(v) {
  if (!v) return "";
  if (v instanceof Date) return Utilities.formatDate(v,"Asia/Jakarta","yyyy-MM-dd");
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0,10);
  return s.substring(0,10);
}
function fmtDate(d) { return Utilities.formatDate(d,"Asia/Jakarta","yyyy-MM-dd"); }
function nextId(sheet) { return getLastId(sheet) + 1; }
function getLastId(sheet) {
  const last = sheet.getLastRow();
  if (last < 2) return 0;
  const ids = sheet.getRange(2,1,last-1,1).getValues().flat().map(Number).filter(n=>n>0);
  return ids.length ? Math.max(...ids) : 0;
}
function deleteRow(sheet, id) {
  const last = sheet.getLastRow();
  if (last < 2) return { error: "Tidak ada data" };
  const ids = sheet.getRange(2,1,last-1,1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (Number(ids[i][0]) === Number(id)) { sheet.deleteRow(i+2); return { success:true }; }
  }
  return { error: "ID tidak ditemukan" };
}
function respond(data, callback) {
  const json = JSON.stringify(data);
  const out  = callback ? callback+"("+json+")" : json;
  return ContentService.createTextOutput(out)
    .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}
