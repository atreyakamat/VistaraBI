import fs from 'fs'
import { parse } from 'csv-parse'

export async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const records = []
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      cast: true,
      cast_date: false
    })

    fs.createReadStream(filePath)
      .pipe(parser)
      .on('data', (record) => {
        records.push(record)
      })
      .on('end', () => {
        resolve(records)
      })
      .on('error', (error) => {
        reject(error)
      })
  })
}

export function inferSchemaFromCSV(records) {
  if (records.length === 0) {
    return {}
  }

  const schema = {}
  const firstRecord = records[0]

  for (const [key, value] of Object.entries(firstRecord)) {
    if (value === null || value === undefined || value === '') {
      schema[key] = 'TEXT'
    } else if (!isNaN(value) && !isNaN(parseFloat(value))) {
      // Check if it's an integer or float
      if (Number.isInteger(Number(value))) {
        schema[key] = 'INTEGER'
      } else {
        schema[key] = 'DOUBLE PRECISION'
      }
    } else if (typeof value === 'boolean') {
      schema[key] = 'BOOLEAN'
    } else if (Date.parse(value) && /\d{4}-\d{2}-\d{2}/.test(value)) {
      schema[key] = 'TIMESTAMP'
    } else {
      schema[key] = 'TEXT'
    }
  }

  return schema
}
