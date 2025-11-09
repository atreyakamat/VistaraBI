import { prisma } from '../server.js'

export async function createDynamicTable(tableName, schema) {
  try {
    // Sanitize table name
    const sanitizedTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '_')

    // Build CREATE TABLE query
    const columns = Object.entries(schema)
      .map(([columnName, dataType]) => {
        const sanitizedColumnName = columnName.replace(/[^a-zA-Z0-9_]/g, '_')
        return `"${sanitizedColumnName}" ${dataType}`
      })
      .join(', ')

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS "${sanitizedTableName}" (
        id SERIAL PRIMARY KEY,
        ${columns},
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    await prisma.$executeRawUnsafe(createTableQuery)
    console.log(`Created table: ${sanitizedTableName}`)
    
    return sanitizedTableName
  } catch (error) {
    console.error('Error creating table:', error)
    throw new Error(`Failed to create table: ${error.message}`)
  }
}

export async function insertRecords(tableName, records, schema) {
  try {
    if (records.length === 0) {
      return
    }

    const sanitizedTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '_')
    const columnNames = Object.keys(schema).map(col => col.replace(/[^a-zA-Z0-9_]/g, '_'))

    // Build INSERT query
    const placeholders = records.map((_, idx) => {
      const rowPlaceholders = columnNames.map((_, colIdx) => {
        return `$${idx * columnNames.length + colIdx + 1}`
      }).join(', ')
      return `(${rowPlaceholders})`
    }).join(', ')

    const insertQuery = `
      INSERT INTO "${sanitizedTableName}" (${columnNames.map(col => `"${col}"`).join(', ')})
      VALUES ${placeholders}
    `

    // Flatten values
    const values = records.flatMap(record => {
      return columnNames.map(col => {
        const originalCol = Object.keys(schema).find(
          key => key.replace(/[^a-zA-Z0-9_]/g, '_') === col
        )
        const value = record[originalCol]
        
        // Handle null values and type conversion
        if (value === null || value === undefined || value === '') {
          return null
        }
        
        // Handle JSON/JSONB types
        if (schema[originalCol] === 'JSONB' && typeof value === 'object') {
          return JSON.stringify(value)
        }
        
        return value
      })
    })

    await prisma.$executeRawUnsafe(insertQuery, ...values)
    console.log(`Inserted ${records.length} records into ${sanitizedTableName}`)
    
  } catch (error) {
    console.error('Error inserting records:', error)
    throw new Error(`Failed to insert records: ${error.message}`)
  }
}

export async function queryTable(tableName, limit = 100) {
  try {
    const sanitizedTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '_')
    const query = `SELECT * FROM "${sanitizedTableName}" LIMIT $1`
    const result = await prisma.$queryRawUnsafe(query, limit)
    return result
  } catch (error) {
    console.error('Error querying table:', error)
    throw new Error(`Failed to query table: ${error.message}`)
  }
}
