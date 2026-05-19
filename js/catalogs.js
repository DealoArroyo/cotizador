// SAT CFDI 4.0 Catalogs

export const REGIMENES_FISCALES = [
  { clave: '601', descripcion: 'General de Ley Personas Morales' },
  { clave: '603', descripcion: 'Personas Morales con Fines no Lucrativos' },
  { clave: '605', descripcion: 'Sueldos y Salarios e Ingresos Asimilados a Salarios' },
  { clave: '606', descripcion: 'Arrendamiento' },
  { clave: '607', descripcion: 'Régimen de Enajenación o Adquisición de Bienes' },
  { clave: '608', descripcion: 'Demás ingresos' },
  { clave: '610', descripcion: 'Residentes en el Extranjero sin Establecimiento Permanente en México' },
  { clave: '611', descripcion: 'Ingresos por Dividendos (socios y accionistas)' },
  { clave: '612', descripcion: 'Personas Físicas con Actividades Empresariales y Profesionales' },
  { clave: '614', descripcion: 'Ingresos por intereses' },
  { clave: '615', descripcion: 'Régimen de los ingresos por obtención de premios' },
  { clave: '616', descripcion: 'Sin obligaciones fiscales' },
  { clave: '620', descripcion: 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos' },
  { clave: '621', descripcion: 'Incorporación Fiscal' },
  { clave: '622', descripcion: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras' },
  { clave: '623', descripcion: 'Opcional para Grupos de Sociedades' },
  { clave: '624', descripcion: 'Coordinados' },
  { clave: '625', descripcion: 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas' },
  { clave: '626', descripcion: 'Régimen Simplificado de Confianza – RESICO' },
];

export const USOS_CFDI = [
  { clave: 'G01', descripcion: 'Adquisición de mercancias' },
  { clave: 'G02', descripcion: 'Devoluciones, descuentos o bonificaciones' },
  { clave: 'G03', descripcion: 'Gastos en general' },
  { clave: 'I01', descripcion: 'Construcciones' },
  { clave: 'I02', descripcion: 'Mobiliario y equipo de oficina por inversiones' },
  { clave: 'I03', descripcion: 'Equipo de transporte' },
  { clave: 'I04', descripcion: 'Equipo de computo y accesorios' },
  { clave: 'I05', descripcion: 'Dados, troqueles, moldes, matrices y herramental' },
  { clave: 'I06', descripcion: 'Comunicaciones telefónicas' },
  { clave: 'I07', descripcion: 'Comunicaciones satelitales' },
  { clave: 'I08', descripcion: 'Otra maquinaria y equipo' },
  { clave: 'D01', descripcion: 'Honorarios médicos, dentales y gastos hospitalarios' },
  { clave: 'D02', descripcion: 'Gastos médicos por incapacidad o discapacidad' },
  { clave: 'D03', descripcion: 'Gastos funerales' },
  { clave: 'D04', descripcion: 'Donativos' },
  { clave: 'D05', descripcion: 'Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación)' },
  { clave: 'D06', descripcion: 'Aportaciones voluntarias al SAR' },
  { clave: 'D07', descripcion: 'Primas por seguros de gastos médicos' },
  { clave: 'D08', descripcion: 'Gastos de transportación escolar obligatoria' },
  { clave: 'D09', descripcion: 'Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones' },
  { clave: 'D10', descripcion: 'Pagos por servicios educativos (colegiaturas)' },
  { clave: 'S01', descripcion: 'Sin efectos fiscales' },
  { clave: 'CP01', descripcion: 'Pagos' },
  { clave: 'CN01', descripcion: 'Nómina' },
];

export const METODOS_PAGO = [
  { clave: 'PUE', descripcion: 'PUE – Pago en una sola exhibición' },
  { clave: 'PPD', descripcion: 'PPD – Pago en parcialidades o diferido' },
];

export const FORMAS_PAGO = [
  { clave: '01', descripcion: 'Efectivo' },
  { clave: '02', descripcion: 'Cheque nominativo' },
  { clave: '03', descripcion: 'Transferencia electrónica de fondos' },
  { clave: '04', descripcion: 'Tarjeta de crédito' },
  { clave: '05', descripcion: 'Monedero electrónico' },
  { clave: '06', descripcion: 'Dinero electrónico' },
  { clave: '08', descripcion: 'Vales de despensa' },
  { clave: '12', descripcion: 'Dación en pago' },
  { clave: '13', descripcion: 'Pago por subrogación' },
  { clave: '14', descripcion: 'Pago por consignación' },
  { clave: '15', descripcion: 'Condonación' },
  { clave: '17', descripcion: 'Compensación' },
  { clave: '23', descripcion: 'Novación' },
  { clave: '24', descripcion: 'Confusión' },
  { clave: '25', descripcion: 'Remisión de deuda' },
  { clave: '26', descripcion: 'Prescripción o caducidad' },
  { clave: '27', descripcion: 'A satisfacción del acreedor' },
  { clave: '28', descripcion: 'Tarjeta de débito' },
  { clave: '29', descripcion: 'Tarjeta de servicios' },
  { clave: '30', descripcion: 'Aplicación de anticipos' },
  { clave: '31', descripcion: 'Intermediario pagos' },
  { clave: '99', descripcion: 'Por definir' },
];

export const CLAVES_PROD_SERV = [
  { clave: '81111501', descripcion: 'Servicios de programación de sistemas informáticos' },
  { clave: '81111502', descripcion: 'Servicios de análisis de sistemas informáticos' },
  { clave: '81111503', descripcion: 'Servicios de diseño de sistemas informáticos' },
  { clave: '81111504', descripcion: 'Servicios de integración de sistemas' },
  { clave: '81111600', descripcion: 'Servicios de gestión de sistemas de información' },
  { clave: '81111605', descripcion: 'Consultoría en tecnologías de la información' },
  { clave: '81111810', descripcion: 'Soporte técnico de sistemas informáticos' },
  { clave: '81162200', descripcion: 'Servicios de software como servicio (SaaS)' },
  { clave: '73160000', descripcion: 'Servicios de diseño gráfico' },
  { clave: '73151500', descripcion: 'Servicios de publicidad' },
  { clave: '80101500', descripcion: 'Servicios de gestión de proyectos' },
  { clave: '80141600', descripcion: 'Servicios de consultoría empresarial' },
  { clave: '80141601', descripcion: 'Servicios de asesoría empresarial' },
  { clave: '85101700', descripcion: 'Servicios de capacitación y formación' },
  { clave: '43230000', descripcion: 'Software' },
  { clave: '43231500', descripcion: 'Software de aplicación empresarial' },
  { clave: '43231513', descripcion: 'Software de gestión de relaciones con clientes' },
  { clave: '84121800', descripcion: 'Servicios contables' },
  { clave: '84121802', descripcion: 'Servicios de auditoría' },
  { clave: '84101500', descripcion: 'Servicios legales' },
  { clave: '72154300', descripcion: 'Servicios de alojamiento web' },
];

export const CLAVES_UNIDAD = [
  { clave: 'E48', descripcion: 'Servicio / Unidad de servicio' },
  { clave: 'H87', descripcion: 'Pieza' },
  { clave: 'ACT', descripcion: 'Actividad' },
  { clave: 'MO', descripcion: 'Mes' },
  { clave: 'AN', descripcion: 'Año' },
  { clave: 'DIA', descripcion: 'Día' },
  { clave: 'HUR', descripcion: 'Hora' },
  { clave: 'KT', descripcion: 'Kit' },
  { clave: 'LT', descripcion: 'Litro' },
  { clave: 'KGM', descripcion: 'Kilogramo' },
  { clave: 'MTR', descripcion: 'Metro' },
  { clave: 'XBX', descripcion: 'Caja' },
  { clave: 'SET', descripcion: 'Conjunto' },
  { clave: 'LIC', descripcion: 'Licencia' },
  { clave: 'PRY', descripcion: 'Proyecto' },
];

export const CURRENCIES = [
  { code: 'MXN', symbol: '$', name: 'Peso mexicano' },
  { code: 'USD', symbol: '$', name: 'Dólar americano' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
];

export function formatCurrency(amount, currency = 'MXN') {
  const c = CURRENCIES.find(x => x.code === currency) || CURRENCIES[0];
  return `${c.symbol}${Number(amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function numberToWords(num) {
  // Spanish number to words (simplified for amounts)
  const ones = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
    'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const tens = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const hundreds = ['', 'CIEN', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  if (num === 0) return 'CERO';
  if (num < 0) return 'MENOS ' + numberToWords(-num);

  let result = '';
  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);

  const toWords = (n) => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' Y ' + ones[n % 10] : '');
    if (n < 1000) {
      const h = Math.floor(n / 100);
      const r = n % 100;
      const hWord = h === 1 && r > 0 ? 'CIENTO' : hundreds[h];
      return hWord + (r ? ' ' + toWords(r) : '');
    }
    if (n < 1000000) {
      const t = Math.floor(n / 1000);
      const r = n % 1000;
      const tWord = t === 1 ? 'MIL' : toWords(t) + ' MIL';
      return tWord + (r ? ' ' + toWords(r) : '');
    }
    const m = Math.floor(n / 1000000);
    const r = n % 1000000;
    const mWord = m === 1 ? 'UN MILLÓN' : toWords(m) + ' MILLONES';
    return mWord + (r ? ' ' + toWords(r) : '');
  };

  result = toWords(intPart);
  return `${result} ${String(decPart).padStart(2, '0')}/100 M.N.`;
}
