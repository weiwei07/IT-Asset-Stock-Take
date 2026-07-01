/*************************************************
 * IT Asset Stock Take System V2.0 - Part 1
 * Core Functions
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
    setupEventListeners();
});

// ==========================
// EVENT LISTENERS
// ==========================
function setupEventListeners() {
    const searchBtn = document.getElementById("searchBtn");
    const verifyBtn = document.getElementById("verifyBtn");
    const scanBtn = document.getElementById("scanBtn");

    if (searchBtn) searchBtn.onclick = searchAsset;
    if (verifyBtn) verifyBtn.onclick = verifyAsset;
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

        return await response.json();
    } catch (error) {
        showMessage("Network error. Please try again.", "error");
        console.error(error);
    }
}

// ==========================
// DASHBOARD
// ==========================
async function loadDashboard() {
    const data = await apiCall("dashboard");

    if (!data) return;

    document.getElementById("totalAssets").innerText = data.total || 0;
    document.getElementById("verifiedAssets").innerText = data.verified || 0;
    document.getElementById("pendingAssets").innerText = data.pending || 0;
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

    const result = await apiCall("search", { keyword });

    showLoading(false);

    if (!result || !result.asset) {
        showMessage("Asset not found", "error");
        return;
    }

    currentAsset = result.asset;
    displayAsset(result.asset);
}

// ==========================
// DISPLAY ASSET
// ==========================
function displayAsset(asset) {
    document.getElementById("assetInfo").style.display = "block";

    document.getElementById("assetId").innerText = asset.id;
    document.getElementById("assetName").innerText = asset.name;
    document.getElementById("assetLocation").innerText = asset.location;
    document.getElementById("assetStatus").innerText = asset.status;
}

// ==========================
// VERIFY ASSET
// ==========================
async function verifyAsset() {
    if (!currentAsset) {
        showMessage("No asset selected", "error");
        return;
    }

    showLoading(true);

    const result = await apiCall("verify", {
        assetId: currentAsset.id
    });

    showLoading(false);

    if (result.success) {
        showMessage("Asset verified successfully", "success");
        loadDashboard();
    } else {
        showMessage("Verification failed", "error");
    }
}

// ==========================
// QR SCANNER
// ==========================
function startQRScanner() {
    const readerId = "qr-reader";

    if (isScanning) {
        stopQRScanner();
        return;
    }

    isScanning = true;

    scanner = new Html5Qrcode(readerId);

    scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
            stopQRScanner();
            handleQRResult(decodedText);
        }
    ).catch(err => {
        console.error(err);
        showMessage("Camera access failed", "error");
        isScanning = false;
    });
}

function stopQRScanner() {
    if (scanner) {
        scanner.stop().then(() => {
            scanner.clear();
        });
    }
    isScanning = false;
}

// ==========================
// QR RESULT HANDLER
// ==========================
function handleQRResult(text) {
    document.getElementById("searchInput").value = text;
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
    box.className = type;
    box.style.display = "block";

    setTimeout(() => {
        box.style.display = "none";
    }, 3000);
}
/*************************************************
 * IT Asset Stock Take System V2.0 - Part 2
 * Utilities & Enhancements
 *************************************************/

// ==========================
// RESET SEARCH
// ==========================
function resetSearch() {
    document.getElementById("searchInput").value = "";
    document.getElementById("assetInfo").style.display = "none";
    currentAsset = null;
}

// ==========================
// AUTO REFRESH DASHBOARD
// ==========================
setInterval(() => {
    loadDashboard();
}, 60000); // every 60 seconds

// ==========================
// FORMAT DATE
// ==========================
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleString();
}

// ==========================
// SEARCH RESULTS TABLE
// ==========================
function renderSearchResults(list) {
    const table = document.getElementById("resultsTable");
    if (!table) return;

    table.innerHTML = "";

    list.forEach(item => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${item.id}</td>
            <td>${item.name}</td>
            <td>${item.location}</td>
            <td>${item.status}</td>
        `;

        row.onclick = () => {
            currentAsset = item;
            displayAsset(item);
        };

        table.appendChild(row);
    });
}

// ==========================
// KEYWORD SEARCH (ADVANCED)
// ==========================
async function keywordSearch() {
    const keyword = document.getElementById("searchInput").value;

    showLoading(true);

    const result = await apiCall("keywordSearch", { keyword });

    showLoading(false);

    if (result && result.list) {
        renderSearchResults(result.list);
    } else {
        showMessage("No results found", "error");
    }
}

// ==========================
// MOBILE FIXES
// ==========================
window.addEventListener("resize", () => {
    const qr = document.getElementById("qr-reader");
    if (qr) qr.style.width = "100%";
});

// ==========================
// CAMERA IMPROVEMENT (iOS fix)
// ==========================
function fixIOSCamera() {
    const video = document.querySelector("video");
    if (video) {
        video.setAttribute("playsinline", true);
        video.setAttribute("webkit-playsinline", true);
    }
}

// ==========================
// CLEAR FORM
// ==========================
function clearForm() {
    document.querySelectorAll("input").forEach(input => input.value = "");
    resetSearch();
}

// ==========================
// ERROR HANDLER GLOBAL
// ==========================
window.addEventListener("error", (e) => {
    console.error("Global error:", e.message);
});

// ==========================
// EXPORT HELPERS (optional)
// ==========================
window.app = {
    searchAsset,
    verifyAsset,
    startQRScanner,
    resetSearch,
    keywordSearch
};