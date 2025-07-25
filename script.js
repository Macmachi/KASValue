// script.js
const KASPA_API_URL = 'https://api.kaspa.org/info/price';
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

// USD to EUR conversion rate (approx. July 25, 2025)
const USD_TO_EUR_RATE = 0.92;

// Item definitions with their base USD values
// Prices updated based on mid-2024 estimates
const ITEM_DEFINITIONS = {
    privateIsland: { usdValue: 15000000 },
    privateJet: { usdValue: 8000000 },
    luxuryHouse: { usdValue: 1500000, eurOverrideValue: 2000000 },
    yacht: { usdValue: 5000000 },
    luxuryCar: { usdValue: 250000 },
    goldKg: { usdValue: 108000 }, // 1 kg of Gold (approx. $2300/oz * 32.15 oz/kg)
    bitcoin: { usdValue: 110000 }, // 1 Bitcoin (hypothetical value)
    mediumHouse: { usdValue: 400000, eurOverrideValue: 500000 },
    electricCar: { usdValue: 50000 },
    gamingPc: { usdValue: 3000 },
    watch: { usdValue: 15000 },
    designerHandbag: { usdValue: 5000 },
    silverKg: { usdValue: 1250 }, 
    computer: { usdValue: 1200 },
    smartphone: { usdValue: 1000 },
    smallHouse: { usdValue: 200000, eurOverrideValue: 250000 },
    fineDiningMeal: { usdValue: 300 },
    pizza: { usdValue: 20 },
    coffee: { usdValue: 6 },
};

let kaspaPriceUsd = 0;
let currentLanguage = 'en'; // Default language
let currentCurrency = 'USD'; // Default currency

// Function to format numbers with thousands separators and a fixed number of decimals
function formatNumber(num, decimalPlaces = 2) {
    return new Intl.NumberFormat(currentLanguage, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
        useGrouping: true
    }).format(num);
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[currentLanguage] && translations[currentLanguage][key]) {
            element.innerHTML = translations[currentLanguage][key];
        }
    });

    // Update item names and estimated fiat values
    updateDisplay(); // Re-call updateDisplay to refresh item names with current language and currency

    // Handle RTL for Arabic
    document.body.dir = (currentLanguage === 'ar') ? 'rtl' : 'ltr';

    // Update quote
    displayRandomQuote();
}

function updateDisplay() {
    if (kaspaPriceUsd > 0) {
        document.getElementById('kaspa-price').textContent = `$${formatNumber(kaspaPriceUsd, 4)}`; // Kaspa price always in USD for consistency

        // Calculate effective item prices based on selected currency
        Object.keys(ITEM_DEFINITIONS).forEach(key => {
            const itemDef = ITEM_DEFINITIONS[key];
            let fiatValue = itemDef.usdValue;
            let displayCurrencySymbol = '$';

            if (currentCurrency === 'EUR') {
                // Apply specific EUR override if exists for house categories, otherwise convert from USD
                fiatValue = (itemDef.eurOverrideValue && key.includes('House')) ? itemDef.eurOverrideValue : itemDef.usdValue * USD_TO_EUR_RATE;
                displayCurrencySymbol = '€';
            }
            
            // Update the H3 text with translated name (NO EMOJI HERE)
            const h3Element = document.querySelector(`#${key}-card h3`);
            if (h3Element) {
                h3Element.textContent = `${translations[currentLanguage].items[key]}`;
            }

            // Update the KAS price
            const kaspaPriceElement = document.getElementById(`${key}-kaspa`);
            if (kaspaPriceElement) {
                kaspaPriceElement.innerHTML = `${formatNumber(fiatValue / kaspaPriceUsd, 2)} <span class="kas-unit">KAS</span>`;
            }

            // Update the fiat price
            const fiatPriceElement = document.getElementById(`${key}-fiat`);
            if (fiatPriceElement) {
                fiatPriceElement.textContent = `${formatNumber(fiatValue, 0)} ${displayCurrencySymbol}`;
            }
        });
    } else {
        document.getElementById('kaspa-price').textContent = translations[currentLanguage].kaspaPriceTitle + ": N/A";
        // Reset other prices
        Object.keys(ITEM_DEFINITIONS).forEach(key => {
            document.getElementById(`${key}-kaspa`).textContent = "N/A";
            document.getElementById(`${key}-fiat`).textContent = ""; // Clear fiat price
            const h3Element = document.querySelector(`#${key}-card h3`);
            if (h3Element) {
                h3Element.textContent = `${translations[currentLanguage].items[key]}`; // Show name even if price not available
            }
        });
    }
}

function updateLastUpdated(timestamp) {
    const date = new Date(timestamp);
    const dateOptions = { year: 'numeric', month: 'numeric', day: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit' };
    document.getElementById('last-updated').textContent = `${translations[currentLanguage].lastUpdated} ${date.toLocaleDateString(currentLanguage, dateOptions)} ${date.toLocaleTimeString(currentLanguage, timeOptions)}`;
}

async function fetchKaspaPrice() {
    const cachedPrice = localStorage.getItem('kaspaPrice');
    const cachedTimestamp = localStorage.getItem('kaspaPriceTimestamp');
    const now = Date.now();

    if (cachedPrice && cachedTimestamp && (now - parseInt(cachedTimestamp) < CACHE_DURATION)) {
        // Use cached data if valid
        kaspaPriceUsd = parseFloat(cachedPrice);
        updateDisplay();
        updateLastUpdated(parseInt(cachedTimestamp));
        console.log("Using cached Kaspa price (less than 15min old).");
    } else {
        // Fetch from API if cache is expired or non-existent
        console.log("Fetching Kaspa price from API...");
        try {
            const response = await fetch(KASPA_API_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (data && typeof data.price === 'number') {
                kaspaPriceUsd = data.price;
                // Store in cache
                localStorage.setItem('kaspaPrice', kaspaPriceUsd.toString());
                localStorage.setItem('kaspaPriceTimestamp', now.toString());
                updateDisplay();
                updateLastUpdated(now);
                console.log("Kaspa price updated from API and cached.");
            } else {
                console.error("Unexpected API data:", data);
                document.getElementById('kaspa-price').textContent = translations[currentLanguage].kaspaPriceTitle + ": API Data Error";
                if (cachedPrice) {
                    kaspaPriceUsd = parseFloat(cachedPrice);
                    updateDisplay();
                    updateLastUpdated(parseInt(cachedTimestamp));
                    console.log("API error, using cached Kaspa price.");
                }
            }
        } catch (error) {
            console.error("Error fetching Kaspa price:", error);
            document.getElementById('kaspa-price').textContent = translations[currentLanguage].kaspaPriceTitle + ": API Loading Error";
            if (cachedPrice) {
                kaspaPriceUsd = parseFloat(cachedPrice);
                updateDisplay();
                updateLastUpdated(parseInt(cachedTimestamp));
                console.log("Connection error, using cached Kaspa price.");
            } else {
                document.getElementById('last-updated').textContent = translations[currentLanguage].lastUpdated + " " + translations[currentLanguage].kaspaPriceTitle + ": No data available.";
            }
        }
    }
}

function displayRandomQuote() {
    const quotes = translations[currentLanguage].quotes;
    if (quotes && quotes.length > 0) {
        const randomIndex = Math.floor(Math.random() * quotes.length);
        const quote = quotes[randomIndex];
        document.getElementById('quote-text').textContent = `"${quote.text}"`;
        document.getElementById('quote-author').textContent = `- ${quote.author}`;
    } else {
        document.getElementById('quote-text').textContent = "";
        document.getElementById('quote-author').textContent = "";
    }
}

function detectAndApplyLanguage() {
    const browserLanguage = navigator.language.split('-')[0]; // e.g., "fr" from "fr-FR"
    if (translations[browserLanguage]) {
        currentLanguage = browserLanguage;
    } else {
        currentLanguage = 'en'; // Fallback to English
    }
    document.getElementById('language-selector').value = currentLanguage;
    applyTranslations();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    detectAndApplyLanguage();
    fetchKaspaPrice();

    document.getElementById('language-selector').addEventListener('change', (event) => {
        currentLanguage = event.target.value;
        applyTranslations();
        updateLastUpdated(localStorage.getItem('kaspaPriceTimestamp') || Date.now()); // Update timestamp string after language change
    });

    document.getElementById('currency-selector').addEventListener('change', (event) => {
        currentCurrency = event.target.value;
        updateDisplay(); // Re-calculate and display prices with new currency
    });

    // Update every 15 minutes
    setInterval(fetchKaspaPrice, CACHE_DURATION); 
});