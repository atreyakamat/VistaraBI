import xml2js from 'xml2js'
import fs from 'fs/promises'

export async function parseXML(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf-8')
    const parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true,
      explicitChildren: false,
      preserveChildrenOrder: true
    })

    const result = await parser.parseStringPromise(data)

    const odsResult = extractOdsRecords(result)
    if (odsResult) {
      return odsResult
    }

    const fallbackRecords = extractGenericRecords(result)
    const arrayRecords = Array.isArray(fallbackRecords) ? fallbackRecords : [fallbackRecords]

    return {
      records: arrayRecords,
      metadata: {
        rootKeys: Object.keys(result || {}),
        recordCount: arrayRecords.length
      }
    }
  } catch (error) {
    throw new Error(`Failed to parse XML file: ${error.message}`)
  }
}

function extractOdsRecords(parsed) {
  const document = parsed?.['office:document']
  const spreadsheet = document?.['office:body']?.['office:spreadsheet']
  if (!spreadsheet) {
    return null
  }

  const tables = arrayify(spreadsheet['table:table']).filter(Boolean)
  if (!tables.length) {
    return null
  }

  const allRecords = []
  const tableMetadata = []

  tables.forEach((table, index) => {
    const tableName = table['table:name'] || `table_${index + 1}`
    const rows = arrayify(table['table:table-row']).filter(Boolean)
    if (!rows.length) {
      return
    }

    const expandedRows = rows.map(expandRowCells).filter(cells => cells.length > 0)
    if (expandedRows.length <= 1) {
      return
    }

    const headerCandidates = expandedRows[0].map((value, idx) => {
      const header = typeof value === 'string' ? value.trim() : value
      if (header === null || header === undefined || header === '') {
        return `column_${idx + 1}`
      }
      return String(header)
    })

    const dedupedHeaders = dedupeHeaders(headerCandidates)

    expandedRows.slice(1).forEach((rowValues) => {
      const record = {}
      dedupedHeaders.forEach((header, idx) => {
        record[header] = idx < rowValues.length ? rowValues[idx] ?? null : null
      })

      if (rowValues.length > dedupedHeaders.length) {
        for (let extraIndex = dedupedHeaders.length; extraIndex < rowValues.length; extraIndex += 1) {
          record[`extra_${extraIndex + 1}`] = rowValues[extraIndex]
        }
      }

      allRecords.push(record)
    })

    tableMetadata.push({
      name: tableName,
      headerCount: dedupedHeaders.length,
      rowCount: Math.max(0, expandedRows.length - 1)
    })
  })

  if (!allRecords.length) {
    return null
  }

  return {
    records: allRecords,
    metadata: {
      format: 'ods-table',
      tableCount: tableMetadata.length,
      tables: tableMetadata
    }
  }
}

function expandRowCells(row) {
  const cells = arrayify(row?.['table:table-cell'])
  if (!cells.length) {
    return []
  }

  const expanded = []

  cells.forEach((cell) => {
    const repeat = parseRepeat(cell?.['table:number-columns-repeated'])
    const value = coerceCellValue(cell)

    for (let i = 0; i < repeat; i += 1) {
      expanded.push(value)
    }
  })

  return expanded
}

function coerceCellValue(cell) {
  if (!cell) {
    return null
  }

  const rawText = extractText(cell['text:p'])
  const type = cell['office:value-type']
  const rawValue = cell['office:value'] ?? rawText

  if (!type) {
    return normalizePrimitive(rawText)
  }

  switch (type) {
    case 'float':
    case 'percentage':
    case 'currency': {
      const num = Number(rawValue)
      return Number.isFinite(num) ? num : normalizePrimitive(rawText)
    }
    case 'boolean': {
      if (rawValue === 'true' || rawValue === '1') return true
      if (rawValue === 'false' || rawValue === '0') return false
      return normalizePrimitive(rawText)
    }
    case 'date':
    case 'time':
      return rawValue || normalizePrimitive(rawText)
    default:
      return normalizePrimitive(rawText ?? rawValue)
  }
}

function normalizePrimitive(value) {
  if (value === '') {
    return null
  }
  return value ?? null
}

function extractText(value) {
  if (value === null || value === undefined) {
    return null
  }

  if (Array.isArray(value)) {
    return value.map(extractText).filter(Boolean).join('\n') || null
  }

  if (typeof value === 'object') {
    if (Object.prototype.hasOwnProperty.call(value, '_')) {
      return extractText(value._)
    }

    const nested = Object.values(value)
      .map(extractText)
      .filter(Boolean)
      .join('')

    return nested || null
  }

  if (typeof value === 'string') {
    return value.trim()
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return null
}

function parseRepeat(rawRepeat) {
  const repeat = Number.parseInt(rawRepeat, 10)
  if (Number.isFinite(repeat) && repeat > 0) {
    return repeat
  }
  return 1
}

function arrayify(value) {
  if (!value) {
    return []
  }

  return Array.isArray(value) ? value : [value]
}

function dedupeHeaders(headers) {
  const seen = new Map()
  return headers.map((header) => {
    const normalized = header || 'column'
    const count = seen.get(normalized) || 0
    seen.set(normalized, count + 1)
    if (count === 0) {
      return normalized
    }
    return `${normalized}_${count + 1}`
  })
}

function extractGenericRecords(obj) {
  if (Array.isArray(obj)) {
    return obj
  }

  if (obj && typeof obj === 'object') {
    for (const value of Object.values(obj)) {
      if (Array.isArray(value)) {
        return value
      }
      if (value && typeof value === 'object') {
        const nested = extractGenericRecords(value)
        if (nested) return nested
      }
    }
  }

  return obj
}
