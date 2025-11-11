import fs from 'fs'
import { parse } from 'csv-parse'

export async function parseCSV(filePath, { delimiter } = {}) {
  return new Promise((resolve, reject) => {
    const records = []
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      cast: true,
      cast_date: false,
      delimiter
    })

    fs.createReadStream(filePath)
      .pipe(parser)
      .on('data', (record) => {
        records.push(record)
      })
      .on('end', () => {
        resolve({
          records,
          metadata: {
            columns: records.length ? Object.keys(records[0]) : [],
            delimiter: delimiter || ','
          }
        })
      })
      .on('error', (error) => {
        reject(error)
      })
  })
}
