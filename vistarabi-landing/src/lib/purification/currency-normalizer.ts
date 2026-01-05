// Currency normalizer - converts various currencies to USD

export interface CurrencyNormalizerResult {
    cleanedData: Record<string, unknown>[];
    currenciesNormalized: number;
}

// Fixed exchange rates for MVP (as of typical rates)
const EXCHANGE_RATES: Record<string, number> = {
    'USD': 1.0,
    '$': 1.0,
    'EUR': 1.10,
    '€': 1.10,
    'GBP': 1.27,
    '£': 1.27,
    'JPY': 0.0067,
    '¥': 0.0067,
    'INR': 0.012,
    '₹': 0.012,
    'CAD': 0.74,
    'AUD': 0.66,
    'CHF': 1.13,
};

export function normalizeCurrencies(
    data: Record<string, unknown>[]
): CurrencyNormalizerResult {
    if (data.length === 0) {
        return { cleanedData: data, currenciesNormalized: 0 };
    }

    let currenciesNormalized = 0;
    const cleanedData = data.map(row => ({ ...row }));

    for (const row of cleanedData) {
        for (const [colName, value] of Object.entries(row)) {
            if (value === null || value === undefined) continue;

            const strValue = String(value).trim();
            if (!strValue) continue;

            // Check if this looks like a currency value
            const currencyMatch = detectCurrency(strValue);
            if (currencyMatch) {
                const { currency, amount } = currencyMatch;
                const rate = EXCHANGE_RATES[currency] || 1.0;
                const usdAmount = amount * rate;

                // Store as clean numeric USD value
                row[colName] = Math.round(usdAmount * 100) / 100; // Round to 2 decimals
                currenciesNormalized++;
            }
        }
    }

    return { cleanedData, currenciesNormalized };
}

// Detect currency symbol and extract numeric amount
function detectCurrency(value: string): { currency: string; amount: number } | null {
    // Remove commas
    const cleaned = value.replace(/,/g, '');

    // Match patterns like: $123.45, €123, 123 USD, INR 123, etc.
    const patterns = [
        /^([€$£¥₹])\s*(\d+\.?\d*)$/,        // Symbol before: $123.45
        /^(\d+\.?\d*)\s*([€$£¥₹])$/,        // Symbol after: 123.45$
        /^([A-Z]{3})\s*(\d+\.?\d*)$/,       // Code before: USD 123.45
        /^(\d+\.?\d*)\s*([A-Z]{3})$/,       // Code after: 123.45 USD
    ];

    for (const pattern of patterns) {
        const match = cleaned.match(pattern);
        if (match) {
            const [, part1, part2] = match;

            // Determine which part is currency and which is amount
            const isFirstPartCurrency = isNaN(Number(part1));
            const currency = isFirstPartCurrency ? part1 : part2;
            const amount = isFirstPartCurrency ? Number(part2) : Number(part1);

            if (!isNaN(amount) && EXCHANGE_RATES[currency]) {
                return { currency, amount };
            }
        }
    }

    return null;
}
