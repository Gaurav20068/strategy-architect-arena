let payoffChart = null;

const strategyDefinitions = {
    long_call: {
        legs: [{ type: 'call', side: 'long', defaultStrike: 100, defaultPremium: 5 }]
    },
    long_put: {
        legs: [{ type: 'put', side: 'long', defaultStrike: 100, defaultPremium: 4 }]
    },
    bull_call_spread: {
        legs: [
            { type: 'call', side: 'long', defaultStrike: 100, defaultPremium: 5, label: "Lower Strike (Buy)" },
            { type: 'call', side: 'short', defaultStrike: 105, defaultPremium: 2, label: "Higher Strike (Sell)" }
        ]
    }
};

// UI Elements
const strategySelect = document.getElementById('strategySelect');
const legInputsDiv = document.getElementById('legInputs');
const calculateBtn = document.getElementById('calculateBtn');

// Initialize App
function init() {
    renderInputs();
    strategySelect.addEventListener('change', renderInputs);
    calculateBtn.addEventListener('click', calculateAndRender);
    
    // Initial render
    calculateAndRender();
}

// Render Input Fields dynamically based on strategy
function renderInputs() {
    const strategy = strategySelect.value;
    const legs = strategyDefinitions[strategy].legs;
    
    legInputsDiv.innerHTML = '';
    
    legs.forEach((leg, index) => {
        const title = leg.label || `Leg ${index + 1} (${leg.side} ${leg.type})`;
        
        legInputsDiv.innerHTML += `
            <div style="margin-bottom: 1.5rem; padding: 1rem; background: #0f172a; border-radius: 4px;">
                <h4 style="margin-bottom: 0.5rem; font-size: 0.85rem; color: #38bdf8;">${title}</h4>
                <div class="form-group">
                    <label>Strike Price</label>
                    <input type="number" id="strike_${index}" value="${leg.defaultStrike}">
                </div>
                <div class="form-group">
                    <label>Premium</label>
                    <input type="number" id="premium_${index}" value="${leg.defaultPremium}">
                </div>
            </div>
        `;
    });
}

// Math Engine
function calculateLegPayoff(spot, strike, premium, type, side) {
    let intrinsic = 0;
    if (type === 'call') {
        intrinsic = Math.max(0, spot - strike);
    } else if (type === 'put') {
        intrinsic = Math.max(0, strike - spot);
    }
    
    if (side === 'long') {
        return intrinsic - premium;
    } else {
        return premium - intrinsic;
    }
}

// Main Calculation & Charting
function calculateAndRender() {
    const strategy = strategySelect.value;
    const legs = strategyDefinitions[strategy].legs;
    
    // Read user inputs
    const currentLegs = legs.map((leg, index) => ({
        type: leg.type,
        side: leg.side,
        strike: parseFloat(document.getElementById(`strike_${index}`).value),
        premium: parseFloat(document.getElementById(`premium_${index}`).value)
    }));

    // Generate Price Grid (X-Axis) based on the first strike
    const baseStrike = currentLegs[0].strike;
    const spotPrices = [];
    const payoffs = [];
    
    let maxProfit = -Infinity;
    let maxLoss = Infinity;

    for (let spot = baseStrike * 0.7; spot <= baseStrike * 1.3; spot += (baseStrike * 0.01)) {
        let totalPayoff = 0;
        
        currentLegs.forEach(leg => {
            totalPayoff += calculateLegPayoff(spot, leg.strike, leg.premium, leg.type, leg.side);
        });
        
        spotPrices.push(spot.toFixed(2));
        payoffs.push(totalPayoff.toFixed(2));
        
        if (totalPayoff > maxProfit) maxProfit = totalPayoff;
        if (totalPayoff < maxLoss) maxLoss = totalPayoff;
    }

    // Update Metrics
    document.getElementById('maxProfit').innerText = maxProfit > 1000 ? "Unlimited" : "$" + maxProfit.toFixed(2);
    document.getElementById('maxLoss').innerText = maxLoss < -1000 ? "Unlimited" : "$" + maxLoss.toFixed(2);
    
    // Simple breakeven display logic (can be refined later)
    document.getElementById('breakeven').innerText = "Check Chart";

    // Draw Chart
    drawChart(spotPrices, payoffs);
}

function drawChart(labels, data) {
    const ctx = document.getElementById('payoffChart').getContext('2d');
    
    if (payoffChart) {
        payoffChart.destroy();
    }

    // Create an array of colors: green if profit > 0, red if loss < 0
    const pointColors = data.map(val => parseFloat(val) >= 0 ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)');

    payoffChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Profit / Loss',
                data: data,
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: pointColors,
                pointRadius: 0,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index',
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let val = context.parsed.y;
                            return `P&L: $${val.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Underlying Asset Price ($)', color: '#cbd5e1' },
                    grid: { color: '#334155' }
                },
                y: {
                    title: { display: true, text: 'Profit / Loss ($)', color: '#cbd5e1' },
                    grid: { color: '#334155' }
                }
            }
        }
    });
}

// Run on load
document.addEventListener('DOMContentLoaded', init);
