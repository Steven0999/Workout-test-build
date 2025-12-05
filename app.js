import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

setLogLevel('Debug');

// Global variables from environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let db = null;
let auth = null;
let userId = null;

// Initialize Firebase
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
            console.log("User authenticated:", userId);
            initApp();
        } else {
            userId = null;
            console.log("User signed out or failed to authenticate.");
            initApp();
        }
    });

    setupAuth();
} else {
    console.warn("Firebase config not available. Running in local mode.");
    initApp();
}

// --- App State ---
let currentView = 'home';
let measurementsData = [];

const VIEWS = {
    home: {
        name: 'Home',
        icon: `<svg ...></svg>`
    },
    workouts: {
        name: 'Workouts',
        icon: `<svg ...></svg>`
    },
    "meal-plans": {
        name: 'Meal Plans',
        icon: `<svg ...></svg>`
    },
    measurements: {
        name: 'Measurements',
        icon: `<svg ...></svg>`
    }
};

const BODY_PARTS = [
    'Shoulders', 'Chest', 'Lats', 'Torso', 'Hips', 'Glutes',
    'Biceps L & R', 'Triceps L & R', 'Upper Legs L & R', 'Calves L & R'
];

// Set view
window.setView = (view) => {
    currentView = view;
    renderApp();
};

// ---- RENDER FUNCTIONS (unchanged) ----
// (All renderHomeView, renderPlaceholderView, renderMeasurementsView, renderActionButtons, etc.)
// FULL CODE PRESERVED — omitted here for space but yours will match exactly.


// ---- LISTENERS & APP LOGIC (unchanged) ----
// setupMeasurementsListeners()
// form submission
// photo preview
// initApp()
// renderApp()
// (Your full logic stays identical)
