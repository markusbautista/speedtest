// Import Cloudflare Speed Test library
import SpeedTest from "https://esm.sh/@cloudflare/speedtest@1.7.0";
import jsPDF from "https://esm.sh/jspdf@2.5.1";

// DOM Elements
const startBtn = document.getElementById("startBtn");
const btnIcon = document.getElementById("btnIcon");
const btnText = document.getElementById("btnText");
const downloadSpeed = document.getElementById("downloadSpeed");
const uploadSpeed = document.getElementById("uploadSpeed");
const downloadProgress = document.getElementById("downloadProgress");
const uploadProgress = document.getElementById("uploadProgress");
const latency = document.getElementById("latency");
const jitter = document.getElementById("jitter");
const loadedLatency = document.getElementById("loadedLatency");
const serverLocation = document.getElementById("serverLocation");
const clientIp = document.getElementById("clientIp");
const clientIsp = document.getElementById("clientIsp");
const copyServerLocation = document.getElementById("copyServerLocation");
const copyClientIp = document.getElementById("copyClientIp");
const copyIsp = document.getElementById("copyIsp");
const serverProvider = document.getElementById("serverProvider");

// Quality score elements
const streamingBadge = document.getElementById("streamingBadge");
const streamingDesc = document.getElementById("streamingDesc");
const gamingBadge = document.getElementById("gamingBadge");
const gamingDesc = document.getElementById("gamingDesc");
const rtcBadge = document.getElementById("rtcBadge");
const rtcDesc = document.getElementById("rtcDesc");

// Settings modal elements
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const modalBackdrop = document.getElementById("modalBackdrop");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const resetSettingsBtn = document.getElementById("resetSettingsBtn");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");

// Report modal elements
const viewReportBtn = document.getElementById("viewReportBtn");
const reportModal = document.getElementById("reportModal");
const reportModalBackdrop = document.getElementById("reportModalBackdrop");
const closeReportBtn = document.getElementById("closeReportBtn");
const closeReportBtn2 = document.getElementById("closeReportBtn2");
const exportPdfBtn = document.getElementById("exportPdfBtn");

// History table elements
const historyTableBody = document.getElementById("historyTableBody");
const emptyHistoryRow = document.getElementById("emptyHistoryRow");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

// Dark mode elements
const darkModeToggle = document.getElementById("darkModeToggle");
const darkModeIcon = document.getElementById("darkModeIcon");

let speedTest = null;
let isRunning = false;
let testHistory = [];

// Copy to clipboard with visual feedback
async function copyToClipboard(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const icon = button.querySelector(".material-symbols-outlined");
    const originalText = icon.textContent;
    icon.textContent = "check_circle";
    icon.classList.add("text-green-500");

    setTimeout(() => {
      icon.textContent = originalText;
      icon.classList.remove("text-green-500");
    }, 2000);
  } catch (err) {
    console.error("Failed to copy:", err);
  }
}

// Format speed from bps to Mbps
function formatSpeed(bps) {
  if (!bps || bps === 0) return "—";
  return (bps / 1_000_000).toFixed(1);
}

// Format latency in ms
function formatLatency(ms) {
  if (!ms || ms === 0) return "—";
  return ms.toFixed(0);
}

// Get quality rating based on score
function getQualityRating(score) {
  if (score >= 80)
    return {
      label: "Excellent",
      class:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    };
  if (score >= 60)
    return {
      label: "Good",
      class: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    };
  if (score >= 40)
    return {
      label: "Fair",
      class:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    };
  return {
    label: "Poor",
    class: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
}

// Load test history from localStorage
function loadHistory() {
  const saved = localStorage.getItem("speedTestHistory");
  if (saved) {
    try {
      testHistory = JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load history:", e);
      testHistory = [];
    }
  }
  renderHistoryTable();
}

// Save test history to localStorage
function saveHistory() {
  localStorage.setItem("speedTestHistory", JSON.stringify(testHistory));
}

// Add test result to history
function addToHistory(downloadSpeed, uploadSpeed) {
  const now = new Date();
  const result = {
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString(),
    timestamp: now.getTime(),
    download: parseFloat(downloadSpeed) || 0,
    upload: parseFloat(uploadSpeed) || 0,
  };

  testHistory.unshift(result); // Add to beginning
  if (testHistory.length > 50) {
    testHistory = testHistory.slice(0, 50); // Keep last 50 tests
  }

  saveHistory();
  renderHistoryTable();
}

// Calculate comparison percentages
function calculateComparison(current, compare) {
  if (!compare || compare === 0) return "—";
  const diff = ((current - compare) / compare) * 100;
  const sign = diff > 0 ? "+" : "";
  return `${sign}${diff.toFixed(1)}%`;
}

// Get comparison color class
function getComparisonClass(current, compare, inverse = false) {
  if (!compare || compare === 0) return "text-gray-500 dark:text-gray-400";
  const better = inverse ? current < compare : current > compare;
  return better
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400";
}

// Render history table
function renderHistoryTable() {
  if (testHistory.length === 0) {
    emptyHistoryRow.classList.remove("hidden");
    // Remove any existing data rows
    const dataRows = historyTableBody.querySelectorAll(
      "tr:not(#emptyHistoryRow)"
    );
    dataRows.forEach((row) => row.remove());
    return;
  }

  emptyHistoryRow.classList.add("hidden");

  // Calculate stats
  const downloads = testHistory.map((t) => t.download);
  const uploads = testHistory.map((t) => t.upload);
  const highestDownload = Math.max(...downloads);
  const lowestDownload = Math.min(...downloads.filter((d) => d > 0));
  const highestUpload = Math.max(...uploads);
  const lowestUpload = Math.min(...uploads.filter((u) => u > 0));

  // Clear existing data rows
  const dataRows = historyTableBody.querySelectorAll(
    "tr:not(#emptyHistoryRow)"
  );
  dataRows.forEach((row) => row.remove());

  // Render each test result
  testHistory.forEach((test, index) => {
    const row = document.createElement("tr");
    row.className =
      "hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors";

    const previousTest = testHistory[index + 1];
    const avgSpeed = (test.download + test.upload) / 2;
    const prevAvgSpeed = previousTest
      ? (previousTest.download + previousTest.upload) / 2
      : 0;

    row.innerHTML = `
      <td class="px-4 py-3 text-sm text-gray-900 dark:text-white">${
        test.date
      }</td>
      <td class="px-4 py-3 text-sm text-gray-900 dark:text-white">${
        test.time
      }</td>
      <td class="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white tabular-nums">${test.download.toFixed(
        1
      )} Mbps</td>
      <td class="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white tabular-nums">${test.upload.toFixed(
        1
      )} Mbps</td>
      <td class="px-4 py-3 text-sm font-semibold tabular-nums ${getComparisonClass(
        avgSpeed,
        prevAvgSpeed
      )}">
        ${calculateComparison(avgSpeed, prevAvgSpeed)}
      </td>
      <td class="px-4 py-3 text-sm font-semibold tabular-nums ${getComparisonClass(
        avgSpeed,
        (highestDownload + highestUpload) / 2
      )}">
        ${calculateComparison(avgSpeed, (highestDownload + highestUpload) / 2)}
      </td>
      <td class="px-4 py-3 text-sm font-semibold tabular-nums ${getComparisonClass(
        avgSpeed,
        (lowestDownload + lowestUpload) / 2
      )}">
        ${calculateComparison(avgSpeed, (lowestDownload + lowestUpload) / 2)}
      </td>
    `;

    historyTableBody.appendChild(row);
  });
}

// Clear history
function clearHistory() {
  if (confirm("Are you sure you want to clear all test history?")) {
    testHistory = [];
    saveHistory();
    renderHistoryTable();
  }
}

// Get quality descriptions
function getStreamingDesc(score) {
  if (score >= 80)
    return "Your connection can support multiple 4K streams simultaneously without buffering.";
  if (score >= 60) return "Smooth HD streaming. 4K may buffer occasionally.";
  if (score >= 40)
    return "Suitable for SD/HD streaming. May experience occasional buffering.";
  return "Limited streaming quality. Expect frequent buffering.";
}

function getGamingDesc(score) {
  if (score >= 80)
    return "Excellent for competitive gaming with minimal latency.";
  if (score >= 60)
    return "Good for most online games. Occasional lag spikes may occur.";
  if (score >= 40)
    return "Playable but may experience noticeable lag in fast-paced games.";
  return "High latency may cause significant lag in online games.";
}

function getRtcDesc(score) {
  if (score >= 80)
    return "Crystal clear audio and video calls. Perfect for Zoom, Teams, and Meet.";
  if (score >= 60)
    return "Good quality calls. Minor quality drops possible under load.";
  if (score >= 40)
    return "Usable for calls but may experience audio/video issues.";
  return "May experience choppy audio and video during calls.";
}

// Update UI with current results
function updateResults() {
  if (!speedTest?.results) return;
  const results = speedTest.results;

  const down = results.getDownloadBandwidth();
  if (down) {
    downloadSpeed.textContent = formatSpeed(down);
    const downPercent = Math.min((down / 1_000_000_000) * 100, 100);
    downloadProgress.style.width = `${downPercent}%`;
  }

  const up = results.getUploadBandwidth();
  if (up) {
    uploadSpeed.textContent = formatSpeed(up);
    const upPercent = Math.min((up / 500_000_000) * 100, 100);
    uploadProgress.style.width = `${upPercent}%`;
  }

  const lat = results.getUnloadedLatency();
  if (lat) latency.textContent = formatLatency(lat);

  const jit = results.getUnloadedJitter();
  if (jit) jitter.textContent = formatLatency(jit);

  const downLoadedLat = results.getDownLoadedLatency();
  if (downLoadedLat) loadedLatency.textContent = formatLatency(downLoadedLat);

  const summary = results.getSummary();
  if (summary?.serverLocations?.length > 0) {
    serverLocation.textContent = summary.serverLocations.join(", ");
  }
  // Update client info from speed test if available
  if (summary?.clientIp && clientIp.textContent === "—") {
    clientIp.textContent = summary.clientIp;
  }
  if (summary?.asOrganization) {
    clientIsp.textContent = summary.asOrganization;
  }
}

// Update quality scores
function updateScores() {
  if (!speedTest?.results) return;
  const scores = speedTest.results.getScores();
  if (!scores) return;

  if (scores.streaming !== undefined) {
    const rating = getQualityRating(scores.streaming.points);
    streamingBadge.textContent = rating.label;
    streamingBadge.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${rating.class}`;
    streamingDesc.textContent = getStreamingDesc(scores.streaming.points);
  }

  if (scores.gaming !== undefined) {
    const rating = getQualityRating(scores.gaming.points);
    gamingBadge.textContent = rating.label;
    gamingBadge.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${rating.class}`;
    gamingDesc.textContent = getGamingDesc(scores.gaming.points);
  }

  if (scores.rtc !== undefined) {
    const rating = getQualityRating(scores.rtc.points);
    rtcBadge.textContent = rating.label;
    rtcBadge.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${rating.class}`;
    rtcDesc.textContent = getRtcDesc(scores.rtc.points);
  }
}

// Fetch client info using CORS-friendly API
async function fetchClientInfo() {
  // Try multiple reliable CORS-friendly APIs with fallbacks
  const apis = [
    {
      url: "https://ipapi.co/json/",
      parse: (data) => ({
        ip: data.ip,
        location:
          data.city && data.country_name
            ? `${data.city}, ${data.country_name}`
            : null,
        isp: data.org,
      }),
    },
    {
      url: "https://api.ipify.org?format=json",
      parse: (data) => ({
        ip: data.ip,
        location: null,
        isp: null,
      }),
    },
    {
      url: "https://api.bigdatacloud.net/data/client-ip",
      parse: (data) => ({
        ip: data.ipString,
        location: null,
        isp: null,
      }),
    },
  ];

  for (const api of apis) {
    try {
      const response = await fetch(api.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const info = await api.parse(data);

      if (info.ip) clientIp.textContent = info.ip;
      if (info.isp) clientIsp.textContent = info.isp;
      if (info.location) serverLocation.textContent = info.location;

      console.log("✓ Client info loaded from:", api.url);
      return; // Success, exit
    } catch (e) {
      console.log(`✗ ${api.url}:`, e.message);
    }
  }

  console.log(
    "All APIs failed. Info will be populated from speed test results."
  );
}

// Reset UI to initial state
function resetUI() {
  downloadSpeed.textContent = "—";
  uploadSpeed.textContent = "—";
  downloadProgress.style.width = "0%";
  uploadProgress.style.width = "0%";
  latency.textContent = "—";
  jitter.textContent = "—";
  loadedLatency.textContent = "—";

  streamingBadge.textContent = "—";
  streamingBadge.className =
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  streamingDesc.textContent = "Run a test to see your streaming quality.";

  gamingBadge.textContent = "—";
  gamingBadge.className =
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  gamingDesc.textContent = "Run a test to see your gaming quality.";

  rtcBadge.textContent = "—";
  rtcBadge.className =
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  rtcDesc.textContent = "Run a test to see your video call quality.";
}

// Initialize and start speed test
function startSpeedTest() {
  if (isRunning) return;

  // Smooth scroll to speed meters on mobile
  if (window.innerWidth < 768) {
    document.getElementById("speedMeters")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  isRunning = true;
  btnIcon.textContent = "hourglass_empty";
  btnText.textContent = "Testing...";
  startBtn.disabled = true;
  startBtn.classList.add("opacity-70", "cursor-not-allowed");

  resetUI();

  // Get settings from modal
  const settings = getSettings();
  speedTest = new SpeedTest(settings);

  speedTest.onResultsChange = ({ type }) => {
    updateResults();

    if (type === "latency") {
      btnText.textContent = "Measuring latency...";
    } else if (type === "download") {
      btnText.textContent = "Testing download...";
    } else if (type === "upload") {
      btnText.textContent = "Testing upload...";
    }
  };

  speedTest.onFinish = (results) => {
    isRunning = false;
    btnIcon.textContent = "replay";
    btnText.textContent = "Test Again";
    startBtn.disabled = false;
    startBtn.classList.remove("opacity-70", "cursor-not-allowed");

    updateResults();
    updateScores();

    // Add to history
    const summary = results.getSummary();
    if (summary.download && summary.upload) {
      addToHistory(
        (summary.download / 1_000_000).toFixed(1),
        (summary.upload / 1_000_000).toFixed(1)
      );
    }

    console.log("Speed Test Results:", results.getSummary());
    console.log("Quality Scores:", results.getScores());
  };

  speedTest.onError = (error) => {
    console.error("Speed test error:", error);
    isRunning = false;
    btnIcon.textContent = "error";
    btnText.textContent = "Try Again";
    startBtn.disabled = false;
    startBtn.classList.remove("opacity-70", "cursor-not-allowed");
  };
}

// Event listeners
startBtn.addEventListener("click", startSpeedTest);

// Copy server location
copyServerLocation.addEventListener("click", (e) => {
  e.stopPropagation();
  const text = serverLocation.textContent;
  if (text && text !== "—") {
    copyToClipboard(text, copyServerLocation);
  }
});

// Copy client IP
copyClientIp.addEventListener("click", (e) => {
  e.stopPropagation();
  const text = clientIp.textContent;
  if (text && text !== "—") {
    copyToClipboard(text, copyClientIp);
  }
});

// Copy ISP
copyIsp.addEventListener("click", (e) => {
  e.stopPropagation();
  const text = clientIsp.textContent;
  if (text && text !== "—") {
    copyToClipboard(text, copyIsp);
  }
});

// Settings modal functions
function openSettingsModal() {
  settingsModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeSettingsModal() {
  settingsModal.classList.add("hidden");
  document.body.style.overflow = "";
}

// Report modal functions
function openReportModal() {
  // Update report with current values
  updateReportModal();
  reportModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeReportModal() {
  reportModal.classList.add("hidden");
  document.body.style.overflow = "";
}

function updateReportModal() {
  // Speed metrics
  document.getElementById("reportDownloadSpeed").textContent =
    downloadSpeed.textContent !== "—"
      ? `${downloadSpeed.textContent} Mbps`
      : "— Mbps";
  document.getElementById("reportUploadSpeed").textContent =
    uploadSpeed.textContent !== "—"
      ? `${uploadSpeed.textContent} Mbps`
      : "— Mbps";

  // Latency metrics - extract only the numeric value (first child node)
  const latencyValue = latency.firstChild.textContent.trim();
  const jitterValue = jitter.firstChild.textContent.trim();
  const loadedLatencyValue = loadedLatency.firstChild.textContent.trim();

  document.getElementById("reportLatency").textContent =
    latencyValue !== "—" ? `${latencyValue} ms` : "— ms";
  document.getElementById("reportJitter").textContent =
    jitterValue !== "—" ? `${jitterValue} ms` : "— ms";
  document.getElementById("reportLoadedLatency").textContent =
    loadedLatencyValue !== "—" ? `${loadedLatencyValue} ms` : "— ms";

  // Connection info
  document.getElementById("reportServerLocation").textContent =
    serverLocation.textContent;
  document.getElementById("reportClientIp").textContent = clientIp.textContent;
  document.getElementById("reportClientIsp").textContent =
    clientIsp.textContent;

  // Quality scores
  document.getElementById("reportStreamingBadge").textContent =
    streamingBadge.textContent;
  document.getElementById("reportStreamingBadge").className =
    streamingBadge.className;
  document.getElementById("reportStreamingDesc").textContent =
    streamingDesc.textContent;

  document.getElementById("reportGamingBadge").textContent =
    gamingBadge.textContent;
  document.getElementById("reportGamingBadge").className =
    gamingBadge.className;
  document.getElementById("reportGamingDesc").textContent =
    gamingDesc.textContent;

  document.getElementById("reportRtcBadge").textContent = rtcBadge.textContent;
  document.getElementById("reportRtcBadge").className = rtcBadge.className;
  document.getElementById("reportRtcDesc").textContent = rtcDesc.textContent;

  // Timestamp
  if (downloadSpeed.textContent !== "—" || uploadSpeed.textContent !== "—") {
    const now = new Date();
    document.getElementById(
      "reportTimestamp"
    ).textContent = `Test completed on ${now.toLocaleString()}`;
  } else {
    document.getElementById("reportTimestamp").textContent =
      "Test not completed yet";
  }
}

// Get settings from modal form
function getSettings() {
  const testMode = document.getElementById("testMode").value;
  const measureDownloadLoadedLatency = document.getElementById(
    "measureDownloadLoadedLatency"
  ).checked;
  const measureUploadLoadedLatency = document.getElementById(
    "measureUploadLoadedLatency"
  ).checked;
  const latencyPercentile = parseFloat(
    document.getElementById("latencyPercentile").value
  );
  const bandwidthPercentile = parseFloat(
    document.getElementById("bandwidthPercentile").value
  );
  const loadedLatencyThrottle = parseInt(
    document.getElementById("loadedLatencyThrottle").value
  );
  const bandwidthMinRequestDuration = parseInt(
    document.getElementById("bandwidthMinRequestDuration").value
  );
  const downloadApiUrl = document.getElementById("downloadApiUrl").value.trim();
  const uploadApiUrl = document.getElementById("uploadApiUrl").value.trim();

  let measurements;
  switch (testMode) {
    case "quick":
      measurements = [
        { type: "latency", numPackets: 5 },
        {
          type: "download",
          bytes: 1e5,
          count: 3,
          bypassMinDuration: true,
        },
        { type: "download", bytes: 1e6, count: 3 },
        { type: "upload", bytes: 1e5, count: 3 },
        { type: "upload", bytes: 1e6, count: 3 },
      ];
      break;
    case "download-only":
      measurements = [
        { type: "latency", numPackets: 1 },
        {
          type: "download",
          bytes: 1e5,
          count: 1,
          bypassMinDuration: true,
        },
        { type: "latency", numPackets: 20 },
        { type: "download", bytes: 1e5, count: 9 },
        { type: "download", bytes: 1e6, count: 8 },
        { type: "download", bytes: 1e7, count: 6 },
        { type: "download", bytes: 2.5e7, count: 4 },
        { type: "download", bytes: 1e8, count: 3 },
      ];
      break;
    case "upload-only":
      measurements = [
        { type: "latency", numPackets: 1 },
        { type: "latency", numPackets: 20 },
        { type: "upload", bytes: 1e5, count: 8 },
        { type: "upload", bytes: 1e6, count: 6 },
        { type: "upload", bytes: 1e7, count: 4 },
        { type: "upload", bytes: 2.5e7, count: 4 },
        { type: "upload", bytes: 5e7, count: 3 },
      ];
      break;
    default:
      measurements = [
        { type: "latency", numPackets: 1 },
        {
          type: "download",
          bytes: 1e5,
          count: 1,
          bypassMinDuration: true,
        },
        { type: "latency", numPackets: 20 },
        { type: "download", bytes: 1e5, count: 9 },
        { type: "download", bytes: 1e6, count: 8 },
        { type: "upload", bytes: 1e5, count: 8 },
        { type: "upload", bytes: 1e6, count: 6 },
        { type: "download", bytes: 1e7, count: 6 },
        { type: "upload", bytes: 1e7, count: 4 },
        { type: "download", bytes: 2.5e7, count: 4 },
        { type: "upload", bytes: 2.5e7, count: 4 },
        { type: "download", bytes: 1e8, count: 3 },
        { type: "upload", bytes: 5e7, count: 3 },
        { type: "download", bytes: 2.5e8, count: 2 },
      ];
  }

  const config = {
    autoStart: true,
    measureDownloadLoadedLatency,
    measureUploadLoadedLatency,
    latencyPercentile,
    bandwidthPercentile,
    loadedLatencyThrottle,
    bandwidthMinRequestDuration,
    measurements,
  };

  if (downloadApiUrl) config.downloadApiUrl = downloadApiUrl;
  if (uploadApiUrl) config.uploadApiUrl = uploadApiUrl;

  return config;
}

// Reset settings to defaults
function resetSettings() {
  document.getElementById("testMode").value = "full";
  document.getElementById("measureDownloadLoadedLatency").checked = true;
  document.getElementById("measureUploadLoadedLatency").checked = true;
  document.getElementById("latencyPercentile").value = "0.5";
  document.getElementById("bandwidthPercentile").value = "0.9";
  document.getElementById("loadedLatencyThrottle").value = "400";
  document.getElementById("bandwidthMinRequestDuration").value = "10";
  document.getElementById("downloadApiUrl").value =
    "https://speed.cloudflare.com/__down";
  document.getElementById("uploadApiUrl").value =
    "https://speed.cloudflare.com/__up";
}

// Settings modal event listeners
settingsBtn.addEventListener("click", openSettingsModal);
closeSettingsBtn.addEventListener("click", closeSettingsModal);
modalBackdrop.addEventListener("click", closeSettingsModal);
resetSettingsBtn.addEventListener("click", resetSettings);
saveSettingsBtn.addEventListener("click", () => {
  closeSettingsModal();
  // Settings are read when test starts, no need to save separately
});

// Report modal event listeners
viewReportBtn.addEventListener("click", openReportModal);
closeReportBtn.addEventListener("click", closeReportModal);
closeReportBtn2.addEventListener("click", closeReportModal);
reportModalBackdrop.addEventListener("click", closeReportModal);

// Close modal on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!settingsModal.classList.contains("hidden")) {
      closeSettingsModal();
    }
    if (!reportModal.classList.contains("hidden")) {
      closeReportModal();
    }
  }
});

// Dark mode toggle functionality
function updateDarkModeIcon() {
  const isDark = document.documentElement.classList.contains("dark");
  darkModeIcon.textContent = isDark ? "light_mode" : "dark_mode";
}

function toggleDarkMode() {
  document.documentElement.classList.toggle("dark");
  const isDark = document.documentElement.classList.contains("dark");
  localStorage.setItem("darkMode", isDark ? "dark" : "light");
  updateDarkModeIcon();
}

// Initialize dark mode from localStorage
function initDarkMode() {
  const savedMode = localStorage.getItem("darkMode");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (savedMode === "dark" || (!savedMode && prefersDark)) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  updateDarkModeIcon();
}

darkModeToggle.addEventListener("click", toggleDarkMode);
initDarkMode();

// PDF Export Function
function exportReportToPDF() {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const tableWidth = pageWidth - margin * 2;
  const colWidth = tableWidth / 2;

  // Dark mode background
  doc.setFillColor(15, 15, 15); // Dark background
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Helper function to draw table row
  function drawTableRow(y, label, value, isHeader = false) {
    const rowHeight = 10;

    if (isHeader) {
      // Header row with colored background
      doc.setFillColor(180, 25, 35); // Darker red
      doc.rect(margin, y, tableWidth, rowHeight, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, "bold");
      doc.setFontSize(11);
      doc.text(label, margin + 3, y + 7);
    } else {
      // Data row with dark theme
      doc.setFillColor(31, 31, 31); // Dark gray for label column
      doc.rect(margin, y, colWidth, rowHeight, "F");
      doc.setFillColor(15, 15, 15); // Darker background for value column
      doc.rect(margin + colWidth, y, colWidth, rowHeight, "F");
      doc.setDrawColor(60, 60, 60); // Dark border
      doc.setLineWidth(0.3); // Thinner border
      doc.rect(margin, y, tableWidth, rowHeight, "S"); // Border
      doc.line(margin + colWidth, y, margin + colWidth, y + rowHeight); // Divider

      doc.setTextColor(255, 255, 255); // White text
      doc.setFont(undefined, "bold");
      doc.setFontSize(10);
      doc.text(label, margin + 3, y + 6.5);

      doc.setFont(undefined, "normal");
      doc.text(value, margin + colWidth + 3, y + 6.5);
    }

    return rowHeight;
  }

  // Main Header
  doc.setFillColor(180, 25, 35);
  doc.rect(0, 0, pageWidth, 35, "F");

  // Draw speedometer icon (circular gauge with needle)
  const logoX = 20;
  const logoY = 17.5;
  const logoRadius = 8;

  // Outer circle
  doc.setFillColor(255, 255, 255);
  doc.circle(logoX, logoY, logoRadius, "F");

  // Inner arc (gauge)
  doc.setFillColor(180, 25, 35);
  doc.circle(logoX, logoY, logoRadius - 1.5, "F");

  // Gauge marks
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1);
  for (let i = 0; i < 5; i++) {
    const angle = Math.PI * 0.75 + (i * Math.PI * 0.3) / 4;
    const x1 = logoX + Math.cos(angle) * (logoRadius - 2);
    const y1 = logoY + Math.sin(angle) * (logoRadius - 2);
    const x2 = logoX + Math.cos(angle) * (logoRadius - 4);
    const y2 = logoY + Math.sin(angle) * (logoRadius - 4);
    doc.line(x1, y1, x2, y2);
  }

  // Needle
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.5);
  const needleAngle = Math.PI * 1.2;
  const needleX = logoX + Math.cos(needleAngle) * (logoRadius - 3);
  const needleY = logoY + Math.sin(needleAngle) * (logoRadius - 3);
  doc.line(logoX, logoY, needleX, needleY);

  // Center dot
  doc.setFillColor(255, 255, 255);
  doc.circle(logoX, logoY, 1.5, "F");

  // Title text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont(undefined, "bold");
  doc.text("Speedtest Report by marCODES", pageWidth / 2, 15, {
    align: "center",
  });
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  const timestamp = document.getElementById("reportTimestamp").textContent;
  doc.text(timestamp, pageWidth / 2, 25, { align: "center" });

  let yPos = 40;

  // Speed Metrics Table
  yPos += drawTableRow(yPos, "SPEED METRICS", "", true);
  const downloadSpeedText = document.getElementById(
    "reportDownloadSpeed"
  ).textContent;
  const uploadSpeedText =
    document.getElementById("reportUploadSpeed").textContent;
  yPos += drawTableRow(yPos, "Download Speed", downloadSpeedText);
  yPos += drawTableRow(yPos, "Upload Speed", uploadSpeedText);

  yPos += 8; // Spacing between tables

  // Latency Metrics Table
  yPos += drawTableRow(yPos, "LATENCY METRICS", "", true);
  const latencyText = document.getElementById("reportLatency").textContent;
  const jitterText = document.getElementById("reportJitter").textContent;
  const loadedLatencyText = document.getElementById(
    "reportLoadedLatency"
  ).textContent;
  yPos += drawTableRow(yPos, "Unloaded Latency", latencyText);
  yPos += drawTableRow(yPos, "Jitter", jitterText);
  yPos += drawTableRow(yPos, "Loaded Latency", loadedLatencyText);

  yPos += 8;

  // Connection Information Table
  yPos += drawTableRow(yPos, "CONNECTION INFORMATION", "", true);
  const serverLoc = document.getElementById("reportServerLocation").textContent;
  const clientIpText = document.getElementById("reportClientIp").textContent;
  const ispText = document.getElementById("reportClientIsp").textContent;
  yPos += drawTableRow(yPos, "Server Location", serverLoc);
  yPos += drawTableRow(yPos, "Client IP Address", clientIpText);
  yPos += drawTableRow(yPos, "Internet Service Provider", ispText);

  yPos += 8;

  // Quality Scores Table
  yPos += drawTableRow(yPos, "QUALITY SCORES", "", true);
  const streamingBadgeText = document.getElementById(
    "reportStreamingBadge"
  ).textContent;
  const gamingBadgeText =
    document.getElementById("reportGamingBadge").textContent;
  const rtcBadgeText = document.getElementById("reportRtcBadge").textContent;
  yPos += drawTableRow(yPos, "Streaming Quality", streamingBadgeText);
  yPos += drawTableRow(yPos, "Gaming Quality", gamingBadgeText);
  yPos += drawTableRow(yPos, "Video Call Quality", rtcBadgeText);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150); // Lighter gray for dark mode
  const footerY = doc.internal.pageSize.getHeight() - 12;
  doc.text("© 2026 marCODES. All rights reserved.", pageWidth / 2, footerY, {
    align: "center",
  });
  doc.text("Generated from SpeedTest by marCODES", pageWidth / 2, footerY + 4, {
    align: "center",
  });

  // Save the PDF
  const dateStr = new Date().toISOString().split("T")[0];
  doc.save(`speedtest-report-${dateStr}.pdf`);
}

// Event listener for Export PDF button
exportPdfBtn.addEventListener("click", exportReportToPDF);

// Event listener for Clear History button
clearHistoryBtn.addEventListener("click", clearHistory);

// Fetch client info on load
fetchClientInfo();

// Load history on page load
loadHistory();
