import xlsx from 'xlsx'

export async function parseExcel(filePath) {
  try {
    const workbook = xlsx.readFile(filePath)
    const sheetName = workbook.SheetNames[0] // Use first sheet
    const worksheet = workbook.Sheets[sheetName]

    const records = xlsx.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: null
    })

    return {
      records,
      metadata: {
        columns: records.length ? Object.keys(records[0]) : [],
        sheetName,
        sheetNames: workbook.SheetNames,
        sheetCount: workbook.SheetNames.length
      }
    }
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error.message}`)
  }
}
