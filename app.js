import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, query, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

setLogLevel('Debug');

// Global variables provided by the environment
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

    // Authentication
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

// --- Application State and Mock Data ---
let currentView = 'home';
let measurementsData = [
    // Mock data for initial view
    { date: '2024-07-20', part: 'Chest', values: { 'Chest': '105' }, timestamp: '2024-07-20T10:00:00Z' },
    { date: '2024-07-15', part: 'Biceps L & R', values: { 'Left': '38', 'Right': '37' }, timestamp: '2024-07-15T12:00:00Z' }
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
    'home': { name: 'Home', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>` },
    'workouts': { name: 'Workouts', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 17h8"/><path d="M8 13h8"/></svg>` },
    'meal-plans': { name: 'Meal Plans', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>` },
    'measurements': { name: 'Progress', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><path d="M4 15V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6"/><path d="M15 11l-3 3-3-3"/></svg>` }
};

const BODY_PARTS = [
    'Shoulders', 'Chest', 'Lats', 'Torso', 'Hips', 'Glutes',
    'Biceps L & R', 'Triceps L & R', 'Upper Legs L & R', 'Calves L & R'
];

// Function to change the view
window.setView = (view) => {
    currentView = view;
    renderApp();
};

// --- Dashboard Summary Components ---

const renderQuickActions = () => {
    return `
        <div class="bg-white p-5 rounded-xl shadow-md border-t-4 border-primary-dark">
            <h3 class="text-xl font-semibold mb-3 text-primary-dark">Quick Actions</h3>
            <div class="grid grid-cols-2 gap-4">
                <button onclick="setView('workouts')" class="flex flex-col items-center justify-center p-3 rounded-xl bg-primary text-white shadow-lg hover:bg-primary-dark transition duration-150">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 mb-1"><path d="M15 22.5a2.5 2.5 0 0 1-2.5-2.5v-13a2.5 2.5 0 0 1 5 0v13a2.5 2.5 0 0 1-2.5 2.5z"/><path d="M8 5.5a2.5 2.5 0 0 1-2.5-2.5v-1a2.5 2.5 0 0 1 5 0v1a2.5 2.5 0 0 1-2.5 2.5z"/></svg>
                    <span class="text-sm font-medium">Start Workout</span>
                </button>
                <button onclick="setView('meal-plans')" class="flex flex-col items-center justify-center p-3 rounded-xl bg-secondary text-white shadow-lg hover:bg-orange-700 transition duration-150">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 mb-1"><path d="M15.5 2H9.5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/><path d="M12 20h.01"/><path d="M12 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/></svg>
                    <span class="text-sm font-medium">Add Meal Plan</span>
                </button>
            </div>
        </div>
    `;
};

const renderEquipmentSummary = () => {
    const maintenanceNeeded = equipmentInventory.filter(e => e.status.includes('Maintenance')).length;
    const totalEquipment = equipmentInventory.length;

    return `
        <div class="bg-white p-5 rounded-xl shadow-md border-t-4 border-gray-500">
            <h3 class="text-xl font-semibold mb-3 flex items-center text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="M16 16.5a1.5 1.5 0 0 0 3 0 1.5 1.5 0 0 0-3 0z"/><path d="M4 16.5a1.5 1.5 0 0 0 3 0 1.5 1.5 0 0 0-3 0z"/><path d="M7 16.5h10"/><path d="M22 6H2l3 6h14l3-6z"/></svg>
                Gym Equipment Status
            </h3>
            <p class="text-3xl font-bold text-gray-800">${totalEquipment}</p>
            <p class="text-sm text-gray-500">Total items tracked</p>
            ${maintenanceNeeded > 0 
                ? `<p class="text-sm font-medium mt-2 text-red-500">⚠️ ${maintenanceNeeded} item(s) need maintenance.</p>` 
                : '<p class="text-sm font-medium mt-2 text-primary">✅ All equipment looks good!</p>'}
            <p class="text-xs mt-2 text-gray-400">Last used: ${equipmentInventory[1].last_used}</p>
        </div>
    `;
};

const renderMeasurementSummary = () => {
    const latestMeasurement = measurementsData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

    let content;
    if (latestMeasurement) {
        // Format the values into a nice string
        const valuesString = Object.keys(latestMeasurement.values)
            .map(key => `${key}: ${latestMeasurement.values[key]}`)
            .join(' / ');

        content = `
            <p class="text-lg font-medium">${latestMeasurement.part}</p>
            <p class="text-3xl font-bold text-blue-600">${valuesString}</p>
            <p class="text-sm text-gray-500 mt-1">Logged on: ${latestMeasurement.date}</p>
        `;
    } else {
        content = `
            <p class="text-gray-500 italic">No measurements logged yet.</p>
            <button onclick="setView('measurements')" class="mt-2 text-sm text-blue-500 hover:underline">Log your first progress &rarr;</button>
        `;
    }

    return `
        <div class="bg-white p-5 rounded-xl shadow-md border-t-4 border-blue-500">
            <h3 class="text-xl font-semibold mb-3 flex items-center text-blue-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H7c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2z"/></svg>
                Latest Body Measurement
            </h3>
            ${content}
        </div>
    `;
};

const renderHistorySummary = () => {
    return `
        <div class="bg-white p-5 rounded-xl shadow-md border-t-4 border-secondary">
            <h3 class="text-xl font-semibold mb-3 flex items-center text-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"/><path d="M12 7v5l2 2"/></svg>
                Recent Activity History
            </h3>
            <div class="space-y-3">
                ${historyLog.slice(0, 3).map(item => `
                    <div class="flex items-center p-2 bg-gray-50 rounded-lg">
                        <span class="text-lg mr-3">${item.icon}</span>
                        <div class="flex-grow">
                            <p class="font-medium text-sm">${item.description}</p>
                            <p class="text-xs text-gray-500">${item.date} (${item.type})</p>
                        </div>
                    </div>
                `).join('')}
            </div>
            <p class="text-center text-sm mt-3"><a href="#" onclick="setView('workouts')" class="text-secondary hover:underline font-medium">View Full History &rarr;</a></p>
        </div>
    `;
};


// --- Main View Renderers ---

const renderHomeView = () => {
    return `
        <div class="space-y-6">
            <div class="text-center p-4 bg-gray-100 rounded-xl">
                <h2 class="text-2xl font-bold text-gray-800">The Ultimate Dashboard</h2>
                ${userId ? `<p class="text-xs text-gray-500 mt-1">User ID: ${userId}</p>` : ''}
            </div>

            <!-- 1. Quick Actions: Start Workout / Add Meal Plan -->
            ${renderQuickActions()}

            <!-- 2. Equipment Summary -->
            ${renderEquipmentSummary()}

            <!-- 3. Latest Measurement Summary -->
            ${renderMeasurementSummary()}

            <!-- 4. Combined Activity History -->
            ${renderHistorySummary()}

            
        </div>
    `;
};

const renderPlaceholderView = (title) => {
    return `
        <div class="p-6 bg-white rounded-xl shadow-lg text-center h-full">
            <h2 class="text-2xl font-bold text-primary mb-4">${title}</h2>
            <p class="text-gray-600">This dedicated page is for logging detailed entries and viewing trends.</p>
            <p class="text-sm mt-4">The summaries are visible on the **Home** dashboard.</p>
             <button onclick="setView('home')" class="mt-6 py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-secondary hover:bg-orange-700">
                Go to Dashboard
            </button>
        </div>
    `;
};


// --- Detailed Measurements View (Used by 'Progress' Tab) ---

const renderMeasurementsView = () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Sort by date descending for history view
    const sortedData = [...measurementsData].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return `
        <div class="space-y-8">
            <h2 class="text-2xl font-bold text-primary border-b pb-2 mb-6">Detailed Body Progress Log</h2>

            <!-- Measurement Input Section -->
            <div class="bg-white p-5 rounded-xl shadow-md border-t-4 border-secondary">
                <h3 class="text-xl font-semibold mb-3 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="M12 2H2v10l10 10 10-10L12 2zM7 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>
                    Add New Measurements
                </h3>
                <form id="measurement-form" class="space-y-4">
                    <div>
                        <label for="date-input" class="block text-sm font-medium text-gray-700">Date</label>
                        <input type="date" id="date-input" value="${today}" max="${today}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary p-2 border">
                    </div>

                    <div>
                        <label for="body-part-select" class="block text-sm font-medium text-gray-700">Body Part</label>
                        <select id="body-part-select" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary p-2 border bg-white">
                            <option value="">-- Select Measurement --</option>
                            ${BODY_PARTS.map(part => `<option value="${part}">${part}</option>`).join('')}
                        </select>
                    </div>

                    <div id="measurement-inputs" class="space-y-3 p-3 bg-gray-50 rounded-lg">
                        <p class="text-sm text-gray-500 italic">Select a body part above to enter the size (e.g., in inches or cm).</p>
                    </div>

                    <button type="submit" class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary transition duration-150">
                        Save Measurement
                    </button>
                </form>
            </div>

            <!-- Photo Log Section -->
            <div class="bg-white p-5 rounded-xl shadow-md border-t-4 border-blue-500">
                <h3 class="text-xl font-semibold mb-3 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/></svg>
                    Progress Photos
                </h3>
                <input type="file" id="photo-upload" accept="image/*" multiple class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-dark cursor-pointer">
                <p class="text-xs text-gray-500 mt-2">Note: Photos are only previewed and not permanently stored in this version.</p>
                <div id="photo-preview" class="grid grid-cols-2 gap-2 mt-4">
                    <!-- Image previews will appear here -->
                </div>
            </div>


            <!-- Measurement History (Simple Log) -->
            <div class="bg-white p-5 rounded-xl shadow-md">
                <h3 class="text-xl font-semibold mb-3">Measurement History</h3>
                <div id="history-log" class="space-y-2">
                    ${sortedData.length === 0 ? '<p class="text-gray-500 italic">No measurements logged yet.</p>' : sortedData.map(log => `
                        <div class="p-3 bg-gray-100 rounded-lg border-l-4 border-primary-dark">
                            <p class="font-medium text-sm">${log.date} - ${log.part}</p>
                            ${Object.keys(log.values).map(key => `<span class="inline-block text-xs mr-3">${key}: <span class="font-bold">${log.values[key]}</span></span>`).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
};


// --- Core Application Loop ---

const renderActionButtons = () => {
    const container = document.getElementById('action-buttons');
    if (!container) return;
    
    container.innerHTML = Object.keys(VIEWS).map(key => {
        const view = VIEWS[key];
        const isActive = key === currentView;
        const baseClasses = "flex flex-col items-center justify-center p-2 rounded-xl action-button text-sm font-medium transition duration-200";
        const activeClasses = "text-primary bg-primary/10 shadow-md";
        const inactiveClasses = "text-gray-500 hover:text-primary hover:bg-gray-100";

        return `
            <button onclick="setView('${key}')" class="${baseClasses} ${isActive ? activeClasses : inactiveClasses}">
                ${view.icon}
                <span class="mt-1">${view.name}</span>
            </button>
        `;
    }).join('');
};

const renderApp = () => {
    renderActionButtons();
    const contentView = document.getElementById('content-view');
    if (!contentView) return;

    switch (currentView) {
        case 'workouts':
            contentView.innerHTML = renderPlaceholderView('Workouts Tracker');
            break;
        case 'meal-plans':
            contentView.innerHTML = renderPlaceholderView('Meal Plans Manager');
            break;
        case 'measurements':
            contentView.innerHTML = renderMeasurementsView();
            setupMeasurementsListeners();
            break;
        case 'home':
        default:
            contentView.innerHTML = renderHomeView();
    }
};

// --- Measurements Specific Logic ---

const setupMeasurementsListeners = () => {
    const selectElement = document.getElementById('body-part-select');
    const inputsContainer = document.getElementById('measurement-inputs');
    const form = document.getElementById('measurement-form');
    const photoUpload = document.getElementById('photo-upload');
    const photoPreview = document.getElementById('photo-preview');

    if (!selectElement || !inputsContainer || !form || !photoUpload || !photoPreview) {
        return;
    }

    // 1. Dynamic Input Generation
    selectElement.onchange = () => {
        const selectedPart = selectElement.value;
        inputsContainer.innerHTML = '';
        if (!selectedPart) {
            inputsContainer.innerHTML = '<p class="text-sm text-gray-500 italic">Select a body part above to enter the size (e.g., in inches or cm).</p>';
            return;
        }

        if (selectedPart.includes('L & R')) {
            const basePart = selectedPart.replace(' L & R', '');
            inputsContainer.innerHTML = `
                <div>
                    <label for="input-left" class="block text-sm font-medium text-gray-700">${basePart} - Left (cm/in)</label>
                    <input type="number" step="0.1" id="input-left" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary p-2 border">
                </div>
                <div>
                    <label for="input-right" class="block text-sm font-medium text-gray-700">${basePart} - Right (cm/in)</label>
                    <input type="number" step="0.1" id="input-right" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary p-2 border">
                </div>
            `;
        } else {
            inputsContainer.innerHTML = `
                <div>
                    <label for="input-single" class="block text-sm font-medium text-gray-700">${selectedPart} (cm/in)</label>
                    <input type="number" step="0.1" id="input-single" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary p-2 border">
                </div>
            `;
        }
    };

    // 2. Form Submission (Data Logging)
    form.onsubmit = (e) => {
        e.preventDefault();
        const part = selectElement.value;
        const date = document.getElementById('date-input').value;
        let values = {};
        let isValid = false;

        if (part.includes('L & R')) {
            const left = document.getElementById('input-left').value;
            const right = document.getElementById('input-right').value;
            if (left && right) {
                values['Left'] = left;
                values['Right'] = right;
                isValid = true;
            }
        } else if (part) {
            const single = document.getElementById('input-single').value;
            if (single) {
                values[part] = single;
                isValid = true;
            }
        }

        if (isValid) {
            const newLog = { 
                date, 
                part, 
                values, 
                timestamp: new Date().toISOString() // Store ISO timestamp for sorting
            };
            
            // Update measurements state and history log mock data
            measurementsData.unshift(newLog);
            historyLog.unshift({ 
                date: newLog.date, 
                type: 'Measurement', 
                description: `${newLog.part} logged.`, 
                icon: '📏' 
            });
            
            console.log("Measurement Logged:", newLog);
            
            // Reset form UI after successful submission
            form.reset();
            selectElement.value = "";
            inputsContainer.innerHTML = '<p class="text-sm text-gray-500 italic">Select a body part above to enter the size (e.g., in inches or cm).</p>';
            
            renderApp(); // Re-render to update the history log and dashboard summary
        } else {
            console.error("Please enter a value for the selected body part.");
        }
    };

    // 3. Photo Preview Handling
    photoUpload.onchange = (e) => {
        photoPreview.innerHTML = '';
        const files = e.target.files;

        if (files.length > 0) {
            Array.from(files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const imgContainer = document.createElement('div');
                    imgContainer.className = 'w-full h-32 bg-gray-200 rounded-lg overflow-hidden';
                    imgContainer.innerHTML = `<img src="${event.target.result}" alt="Progress Photo" class="w-full h-full object-cover">`;
                    photoPreview.appendChild(imgContainer);
                };
                reader.readAsDataURL(file);
            });
        }
    };
};

// Initial app launch
const initApp = () => {
    renderApp();
};

