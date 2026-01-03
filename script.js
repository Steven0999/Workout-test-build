// --- CONFIGURATION ---
const apiKey = "YOUR_GEMINI_API_KEY_HERE";

let html5QrCode;
let aiStream = null;
let timerInterval;
let activeWorkoutDate = "";

// --- STATE ---
let state = {
    activeTab: 'dashboard',
    workoutEnv: 'gym',
    viewDate: new Date().toISOString().split('T')[0],
    goals: { calories: 2500, water: 2500 },
    equipment: { gym:{barbell:true,dumbbell:true,kettlebell:true,cable:true,machine:true,resistanceband:false,bodyweight:true}, home:{barbell:false,dumbbell:true,kettlebell:false,cable:false,machine:false,resistanceband:true,bodyweight:true} },
    dailyMeals: [],
    waterLogs: {},
    workoutHistory: [],
    metricsHistory: [],
    customFoodDb: [],
    foodMode: 'pack'
};

// --- EXERCISES DB ---
const EXERCISE_DB = [
    { name: "Barbell Bench Press", focus: "Upper Body (Push)", muscle: "Chest", equip: "barbell" },
    { name: "Dumbbell Press", focus: "Upper Body (Push)", muscle: "Chest", equip: "dumbbell" },
    { name: "Push Ups", focus: "Upper Body (Push)", muscle: "Chest", equip: "bodyweight" },
    { name: "Barbell Rows", focus: "Upper Body (Pull)", muscle: "Back", equip: "barbell" },
    { name: "Barbell Squats", focus: "Lower Body (Legs)", muscle: "Legs", equip: "barbell" }
];

// --- INIT ---
window.onload = () => {
    const saved = localStorage.getItem('fittrack_v69_storage');
    if(saved) state = {...state, ...JSON.parse(saved)};

    document.getElementById('workout-date-input')?.value = state.viewDate;
    document.getElementById('status-date').innerText = new Date().toLocaleDateString();

    renderDashboard();
    renderDailyLog();
    renderHistory();
    lucide.createIcons();
};

// --- STATE SAVE ---
function saveState() { localStorage.setItem('fittrack_v69_storage', JSON.stringify(state)); }

// --- NAV ---
function switchTab(tabId){
    state.activeTab = tabId;
    document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
}

// --- DASHBOARD ---
function renderDashboard(){
    const todayMeals = state.dailyMeals.filter(m => m.date === state.viewDate);
    const cals = todayMeals.reduce((a,b)=>a + Number(b.calories),0);
    const prot = todayMeals.reduce((a,b)=>a + Number(b.protein),0);

    document.getElementById('dash-calories').innerText = Math.round(cals);
    document.getElementById('dash-protein').innerText = Math.round(prot) + 'g';

    const progress = Math.min((cals/state.goals.calories)*534,534);
    document.getElementById('calorie-progress').style.strokeDashoffset = 534 - progress;

    const water = state.waterLogs[state.viewDate] || 0;
    document.getElementById('water-count').innerText = `${(water/1000).toFixed(1)} / ${(state.goals.water/1000).toFixed(1)} Liters`;
}
function updateWater(ml){ 
    const d = state.viewDate;
    state.waterLogs[d] = Math.max(0,(state.waterLogs[d]||0)+ml);
    saveState(); renderDashboard();
}

// --- WORKOUT ---
function setWorkoutEnv(env){
    state.workoutEnv = env;
}
function startManualWorkout(){
    activeWorkoutDate = document.getElementById('workout-date-input').value;
    document.getElementById('workout-setup').classList.add('hidden');
    document.getElementById('workout-active').classList.remove('hidden');
    addExerciseField();
    startTimer();
}
function addExerciseField(presetName=null){
    const options = EXERCISE_DB.map(ex=>`<option ${presetName===ex.name?'selected':''}>${ex.name}</option>`).join('');
    const exId = Date.now()+Math.random();
    const div = document.createElement('div');
    div.className="exercise-entry"; div.dataset.id=exId;
    div.innerHTML = `<div class="flex justify-between">
        <select>${options}</select>
        <button onclick="this.closest('.exercise-entry').remove()">Delete</button>
    </div>
    <table class="workout-table"><thead><tr><th>Set</th><th>Kg</th><th>Reps</th></tr></thead><tbody class="sets-tbody"></tbody></table>
    <button onclick="addSetToExercise('${exId}')">+ Add Set</button>`;
    document.getElementById('exercise-list').appendChild(div);
    addSetToExercise(exId);
}
function addSetToExercise(exId){
    const tbody = document.querySelector(`.exercise-entry[data-id="${exId}"] .sets-tbody`);
    const tr = document.createElement('tr');
    tr.innerHTML=`<td>${tbody.children.length+1}</td><td><input type="number"></td><td><input type="number"></td>`;
    tbody.appendChild(tr);
}
function startTimer(){
    let s=0; clearInterval(timerInterval);
    timerInterval = setInterval(()=>{
        s++; const hrs=Math.floor(s/3600), mins=Math.floor((s%3600)/60), secs=s%60;
        document.getElementById('workout-timer').innerText = `${hrs.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
    },1000);
}
function cancelWorkout(){
    clearInterval(timerInterval);
    document.getElementById('workout-setup').classList.remove('hidden');
    document.getElementById('workout-active').classList.add('hidden');
}

// --- NUTRITION ---
function setFoodMode(mode){
    state.foodMode = mode;
    document.getElementById('mode-pack').classList.toggle('bg-white',mode==='pack');
    document.getElementById('mode-pack').classList.toggle('text-indigo-600',mode==='pack');
    document.getElementById('mode-amount').classList.toggle('bg-white',mode==='amount');
    document.getElementById('mode-amount').classList.toggle('text-indigo-600',mode==='amount');
    document.getElementById('amount-input').style.display = mode==='amount'?'block':'none';
}
function logFood(){
    const name = document.getElementById('log-food-name').value;
    let calories = Number(document.getElementById('log-food-cals').value);
    let protein = Number(document.getElementById('log-food-prot').value);
    const grams = Number(document.getElementById('log-food-grams').value) || 100;

    if(state.foodMode==='amount'){
        calories = calories*(grams/100);
        protein = protein*(grams/100);
    }

    state.dailyMeals.push({
        date: state.viewDate,
        name, calories, protein
    });
    saveState();
    renderDailyLog();
    renderDashboard();
}

function renderDailyLog(){
    const container = document.getElementById('daily-log-list');
    container.innerHTML = '';
    const meals = state.dailyMeals.filter(m=>m.date===state.viewDate);
    meals.forEach((m,i)=>{
        const div = document.createElement('div');
        div.className='bg-white p-4 rounded-xl flex justify-between';
        div.innerHTML = `<span>${m.name}</span><span>${Math.round(m.calories)} kcal | ${Math.round(m.protein)} g</span>`;
        container.appendChild(div);
    });
}

// --- METRICS ---
function saveMetrics(){
    const metric = {
        date: state.viewDate,
        weight: Number(document.getElementById('body-weight').value),
        chest: Number(document.getElementById('m-chest').value),
        waist: Number(document.getElementById('m-waist').value),
        hips: Number(document.getElementById('m-hips').value),
        arms: Number(document.getElementById('m-arms').value)
    };
    state.metricsHistory.push(metric);
    saveState();
}

// --- HISTORY ---
function renderHistory(){
    const container = document.getElementById('history-list');
    container.innerHTML = '';
    state.workoutHistory.forEach(w=>{
        const div=document.createElement('div');
        div.innerText=`Workout on ${w.date}`;
        container.appendChild(div);
    });
    state.dailyMeals.forEach(f=>{
        const div=document.createElement('div');
        div.innerText=`Meal: ${f.name} - ${Math.round(f.calories)} kcal`;
        container.appendChild(div);
    });
}

// --- RESET ---
function resetData(){if(confirm("Delete all records?")){localStorage.removeItem('fittrack_v69_storage'); location.reload();}}
