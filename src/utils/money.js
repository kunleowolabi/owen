// Tenant-aware money formatting.
// UI: proper symbol (₦50,000 / £50,000). PDF: ISO-code style,
// because jsPDF's built-in fonts cannot render ₦.

const LOCALES = { NGN: 'en-NG', GBP: 'en-GB', USD: 'en-US' }
const SYMBOLS = { NGN: '₦', GBP: '£', USD: '$' }

export function formatMoney(amount, currency = 'NGN') {
  const n = Number(amount ?? 0)
  try {
    return new Intl.NumberFormat(LOCALES[currency] ?? 'en', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n)
  } catch {
    return `${currency} ${n.toLocaleString()}`
  }
}

export function currencySymbol(currency = 'NGN') {
  return SYMBOLS[currency] ?? currency
}

export function pdfMoney(amount, currency = 'NGN') {
  return `${currency} ${Number(amount ?? 0).toLocaleString()}`
}
