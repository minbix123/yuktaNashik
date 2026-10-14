import { PrismaClient } from '@prisma/client'
import { createClient, type Client, type InValue } from '@libsql/client'

function normalizeArgs(args: unknown[] = []): InValue[] {
  return args.map((a) => {
    if (a instanceof Date) return a.toISOString()
    if (typeof a === 'boolean') return a ? 1 : 0
    if (a === undefined) return null
    if (typeof a === 'bigint') return Number(a)
    return a as InValue
  })
}

function wrapAdapterError(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err)
  if (message.includes('UNIQUE constraint failed')) {
    const fields =
      message
        .split('UNIQUE constraint failed:')[1]
        ?.trim()
        .split(',')
        .map((s) => s.trim().split('.').pop() || '')
        .filter(Boolean) || []
    const adapterErr = new Error(message) as Error & { cause?: unknown }
    adapterErr.name = 'DriverAdapterError'
    adapterErr.cause = {
      kind: 'UniqueConstraintViolation',
      constraint: { fields },
    }
    throw adapterErr
  }
  if (message.includes('FOREIGN KEY constraint failed')) {
    const adapterErr = new Error(message) as Error & { cause?: unknown }
    adapterErr.name = 'DriverAdapterError'
    adapterErr.cause = {
      kind: 'ForeignKeyConstraintViolation',
      constraint: { foreignKey: {} },
    }
    throw adapterErr
  }
  if (message.includes('NOT NULL constraint failed')) {
    const fields =
      message
        .split('NOT NULL constraint failed:')[1]
        ?.trim()
        .split(',')
        .map((s) => s.trim().split('.').pop() || '')
        .filter(Boolean) || []
    const adapterErr = new Error(message) as Error & { cause?: unknown }
    adapterErr.name = 'DriverAdapterError'
    adapterErr.cause = {
      kind: 'NullConstraintViolation',
      constraint: { fields },
    }
    throw adapterErr
  }
  throw err
}

function createQueryable(executor: {
  execute: (stmt: { sql: string; args: InValue[] }) => Promise<{
    columns: string[]
    rows: Array<Record<number, unknown>>
    rowsAffected: number
    lastInsertRowid?: bigint | number
  }>
}) {
  return {
    provider: 'sqlite' as const,
    adapterName: '@prisma/adapter-libsql',
    async queryRaw({ sql, args }: { sql: string; args: unknown[] }) {
      try {
        const r = await executor.execute({ sql, args: normalizeArgs(args) })
        return {
          columnNames: r.columns,
          columnTypes: r.columns.map(() => 7),
          rows: r.rows.map((row) => r.columns.map((_, i) => row[i])),
          lastInsertId:
            r.lastInsertRowid !== undefined ? String(r.lastInsertRowid) : undefined,
        }
      } catch (err) {
        wrapAdapterError(err)
      }
    },
    async executeRaw({ sql, args }: { sql: string; args: unknown[] }) {
      try {
        const r = await executor.execute({ sql, args: normalizeArgs(args) })
        return r.rowsAffected ?? 0
      } catch (err) {
        wrapAdapterError(err)
      }
    },
  }
}

export function createLibsqlAdapter(url?: string) {
  const dbUrl = url || process.env.DATABASE_URL || 'file:./dev.db'
  let clientInstance: Client | null = null

  const getClient = () => {
    if (!clientInstance) {
      clientInstance = createClient({ url: dbUrl })
    }
    return clientInstance
  }

  return {
    provider: 'sqlite' as const,
    adapterName: '@prisma/adapter-libsql',
    async connect() {
      const client = getClient()
      try {
        await client.executeMultiple(
          'PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON;'
        )
      } catch {
        // Ignore pragma errors gracefully
      }

      const queryable = createQueryable(client as never)

      return {
        ...queryable,
        getConnectionInfo() {
          return {
            maxBindValues: 32766,
            supportsRelationJoins: false,
          }
        },
        async executeScript(script: string) {
          try {
            await client.executeMultiple(script)
          } catch (err) {
            wrapAdapterError(err)
          }
        },
        async startTransaction() {
          const tx = await client.transaction('write')
          const txQueryable = createQueryable(tx as never)
          return {
            ...txQueryable,
            options: {
              usePhantomQuery: true,
            },
            async commit() {
              try {
                await tx.commit()
              } finally {
                tx.close()
              }
            },
            async rollback() {
              try {
                await tx.rollback()
              } finally {
                tx.close()
              }
            },
            async createSavepoint(name: string) {
              await tx.execute(`SAVEPOINT ${name}`)
            },
            async rollbackToSavepoint(name: string) {
              await tx.execute(`ROLLBACK TO ${name}`)
            },
            async releaseSavepoint(name: string) {
              await tx.execute(`RELEASE SAVEPOINT ${name}`)
            },
          }
        },
        async dispose() {
          if (clientInstance) {
            clientInstance.close()
            clientInstance = null
          }
        },
      }
    },
  }
}

export function serializePrisma<T>(data: T): T {
  if (data === null || data === undefined) {
    return data
  }
  if (data instanceof Date) {
    return data.toISOString() as unknown as T
  }
  if (typeof data === 'bigint') {
    return Number(data) as unknown as T
  }
  if (Array.isArray(data)) {
    return data.map((item) => serializePrisma(item)) as unknown as T
  }
  if (typeof data === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (key === 'passwordHash') continue
      result[key] = serializePrisma(value)
    }
    return result as T
  }
  return data
}

declare global {
  var prisma: PrismaClient | undefined
}

const adapter = createLibsqlAdapter()

const prisma: PrismaClient =
  global.prisma || new PrismaClient({ adapter: adapter as never })

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

export default prisma