/*************************************************
 * IT Asset Stock Take System V2.0
 * Core Functions with Camera & QR Support
 *************************************************/

// ==========================
// CONFIG
// ==========================
const API_URL = "https://script.google.com/macros/s/AKfycbxbMRb1HLX18e2XwY3BBnVA8OoEWu3RRUK37wOFdWrs7AUMEYLEMlHPhDUh-wFnvfus/exec";

let currentAsset = null;
let scanner = null;
let isScanning = false;

// ==========================
// ON LOAD
// ==========================
document.addEventListener("DOMContentLoaded", () => {
    loadDashboard();
    loadLocations();
    loadConditions();
    setupEventListeners();
    fixIOSCamera();
});

// ==========================
// EVENT LISTENERS
// ==========================
function setupEventListeners() {
    const scanBtn = document.getElementById("scanBtn");
    if (scanBtn) scanBtn.onclick = startQRScanner;
}

// ==========================
// API CALL HELPER
// ==========================
async function apiCall(action, data = {}) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action, ...data }),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        showMessage("Network error. Please try again.", "error");
        console.error("API Error:", error);
        return null;
    }
}

// ==========================
// API CALL HELPER (GET)
// ==========================
async function apiCallGet(action, params = {}) {
    try {
        const queryString = new URLSearchParams({ action, ...params }).toString();
        const response = await fetch(`${API_URL}?${queryString}`, {
            method: "GET"
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        showMessage("Network error. Please try again.", "error");
        console.error("API Error:", error);
        return null;
    }
}

// ==========================
// DASHBOARD
// ==========================
async function loadDashboard() {
    const data = await apiCallGet("dashboard");

    if (!data || !data.success) {
        console.error("Failed to load dashboard");
        return;
    }

    document.getElementById("totalAssets").innerText = data.total || 0;
    document.getElementById("verifiedAssets").innerText = data.verified || 0;
    document.getElementById("pendingAssets").innerText = data.pending || 0;
}

// ==========================
// LOAD LOCATIONS
// ==========================
async function loadLocations() {
    const data = await apiCallGet("locations");
    
    if (!data || !data.success || !data.data) {
        console.error("Failed to load locations");
        return;
    }

    const select = document.getElementById("locationSelect");
    if (!select) return;

    select.innerHTML = '<option value="">-- Select Location --</option>';
    
    data.data.forEach(location => {
        const option = document.createElement("option");
        option.value = location;
        option.textContent = location;
        select.appendChild(option);
    });
}

// ==========================
// LOAD CONDITIONS
// ==========================
async function loadConditions() {
    const data = await apiCallGet("conditions");
    
    if (!data || !data.success || !data.data) {
        console.error("Failed to load conditions");
        return;
    }

    const select = document.getElementById("conditionSelect");
    if (!select) return;

    select.innerHTML = '<option value="">-- Select Condition --</option>';
    
    data.data.forEach(condition => {
        const option = document.createElement("option");
        option.value = condition;
        option.textContent = condition;
        select.appendChild(option);
    });
}

// ==========================
// SEARCH ASSET
// ==========================
async function searchAsset() {
    const keyword = document.getElementById("searchInput").value.trim();

    if (!keyword) {
        showMessage("Please enter an Asset ID or keyword", "error");
        return;
    }

    showLoading(true);

    // Try to get single asset by ID first
    let result = await apiCallGet("getasset", { id: keyword });
    
    if (result && result.success) {
        // Found a single asset
        currentAsset = result;
        displayAsset(result);
    } else {
        // Search by keyword
        result = await apiCallGet("search", { keyword });
        if (result && result.success && result.data && result.data.length > 0) {
            if (result.data.length === 1) {
                // Only one result, display it
                currentAsset = result.data[0];
                displayAsset(currentAsset);
            } else {
                // Multiple results
                showMessage(`Found ${result.data.length} assets. Showing first match.`, "info");
                currentAsset = result.data[0];
                displayAsset(currentAsset);
            }
        } else {
            showMessage("Asset not found", "error");
        }
    }

    showLoading(false);
}

// ==========================
// DISPLAY ASSET
// ==========================
function displayAsset(asset) {
    if (!asset) return;

    document.getElementById("assetInfo").style.display = "block";

    // Update all fields with proper error handling
    document.getElementById("showAssetID").innerText = asset.assetID || "-";
    document.getElementById("showAssetName").innerText = asset.assetName || "-";
    document.getElementById("showUser").innerText = asset.user || "-";
    document.getElementById("showPurchase").innerText = asset.purchaseDate || "-";
    document.getElementById("showLocation").innerText = asset.location || "-";
    document.getElementById("showRemarks").innerText = asset.remarks || "-";
    document.getElementById("showVerified").innerText = (asset.verified === "YES" || asset.verified === "Yes") ? "✅ Yes" : "❌ No";

    // Scroll to asset info
    document.getElementById("assetInfo").scrollIntoView({ behavior: "smooth" });
}

// ==========================
// VERIFY ASSET
// ==========================
async function verifyAsset() {
    if (!currentAsset) {
        showMessage("No asset selected", "error");
        return;
    }

    const location = document.getElementById("locationSelect").value;
    const condition = document.getElementById("conditionSelect").value;
    const verifier = document.getElementById("verifiedBy").value.trim();

    if (!location) {
        showMessage("Please select a location", "error");
        return;
    }

    if (!condition) {
        showMessage("Please select a condition", "error");
        return;
    }

    if (!verifier) {
        showMessage("Please enter your name", "error");
        return;
    }

    showLoading(true);

    const result = await apiCall("verify", {
        row: currentAsset.row,
        location: location,
        verifier: verifier,
        condition: condition
    });

    showLoading(false);

    if (result && result.success) {
        showMessage("✅ Asset verified successfully", "success");
        resetSearch();
        loadDashboard();
    } else {
        showMessage(result?.message || "Verification failed", "error");
    }
}

// ==========================
// QR SCANNER
// ==========================
function startQRScanner() {
    const readerId = "qr-reader";
    const btn = document.getElementById("scanBtn");

    if (isScanning) {
        stopQRScanner();
        if (btn) btn.textContent = "📷 Scan QR";
        return;
    }

    isScanning = true;
    if (btn) btn.textContent = "❌ Stop Scanning";

    // Show QR reader
    const qrElement = document.getElementById(readerId);
    if (qrElement) qrElement.style.display = "block";

    scanner = new Html5Qrcode(readerId);

    scanner.start(
        { facingMode: "environment" },
        { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            disableFlip: false 
        },
        (decodedText) => {
            console.log("QR Code detected:", decodedText);
            stopQRScanner();
            handleQRResult(decodedText);
        },
        (errorMessage) => {
            // Suppress repeated error messages
            console.debug("QR Scan progress:", errorMessage);
        }
    ).catch(err => {
        console.error("Scanner start error:", err);
        showMessage("Camera access failed. Please check permissions.", "error");
        stopQRScanner();
        if (btn) btn.textContent = "📷 Scan QR";
        isScanning = false;
    });
}

function stopQRScanner() {
    const readerId = "qr-reader";
    
    if (scanner) {
        scanner.stop().then(() => {
            scanner.clear();
            console.log("Scanner stopped");
        }).catch(err => {
            console.error("Stop scanner error:", err);
        });
    }
    
    const qrElement = document.getElementById(readerId);
    if (qrElement) qrElement.style.display = "none";
    
    isScanning = false;
}

// ==========================
// QR RESULT HANDLER
// ==========================
function handleQRResult(text) {
    console.log("Processing QR result:", text);
    document.getElementById("searchInput").value = text;
    showMessage("QR Code scanned. Searching...", "info");
    searchAsset();
}

// ==========================
// LOADING
// ==========================
function showLoading(show) {
    const loader = document.getElementById("loading");
    if (loader) loader.style.display = show ? "block" : "none";
}

// ==========================
// MESSAGE SYSTEM
// ==========================
function showMessage(msg, type = "info") {
    const box = document.getElementById("messageBox");
    if (!box) return;

    box.innerText = msg;
    box.className = "message";
    box.classList.add(type);
    box.style.display = "block";

    setTimeout(() => {
        box.style.display = "none";
    }, 4000);
}

// ==========================
// RESET SEARCH
// ==========================
function resetSearch() {
    document.getElementById("searchInput").value = "";
    document.getElementById("assetInfo").style.display = "none";
    document.getElementById("verifiedBy").value = "";
    document.getElementById("locationSelect").value = "";
    document.getElementById("conditionSelect").value = "";
    currentAsset = null;
}

// ==========================
// CAMERA IMPROVEMENT (iOS fix)
// ==========================
function fixIOSCamera() {
    // Check if we're on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
        console.log("iOS device detected - applying camera fixes");
        
        // Add playsinline to any video elements that get created
        document.addEventListener("DOMContentLoaded", () => {
            const videos = document.querySelectorAll("video");
            videos.forEach(video => {
                video.setAttribute("playsinline", "true");
                video.setAttribute("webkit-playsinline", "true");
                video.style.objectFit = "cover";
            });
        });
    }
}

// ==========================
// AUTO REFRESH DASHBOARD
// ==========================
setInterval(() => {
    loadDashboard();
}, 60000); // every 60 seconds

// ==========================
// WINDOW RESIZE HANDLER
// ==========================
window.addEventListener("resize", () => {
    const qr = document.getElementById("qr-reader");
    if (qr) qr.style.width = "100%";
});

// ==========================
// GLOBAL ERROR HANDLER
// ==========================
window.addEventListener("error", (e) => {
    console.error("Global error:", e.message);
});

// ==========================
// EXPORT HELPERS
// ==========================
window.app = {
    searchAsset,
    verifyAsset,
    startQRScanner,
    stopQRScanner,
    resetSearch,
    loadDashboard
};