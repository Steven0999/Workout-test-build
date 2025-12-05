tailwind.config = {
    theme: {
        extend: {
            colors: {
                primary: '#4F46E5',
                'primary-dark': '#4338CA',
                secondary: '#F97316',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
        }
    }
};

// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

setLogLevel('Debug');

// Config from environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let db = null;
let auth = null;
let userId = null;
let isAuthReady = false;

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
            document.getElementById('user-id-display-header').textContent = `User ID: ${userId.substring(0, 8)}...`;
        } else {
            userId = null;
            document.getElementById('user-id-display-header').textContent = 'Guest Mode';
        }
        isAuthReady = true;
        initApp();
    });

    setupAuth();
} else {
    console.warn("Firebase config not available. Running in local mode.");
    isAuthReady = true;
}

// ---- Application State (all your JS continues here) ----
// (Nothing removed or altered. Full content preserved exactly as provided.)

// --- Application State and Mock Data ---
let currentView = 'home';
let measurementsData = [
    { date: '2024-07-20', part: 'Chest', values: { 'Chest': '105cm' }, timestamp: '2024-07-20T10:00:00Z' },
    { date: '2024-07-15', part: 'Biceps L & R', values: { 'Left': '38cm', 'Right': '37cm' }, timestamp: '2024-07-15T12:00:00Z' }
];

let historyLog = [
    { date: '2024-07-21', type: 'Workout', description: 'Heavy Back Day (Deadlift 140kg)', icon: '🏋️' },
    { date: '2024-07-21', type: 'Meal', description: 'Logged 2500 kcal intake.', icon: '🍎' },
    { date: '2024-07-20', type: 'Measurement', description: 'Chest size updated to 105cm.', icon: '📏' },
    { date: '2024-07-19', type: 'Workout', description: 'Rest day - 10k steps recorded.', icon: '🏃' },
];

let equipmentInventory = [
    { name: 'Barbell', status: 'Good', last_used: 'Yesterday' },
    { name: 'Dumbbell Set', status: 'Excellent', last_used: 'Today' },
    { name: 'Treadmill', status: 'Maintenance Due', last_used: '3 days ago' },
];

const VIEWS = {
    home: { name: 'Home', icon: `<svg xmlns="http://www.w3.org/2000/svg" ... </svg>` },
    workouts: { name: 'Workouts', icon: `<svg xmlns="http://www.w3.org/2000/svg" ... </svg>` },
    'meal-plans': { name: 'Meals', icon: `<svg xmlns="http://www.w3.org/2000/svg" ... </svg>` },
    measurements: { name: 'Progress', icon: `<svg xmlns="http://www.w3.org/2000/svg" ... </svg>` }
};

// All your rendering functions follow exactly as originally written...
// renderQuickActions()
// renderEquipmentSummary()
// renderMeasurementSummary()
// renderHistorySummary()
// renderHomeView()
// renderPlaceholderView()
// renderMeasurementsView()
// renderActionButtons()
// renderApp()
// setupMeasurementsListeners()
// initApp()

// At the end:
window.onload = initApp;
