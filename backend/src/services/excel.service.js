import { prisma } from '../server.js'

/**
 * Fetch paginated rows for an upload from the shared data_rows table.
 */
export async function getExtractedData(uploadId, page = 1, limit = 100) {
  const safePage = Number.isFinite(page) && page > 0 ? page : 1
  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 100
  const skip = (safePage - 1) * safeLimit

  const [rows, totalCount, upload] = await Promise.all([
    prisma.dataRow.findMany({
      where: { uploadId },
      skip,
      take: safeLimit,
      orderBy: { rowNumber: 'asc' }
    }),
    prisma.dataRow.count({ where: { uploadId } }),
    prisma.upload.findUnique({ where: { id: uploadId } })
  ])

  if (!upload) {
    return {
      upload: null,
      data: [],
      pagination: {
        page: safePage,
        limit: safeLimit,
        totalRows: 0,
        totalPages: 0,
        hasMore: false
      }
    }
  }

  return {
    upload: {
      id: upload.id,
      originalName: upload.originalName,
      status: upload.status,
      totalRecords: upload.totalRecords,
      recordsProcessed: upload.recordsProcessed,
      metadata: upload.metadata,
      headers: upload.metadata?.columns || upload.metadata?.headers || []
    },
    data: rows.map(row => ({
      rowNumber: row.rowNumber,
      ...row.data
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      totalRows: totalCount,
      totalPages: safeLimit ? Math.ceil(totalCount / safeLimit) : 0,
      hasMore: skip + rows.length < totalCount
    }
  }
}
