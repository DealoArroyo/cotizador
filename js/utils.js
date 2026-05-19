import { formatCurrency } from './catalogs.js';
import Store from './store.js';

export function uid() { return Store.genId(); }

export function today() { return new Date().toISOString().slice(0, 10); }

export function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export function calcQuotationTotals(items) {
  let subtotal = 0, discountTotal = 0, taxTotal = 0;
  for (const item of items) {
    const base = (item.qty || 0) * (item.unitPrice || 0);
    const disc = base * ((item.discount || 0) / 100);
    const afterDisc = base - disc;
    const tax = afterDisc * ((item.taxRate || 0) / 100);
    subtotal += base;
    discountTotal += disc;
    taxTotal += tax;
  }
  const total = subtotal - discountTotal + taxTotal;
  return { subtotal, discountTotal, taxTotal, total };
}

export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16).toUpperCase();
  });
}

export function generateCadenaOriginal(invoice, company) {
  const fecha = invoice.date;
  const uuid = invoice.uuid || '';
  return `||4.0|${uuid}|${fecha}T12:00:00|${company.rfc}|${company.name}|${invoice.clientRfc || ''}|${invoice.clientName || ''}|${invoice.regimenFiscal || '601'}|${invoice.total?.toFixed(2) || '0.00'}|MXN|1|${invoice.usoCFDI || 'G03'}||`;
}

export function generateSello() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let s = '';
  for (let i = 0; i < 344; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s + '==';
}

export function generateNoCertificado() {
  return Array.from({ length: 20 }, () => Math.floor(Math.random() * 10)).join('');
}

export function generateQRData(invoice) {
  return `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${invoice.uuid}&re=${invoice.companyRfc}&rr=${invoice.clientRfc}&tt=${invoice.total?.toFixed(2)}&fe=${(invoice.sello || '').slice(-8)}`;
}

export function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateCFDIXml(invoice, company) {
  const esc = escapeXml;
  const items = invoice.items || [];

  const conceptos = items.map(item => {
    const importe = ((item.qty || 0) * (item.unitPrice || 0) * (1 - (item.discount || 0) / 100)).toFixed(2);
    const impuesto = (parseFloat(importe) * ((item.taxRate || 16) / 100)).toFixed(2);
    return `
    <cfdi:Concepto ClaveProdServ="${esc(item.claveProdServ || '81111501')}" Cantidad="${item.qty || 1}" ClaveUnidad="${esc(item.claveUnidad || 'E48')}" Unidad="${esc(item.unit || 'Servicio')}" Descripcion="${esc(item.description || item.name || '')}" ValorUnitario="${(item.unitPrice || 0).toFixed(2)}" Importe="${importe}" Descuento="${((item.qty || 0) * (item.unitPrice || 0) * (item.discount || 0) / 100).toFixed(2)}" ObjetoImp="02">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="${importe}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${impuesto}"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd" Version="4.0" Serie="${esc(company.serie || 'A')}" Folio="${esc(invoice.folio || '')}" Fecha="${invoice.date || today()}T12:00:00" Sello="${esc(invoice.sello || generateSello())}" FormaPago="${esc(invoice.formaPago || '03')}" NoCertificado="${esc(invoice.noCertificado || generateNoCertificado())}" Certificado="" SubTotal="${(invoice.subtotal || 0).toFixed(2)}" Descuento="${(invoice.discountTotal || 0).toFixed(2)}" Moneda="${esc(invoice.currency || 'MXN')}" Total="${(invoice.total || 0).toFixed(2)}" TipoDeComprobante="I" Exportacion="01" MetodoPago="${esc(invoice.metodoPago || 'PUE')}" LugarExpedicion="${esc(company.codigoPostal || '06600')}">
  <cfdi:Emisor Rfc="${esc(company.rfc || '')}" Nombre="${esc(company.name || '')}" RegimenFiscal="${esc(company.regimenFiscal || '601')}"/>
  <cfdi:Receptor Rfc="${esc(invoice.clientRfc || '')}" Nombre="${esc(invoice.clientName || '')}" DomicilioFiscalReceptor="${esc(invoice.clientCP || '00000')}" RegimenFiscalReceptor="${esc(invoice.clientRegimen || '616')}" UsoCFDI="${esc(invoice.usoCFDI || 'G03')}"/>
  <cfdi:Conceptos>${conceptos}
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="${(invoice.taxTotal || 0).toFixed(2)}">
    <cfdi:Traslados>
      <cfdi:Traslado Base="${(invoice.subtotal || 0).toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${(invoice.taxTotal || 0).toFixed(2)}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" xsi:schemaLocation="http://www.sat.gob.mx/TimbreFiscalDigital http://www.sat.gob.mx/sitio_internet/cfd/TimbreFiscalDigital/TimbreFiscalDigitalv11.xsd" Version="1.1" UUID="${esc(invoice.uuid || generateUUID())}" FechaTimbrado="${invoice.date || today()}T12:00:00" RfcProvCertif="SAT970701NN3" SelloCFD="${esc(invoice.sello || '')}" NoCertificadoSAT="00001000000504465028" SelloSAT="${esc(generateSello())}"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;
}

export function downloadFile(filename, content, type = 'text/xml') {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function exportCSV(headers, rows, filename) {
  const lines = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','))];
  downloadFile(filename, lines.join('\n'), 'text/csv;charset=utf-8;');
}

export function importCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const lines = e.target.result.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      const rows = lines.slice(1).map(line => {
        const vals = line.match(/(".*?"|[^,]+)(?=,|$)/g) || [];
        const obj = {};
        headers.forEach((h, i) => { obj[h] = (vals[i] || '').replace(/^"|"$/g, '').trim(); });
        return obj;
      });
      resolve(rows);
    };
    reader.onerror = reject;
    reader.readAsText(file, 'utf-8');
  });
}

export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  const icons = { success: 'check-circle', error: 'x-circle', warning: 'alert-triangle', info: 'info' };
  toast.innerHTML = `<i data-lucide="${icons[type] || 'info'}" class="toast__icon"></i><span>${message}</span>`;
  container.appendChild(toast);
  if (window.lucide) lucide.createIcons({ nodes: [toast] });
  requestAnimationFrame(() => toast.classList.add('toast--visible'));
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

export function confirmDialog(message) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay modal-overlay--active';
    overlay.innerHTML = `
      <div class="modal modal--sm">
        <div class="modal__body">
          <div class="confirm-icon"><i data-lucide="alert-triangle"></i></div>
          <p class="confirm-message">${message}</p>
        </div>
        <div class="modal__footer">
          <button class="btn btn--ghost" id="confirm-no">Cancelar</button>
          <button class="btn btn--danger" id="confirm-yes">Eliminar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    if (window.lucide) lucide.createIcons({ nodes: [overlay] });
    overlay.querySelector('#confirm-yes').onclick = () => { overlay.remove(); resolve(true); };
    overlay.querySelector('#confirm-no').onclick = () => { overlay.remove(); resolve(false); };
  });
}

export function buildSelectOptions(options, valueKey, labelKey, selectedValue = '') {
  return options.map(o => `<option value="${o[valueKey]}" ${o[valueKey] === selectedValue ? 'selected' : ''}>${o[valueKey]} – ${o[labelKey]}</option>`).join('');
}

export function debounce(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export { formatCurrency };
