import path from 'path'
import fs from 'fs/promises'
import { parseCSV } from './parsers/csvParser.js'
import { parseExcel } from './parsers/excelParser.js'
import { parseJSON } from './parsers/jsonParser.js'
import { parseXML } from './parsers/xmlParser.js'
import { parsePDF } from './parsers/pdfParser.js'
import { parseDocx } from './parsers/docxParser.js'
import { parseText } from './parsers/textParser.js'
import { prisma } from '../server.js'

const DEFAULT_CHUNK_SIZE = 1000

export const SUPPORTED_FILE_KINDS = {
  csv: {
    extensions: ['.csv'],
    mimeTypes: ['text/csv']
  },
  tsv: {
    extensions: ['.tsv'],
    mimeTypes: ['text/tab-separated-values']
  },
  excel: {
    extensions: ['.xlsx', '.xls'],
    mimeTypes: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel.sheet.macroenabled.12']
  },
  json: {
    extensions: ['.json'],
    mimeTypes: ['application/json']
  },
  xml: {
    extensions: ['.xml'],
    mimeTypes: ['application/xml', 'text/xml']
  },
  pdf: {
    extensions: ['.pdf'],
    mimeTypes: ['application/pdf']
  },
  docx: {
    extensions: ['.docx', '.doc'],
    mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
  },
  text: {
    extensions: ['.txt', '.md', '.log'],
    mimeTypes: ['text/plain', 'text/markdown']
  }
}

export function resolveFileKind(originalName = '', mimeType = '') {
  const ext = path.extname(originalName).toLowerCase()
  const normalizedMime = (mimeType || '').toLowerCase()

  for (const [kind, { extensions = [], mimeTypes = [] }] of Object.entries(SUPPORTED_FILE_KINDS)) {
    if (extensions.includes(ext)) {
      return kind
    }
    if (normalizedMime && mimeTypes.some(type => normalizedMime.includes(type))) {
      return kind
    }
  }

  return null
}

export async function processFile(uploadId, filePath, originalName, mimeType, options = {}) {
  const fallbackName = path.basename(filePath)
  const nameForDetection = originalName || fallbackName
  const fileKind = resolveFileKind(nameForDetection, mimeType) || resolveFileKind(fallbackName, mimeType)

  if (!fileKind) {
    await prisma.upload.update({
      where: { id: uploadId },
      data: {
        status: 'failed',
        errorMessage: `Unsupported file type for ${nameForDetection}`
      }
    })

    throw new Error(`Unsupported file type for ${nameForDetection}`)
  }

  try {
    console.log(`Processing file: ${nameForDetection} as ${fileKind}`)

    await prisma.upload.update({
      where: { id: uploadId },
      data: {
        status: 'processing',
        recordsProcessed: 0,
        totalRecords: 0,
        tableName: null,
        metadata: {
          parser: fileKind,
          originalName: nameForDetection,
          mimeType
        }
      }
    })

    const detectedExtension = path.extname(nameForDetection).toLowerCase()
    const { records, metadata: parserMetadata = {} } = await parseByKind(fileKind, filePath, detectedExtension)
    const flattenedRecords = records.map(record => flattenRecord(record))
    const columns = deriveColumns(flattenedRecords)
    const columnTypes = inferColumnTypes(flattenedRecords, columns)
    const sampleRows = flattenedRecords.slice(0, Math.min(5, flattenedRecords.length))

    const totalRecords = flattenedRecords.length

    await prisma.upload.update({
      where: { id: uploadId },
      data: {
        totalRecords,
        metadata: {
          parser: fileKind,
          originalName: nameForDetection,
          mimeType,
          ...parserMetadata,
          columns,
          columnTypes,
          sampleRows
        }
      }
    })

    // Clear any previously stored rows for this upload (safety for reprocessing)
    await prisma.dataRow.deleteMany({ where: { uploadId } })

    if (totalRecords === 0) {
      await prisma.upload.update({
        where: { id: uploadId },
        data: {
          status: 'completed',
          recordsProcessed: 0,
          completedAt: new Date()
        }
      })

      console.log(`No records found in file ${nameForDetection}`)
      return { success: true, recordCount: 0, columns }
    }

    const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE
    let processedCount = 0

    for (let i = 0; i < flattenedRecords.length; i += chunkSize) {
      const chunk = flattenedRecords
        .slice(i, i + chunkSize)
        .map((data, index) => ({
          uploadId,
          rowNumber: i + index + 1,
          data
        }))

      await prisma.dataRow.createMany({ data: chunk })

      processedCount += chunk.length

      await prisma.upload.update({
        where: { id: uploadId },
        data: {
          recordsProcessed: processedCount
        }
      })

      console.log(`Processed ${processedCount}/${totalRecords} records for upload ${uploadId}`)
    }

    await prisma.upload.update({
      where: { id: uploadId },
      data: {
        status: 'completed',
        recordsProcessed: totalRecords,
        completedAt: new Date()
      }
    })

    console.log(`Successfully processed file: ${nameForDetection}`)
    return { success: true, recordCount: totalRecords, columns }

  } catch (error) {
    console.error(`Error processing file ${nameForDetection}:`, error)

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

async function parseByKind(kind, filePath, extension = '') {
  switch (kind) {
    case 'csv':
      return parseCSV(filePath, { delimiter: extension === '.tsv' ? '\t' : undefined })
    case 'tsv':
      return parseCSV(filePath, { delimiter: '\t' })
    case 'excel':
      return parseExcel(filePath)
    case 'json':
      return parseJSON(filePath)
    case 'xml':
      return parseXML(filePath)
    case 'pdf':
      return parsePDF(filePath)
    case 'docx':
      return parseDocx(filePath)
    case 'text':
      return parseText(filePath)
    default:
      throw new Error(`No parser implemented for file kind: ${kind}`)
  }
}

function flattenRecord(record, prefix = '') {
  if (record === null || record === undefined) {
    return {}
  }

  if (typeof record !== 'object' || record instanceof Date || record instanceof Buffer) {
    const key = prefix || 'value'
    return { [key]: normalizeValue(record) }
  }

  const flattened = {}

  for (const [key, value] of Object.entries(record)) {
    const nextKey = prefix ? `${prefix}_${key}` : key

    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && !(value instanceof Buffer)) {
      Object.assign(flattened, flattenRecord(value, nextKey))
    } else {
      flattened[nextKey] = normalizeValue(value)
    }
  }

  return flattened
}

function deriveColumns(records) {
  const columnSet = new Set()

  records.forEach(record => {
    Object.keys(record).forEach(key => columnSet.add(key))
  })

  return Array.from(columnSet)
}

function inferColumnTypes(records, columns) {
  const columnTypes = {}

  columns.forEach(column => {
    const sampleValue = records.find(record => record[column] !== null && record[column] !== undefined)?.[column]
    columnTypes[column] = describeValueType(sampleValue)
  })

  return columnTypes
}

function describeValueType(value) {
  if (value === null || value === undefined) {
    return 'unknown'
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer' : 'number'
  }

  if (typeof value === 'boolean') {
    return 'boolean'
  }

  if (value instanceof Date) {
    return 'date'
  }

  if (Array.isArray(value)) {
    return 'array'
  }

  if (typeof value === 'object') {
    return 'object'
  }

  return 'string'
}

function normalizeValue(value) {
  if (value === undefined || value === null) {
    return null
  }

  if (typeof value === 'number' && !Number.isFinite(value)) {
    return null
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (value instanceof Buffer) {
    return value.toString('base64')
  }

  if (typeof value === 'string') {
    return value
  }

  return value
}

// Utility primarily for tests/debugging to inspect the raw file content when unsupported
export async function peekFileHead(filePath, bytes = 512) {
  const handle = await fs.open(filePath, 'r')
  try {
    const { buffer } = await handle.read(Buffer.alloc(bytes), 0, bytes, 0)
    return buffer.toString('utf-8')
  } finally {
    await handle.close()
  }
}
