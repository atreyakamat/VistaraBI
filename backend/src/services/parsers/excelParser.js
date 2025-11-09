import xlsx from 'xlsx'

export async function parseExcel(filePath) {
  try {
    const workbook = xlsx.readFile(filePath)
    const sheetName = workbook.SheetNames[0] // Use first sheet
    const worksheet = workbook.Sheets[sheetName]
    
    // Convert to JSON
    const records = xlsx.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: null
    })

    return records
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error.message}`)
  }
}

export function inferSchemaFromExcel(records) {
  if (records.length === 0) {
    return {}
  }

  const schema = {}
  const firstRecord = records[0]

  for (const [key, value] of Object.entries(firstRecord)) {
    if (value === null || value === undefined || value === '') {
      schema[key] = 'TEXT'
    } else if (!isNaN(value) && !isNaN(parseFloat(value))) {
      if (Number.isInteger(Number(value))) {
        schema[key] = 'INTEGER'
      } else {
        schema[key] = 'DOUBLE PRECISION'
      }
    } else if (typeof value === 'boolean') {
      schema[key] = 'BOOLEAN'
    } else {
      schema[key] = 'TEXT'
    }
  }

  return schema
}
