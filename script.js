// script.js - Full complete JavaScript file

// --- DATA & STATE ---
const EXERCISE_DB = [
    { name: "Barbell Bench Press", focus: ["Full Body", "Upper Body", "Push"], equipment: "barbell", muscles: ["Chest", "Triceps", "Shoulders"] },
    { name: "Dumbbell Press", focus: ["Full Body", "Upper Body", "Push"], equipment: "dumbbell", muscles: ["Chest", "Triceps"] },
    { name: "Incline Barbell Press", focus: ["Upper Body", "Push"], equipment: "barbell", muscles: ["Chest", "Shoulders"] },
    { name: "Pull Ups", focus: ["Full Body", "Upper Body", "Pull"], equipment: "bodyweight", muscles: ["Back", "Biceps"] },
    { name: "Lat Pulldowns", focus: ["Upper Body", "Pull"], equipment: "cable", muscles: ["Back", "Biceps"] },
    { name: "Barbell Rows", focus: ["Full Body", "Upper Body", "Pull"], equipment: "barbell", muscles: ["Back", "Biceps"] },
    { name: "Barbell Squats", focus: ["Full Body", "Lower Body/Legs", "Squat"], equipment: "barbell", muscles: ["Quads", "Glutes"] },
    { name: "Leg Press", focus: ["Lower Body/Legs", "Squat"], equipment: "machine", muscles: ["Quads"] },
    { name: "Barbell Deadlift", focus: ["Full Body", "Lower Body/Legs", "Hinge"], equipment: "barbell", muscles: ["Back", "Hamstrings", "Glutes"] },
    { name: "Romanian Deadlifts", focus: ["Lower Body/Legs", "Hinge"], equipment: "barbell", muscles: ["Hamstrings", "Glutes"] },
    { name: "Overhead Press", focus: ["Upper Body", "Push"], equipment: "barbell", muscles: ["Shoulders"] },
    { name: "Lunges", focus: ["Lower Body/Legs", "Squat"], equipment: "dumbbell", muscles: ["Quads", "Glutes"] }
];

const CORE_EXERCISES = ["Plank", "Crunches", "Leg Raises", "Russian Twists", "Deadbugs", "Bicycle Crunches", "Hollow Hold", "Bird Dog"];
const MUSCLE_LIST = ["Chest", "Back", "Shoulders", "Quads", "Hamstrings", "Glutes", "Triceps", "Biceps", "Core"];

const TUTORIALS = [
    { title: "Training Setup", content: "Select your environment (Gym/Home). Choose a focus. If you select 'Specific Muscle', you can pick multiple target areas. Check 'Cardio' or 'Core' to add those finishers to the end of your session." },
    { title: "Tracking", content: "Inside the workout, log your sets, weight, and reps. For core exercises, you can toggle between Reps/Time and bodyweight modes. We've added a weight input to core so you can track weighted planks or crunches!" },
    { title: "Meal Builder", content: "In the Nutrition tab, use the 'Make a Meal' button to combine multiple items. Adjust portions (packet/grams), name your creation, and save it to your inventory for one-tap logging." }
];

let timerInterval;
let activeWorkoutStart = null;
let currentPhotoType = null;
let html5QrCode;
let scannerMode = 'db'; // 'db' or 'meal'

let state = {
    activeTab: 'dashboard', 
    historyTab: 'training', 
    nutritionTab: 'log', 
    metricsTab: 'checkin',
    workoutEnv: 'gym', 
    viewDate: new Date().toISOString().split('T')[0],
    goals: { calories: 2500, water: 2500 },
    equipment: { 
        gym: { barbell: true, dumbbell: true, kettlebell: true, cable: true, machine: true, bodyweight: true }, 
        home: { dumbbell: false, kettlebell: false, bodyweight: true, bands: false } 
    },
    dailyMeals: [], 
    waterLogs: {}, 
    workoutHistory: [], 
    metricsHistory: [], 
    customFoodDb: [],
    currentPhotos: { front: null, side: null, back: null },
    selectedMuscles: [],
    nutritionalArchive: []
};

let portionSelection = { item: null, mode: 'packet' };
let mealBuilderItems = [];

window.onload = () => {
    const saved = localStorage.getItem('fittrack_combined_v8');
    if (saved) state = { ...state, ...JSON.parse(saved) };
    document.getElementById('status-date').innerText = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    document.getElementById('set-cal-goal').value = state.goals.calories;
    document.getElementById('workout-date-input').value = state.viewDate;
    initEquipmentSettings();
    renderDashboard();
    renderCustomDb();
    renderMuscleSelection();
    document.getElementById('photo-input').addEventListener('change', handlePhotoUpload);
    lucide.createIcons();
};

function saveState() { 
    localStorage.setItem('fittrack_combined_v8', JSON.stringify(state)); 
}

// Tab switching
function switchTab(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(btn => {
        const icon = btn.querySelector('.nav-bg');
        const isMatch = btn.getAttribute('data-tab') === tabId;
        btn.className = `nav-item flex flex-col items-center gap-1.5 ${isMatch ? 'text-indigo-600' : 'text-slate-300'}`;
        icon.className = `w-12 h-8 rounded-full flex items-center justify-center nav-bg ${isMatch ? 'bg-indigo-50' : ''}`;
    });
    if (tabId === 'dashboard') renderDashboard();
    if (tabId === 'history') renderHistory();
    if (tabId === 'nutrition') { renderDailyLog(); renderCustomDb(); }
    if (tabId === 'metrics') renderMetrics();
    lucide.createIcons();
}

// Tutorial
function openTutorial() {
    const list = document.getElementById('tutorial-list');
    list.innerHTML = TUTORIALS.map(t => `<div class="p-4 bg-slate-50 rounded-2xl mb-4"><h4 class="font-black text-indigo-600 text-sm mb-2 uppercase tracking-tight">\( {t.title}</h4><p class="text-xs text-slate-600 leading-relaxed"> \){t.content}</p></div>`).join('');
    document.getElementById('tutorial-modal').style.display = 'flex';
}
function closeTutorial() { 
    document.getElementById('tutorial-modal').style.display = 'none'; 
}

// Meal Builder Functions
function openMealModal() {
    document.getElementById('meal-modal').style.display = 'flex';
    mealBuilderItems = [];
    renderMealBuilder();
    lucide.createIcons();
}

function closeMealModal() {
    document.getElementById('meal-modal').style.display = 'none';
}

function handleMealSearch(val) {
    const results = document.getElementById('meal-search-results');
    if (!val) { 
        results.classList.add('hidden'); 
        return; 
    }
    const filtered = state.customFoodDb.filter(f => f.name.toLowerCase().includes(val.toLowerCase()));
    results.innerHTML = filtered.map(item => `
        <div class="p-4 border-b hover:bg-slate-50 cursor-pointer flex justify-between items-center" onclick="addIngredientToMeal('${item.name}', ${item.calories}, ${item.protein})">
            <div><b class="text-[11px] font-bold">\( {item.name}</b><br><small class="text-slate-400 text-[9px]"> \){item.calories} Kcal / ${item.protein}g P</small></div>
            <i data-lucide="plus" class="w-4 h-4 text-indigo-500"></i>
        </div>
    `).join('');
    results.classList.remove('hidden');
    lucide.createIcons();
}

function addIngredientToMeal(name, cals, prot) {
    const item = { id: Date.now() + Math.random(), name, baseCals: cals, baseProt: prot, qty: 1, mode: 'packet' };
    mealBuilderItems.push(item);
    document.getElementById('meal-item-search').value = '';
    document.getElementById('meal-search-results').classList.add('hidden');
    renderMealBuilder();
}

function renderMealBuilder() {
    const list = document.getElementById('meal-builder-list');
    const totalsDiv = document.getElementById('meal-totals');
    if (mealBuilderItems.length === 0) {
        list.innerHTML = `<p class="text-[10px] text-slate-400 text-center py-8 italic">Search and add items to create a meal</p>`;
        totalsDiv.classList.add('hidden');
        return;
    }
    totalsDiv.classList.remove('hidden');
    
    list.innerHTML = mealBuilderItems.map(item => `
        <div class="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between gap-2">
            <div class="flex-1">
                <div class="text-[11px] font-bold text-slate-800">${item.name}</div>
                <div class="flex items-center gap-2 mt-1">
                    <input type="number" value="\( {item.qty}" step="0.1" onchange="updateIngredientQty( \){item.id}, this.value)" class="w-12 bg-white border border-slate-200 rounded text-[10px] font-bold text-center p-1">
                    <select onchange="updateIngredientMode(${item.id}, this.value)" class="bg-transparent text-[9px] font-black uppercase text-indigo-500 outline-none">
                        <option value="packet" ${item.mode === 'packet' ? 'selected' : ''}>Unit</option>
                        <option value="grams" ${item.mode === 'grams' ? 'selected' : ''}>Grams</option>
                    </select>
                </div>
            </div>
            <button onclick="removeIngredient(${item.id})" class="text-slate-300 hover:text-red-400 p-1"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>
    `).join('');
    
    let totalCals = 0;
    let totalProt = 0;
    mealBuilderItems.forEach(i => {
        const multiplier = i.mode === 'packet' ? i.qty : (i.qty / 100);
        totalCals += i.baseCals * multiplier;
        totalProt += i.baseProt * multiplier;
    });
    
    document.getElementById('meal-builder-stats').innerText = `${Math.round(totalCals)} Kcal • ${Math.round(totalProt)}g Protein`;
    lucide.createIcons();
}

function updateIngredientQty(id, val) {
    const item = mealBuilderItems.find(i => i.id === id);
    if (item) item.qty = parseFloat(val) || 0;
    renderMealBuilder();
}

function updateIngredientMode(id, val) {
    const item = mealBuilderItems.find(i => i.id === id);
    if (item) item.mode = val;
    renderMealBuilder();
}

function removeIngredient(id) {
    mealBuilderItems = mealBuilderItems.filter(i => i.id !== id);
    renderMealBuilder();
}

function saveMealToInventory() {
    const name = document.getElementById('meal-builder-name').value;
    if (!name || mealBuilderItems.length === 0) {
        alert("Please name the meal and add items first.");
        return;
    }
    
    let totalCals = 0;
    let totalProt = 0;
    mealBuilderItems.forEach(i => {
        const multiplier = i.mode === 'packet' ? i.qty : (i.qty / 100);
        totalCals += i.baseCals * multiplier;
        totalProt += i.baseProt * multiplier;
    });

    state.customFoodDb.unshift({ 
        id: Date.now(), 
        name: `Meal: ${name}`, 
        calories: Math.round(totalCals), 
        protein: Math.round(totalProt) 
    });
    
    saveState();
    renderCustomDb();
    closeMealModal();
    document.getElementById('meal-builder-name').value = '';
    alert("Meal added to Inventory!");
}

// Nutrition Archive
function archiveDailyNutrition() {
    const today = state.dailyMeals.filter(m => m.date === state.viewDate);
    if (today.length === 0) {
        alert("No food logged for today yet.");
        return;
    }

    const totalCals = today.reduce((a, b) => a + Number(b.calories), 0);
    const totalProt = today.reduce((a, b) => a + Number(b.protein), 0);

    const archiveEntry = {
        id: Date.now(),
        date: state.viewDate,
        totalCalories: Math.round(totalCals),
        totalProtein: Math.round(totalProt),
        itemCount: today.length
    };

    state.nutritionalArchive = state.nutritionalArchive.filter(entry => entry.date !== state.viewDate);
    state.nutritionalArchive.unshift(archiveEntry);
    
    saveState();
    alert(`Daily log archived: ${archiveEntry.totalCalories} Kcal, ${archiveEntry.totalProtein}g Protein.`);
    if (state.historyTab === 'nutrition') renderHistory();
}

// Training Functions
function toggleSpecificMuscleGrid() {
    const focus = document.getElementById('workout-focus').value;
    const container = document.getElementById('muscle-selection-container');
    container.classList.toggle('hidden', focus !== 'Specific Muscle');
}

function renderMuscleSelection() {
    const container = document.getElementById('muscle-selection-grid');
    container.innerHTML = MUSCLE_LIST.map(m => `
        <div onclick="toggleMuscleFocus('\( {m}')" id="muscle-chip- \){m}" class="muscle-chip p-2 rounded-xl text-[8px] font-black uppercase text-center ${state.selectedMuscles.includes(m) ? 'selected' : 'bg-white text-slate-400'}">
            ${m}
        </div>
    `).join('');
}

function toggleMuscleFocus(muscle) {
    if (state.selectedMuscles.includes(muscle)) {
        state.selectedMuscles = state.selectedMuscles.filter(m => m !== muscle);
    } else {
        state.selectedMuscles.push(muscle);
    }
    renderMuscleSelection();
}

function toggleCardioOptions() {
    document.getElementById('cardio-options').classList.toggle('hidden', !document.getElementById('add-cardio-check').checked);
}

function startManualWorkout() {
    document.getElementById('workout-setup').classList.add('hidden');
    document.getElementById('workout-active').classList.remove('hidden');
    document.getElementById('active-workout-title').innerText = document.getElementById('workout-focus').value;
    document.getElementById('exercise-list').innerHTML = ''; 
    document.getElementById('extra-active-section').innerHTML = '';
    activeWorkoutStart = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
    
    if (document.getElementById('add-cardio-check').checked) addCardioSection();
    if (document.getElementById('add-core-check').checked) initCoreSection();
}

function addCardioSection() {
    const type = document.getElementById('cardio-type').value;
    const exercise = document.getElementById('cardio-exercise').value;
    const cont = document.getElementById('extra-active-section');
    const div = document.createElement('div');
    div.className = "glass-card p-6 rounded-[2rem] border-2 border-indigo-100";
    div.innerHTML = `
        <h4 class="text-sm font-black uppercase text-indigo-600 mb-3">Cardio: ${exercise}</h4>
        <div class="grid grid-cols-2 gap-4">
            <input type="number" placeholder="Time (min)" class="p-3 bg-slate-50 rounded-xl font-bold text-center">
            <input type="number" placeholder="Distance" class="p-3 bg-slate-50 rounded-xl font-bold text-center">
        </div>
        <p class="text-[9px] font-bold text-slate-400 mt-2 uppercase">Training: ${type}</p>
    `;
    cont.appendChild(div);
}

function initCoreSection() {
    const cont = document.getElementById('extra-active-section');
    const div = document.createElement('div');
    div.className = "glass-card p-6 rounded-[2rem] border-2 border-emerald-100";
    div.id = "core-finisher-container";
    div.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h4 class="text-sm font-black uppercase text-emerald-600">Core Finisher</h4>
            <button onclick="addNewCoreExerciseRow()" class="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase rounded-lg border border-emerald-100">+ Add Core Exercise</button>
        </div>
        <div id="core-rows-list" class="space-y-4"></div>
    `;
    cont.appendChild(div);
    addNewCoreExerciseRow();
}

function addNewCoreExerciseRow() {
    const list = document.getElementById('core-rows-list');
    const div = document.createElement('div');
    div.className = "flex flex-col gap-2 bg-slate-50 p-3 rounded-xl shadow-sm border border-slate-100";
    div.innerHTML = `
        <div class="flex items-center justify-between">
            <select class="text-xs font-bold bg-transparent outline-none w-3/4">
                \( {CORE_EXERCISES.map(ex => `<option value=" \){ex}">${ex}</option>`).join('')}
            </select>
            <button onclick="this.parentElement.parentElement.remove()" class="text-slate-300 hover:text-red-400">×</button>
        </div>
        <div class="core-input-grid">
            <input type="number" placeholder="kg" class="col-span-4 p-2 bg-white rounded text-center text-[10px] font-bold border border-slate-100" title="Core Weight">
            <input type="number" placeholder="val" class="col-span-4 p-2 bg-white rounded text-center text-[10px] font-bold border border-slate-100">
            <div class="col-span-5 grid grid-cols-2 gap-2 border-l border-slate-200 pl-2">
                <select class="text-[7px] font-black uppercase p-2 rounded bg-white border border-slate-100 outline-none">
                    <option>Reps</option>
                    <option>Time (s)</option>
                </select>
                <label class="text-[7px] flex items-center justify-center gap-1 font-black uppercase text-slate-400">
                    <input type="checkbox" class="accent-emerald-500 scale-75"> BW
                </label>
            </div>
        </div>
    `;
    list.appendChild(div);
}

function addExerciseField(prefillName = null, sets = 3) {
    const list = document.getElementById('exercise-list');
    const focus = document.getElementById('workout-focus').value;
    const availableEquip = state.equipment[state.workoutEnv];
    
    const validExercises = EXERCISE_DB.filter(ex => {
        if (focus === "Specific Muscle" && state.selectedMuscles.length > 0) {
            return ex.muscles.some(m => state.selectedMuscles.includes(m));
        }
        if (focus !== "Full Body" && !ex.focus.includes(focus)) return false;
        return availableEquip[ex.equipment] || ex.equipment === 'bodyweight';
    });

    const sortedExercises = [...validExercises].sort((a,b) => a.name.localeCompare(b.name));
    const options = sortedExercises.map(e => `<option value="${e.name}" \( {e.name === prefillName ? 'selected' : ''}> \){e.name}</option>`).join('');
    
    const exId = Date.now() + Math.random().toString(16).slice(2);
    const div = document.createElement('div');
    div.className = "glass-card p-4 rounded-2xl mb-4";
    div.innerHTML = `
        <div class="flex justify-between items-center mb-3">
            <select class="bg-transparent font-bold outline-none text-slate-800 w-full text-sm">${options || '<option>Manual Exercise</option>'}</select>
            <button class="text-red-400 font-bold ml-2" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
        <div id="sets-${exId}" class="space-y-2 mb-3"></div>
        <button onclick="addSetToExercise('${exId}')" class="w-full py-2 bg-slate-50 text-slate-500 rounded-lg text-xs font-bold uppercase hover:bg-slate-100">+ Add Set</button>
    `;
    list.appendChild(div);
    for(let i=0; i<sets; i++) addSetToExercise(exId);
}

function addSetToExercise(exId) {
    const container = document.getElementById(`sets-${exId}`);
    if (!container) return;
    const count = container.children.length + 1;
    const row = document.createElement('div');
    row.className = "flex gap-2 items-center set-row";
    row.innerHTML = `
        <span class="text-[10px] text-slate-400 font-bold w-4">${count}</span>
        <input type="number" placeholder="kg" class="bg-slate-50">
        <input type="number" placeholder="reps" class="bg-slate-50">
        <div class="w-6 h-6 rounded-full border-2 border-slate-200 flex items-center justify-center cursor-pointer" onclick="this.classList.toggle('bg-green-500'); this.classList.toggle('border-green-500')">
            <i data-lucide="check" class="w-3 h-3 text-white"></i>
        </div>
    `;
    container.appendChild(row);
    lucide.createIcons();
}

function generateAIWorkout() {
    startManualWorkout();
    const focus = document.getElementById('workout-focus').value;
    const availableEquip = state.equipment[state.workoutEnv];
    const pool = EXERCISE_DB.filter(ex => {
        if (focus === "Specific Muscle") return ex.muscles.some(m => state.selectedMuscles.includes(m));
        return (focus === "Full Body" || ex.focus.includes(focus)) && (availableEquip[ex.equipment] || ex.equipment === 'bodyweight');
    });
    pool.sort(() => 0.5 - Math.random()).slice(0, 5).forEach(ex => addExerciseField(ex.name, 3));
}

function saveWorkout() {
    clearInterval(timerInterval);
    const exercisesLogged = [];
    document.querySelectorAll('#exercise-list > div').forEach(card => {
        const selectElement = card.querySelector('select');
        if (!selectElement) return;
        const name = selectElement.value;
        const sets = [];
        card.querySelectorAll('.set-row').forEach(row => {
            const inputs = row.querySelectorAll('input');
            sets.push({ kg: inputs[0].value, reps: inputs[1].value });
        });
        exercisesLogged.push({ name, sets });
    });
    
    const coreList = document.getElementById('core-rows-list');
    if (coreList && coreList.children.length > 0) {
        coreList.querySelectorAll('div.flex-col').forEach(row => {
            const name = row.querySelector('select').value;
            const inputs = row.querySelectorAll('input');
            const units = row.querySelectorAll('select')[1].value;
            exercisesLogged.push({ 
                name: `Core: ${name}`, 
                sets: [{ kg: inputs[0].value, val: inputs[1].value, unit: units, bw: inputs[2].checked }] 
            });
        });
    }

    state.workoutHistory.unshift({
        id: Date.now(),
        date: state.viewDate,
        focus: document.getElementById('active-workout-title').innerText,
        duration: document.getElementById('workout-timer').innerText,
        exercises: exercisesLogged
    });
    saveState();
    document.getElementById('workout-setup').classList.remove('hidden'); 
    document.getElementById('workout-active').classList.add('hidden');
    switchTab('history');
}

function cancelWorkout() {
    if(confirm("Exit workout? Data will be lost.")) {
        clearInterval(timerInterval);
        document.getElementById('workout-setup').classList.remove('hidden'); 
        document.getElementById('workout-active').classList.add('hidden');
    }
}

function updateTimer() {
    const diff = Math.floor((Date.now() - activeWorkoutStart) / 1000);
    const h = Math.floor(diff / 3600).toString().padStart(2, '0');
    const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
    const s = (diff % 60).toString().padStart(2, '0');
    document.getElementById('workout-timer').innerText = `\( {h}: \){m}:${s}`;
}

function setWorkoutEnv(env) { 
    state.workoutEnv = env; 
    document.getElementById('current-env-label').innerText = env;
    document.getElementById('env-tab-gym').className = `px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${env === 'gym' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`;
    document.getElementById('env-tab-home').className = `px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${env === 'home' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`;
}

// Dashboard
function renderDashboard() {
    const today = state.dailyMeals.filter(m => m.date === state.viewDate);
    const cals = today.reduce((a, b) => a + Number(b.calories), 0);
    const prot = today.reduce((a, b) => a + Number(b.protein), 0);
    document.getElementById('dash-calories').innerText = Math.round(cals);
    document.getElementById('dash-protein').innerText = Math.round(prot) + 'g';
    document.getElementById('dash-carbs').innerText = Math.round(cals * 0.4 / 4) + 'g';
    document.getElementById('dash-fat').innerText = Math.round(cals * 0.3 / 9) + 'g';
    const progress = Math.min((cals / state.goals.calories) * 534, 534);
    const circle = document.getElementById('calorie-progress');
    if (circle) circle.style.strokeDashoffset = 534 - progress;
    const water = state.waterLogs[state.viewDate] || 0;
    document.getElementById('water-count').innerText = `${(water/1000).toFixed(1)} / ${(state.goals.water/1000).toFixed(1)}L`;
    document.getElementById('muscle-volume-stats').innerHTML = `<div class="bg-white/10 p-3 rounded-xl"><div class="text-[10px] opacity-70">SESSIONS</div><div class="font-bold text-xl">${state.workoutHistory.length}</div></div><div class="bg-white/10 p-3 rounded-xl"><div class="text-[10px] opacity-70">STREAK</div><div class="font-bold text-xl">1</div></div>`;
}

function updateWater(ml) { 
    state.waterLogs[state.viewDate] = Math.max(0, (state.waterLogs[state.viewDate] || 0) + ml); 
    saveState(); 
    renderDashboard(); 
}

// Nutrition Log
function handleFoodSearch(val) {
    const results = document.getElementById('food-results');
    if (!val) { results.classList.add('hidden'); return; }
    const filtered = state.customFoodDb.filter(f => f.name.toLowerCase().includes(val.toLowerCase()));
    results.innerHTML = filtered.map(item => `<div class="p-4 border-b hover:bg-slate-50 cursor-pointer" onclick="initiateFoodLog('${item.name}', ${item.calories}, \( {item.protein})"><b class="text-sm"> \){item.name}</b><br><small class="text-slate-400">${item.calories} Kcal / ${item.protein}g P</small></div>`).join('');
    results.classList.remove('hidden');
}

function initiateFoodLog(name, cals, prot) {
    portionSelection = { item: { name, calories: cals, protein: prot }, mode: 'packet' };
    document.getElementById('portion-item-name').innerText = name;
    document.getElementById('portion-qty-input').value = 1;
    document.getElementById('portion-modal').style.display = 'flex';
}

function confirmLogPortion() {
    const qty = parseFloat(document.getElementById('portion-qty-input').value);
    const finalCals = portionSelection.mode === 'packet' ? portionSelection.item.calories * qty : (portionSelection.item.calories / 100) * qty;
    const finalProt = portionSelection.mode === 'packet' ? portionSelection.item.protein * qty : (portionSelection.item.protein / 100) * qty;
    state.dailyMeals.unshift({ id: Date.now(), date: state.viewDate, name: portionSelection.item.name, calories: Math.round(finalCals), protein: Math.round(finalProt) });
    saveState(); 
    closePortionModal(); 
    renderDailyLog(); 
    renderDashboard();
}

function closePortionModal() { 
    document.getElementById('portion-modal').style.display = 'none'; 
}
function setPortionMode(mode) { 
    portionSelection.mode = mode; 
    document.getElementById('p-mode-packet').className = `flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${mode === 'packet' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`;
    document.getElementById('p-mode-custom').className = `flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${mode === 'custom' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`;
}
function adjustPortionQty(v) { 
    const input = document.getElementById('portion-qty-input');
    input.value = Math.max(0.1, parseFloat(input.value) + (v * 0.5)); 
}

function saveToDatabase() {
    const name = document.getElementById('form-name').value;
    const cals = document.getElementById('form-cals').value;
    const prot = document.getElementById('form-prot').value;
    if(!name || !cals) return;
    state.customFoodDb.unshift({ id: Date.now(), name, calories: Number(cals), protein: Number(prot) || 0 });
    saveState(); 
    renderCustomDb();
    document.getElementById('form-name').value = ''; 
    document.getElementById('form-cals').value = ''; 
    document.getElementById('form-prot').value = '';
}

function renderCustomDb() {
    const list = document.getElementById('custom-db-list');
    list.innerHTML = state.customFoodDb.map(item => `<div class="p-4 flex justify-between items-center"><div><b>\( {item.name}</b><br><small> \){item.calories} Kcal</small></div><button onclick="initiateFoodLog('${item.name}', ${item.calories}, ${item.protein})" class="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl">+</button></div>`).join('');
}

function renderDailyLog() {
    const container = document.getElementById('daily-log-list');
    const today = state.dailyMeals.filter(m => m.date === state.viewDate);
    container.innerHTML = today.map(meal => `<div class="glass-card p-4 rounded-2xl flex justify-between"><div><b>\( {meal.name}</b><br><small> \){meal.calories} Kcal / \( {meal.protein}g Protein</small></div><button onclick="deleteMeal( \){meal.id})">×</button></div>`).join('');
    
    const totalCals = today.reduce((a, b) => a + Number(b.calories), 0);
    const totalProt = today.reduce((a, b) => a + Number(b.protein), 0);
    
    const totalsCard = document.getElementById('daily-totals-card');
    if (today.length > 0) {
        totalsCard.classList.remove('hidden');
        document.getElementById('total-day-cals').innerText = `${Math.round(totalCals)} Kcal`;
        document.getElementById('total-day-prot').innerText = `${Math.round(totalProt)}g Protein`;
    } else {
        totalsCard.classList.add('hidden');
    }
}

function deleteMeal(id) { 
    state.dailyMeals = state.dailyMeals.filter(m => m.id !== id); 
    saveState(); 
    renderDailyLog(); 
    renderDashboard(); 
}

function setNutritionTab(t) { 
    state.nutritionTab = t; 
    renderNutrition(); 
}
function renderNutrition() {
    document.getElementById('nut-tab-log').className = `flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${state.nutritionTab === 'log' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`;
    document.getElementById('nut-tab-db').className = `flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${state.nutritionTab === 'database' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`;
    document.getElementById('nut-view-log').classList.toggle('hidden', state.nutritionTab !== 'log');
    document.getElementById('nut-view-db').classList.toggle('hidden', state.nutritionTab !== 'database');
}

// Scanner
function startScanner(target) { 
    scannerMode = target;
    document.getElementById('scanner-container').classList.remove('hidden');
    html5QrCode = new Html5Qrcode("scanner-mount");
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, (text) => { 
        stopScanner(); 
        fetchOpenFoodFacts(text); 
    });
}
function stopScanner() { 
    if(html5QrCode) html5QrCode.stop(); 
    document.getElementById('scanner-container').classList.add('hidden'); 
}
async function fetchOpenFoodFacts(code) {
    try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
        const data = await res.json();
        if(data.status === 1) {
            const name = data.product.product_name || "Unknown Item";
            const cals = Math.round(data.product.nutriments?.['energy-kcal_100g'] || 0);
            const prot = Math.round(data.product.nutriments?.['proteins_100g'] || 0);
            
            if (scannerMode === 'meal') {
                addIngredientToMeal(name, cals, prot);
            } else {
                document.getElementById('form-name').value = name;
                document.getElementById('form-cals').value = cals;
                document.getElementById('form-prot').value = prot;
            }
        }
    } catch(e) {
        alert("Could not fetch product data.");
    }
}

// Photo handling
function triggerPhoto(type) { 
    currentPhotoType = type; 
    document.getElementById('photo-input').click(); 
}
function handlePhotoUpload(e) {
    const reader = new FileReader();
    reader.onload = (event) => { 
        state.currentPhotos[currentPhotoType] = event.target.result; 
        renderMetrics(); 
        saveState(); 
    };
    reader.readAsDataURL(e.target.files[0]);
}

// Metrics Functions
function setMetricsTab(t) { 
    state.metricsTab = t; 
    document.getElementById('metrics-tab-checkin').className = `flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${t === 'checkin' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`;
    document.getElementById('metrics-tab-logs').className = `flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${t === 'logs' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`;
    document.getElementById('metrics-view-checkin').classList.toggle('hidden', t !== 'checkin');
    document.getElementById('metrics-view-logs').classList.toggle('hidden', t !== 'logs');
    renderMetrics();
}

function saveMetrics() {
    let measurements = {
        waist: document.getElementById('m-waist').value || '',
        chest: document.getElementById('m-chest').value || '',
        arms: document.getElementById('m-arms').value || '',
        thighs: document.getElementById('m-thighs').value || ''
    };
    state.metricsHistory.unshift({ 
        id: Date.now(), 
        date: state.viewDate, 
        weight: document.getElementById('body-weight').value || '0', 
        measurements, 
        photos: { ...state.currentPhotos } 
    });
    
    // Clear inputs
    document.getElementById('body-weight').value = '';
    document.getElementById('m-waist').value = '';
    document.getElementById('m-chest').value = '';
    document.getElementById('m-arms').value = '';
    document.getElementById('m-thighs').value = '';
    state.currentPhotos = { front: null, side: null, back: null };
    ['front', 'side', 'back'].forEach(t => {
        const img = document.getElementById(`img-${t}`);
        img.src = '';
        img.classList.add('hidden');
    });
    
    saveState(); 
    alert("Log Saved!");
    setMetricsTab('logs');
}

function renderMetrics() {
    ['front', 'side', 'back'].forEach(t => {
        const img = document.getElementById(`img-${t}`);
        if(state.currentPhotos[t]) { 
            img.src = state.currentPhotos[t]; 
            img.classList.remove('hidden'); 
        }
    });
    if (state.metricsTab === 'logs') renderMetricsLogs();
}

function renderMetricsLogs() {
    const list = document.getElementById('metrics-history-list');
    list.innerHTML = state.metricsHistory.map(entry => `
        <div class="glass-card p-4 rounded-2xl cursor-pointer" onclick="viewMetricEntry(${entry.id})">
            <b>${entry.date}</b><br>
            <small>Weight: ${entry.weight}kg</small>
        </div>
    `).join('');
    
    const progressContainer = document.getElementById('progress-card-container');
    if (state.metricsHistory.length > 1) {
        progressContainer.classList.remove('hidden');
        const start = state.metricsHistory[state.metricsHistory.length - 1];
        const latest = state.metricsHistory[0];
        
        const diffWeight = parseFloat(latest.weight) - parseFloat(start.weight);
        document.getElementById('diff-weight').innerText = (diffWeight > 0 ? '+' : '') + diffWeight.toFixed(1) + 'kg';
        document.getElementById('diff-weight').className = `diff-indicator ${diffWeight > 0 ? 'diff-pos' : 'diff-neg'}`;
        
        const diffWaist = parseFloat(latest.measurements.waist) - parseFloat(start.measurements.waist);
        document.getElementById('diff-waist').innerText = (diffWaist > 0 ? '+' : '') + diffWaist.toFixed(1) + 'cm';
        document.getElementById('diff-waist').className = `diff-indicator ${diffWaist > 0 ? 'diff-pos' : 'diff-neg'}`;
        
        const diffArms = parseFloat(latest.measurements.arms) - parseFloat(start.measurements.arms);
        document.getElementById('diff-arms').innerText = (diffArms > 0 ? '+' : '') + diffArms.toFixed(1) + 'cm';
        document.getElementById('diff-arms').className = `diff-indicator ${diffArms > 0 ? 'diff-neg' : 'diff-pos'}`;
        
        document.getElementById('start-weight-label').innerText = `Start: ${start.weight}kg`;
        document.getElementById('start-waist-label').innerText = `Start: ${start.measurements.waist}cm`;
        document.getElementById('start-arms-label').innerText = `Start: ${start.measurements.arms}cm`;
        
        const maxWeightChange = 10;
        const maxWaistChange = 10;
        const maxArmsGrowth = 5;
        
        document.getElementById('prog-weight-bar').style.width = `${diffWeight < 0 ? Math.min(Math.abs(diffWeight) / maxWeightChange * 100, 100) : 0}%`;
        document.getElementById('prog-waist-bar').style.width = `${diffWaist < 0 ? Math.min(Math.abs(diffWaist) / maxWaistChange * 100, 100) : 0}%`;
        document.getElementById('prog-arms-bar').style.width = `${diffArms > 0 ? Math.min(Math.abs(diffArms) / maxArmsGrowth * 100, 100) : 0}%`;
    } else {
        progressContainer.classList.add('hidden');
    }
}

function viewMetricEntry(id) {
    const entry = state.metricsHistory.find(e => e.id === id);
    if (!entry) return;
    
    const content = document.getElementById('view-metric-content');
    content.innerHTML = `
        <p class="text-sm font-bold">Date: ${entry.date}</p>
        <p class="text-sm">Weight: ${entry.weight}kg</p>
        <p class="text-sm">Waist: ${entry.measurements.waist}cm</p>
        <p class="text-sm">Chest: ${entry.measurements.chest}cm</p>
        <p class="text-sm">Arms: ${entry.measurements.arms}cm</p>
        <p class="text-sm">Thighs: ${entry.measurements.thighs}cm</p>
        <div class="grid grid-cols-3 gap-2 mt-4">
            <img src="${entry.photos.front || ''}" alt="Front" class="rounded-lg ${entry.photos.front ? '' : 'hidden'}">
            <img src="${entry.photos.side || ''}" alt="Side" class="rounded-lg ${entry.photos.side ? '' : 'hidden'}">
            <img src="${entry.photos.back || ''}" alt="Back" class="rounded-lg ${entry.photos.back ? '' : 'hidden'}">
        </div>
        <select id="compare-with" onchange="updateCompare(${entry.id})" class="w-full p-2 bg-slate-50 rounded-xl mt-4">
            <option value="">Compare with...</option>
            \( {state.metricsHistory.filter(e => e.id !== entry.id).map(e => `<option value=" \){e.id}">${e.date}</option>`).join('')}
        </select>
        <div id="compare-diff" class="space-y-2 mt-2"></div>
    `;
    document.getElementById('view-metric-modal').style.display = 'flex';
}

function updateCompare(currentId) {
    const compareId = document.getElementById('compare-with').value;
    const diffContainer = document.getElementById('compare-diff');
    if (!compareId) {
        diffContainer.innerHTML = '';
        return;
    }
    const current = state.metricsHistory.find(e => e.id === currentId);
    const compare = state.metricsHistory.find(e => e.id === parseInt(compareId));
    
    const diffHtml = `
        <h4 class="text-sm font-bold">Compared to ${compare.date}</h4>
        <p class="text-xs">Weight Diff: ${(parseFloat(current.weight) - parseFloat(compare.weight)).toFixed(1)}kg</p>
        <p class="text-xs">Waist Diff: ${(parseFloat(current.measurements.waist) - parseFloat(compare.measurements.waist)).toFixed(1)}cm</p>
        <p class="text-xs">Chest Diff: ${(parseFloat(current.measurements.chest) - parseFloat(compare.measurements.chest)).toFixed(1)}cm</p>
        <p class="text-xs">Arms Diff: ${(parseFloat(current.measurements.arms) - parseFloat(compare.measurements.arms)).toFixed(1)}cm</p>
        <p class="text-xs">Thighs Diff: ${(parseFloat(current.measurements.thighs) - parseFloat(compare.measurements.thighs)).toFixed(1)}cm</p>
    `;
    diffContainer.innerHTML = diffHtml;
}

function closeViewMetricModal() { 
    document.getElementById('view-metric-modal').style.display = 'none'; 
}

// History
function setHistoryTab(t) { 
    state.historyTab = t; 
    renderHistory(); 
}
function renderHistory() {
    const list = document.getElementById('history-list');
    document.getElementById('hist-tab-train').className = `flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${state.historyTab === 'training' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`;
    document.getElementById('hist-tab-nut').className = `flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${state.historyTab === 'nutrition' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`;
    
    if(state.historyTab === 'training') {
        list.innerHTML = state.workoutHistory.map(w => `<div class="glass-card p-4 rounded-2xl mb-2"><b>\( {w.focus}</b><br><small> \){w.date} • ${w.duration}</small></div>`).join('');
    } else {
        list.innerHTML = (state.nutritionalArchive || []).map(entry => `
            <div class="glass-card p-4 rounded-2xl mb-2 flex justify-between items-center">
                <div>
                    <b class="text-sm">Daily Summary: ${entry.date}</b><br>
                    <small class="text-slate-500">${entry.itemCount} items logged</small>
                </div>
                <div class="text-right">
                    <div class="text-indigo-600 font-black text-xs">${entry.totalCalories} Kcal</div>
                    <div class="text-[9px] font-bold text-slate-400 uppercase">${entry.totalProtein}g Protein</div>
                </div>
            </div>
        `).join('') || `<p class="text-center text-[10px] text-slate-400 italic py-8">Save your daily food logs to see summaries here</p>`;
    }
}

// Equipment Settings
function initEquipmentSettings() {
    const gymCont = document.getElementById('gym-equip-list');
    gymCont.innerHTML = Object.keys(state.equipment.gym).map(key => `<button onclick="toggleEquip('gym', '${key}')" class="p-3 rounded-xl text-[10px] font-bold uppercase \( {state.equipment.gym[key] ? 'bg-indigo-600 text-white' : 'bg-slate-100'}"> \){key}</button>`).join('');
    const homeCont = document.getElementById('home-equip-list');
    homeCont.innerHTML = Object.keys(state.equipment.home).map(key => `<button onclick="toggleEquip('home', '${key}')" class="p-3 rounded-xl text-[10px] font-bold uppercase \( {state.equipment.home[key] ? 'bg-indigo-600 text-white' : 'bg-slate-100'}"> \){key}</button>`).join('');
}

function toggleEquip(env, key) { 
    state.equipment[env][key] = !state.equipment[env][key]; 
    saveState(); 
    initEquipmentSettings(); 
}

function resetData() { 
    if(confirm("Permanently clear all data? This cannot be undone.")) { 
        localStorage.clear(); 
        location.reload(); 
    } 
}

function closeEditModal() { 
    document.getElementById('edit-modal').style.display = 'none'; 
}
