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

const EXERCISE_DB = [
    { name: "Barbell Bench Press", focus: "Upper Body (Push)", muscle: "Chest", equip: "barbell" },
    { name: "Dumbbell Press", focus: "Upper Body (Push)", muscle: "Chest", equip: "dumbbell" },
    { name: "Push Ups", focus: "Upper Body (Push)", muscle: "Chest", equip: "bodyweight" },
    { name: "Barbell Rows", focus: "Upper Body (Pull)", muscle: "Back", equip: "barbell" },
    { name: "Barbell Squats", focus: "Lower Body (Legs)", muscle: "Legs", equip: "barbell" }
];

// --- INITIALIZATION ---
window.onload = () => {
    const saved = localStorage.getItem('fittrack_v69_storage');
    if (saved) state = { ...state, ...JSON.parse(saved) };
    
    const today = new Date().toISOString().split('T')[0];
    if(document.getElementById('workout-date-input')) document.getElementById('workout-date-input').value = today;
    document.getElementById('status-date').innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    
    renderDashboard();
    lucide.createIcons();
};

function saveState() { localStorage.setItem('fittrack_v69_storage', JSON.stringify(state)); }

// --- NAVIGATION ---
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

    if (tabId === 'dashboard') renderDashboard();
    if (tabId === 'history') renderHistory();
    if (tabId === 'nutrition') { renderDailyLog(); renderCustomDb(); }
    lucide.createIcons();
}

// --- DASHBOARD LOGIC ---
function renderDashboard() {
    const today = state.dailyMeals.filter(m => m.date === state.viewDate);
    const cals = today.reduce((a, b) => a + Number(b.calories), 0);
    const prot = today.reduce((a, b) => a + Number(b.protein), 0);
    
    document.getElementById('dash-calories').innerText = Math.round(cals);
    document.getElementById('dash-protein').innerText = Math.round(prot) + 'g';
    
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

// --- WORKOUT LOGIC ---
function setWorkoutEnv(env) {
    state.workoutEnv = env;
    document.getElementById('env-tab-gym').className = `px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${env==='gym'?'bg-white text-indigo-600 shadow-sm':'text-slate-400'}`;
    document.getElementById('env-tab-home').className = `px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${env==='home'?'bg-white text-indigo-600 shadow-sm':'text-slate-400'}`;
    document.getElementById('current-env-label').innerText = env;
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
    const options = EXERCISE_DB.map(ex => `<option ${presetName === ex.name ? 'selected' : ''}>${ex.name}</option>`).join('');
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
    tr.innerHTML = `<td class="text-center text-[10px]">${tbody.children.length + 1}</td><td><input type="number" class="table-input"></td><td><input type="number" class="table-input"></td><td class="text-center"><button onclick="this.closest('tr').remove()" class="text-slate-300"><i data-lucide="minus-circle" class="w-4 h-4"></i></button></td>`;
    tbody.appendChild(tr); lucide.createIcons();
}

function startTimer() {
    let s = 0; clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        s++;
        const hrs = Math.floor(s/3600); const mins = Math.floor((s % 3600)/60); const secs = s % 60;
        document.getElementById('workout-timer').innerText = `${hrs.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
    }, 1000);
}

function cancelWorkout() { 
    clearInterval(timerInterval); 
    document.getElementById('workout-setup').classList.remove('hidden'); 
    document.getElementById('workout-active').classList.add('hidden'); 
}

// --- NUTRITION & AI LOGIC ---
async function startAIScanner() {
    document.getElementById('ai-scan-container').classList.remove('hidden');
    const video = document.getElementById('ai-video');
    try {
        aiStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = aiStream;
    } catch (err) { alert("Camera access denied."); }
}

function stopAIScanner() {
    if (aiStream) aiStream.getTracks().forEach(t => t.stop());
    document.getElementById('ai-scan-container').classList.add('hidden');
}
// --- FOOD LOG MODE ---
let foodLogMode = "pack";

function setFoodMode(mode) {
  foodLogMode = mode;

  document.getElementById('mode-pack').className =
    `flex-1 py-2 text-xs font-black rounded-lg ${mode==='pack'?'bg-white text-indigo-600':'text-slate-400'}`;
  document.getElementById('mode-amount').className =
    `flex-1 py-2 text-xs font-black rounded-lg ${mode==='amount'?'bg-white text-indigo-600':'text-slate-400'}`;

  document.getElementById('amount-input').classList.toggle('hidden', mode !== 'amount');
}

// --- LOG FOOD ---
function logFood() {
  const name = document.getElementById('log-food-name').value;
  const baseCals = Number(document.getElementById('log-food-cals').value);
  const baseProt = Number(document.getElementById('log-food-prot').value);
  const grams = Number(document.getElementById('log-food-grams').value || 100);

  if (!name || !baseCals) return alert("Missing food details");

  let calories = baseCals;
  let protein = baseProt;

  if (foodLogMode === "amount") {
    const factor = grams / 100;
    calories = Math.round(baseCals * factor);
    protein = Math.round(baseProt * factor);
  }

  state.dailyMeals.push({
    name,
    calories,
    protein,
    grams: foodLogMode === "amount" ? grams : null,
    date: state.viewDate
  });

  saveState();
  renderDailyLog();
  renderDashboard();

  // Reset
  document.getElementById('log-food-name').value = '';
  document.getElementById('log-food-cals').value = '';
  document.getElementById('log-food-prot').value = '';
  document.getElementById('log-food-grams').value = '';
}

// --- RENDER DAILY LOG ---
function renderDailyLog() {
  const list = document.getElementById('daily-log-list');
  list.innerHTML = '';

  state.dailyMeals
    .filter(m => m.date === state.viewDate)
    .forEach(m => {
      const div = document.createElement('div');
      div.className = "bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center";
      div.innerHTML = `
        <div>
          <p class="font-bold">${m.name}</p>
          <p class="text-xs text-slate-400">
            ${m.grams ? `${m.grams}g · ` : ''}${m.protein}g protein
          </p>
        </div>
        <span class="font-black">${m.calories} kcal</span>
      `;
      list.appendChild(div);
    });
}

async function captureAndAnalyzeMeal() {
    if(!apiKey || apiKey.includes("YOUR_")) { alert("Please set your Gemini API Key in script.js"); return; }
    const video = document.getElementById('ai-video');
    const canvas = document.getElementById('ai-capture-canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    document.getElementById('ai-scanner-overlay').classList.add('active');
    const base64Data = canvas.toDataURL('image/jpeg').split(',')[1];

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [
                    { text: "Return JSON only: {'food_name': string, 'calories': int, 'protein': int}" },
                    { inline_data: { mime_type: "image/jpeg", data: base64Data } }
                ]}]
            })
        });
        const data = await response.json();
        const result = JSON.parse(data.candidates[0].content.parts[0].text.replace(/```json|```/g, ""));
        document.getElementById('form-name').value = result.food_name;
        document.getElementById('form-cals').value = result.calories;
        document.getElementById('form-prot').value = result.protein;
        stopAIScanner();
    } catch (e) { alert("AI Analysis failed."); }
}

// --- HELPERS ---
function resetData() {
    if(confirm("Purge all records?")) { localStorage.removeItem('fittrack_v69_storage'); location.reload(); }
}
