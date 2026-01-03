// ==========================
// FITTRACK PRO V6.9 SCRIPT
// ==========================

// --- CONFIGURATION ---
const apiKey = "YOUR_GEMINI_API_KEY_HERE"; 

let html5QrCode; 
let aiStream = null;
let timerInterval;
let currentPhotos = { front: null, side: null, back: null };
let activeWorkoutDate = "";

// --- STATE MANAGEMENT ---
let state = {
    activeTab: 'dashboard', 
    historyTab: 'training', 
    nutritionTab: 'log',
    workoutEnv: 'gym', 
    viewDate: new Date().toISOString().split('T')[0],
    goals: { calories: 2500, water: 2500 },
    equipment: {
        gym: { barbell: true, dumbbell: true, kettlebell: true, cable: true, machine: true, resistanceband: false, bodyweight: true },
        home: { barbell: false, dumbbell: true, kettlebell: false, cable: false, machine: false, resistanceband: true, bodyweight: true }
    },
    dailyMeals: [], 
    waterLogs: {}, 
    workoutHistory: [], 
    metricsHistory: [], 
    customFoodDb: []
};

// --- EXERCISE DATABASE ---
const EXERCISE_DB = [
    { name: "Barbell Bench Press", focus: "Upper Body (Push)", muscle: "Chest", equip: "barbell" },
    { name: "Dumbbell Press", focus: "Upper Body (Push)", muscle: "Chest", equip: "dumbbell" },
    { name: "Push Ups", focus: "Upper Body (Push)", muscle: "Chest", equip: "bodyweight" },
    { name: "Barbell Rows", focus: "Upper Body (Pull)", muscle: "Back", equip: "barbell" },
    { name: "Barbell Squats", focus: "Lower Body (Legs)", muscle: "Legs", equip: "barbell" },
    { name: "Dumbbell Curl", focus: "Upper Body (Pull)", muscle: "Biceps", equip: "dumbbell" },
    { name: "Kettlebell Swing", focus: "Lower Body (Legs)", muscle: "Glutes", equip: "kettlebell" },
];

// ==========================
// INITIALIZATION
// ==========================
window.onload = () => {
    const saved = localStorage.getItem('fittrack_v69_storage');
    if (saved) state = { ...state, ...JSON.parse(saved) };

    const today = new Date().toISOString().split('T')[0];
    if(document.getElementById('workout-date-input')) document.getElementById('workout-date-input').value = today;
    document.getElementById('status-date').innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    renderDashboard();
    renderDailyLog();
    renderCustomDb();
    renderHistory();
    lucide.createIcons();
};

// ==========================
// STATE SAVE
// ==========================
function saveState() { localStorage.setItem('fittrack_v69_storage', JSON.stringify(state)); }

// ==========================
// TAB NAVIGATION
// ==========================
function switchTab(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(n => {
        const isActive = n.dataset.tab === tabId;
        n.classList.toggle('text-slate-300', !isActive); 
        n.classList.toggle('text-indigo-600', isActive);
        n.querySelector('.nav-bg').classList.toggle('bg-indigo-50', isActive);
    });

    if(tabId==='dashboard') renderDashboard();
    if(tabId==='training') renderWorkoutSetup();
    if(tabId==='nutrition') { renderDailyLog(); renderCustomDb(); }
    if(tabId==='metrics') renderMetrics();
    if(tabId==='history') renderHistory();
}

// ==========================
// DASHBOARD LOGIC
// ==========================
function renderDashboard() {
    const todayMeals = state.dailyMeals.filter(m => m.date === state.viewDate);
    const cals = todayMeals.reduce((a,b) => a + Number(b.calories || 0), 0);
    const prot = todayMeals.reduce((a,b) => a + Number(b.protein || 0), 0);
    const carbs = todayMeals.reduce((a,b) => a + Number(b.carbs || 0), 0);
    const fats = todayMeals.reduce((a,b) => a + Number(b.fats || 0), 0);

    document.getElementById('dash-calories').innerText = Math.round(cals);
    document.getElementById('dash-protein').innerText = Math.round(prot) + 'g';
    document.getElementById('dash-carbs').innerText = Math.round(carbs) + 'g';
    document.getElementById('dash-fat').innerText = Math.round(fats) + 'g';

    const progress = Math.min((cals / state.goals.calories) * 534, 534);
    document.getElementById('calorie-progress').style.strokeDashoffset = 534 - progress;

    const water = state.waterLogs[state.viewDate] || 0;
    document.getElementById('water-count').innerText = `${(water/1000).toFixed(1)} / ${(state.goals.water/1000).toFixed(1)} Liters`;
}

function updateWater(ml) {
    const d = state.viewDate;
    state.waterLogs[d] = Math.max(0, (state.waterLogs[d] || 0) + ml);
    saveState(); renderDashboard();
}

// ==========================
// WORKOUT LOGIC
// ==========================
function setWorkoutEnv(env) {
    state.workoutEnv = env;
    document.getElementById('env-tab-gym').className = `px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${env==='gym'?'bg-white text-indigo-600 shadow-sm':'text-slate-400'}`;
    document.getElementById('env-tab-home').className = `px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${env==='home'?'bg-white text-indigo-600 shadow-sm':'text-slate-400'}`;
    document.getElementById('current-env-label').innerText = env;
}

function renderWorkoutSetup() {
    document.getElementById('workout-setup').classList.remove('hidden');
    document.getElementById('workout-active').classList.add('hidden');
}

function startManualWorkout() {
    activeWorkoutDate = document.getElementById('workout-date-input').value;
    document.getElementById('workout-setup').classList.add('hidden');
    document.getElementById('workout-active').classList.remove('hidden');
    document.getElementById('active-workout-title').innerText = document.getElementById('workout-focus').value;
    document.getElementById('exercise-list').innerHTML = '';
    addExerciseField();
    startTimer();
}

function addExerciseField(presetName = null) {
    const options = EXERCISE_DB.map(ex => `<option ${presetName===ex.name?'selected':''}>${ex.name}</option>`).join('');
    const exId = Date.now() + Math.random();
    const div = document.createElement('div');
    div.className = "p-4 bg-slate-50 rounded-2xl space-y-4 border border-slate-100 exercise-entry";
    div.dataset.id = exId;
    div.innerHTML = `
        <div class="flex justify-between items-center gap-2">
            <select class="w-full p-3 bg-white rounded-xl text-sm font-bold outline-none">${options}</select>
            <button onclick="this.closest('.exercise-entry').remove()" class="text-slate-300 hover:text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>
        <table class="workout-table"><thead><tr><th>Set</th><th>Kg</th><th>Reps</th><th></th></tr></thead><tbody class="sets-tbody"></tbody></table>
        <button onclick="addSetToExercise('${exId}')" class="w-full py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest">+ Add Set</button>
    `;
    document.getElementById('exercise-list').appendChild(div);
    addSetToExercise(exId);
    lucide.createIcons();
}

function addSetToExercise(exId) {
    const tbody = document.querySelector(`.exercise-entry[data-id="${exId}"] .sets-tbody`);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="text-center text-[10px]">${tbody.children.length+1}</td><td><input type="number" class="table-input"></td><td><input type="number" class="table-input"></td><td class="text-center"><button onclick="this.closest('tr').remove()" class="text-slate-300"><i data-lucide="minus-circle" class="w-4 h-4"></i></button></td>`;
    tbody.appendChild(tr);
    lucide.createIcons();
}

function startTimer() {
    let s = 0; clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        s++;
        const hrs = Math.floor(s/3600);
        const mins = Math.floor((s%3600)/60);
        const secs = s%60;
        document.getElementById('workout-timer').innerText = `${hrs.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
    }, 1000);
}

function cancelWorkout() {
    clearInterval(timerInterval);
    document.getElementById('workout-setup').classList.remove('hidden');
    document.getElementById('workout-active').classList.add('hidden');
}

// ==========================
// NUTRITION LOGIC
// ==========================
function setNutritionTab(tab) {
    state.nutritionTab = tab;
    document.getElementById('nut-tab-log').classList.toggle('bg-white', tab==='log');
    document.getElementById('nut-tab-log').classList.toggle('text-indigo-600', tab==='log');
    document.getElementById('nut-tab-db').classList.toggle('bg-white', tab==='database');
    document.getElementById('nut-tab-db').classList.toggle('text-indigo-600', tab==='database');

    document.getElementById('nut-view-log').classList.toggle('hidden', tab!=='log');
    document.getElementById('nut-view-db').classList.toggle('hidden', tab!=='database');
    renderDailyLog();
    renderCustomDb();
}

function renderDailyLog() {
    const list = document.getElementById('daily-log-list');
    list.innerHTML = '';
    const meals = state.dailyMeals.filter(m => m.date===state.viewDate);
    meals.forEach((m,i)=>{
        const div = document.createElement('div');
        div.className = 'log-entry';
        div.innerHTML = `
            <span>${m.name}</span>
            <span>${Math.round(m.calories)} kcal | ${Math.round(m.protein)}g</span>
        `;
        list.appendChild(div);
    });
}

function renderCustomDb() {
    const list = document.getElementById('custom-db-list');
    list.innerHTML = '';
    state.customFoodDb.forEach((item)=>{
        const div = document.createElement('div');
        div.className = 'db-entry flex justify-between items-center p-3';
        div.innerHTML = `
            <span>${item.name}</span>
            <span>${item.calories} kcal / ${item.protein}g</span>
        `;
        list.appendChild(div);
    });
}

function saveToDatabase() {
    const name = document.getElementById('form-name').value.trim();
    const cals = parseFloat(document.getElementById('form-cals').value);
    const prot = parseFloat(document.getElementById('form-prot').value);
    if(!name || isNaN(cals) || isNaN(prot)){ alert("Please fill all fields"); return; }
    const item = { name, calories: cals, protein: prot };
    state.customFoodDb.push(item);
    saveState();
    renderCustomDb();
}

// ==========================
// BODY METRICS LOGGING
// ==========================
function renderMetrics(){
    document.getElementById('body-weight').value = state.metricsHistory[state.viewDate]?.weight||'';
    document.getElementById('m-shoulders').value = state.metricsHistory[state.viewDate]?.shoulders||'';
    document.getElementById('m-chest').value = state.metricsHistory[state.viewDate]?.chest||'';
    document.getElementById('m-waist').value = state.metricsHistory[state.viewDate]?.waist||'';
    document.getElementById('m-glutes').value = state.metricsHistory[state.viewDate]?.glutes||'';
}

function saveMetrics(){
    const weight = parseFloat(document.getElementById('body-weight').value);
    const shoulders = parseFloat(document.getElementById('m-shoulders').value);
    const chest = parseFloat(document.getElementById('m-chest').value);
    const waist = parseFloat(document.getElementById('m-waist').value);
    const glutes = parseFloat(document.getElementById('m-glutes').value);
    state.metricsHistory[state.viewDate]={weight,shoulders,chest,waist,glutes};
    saveState();
    alert("Metrics saved!");
}

// ==========================
// HISTORY LOG
// ==========================
function setHistoryTab(tab){
    state.historyTab = tab;
    document.getElementById('hist-tab-train').classList.toggle('bg-white', tab==='training');
    document.getElementById('hist-tab-nut').classList.toggle('bg-white', tab==='nutrition');
    document.getElementById('hist-tab-body').classList.toggle('bg-white', tab==='body');
    renderHistory();
}

function renderHistory(){
    const list = document.getElementById('history-list');
    list.innerHTML='';
    if(state.historyTab==='training'){
        state.workoutHistory.forEach(w=>{
            const div=document.createElement('div');
            div.className='glass-card p-4 rounded-xl';
            div.innerHTML=`<strong>${w.date}</strong> - ${w.focus}`;
            list.appendChild(div);
        });
    } else if(state.historyTab==='nutrition'){
        state.dailyMeals.forEach(m=>{
            const div=document.createElement('div');
            div.className='glass-card p-4 rounded-xl';
            div.innerHTML=`<strong>${m.date}</strong> - ${m.name} - ${m.calories} kcal / ${m.protein}g`;
            list.appendChild(div);
        });
    } else if(state.historyTab==='body'){
        for(const d in state.metricsHistory){
            const m=state.metricsHistory[d];
            const div=document.createElement('div');
            div.className='glass-card p-4 rounded-xl';
            div.innerHTML=`<strong>${d}</strong>
