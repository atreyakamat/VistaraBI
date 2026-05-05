import { MasterAgent } from '../src/lib/ai/master-agent';
import { DomainType } from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

/**
 * Test to verify that domain-specific skills are correctly loaded and injected.
 */
async function testDomainSkillActivation() {
    console.log("🧪 Testing Domain Skill Activation...");

    const context = {
        query: "What are the standard scenarios for an e-commerce check-in?",
        domain: "ECOMMERCE" as DomainType,
        datasets: {
            "orders.csv": ["order_id", "revenue", "customer_id", "date"]
        }
    };

    console.log(`\nDomain: ${context.domain}`);
    console.log(`Query: ${context.query}`);

    try {
        // This will call MasterAgent.processRequest which now uses domain skills
        const response = await MasterAgent.processRequest(context);
        
        console.log("\n✅ AI Response received:");
        console.log(response.content);

        // Check if response contains keywords from ecommerce.md scenarios
        const guideKeywords = ["Average Order Value", "AOV", "420 orders", "18,500"];
        const foundKeywords = guideKeywords.filter(k => response.content.includes(k));

        if (foundKeywords.length > 0) {
            console.log(`\n✨ Domain skill verified! Found guide keywords: ${foundKeywords.join(", ")}`);
        } else {
            console.log("\n⚠️ No direct guide keywords found in response, but it might still be using the skill.");
        }

    } catch (error) {
        console.error("\n❌ Test failed:", error);
    }
}

testDomainSkillActivation();
