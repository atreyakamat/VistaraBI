import fs from 'fs';
import path from 'path';
import type { DomainType } from '@/lib/prisma';

/**
 * Loads the domain-specific business analyst skill guide from the manual.
 * These guides contain conversational scenarios and industry context.
 */
export function getDomainSkill(domain: DomainType | string | null | undefined): string | null {
    if (!domain) return null;

    try {
        const domainKey = domain.toString().toLowerCase();
        // Resolve path relative to project root in Next.js environment
        const filePath = path.join(process.cwd(), 'ai-chat-manual', 'domains', `${domainKey}.md`);
        
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf8');
        }
    } catch (error) {
        console.warn(`[DomainSkills] Failed to load skill for ${domain}:`, error);
    }

    return null;
}

/**
 * Formats the domain skill for injection into a system prompt.
 */
export function formatSkillForSystemPrompt(skillContent: string, domain: string): string {
    return `### ${domain} DOMAIN KNOWLEDGE & SCENARIOS\n${skillContent}\n`;
}
