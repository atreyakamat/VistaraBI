import path from 'path'
import { parseCSV, inferSchemaFromCSV } from './parsers/csvParser.js'
import { parseExcel, inferSchemaFromExcel } from './parsers/excelParser.js'
import { parseJSON, inferSchemaFromJSON } from './parsers/jsonParser.js'
import { parseXML, inferSchemaFromXML } from './parsers/xmlParser.js'
import { createDynamicTable, insertRecords } from './dbOperations.js'
import { prisma } from '../server.js'

export async function processFile(uploadId, filePath, fileName, fileType) {
  try {
    console.log(`Processing file: ${fileName} (${fileType})`)

    // Update status to processing
    await prisma.upload.update({
      where: { id: uploadId },
      data: { status: 'processing' }
    })

    // Parse file based on type
    const ext = path.extname(fileName).toLowerCase()
    let records = []
    let schema = {}

    if (ext === '.csv' || fileType === 'text/csv') {
      records = await parseCSV(filePath)
      schema = inferSchemaFromCSV(records)
    } else if (ext === '.xlsx' || ext === '.xls' || fileType.includes('spreadsheet')) {
      records = await parseExcel(filePath)
      schema = inferSchemaFromExcel(records)
    } else if (ext === '.json' || fileType === 'application/json') {
      records = await parseJSON(filePath)
      schema = inferSchemaFromJSON(records)
    } else if (ext === '.xml' || fileType.includes('xml')) {
      records = await parseXML(filePath)
      schema = inferSchemaFromXML(records)
    } else {
      throw new Error(`Unsupported file type: ${ext}`)
    }

    console.log(`Parsed ${records.length} records from ${fileName}`)
    console.log('Inferred schema:', schema)

    // Create dynamic table name
    const tableName = `upload_${uploadId.replace(/-/g, '_')}`

    // Create table and insert records
    await createDynamicTable(tableName, schema)
    
    // Insert in batches
    const batchSize = 1000
    let processedCount = 0

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      await insertRecords(tableName, batch, schema)
      processedCount += batch.length

      // Update progress
      await prisma.upload.update({
        where: { id: uploadId },
        data: { 
          recordsProcessed: processedCount,
          totalRecords: records.length
        }
      })

      console.log(`Processed ${processedCount}/${records.length} records`)
    }

    // Mark as completed
    await prisma.upload.update({
      where: { id: uploadId },
      data: { 
        status: 'completed',
        tableName: tableName,
        recordsProcessed: records.length,
        totalRecords: records.length,
        completedAt: new Date(),
        metadata: {
          schema: schema,
          columns: Object.keys(schema),
          rowCount: records.length
        }
      }
    })

    console.log(`Successfully processed file: ${fileName}`)
    return { success: true, recordCount: records.length, tableName }

  } catch (error) {
    console.error(`Error processing file ${fileName}:`, error)

    // Mark as failed
    await prisma.upload.update({
      where: { id: uploadId },
      data: { 
        status: 'failed',
        errorMessage: error.message
      }
    })

    throw error
  }
}
