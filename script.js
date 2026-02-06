// Import Cloudflare Speed Test library
import SpeedTest from "https://esm.sh/@cloudflare/speedtest@1.7.0";
import jsPDF from "https://esm.sh/jspdf@2.5.1";

// ==========================================
// Firebase Configuration
// ==========================================
// TODO: Replace with your Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyBRlUfrnqJJsssNinohGo7QxR8ZjAeXT-c",
  authDomain: "speedtest-efd44.firebaseapp.com",
  databaseURL:
    "https://speedtest-efd44-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "speedtest-efd44",
  storageBucket: "speedtest-efd44.firebasestorage.app",
  messagingSenderId: "352772397442",
  appId: "1:352772397442:web:899bd6e1c989f51d94579b",
  measurementId: "G-DSX41B1CMP",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Auth state
let currentUser = null;
let isAuthInitialized = false;

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
const historyLoading = document.getElementById("historyLoading");
const historyEmpty = document.getElementById("historyEmpty");
const historyTableContainer = document.getElementById("historyTableContainer");

// Dark mode elements
const darkModeToggle = document.getElementById("darkModeToggle");
const darkModeIcon = document.getElementById("darkModeIcon");

// Auth modal elements
const authModal = document.getElementById("authModal");
const authModalBackdrop = document.getElementById("authModalBackdrop");
const closeAuthBtn = document.getElementById("closeAuthBtn");
const authModalTitle = document.getElementById("authModalTitle");
const authError = document.getElementById("authError");
const googleSignInBtn = document.getElementById("googleSignInBtn");
const authForm = document.getElementById("authForm");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authConfirmPassword = document.getElementById("authConfirmPassword");
const confirmPasswordField = document.getElementById("confirmPasswordField");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const authSubmitText = document.getElementById("authSubmitText");
const authSubmitSpinner = document.getElementById("authSubmitSpinner");
const authToggleText = document.getElementById("authToggleText");
const authToggleBtn = document.getElementById("authToggleBtn");

// Auth UI elements
const loginBtn = document.getElementById("loginBtn");
const userMenu = document.getElementById("userMenu");
const userMenuBtn = document.getElementById("userMenuBtn");
const userAvatar = document.getElementById("userAvatar");
const userName = document.getElementById("userName");
const userDropdown = document.getElementById("userDropdown");
const userEmailDisplay = document.getElementById("userEmailDisplay");
const logoutBtn = document.getElementById("logoutBtn");

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

// ==========================================
// Firebase Auth Functions
// ==========================================
let isSignUpMode = false;

// Show auth error message
function showAuthError(message) {
  authError.textContent = message;
  authError.classList.remove("hidden");
}

// Hide auth error message
function hideAuthError() {
  authError.classList.add("hidden");
}

// Toggle between sign in and sign up modes
function toggleAuthMode() {
  isSignUpMode = !isSignUpMode;
  hideAuthError();
  authForm.reset();

  if (isSignUpMode) {
    authModalTitle.textContent = "Create Account";
    authSubmitText.textContent = "Sign Up";
    authToggleText.textContent = "Already have an account?";
    authToggleBtn.textContent = "Sign In";
    confirmPasswordField.classList.remove("hidden");
    authConfirmPassword.required = true;
  } else {
    authModalTitle.textContent = "Sign In";
    authSubmitText.textContent = "Sign In";
    authToggleText.textContent = "Don't have an account?";
    authToggleBtn.textContent = "Sign Up";
    confirmPasswordField.classList.add("hidden");
    authConfirmPassword.required = false;
  }
}

// Open auth modal
function openAuthModal() {
  authModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  hideAuthError();
}

// Close auth modal
function closeAuthModal() {
  authModal.classList.add("hidden");
  document.body.style.overflow = "";
  authForm.reset();
  hideAuthError();
  // Reset to sign in mode
  if (isSignUpMode) {
    toggleAuthMode();
  }
}

// Update UI based on auth state
function updateAuthUI(user) {
  if (user) {
    loginBtn.classList.add("hidden");
    userMenu.classList.remove("hidden");

    // Set user info
    const displayName = user.displayName || user.email.split("@")[0];
    userName.textContent = displayName;
    userEmailDisplay.textContent = user.email;

    // Set avatar
    if (user.photoURL) {
      userAvatar.src = user.photoURL;
    } else {
      // Generate a placeholder avatar with initials
      userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        displayName,
      )}&background=ea2a33&color=fff`;
    }
  } else {
    loginBtn.classList.remove("hidden");
    userMenu.classList.add("hidden");
    userDropdown.classList.add("hidden");
  }
}

// Toggle user dropdown menu
function toggleUserDropdown() {
  userDropdown.classList.toggle("hidden");
}

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (userMenu && !userMenu.contains(e.target)) {
    userDropdown.classList.add("hidden");
  }
});

// Sign in with Google
async function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
    closeAuthModal();
  } catch (error) {
    console.error("Google sign-in error:", error);
    showAuthError(getAuthErrorMessage(error.code));
  }
}

// Sign in with email and password
async function signInWithEmail(email, password) {
  try {
    await auth.signInWithEmailAndPassword(email, password);
    closeAuthModal();
  } catch (error) {
    console.error("Email sign-in error:", error);
    showAuthError(getAuthErrorMessage(error.code));
  }
}

// Sign up with email and password
async function signUpWithEmail(email, password) {
  try {
    await auth.createUserWithEmailAndPassword(email, password);
    closeAuthModal();
  } catch (error) {
    console.error("Sign-up error:", error);
    showAuthError(getAuthErrorMessage(error.code));
  }
}

// Sign out
async function signOut() {
  try {
    await auth.signOut();
    userDropdown.classList.add("hidden");
  } catch (error) {
    console.error("Sign-out error:", error);
  }
}

// Get user-friendly error messages
function getAuthErrorMessage(code) {
  const messages = {
    "auth/email-already-in-use":
      "This email is already registered. Try signing in instead.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/operation-not-allowed": "Email/password sign-in is not enabled.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/popup-closed-by-user": "Sign-in was cancelled.",
    "auth/network-request-failed":
      "Network error. Please check your connection.",
  };
  return messages[code] || "An error occurred. Please try again.";
}

// Handle auth form submission
async function handleAuthSubmit(e) {
  e.preventDefault();
  hideAuthError();

  const email = authEmail.value.trim();
  const password = authPassword.value;

  // Show loading state
  authSubmitBtn.disabled = true;
  authSubmitSpinner.classList.remove("hidden");

  if (isSignUpMode) {
    const confirmPassword = authConfirmPassword.value;
    if (password !== confirmPassword) {
      showAuthError("Passwords do not match.");
      authSubmitBtn.disabled = false;
      authSubmitSpinner.classList.add("hidden");
      return;
    }
    await signUpWithEmail(email, password);
  } else {
    await signInWithEmail(email, password);
  }

  // Reset loading state
  authSubmitBtn.disabled = false;
  authSubmitSpinner.classList.add("hidden");
}

// ==========================================
// Firestore Data Functions
// ==========================================

// Get user's history collection reference
function getUserHistoryRef() {
  if (!currentUser) return null;
  return db.collection("users").doc(currentUser.uid).collection("testHistory");
}

// Load history from Firestore
async function loadHistoryFromFirestore() {
  const historyRef = getUserHistoryRef();
  if (!historyRef) return [];

  try {
    const snapshot = await historyRef
      .orderBy("timestamp", "desc")
      .limit(50)
      .get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Failed to load history from Firestore:", error);
    return [];
  }
}

// Save single test result to Firestore
async function saveToFirestore(result) {
  const historyRef = getUserHistoryRef();
  if (!historyRef) return null;

  try {
    const docRef = await historyRef.add(result);
    return docRef.id;
  } catch (error) {
    console.error("Failed to save to Firestore:", error);
    return null;
  }
}

// Clear history from Firestore
async function clearFirestoreHistory() {
  const historyRef = getUserHistoryRef();
  if (!historyRef) return;

  try {
    const snapshot = await historyRef.get();
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  } catch (error) {
    console.error("Failed to clear Firestore history:", error);
  }
}

// Migrate localStorage data to Firestore (on first login)
async function migrateLocalStorageToFirestore() {
  const localData = localStorage.getItem("speedTestHistory");
  if (!localData) return;

  try {
    const localHistory = JSON.parse(localData);
    if (!localHistory || localHistory.length === 0) return;

    // Check if user already has data in Firestore
    const existingData = await loadHistoryFromFirestore();
    if (existingData.length > 0) {
      // User already has cloud data, clear localStorage
      localStorage.removeItem("speedTestHistory");
      console.log("User already has cloud data. Cleared localStorage.");
      return;
    }

    // Upload local data to Firestore
    const historyRef = getUserHistoryRef();
    if (!historyRef) return;

    console.log(`Migrating ${localHistory.length} test(s) to cloud...`);

    const batch = db.batch();
    localHistory.forEach((result) => {
      const docRef = historyRef.doc();
      batch.set(docRef, {
        date: result.date,
        time: result.time,
        timestamp: result.timestamp,
        download: result.download,
        upload: result.upload,
      });
    });

    await batch.commit();

    // Clear localStorage after successful migration
    localStorage.removeItem("speedTestHistory");
    console.log("Migration complete. Local data cleared.");
  } catch (error) {
    console.error("Failed to migrate data:", error);
  }
}

// ==========================================
// Device Management Functions
// ==========================================

// Store for current IP address (fetched on page load)
let currentIpAddress = null;
let userDevices = [];

// Device page DOM elements
const devicesGrid = document.getElementById("devicesGrid");
const devicesLoading = document.getElementById("devicesLoading");
const devicesEmpty = document.getElementById("devicesEmpty");
const devicesLoggedOut = document.getElementById("devicesLoggedOut");
const editDeviceModal = document.getElementById("editDeviceModal");
const editDeviceModalBackdrop = document.getElementById(
  "editDeviceModalBackdrop",
);
const closeEditDeviceBtn = document.getElementById("closeEditDeviceBtn");
const editDeviceForm = document.getElementById("editDeviceForm");
const editDeviceName = document.getElementById("editDeviceName");
const editDeviceModel = document.getElementById("editDeviceModel");
const editDeviceIp = document.getElementById("editDeviceIp");
const saveDeviceBtn = document.getElementById("saveDeviceBtn");
const deleteDeviceBtn = document.getElementById("deleteDeviceBtn");

let editingDeviceId = null;

// Get user's devices collection reference
function getUserDevicesRef() {
  if (!currentUser) return null;
  return db.collection("users").doc(currentUser.uid).collection("devices");
}

// Detect device type from user agent
function detectDeviceType() {
  const ua = navigator.userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return { type: "tablet", icon: "tablet" };
  }
  if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(ua)) {
    return { type: "mobile", icon: "smartphone" };
  }
  return { type: "desktop", icon: "computer" };
}

// Get default device name based on browser/OS
function getDefaultDeviceName() {
  const ua = navigator.userAgent;
  let browser = "Browser";
  let os = "Device";

  // Detect browser
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";

  // Detect OS
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "Mac";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  return `${browser} on ${os}`;
}

// Find or create device by IP address
async function getOrCreateDevice(ipAddress) {
  if (!currentUser || !ipAddress) return null;

  const devicesRef = getUserDevicesRef();
  if (!devicesRef) return null;

  try {
    // Check if device with this IP already exists
    const snapshot = await devicesRef.where("ipAddress", "==", ipAddress).get();

    if (!snapshot.empty) {
      // Device exists, update lastSeen
      const doc = snapshot.docs[0];
      await doc.ref.update({
        lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
      });
      return { id: doc.id, ...doc.data() };
    }

    // Create new device
    const deviceInfo = detectDeviceType();
    const newDevice = {
      ipAddress: ipAddress,
      deviceName: getDefaultDeviceName(),
      deviceModel: "",
      deviceType: deviceInfo.type,
      deviceIcon: deviceInfo.icon,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
      testCount: 0,
    };

    const docRef = await devicesRef.add(newDevice);
    console.log("New device registered:", ipAddress);
    return { id: docRef.id, ...newDevice };
  } catch (error) {
    console.error("Failed to get or create device:", error);
    return null;
  }
}

// Load all user devices
async function loadDevices() {
  if (!currentUser) {
    userDevices = [];
    return [];
  }

  const devicesRef = getUserDevicesRef();
  if (!devicesRef) return [];

  try {
    const snapshot = await devicesRef.orderBy("lastSeen", "desc").get();
    userDevices = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return userDevices;
  } catch (error) {
    console.error("Failed to load devices:", error);
    return [];
  }
}

// Update device details
async function updateDevice(deviceId, updates) {
  if (!currentUser) return false;

  const devicesRef = getUserDevicesRef();
  if (!devicesRef) return false;

  try {
    await devicesRef.doc(deviceId).update(updates);
    return true;
  } catch (error) {
    console.error("Failed to update device:", error);
    return false;
  }
}

// Delete a device
async function deleteDevice(deviceId) {
  if (!currentUser) return false;

  const devicesRef = getUserDevicesRef();
  if (!devicesRef) return false;

  try {
    await devicesRef.doc(deviceId).delete();
    return true;
  } catch (error) {
    console.error("Failed to delete device:", error);
    return false;
  }
}

// Increment device test count
async function incrementDeviceTestCount(deviceId) {
  if (!currentUser || !deviceId) return;

  const devicesRef = getUserDevicesRef();
  if (!devicesRef) return;

  try {
    await devicesRef.doc(deviceId).update({
      testCount: firebase.firestore.FieldValue.increment(1),
      lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to increment test count:", error);
  }
}

// Render devices list on devices page
function renderDevicesList() {
  if (!devicesGrid) return; // Not on devices page

  // Show appropriate state
  if (!currentUser) {
    if (devicesLoading) devicesLoading.classList.add("hidden");
    if (devicesEmpty) devicesEmpty.classList.add("hidden");
    if (devicesGrid) devicesGrid.classList.add("hidden");
    if (devicesLoggedOut) devicesLoggedOut.classList.remove("hidden");
    return;
  }

  if (devicesLoggedOut) devicesLoggedOut.classList.add("hidden");

  if (userDevices.length === 0) {
    if (devicesLoading) devicesLoading.classList.add("hidden");
    if (devicesGrid) devicesGrid.classList.add("hidden");
    if (devicesEmpty) devicesEmpty.classList.remove("hidden");
    return;
  }

  if (devicesLoading) devicesLoading.classList.add("hidden");
  if (devicesEmpty) devicesEmpty.classList.add("hidden");
  if (devicesGrid) devicesGrid.classList.remove("hidden");

  // Clear existing cards
  devicesGrid.innerHTML = "";

  // Render each device
  userDevices.forEach((device) => {
    const isCurrentDevice = device.ipAddress === currentIpAddress;
    const lastSeenDate = device.lastSeen?.toDate
      ? device.lastSeen.toDate()
      : new Date(device.lastSeen);
    const lastSeenFormatted =
      lastSeenDate.toLocaleDateString() +
      " " +
      lastSeenDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

    const card = document.createElement("div");
    card.className = `bg-surface-light dark:bg-surface-dark rounded-xl border ${
      isCurrentDevice
        ? "border-primary"
        : "border-gray-100 dark:border-gray-800"
    } shadow-sm p-6 hover:shadow-md transition-all`;
    card.innerHTML = `
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="bg-primary/10 dark:bg-primary/20 p-3 rounded-xl">
            <span class="material-symbols-outlined text-primary text-2xl">${
              device.deviceIcon || "devices"
            }</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="font-bold text-gray-900 dark:text-white truncate">${
                device.deviceName || "Unnamed Device"
              }</h3>
              ${
                isCurrentDevice
                  ? '<span class="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full">Current</span>'
                  : ""
              }
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${
              device.deviceModel || "No model specified"
            }</p>
          </div>
        </div>
        <button onclick="openEditDeviceModal('${
          device.id
        }')" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
          <span class="material-symbols-outlined text-gray-500 text-xl">edit</span>
        </button>
      </div>
      <div class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-4">
        <div>
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">IP Address</p>
          <p class="text-sm font-medium text-gray-900 dark:text-white mt-1 font-mono">${
            device.ipAddress
          }</p>
        </div>
        <div>
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tests Run</p>
          <p class="text-sm font-medium text-gray-900 dark:text-white mt-1">${
            device.testCount || 0
          }</p>
        </div>
      </div>
      <div class="mt-3 text-xs text-gray-400 dark:text-gray-500">
        Last seen: ${lastSeenFormatted}
      </div>
    `;
    devicesGrid.appendChild(card);
  });
}

// Open edit device modal
window.openEditDeviceModal = function (deviceId) {
  const device = userDevices.find((d) => d.id === deviceId);
  if (!device || !editDeviceModal) return;

  editingDeviceId = deviceId;
  if (editDeviceName) editDeviceName.value = device.deviceName || "";
  if (editDeviceModel) editDeviceModel.value = device.deviceModel || "";
  if (editDeviceIp) editDeviceIp.textContent = device.ipAddress;

  editDeviceModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
};

// Close edit device modal
function closeEditDeviceModal() {
  if (!editDeviceModal) return;
  editDeviceModal.classList.add("hidden");
  document.body.style.overflow = "";
  editingDeviceId = null;
}

// Save device changes
async function saveDeviceChanges(e) {
  if (e) e.preventDefault();
  if (!editingDeviceId) return;

  const updates = {
    deviceName: editDeviceName?.value?.trim() || "Unnamed Device",
    deviceModel: editDeviceModel?.value?.trim() || "",
  };

  if (saveDeviceBtn) {
    saveDeviceBtn.disabled = true;
    saveDeviceBtn.innerHTML =
      '<span class="material-symbols-outlined animate-spin text-lg">progress_activity</span> Saving...';
  }

  const success = await updateDevice(editingDeviceId, updates);

  if (success) {
    // Update local array
    const deviceIndex = userDevices.findIndex((d) => d.id === editingDeviceId);
    if (deviceIndex !== -1) {
      userDevices[deviceIndex] = { ...userDevices[deviceIndex], ...updates };
    }
    renderDevicesList();
    closeEditDeviceModal();
  } else {
    alert("Failed to save changes. Please try again.");
  }

  if (saveDeviceBtn) {
    saveDeviceBtn.disabled = false;
    saveDeviceBtn.innerHTML =
      '<span class="material-symbols-outlined text-lg">save</span> Save Changes';
  }
}

// Delete device with confirmation
async function confirmDeleteDevice() {
  if (!editingDeviceId) return;

  const device = userDevices.find((d) => d.id === editingDeviceId);
  if (
    !confirm(
      `Are you sure you want to delete "${
        device?.deviceName || "this device"
      }"? This action cannot be undone.`,
    )
  ) {
    return;
  }

  if (deleteDeviceBtn) {
    deleteDeviceBtn.disabled = true;
    deleteDeviceBtn.innerHTML =
      '<span class="material-symbols-outlined animate-spin text-lg">progress_activity</span>';
  }

  const success = await deleteDevice(editingDeviceId);

  if (success) {
    userDevices = userDevices.filter((d) => d.id !== editingDeviceId);
    renderDevicesList();
    closeEditDeviceModal();
  } else {
    alert("Failed to delete device. Please try again.");
  }

  if (deleteDeviceBtn) {
    deleteDeviceBtn.disabled = false;
    deleteDeviceBtn.innerHTML =
      '<span class="material-symbols-outlined text-lg">delete</span>';
  }
}

// Device modal event listeners
if (closeEditDeviceBtn) {
  closeEditDeviceBtn.addEventListener("click", closeEditDeviceModal);
}
if (editDeviceModalBackdrop) {
  editDeviceModalBackdrop.addEventListener("click", closeEditDeviceModal);
}
if (editDeviceForm) {
  editDeviceForm.addEventListener("submit", saveDeviceChanges);
}
if (deleteDeviceBtn) {
  deleteDeviceBtn.addEventListener("click", confirmDeleteDevice);
}

// ==========================================
// History Management (Unified)
// ==========================================

// Load test history (from Firestore if logged in, else localStorage)
async function loadHistory() {
  if (currentUser) {
    // Load from Firestore
    testHistory = await loadHistoryFromFirestore();
    // Also load devices to display device names in history
    await loadDevices();
  } else {
    // Load from localStorage
    const saved = localStorage.getItem("speedTestHistory");
    if (saved) {
      try {
        testHistory = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load history:", e);
        testHistory = [];
      }
    } else {
      testHistory = [];
    }
  }
  renderHistoryTable();
}

// Save test history to localStorage (only when logged out)
function saveHistory() {
  if (!currentUser) {
    localStorage.setItem("speedTestHistory", JSON.stringify(testHistory));
  }
}

// Add test result to history
async function addToHistory(downloadSpeed, uploadSpeed) {
  const now = new Date();
  const result = {
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString(),
    timestamp: now.getTime(),
    download: parseFloat(downloadSpeed) || 0,
    upload: parseFloat(uploadSpeed) || 0,
    ipAddress: currentIpAddress || null,
    deviceId: null,
  };

  if (currentUser) {
    // Register/update device and link test to it
    if (currentIpAddress) {
      const device = await getOrCreateDevice(currentIpAddress);
      if (device) {
        result.deviceId = device.id;
        await incrementDeviceTestCount(device.id);
      }
    }

    // Save to Firestore
    const docId = await saveToFirestore(result);
    if (docId) {
      result.id = docId;
    }
  }

  testHistory.unshift(result); // Add to beginning
  if (testHistory.length > 50) {
    testHistory = testHistory.slice(0, 50); // Keep last 50 tests
  }

  saveHistory(); // Only saves to localStorage if not logged in
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
  // Guard clause: Check if required DOM elements exist (they only exist on history.html)
  if (!historyTableBody) {
    return; // Exit silently if we're not on the history page
  }

  // Hide loading state
  if (historyLoading) historyLoading.classList.add("hidden");

  if (testHistory.length === 0) {
    // Show empty state, hide table
    if (historyEmpty) historyEmpty.classList.remove("hidden");
    if (historyTableContainer) historyTableContainer.classList.add("hidden");
    return;
  }

  // Show table, hide empty state
  if (historyEmpty) historyEmpty.classList.add("hidden");
  if (historyTableContainer) historyTableContainer.classList.remove("hidden");

  // Clear existing rows
  historyTableBody.innerHTML = "";

  // Calculate stats
  const downloads = testHistory.map((t) => t.download);
  const uploads = testHistory.map((t) => t.upload);
  const highestDownload = Math.max(...downloads);
  const lowestDownload = Math.min(...downloads.filter((d) => d > 0));
  const highestUpload = Math.max(...uploads);
  const lowestUpload = Math.min(...uploads.filter((u) => u > 0));

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

    // Look up device name from userDevices array
    let deviceName = "—";
    if (test.deviceId && userDevices.length > 0) {
      const device = userDevices.find((d) => d.id === test.deviceId);
      if (device) {
        deviceName = device.deviceName || "Unnamed Device";
      }
    }

    row.innerHTML = `
      <td class="px-4 py-3 text-sm text-gray-900 dark:text-white">${
        test.date
      }</td>
      <td class="px-4 py-3 text-sm text-gray-900 dark:text-white">${
        test.time
      }</td>
      <td class="px-4 py-3 text-sm text-gray-900 dark:text-white">${deviceName}</td>
      <td class="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white tabular-nums">${test.download.toFixed(
        1,
      )} Mbps</td>
      <td class="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white tabular-nums">${test.upload.toFixed(
        1,
      )} Mbps</td>
      <td class="px-4 py-3 text-sm font-semibold tabular-nums ${getComparisonClass(
        avgSpeed,
        prevAvgSpeed,
      )}">
        ${calculateComparison(avgSpeed, prevAvgSpeed)}
      </td>
      <td class="px-4 py-3 text-sm font-semibold tabular-nums ${getComparisonClass(
        avgSpeed,
        (highestDownload + highestUpload) / 2,
      )}">
        ${calculateComparison(avgSpeed, (highestDownload + highestUpload) / 2)}
      </td>
      <td class="px-4 py-3 text-sm font-semibold tabular-nums ${getComparisonClass(
        avgSpeed,
        (lowestDownload + lowestUpload) / 2,
      )}">
        ${calculateComparison(avgSpeed, (lowestDownload + lowestUpload) / 2)}
      </td>
    `;

    historyTableBody.appendChild(row);
  });
}

// Clear history
async function clearHistory() {
  if (confirm("Are you sure you want to clear all test history?")) {
    if (currentUser) {
      // Clear from Firestore
      await clearFirestoreHistory();
    }
    testHistory = [];
    saveHistory(); // Clear localStorage if not logged in
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
  if (down && downloadSpeed) {
    downloadSpeed.textContent = formatSpeed(down);
    const downPercent = Math.min((down / 1_000_000_000) * 100, 100);
    if (downloadProgress) downloadProgress.style.width = `${downPercent}%`;
  }

  const up = results.getUploadBandwidth();
  if (up && uploadSpeed) {
    uploadSpeed.textContent = formatSpeed(up);
    const upPercent = Math.min((up / 500_000_000) * 100, 100);
    if (uploadProgress) uploadProgress.style.width = `${upPercent}%`;
  }

  const lat = results.getUnloadedLatency();
  if (lat && latency) latency.textContent = formatLatency(lat);

  const jit = results.getUnloadedJitter();
  if (jit && jitter) jitter.textContent = formatLatency(jit);

  const downLoadedLat = results.getDownLoadedLatency();
  if (downLoadedLat && loadedLatency)
    loadedLatency.textContent = formatLatency(downLoadedLat);

  const summary = results.getSummary();
  if (summary?.serverLocations?.length > 0 && serverLocation) {
    serverLocation.textContent = summary.serverLocations.join(", ");
  }
  // Update client info from speed test if available
  if (summary?.clientIp && clientIp && clientIp.textContent === "—") {
    clientIp.textContent = summary.clientIp;
  }
  if (summary?.asOrganization && clientIsp) {
    clientIsp.textContent = summary.asOrganization;
  }
}

// Update quality scores
function updateScores() {
  if (!speedTest?.results) return;
  const scores = speedTest.results.getScores();
  if (!scores) return;

  if (scores.streaming !== undefined && streamingBadge && streamingDesc) {
    const rating = getQualityRating(scores.streaming.points);
    streamingBadge.textContent = rating.label;
    streamingBadge.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${rating.class}`;
    streamingDesc.textContent = getStreamingDesc(scores.streaming.points);
  }

  if (scores.gaming !== undefined && gamingBadge && gamingDesc) {
    const rating = getQualityRating(scores.gaming.points);
    gamingBadge.textContent = rating.label;
    gamingBadge.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${rating.class}`;
    gamingDesc.textContent = getGamingDesc(scores.gaming.points);
  }

  if (scores.rtc !== undefined && rtcBadge && rtcDesc) {
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

      // Store IP address globally for device tracking
      if (info.ip) {
        currentIpAddress = info.ip;
      }

      // Update UI elements if they exist (index page only)
      if (info.ip && clientIp) clientIp.textContent = info.ip;
      if (info.isp && clientIsp) clientIsp.textContent = info.isp;
      if (info.location && serverLocation)
        serverLocation.textContent = info.location;

      console.log("✓ Client info loaded from:", api.url);
      return; // Success, exit
    } catch (e) {
      console.log(`✗ ${api.url}:`, e.message);
    }
  }

  console.log(
    "All APIs failed. Info will be populated from speed test results.",
  );
}

// Reset UI to initial state
function resetUI() {
  if (downloadSpeed) downloadSpeed.textContent = "—";
  if (uploadSpeed) uploadSpeed.textContent = "—";
  if (downloadProgress) downloadProgress.style.width = "0%";
  if (uploadProgress) uploadProgress.style.width = "0%";
  if (latency) latency.textContent = "—";
  if (jitter) jitter.textContent = "—";
  if (loadedLatency) loadedLatency.textContent = "—";

  if (streamingBadge) {
    streamingBadge.textContent = "—";
    streamingBadge.className =
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  }
  if (streamingDesc) {
    streamingDesc.textContent = "Run a test to see your streaming quality.";
  }

  if (gamingBadge) {
    gamingBadge.textContent = "—";
    gamingBadge.className =
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  }
  if (gamingDesc) {
    gamingDesc.textContent = "Run a test to see your gaming quality.";
  }

  if (rtcBadge) {
    rtcBadge.textContent = "—";
    rtcBadge.className =
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  }
  if (rtcDesc) {
    rtcDesc.textContent = "Run a test to see your video call quality.";
  }
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
        (summary.upload / 1_000_000).toFixed(1),
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

// Event listeners (only if elements exist on this page)
if (startBtn) {
  startBtn.addEventListener("click", startSpeedTest);
}

// Copy server location
if (copyServerLocation) {
  copyServerLocation.addEventListener("click", (e) => {
    e.stopPropagation();
    const text = serverLocation.textContent;
    if (text && text !== "—") {
      copyToClipboard(text, copyServerLocation);
    }
  });
}

// Copy client IP
if (copyClientIp) {
  copyClientIp.addEventListener("click", (e) => {
    e.stopPropagation();
    const text = clientIp.textContent;
    if (text && text !== "—") {
      copyToClipboard(text, copyClientIp);
    }
  });
}

// Copy ISP
if (copyIsp) {
  copyIsp.addEventListener("click", (e) => {
    e.stopPropagation();
    const text = clientIsp.textContent;
    if (text && text !== "—") {
      copyToClipboard(text, copyIsp);
    }
  });
}

// ==========================================
// Settings Management with localStorage
// ==========================================

// Default settings configuration
const DEFAULT_SETTINGS = {
  testMode: "full",
  measureDownloadLoadedLatency: true,
  measureUploadLoadedLatency: true,
  latencyPercentile: 0.5,
  bandwidthPercentile: 0.9,
  loadedLatencyThrottle: 400,
  bandwidthMinRequestDuration: 10,
  downloadApiUrl: "https://speed.cloudflare.com/__down",
  uploadApiUrl: "https://speed.cloudflare.com/__up",
};

// Load settings from localStorage
function loadSettingsFromLocalStorage() {
  try {
    const savedSettings = localStorage.getItem("speedTestSettings");
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      // Validate and merge with defaults
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error("Error loading settings from localStorage:", error);
  }
  return { ...DEFAULT_SETTINGS };
}

// Save settings to localStorage
function saveSettingsToLocalStorage(settings) {
  try {
    // Validate settings before saving
    const validatedSettings = validateSettings(settings);
    localStorage.setItem(
      "speedTestSettings",
      JSON.stringify(validatedSettings),
    );

    // If user is logged in, sync to Firebase
    if (currentUser) {
      syncSettingsToFirebase(validatedSettings);
    }

    return true;
  } catch (error) {
    console.error("Error saving settings to localStorage:", error);
    return false;
  }
}

// Validate settings to ensure they're within acceptable ranges
function validateSettings(settings) {
  const validated = { ...settings };

  // Validate percentiles (0-1 range)
  if (validated.latencyPercentile < 0 || validated.latencyPercentile > 1) {
    validated.latencyPercentile = DEFAULT_SETTINGS.latencyPercentile;
  }
  if (validated.bandwidthPercentile < 0 || validated.bandwidthPercentile > 1) {
    validated.bandwidthPercentile = DEFAULT_SETTINGS.bandwidthPercentile;
  }

  // Validate throttle (100-2000ms)
  if (
    validated.loadedLatencyThrottle < 100 ||
    validated.loadedLatencyThrottle > 2000
  ) {
    validated.loadedLatencyThrottle = DEFAULT_SETTINGS.loadedLatencyThrottle;
  }

  // Validate min request duration (1-100ms)
  if (
    validated.bandwidthMinRequestDuration < 1 ||
    validated.bandwidthMinRequestDuration > 100
  ) {
    validated.bandwidthMinRequestDuration =
      DEFAULT_SETTINGS.bandwidthMinRequestDuration;
  }

  // Validate test mode
  const validModes = ["full", "quick", "download-only", "upload-only"];
  if (!validModes.includes(validated.testMode)) {
    validated.testMode = DEFAULT_SETTINGS.testMode;
  }

  // Validate URLs (basic check)
  if (
    !validated.downloadApiUrl ||
    !validated.downloadApiUrl.startsWith("http")
  ) {
    validated.downloadApiUrl = DEFAULT_SETTINGS.downloadApiUrl;
  }
  if (!validated.uploadApiUrl || !validated.uploadApiUrl.startsWith("http")) {
    validated.uploadApiUrl = DEFAULT_SETTINGS.uploadApiUrl;
  }

  // Ensure boolean values
  validated.measureDownloadLoadedLatency = Boolean(
    validated.measureDownloadLoadedLatency,
  );
  validated.measureUploadLoadedLatency = Boolean(
    validated.measureUploadLoadedLatency,
  );

  return validated;
}

// Sync settings to Firebase for logged-in users
async function syncSettingsToFirebase(settings) {
  if (!currentUser) return;

  try {
    await db.collection("userSettings").doc(currentUser.uid).set(
      {
        settings: settings,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    console.log("Settings synced to Firebase");
  } catch (error) {
    console.error("Error syncing settings to Firebase:", error);
  }
}

// Load settings from Firebase for logged-in users
async function loadSettingsFromFirebase() {
  if (!currentUser) return null;

  try {
    const doc = await db.collection("userSettings").doc(currentUser.uid).get();
    if (doc.exists && doc.data().settings) {
      return doc.data().settings;
    }
  } catch (error) {
    console.error("Error loading settings from Firebase:", error);
  }
  return null;
}

// Initialize settings on page load
async function initializeSettings() {
  let settings = loadSettingsFromLocalStorage();

  // If user is logged in, try to load from Firebase
  if (currentUser) {
    const firebaseSettings = await loadSettingsFromFirebase();
    if (firebaseSettings) {
      settings = { ...settings, ...firebaseSettings };
      // Update localStorage with Firebase settings
      saveSettingsToLocalStorage(settings);
    }
  }

  return settings;
}

// Settings modal functions (deprecated - kept for backward compatibility)
function openSettingsModal() {
  // Redirect to settings page instead
  window.location.href = "settings.html";
}

function closeSettingsModal() {
  // No longer needed - kept for compatibility
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
    document.getElementById("reportTimestamp").textContent =
      `Test completed on ${now.toLocaleString()}`;
  } else {
    document.getElementById("reportTimestamp").textContent =
      "Test not completed yet";
  }
}

// Get settings from localStorage (with fallback to defaults)
function getSettings() {
  // Load settings from localStorage
  const savedSettings = loadSettingsFromLocalStorage();

  const testMode = savedSettings.testMode;
  const measureDownloadLoadedLatency =
    savedSettings.measureDownloadLoadedLatency;
  const measureUploadLoadedLatency = savedSettings.measureUploadLoadedLatency;
  const latencyPercentile = savedSettings.latencyPercentile;
  const bandwidthPercentile = savedSettings.bandwidthPercentile;
  const loadedLatencyThrottle = savedSettings.loadedLatencyThrottle;
  const bandwidthMinRequestDuration = savedSettings.bandwidthMinRequestDuration;
  const downloadApiUrl = savedSettings.downloadApiUrl;
  const uploadApiUrl = savedSettings.uploadApiUrl;

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

// Reset settings to defaults (now also updates localStorage)
function resetSettings() {
  saveSettingsToLocalStorage(DEFAULT_SETTINGS);

  // Update form fields if they exist (for settings page)
  const testModeEl = document.getElementById("testMode");
  const measureDownloadEl = document.getElementById(
    "measureDownloadLoadedLatency",
  );
  const measureUploadEl = document.getElementById("measureUploadLoadedLatency");
  const latencyPercentileEl = document.getElementById("latencyPercentile");
  const bandwidthPercentileEl = document.getElementById("bandwidthPercentile");
  const loadedLatencyThrottleEl = document.getElementById(
    "loadedLatencyThrottle",
  );
  const bandwidthMinRequestDurationEl = document.getElementById(
    "bandwidthMinRequestDuration",
  );
  const downloadApiUrlEl = document.getElementById("downloadApiUrl");
  const uploadApiUrlEl = document.getElementById("uploadApiUrl");

  if (testModeEl) testModeEl.value = DEFAULT_SETTINGS.testMode;
  if (measureDownloadEl)
    measureDownloadEl.checked = DEFAULT_SETTINGS.measureDownloadLoadedLatency;
  if (measureUploadEl)
    measureUploadEl.checked = DEFAULT_SETTINGS.measureUploadLoadedLatency;
  if (latencyPercentileEl)
    latencyPercentileEl.value = DEFAULT_SETTINGS.latencyPercentile;
  if (bandwidthPercentileEl)
    bandwidthPercentileEl.value = DEFAULT_SETTINGS.bandwidthPercentile;
  if (loadedLatencyThrottleEl)
    loadedLatencyThrottleEl.value = DEFAULT_SETTINGS.loadedLatencyThrottle;
  if (bandwidthMinRequestDurationEl)
    bandwidthMinRequestDurationEl.value =
      DEFAULT_SETTINGS.bandwidthMinRequestDuration;
  if (downloadApiUrlEl)
    downloadApiUrlEl.value = DEFAULT_SETTINGS.downloadApiUrl;
  if (uploadApiUrlEl) uploadApiUrlEl.value = DEFAULT_SETTINGS.uploadApiUrl;

  return true;
}

// Settings modal event listeners
if (settingsBtn) {
  settingsBtn.addEventListener("click", openSettingsModal);
}
if (closeSettingsBtn) {
  closeSettingsBtn.addEventListener("click", closeSettingsModal);
}
if (modalBackdrop) {
  modalBackdrop.addEventListener("click", closeSettingsModal);
}
if (resetSettingsBtn) {
  resetSettingsBtn.addEventListener("click", resetSettings);
}
if (saveSettingsBtn) {
  saveSettingsBtn.addEventListener("click", () => {
    closeSettingsModal();
    // Settings are read when test starts, no need to save separately
  });
}

// Report modal event listeners
if (viewReportBtn) {
  viewReportBtn.addEventListener("click", openReportModal);
}
if (closeReportBtn) {
  closeReportBtn.addEventListener("click", closeReportModal);
}
if (closeReportBtn2) {
  closeReportBtn2.addEventListener("click", closeReportModal);
}
if (reportModalBackdrop) {
  reportModalBackdrop.addEventListener("click", closeReportModal);
}

// Close modal on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (settingsModal && !settingsModal.classList.contains("hidden")) {
      closeSettingsModal();
    }
    if (reportModal && !reportModal.classList.contains("hidden")) {
      closeReportModal();
    }
  }
});

// Dark mode toggle functionality
function updateDarkModeIcon() {
  const isDark = document.documentElement.classList.contains("dark");
  if (darkModeIcon) {
    darkModeIcon.textContent = isDark ? "light_mode" : "dark_mode";
  }
}

function toggleDarkMode() {
  document.documentElement.classList.toggle("dark");
  const isDark = document.documentElement.classList.contains("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  updateDarkModeIcon();
}

// Initialize dark mode from localStorage
function initDarkMode() {
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  updateDarkModeIcon();
}

if (darkModeToggle) {
  darkModeToggle.addEventListener("click", toggleDarkMode);
}
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
    "reportDownloadSpeed",
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
    "reportLoadedLatency",
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
    "reportStreamingBadge",
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
if (exportPdfBtn) {
  exportPdfBtn.addEventListener("click", exportReportToPDF);
}

// Event listener for Clear History button
if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener("click", clearHistory);
}

// ==========================================
// Auth Event Listeners
// ==========================================

// Login button opens auth modal
if (loginBtn) {
  loginBtn.addEventListener("click", openAuthModal);
}

// Close auth modal
if (closeAuthBtn) {
  closeAuthBtn.addEventListener("click", closeAuthModal);
}
if (authModalBackdrop) {
  authModalBackdrop.addEventListener("click", closeAuthModal);
}

// Toggle sign in/sign up mode
if (authToggleBtn) {
  authToggleBtn.addEventListener("click", toggleAuthMode);
}

// Google sign in
if (googleSignInBtn) {
  googleSignInBtn.addEventListener("click", signInWithGoogle);
}

// Email/password form submission
if (authForm) {
  authForm.addEventListener("submit", handleAuthSubmit);
}

// User menu toggle
if (userMenuBtn) {
  userMenuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleUserDropdown();
  });
}

// Logout button
if (logoutBtn) {
  logoutBtn.addEventListener("click", signOut);
}

// ==========================================
// Firebase Auth State Listener
// ==========================================
auth.onAuthStateChanged(async (user) => {
  currentUser = user;
  updateAuthUI(user);

  if (user && !isAuthInitialized) {
    // First login - migrate localStorage data
    await migrateLocalStorageToFirestore();
    isAuthInitialized = true;
  }

  // Reload history based on auth state (only if we're on a page with history table)
  if (historyTableBody) {
    // Show loading state first
    if (historyLoading) historyLoading.classList.remove("hidden");
    if (historyEmpty) historyEmpty.classList.add("hidden");
    if (historyTableContainer) historyTableContainer.classList.add("hidden");
    await loadHistory();
  }

  // Load and render devices (for devices page)
  if (devicesGrid) {
    if (devicesLoading) devicesLoading.classList.remove("hidden");
    await loadDevices();
    renderDevicesList();
  }
});

// Fetch client info on load
fetchClientInfo();

// ==========================================
// Settings Page Initialization
// ==========================================

// Check if we're on the settings page
const isSettingsPage = window.location.pathname.includes("settings.html");

if (isSettingsPage) {
  // Initialize settings page
  initializeSettingsPage();
}

async function initializeSettingsPage() {
  // Load current settings
  const settings = await initializeSettings();

  // Populate form fields
  populateSettingsForm(settings);

  // Add event listeners for settings form
  setupSettingsPageListeners();
}

function populateSettingsForm(settings) {
  const testModeEl = document.getElementById("testMode");
  const measureDownloadEl = document.getElementById(
    "measureDownloadLoadedLatency",
  );
  const measureUploadEl = document.getElementById("measureUploadLoadedLatency");
  const latencyPercentileEl = document.getElementById("latencyPercentile");
  const bandwidthPercentileEl = document.getElementById("bandwidthPercentile");
  const loadedLatencyThrottleEl = document.getElementById(
    "loadedLatencyThrottle",
  );
  const bandwidthMinRequestDurationEl = document.getElementById(
    "bandwidthMinRequestDuration",
  );
  const downloadApiUrlEl = document.getElementById("downloadApiUrl");
  const uploadApiUrlEl = document.getElementById("uploadApiUrl");

  if (testModeEl) testModeEl.value = settings.testMode;
  if (measureDownloadEl)
    measureDownloadEl.checked = settings.measureDownloadLoadedLatency;
  if (measureUploadEl)
    measureUploadEl.checked = settings.measureUploadLoadedLatency;
  if (latencyPercentileEl)
    latencyPercentileEl.value = settings.latencyPercentile;
  if (bandwidthPercentileEl)
    bandwidthPercentileEl.value = settings.bandwidthPercentile;
  if (loadedLatencyThrottleEl)
    loadedLatencyThrottleEl.value = settings.loadedLatencyThrottle;
  if (bandwidthMinRequestDurationEl)
    bandwidthMinRequestDurationEl.value = settings.bandwidthMinRequestDuration;
  if (downloadApiUrlEl) downloadApiUrlEl.value = settings.downloadApiUrl;
  if (uploadApiUrlEl) uploadApiUrlEl.value = settings.uploadApiUrl;
}

function setupSettingsPageListeners() {
  const resetBtn = document.getElementById("resetSettingsBtn");
  const saveBtn = document.getElementById("saveSettingsBtn");

  // Auto-save on change
  const formInputs = [
    "testMode",
    "measureDownloadLoadedLatency",
    "measureUploadLoadedLatency",
    "latencyPercentile",
    "bandwidthPercentile",
    "loadedLatencyThrottle",
    "bandwidthMinRequestDuration",
    "downloadApiUrl",
    "uploadApiUrl",
  ];

  formInputs.forEach((inputId) => {
    const element = document.getElementById(inputId);
    if (element) {
      element.addEventListener("change", () => {
        saveCurrentSettings();
      });
    }
  });

  // Reset button
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to reset all settings to defaults?")) {
        resetSettings();
        showSettingsFeedback("Settings reset to defaults", "success");
      }
    });
  }

  // Save button (manual save with feedback)
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      if (saveCurrentSettings()) {
        showSettingsFeedback("Settings saved successfully!", "success");
      } else {
        showSettingsFeedback(
          "Error saving settings. Please check your inputs.",
          "error",
        );
      }
    });
  }
}

function saveCurrentSettings() {
  const testModeEl = document.getElementById("testMode");
  const measureDownloadEl = document.getElementById(
    "measureDownloadLoadedLatency",
  );
  const measureUploadEl = document.getElementById("measureUploadLoadedLatency");
  const latencyPercentileEl = document.getElementById("latencyPercentile");
  const bandwidthPercentileEl = document.getElementById("bandwidthPercentile");
  const loadedLatencyThrottleEl = document.getElementById(
    "loadedLatencyThrottle",
  );
  const bandwidthMinRequestDurationEl = document.getElementById(
    "bandwidthMinRequestDuration",
  );
  const downloadApiUrlEl = document.getElementById("downloadApiUrl");
  const uploadApiUrlEl = document.getElementById("uploadApiUrl");

  const settings = {
    testMode: testModeEl ? testModeEl.value : DEFAULT_SETTINGS.testMode,
    measureDownloadLoadedLatency: measureDownloadEl
      ? measureDownloadEl.checked
      : DEFAULT_SETTINGS.measureDownloadLoadedLatency,
    measureUploadLoadedLatency: measureUploadEl
      ? measureUploadEl.checked
      : DEFAULT_SETTINGS.measureUploadLoadedLatency,
    latencyPercentile: latencyPercentileEl
      ? parseFloat(latencyPercentileEl.value)
      : DEFAULT_SETTINGS.latencyPercentile,
    bandwidthPercentile: bandwidthPercentileEl
      ? parseFloat(bandwidthPercentileEl.value)
      : DEFAULT_SETTINGS.bandwidthPercentile,
    loadedLatencyThrottle: loadedLatencyThrottleEl
      ? parseInt(loadedLatencyThrottleEl.value)
      : DEFAULT_SETTINGS.loadedLatencyThrottle,
    bandwidthMinRequestDuration: bandwidthMinRequestDurationEl
      ? parseInt(bandwidthMinRequestDurationEl.value)
      : DEFAULT_SETTINGS.bandwidthMinRequestDuration,
    downloadApiUrl: downloadApiUrlEl
      ? downloadApiUrlEl.value.trim()
      : DEFAULT_SETTINGS.downloadApiUrl,
    uploadApiUrl: uploadApiUrlEl
      ? uploadApiUrlEl.value.trim()
      : DEFAULT_SETTINGS.uploadApiUrl,
  };

  return saveSettingsToLocalStorage(settings);
}

function showSettingsFeedback(message, type = "success") {
  // Create or get feedback element
  let feedback = document.getElementById("settingsFeedback");

  if (!feedback) {
    feedback = document.createElement("div");
    feedback.id = "settingsFeedback";
    feedback.className =
      "fixed bottom-6 right-6 px-6 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2 transition-all transform translate-y-20 opacity-0";
    document.body.appendChild(feedback);
  }

  // Set message and styling based on type
  if (type === "success") {
    feedback.className =
      "fixed bottom-6 right-6 px-6 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2 transition-all bg-green-500 text-white";
    feedback.innerHTML = `
      <span class="material-symbols-outlined">check_circle</span>
      <span>${message}</span>
    `;
  } else {
    feedback.className =
      "fixed bottom-6 right-6 px-6 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2 transition-all bg-red-500 text-white";
    feedback.innerHTML = `
      <span class="material-symbols-outlined">error</span>
      <span>${message}</span>
    `;
  }

  // Animate in
  setTimeout(() => {
    feedback.style.transform = "translateY(0)";
    feedback.style.opacity = "1";
  }, 10);

  // Animate out after 3 seconds
  setTimeout(() => {
    feedback.style.transform = "translateY(20px)";
    feedback.style.opacity = "0";
  }, 3000);
}
