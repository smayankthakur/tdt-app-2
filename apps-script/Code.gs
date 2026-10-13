/**
 * The Divine Tarot — Google Apps Script (OPTIONAL)
 * ------------------------------------------------
 * One job: append an anonymous, consent-based usage row to the "Sessions" sheet.
 * The app sends it only when "Share anonymous usage data" is ON in Profile → Privacy.
 *
 * Login, profiles, readings and PAYMENTS no longer use this script — they run on Supabase
 * (project "ginni2"): see docs/SETUP-SUPABASE.md and supabase/functions/tdt-payments.
 *
 * Setup (see docs/SETUP-APPS-SCRIPT.md):
 *   - Create this script from a Google Sheet: Extensions → Apps Script (so it is "bound" to that Sheet).
 *   - Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.
 *   - Put the /exec URL in EXPO_PUBLIC_APPS_SCRIPT_URL.
 */

var SESSIONS_HEADER = ['Time', 'Session', 'Platform', 'OS', 'Device', 'App version', 'Language', 'UID', 'City', 'Region', 'Country'];

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action === 'logSession') return json(logSession(body));
    return json({ ok: false, error: 'unknown-action' });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doGet() {
  return json({ ok: true, service: 'The Divine Tarot usage sheet' });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function logSession(b) {
  sheet('Sessions', SESSIONS_HEADER).appendRow([
    new Date(),
    clip(b.sessionId),
    clip(b.platform),
    clip(b.osVersion),
    clip(b.model),
    clip(b.appVersion),
    clip(b.lang),
    clip(b.uid),
    clip(b.city),
    clip(b.region),
    clip(b.country),
  ]);
  return { ok: true };
}

function clip(v) {
  return String(v == null ? '' : v).slice(0, 80);
}

function sheet(name, header) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) sh.appendRow(header);
  return sh;
}

/** Run once from the editor to grant permissions and create the sheet. */
function testSetup() {
  sheet('Sessions', SESSIONS_HEADER);
  Logger.log('Sessions sheet ready');
}
