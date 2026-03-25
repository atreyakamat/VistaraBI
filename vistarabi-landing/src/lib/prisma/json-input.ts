import { Prisma } from '@prisma/client';

function toPrismaJsonValueOrNull(value: unknown): Prisma.InputJsonValue | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
    if (typeof value === 'bigint') return value.toString();
    if (value instanceof Date) return value.toISOString();

    if (Array.isArray(value)) {
        return value.map((item) => toPrismaJsonValueOrNull(item)) as Prisma.InputJsonArray;
    }

    if (typeof value === 'object') {
        const maybeSerializable = value as { toJSON?: () => unknown };
        if (typeof maybeSerializable.toJSON === 'function') {
            return toPrismaJsonValueOrNull(maybeSerializable.toJSON());
        }

        const jsonObject: Record<string, Prisma.InputJsonValue | null> = {};
        for (const [key, entry] of Object.entries(value)) {
            if (entry === undefined) continue;
            jsonObject[key] = toPrismaJsonValueOrNull(entry);
        }
        return jsonObject as Prisma.InputJsonObject;
    }

    throw new TypeError(`[Prisma JSON] Unsupported non-JSON value type: ${typeof value}`);
}

export function toPrismaJsonValue(value: unknown): Prisma.InputJsonValue {
    if (value === null || value === undefined) {
        throw new TypeError('[Prisma JSON] Top-level JSON value cannot be nullish for InputJsonValue.');
    }

    const normalized = toPrismaJsonValueOrNull(value);
    if (normalized === null) {
        throw new TypeError('[Prisma JSON] Top-level JSON value normalized to null unexpectedly.');
    }
    return normalized;
}

export function toPrismaJsonField(
    value: unknown
): Prisma.JsonNullValueInput | Prisma.InputJsonValue {
    if (value === null || value === undefined) return Prisma.JsonNull;
    return toPrismaJsonValue(value);
}
