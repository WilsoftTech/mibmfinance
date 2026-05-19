// ============================================================
// MIBAM Finance Management System - Export Utilities
// ============================================================

/**
 * Export data to CSV format and trigger download
 */
export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  headers?: { key: string; label: string }[]
) {
  if (!data.length) return

  const cols = headers || Object.keys(data[0]).map((key) => ({ key, label: key }))
  const headerRow = cols.map((c) => `"${c.label}"`).join(',')
  const rows = data.map((row) =>
    cols.map((c) => {
      const val = row[c.key]
      if (val === null || val === undefined) return '""'
      const str = String(val).replace(/"/g, '""')
      return `"${str}"`
    }).join(',')
  )

  const csv = [headerRow, ...rows].join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `${filename}.csv`)
}

/**
 * Export data to Excel (.xls) format and trigger download
 * Uses HTML table format which Excel can read natively
 *
 * Supports two signatures:
 * - exportToExcel(data, filename, options) - new format
 * - exportToExcel(data, filename, titleString) - legacy format
 */
export function exportToExcel(
  data: Record<string, unknown>[],
  filename: string,
  options?: {
    title?: string
    headers?: { key: string; label: string }[]
    summaryRows?: { label: string; value: string }[]
  } | string
) {
  if (!data.length) return

  // Support legacy string title as third arg
  const opts = typeof options === 'string'
    ? { title: options }
    : options || {}

  const cols = opts.headers || (data.length ? Object.keys(data[0]).map((key) => ({ key, label: key })) : [])
  const title = opts.title || 'MIBAM Report'

  let html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<style>
  .header { font-size: 16px; font-weight: bold; color: #047857; }
  .subheader { font-size: 12px; color: #6b7280; }
  .title-cell { background-color: #047857; color: white; font-weight: bold; padding: 8px; }
  .data-cell { padding: 6px; border: 1px solid #e5e7eb; }
  .summary-cell { font-weight: bold; background-color: #f0fdf4; padding: 6px; border: 1px solid #e5e7eb; }
  .amount-cell { text-align: right; padding: 6px; border: 1px solid #e5e7eb; }
</style>
</head>
<body>
<div class="header">${title}</div>
<div class="subheader">MIBAM Institute of Business and Management</div>
<div class="subheader">Generated: ${new Date().toLocaleString()}</div>
<br/>
`

  if (data.length) {
    html += '<table border="1" cellspacing="0" cellpadding="4">'
    html += '<tr>' + cols.map((c) => `<td class="title-cell">${c.label}</td>`).join('') + '</tr>'
    data.forEach((row) => {
      html += '<tr>' + cols.map((c) => {
        const val = row[c.key]
        if (val === null || val === undefined) return '<td class="data-cell"></td>'
        const isNumber = typeof val === 'number'
        return `<td class="${isNumber ? 'amount-cell' : 'data-cell'}">${val}</td>`
      }).join('') + '</tr>'
    })
    html += '</table>'
  }

  if (opts.summaryRows?.length) {
    html += '<br/><table border="1" cellspacing="0" cellpadding="4">'
    opts.summaryRows.forEach((row) => {
      html += `<tr><td class="summary-cell">${row.label}</td><td class="summary-cell" style="text-align:right">${row.value}</td></tr>`
    })
    html += '</table>'
  }

  html += '</body></html>'

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
  downloadBlob(blob, `${filename}.xls`)
}

/**
 * Generate an HTML table string for PDF export
 * Used by payments module for receipt-style PDFs
 */
export function generatePDFTable(
  data: Record<string, unknown>[],
  options?: {
    headers?: { key: string; label: string; align?: string }[]
    currencyColumns?: string[]
    dateColumns?: string[]
  }
): string {
  if (!data.length) return ''

  const cols: { key: string; label: string; align?: string }[] = options?.headers || Object.keys(data[0]).map((key) => ({ key, label: key }))
  const currencyCols = options?.currencyColumns || []
  const dateCols = options?.dateColumns || []

  const formatValue = (key: string, val: unknown): string => {
    if (val === null || val === undefined) return ''
    if (currencyCols.includes(key) && typeof val === 'number') {
      return `UGX ${val.toLocaleString('en-US')}`
    }
    if (dateCols.includes(key) && typeof val === 'string') {
      try {
        return new Date(val).toLocaleDateString('en-UG', { year: 'numeric', month: 'short', day: 'numeric' })
      } catch {
        return String(val)
      }
    }
    return String(val)
  }

  let html = '<table style="width:100%; border-collapse:collapse; font-size:12px; margin-bottom:20px;">'
  html += '<thead><tr>'
  cols.forEach((c) => {
    const align = c.align || 'left'
    html += `<th style="background:#047857; color:white; padding:10px 8px; text-align:${align}; font-weight:600; border:1px solid #047857;">${c.label}</th>`
  })
  html += '</tr></thead><tbody>'

  data.forEach((row, index) => {
    const bg = index % 2 === 0 ? '#ffffff' : '#f9fafb'
    html += `<tr style="background:${bg};">`
    cols.forEach((c) => {
      const align = c.align || 'left'
      const val = formatValue(c.key, row[c.key])
      html += `<td style="padding:8px; border-bottom:1px solid #e5e7eb; text-align:${align};">${val}</td>`
    })
    html += '</tr>'
  })

  html += '</tbody></table>'
  return html
}

/**
 * Export data to PDF format and trigger download
 * Uses a print-friendly HTML approach
 *
 * Supports two signatures:
 * - exportToPDF(data, filename, options) - new format with data array
 * - exportToPDF(title, htmlContent, filename) - legacy format for raw HTML
 */
export function exportToPDF(
  dataOrTitle: Record<string, unknown>[] | string,
  filenameOrHtml: string,
  optionsOrFilename?: {
    title?: string
    subtitle?: string
    headers?: { key: string; label: string }[]
    summaryRows?: { label: string; value: string }[]
  } | string
) {
  // Detect legacy signature: (title: string, htmlContent: string, filename: string)
  if (typeof dataOrTitle === 'string') {
    const title = dataOrTitle
    const htmlContent = filenameOrHtml
    const filename = typeof optionsOrFilename === 'string' ? optionsOrFilename : title

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; padding: 40px; max-width: 900px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #047857; padding-bottom: 20px; }
    .header h1 { color: #047857; font-size: 24px; margin-bottom: 4px; }
    .header h2 { color: #374151; font-size: 16px; font-weight: 500; margin-bottom: 2px; }
    .header .date { color: #9ca3af; font-size: 12px; margin-top: 8px; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 11px; }
    @page { size: A4; margin: 15mm; }
    @media print {
      body { padding: 0; background: #fff; }
      .no-print { display: none; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>MIBAM</h1>
    <h2>Institute of Business and Management</h2>
    <div class="date">Generated on ${new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
  </div>
  ${htmlContent}
  <div class="footer">
    This report was auto-generated by MIBAM Finance Management System &mdash; ${new Date().toLocaleDateString()}
  </div>
  <div class="no-print" style="text-align:center; margin-top:20px;">
    <button onclick="window.print()" style="padding:10px 24px; background:#047857; color:white; border:none; border-radius:8px; cursor:pointer; font-size:14px;">Print / Save as PDF</button>
  </div>
</body>
</html>`

    printWindow.document.write(html)
    printWindow.document.close()
    return
  }

  // New signature: (data, filename, options)
  const data = dataOrTitle
  const filename = filenameOrHtml
  const options = typeof optionsOrFilename === 'string' ? {} : (optionsOrFilename || {})

  const title = options.title || 'MIBAM Report'
  const subtitle = options.subtitle || ''

  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const cols = options.headers || (data.length ? Object.keys(data[0]).map((key) => ({ key, label: key })) : [])

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; padding: 40px; max-width: 900px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #047857; padding-bottom: 20px; }
    .header h1 { color: #047857; font-size: 24px; margin-bottom: 4px; }
    .header h2 { color: #374151; font-size: 16px; font-weight: 500; margin-bottom: 2px; }
    .header .subtitle { color: #6b7280; font-size: 13px; }
    .header .date { color: #9ca3af; font-size: 12px; margin-top: 8px; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 30px; }
    .summary-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; text-align: center; }
    .summary-card.expense { background: #fff1f2; border-color: #fecdd3; }
    .summary-card.balance { background: #f0fdfa; border-color: #99f6e4; }
    .summary-card .label { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
    .summary-card .value { font-size: 18px; font-weight: 700; color: #1f2937; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; table-layout: auto; }
    thead th { background: #047857; color: white; padding: 5px 6px; text-align: left; font-weight: 600; }
    thead th.amount { text-align: right; }
    tbody td { padding: 5px 6px; border-bottom: 1px solid #e5e7eb; }
    tbody td.amount { text-align: right; font-family: monospace; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody tr.total { background: #f0fdf4; font-weight: 700; }
    .section-title { font-size: 13px; font-weight: 600; color: #374151; margin: 20px 0 10px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 11px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 500; }
    .badge-pending { background: #fef3c7; color: #92400e; }
    .badge-approved { background: #d1fae5; color: #065f46; }
    .badge-rejected { background: #fee2e2; color: #991b1b; }
    @page { size: A4; margin: 15mm; }
    @media print {
      body { padding: 0; background: #fff; }
      .no-print { display: none; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>MIBAM</h1>
    <h2>Institute of Business and Management</h2>
    <div class="subtitle">${subtitle || title}</div>
    <div class="date">Generated on ${new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
  </div>
`

  // Summary cards
  if (options.summaryRows?.length) {
    html += '<div class="summary-grid">'
    options.summaryRows.forEach((row) => {
      html += `<div class="summary-card"><div class="label">${row.label}</div><div class="value">${row.value}</div></div>`
    })
    html += '</div>'
  }

  // Data table
  if (data.length) {
    html += '<table><thead><tr>'
    cols.forEach((c) => {
      const isAmount = c.key.toLowerCase().includes('amount') || c.key.toLowerCase().includes('total') || c.key.toLowerCase().includes('balance') || c.key.toLowerCase().includes('income') || c.key.toLowerCase().includes('expense')
      html += `<th class="${isAmount ? 'amount' : ''}">${c.label}</th>`
    })
    html += '</tr></thead><tbody>'
    data.forEach((row) => {
      html += '<tr>'
      cols.forEach((c) => {
        const val = row[c.key]
        const isAmount = c.key.toLowerCase().includes('amount') || c.key.toLowerCase().includes('total') || c.key.toLowerCase().includes('balance') || c.key.toLowerCase().includes('income') || c.key.toLowerCase().includes('expense')
        if (val === null || val === undefined) {
          html += '<td></td>'
        } else if (c.key === 'status') {
          html += `<td><span class="badge badge-${val}">${String(val).charAt(0).toUpperCase() + String(val).slice(1)}</span></td>`
        } else {
          html += `<td class="${isAmount ? 'amount' : ''}">${val}</td>`
        }
      })
      html += '</tr>'
    })
    html += '</tbody></table>'
  }

  html += `
  <div class="footer">
    This report was auto-generated by MIBAM Finance Management System &mdash; ${new Date().toLocaleDateString()}
  </div>
  <div class="no-print" style="text-align:center; margin-top:20px;">
    <button onclick="window.print()" style="padding:10px 24px; background:#047857; color:white; border:none; border-radius:8px; cursor:pointer; font-size:14px;">Print / Save as PDF</button>
  </div>
</body>
</html>`

  printWindow.document.write(html)
  printWindow.document.close()
}

// ============================================================
// Helper
// ============================================================

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
