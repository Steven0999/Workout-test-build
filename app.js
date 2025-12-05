// ---------- Firebase Setup ----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    signInAnonymously,
    signInWithCustomToken,
    onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

setLogLevel("Debug");

// Environment variables
const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
const firebaseConfig =
    typeof __firebase_config !== "undefined"
        ? JSON.parse(__firebase_config)
        : {};
const initialAuthToken =
    typeof __initial_auth_token !== "undefined"
        ? __initial_auth_token
        : null;

let db = null;
let auth = null;
let userId = null;

// ---------- Initialize Firebase ----------
if (Object.keys(firebaseConfig).length > 0) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    const setupAuth = async () => {
        try {
            if (initialAuthToken) {
                await signInWithCustomToken(auth, initialAuthToken);
            } else {
                await signInAnonymously(auth);
            }
        } catch (error) {
            console.error("Firebase Auth failed:", error);
        }
    };

    onAuthStateChanged(auth, (user) => {
        userId = user ? user.uid : null;
        console.log("User authenticated:", userId);
        initApp();
    });

    setupAuth();
} else {
    console.warn("No Firebase config. Running locally.");
    initApp();
}

// ---------- App State ----------
let currentView = "home";
let measurementsData = [];

const VIEWS = {
    home: { name: "Home", icon: homeIcon() },
    workouts: { name: "Workouts", icon: workoutIcon() },
    "meal-plans": { name: "Meal Plans", icon: mealIcon() },
    measurements: { name: "Measurements", icon: measurementIcon() },
};

const BODY_PARTS = [
    "Shoulders",
    "Chest",
    "Lats",
    "Torso",
    "Hips",
    "Glutes",
    "Biceps L & R",
    "Triceps L & R",
    "Upper Legs L & R",
    "Calves L & R",
];

// ---------- Change View ----------
window.setView = (view) => {
    currentView = view;
    renderApp();
};

// ---------- Render Functions ----------
function renderHomeView() {
    return `
        <div class="space-y-6">
            <div class="bg-primary-dark text-white p-6 rounded-xl shadow-lg">
                <h2 class="text-xl font-semibold mb-2">Welcome Back!</h2>
                <p>Track your fitness journey. Navigate using the buttons below.</p>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div class="bg-white p-4 rounded-xl shadow-md border-l-4 border-primary">
                    <p class="font-medium text-lg">Workouts Log</p>
                    <p class="text-gray-500 text-sm">Review your session history.</p>
                </div>
                <div class="bg-white p-4 rounded-xl shadow-md border-l-4 border-secondary">
                    <p class="font-medium text-lg">Meal Summary</p>
                    <p class="text-gray-500 text-sm">Check your calorie intake.</p>
                </div>
                <div class="bg-white p-4 rounded-xl shadow-md border-l-4 border-blue-500">
                    <p class="font-medium text-lg">Body Progress</p>
                    <p class="text-gray-500 text-sm">View measurement changes.</p>
                </div>
            </div>

            ${userId ? `<p class="text-xs text-center text-gray-400 mt-4">User ID: ${userId}</p>` : ""}
        </div>
    `;
}

function renderPlaceholderView(title) {
    return `
        <div class="p-6 bg-white rounded-xl shadow-lg text-center">
            <h2 class="text-2xl font-bold text-primary mb-4">${title}</h2>
            <p class="text-gray-600">This area is under development.</p>
        </div>
    `;
}

function renderMeasurementsView() {
    const today = new Date().toISOString().split("T")[0];

    return `
        <div class="space-y-8">
            <h2 class="text-2xl font-bold text-primary border-b pb-2 mb-6">Body Measurements Log</h2>

            <!-- Photo Upload -->
            <div class="bg-white p-5 rounded-xl shadow-md border-t-4 border-blue-500">
                <h3 class="text-xl font-semibold mb-3">Progress Photos</h3>
                <input type="file" id="photo-upload" accept="image/*" multiple class="block w-full">
                <div id="photo-preview" class="grid grid-cols-2 gap-2 mt-4"></div>
            </div>

            <!-- Measurement Input -->
            <div class="bg-white p-5 rounded-xl shadow-md border-t-4 border-secondary">
                <form id="measurement-form" class="space-y-4">
                    <label>Date</label>
                    <input type="date" id="date-input" value="${today}" max="${today}" class="w-full p-2 border rounded">

                    <label>Body Part</label>
                    <select id="body-part-select" class="w-full p-2 border rounded">
                        <option value="">-- Select --</option>
                        ${BODY_PARTS.map((p) => `<option>${p}</option>`).join("")}
                    </select>

                    <div id="measurement-inputs" class="space-y-2 bg-gray-50 p-3 rounded"></div>

                    <button class="w-full bg-secondary text-white p-2 rounded">Save Measurement</button>
                </form>
            </div>

            <!-- History -->
            <div class="bg-white p-5 rounded-xl shadow-md">
                <h3 class="text-xl font-semibold mb-3">Measurement History</h3>
                ${measurementsData
                    .map(
                        (log) => `
                    <div class="p-3 bg-gray-100 rounded border-l-4 border-primary-dark mb-2">
                        <p>${log.date} - ${log.part}</p>
                        ${Object.entries(log.values)
                            .map(
                                ([k, v]) =>
                                    `<span class="text-xs mr-2">${k}: <b>${v}</b></span>`
                            )
                            .join("")}
                    </div>`
                    )
                    .join("")}
                ${measurementsData.length === 0 ? `<p class="text-gray-500 italic">No measurements yet.</p>` : ""}
            </div>
        </div>
    `;
}

// ---------- Action Buttons ----------
function renderActionButtons() {
    const container = document.getElementById("action-buttons");
    container.innerHTML = Object.keys(VIEWS)
        .map((key) => {
            const view = VIEWS[key];
            const active = key === currentView;
            return `
                <button onclick="setView('${key}')"
                    class="flex flex-col items-center p-2 rounded-xl action-button ${
                        active
                            ? "text-primary bg-primary/10"
                            : "text-gray-500 hover:text-primary hover:bg-gray-100"
                    }">
                        ${view.icon}
                        <span class="text-sm">${view.name}</span>
                </button>
            `;
        })
        .join("");
}

// ---------- Main Render ----------
function renderApp() {
    renderActionButtons();
    const content = document.getElementById("content-view");

    if (currentView === "measurements") {
        content.innerHTML = renderMeasurementsView();
        setupMeasurementsListeners();
    } else if (currentView === "workouts") {
        content.innerHTML = renderPlaceholderView("Workouts Tracker");
    } else if (currentView === "meal-plans") {
        content.innerHTML = renderPlaceholderView("Meal Plans Manager");
    } else {
        content.innerHTML = renderHomeView();
    }
}

// ---------- Measurement Listeners ----------
function setupMeasurementsListeners() {
    const select = document.getElementById("body-part-select");
    const inputs = document.getElementById("measurement-inputs");
    const form = document.getElementById("measurement-form");
    const upload = document.getElementById("photo-upload");
    const preview = document.getElementById("photo-preview");

    // Body part selection
    select.onchange = () => {
        const part = select.value;
        inputs.innerHTML = "";

        if (!part) {
            inputs.innerHTML =
                `<p class="text-sm text-gray-500">Select a body part.</p>`;
            return;
        }

        if (part.includes("L & R")) {
            const base = part.replace(" L & R", "");
            inputs.innerHTML = `
                <label>${base} - Left</label>
                <input id="input-left" type="number" class="w-full p-2 border rounded"/>

                <label>${base} - Right</label>
                <input id="input-right" type="number" class="w-full p-2 border rounded"/>
            `;
        } else {
            inputs.innerHTML = `
                <label>${part}</label>
                <input id="input-single" type="number" class="w-full p-2 border rounded"/>
            `;
        }
    };

    // Save measurement
    form.onsubmit = (e) => {
        e.preventDefault();

        const part = select.value;
        const date = document.getElementById("date-input").value;
        let values = {};

        if (part.includes("L & R")) {
            values = {
                Left: document.getElementById("input-left").value,
                Right: document.getElementById("input-right").value,
            };
        } else {
            values[part] = document.getElementById("input-single").value;
        }

        measurementsData.unshift({ date, part, values });

        renderApp();
    };

    // Photo preview
    upload.onchange = () => {
        preview.innerHTML = "";
        Array.from(upload.files).forEach((file) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                preview.innerHTML += `
                    <div class="w-full h-32 overflow-hidden rounded bg-gray-200">
                        <img src="${ev.target.result}" class="w-full h-full object-cover"/>
                    </div>`;
            };
            reader.readAsDataURL(file);
        });
    };
}

// ---------- App Init ----------
function initApp() {
    renderApp();
}

// ---------- SVG Icons ----------
function homeIcon() { return `<svg ...>...</svg>`; }
function workoutIcon() { return `<svg ...>...</svg>`; }
function mealIcon() { return `<svg ...>...</svg>`; }
function measurementIcon() { return `<svg ...>...</svg>`; }
