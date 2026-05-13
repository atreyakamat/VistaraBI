import prisma from '@/lib/prisma';

export async function checkProjectLimit(userId: string) {
    const projectCount = await prisma.project.count({
        where: { userId },
    });

    // Unlimited for open source
    const limit = 9999; 

    return { allowed: true, current: projectCount, limit };
}

export async function checkFileUploadLimit(userId: string, fileSizeMb: number) {
    // 500MB limit for general file handling stability
    const limit = 500; 

    if (fileSizeMb > limit) {
        return {
            allowed: false,
            message: `File size limit is ${limit}MB per file. The uploaded file is ${fileSizeMb.toFixed(1)}MB.`,
            limit,
        };
    }

    return { allowed: true, limit };
}