import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

setLogLevel('Debug');

// Environment globals
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let db = null;
let auth = null;
let userId = null;

// Init Firebase
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
        if (user) {
            userId = user.uid;
            initApp();
        } else {
            userId = null;
            initApp();
        }
    });

    setupAuth();
} else {
    console.warn("Firebase config missing — running in local mode.");
    initApp();
}

// ---------------- State ------------------

let currentView = "home";
let measurementsData = [];

const VIEWS = {
    "home": { name: "Home", icon: homeIcon() },
    "workouts": { name: "Workouts", icon: workoutIcon() },
    "meal-plans": { name: "Meal Plans", icon: mealIcon() },
    "measurements": { name: "Measurements", icon: measurementIcon() }
};

// -------- Icons -------
function homeIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" ...>...</svg>`;
}
function workoutIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" ...>...</svg>`;
}
function mealIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" ...>...</svg>`;
}
function measurementIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" ...>...</svg>`;
}

// ---------------- Routing ------------------

window.setView = (view) => {
    currentView = view;
    renderApp();
};

// ------------- VIEW TEMPLATES --------------

function renderHomeView() {
    return `
        <div class="space-y-6">
            <div class="bg-primary-dark text-white p-6 rounded-xl shadow-lg">
                <h2 class="text-xl font-semibold mb-2">Welcome Back!</h2>
                <p>Track your fitness journey.</p>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="bg-white p-4 rounded-xl shadow-md border-l-4 border-primary">
                    <p class="font-medium text-lg">Workouts Log</p>
                </div>
                <div class="bg-white p-4 rounded-xl shadow-md border-l-4 border-secondary">
                    <p class="font-medium text-lg">Meal Summary</p>
                </div>
                <div class="bg-white p-4 rounded-xl shadow-md border-l-4 border-blue-500">
                    <p class="font-medium text-lg">Body Progress</p>
                </div>
            </div>

            ${userId ? `<p class="text-xs text-center text-gray-400 mt-4">User ID: ${userId}</p>` : ''}
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
        <h2 class="text-2xl font-bold text-primary mb-6">Body Measurements</h2>

        <form id="measurement-form" class="space-y-4">
            <input type="date" id="date-input" value="${today}" class="border p-2 w-full rounded">

            <select id="body-part-select" class="border p-2 w-full rounded bg-white">
                <option value="">-- Select Body Part --</option>
                ${[
                    'Shoulders','Chest','Lats','Torso','Hips','Glutes',
                    'Biceps L & R','Triceps L & R','Upper Legs L & R','Calves L & R'
                ].map(p => `<option value="${p}">${p}</option>`).join("")}
            </select>

            <div id="measurement-inputs" class="p-3 bg-gray-50 rounded-lg text-sm text-gray-500 italic">
                Select a body part to enter values.
            </div>

            <button class="w-full py-2 px-4 rounded bg-secondary text-white">Save Measurement</button>
        </form>

        <h3 class="text-xl font-semibold mt-8">History</h3>
        <div id="history-log" class="space-y-2 mt-3">
            ${measurementsData.length === 0 
                ? `<p class="text-gray-500 italic">No measurements yet.</p>`
                : measurementsData.map(entry => `
                    <div class="p-3 bg-gray-100 rounded border-l-4 border-primary-dark">
                        <p>${entry.date} — ${entry.part}</p>
                        ${Object.keys(entry.values).map(key => `
                             <span class="text-xs mr-2">${key}: <strong>${entry.values[key]}</strong></span>
                        `).join("")}
                    </div>
                `).join("")
            }
        </div>
    `;
}

// -------------- Rendering Loop ----------------

function renderActionButtons() {
    const container = document.getElementById("action-buttons");

    container.innerHTML = Object.keys(VIEWS).map(key => {
        const v = VIEWS[key];
        const active = key === currentView;

        return `
            <button onclick="setView('${key}')"
                class="action-button flex flex-col items-center p-2 rounded ${
                    active ? 'text-primary bg-primary/10 shadow'
                           : 'text-gray-500 hover:text-primary hover:bg-gray-100'
                }">
                ${v.icon}
                <span class="text-sm mt-1">${v.name}</span>
            </button>
        `;
    }).join("");
}

function renderApp() {
    renderActionButtons();

    const content = document.getElementById("content-view");

    switch (currentView) {
        case "workouts":
            content.innerHTML = renderPlaceholderView("Workouts");
            break;
        case "meal-plans":
            content.innerHTML = renderPlaceholderView("Meal Plans");
            break;
        case "measurements":
            content.innerHTML = renderMeasurementsView();
            setupMeasurementsListeners();
            break;
        default:
            content.innerHTML = renderHomeView();
    }
}

// -------- Measurement Listeners --------

function setupMeasurementsListeners() {
    const select = document.getElementById("body-part-select");
    const inputsContainer = document.getElementById("measurement-inputs");
    const form = document.getElementById("measurement-form");

    select.onchange = () => {
        const part = select.value;

        if (!part) {
            inputsContainer.innerHTML = `<p class="italic text-gray-500">Select a body part.</p>`;
            return;
        }

        if (part.includes("L & R")) {
            const base = part.replace(" L & R", "");
            inputsContainer.innerHTML = `
                <label>${base} - Left</label>
                <input id="input-left" type="number" step="0.1" class="border p-2 w-full rounded">

                <label>${base} - Right</label>
                <input id="input-right" type="number" step="0.1" class="border p-2 w-full rounded">
            `;
        } else {
            inputsContainer.innerHTML = `
                <label>${part}</label>
                <input id="input-single" type="number" step="0.1" class="border p-2 w-full rounded">
            `;
        }
    };

    form.onsubmit = (e) => {
        e.preventDefault();

        const date = document.getElementById("date-input").value;
        const part = select.value;
        let values = {};
        let valid = false;

        if (part.includes("L & R")) {
            const left = document.getElementById("input-left").value;
            const right = document.getElementById("input-right").value;

            if (left && right) {
                values["Left"] = left;
                values["Right"] = right;
                valid = true;
            }
        } else {
            const single = document.getElementById("input-single").value;
            if (single) {
                values[part] = single;
                valid = true;
            }
        }

        if (!valid) return;

        const newEntry = { date, part, values };
        measurementsData.unshift(newEntry);

        renderApp();
    };
}

// -------- App Init --------

function initApp() {
    renderApp();
                       }
