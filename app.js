// ==========================================================================
// FIREBASE CONFIGURATION
// ==========================================================================
const firebaseConfig = {
  apiKey: "AIzaSyA9H9hmvfrQmc2wIwnS2jCPLgdmXBquQXM",
  authDomain: "vfit-app-pro.firebaseapp.com",
  projectId: "vfit-app-pro",
  storageBucket: "vfit-app-pro.firebasestorage.app",
  messagingSenderId: "815730068689",
  appId: "1:815730068689:web:0c6587d7dbe62b0f3c09f0",
  measurementId: "G-74L12X0NE8"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

let currentUser      = null;
let firebaseUserData = {};

// ==========================================================================
// AUTH HELPERS
// ==========================================================================
function showLogin() {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('forgot-password-form').classList.add('hidden');
}
function showRegister() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
    document.getElementById('forgot-password-form').classList.add('hidden');
}
function showForgotPassword() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('forgot-password-form').classList.remove('hidden');
}

// ==========================================================================
// AUTH FUNCTIONS
// ==========================================================================
async function registerUser() {
    const name     = document.getElementById('register-name').value.trim();
    const email    = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirm  = document.getElementById('register-confirm').value;

    if (!name)              { showToast('Please enter your name'); return; }
    if (!email || !password){ showToast('Please fill all fields'); return; }
    if (password.length < 6){ showToast('Password must be at least 6 characters'); return; }
    if (password !== confirm){ showToast('Passwords do not match'); return; }

    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({ displayName: name });
        await db.collection('users').doc(cred.user.uid).set({
            name, email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            calorieGoal: 2500,
            workouts: [], meals: [], metrics: []
        });
        showToast('Account created successfully! 🎉');
    } catch (err) {
        if (err.code === 'auth/email-already-in-use') showToast('Email already in use');
        else if (err.code === 'auth/invalid-email')   showToast('Invalid email address');
        else showToast('Registration failed: ' + err.message);
    }
}

async function loginUser() {
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    if (!email || !password) { showToast('Please enter email and password'); return; }
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showToast('Welcome back! 💪');
    } catch (err) {
        if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found')
            showToast('Invalid email or password');
        else showToast('Login failed: ' + err.message);
    }
}

async function resetPassword() {
    const email = document.getElementById('forgot-email').value.trim();
    if (!email) { showToast('Please enter your email'); return; }
    try {
        await auth.sendPasswordResetEmail(email);
        showToast('Password reset email sent! Check your inbox.');
        showLogin();
    } catch { showToast('Failed to send reset email'); }
}

async function logoutUser() {
    if (!confirm('Are you sure you want to sign out?')) return;
    try {
        await auth.signOut();
        showToast('Signed out successfully');
        state = deepMerge({}, DEFAULT_STATE);
        saveState();
    } catch { showToast('Logout failed'); }
}

async function loadFirebaseUserData() {
    try {
        const doc = await db.collection('users').doc(currentUser.uid).get();
        if (doc.exists) {
            firebaseUserData = doc.data();
            if (firebaseUserData.calorieGoal) state.goals.calories = firebaseUserData.calorieGoal;
        } else {
            await db.collection('users').doc(currentUser.uid).set({
                name: currentUser.displayName || 'User',
                email: currentUser.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                calorieGoal: state.goals.calories || 2500,
                workouts: [], meals: [], metrics: []
            });
        }
    } catch (err) { console.error('Firebase load error:', err); }
}

async function syncToCloud() {
    if (!currentUser) { showToast('Not signed in'); return; }
    try {
        await db.collection('users').doc(currentUser.uid).update({
            calorieGoal: state.goals.calories,
            lastSync: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('Synced to cloud ☁️');
    } catch { showToast('Sync failed — check connection'); }
}

// FIX: was called but never defined
async function syncToFirebase() {
    if (!currentUser || !db) return;
    try {
        await db.collection('users').doc(currentUser.uid).update({
            lastNutritionSync: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch { /* silent */ }
}

// ==========================================================================
// AUTH STATE OBSERVER
// ==========================================================================
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-screen').style.display  = 'block';

        loadState();
        await loadFirebaseUserData();

        setupMidnightCheck();
        renderNutritionHistory();

        const statusDate = document.getElementById('status-date');
        if (statusDate) statusDate.innerText = new Date().toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });

        const sidebarEmail = document.getElementById('sidebar-user-email');
        if (sidebarEmail) sidebarEmail.textContent = user.email;

        // Initialise date pickers
        const today = new Date().toISOString().split('T')[0];
        ['workout-date-picker','nutrition-date-picker','metrics-date-picker'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = today;
        });

        renderProfile();
        renderDashboard();
        renderDiary();
        renderSettings();
        setupMidnightSave();
        lucide.createIcons();
    } else {
        currentUser = null;
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-screen').style.display  = 'none';
        lucide.createIcons();
    }
});

function renderProfile() {
    if (!currentUser) return;
    const name = currentUser.displayName || (firebaseUserData && firebaseUserData.name) || 'User';
    document.getElementById('profile-name').textContent  = name;
    document.getElementById('profile-email').textContent = currentUser.email;

    if (firebaseUserData && firebaseUserData.createdAt) {
        try {
            const d = firebaseUserData.createdAt.toDate ? firebaseUserData.createdAt.toDate() : new Date(firebaseUserData.createdAt);
            document.getElementById('profile-created').textContent = d.toLocaleDateString();
        } catch { document.getElementById('profile-created').textContent = 'Recently'; }
    } else {
        document.getElementById('profile-created').textContent = 'Recently';
    }
    document.getElementById('profile-workouts').textContent = state.workoutHistory.length;
}

// ==========================================================================
// STATE MANAGEMENT
// ==========================================================================
const DEFAULT_STATE = {
    viewDate:    new Date().toISOString().split('T')[0],
    metricsDate: new Date().toISOString().split('T')[0],
    goals:       { calories: 2500, water: 2500, steps: 10000 },
    waterLogs:   {}, stepsLogs: {},
    dailyMeals:         [],
    workoutHistory:     [],
    nutritionHistory:   [],
    metricsHistory:     [],
    createdMeals:       [],
    customFoods:        [],
    workoutEnv:  'gym',
    currentPhotos: { front: null, side: null, back: null },
    habits:          [],
    habitsEnabled:   false,
    habitCompletions:         {},
    hydrationGoalCompletions: {},
    stepsGoalCompletions:     {},
    trackHydration: true,
    trackSteps:     true,
    aiCoachEnabled: true,
    userGoals:   [],
    cardioLogs:  [],
    hydrationLogs: {},
    equipment: {
        gym:  { 'Barbell': true,  'Dumbbells': true, 'Cable Machine': true, 'Leg Press': true, 'Pull Up Bar': true, 'Bench': true },
        home: { 'Dumbbells': false, 'Resistance Bands': false, 'Pull Up Bar': false, 'Yoga Mat': true }
    }
};

let state = deepMerge({}, DEFAULT_STATE);

// Runtime vars
let workoutTimer    = null;
let workoutStartTime = null;
let currentFoodItem = null;
let lastCheckDate   = null;
let midnightCheckInterval = null;
let selectedPreviousMeals = [];
let currentEditingMeal    = null;
let editAmountType    = 'portion';
let currentAmountType = 'portion';
let searchResults  = [];
let mealIngredients = [];
let html5QrCode     = null;
let metricsChart    = null;
let exerciseProgressChart = null;
let calorieTrackingChart  = null;
let proteinTrackingChart  = null;
let currentPhotoType      = null;
let manualFoodImageData   = null;
let currentCalorieView    = 'daily';
let currentProteinView    = 'daily';
let proteinGoal = 150;
let currentComparePhotoType = 'front';

// ==========================================================================
// DEEP MERGE UTILITY
// ==========================================================================
function deepMerge(target, source) {
    for (const key of Object.keys(source)) {
        if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            target[key] = deepMerge(target[key] || {}, source[key]);
        } else {
            target[key] = source[key];
        }
    }
    return target;
}

// ==========================================================================
// PERSISTENCE
// ==========================================================================
function saveState() {
    try { localStorage.setItem('fittrack_state', JSON.stringify(state)); }
    catch (e) { console.error('Save error:', e); }
}

function loadState() {
    try {
        const saved = localStorage.getItem('fittrack_state');
        if (saved) {
            const parsed = JSON.parse(saved);
            state = deepMerge(deepMerge({}, DEFAULT_STATE), parsed);
            // Always ensure nested objects are properly merged
            state.goals     = Object.assign({}, DEFAULT_STATE.goals, parsed.goals || {});
            state.equipment = {
                gym:  Object.assign({}, DEFAULT_STATE.equipment.gym,  (parsed.equipment || {}).gym  || {}),
                home: Object.assign({}, DEFAULT_STATE.equipment.home, (parsed.equipment || {}).home || {})
            };
        }
    } catch (e) { console.error('Load error:', e); }
}

function setupMidnightSave() {
    const now      = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    setTimeout(() => { saveDailyNutrition(); setupMidnightSave(); }, tomorrow - now);
}

function saveDailyNutrition() {
    const dateToSave   = state.viewDate;
    const mealsForDate = state.dailyMeals.filter(m => m.date === dateToSave);
    if (mealsForDate.length > 0) {
        const entry = {
            date:     dateToSave,
            calories: mealsForDate.reduce((s,m) => s + (m.calories||0), 0),
            protein:  mealsForDate.reduce((s,m) => s + (m.protein||0),  0),
            carbs:    mealsForDate.reduce((s,m) => s + (m.carbs||0),    0),
            fat:      mealsForDate.reduce((s,m) => s + (m.fat||0),      0),
            fiber:    mealsForDate.reduce((s,m) => s + (m.fiber||0),    0),
            meals:    mealsForDate,
            savedAt:  new Date().toISOString()
        };
        state.nutritionHistory = state.nutritionHistory.filter(h => h.date !== dateToSave);
        state.nutritionHistory.unshift(entry);
        state.nutritionHistory = state.nutritionHistory.slice(0, 365);
    } else {
        state.nutritionHistory = state.nutritionHistory.filter(h => h.date !== dateToSave);
    }
    saveState();
}

function autoSaveNutrition() {
    saveDailyNutrition();
    if (currentUser && db) syncToFirebase();
}

// ==========================================================================
// TAB MANAGEMENT
// ==========================================================================
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    const tab = document.getElementById(tabId);
    if (tab) tab.classList.add('active');
    if (tabId === 'logs')     { renderLogs(); filterWorkouts(); }
    if (tabId === 'profile')  renderProfile();
    if (tabId === 'settings') renderSettings();
    if (tabId === 'dashboard') renderDashboard();
    lucide.createIcons();
}

// ==========================================================================
// SIDEBAR
// ==========================================================================
function toggleSidebar() {
    const sidebar  = document.getElementById('sidebar');
    const overlay  = document.getElementById('sidebar-overlay');
    const isOpen   = sidebar.classList.contains('translate-x-0');
    if (isOpen) {
        sidebar.classList.remove('translate-x-0');
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    } else {
        sidebar.classList.add('translate-x-0');
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    }
    lucide.createIcons();
}

// ==========================================================================
// TOAST
// ==========================================================================
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

// ==========================================================================
// EXERCISE DATABASE
// ==========================================================================
const EXERCISE_DB = {
    gym: {
        'Full Body': { compound:['Barbell Squat','Deadlift','Bench Press','Pull Ups','Overhead Press'], isolation:['Bicep Curl','Tricep Pushdown','Lateral Raise','Leg Curl','Calf Raise'] },
        'Upper':     { compound:['Bench Press','Pull Ups','Dumbbell Row','Overhead Press','Dips'],      isolation:['Bicep Curl','Tricep Pushdown','Lateral Raise','Face Pulls','Cable Flyes'] },
        'Lower':     { compound:['Barbell Squat','Romanian Deadlift','Leg Press','Lunges'],             isolation:['Leg Extension','Leg Curl','Calf Raise','Hip Abduction','Glute Kickback'] },
        'Push':      { compound:['Bench Press','Overhead Press','Incline Press','Dips'],                isolation:['Tricep Pushdown','Lateral Raise','Cable Flyes','Skull Crushers'] },
        'Pull':      { compound:['Pull Ups','Barbell Row','Lat Pulldown','T-Bar Row'],                  isolation:['Bicep Curl','Face Pulls','Hammer Curl','Cable Row'] },
        'Legs':      { compound:['Squat','Deadlift','Leg Press','Lunges'],                              isolation:['Leg Extension','Leg Curl','Calf Raise','Hip Thrust'] },
        'Chest':     { compound:['Bench Press','Incline Press','Dumbbell Press'],                       isolation:['Cable Flyes','Pec Deck','Dumbbell Flyes'] },
        'Back':      { compound:['Pull Ups','Barbell Row','Lat Pulldown','T-Bar Row'],                  isolation:['Cable Row','Face Pulls','Straight Arm Pulldown'] },
        'Shoulders': { compound:['Overhead Press','Arnold Press'],                                      isolation:['Lateral Raise','Front Raise','Face Pulls','Reverse Flyes'] },
        'Biceps':    { compound:['Chin Ups'],                                                           isolation:['Barbell Curl','Hammer Curl','Preacher Curl','Cable Curl'] },
        'Triceps':   { compound:['Close Grip Bench Press','Dips'],                                      isolation:['Tricep Pushdown','Skull Crushers','Overhead Extension'] },
        'Quads':     { compound:['Squat','Leg Press','Lunges'],                                         isolation:['Leg Extension','Sissy Squat'] },
        'Hamstrings':{ compound:['Romanian Deadlift','Good Morning'],                                   isolation:['Leg Curl','Nordic Curl'] },
        'Glutes':    { compound:['Hip Thrust','Bulgarian Split Squat'],                                  isolation:['Cable Kickback','Hip Abduction','Glute Bridge'] },
        'Calves':    { compound:[],                                                                     isolation:['Standing Calf Raise','Seated Calf Raise','Donkey Calf Raise'] }
    },
    home: {
        'Full Body': { compound:['Push Ups','Bodyweight Squat','Burpees','Resistance Bands Squats','Resistance Bands Back Rows'], isolation:['Plank','Crunches','Leg Raises','Resistance Bands Bicep Curls','Resistance Bands Lateral Shoulder Raises'] },
        'Upper':     { compound:['Push Ups','Pike Push Ups','Inverted Row'],   isolation:['Tricep Dips','Plank to Push Up','Superman'] },
        'Lower':     { compound:['Bodyweight Squat','Lunges','Step Ups'],       isolation:['Glute Bridge','Calf Raise','Donkey Kicks'] },
        'Push':      { compound:['Push Ups','Pike Push Ups'],                   isolation:['Diamond Push Ups','Tricep Dips','Shoulder Taps'] },
        'Pull':      { compound:['Inverted Row','Chin Ups'],                    isolation:['Superman','Reverse Snow Angels','Bicep Holds'] },
        'Legs':      { compound:['Squat','Lunges','Jump Squat'],                isolation:['Glute Bridge','Calf Raise','Leg Raises'] }
    }
};

const ALL_EXERCISES = [
    'Arnold Press','Barbell Curl','Barbell Row','Barbell Squat','Bench Press',
    'Bicep Curl','Bicep Holds','Bodyweight Squat','Bulgarian Split Squat','Burpees',
    'Cable Curl','Cable Flyes','Cable Kickback','Cable Row','Calf Raise',
    'Chin Ups','Close Grip Bench Press','Crunches','Dead Bug','Deadlift',
    'Diamond Push Ups','Donkey Calf Raise','Donkey Kicks','Dips','Dumbbell Flyes',
    'Dumbbell Press','Dumbbell Row','Face Pulls','Front Raise','Glute Bridge',
    'Glute Kickback','Good Morning','Hammer Curl','Hip Abduction','Hip Thrust',
    'Incline Press','Inverted Row','Jump Squat','Lat Pulldown','Lateral Raise',
    'Leg Curl','Leg Extension','Leg Raises','Lunges','Mountain Climbers',
    'Nordic Curl','Overhead Extension','Overhead Press','Pec Deck','Pike Push Ups',
    'Plank','Plank to Push Up','Preacher Curl','Pull Ups','Push Ups',
    'Resistance Bands Back Rows','Resistance Bands Bicep Curls','Resistance Bands Lateral Shoulder Raises',
    'Resistance Bands Squats','Resistance Bands Tricep Extension',
    'Reverse Flyes','Reverse Snow Angels','Romanian Deadlift','Russian Twists',
    'Seated Calf Raise','Shoulder Taps','Sissy Squat','Skull Crushers',
    'Squat','Standing Calf Raise','Step Ups','Straight Arm Pulldown','Superman',
    'T-Bar Row','Tricep Dips','Tricep Pushdown'
].filter((v,i,a) => a.indexOf(v) === i).sort();

const CARDIO_EXERCISES = ['Treadmill','Rowing Machine','Stationary Bike','Elliptical','Stair Climber'];
const CORE_EXERCISES   = ['Plank','Crunches','Russian Twists','Leg Raises','Mountain Climbers','Dead Bug'];

// ==========================================================================
// UK STORES & RESTAURANTS
// ==========================================================================
const UK_STORES_RESTAURANTS = [
    { name:'All Stores & Restaurants', value:'all',        type:'all' },
    { name:'Aldi',         value:'aldi',        type:'supermarket' },
    { name:'ASDA',         value:'asda',        type:'supermarket' },
    { name:'Booths',       value:'booths',      type:'supermarket' },
    { name:'Budgens',      value:'budgens',     type:'supermarket' },
    { name:'Co-op',        value:'coop',        type:'supermarket' },
    { name:'Costco',       value:'costco',      type:'supermarket' },
    { name:'Farmfoods',    value:'farmfoods',   type:'supermarket' },
    { name:'Iceland',      value:'iceland',     type:'supermarket' },
    { name:'Lidl',         value:'lidl',        type:'supermarket' },
    { name:'M&S Food',     value:'marks',       type:'supermarket' },
    { name:'Morrisons',    value:'morrisons',   type:'supermarket' },
    { name:'Ocado',        value:'ocado',       type:'supermarket' },
    { name:"Sainsbury's",  value:'sainsburys',  type:'supermarket' },
    { name:'Tesco',        value:'tesco',       type:'supermarket' },
    { name:'Waitrose',     value:'waitrose',    type:'supermarket' },
    { name:'Burger King',  value:'burgerking',  type:'fastfood' },
    { name:'Caffe Nero',   value:'nero',        type:'fastfood' },
    { name:'Costa Coffee', value:'costa',       type:'fastfood' },
    { name:"Domino's",     value:'dominos',     type:'fastfood' },
    { name:'Five Guys',    value:'fiveguys',    type:'fastfood' },
    { name:'Greggs',       value:'greggs',      type:'fastfood' },
    { name:'KFC',          value:'kfc',         type:'fastfood' },
    { name:'Leon',         value:'leon',        type:'fastfood' },
    { name:"McDonald's",   value:'mcdonalds',   type:'fastfood' },
    { name:"Nando's",      value:'nandos',      type:'fastfood' },
    { name:"Papa John's",  value:'papajohns',   type:'fastfood' },
    { name:'Pizza Hut',    value:'pizzahut',    type:'fastfood' },
    { name:'Pret A Manger',value:'pret',        type:'fastfood' },
    { name:'Starbucks',    value:'starbucks',   type:'fastfood' },
    { name:'Subway',       value:'subway',      type:'fastfood' },
    { name:'Wagamama',     value:'wagamama',    type:'fastfood' },
    { name:'Yo! Sushi',    value:'yosushi',     type:'fastfood' }
];

// ==========================================================================
// DASHBOARD
// ==========================================================================
function renderDashboard() {
    const todayMeals  = state.dailyMeals.filter(m => m.date === state.viewDate);
    const totalCals   = todayMeals.reduce((s,m) => s + (m.calories||0), 0);
    const totalProtein= todayMeals.reduce((s,m) => s + (m.protein||0),  0);

    setText('dash-calories', Math.round(totalCals));
    setText('dash-protein',  Math.round(totalProtein) + 'g');
    setText('dash-carbs',    Math.round(totalCals * 0.4 / 4) + 'g');
    setText('dash-fat',      Math.round(totalCals * 0.3 / 9) + 'g');

    const calorieGoal = state.goals.calories || 2500;
    const progress    = Math.min((totalCals / calorieGoal) * 534, 534);
    const ring = document.getElementById('calorie-progress');
    if (ring) ring.style.strokeDashoffset = 534 - progress;

    // Hydration
    const water     = (state.waterLogs[state.viewDate]) || 0;
    const waterGoal = state.goals.water || 2500;
    setText('water-count', `${(water/1000).toFixed(1)} / ${(waterGoal/1000).toFixed(1)}L`);

    // Steps
    const steps     = (state.stepsLogs[state.viewDate]) || 0;
    const stepsGoal = state.goals.steps || 10000;
    setText('steps-count', `${steps.toLocaleString()} / ${stepsGoal.toLocaleString()}`);

    // Toggle tracker visibility
    const hydEl = document.getElementById('hydration-tracker');
    if (hydEl) hydEl.classList.toggle('hidden', state.trackHydration === false);
    const stpEl = document.getElementById('steps-tracker');
    if (stpEl) stpEl.classList.toggle('hidden', state.trackSteps === false);

    updateCheckBtn('hydration-check', state.hydrationGoalCompletions?.[state.viewDate], 'bg-cyan-500', 'border-cyan-500');
    updateCheckBtn('steps-check',     state.stepsGoalCompletions?.[state.viewDate],     'bg-amber-500','border-amber-500');

    // Weekly overview
    const weekAgo     = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekWorkouts= (state.workoutHistory||[]).filter(w => new Date(w.date) > weekAgo).length;
    const lastWeight  = state.metricsHistory?.[0]?.weight ?? '--';
    const statsEl     = document.getElementById('muscle-volume-stats');
    if (statsEl) statsEl.innerHTML = `
        <div class="bg-white/10 p-3 rounded-xl"><div class="text-[10px] opacity-70 uppercase">This Week</div><div class="font-bold text-xl">${weekWorkouts} workouts</div></div>
        <div class="bg-white/10 p-3 rounded-xl"><div class="text-[10px] opacity-70 uppercase">Last Weight</div><div class="font-bold text-xl">${lastWeight} kg</div></div>`;

    // Habits
    if (state.habitsEnabled) {
        document.getElementById('habits-tracker')?.classList.remove('hidden');
        renderDashboardHabits();
    } else {
        document.getElementById('habits-tracker')?.classList.add('hidden');
    }

    renderAICoach();
    lucide.createIcons();
}

function setText(id, val) { const el = document.getElementById(id); if (el) el.innerText = val; }

function updateCheckBtn(id, done, colorClass, borderClass) {
    const btn = document.getElementById(id);
    if (!btn) return;
    const icon = btn.querySelector('i');
    if (done) {
        btn.classList.add(colorClass, borderClass);
        btn.classList.remove('border-slate-200');
        if (icon) { icon.classList.remove('text-transparent'); icon.classList.add('text-white'); }
    } else {
        btn.classList.remove(colorClass, borderClass);
        btn.classList.add('border-slate-200');
        if (icon) { icon.classList.add('text-transparent'); icon.classList.remove('text-white'); }
    }
}

function toggleHydrationGoal() {
    const d = state.viewDate;
    state.hydrationGoalCompletions = state.hydrationGoalCompletions || {};
    state.hydrationGoalCompletions[d] = !state.hydrationGoalCompletions[d];
    saveState(); renderDashboard();
    showToast(state.hydrationGoalCompletions[d] ? 'Hydration goal reached! 💧' : 'Hydration goal unmarked');
    lucide.createIcons();
}

function toggleStepsGoal() {
    const d = state.viewDate;
    state.stepsGoalCompletions = state.stepsGoalCompletions || {};
    state.stepsGoalCompletions[d] = !state.stepsGoalCompletions[d];
    saveState(); renderDashboard();
    showToast(state.stepsGoalCompletions[d] ? 'Steps goal reached! 👟' : 'Steps goal unmarked');
    lucide.createIcons();
}

// ==========================================================================
// TRAINING
// ==========================================================================
function setWorkoutEnv(env) {
    state.workoutEnv = env;
    ['gym','home'].forEach(e => {
        const btn = document.getElementById(`env-tab-${e}`);
        if (btn) btn.className = `flex-1 py-2 text-[10px] font-black uppercase rounded-xl ${env===e ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`;
    });
}

function toggleSpecificMuscle() {
    const focus = document.getElementById('workout-focus').value;
    document.getElementById('specific-muscle-container')?.classList.toggle('hidden', focus !== 'Specific Muscle');
}

function startWorkout(mode) {
    const focus  = document.getElementById('workout-focus').value;
    const muscle = focus === 'Specific Muscle' ? document.getElementById('specific-muscle').value : focus;

    document.getElementById('workout-setup').classList.add('hidden');
    document.getElementById('workout-active').classList.remove('hidden');
    document.getElementById('active-workout-title').innerText = muscle;
    document.getElementById('exercise-list').innerHTML = '';

    if (mode === 'ai') {
        const env  = state.workoutEnv || 'gym';
        const exDB = EXERCISE_DB[env]?.[muscle];
        const addCardio = document.getElementById('add-cardio-check').checked;
        const addCore   = document.getElementById('add-core-check').checked;

        if (exDB) {
            const compounds  = [...(exDB.compound||[])].sort(() => .5 - Math.random()).slice(0,2);
            const isolations = [...(exDB.isolation||[])].sort(() => .5 - Math.random()).slice(0,3);
            let delay = 0;
            [...compounds, ...isolations].forEach(ex => { setTimeout(() => addExercise(ex), delay); delay += 20; });
            if (addCardio) { setTimeout(() => addExercise(CARDIO_EXERCISES[Math.floor(Math.random()*CARDIO_EXERCISES.length)]), delay); delay += 20; }
            if (addCore)   {
                const c1 = CORE_EXERCISES[Math.floor(Math.random()*CORE_EXERCISES.length)];
                const c2 = CORE_EXERCISES.filter(c=>c!==c1)[Math.floor(Math.random()*(CORE_EXERCISES.length-1))];
                setTimeout(() => addExercise(c1), delay); delay += 20;
                setTimeout(() => addExercise(c2), delay);
            }
            showToast('AI workout generated! 💪');
        } else {
            showToast('No exercises found for this selection');
        }
    }

    workoutStartTime = Date.now();
    workoutTimer     = setInterval(updateWorkoutTimer, 1000);
}

function updateWorkoutTimer() {
    const e = Math.floor((Date.now() - workoutStartTime) / 1000);
    const h = Math.floor(e/3600).toString().padStart(2,'0');
    const m = Math.floor((e%3600)/60).toString().padStart(2,'0');
    const s = (e%60).toString().padStart(2,'0');
    const el = document.getElementById('workout-timer');
    if (el) el.innerText = `${h}:${m}:${s}`;
}

function addExercise(name = '') {
    const id = 'ex-' + Date.now() + '-' + Math.random().toString(36).substr(2,9);
    const pr = name ? getPersonalRecord(name) : null;

    const card = document.createElement('div');
    card.id = `card-${id}`;
    card.className = 'bg-white p-4 sm:p-5 rounded-2xl shadow-md border-2 border-indigo-100 mb-3 w-full';

    // Name row
    const nameContainer = document.createElement('div');
    nameContainer.className = 'relative mb-3';
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'flex gap-2 items-center';

    const nameInput = document.createElement('input');
    nameInput.type        = 'text';
    nameInput.value       = name;
    nameInput.placeholder = 'Search or type exercise name...';
    nameInput.className   = 'flex-1 p-3 border-2 border-slate-200 rounded-xl font-bold text-base';
    nameInput.id          = `ex-name-${id}`;
    nameInput.autocomplete= 'off';

    const infoBtn = document.createElement('button');
    infoBtn.type      = 'button';
    infoBtn.className = 'w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-200 flex-shrink-0';
    infoBtn.innerHTML = '<i data-lucide="info" class="w-5 h-5"></i>';
    infoBtn.addEventListener('click', () => {
        const n = nameInput.value.trim();
        if (n) showExerciseDemo(n); else showToast('Enter exercise name first');
    });

    const dropdown = document.createElement('div');
    dropdown.id        = `dropdown-${id}`;
    dropdown.className = 'hidden absolute z-50 mt-1 w-full bg-white rounded-xl shadow-2xl border-2 border-indigo-100 max-h-60 overflow-y-auto';

    nameInput.addEventListener('focus', () => showExerciseDropdown(id));
    nameInput.addEventListener('input', e => filterExerciseDropdown(id, e.target.value));

    inputWrapper.appendChild(nameInput);
    inputWrapper.appendChild(infoBtn);
    nameContainer.appendChild(inputWrapper);
    nameContainer.appendChild(dropdown);

    // Sets container
    const setsContainer = document.createElement('div');
    setsContainer.id        = `sets-${id}`;
    setsContainer.className = 'bg-slate-50 p-3 rounded-xl mb-3 min-h-[80px]';

    const header = document.createElement('div');
    header.className = 'flex gap-2 mb-2';
    header.innerHTML = '<div class="flex-1 text-center"><span class="text-xs font-black text-slate-600 uppercase">Reps</span></div><div class="flex-1 text-center"><span class="text-xs font-black text-slate-600 uppercase">Weight (kg)</span></div><div class="w-9"></div>';
    setsContainer.appendChild(header);

    const addSetBtn = document.createElement('button');
    addSetBtn.type      = 'button';
    addSetBtn.className = 'w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700';
    addSetBtn.textContent = '+ Add Set';
    addSetBtn.addEventListener('click', () => addSetToExercise(id, pr));

    const deleteExBtn = document.createElement('button');
    deleteExBtn.type      = 'button';
    deleteExBtn.className = 'w-full py-2 mt-2 bg-red-50 text-red-600 rounded-xl font-bold text-xs hover:bg-red-100';
    deleteExBtn.textContent = 'Delete Exercise';
    deleteExBtn.addEventListener('click', () => card.remove());

    card.appendChild(nameContainer);
    card.appendChild(setsContainer);
    card.appendChild(addSetBtn);
    card.appendChild(deleteExBtn);
    document.getElementById('exercise-list').appendChild(card);

    setTimeout(() => addSetToExercise(id, pr), 60);
    lucide.createIcons();
}

function showExerciseDropdown(id) {
    const dropdown = document.getElementById(`dropdown-${id}`);
    if (!dropdown) return;
    dropdown.innerHTML = ALL_EXERCISES.map(ex => {
        const pr = getPersonalRecord(ex);
        return `<div onclick="selectExerciseFromDropdown('${id}','${ex.replace(/'/g,"\\'")}')"
                     class="p-3 hover:bg-indigo-50 cursor-pointer border-b last:border-0 flex justify-between items-center">
            <span class="font-medium text-sm">${ex}</span>
            ${pr ? `<span class="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded">PR: ${pr}kg</span>` : ''}
        </div>`;
    }).join('');
    dropdown.classList.remove('hidden');
}

function filterExerciseDropdown(id, query) {
    const dropdown = document.getElementById(`dropdown-${id}`);
    if (!dropdown) return;
    const filtered = query ? ALL_EXERCISES.filter(ex => ex.toLowerCase().includes(query.toLowerCase())) : ALL_EXERCISES;
    if (filtered.length === 0) {
        dropdown.innerHTML = '<div class="p-3 text-slate-400 text-sm italic text-center">No matches — keep typing for custom name</div>';
        dropdown.classList.remove('hidden');
    } else {
        dropdown.innerHTML = filtered.map(ex => {
            const pr = getPersonalRecord(ex);
            return `<div onclick="selectExerciseFromDropdown('${id}','${ex.replace(/'/g,"\\'")}')"
                         class="p-3 hover:bg-indigo-50 cursor-pointer border-b last:border-0 flex justify-between items-center">
                <span class="font-medium text-sm">${ex}</span>
                ${pr ? `<span class="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded">PR: ${pr}kg</span>` : ''}
            </div>`;
        }).join('');
        dropdown.classList.remove('hidden');
    }
}

function selectExerciseFromDropdown(id, exerciseName) {
    const input    = document.getElementById(`ex-name-${id}`);
    const dropdown = document.getElementById(`dropdown-${id}`);
    if (input)    input.value = exerciseName;
    if (dropdown) dropdown.classList.add('hidden');
    const pr = getPersonalRecord(exerciseName);
    if (pr) showToast(`PR for ${exerciseName}: ${pr}kg`);
}

function addSetToExercise(exerciseId, pr) {
    const container = document.getElementById(`sets-${exerciseId}`);
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'flex gap-2 items-center mb-2 bg-white p-2 rounded-lg border border-slate-200';

    const repsInput = document.createElement('input');
    repsInput.type        = 'number';
    repsInput.placeholder = 'Reps';
    repsInput.min         = '0';
    repsInput.className   = 'flex-1 p-3 bg-slate-50 rounded-lg text-center font-bold text-base border-2 border-transparent focus:border-indigo-500';

    const weightDiv = document.createElement('div');
    weightDiv.className   = 'flex-1 relative';
    const weightInput = document.createElement('input');
    weightInput.type        = 'number';
    weightInput.placeholder = 'Weight';
    weightInput.min         = '0';
    weightInput.step        = '0.5';
    weightInput.className   = 'w-full p-3 bg-slate-50 rounded-lg text-center font-bold text-base border-2 border-transparent focus:border-indigo-500';
    weightDiv.appendChild(weightInput);

    if (pr) {
        const badge = document.createElement('span');
        badge.className   = 'absolute -top-2 -right-2 text-[9px] font-black text-white bg-emerald-500 px-2 py-1 rounded-full shadow-md whitespace-nowrap z-10';
        badge.textContent = `PB ${pr}kg`;
        weightDiv.appendChild(badge);
    }

    const delBtn = document.createElement('button');
    delBtn.type      = 'button';
    delBtn.className = 'w-9 h-9 flex items-center justify-center bg-red-50 text-red-500 rounded-lg hover:bg-red-100 font-bold text-xl flex-shrink-0';
    delBtn.textContent = '×';
    delBtn.addEventListener('click', () => row.remove());

    row.appendChild(repsInput);
    row.appendChild(weightDiv);
    row.appendChild(delBtn);
    container.appendChild(row);
}

function getPersonalRecord(exerciseName) {
    let max = 0;
    (state.workoutHistory || []).forEach(w => {
        (w.exercises || []).forEach(ex => {
            if (ex.name === exerciseName) {
                (ex.sets || []).forEach(s => {
                    const w = parseFloat(s.weight) || parseFloat(s.kg) || 0;
                    if (w > max) max = w;
                });
            }
        });
    });
    return max > 0 ? max : null;
}

function saveWorkout() {
    clearInterval(workoutTimer);
    const exercises = [];
    document.querySelectorAll('#exercise-list > div').forEach(card => {
        const nameInput = card.querySelector('input[type="text"]');
        const name = nameInput ? nameInput.value.trim() : '';
        if (!name) return;
        const sets = [];
        card.querySelectorAll('.flex.gap-2.items-center.mb-2').forEach(row => {
            const inputs = row.querySelectorAll('input[type="number"]');
            if (inputs.length >= 2 && inputs[0].value && inputs[1].value) {
                sets.push({ reps: inputs[0].value, weight: inputs[1].value });
            }
        });
        if (sets.length > 0) exercises.push({ name, sets });
    });
    if (exercises.length === 0) { showToast('Add at least one exercise with sets'); return; }

    const workoutDate = window.selectedWorkoutDate || document.getElementById('workout-date-picker').value || new Date().toISOString().split('T')[0];
    state.workoutHistory.unshift({
        id: Date.now(), date: workoutDate,
        focus:    document.getElementById('active-workout-title').innerText,
        duration: document.getElementById('workout-timer').innerText,
        exercises
    });
    saveState();
    document.getElementById('workout-setup').classList.remove('hidden');
    document.getElementById('workout-active').classList.add('hidden');
    renderDashboard();
    showToast('Workout saved! 🏋️');
}

function cancelWorkout() {
    if (confirm('Discard workout?')) {
        clearInterval(workoutTimer);
        document.getElementById('workout-setup').classList.remove('hidden');
        document.getElementById('workout-active').classList.add('hidden');
    }
}

// ==========================================================================
// DATE MANAGEMENT
// ==========================================================================
function changeWorkoutDate(days) {
    const d = new Date((document.getElementById('workout-date-picker').value || new Date().toISOString().split('T')[0]) + 'T00:00:00');
    d.setDate(d.getDate() + days);
    selectWorkoutDate(d.toISOString().split('T')[0]);
}
function selectWorkoutDate(dateStr) {
    document.getElementById('workout-date-picker').value = dateStr;
    window.selectedWorkoutDate = dateStr;
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('workout-date-warning')?.classList.toggle('hidden', dateStr === today);
    lucide.createIcons();
}

function changeNutritionDate(days) {
    const d = new Date((document.getElementById('nutrition-date-picker').value || new Date().toISOString().split('T')[0]) + 'T00:00:00');
    d.setDate(d.getDate() + days);
    selectNutritionDate(d.toISOString().split('T')[0]);
}
function selectNutritionDate(dateStr) {
    // Auto-save current before switching
    const oldDate = state.viewDate;
    if (oldDate && oldDate !== dateStr && state.dailyMeals.some(m => m.date === oldDate)) saveDailyNutrition();
    state.viewDate = dateStr;
    const picker = document.getElementById('nutrition-date-picker');
    if (picker) picker.value = dateStr;
    const today = dateStr === new Date().toISOString().split('T')[0];
    document.getElementById('nutrition-date-warning')?.classList.toggle('hidden', today);
    document.getElementById('nutrition-save-buttons')?.classList.toggle('hidden', today);
    renderDiary();
    renderDashboard();
    lucide.createIcons();
}
function saveNutritionChanges() {
    const today = new Date().toISOString().split('T')[0];
    if (state.viewDate !== today) {
        const meals = state.dailyMeals.filter(m => m.date === state.viewDate);
        if (meals.length > 0) {
            state.nutritionHistory = state.nutritionHistory.filter(h => h.date !== state.viewDate);
            state.nutritionHistory.unshift({ date: state.viewDate, calories: meals.reduce((s,m)=>s+(m.calories||0),0), protein: meals.reduce((s,m)=>s+(m.protein||0),0), meals });
        }
    }
    saveState(); showToast('Changes saved!');
    selectNutritionDate(new Date().toISOString().split('T')[0]);
}
function cancelNutritionChanges() {
    loadState();
    selectNutritionDate(new Date().toISOString().split('T')[0]);
    showToast('Changes cancelled');
}

function changeMetricsDate(days) {
    const d = new Date((document.getElementById('metrics-date-picker').value || new Date().toISOString().split('T')[0]) + 'T00:00:00');
    d.setDate(d.getDate() + days);
    selectMetricsDate(d.toISOString().split('T')[0]);
}
function selectMetricsDate(dateStr) {
    state.metricsDate = dateStr;
    const picker = document.getElementById('metrics-date-picker');
    if (picker) picker.value = dateStr;
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('metrics-date-warning')?.classList.toggle('hidden', dateStr === today);
    const existing = (state.metricsHistory || []).find(m => m.date === dateStr);
    ['weight','chest','shoulders','arms','waist','legs','glutes'].forEach(f => {
        const el = document.getElementById(`metric-${f}`);
        if (el) el.value = existing ? (existing[f] || '') : '';
    });
    state.currentPhotos = existing?.photos ? { ...existing.photos } : { front:null, side:null, back:null };
    ['front','side','back'].forEach(t => {
        const img = document.getElementById(`photo-${t}-preview`);
        if (!img) return;
        if (existing?.photos?.[t]) { img.src = existing.photos[t]; img.classList.remove('hidden'); }
        else img.classList.add('hidden');
    });
    lucide.createIcons();
}

// ==========================================================================
// NUTRITION — TAB & DIARY
// ==========================================================================
function setNutritionTab(tab) {
    ['diary','search'].forEach(t => {
        const btn  = document.getElementById(`nut-tab-${t}`);
        const view = document.getElementById(`nut-view-${t}`);
        if (btn)  btn.className  = `flex-1 py-4 text-xs font-black uppercase rounded-xl ${t===tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`;
        if (view) view.classList.toggle('hidden', t !== tab);
    });
    if (tab === 'diary')  { renderDiary(); renderNutritionHistory(); }
    if (tab === 'search') renderCreatedMeals();
}

function renderDiary() {
    const todayMeals   = state.dailyMeals.filter(m => m.date === state.viewDate);
    const totalCals    = todayMeals.reduce((s,m) => s+(m.calories||0), 0);
    const totalProtein = todayMeals.reduce((s,m) => s+(m.protein||0),  0);
    setText('total-kcal',    Math.round(totalCals));
    setText('total-protein', totalProtein.toFixed(1));

    const icons = { breakfast:'coffee', lunch:'utensils', dinner:'moon', snack:'cookie' };
    const html  = ['breakfast','lunch','dinner','snack'].map(section => {
        const meals = todayMeals.filter(m => m.mealType === section);
        return `<div class="mb-6">
            <div class="flex items-center gap-2 mb-3">
                <i data-lucide="${icons[section]}" class="w-4 h-4 text-slate-400"></i>
                <h3 class="text-[11px] font-black text-slate-400 uppercase">${section}</h3>
            </div>
            ${meals.length === 0 ? '<p class="text-xs text-slate-300 italic px-4">Nothing logged</p>' : ''}
            ${meals.map(m => `
                <div class="bg-white p-4 rounded-[24px] mb-2 border border-slate-100 flex items-center gap-4">
                    <img src="${m.image||'https://via.placeholder.com/100'}" class="w-12 h-12 object-contain bg-slate-50 rounded-lg p-1 flex-shrink-0" onerror="this.src='https://via.placeholder.com/100'">
                    <div class="flex-1 min-w-0">
                        <p class="font-bold text-sm truncate">${m.name}</p>
                        <p class="text-xs text-slate-400">${m.amount} • ${m.calories}kcal • ${m.protein}g protein</p>
                    </div>
                    <button onclick="removeMeal(${m.id})" class="text-slate-300 hover:text-red-500 flex-shrink-0">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>`).join('')}
        </div>`;
    }).join('');

    const el = document.getElementById('meal-sections');
    if (el) el.innerHTML = html;
    lucide.createIcons();
}

function removeMeal(id) {
    state.dailyMeals = state.dailyMeals.filter(m => m.id !== id);
    saveState(); autoSaveNutrition(); renderDiary(); renderDashboard();
    showToast('Item removed');
}

// ==========================================================================
// FOOD SEARCH
// ==========================================================================
function showStoreDropdown() {
    const dropdown = document.getElementById('store-dropdown');
    if (!dropdown) return;
    dropdown.innerHTML = UK_STORES_RESTAURANTS.map(s => {
        const icon = s.type==='fastfood' ? '🍔' : s.type==='supermarket' ? '🛒' : '🌐';
        return `<div onclick="selectStore('${s.value}','${s.name.replace(/'/g,"\\'")}')" class="p-3 hover:bg-indigo-50 cursor-pointer border-b last:border-0 flex items-center gap-2">
            <span>${icon}</span><span class="font-medium text-sm flex-1">${s.name}</span>
        </div>`;
    }).join('');
    dropdown.classList.remove('hidden');
}
function filterStoreDropdown(query) {
    const dropdown = document.getElementById('store-dropdown');
    if (!dropdown) return;
    const filtered = UK_STORES_RESTAURANTS.filter(s => s.name.toLowerCase().includes(query.toLowerCase()));
    dropdown.innerHTML = filtered.length === 0
        ? '<div class="p-3 text-slate-400 text-sm italic text-center">No stores found</div>'
        : filtered.map(s => {
            const icon = s.type==='fastfood' ? '🍔' : s.type==='supermarket' ? '🛒' : '🌐';
            return `<div onclick="selectStore('${s.value}','${s.name.replace(/'/g,"\\'")}')" class="p-3 hover:bg-indigo-50 cursor-pointer border-b last:border-0 flex items-center gap-2">
                <span>${icon}</span><span class="font-medium text-sm flex-1">${s.name}</span>
            </div>`;
        }).join('');
    dropdown.classList.remove('hidden');
}
function selectStore(value, name) {
    const input = document.getElementById('store-search-input');
    if (input) input.value = name;
    const hidden = document.getElementById('store-select');
    if (hidden) hidden.value = value;
    document.getElementById('store-dropdown')?.classList.add('hidden');
    showToast(`Filter: ${name}`);
    const fi = document.getElementById('food-search-input');
    if (fi && fi.value.trim().length >= 2) searchFood(fi.value.trim());
}
function clearStoreFilter() {
    const input = document.getElementById('store-search-input');
    if (input) input.value = 'All Stores & Restaurants';
    const hidden = document.getElementById('store-select');
    if (hidden) hidden.value = 'all';
    showToast('Filter cleared');
    const fi = document.getElementById('food-search-input');
    if (fi && fi.value.trim().length >= 2) searchFood(fi.value.trim());
}

let searchDebounce;
async function searchFood(query) {
    const loadingEl = document.getElementById('search-loading');
    const resultsEl = document.getElementById('search-results-list');
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (resultsEl) resultsEl.innerHTML = '';

    try {
        const storeValue   = document.getElementById('store-select')?.value || 'all';
        const selectedStore= UK_STORES_RESTAURANTS.find(s => s.value === storeValue);
        let results = [];

        const buildOFF = p => ({
            name:         p.product_name || 'Unknown',
            image:        p.image_small_url || 'https://via.placeholder.com/100',
            calories:     Math.round(p.nutriments?.['energy-kcal_100g'] || 0),
            protein:      parseFloat(p.nutriments?.proteins_100g       || 0).toFixed(1),
            carbs:        parseFloat(p.nutriments?.carbohydrates_100g  || 0).toFixed(1),
            fat:          parseFloat(p.nutriments?.fat_100g             || 0).toFixed(1),
            fiber:        parseFloat(p.nutriments?.fiber_100g           || 0).toFixed(1),
            sugar:        parseFloat(p.nutriments?.sugars_100g          || 0).toFixed(1),
            sodium:       parseFloat(p.nutriments?.sodium_100g          || 0).toFixed(3),
            saturated_fat:parseFloat(p.nutriments?.['saturated-fat_100g']||0).toFixed(1),
            cholesterol:  parseFloat(p.nutriments?.cholesterol_100g    || 0).toFixed(1),
            serving:      p.serving_size || '100g',
            brand:        p.brands || '',
            source:       'OpenFoodFacts'
        });

        const buildUSDA = f => {
            const n = f.foodNutrients || [];
            const getN = names => { for (const nm of names) { const found = n.find(x => x.nutrientName?.toLowerCase().includes(nm)); if (found) return parseFloat(found.value||0); } return 0; };
            return {
                name:f.description||'Unknown', image:'https://via.placeholder.com/100',
                calories:Math.round(getN(['energy','calories'])),
                protein:getN(['protein']).toFixed(1), carbs:getN(['carbohydrate']).toFixed(1),
                fat:getN(['total lipid','total fat']).toFixed(1), fiber:getN(['fiber']).toFixed(1),
                sugar:getN(['sugars']).toFixed(1), sodium:(getN(['sodium'])/1000).toFixed(3),
                saturated_fat:getN(['saturated']).toFixed(1), cholesterol:getN(['cholesterol']).toFixed(1),
                serving: f.servingSize ? `${f.servingSize}${f.servingSizeUnit||'g'}` : '100g',
                brand:f.brandName||'', source:'USDA'
            };
        };

        if (storeValue !== 'all' && selectedStore) {
            const q = `${query} ${selectedStore.name}`;
            try {
                const r = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&json=1&page_size=50&tagtype_0=countries&tag_contains_0=contains&tag_0=united-kingdom`);
                const d = await r.json();
                const sl = selectedStore.name.toLowerCase();
                results = (d.products||[]).map(buildOFF).filter(i => (i.brand||'').toLowerCase().includes(sl) || (i.name||'').toLowerCase().includes(sl));
            } catch {}
            if (results.length < 10) {
                try {
                    const r = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(q)}&dataType=Branded&pageSize=30&api_key=DEMO_KEY`);
                    const d = await r.json();
                    const sl = selectedStore.name.toLowerCase();
                    results = [...results, ...(d.foods||[]).filter(f => (f.description||'').toLowerCase().includes(sl)||(f.brandName||'').toLowerCase().includes(sl)).map(buildUSDA)];
                } catch {}
            }
        } else {
            try {
                const r = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&json=1&page_size=20&tagtype_0=countries&tag_contains_0=contains&tag_0=united-kingdom`);
                const d = await r.json();
                results = (d.products||[]).map(buildOFF);
            } catch {}
            try {
                const r = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=10&api_key=DEMO_KEY`);
                const d = await r.json();
                results = [...results, ...(d.foods||[]).slice(0,10).map(buildUSDA)];
            } catch {}
        }

        // Deduplicate
        const seen = new Set();
        const unique = [];
        for (const item of results) {
            const key = (item.name||'').toLowerCase().replace(/[^a-z0-9]/g,'');
            if (!seen.has(key)) { seen.add(key); unique.push(item); }
        }

        const customMatches = (state.customFoods||[]).filter(f =>
            (f.name||'').toLowerCase().includes(query.toLowerCase()) || (f.brand||'').toLowerCase().includes(query.toLowerCase())
        );
        searchResults = [...customMatches, ...unique];
        renderSearchResults();
    } catch { showToast('Search failed — check connection'); }
    finally { if (loadingEl) loadingEl.classList.add('hidden'); }
}

function renderSearchResults() {
    const storeValue    = document.getElementById('store-select')?.value || 'all';
    const storeName     = storeValue !== 'all' ? UK_STORES_RESTAURANTS.find(s => s.value === storeValue)?.name : null;
    const filterMessage = storeName
        ? `<div class="flex items-center justify-between py-3 mb-3 bg-indigo-50 rounded-2xl px-4">
               <span class="text-indigo-700 text-xs font-bold">Filtering by ${storeName}</span>
               <button onclick="clearStoreFilter()" class="text-xs font-bold text-red-600">Clear ×</button>
           </div>`
        : '';

    const el = document.getElementById('search-results-list');
    if (!el) return;

    if (searchResults.length === 0) {
        el.innerHTML = filterMessage + (storeName
            ? `<div class="text-center py-12"><p class="text-slate-600 font-bold mb-2">No products found from ${storeName}</p><button onclick="clearStoreFilter()" class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold mt-3">Search All Stores</button></div>`
            : '<p class="text-center text-slate-400 py-8">No results found</p>');
        lucide.createIcons(); return;
    }

    el.innerHTML = filterMessage + searchResults.map((item, idx) => `
        <div onclick="openFoodPopup(${idx})" class="bg-white p-4 rounded-[28px] border ${item.source==='Custom'?'border-purple-200 bg-purple-50':'border-slate-100'} flex items-center gap-4 cursor-pointer hover:shadow-lg transition-all">
            <img src="${item.image}" class="w-14 h-14 object-contain bg-slate-50 rounded-xl p-1 flex-shrink-0" onerror="this.src='https://via.placeholder.com/100'">
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1 flex-wrap">
                    <p class="font-bold text-sm">${item.name}</p>
                    ${item.source==='Custom' ? '<span class="text-[8px] font-black px-1.5 py-0.5 rounded bg-purple-500 text-white">MY FOOD</span>' : ''}
                    ${item.source&&item.source!=='Custom' ? `<span class="text-[8px] font-black px-1.5 py-0.5 rounded ${item.source==='USDA'?'bg-green-100 text-green-700':'bg-blue-100 text-blue-700'}">${item.source}</span>` : ''}
                </div>
                ${item.brand ? `<p class="text-[10px] text-indigo-600 font-semibold mb-1">${item.brand}</p>` : ''}
                <p class="text-xs text-slate-400">${item.calories}kcal • ${item.protein}g protein • ${item.serving}</p>
            </div>
            <i data-lucide="plus" class="text-emerald-600 flex-shrink-0"></i>
        </div>`).join('');
    lucide.createIcons();
}

// ==========================================================================
// MANUAL FOOD ENTRY
// ==========================================================================
function openManualFoodEntry() {
    document.getElementById('manual-food-modal').style.display = 'flex';
    ['manual-food-name','manual-food-store-input','manual-food-calories','manual-food-protein',
     'manual-food-carbs','manual-food-fat','manual-food-fiber','manual-food-sugar'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    const s = document.getElementById('manual-food-serving'); if (s) s.value = '100g';
    clearManualFoodImage(); lucide.createIcons();
}
function closeManualFoodEntry() { document.getElementById('manual-food-modal').style.display='none'; manualFoodImageData=null; }
function previewManualFoodImage(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        manualFoodImageData = e.target.result;
        const preview = document.getElementById('manual-food-preview');
        if (preview) preview.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover rounded-2xl">`;
    };
    reader.readAsDataURL(file);
}
function clearManualFoodImage() {
    manualFoodImageData = null;
    const p = document.getElementById('manual-food-preview');
    if (p) p.innerHTML = '<i data-lucide="image" class="w-10 h-10 text-slate-300"></i>';
    const f = document.getElementById('manual-food-image'); if (f) f.value = '';
    lucide.createIcons();
}
function toggleManualFoodMacros() {
    const d = document.getElementById('manual-food-macros');
    const t = document.getElementById('manual-macros-toggle');
    const hidden = d.classList.contains('hidden');
    d.classList.toggle('hidden');
    if (t) t.innerText = hidden ? '- Hide Extra Details' : '+ Add More Details (Optional)';
}
function showManualStoreDropdown() {
    const dropdown = document.getElementById('manual-store-dropdown'); if (!dropdown) return;
    dropdown.innerHTML = UK_STORES_RESTAURANTS.map(s => {
        const icon = s.type==='fastfood'?'🍔':s.type==='supermarket'?'🛒':'🌐';
        return `<div onclick="selectManualStore('${s.name.replace(/'/g,"\\'")}') " class="p-3 hover:bg-indigo-50 cursor-pointer border-b last:border-0 flex items-center gap-2">
            <span>${icon}</span><span class="font-medium text-sm flex-1">${s.name}</span>
        </div>`;
    }).join('');
    dropdown.classList.remove('hidden');
}
function filterManualStoreDropdown(query) {
    const dropdown = document.getElementById('manual-store-dropdown'); if (!dropdown) return;
    const filtered = UK_STORES_RESTAURANTS.filter(s => s.name.toLowerCase().includes(query.toLowerCase()));
    dropdown.innerHTML = filtered.length === 0
        ? '<div class="p-3 text-slate-400 text-sm italic text-center">No stores found</div>'
        : filtered.map(s => {
            const icon = s.type==='fastfood'?'🍔':s.type==='supermarket'?'🛒':'🌐';
            return `<div onclick="selectManualStore('${s.name.replace(/'/g,"\\'")}') " class="p-3 hover:bg-indigo-50 cursor-pointer border-b last:border-0 flex items-center gap-2">
                <span>${icon}</span><span class="font-medium text-sm flex-1">${s.name}</span>
            </div>`;
        }).join('');
    dropdown.classList.remove('hidden');
}
function selectManualStore(storeName) {
    const i = document.getElementById('manual-food-store-input'); if (i) i.value = storeName;
    document.getElementById('manual-store-dropdown')?.classList.add('hidden');
}
function saveManualFood() {
    const name     = document.getElementById('manual-food-name')?.value.trim();
    const store    = document.getElementById('manual-food-store-input')?.value.trim();
    const calories = parseFloat(document.getElementById('manual-food-calories')?.value) || 0;
    const protein  = parseFloat(document.getElementById('manual-food-protein')?.value)  || 0;
    const carbs    = parseFloat(document.getElementById('manual-food-carbs')?.value)    || 0;
    const fat      = parseFloat(document.getElementById('manual-food-fat')?.value)      || 0;
    const fiber    = parseFloat(document.getElementById('manual-food-fiber')?.value)    || 0;
    const sugar    = parseFloat(document.getElementById('manual-food-sugar')?.value)    || 0;
    const serving  = document.getElementById('manual-food-serving')?.value.trim() || '100g';
    if (!name)                    { showToast('Please enter food name'); return; }
    if (!calories && !protein)    { showToast('Please enter at least calories or protein'); return; }
    const food = {
        id:name+Date.now(), name, brand:store||'Custom',
        image:manualFoodImageData||'https://via.placeholder.com/100',
        calories, protein:protein.toFixed(1), carbs:carbs.toFixed(1), fat:fat.toFixed(1),
        fiber:fiber.toFixed(1), sugar:sugar.toFixed(1), sodium:'0', saturated_fat:'0', cholesterol:'0', serving, source:'Custom'
    };
    if (!state.customFoods) state.customFoods = [];
    state.customFoods.push(food);
    saveState(); closeManualFoodEntry(); showToast(`${name} saved to My Foods!`);
    searchResults.unshift(food); renderSearchResults();
}

// ==========================================================================
// FOOD POPUP
// ==========================================================================
function openFoodPopup(idx) {
    currentFoodItem = searchResults[idx];
    if (!currentFoodItem) return;
    document.getElementById('popup-image').src           = currentFoodItem.image || 'https://via.placeholder.com/100';
    document.getElementById('popup-name').innerText      = currentFoodItem.name;
    document.getElementById('popup-nutrition').innerText = `Per ${currentFoodItem.serving}${currentFoodItem.source?' • '+currentFoodItem.source:''}`;
    document.getElementById('popup-nutrition-cals').innerText      = currentFoodItem.calories;
    document.getElementById('popup-nutrition-protein').innerText   = currentFoodItem.protein;
    document.getElementById('popup-nutrition-carbs').innerText     = (currentFoodItem.carbs||0)+'g';
    document.getElementById('popup-nutrition-fat').innerText       = (currentFoodItem.fat||0)+'g';
    document.getElementById('popup-nutrition-fiber').innerText     = (currentFoodItem.fiber||0)+'g';
    document.getElementById('popup-nutrition-sugar').innerText     = (currentFoodItem.sugar||0)+'g';
    document.getElementById('popup-nutrition-satfat').innerText    = (currentFoodItem.saturated_fat||0)+'g';
    document.getElementById('popup-nutrition-sodium').innerText    = (currentFoodItem.sodium||0)+'g';
    document.getElementById('popup-nutrition-cholesterol').innerText = Math.round(currentFoodItem.cholesterol||0)+'mg';
    document.getElementById('detailed-nutrition').classList.add('hidden');
    document.getElementById('toggle-text').innerText = 'Show More ▼';
    document.getElementById('popup-amount').value = 1;
    currentAmountType = 'portion';
    setAmountType('portion');
    updateFoodPopup();
    document.getElementById('food-popup').style.display = 'flex';
    lucide.createIcons();
}
function toggleDetailedNutrition() {
    const d = document.getElementById('detailed-nutrition');
    const t = document.getElementById('toggle-text');
    const hidden = d.classList.contains('hidden');
    d.classList.toggle('hidden');
    if (t) t.innerText = hidden ? 'Show Less ▲' : 'Show More ▼';
}
function closeFoodPopup() { document.getElementById('food-popup').style.display='none'; }
function setAmountType(type) {
    currentAmountType = type;
    ['portion','grams'].forEach(t => {
        const btn = document.getElementById(`amount-type-${t}`);
        if (btn) btn.className = `flex-1 py-3 rounded-xl text-xs font-black uppercase ${t===type?'bg-white shadow text-emerald-600':'text-slate-400'}`;
    });
    updateFoodPopup();
}
function updateFoodPopup() {
    if (!currentFoodItem) return;
    const amount     = parseFloat(document.getElementById('popup-amount')?.value) || 0;
    const multiplier = currentAmountType==='portion' ? amount : amount/100;
    setText('popup-total-kcal',    Math.round(currentFoodItem.calories * multiplier));
    setText('popup-total-protein', (parseFloat(currentFoodItem.protein)*multiplier).toFixed(1)+'g');
}
function addFoodItem() {
    if (!currentFoodItem) return;
    const amount     = parseFloat(document.getElementById('popup-amount').value) || 0;
    const multiplier = currentAmountType==='portion' ? amount : amount/100;
    const mealType   = document.getElementById('popup-meal-type').value;
    state.dailyMeals.push({
        id:Date.now(), date:state.viewDate, name:currentFoodItem.name, image:currentFoodItem.image,
        amount: currentAmountType==='portion' ? `${amount} portion(s)` : `${amount}g`,
        calories:      Math.round(currentFoodItem.calories*multiplier),
        protein:       parseFloat((parseFloat(currentFoodItem.protein)*multiplier).toFixed(1)),
        carbs:         parseFloat(((parseFloat(currentFoodItem.carbs)||0)*multiplier).toFixed(1)),
        fat:           parseFloat(((parseFloat(currentFoodItem.fat)||0)*multiplier).toFixed(1)),
        fiber:         parseFloat(((parseFloat(currentFoodItem.fiber)||0)*multiplier).toFixed(1)),
        sugar:         parseFloat(((parseFloat(currentFoodItem.sugar)||0)*multiplier).toFixed(1)),
        sodium:        parseFloat(((parseFloat(currentFoodItem.sodium)||0)*multiplier).toFixed(3)),
        saturated_fat: parseFloat(((parseFloat(currentFoodItem.saturated_fat)||0)*multiplier).toFixed(1)),
        cholesterol:   parseFloat(((parseFloat(currentFoodItem.cholesterol)||0)*multiplier).toFixed(1)),
        mealType, source: currentFoodItem.source||'Manual'
    });
    saveState(); autoSaveNutrition(); closeFoodPopup(); setNutritionTab('diary'); renderDashboard();
    showToast('Added to diary! 🍽️');
}

// ==========================================================================
// BARCODE SCANNER
// ==========================================================================
function openBarcodeScanner() {
    document.getElementById('barcode-scanner-modal').style.display='flex';
    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode('barcode-reader');
        html5QrCode.start({ facingMode:'environment' }, { fps:10, qrbox:250 }, code => {
            const bi = document.getElementById('manual-barcode'); if (bi) bi.value=code;
            lookupBarcode();
        }).catch(e => console.error('Scanner error:', e));
    }
}
function closeBarcodeScanner() {
    if (html5QrCode) { html5QrCode.stop().catch(()=>{}); html5QrCode=null; }
    document.getElementById('barcode-scanner-modal').style.display='none';
}
async function lookupBarcode() {
    const code = document.getElementById('manual-barcode')?.value.trim();
    if (!code) return;
    try {
        const r = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
        const d = await r.json();
        if (d.status===1) {
            const p = d.product;
            searchResults = [{
                name:p.product_name||'Unknown', image:p.image_small_url||'https://via.placeholder.com/100',
                calories:Math.round(p.nutriments?.['energy-kcal_100g']||0),
                protein:parseFloat(p.nutriments?.proteins_100g||0).toFixed(1),
                carbs:parseFloat(p.nutriments?.carbohydrates_100g||0).toFixed(1),
                fat:parseFloat(p.nutriments?.fat_100g||0).toFixed(1),
                fiber:parseFloat(p.nutriments?.fiber_100g||0).toFixed(1),
                sugar:parseFloat(p.nutriments?.sugars_100g||0).toFixed(1),
                sodium:parseFloat(p.nutriments?.sodium_100g||0).toFixed(3),
                saturated_fat:parseFloat(p.nutriments?.['saturated-fat_100g']||0).toFixed(1),
                cholesterol:'0', serving:p.serving_size||'100g', brand:p.brands||'', source:'OpenFoodFacts'
            }];
            closeBarcodeScanner(); openFoodPopup(0);
        } else { showToast('Product not found'); }
    } catch { showToast('Barcode lookup failed'); }
}

// ==========================================================================
// CREATED MEALS
// ==========================================================================
function renderCreatedMeals() {
    const html = (state.createdMeals||[]).map((meal,idx) => `
        <div class="bg-white p-4 rounded-[28px] border border-slate-100 flex items-center gap-4">
            <div class="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <i data-lucide="chef-hat" class="text-emerald-600 w-7 h-7"></i>
            </div>
            <div class="flex-1 min-w-0 cursor-pointer" onclick="addCreatedMeal(${idx})">
                <p class="font-bold text-sm truncate">${meal.name}</p>
                <p class="text-xs text-slate-400">${meal.calories}kcal • ${meal.protein}g protein • ${meal.ingredients.length} ingredients</p>
            </div>
            <div class="flex gap-2 flex-shrink-0">
                <button onclick="addCreatedMeal(${idx})" class="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center"><i data-lucide="plus" class="w-4 h-4"></i></button>
                <button onclick="editCreatedMeal(${idx})" class="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                <button onclick="deleteCreatedMeal(${idx})" class="w-9 h-9 bg-red-50 text-red-600 rounded-lg flex items-center justify-center"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        </div>`).join('');
    const list = document.getElementById('created-meals-list');
    if (list) list.innerHTML = html || '<p class="text-center text-slate-400 py-8 text-sm">No custom meals created yet</p>';
    lucide.createIcons();
}
function addCreatedMeal(idx) {
    const meal = state.createdMeals[idx]; if (!meal) return;
    state.dailyMeals.push({ id:Date.now(), date:state.viewDate, name:meal.name, image:'https://via.placeholder.com/100', amount:'1 meal', calories:meal.calories, protein:meal.protein, carbs:meal.carbs||0, fat:meal.fat||0, fiber:meal.fiber||0, mealType:'dinner' });
    saveState(); autoSaveNutrition(); setNutritionTab('diary'); renderDashboard(); showToast('Meal added! 🍽️');
}
function editCreatedMeal(idx) {
    const meal = state.createdMeals[idx];
    const ni = document.getElementById('meal-name-input'); if (ni) ni.value = meal.name;
    mealIngredients = [...meal.ingredients]; renderMealIngredients();
    document.getElementById('create-meal-modal').style.display='flex';
    window.editingMealIndex = idx;
    const t = document.querySelector('#create-meal-modal h3'); if (t) t.textContent='Edit Meal';
    lucide.createIcons();
}
function deleteCreatedMeal(idx) {
    if (confirm(`Delete "${state.createdMeals[idx].name}"?`)) {
        state.createdMeals.splice(idx,1); saveState(); renderCreatedMeals(); showToast('Meal deleted');
    }
}
function openCreateMeal() {
    mealIngredients = [];
    const ni = document.getElementById('meal-name-input'); if (ni) ni.value='';
    renderMealIngredients();
    document.getElementById('create-meal-modal').style.display='flex';
    window.editingMealIndex = null;
    const t = document.querySelector('#create-meal-modal h3'); if (t) t.textContent='Create Meal';
    lucide.createIcons();
}
function closeCreateMeal() { document.getElementById('create-meal-modal').style.display='none'; window.editingMealIndex=null; }

let mealSearchDebounce;
async function searchMealIngredient(query) {
    try {
        const r = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&json=1&page_size=10&tagtype_0=countries&tag_contains_0=contains&tag_0=united-kingdom`);
        const d = await r.json();
        const items = (d.products||[]).map(p => ({
            name:p.product_name||'Unknown', image:p.image_small_url||'https://via.placeholder.com/100',
            calories:Math.round(p.nutriments?.['energy-kcal_100g']||0),
            protein:parseFloat(p.nutriments?.proteins_100g||0).toFixed(1)
        }));
        const resultsEl = document.getElementById('meal-search-results');
        if (resultsEl) resultsEl.innerHTML = items.map(item =>
            `<div onclick="promptAddIngredient('${item.name.replace(/'/g,"\\'") }',${item.calories},${item.protein},'${item.image}')" class="bg-slate-50 p-3 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-slate-100">
                <img src="${item.image}" class="w-10 h-10 object-contain rounded" onerror="this.src='https://via.placeholder.com/100'">
                <div class="flex-1 min-w-0"><p class="font-bold text-xs truncate">${item.name}</p><p class="text-[10px] text-slate-400">${item.calories}kcal, ${item.protein}g protein</p></div>
            </div>`
        ).join('');
    } catch (e) { console.error('Ingredient search:', e); }
}
function promptAddIngredient(name, calories, protein, image) {
    const amount = prompt('Enter amount (in grams):', '100'); if (!amount) return;
    const mult = parseFloat(amount)/100;
    mealIngredients.push({ name, amount:`${amount}g`, calories:Math.round(calories*mult), protein:parseFloat((protein*mult).toFixed(1)) });
    renderMealIngredients();
    const s = document.getElementById('meal-ingredient-search'); if (s) s.value='';
    const r = document.getElementById('meal-search-results'); if (r) r.innerHTML='';
}
function renderMealIngredients() {
    const html = mealIngredients.map((ing,idx) =>
        `<div class="bg-slate-50 p-3 rounded-xl flex items-center justify-between">
            <div><p class="font-bold text-xs">${ing.name}</p><p class="text-[10px] text-slate-400">${ing.amount} • ${ing.calories}kcal • ${ing.protein}g protein</p></div>
            <button onclick="mealIngredients.splice(${idx},1);renderMealIngredients();" class="text-slate-300 hover:text-red-500 text-xl font-bold">×</button>
        </div>`
    ).join('');
    const list = document.getElementById('meal-ingredients-list');
    if (list) list.innerHTML = html || '<p class="text-xs text-slate-300 italic">No ingredients yet</p>';
}
function saveMeal() {
    const name = document.getElementById('meal-name-input')?.value.trim();
    if (!name)                    { showToast('Please enter meal name'); return; }
    if (!mealIngredients.length)  { showToast('Add at least one ingredient'); return; }
    const mealData = { id:Date.now(), name,
        calories: mealIngredients.reduce((s,i)=>s+i.calories,0),
        protein:  mealIngredients.reduce((s,i)=>s+i.protein, 0),
        ingredients:[...mealIngredients] };
    if (!state.createdMeals) state.createdMeals=[];
    if (window.editingMealIndex !== null && window.editingMealIndex !== undefined) {
        mealData.id = state.createdMeals[window.editingMealIndex].id;
        state.createdMeals[window.editingMealIndex] = mealData;
        showToast('Meal updated!');
    } else { state.createdMeals.push(mealData); showToast('Meal saved!'); }
    saveState(); closeCreateMeal(); renderCreatedMeals();
}

// ==========================================================================
// MIDNIGHT AUTO-SAVE
// ==========================================================================
function setupMidnightCheck() {
    midnightCheckInterval = setInterval(checkForMidnight, 60000);
    checkForMidnight();
}
function checkForMidnight() {
    const today = new Date().toISOString().split('T')[0];
    if (lastCheckDate && lastCheckDate !== today) autoSaveYesterdayNutrition(lastCheckDate);
    lastCheckDate = today;
}
async function autoSaveYesterdayNutrition(yesterdayDate) {
    const meals = (state.dailyMeals||[]).filter(m => m.date===yesterdayDate);
    if (!meals.length) return;
    if (!state.nutritionHistory) state.nutritionHistory=[];
    state.nutritionHistory.unshift({ id:Date.now(), date:yesterdayDate, savedAt:new Date().toISOString(),
        calories:meals.reduce((s,m)=>s+(m.calories||0),0), protein:meals.reduce((s,m)=>s+(m.protein||0),0),
        meals, autoSaved:true });
    state.dailyMeals = state.dailyMeals.filter(m => m.date!==yesterdayDate);
    saveState(); showToast(`📊 Yesterday's nutrition auto-saved`); renderNutritionHistory();
}

// ==========================================================================
// MANUAL SAVE NUTRITION
// ==========================================================================
function openSaveNutritionModal() {
    const today     = new Date().toISOString().split('T')[0];
    const todayMeals= (state.dailyMeals||[]).filter(m=>m.date===today);
    if (!todayMeals.length) { showToast('No meals logged today to save'); return; }
    document.getElementById('save-nutrition-date').value = today;
    setText('save-cal-preview',    Math.round(todayMeals.reduce((s,m)=>s+(m.calories||0),0)));
    setText('save-protein-preview',Math.round(todayMeals.reduce((s,m)=>s+(m.protein||0),0)));
    setText('save-meals-preview',  todayMeals.length);
    document.getElementById('save-nutrition-modal').style.display='flex';
    lucide.createIcons();
}
function closeSaveNutritionModal() { document.getElementById('save-nutrition-modal').style.display='none'; }
function confirmSaveNutrition() {
    const selDate = document.getElementById('save-nutrition-date').value;
    if (!selDate) { showToast('Please select a date'); return; }
    const today     = new Date().toISOString().split('T')[0];
    const todayMeals= (state.dailyMeals||[]).filter(m=>m.date===today);
    if (!todayMeals.length) { showToast('No meals to save'); closeSaveNutritionModal(); return; }
    if (!state.nutritionHistory) state.nutritionHistory=[];
    state.nutritionHistory = state.nutritionHistory.filter(h=>h.date!==selDate);
    state.nutritionHistory.unshift({ id:Date.now(), date:selDate, savedAt:new Date().toISOString(),
        calories:todayMeals.reduce((s,m)=>s+(m.calories||0),0), protein:todayMeals.reduce((s,m)=>s+(m.protein||0),0),
        meals:todayMeals, autoSaved:false });
    state.dailyMeals = state.dailyMeals.filter(m=>m.date!==today);
    saveState(); closeSaveNutritionModal(); showToast(`✓ Nutrition saved for ${selDate}`);
    renderDiary(); renderDashboard(); renderNutritionHistory();
}
function renderNutritionHistory() {
    const historyEl = document.getElementById('nutrition-history-display');
    if (!historyEl) return;
    const history = (state.nutritionHistory||[]).sort((a,b)=>new Date(b.date)-new Date(a.date));
    if (!history.length) { historyEl.innerHTML='<p class="text-sm text-slate-400 text-center py-4">No saved nutrition logs yet</p>'; return; }
    historyEl.innerHTML = history.map(log => {
        const d = new Date(log.date+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
        return `<div class="bg-slate-50 p-4 rounded-xl cursor-pointer hover:bg-slate-100" onclick="viewNutritionLog(${log.id})">
            <div class="flex justify-between items-start mb-2">
                <div><p class="font-bold">${d}</p><p class="text-xs text-slate-500">${log.autoSaved?'🌙 Auto-saved':'💾 Manually saved'}</p></div>
                <div class="text-right"><p class="font-bold text-indigo-600">${Math.round(log.calories)} kcal</p><p class="text-xs text-slate-500">${Math.round(log.protein)}g protein</p></div>
            </div>
            <p class="text-xs text-slate-400">${log.meals.length} meals logged</p>
        </div>`;
    }).join('');
}
function viewNutritionLog(logId) {
    const log = (state.nutritionHistory||[]).find(l=>l.id===logId); if (!log) return;
    const d = new Date(log.date+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
    let msg = `📊 ${d}\n\nTotal: ${Math.round(log.calories)} kcal\nProtein: ${Math.round(log.protein)}g\n\nMeals:\n`;
    log.meals.forEach((m,i) => { msg += `${i+1}. ${m.name} - ${m.calories} kcal\n`; });
    alert(msg);
}

// ==========================================================================
// COPY FROM PREVIOUS DAY  — FIXED
// ==========================================================================
function openCopyPreviousDay() {
    selectedPreviousMeals = [];
    const datesSet = new Set();
    (state.dailyMeals||[]).forEach(m => { if (m.date) datesSet.add(m.date); });
    (state.nutritionHistory||[]).forEach(h => { if (h.date) datesSet.add(h.date); });
    const today         = new Date().toISOString().split('T')[0];
    const availableDates= [...datesSet].sort((a,b)=>b.localeCompare(a)).filter(d=>d!==today);
    if (!availableDates.length) { showToast('No previous days with meals found'); return; }
    const select = document.getElementById('copy-date-select');
    if (select) {
        select.innerHTML = '<option value="">Choose a date...</option>' + availableDates.map(date => {
            const label = new Date(date+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'});
            return `<option value="${date}">${label}</option>`;
        }).join('');
    }
    document.getElementById('previous-meals-list').innerHTML='<p class="text-sm text-slate-400 text-center py-8">Select a date above</p>';
    document.getElementById('copy-previous-day-modal').style.display='flex';
    lucide.createIcons();
}
function closeCopyPreviousDay() {
    document.getElementById('copy-previous-day-modal').style.display='none';
    selectedPreviousMeals=[];
}

// FIX: Rewrote completely — original had broken template literal and undefined 'safeData'
function loadPreviousDayMeals() {
    const selectedDate = document.getElementById('copy-date-select')?.value;
    if (!selectedDate) return;

    let mealsFromDate = (state.dailyMeals||[]).filter(m=>m.date===selectedDate);
    if (!mealsFromDate.length) {
        const histEntry = (state.nutritionHistory||[]).find(h=>h.date===selectedDate);
        mealsFromDate = histEntry?.meals || [];
    }

    const listEl = document.getElementById('previous-meals-list');
    if (!mealsFromDate.length) { listEl.innerHTML='<p class="text-sm text-slate-400 text-center py-8">No meals found for this date</p>'; return; }

    // Store globally for checkbox callbacks
    window.previousDayMeals = mealsFromDate;

    listEl.innerHTML = mealsFromDate.map((meal, idx) => {
        const imgSrc = meal.image || 'https://via.placeholder.com/100';
        const mType  = meal.mealType || 'snack';
        return `<div class="bg-slate-50 p-4 rounded-xl flex items-center gap-4 border-2 border-transparent transition-all" id="prev-meal-row-${idx}">
            <input type="checkbox" id="prev-meal-${idx}" class="w-5 h-5 accent-indigo-600 cursor-pointer" onchange="togglePreviousMeal(${idx})">
            <img src="${imgSrc}" class="w-12 h-12 object-contain bg-white rounded-lg p-1 flex-shrink-0" onerror="this.src='https://via.placeholder.com/100'">
            <div class="flex-1 min-w-0">
                <p class="font-bold text-sm truncate">${meal.name}</p>
                <p class="text-xs text-slate-400">${meal.amount} • ${meal.calories}kcal • ${meal.protein}g protein</p>
                <p class="text-xs text-indigo-600 font-semibold">${mType}</p>
            </div>
        </div>`;
    }).join('');
    lucide.createIcons();
}

function togglePreviousMeal(index) {
    const meals   = window.previousDayMeals || [];
    const meal    = meals[index];
    const checkbox= document.getElementById(`prev-meal-${index}`);
    if (!meal || !checkbox) return;
    if (checkbox.checked) {
        selectedPreviousMeals.push({ ...meal });
        document.getElementById(`prev-meal-row-${index}`)?.classList.add('border-indigo-300');
    } else {
        selectedPreviousMeals = selectedPreviousMeals.filter((_,i) => {
            // Remove only one copy that matches
            if (_.name===meal.name && _.calories===meal.calories) { _.name=null; return false; }
            return true;
        });
        document.getElementById(`prev-meal-row-${index}`)?.classList.remove('border-indigo-300');
    }
}

function copySelectedMeals() {
    if (!selectedPreviousMeals.length) { showToast('Please select at least one meal'); return; }
    closeCopyPreviousDay();
    const queue = [...selectedPreviousMeals];
    selectedPreviousMeals = [];
    currentEditingMeal = { ...queue[0] };
    window._copyQueue = queue.slice(1);
    openEditCopiedMeal(currentEditingMeal);
}

function openEditCopiedMeal(meal) {
    document.getElementById('edit-meal-image').src      = meal.image||'https://via.placeholder.com/100';
    document.getElementById('edit-meal-name').textContent    = meal.name;
    document.getElementById('edit-meal-original').textContent= `Original: ${meal.amount} • ${meal.calories}kcal`;
    document.getElementById('edit-meal-amount').value    = 1;
    document.getElementById('edit-meal-type').value     = meal.mealType||'dinner';
    editAmountType='portion'; setEditAmountType('portion'); updateEditPreview();
    document.getElementById('edit-copied-meal-modal').style.display='flex';
    lucide.createIcons();
}
function closeEditCopiedMeal() {
    document.getElementById('edit-copied-meal-modal').style.display='none';
    currentEditingMeal=null;
}
function setEditAmountType(type) {
    editAmountType=type;
    ['portion','grams'].forEach(t => {
        const btn=document.getElementById(`edit-amount-type-${t}`);
        if (btn) btn.className=`flex-1 py-3 rounded-xl text-xs font-black uppercase ${t===type?'bg-white shadow text-emerald-600':'text-slate-400'}`;
    });
    updateEditPreview();
}
function updateEditPreview() {
    if (!currentEditingMeal) return;
    const amount     = parseFloat(document.getElementById('edit-meal-amount')?.value)||0;
    const multiplier = editAmountType==='portion' ? amount : amount/100;
    setText('edit-total-cals',    Math.round(currentEditingMeal.calories*multiplier));
    setText('edit-total-protein', (parseFloat(currentEditingMeal.protein)*multiplier).toFixed(1)+'g');
}
function saveEditedMeal() {
    if (!currentEditingMeal) return;
    const amount     = parseFloat(document.getElementById('edit-meal-amount')?.value)||0;
    const mealType   = document.getElementById('edit-meal-type')?.value||'dinner';
    const multiplier = editAmountType==='portion' ? amount : amount/100;
    const today      = new Date().toISOString().split('T')[0];
    state.dailyMeals.push({
        id:Date.now()+Math.random(), date:today, name:currentEditingMeal.name, image:currentEditingMeal.image,
        amount: editAmountType==='portion'?`${amount} portion(s)`:`${amount}g`,
        calories:     Math.round(currentEditingMeal.calories*multiplier),
        protein:      parseFloat((parseFloat(currentEditingMeal.protein)*multiplier).toFixed(1)),
        carbs:        parseFloat(((parseFloat(currentEditingMeal.carbs)||0)*multiplier).toFixed(1)),
        fat:          parseFloat(((parseFloat(currentEditingMeal.fat)||0)*multiplier).toFixed(1)),
        fiber:        parseFloat(((parseFloat(currentEditingMeal.fiber)||0)*multiplier).toFixed(1)),
        sugar:        parseFloat(((parseFloat(currentEditingMeal.sugar)||0)*multiplier).toFixed(1)),
        sodium:       parseFloat(((parseFloat(currentEditingMeal.sodium)||0)*multiplier).toFixed(3)),
        saturated_fat:parseFloat(((parseFloat(currentEditingMeal.saturated_fat)||0)*multiplier).toFixed(1)),
        cholesterol:  parseFloat(((parseFloat(currentEditingMeal.cholesterol)||0)*multiplier).toFixed(1)),
        mealType, source: currentEditingMeal.source||'Copied'
    });
    saveState(); closeEditCopiedMeal();
    const queue = window._copyQueue || [];
    if (queue.length) {
        currentEditingMeal = { ...queue[0] };
        window._copyQueue  = queue.slice(1);
        setTimeout(() => openEditCopiedMeal(currentEditingMeal), 300);
    } else {
        setNutritionTab('diary'); renderDashboard(); showToast('Meals copied to today! 🍽️');
    }
}

// ==========================================================================
// LOGS
// ==========================================================================
function setLogsTab(tab) {
    ['training','nutrition'].forEach(t => {
        const btn  = document.getElementById(`logs-tab-${t}`);
        const view = document.getElementById(`logs-${t}-view`);
        if (btn)  btn.className  = `flex-1 py-4 text-xs font-black uppercase rounded-xl ${t===tab?'bg-white text-indigo-600 shadow-sm':'text-slate-400'}`;
        if (view) view.classList.toggle('hidden', t!==tab);
    });
    if (tab==='nutrition') renderHydrationLogs();
    else filterWorkouts();
    renderLogs();
}
function renderLogs() {
    const nutritionLogsEl = document.getElementById('nutrition-logs-list');
    if (nutritionLogsEl) {
        const html = (state.nutritionHistory||[]).length===0
            ? '<p class="text-center text-slate-400 py-10">No nutrition logs yet</p>'
            : (state.nutritionHistory||[]).map(n => `
                <div class="glass-card p-5 rounded-2xl">
                    <div class="flex justify-between items-start">
                        <div><h4 class="font-bold">${n.date}</h4><p class="text-xs text-slate-400">${n.meals?.length||0} items logged</p></div>
                        <div class="text-right"><p class="font-bold">${Math.round(n.calories||0)} kcal</p><p class="text-xs text-blue-600">${(n.protein||0).toFixed(1)}g protein</p></div>
                    </div>
                </div>`).join('');
        nutritionLogsEl.innerHTML = html;
    }
}
function filterWorkouts() {
    const showWeights = document.getElementById('filter-weights')?.checked ?? true;
    const showCardio  = document.getElementById('filter-cardio')?.checked  ?? true;
    const showCore    = document.getElementById('filter-core')?.checked    ?? true;
    const showWalking = document.getElementById('filter-walking')?.checked ?? true;
    renderTrainingLogs(showWeights, showCardio, showCore, showWalking);
}
function renderTrainingLogs(showWeights=true, showCardio=true, showCore=true, showWalking=true) {
    const filtered = (state.workoutHistory||[]).filter(w => {
        const category = w.category||'weights';
        const focus    = (w.focus||'').toLowerCase();
        if (category==='cardio') { return ((w.cardioData?.type||'')+focus).includes('walk') ? showWalking : showCardio; }
        if (focus.includes('core')) return showCore;
        return showWeights;
    });
    const html = filtered.length===0
        ? '<p class="text-center text-slate-400 py-10">No workouts logged yet</p>'
        : filtered.map(w => `
            <div class="glass-card p-6 rounded-2xl">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <p class="text-xs text-slate-400">${w.date}</p>
                        <h4 class="font-black text-lg">${w.focus}</h4>
                        ${w.cardioData?`<p class="text-sm text-indigo-600 mt-1">${w.cardioData.distance||0}km • ${w.cardioData.duration||0}min${w.cardioData.calories?` • ${w.cardioData.calories}kcal`:''}</p>`:`<p class="text-sm text-slate-500">${(w.exercises||[]).length} exercises • ${w.duration}</p>`}
                    </div>
                </div>
                ${!w.cardioData&&(w.exercises||[]).length>0?`<div class="text-xs text-slate-400 mt-2">${(w.exercises||[]).slice(0,3).map(e=>e.name).join(' • ')}${(w.exercises||[]).length>3?` +${(w.exercises||[]).length-3} more`:''}</div>`:''}
                ${w.cardioData?.notes?`<p class="text-xs text-slate-500 mt-2 italic">${w.cardioData.notes}</p>`:''}
            </div>`).join('');
    const el = document.getElementById('training-logs-list');
    if (el) el.innerHTML = html;
    lucide.createIcons();
}

// ==========================================================================
// BODY METRICS
// ==========================================================================
function triggerPhotoUpload(type) { currentPhotoType=type; document.getElementById('photo-upload-input')?.click(); }

function saveMetrics() {
    const get  = id => parseFloat(document.getElementById(id)?.value);
    const weight     = get('metric-weight');
    const hasWeight  = weight && !isNaN(weight);
    const measurements = ['chest','shoulders','arms','waist','legs','glutes'];
    const hasMeasurements = measurements.some(f => { const v=get(`metric-${f}`); return v&&!isNaN(v); });
    const hasPhotos = state.currentPhotos && (state.currentPhotos.front||state.currentPhotos.side||state.currentPhotos.back);
    if (!hasWeight && !hasMeasurements && !hasPhotos) { showToast('Please enter at least weight, measurements, or photos'); return; }

    const metricsDate   = state.metricsDate || new Date().toISOString().split('T')[0];
    const existingIndex = (state.metricsHistory||[]).findIndex(m=>m.date===metricsDate);
    const existing      = existingIndex>=0 ? state.metricsHistory[existingIndex] : {};
    const data          = { id: existing.id || Date.now(), date: metricsDate };

    if (hasWeight) data.weight = weight; else if (existing.weight) data.weight = existing.weight;
    measurements.forEach(f => {
        const v = get(`metric-${f}`);
        if (v && !isNaN(v)) data[f] = v;
        else if (existing[f]) data[f] = existing[f];
    });
    if (hasPhotos) data.photos = { ...state.currentPhotos };
    else if (existing.photos) data.photos = existing.photos;

    if (!state.metricsHistory) state.metricsHistory=[];
    if (existingIndex>=0) { state.metricsHistory[existingIndex]=data; showToast('Metrics updated! 📊'); }
    else { state.metricsHistory.unshift(data); showToast('Metrics saved! 📊'); }

    saveState(); renderDashboard(); populateComparisonDates();
    measurements.forEach(f => { const el=document.getElementById(`metric-${f}`); if(el)el.value=''; });
    const wEl = document.getElementById('metric-weight'); if(wEl) wEl.value='';
    state.currentPhotos = { front:null, side:null, back:null };
    ['front','side','back'].forEach(t => document.getElementById(`photo-${t}-preview`)?.classList.add('hidden'));
    const today = new Date().toISOString().split('T')[0];
    if (metricsDate!==today) selectMetricsDate(today);
}

function populateComparisonDates() {
    const dates = (state.metricsHistory||[]).filter(m=>m.photos&&(m.photos.front||m.photos.side||m.photos.back));
    const html  = '<option value="">Select date...</option>'+dates.map(d=>`<option value="${d.id}">${d.date}</option>`).join('');
    ['compare-date-1','compare-date-2'].forEach(id=>{ const el=document.getElementById(id); if(el)el.innerHTML=html; });
}

function setComparePhotoType(type) {
    currentComparePhotoType=type;
    ['front','side','back'].forEach(t=>{
        const btn=document.getElementById(`compare-type-${t}`);
        if(btn)btn.className=`p-4 rounded-2xl font-bold text-sm ${t===type?'bg-indigo-600 text-white':'bg-slate-100 text-slate-600'}`;
    });
    loadComparisonPhotos();
}
function loadComparisonPhotos() {
    const id1=document.getElementById('compare-date-1')?.value;
    const id2=document.getElementById('compare-date-2')?.value;
    if(!id1||!id2){ document.getElementById('comparison-view')?.classList.add('hidden'); document.getElementById('no-comparison-message')?.classList.remove('hidden'); return; }
    const m1=state.metricsHistory.find(m=>String(m.id)===String(id1));
    const m2=state.metricsHistory.find(m=>String(m.id)===String(id2));
    if(!m1||!m2) return;
    const p1=m1.photos?.[currentComparePhotoType];
    const p2=m2.photos?.[currentComparePhotoType];
    if(p1&&p2){
        document.getElementById('compare-img-1').src=p1;
        document.getElementById('compare-img-2').src=p2;
        document.getElementById('compare-label-1').textContent=m1.date;
        document.getElementById('compare-label-2').textContent=m2.date;
        document.getElementById('comparison-view')?.classList.remove('hidden');
        document.getElementById('no-comparison-message')?.classList.add('hidden');
    } else { document.getElementById('comparison-view')?.classList.add('hidden'); document.getElementById('no-comparison-message')?.classList.remove('hidden'); showToast('No photos for that angle on selected dates'); }
}
function openPhotoComparison() {
    populateComparisonDates(); currentComparePhotoType='front'; setComparePhotoType('front');
    document.getElementById('photo-comparison-modal').style.display='flex';
    document.getElementById('comparison-view')?.classList.add('hidden');
    document.getElementById('no-comparison-message')?.classList.remove('hidden');
    lucide.createIcons();
}
function closePhotoComparison() { document.getElementById('photo-comparison-modal').style.display='none'; }

// ==========================================================================
// METRICS CHART
// ==========================================================================
function openMetricsChart() { document.getElementById('metrics-chart-modal').style.display='flex'; setTimeout(()=>renderMetricChart(),100); lucide.createIcons(); }
function closeMetricsChart() { document.getElementById('metrics-chart-modal').style.display='none'; }
function renderMetricChart() {
    const metric  = document.getElementById('chart-metric-select')?.value||'weight';
    const history = [...(state.metricsHistory||[])].reverse();
    const labels  = history.map(m=>new Date(m.date+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short'}));
    const data    = history.map(m=>m[metric]||0);
    if (metricsChart) metricsChart.destroy();
    const ctx = document.getElementById('metrics-chart');
    if (!ctx) return;
    metricsChart = new Chart(ctx,{type:'line',data:{labels,datasets:[{label:metric,data,borderColor:'#6366f1',backgroundColor:'rgba(99,102,241,0.1)',tension:0.4,borderWidth:3,pointRadius:4,pointBackgroundColor:'#fff',pointBorderWidth:2,pointBorderColor:'#6366f1'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{grid:{color:'#f1f5f9'}},x:{grid:{color:'#f1f5f9'}}}}});
}

// ==========================================================================
// EXERCISE PROGRESS CHART
// ==========================================================================
function openExerciseProgressModal() { document.getElementById('exercise-progress-modal').style.display='flex'; populateExerciseDropdown(); lucide.createIcons(); }
function closeExerciseProgressModal() { document.getElementById('exercise-progress-modal').style.display='no
