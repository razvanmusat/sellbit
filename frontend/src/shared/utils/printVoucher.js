import QRCode from 'qrcode';

const LOGO_SRC = `${window.location.origin}/logoprint.png`;

const VCARD = [
  'BEGIN:VCARD',
  'VERSION:3.0',  
  'ORG:Luca Land',
  'TEL;TYPE=CELL:+40750233644',
  'EMAIL:office@LucaLand.ro',
  'ADR;TYPE=WORK:;;Str. Chiristigii nr. 1, Buzău',
  'END:VCARD',
].join('\r\n');

const PRINT_SCRIPT = `<script>
window.addEventListener('load', function() {
  setTimeout(function() { window.print(); window.close(); }, 150);
});
<\/script>`;

const PAGE_STYLE = `<style>
  @page { size: 57mm 120.825mm; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, sans-serif;
    font-size: 9px;
    width: 57mm;
    max-height: 120.825mm;
    padding: 2mm 1mm;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .wrap {
    border: 0.7px dashed #888;
    padding: 1.5mm 0.5mm;
    width: 55mm;
    height: 116mm;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .logo { width: 100%; max-height: 20mm; object-fit: contain; margin-bottom: 0.5mm; }
  .tagline { font-size: 13px; font-style: italic; font-weight: bold; text-align: center; color: #333; margin-bottom: 2mm; }
  .discount { font-size: 11px; font-weight: bold; text-align: center; margin-bottom: 1mm; }
  .prefix { font-size: 8px; text-align: center; letter-spacing: 1px; color: #333; margin-bottom: 0.5mm; }
  .suffix { font-size: 18px; font-weight: bold; letter-spacing: 3px; border: 1.5px solid #000; padding: 1mm; display: inline-block; margin: 1.5mm 0; line-height: 1; }
  hr.div { border: none; border-top: 0.5px dashed #000; width: 100%; margin: 1.5mm 0; }
  .notes { font-size: 10px; text-align: center; line-height: 1.2; width: 100%; }
  .expiry { font-size: 14px; font-weight: bold; text-align: center; color: #222; margin-top: 1mm; }
  .qr { display: block; width: 30mm; height: 30mm; margin: auto auto 0; }
  .qr-label { font-size: 12px; text-align: center; color: #555; margin-top: 0.5mm; }
  .disclaimer { font-size: 11px; text-align: center; color: #444; margin-top: 1.5mm; width: 100%; line-height: 1.2; }
  .stamp-grid { display: flex; flex-wrap: wrap; gap: 0.5mm; justify-content: center; margin: 1mm 0; width: 100%; }
  .stamp-box { width: 17mm; height: 17mm; border-radius: 50%; border: 1.5px solid #000; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #aaa; font-weight: bold; }
</style>`;

export function printVoucherHtml(html) {
  const win = window.open('', '_blank', 'width=794,height=559');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
}

function splitCode(code) {
  if (!code) return { prefix: '', suffix: '' };
  const i = code.lastIndexOf('-');
  return i === -1 ? { prefix: '', suffix: code } : { prefix: code.slice(0, i), suffix: code.slice(i + 1) };
}

function formatDiscount(type, value) {
  if (!value) return '';
  const v = Number(value);
  if (type === 'PERCENT') return `${v.toFixed(0)}% reducere`;
  if (type === 'FREE_HOURS') return v === 1 ? '1 oră gratis' : `${v} ore gratis`;
  return `${v.toFixed(2)} LEI`;
}

function fmtDate(dt) {
  return dt ? new Date(dt).toLocaleDateString('ro-RO') : '';
}

let _qrSvgCache = null;
async function getQrSvg() {
  if (_qrSvgCache) return _qrSvgCache;
  const raw = await QRCode.toString(VCARD, { type: 'svg', margin: 1 });
  _qrSvgCache = raw.replace('<svg ', '<svg class="qr" ');
  return _qrSvgCache;
}

function wrapPage(body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${PAGE_STYLE}</head><body>${body}${PRINT_SCRIPT}</body></html>`;
}

async function regularFragment({ code, discountType, discountValue, expiresAt, receiptTemplate }) {
  const { prefix, suffix } = splitCode(code);
  const discount = formatDiscount(discountType, discountValue);
  const notes = receiptTemplate || '';
  const expDate = fmtDate(expiresAt);
  const qr = await getQrSvg();
  return `
    <div class="wrap">
      <img class="logo" src="${LOGO_SRC}" alt="" />
      <hr class="div" />
      <div class="tagline">Joacă și distracție!</div>
      ${discount ? `<div class="discount" style="margin-bottom:0">Reducere: ${discount}</div>` : ''}
      <div class="notes" style="flex:1;margin-top:2mm;margin-bottom:2mm">${notes}</div>
      <div style="display:flex;gap:2mm;justify-content:center;align-items:flex-start;width:100%;margin:0">
        ${prefix ? `
          <div style="display:flex;flex-direction:column;align-items:center">
            <div style="font-size:7px;color:#666;margin-bottom:0.5mm">Cod campanie</div>
            <div style="font-size:18px;font-weight:bold;letter-spacing:3px;border:1.5px solid #000;padding:1mm;white-space:nowrap;line-height:1">${prefix}</div>
          </div>
        ` : ''}
        <div style="display:flex;flex-direction:column;align-items:center">
          <div style="font-size:7px;color:#666;margin-bottom:0.5mm">Cod voucher</div>
          <div class="suffix" style="margin:0;white-space:nowrap">${suffix}</div>
        </div>
      </div>
      <hr class="div" />
      ${qr}
      <div class="qr-label">Scanează &amp; salvează-ne la contacte</div>
      <div class="disclaimer">Voucher nominal. O singură utilizare. Nu se cumulează cu alte promoții.</div>
      ${expDate ? `<div class="expiry">Expiră pe data de: ${expDate}</div>` : ''}
    </div>
  `;
}

async function giftCardFragment({ code, discountValue, expiresAt, receiptTemplate }) {
  const { prefix, suffix } = splitCode(code);
  const amount = `${Number(discountValue || 0).toFixed(0)} Lei`;
  const notes = receiptTemplate || '';
  const expDate = fmtDate(expiresAt);
  const qr = await getQrSvg();
  return `
    <div class="wrap">
      <img class="logo" src="${LOGO_SRC}" alt="" />
      <hr class="div" />
      <div class="tagline">Joacă și distracție!</div>
      <div style="font-size:12px;font-weight:bold;text-align:center;margin-bottom:0.3mm">Valoare voucher cadou</div>
      <div style="font-size:16px;font-weight:bold;text-align:center;margin-bottom:1mm">${amount}</div>
      <div class="notes" style="margin:0 0 1.5mm">${notes}</div>
      <div style="display:flex;gap:2mm;justify-content:center;align-items:flex-start;width:100%;margin:1mm 0">
        ${prefix ? `
          <div style="display:flex;flex-direction:column;align-items:center">
            <div style="font-size:7px;color:#666;margin-bottom:0.5mm">Cod campanie</div>
            <div style="font-size:18px;font-weight:bold;letter-spacing:3px;border:1.5px solid #000;padding:1mm;white-space:nowrap;line-height:1">${prefix}</div>
          </div>
        ` : ''}
        <div style="display:flex;flex-direction:column;align-items:center">
          <div style="font-size:7px;color:#666;margin-bottom:0.5mm">Cod voucher cadou</div>
          <div class="suffix" style="margin:0;white-space:nowrap">${suffix}</div>
        </div>
      </div>
      <hr class="div" />
      <div style="margin:1mm 0;width:30mm;height:30mm">${qr}</div>
      <div class="qr-label">Scanează &amp; salvează-ne la contacte</div>
      <div class="disclaimer">Voucher cadou nominal. O singură utilizare. Nu se cumulează cu alte promoții.</div>
      ${expDate ? `<div class="expiry" style="padding-bottom:1mm">Expiră pe data de: ${expDate}</div>` : ''}
    </div>
  `;
}

async function loyaltyFragment({ code, stampsRequired, discountType, discountValue, expiresAt, receiptTemplate }) {
  const { prefix, suffix } = splitCode(code);
  const n = stampsRequired || 5;
  const expDate = fmtDate(expiresAt);
  const discount = formatDiscount(discountType, discountValue);
  const stamps = Array.from({ length: n }, (_, i) => `<div class="stamp-box">${i + 1}</div>`).join('');
  const notes = receiptTemplate || '';
  const qr = await getQrSvg();
  return `
    <div class="wrap">
      <img class="logo" src="${LOGO_SRC}" alt="" />
      <hr class="div" />
      <div class="tagline">Joacă și distracție!</div>
      <div style="font-size:10px;text-align:center;margin-bottom:2mm">Adună <b>${n}</b> ștampile și primești: <b>${discount}</b></div>
      ${notes ? `<div class="notes" style="margin-bottom:1mm">${notes}</div>` : ''}
      <div class="stamp-grid">${stamps}</div>
      <div style="display:flex;gap:2mm;justify-content:center;align-items:flex-start;width:100%;margin:2mm 0 1.5mm">
        ${prefix ? `
          <div style="display:flex;flex-direction:column;align-items:center">
            <div style="font-size:7px;color:#666;margin-bottom:0.5mm">Cod campanie</div>
            <div style="font-size:18px;font-weight:bold;letter-spacing:3px;border:1.5px solid #000;padding:1mm;white-space:nowrap;line-height:1">${prefix}</div>
          </div>
        ` : ''}
        <div style="display:flex;flex-direction:column;align-items:center">
          <div style="font-size:7px;color:#666;margin-bottom:0.5mm">Cod voucher</div>
          <div class="suffix" style="margin:0;white-space:nowrap">${suffix}</div>
        </div>
      </div>
      <div class="disclaimer" style="margin-top:auto;padding-top:0">Card fidelitate nominal. O singură utilizare după cele ${n} ștampile. Nu se cumulează cu alte promoții.</div>
      ${expDate ? `<div class="expiry" style="padding-bottom:1mm">Expiră pe data de: ${expDate}</div>` : ''}
    </div>
  `;
}

export async function buildRegularVoucherHtml(params) { return wrapPage(await regularFragment(params)); }
export async function buildGiftCardHtml(params) { return wrapPage(await giftCardFragment(params)); }
export async function buildLoyaltyCardHtml(params) { return wrapPage(await loyaltyFragment(params)); }

export async function buildRegularVoucherBody(params) { return regularFragment(params); }
export async function buildGiftCardBody(params) { return giftCardFragment(params); }
export async function buildLoyaltyCardBody(params) { return loyaltyFragment(params); }

export async function printVoucherPages(bodyFragments) {
  const pages = (await Promise.all(bodyFragments)).map((frag, i, arr) => {
    const isLast = i === arr.length - 1;
    return `<div style="${isLast ? '' : 'page-break-after:always'}">${frag}</div>`;
  });
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">${PAGE_STYLE}</head><body>${pages.join('')}${PRINT_SCRIPT}</body></html>`;
  printVoucherHtml(html);
}
