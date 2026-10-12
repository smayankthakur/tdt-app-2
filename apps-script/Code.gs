/**
 * The Divine Tarot — Google Apps Script backend
 * ------------------------------------------------
 * One small web app that does three jobs, so no secret ever ships inside the mobile app:
 *   1. createOrder    → creates a Razorpay Order (amount decided HERE, not by the app)
 *   2. verifyPayment  → checks Razorpay's signature with the Key SECRET, then unlocks the
 *                       product in Firestore (entitlements/{uid}) and logs it to the "Payments" sheet
 *      checkOrder     → for payments that ended on a bank page or in a UPI app: asks Razorpay
 *                       directly whether the order was paid, then unlocks the same way
 *   3. logSession     → appends an anonymous, consent-based usage row to the "Sessions" sheet
 *
 * Setup (see docs/SETUP-APPS-SCRIPT.md):
 *   - Create this script from a Google Sheet: Extensions → Apps Script (so it is "bound" to that Sheet).
 *   - Project Settings → Script properties:
 *       RAZORPAY_KEY_ID       rzp_live_xxx (or rzp_test_xxx)
 *       RAZORPAY_KEY_SECRET   the matching secret — NEVER put this in the app
 *       FIREBASE_PROJECT_ID   the-divine-tarot-2-project
 *   - The Google account that deploys this script must be an Owner/Editor of the Firebase project.
 *   - Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.
 */

/** Server-side price list. Keep in sync with src/constants/config.ts → Products. */
var PAYMENTS_HEADER = ['Time', 'UID', 'Product', 'Amount (₹)', 'Order ID', 'Payment ID', 'Unlocked until'];

var PRODUCTS = {
  ginni_unlimited_30d: { amount: 19900, days: 30, name: 'Ginni Unlimited (30 days)' },
  kundli_full_report: { amount: 9900, days: 3650, name: 'Kundli Milan full report' },
};

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    switch (body.action) {
      case 'createOrder':
        return json(createOrder(body));
      case 'verifyPayment':
        return json(verifyPayment(body));
      case 'checkOrder':
        return json(checkOrder(body));
      case 'logSession':
        return json(logSession(body));
      default:
        return json({ ok: false, error: 'unknown-action' });
    }
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doGet() {
  return json({ ok: true, service: 'The Divine Tarot backend' });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function prop(name) {
  var v = PropertiesService.getScriptProperties().getProperty(name);
  if (!v) throw new Error('missing-script-property-' + name);
  return v;
}

function razorpay(method, path, payload) {
  var auth = Utilities.base64Encode(prop('RAZORPAY_KEY_ID') + ':' + prop('RAZORPAY_KEY_SECRET'));
  var res = UrlFetchApp.fetch('https://api.razorpay.com/v1' + path, {
    method: method,
    contentType: 'application/json',
    headers: { Authorization: 'Basic ' + auth },
    payload: payload ? JSON.stringify(payload) : undefined,
    muteHttpExceptions: true,
  });
  var data = JSON.parse(res.getContentText() || '{}');
  if (res.getResponseCode() >= 300) throw new Error('razorpay-' + res.getResponseCode() + ': ' + (data.error && data.error.description));
  return data;
}

/* ───────────── 1. Orders ───────────── */

function createOrder(body) {
  var product = PRODUCTS[body.productId];
  if (!product) throw new Error('unknown-product');
  // Firebase UIDs are URL-safe; reject anything else before it reaches the Firestore document path
  if (body.uid && !/^[A-Za-z0-9_-]{1,128}$/.test(String(body.uid))) throw new Error('bad-uid');
  var order = razorpay('post', '/orders', {
    amount: product.amount,
    currency: 'INR',
    receipt: ('tdt_' + Date.now()).slice(0, 40),
    notes: { productId: body.productId, uid: String(body.uid || 'guest') },
  });
  return { ok: true, orderId: order.id, amount: order.amount };
}

/* ───────────── 2. Verify + unlock ───────────── */

function hmacHex(message, secret) {
  var bytes = Utilities.computeHmacSha256Signature(message, secret);
  return bytes
    .map(function (b) {
      var v = (b < 0 ? b + 256 : b).toString(16);
      return v.length === 1 ? '0' + v : v;
    })
    .join('');
}

function verifyPayment(body) {
  var product = PRODUCTS[body.productId];
  if (!product) throw new Error('unknown-product');
  if (!body.razorpay_order_id || !body.razorpay_payment_id || !body.razorpay_signature) throw new Error('missing-fields');

  var expected = hmacHex(body.razorpay_order_id + '|' + body.razorpay_payment_id, prop('RAZORPAY_KEY_SECRET'));
  if (expected !== body.razorpay_signature) throw new Error('bad-signature');

  var order = checkedOrder(body.razorpay_order_id, body);
  return unlock(order, body.razorpay_payment_id, String(body.uid || ''), body.productId);
}

/** The order must belong to this product and this user (set when we created it). */
function checkedOrder(orderId, body) {
  var product = PRODUCTS[body.productId];
  if (!/^order_[A-Za-z0-9]+$/.test(String(orderId))) throw new Error('bad-order-id');
  var order = razorpay('get', '/orders/' + orderId);
  if (!order.notes || order.notes.productId !== body.productId) throw new Error('order-product-mismatch');
  if (Number(order.amount) !== product.amount || order.currency !== 'INR') throw new Error('order-amount-mismatch');
  if (order.notes.uid !== (String(body.uid || '') || 'guest')) throw new Error('order-user-mismatch');
  return order;
}

/**
 * No signature here: the answer comes straight from Razorpay with the Key Secret, so it can't be faked.
 * Someone could only ever unlock an order that really was paid, for the user it was created for.
 */
function checkOrder(body) {
  var product = PRODUCTS[body.productId];
  if (!product) throw new Error('unknown-product');
  if (body.uid && !/^[A-Za-z0-9_-]{1,128}$/.test(String(body.uid))) throw new Error('bad-uid');
  var order = checkedOrder(body.orderId, body);
  var list = razorpay('get', '/orders/' + order.id + '/payments');
  var paid = (list.items || []).filter(function (p) {
    return p.status === 'captured' && Number(p.amount) === product.amount;
  })[0];
  if (!paid) return { ok: true, paid: false };
  var r = unlock(order, paid.id, String(body.uid || ''), body.productId);
  return { ok: true, paid: true, expiresAt: r.expiresAt };
}

function unlock(order, paymentId, uid, productId) {
  var product = PRODUCTS[productId];
  // One order = one unlock. Without this, re-sending the same (valid) signed payload
  // would extend the entitlement by product.days on every call.
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var payments = sheet('Payments', PAYMENTS_HEADER);
    var seen = payments.getRange('E:E').createTextFinder(order.id).matchEntireCell(true).findNext();
    if (seen) {
      var prev = payments.getRange(seen.getRow(), 7).getValue();
      return { ok: true, expiresAt: prev instanceof Date ? prev.getTime() : Number(prev) || 0 };
    }

    var expiresAt = Date.now() + product.days * 86400000;
    if (uid) {
      var current = readEntitlement(uid, productId);
      expiresAt = Math.max(Date.now(), current) + product.days * 86400000;
      writeEntitlement(uid, productId, expiresAt);
    }

    payments.appendRow([new Date(), uid || 'guest', productId, product.amount / 100, order.id, paymentId, new Date(expiresAt)]);
    SpreadsheetApp.flush();
    return { ok: true, expiresAt: expiresAt };
  } finally {
    lock.releaseLock();
  }
}

/* Firestore REST, authenticated as the script owner (rules don't apply to this server access). */
function fsUrl(uid) {
  return 'https://firestore.googleapis.com/v1/projects/' + prop('FIREBASE_PROJECT_ID') + '/databases/(default)/documents/entitlements/' + encodeURIComponent(uid);
}

function readEntitlement(uid, productId) {
  var res = UrlFetchApp.fetch(fsUrl(uid), {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) return 0;
  var doc = JSON.parse(res.getContentText());
  try {
    return Number(doc.fields.products.mapValue.fields[productId].integerValue) || 0;
  } catch (e) {
    return 0;
  }
}

function writeEntitlement(uid, productId, expiresAt) {
  var fields = {};
  fields[productId] = { integerValue: String(expiresAt) };
  var res = UrlFetchApp.fetch(fsUrl(uid) + '?updateMask.fieldPaths=' + encodeURIComponent('products.' + productId), {
    method: 'patch',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({ fields: { products: { mapValue: { fields: fields } } } }),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() >= 300) throw new Error('firestore-' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 200));
}

/* ───────────── 3. Analytics ───────────── */

function logSession(b) {
  sheet('Sessions', ['Time', 'Session', 'Platform', 'OS', 'Device', 'App version', 'Language', 'UID', 'City', 'Region', 'Country']).appendRow([
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

/** Run once from the editor to grant permissions and check your setup. */
function testSetup() {
  Logger.log('Razorpay key: ' + prop('RAZORPAY_KEY_ID').slice(0, 12) + '…');
  Logger.log('Firebase project: ' + prop('FIREBASE_PROJECT_ID'));
  Logger.log('OAuth token OK: ' + (ScriptApp.getOAuthToken().length > 20));
  sheet('Payments', PAYMENTS_HEADER);
  sheet('Sessions', ['Time', 'Session', 'Platform', 'OS', 'Device', 'App version', 'Language', 'UID', 'City', 'Region', 'Country']);
}
