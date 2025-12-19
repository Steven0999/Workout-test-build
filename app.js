/* =========================================================
   BURGER MENU & SECTION NAVIGATION
========================================================= */
const burger = document.getElementById('burger-menu');
const sidebar = document.getElementById('sidebar');
const sections = document.querySelectorAll('.section');
const sidebarLinks = document.querySelectorAll('.sidebar-link');

let sidebarOpen = false;

burger.addEventListener('click', () => {
    if (sidebarOpen) {
        sidebar.classList.remove('slide-in');
        sidebar.classList.add('slide-out');
        sidebarOpen = false;
    } else {
        sidebar.classList.remove('slide-out');
        sidebar.classList.add('slide-in');
        sidebarOpen = true;
    }
});

sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        showSection(target);
        if (sidebarOpen) {
            sidebar.classList.remove('slide-in');
            sidebar.classList.add('slide-out');
            sidebarOpen = false;
        }
    });
});

function showSection(section) {
    sections.forEach(sec => sec.style.display = 'none');
    section.style.display = 'block';

    // Highlight active section in sidebar
    sidebarLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').substring(1) === section.id) {
            link.classList.add('active');
        }
    });
}

/* =========================================================
   DASHBOARD INTERACTIVITY
========================================================= */
const dashboardLinks = document.querySelectorAll('.dashboard-link');
dashboardLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        showSection(target);
    });
});

/* =========================================================
   OFFLINE / ONLINE DETECTION
========================================================= */
const offlineBanner = document.getElementById('offline-banner');

function updateOnlineStatus() {
    if (!navigator.onLine) {
        offlineBanner.style.display = 'block';
    } else {
        offlineBanner.style.display = 'none';
    }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

/* =========================================================
   DASHBOARD STATS CALCULATION
========================================================= */
function updateDashboardStats() {
    // Workouts completed today
    const workoutCount = document.querySelectorAll('#workouts .workout.completed').length;
    document.getElementById('dashboard-workouts-count').textContent = workoutCount;

    // Nutrition totals
    const nutritionRows = document.querySelectorAll('#nutrition-table tbody tr');
    let totalCalories = 0, protein = 0, carbs = 0, fats = 0;

    nutritionRows.forEach(row => {
        totalCalories += parseInt(row.dataset.calories || 0);
        protein += parseInt(row.dataset.protein || 0);
        carbs += parseInt(row.dataset.carbs || 0);
        fats += parseInt(row.dataset.fats || 0);
    });

    document.getElementById('dashboard-calories').textContent = totalCalories;
    document.getElementById('dashboard-protein').textContent = protein;
    document.getElementById('dashboard-carbs').textContent = carbs;
    document.getElementById('dashboard-fats').textContent = fats;
}

/* =========================================================
   INITIALIZE
========================================================= */
document.addEventListener('DOMContentLoaded', () => {
    // Show dashboard initially
    showSection(document.getElementById('dashboard'));
    updateDashboardStats();
});
/* =========================================================
   NUTRITION SECTION
========================================================= */
const addFoodBtn = document.getElementById('add-food-btn');
const foodNameInput = document.getElementById('food-name');
const caloriesInput = document.getElementById('food-calories');
const proteinInput = document.getElementById('food-protein');
const carbsInput = document.getElementById('food-carbs');
const fatsInput = document.getElementById('food-fats');
const mealTypeSelect = document.getElementById('meal-type');
const nutritionTableBody = document.querySelector('#nutrition-table tbody');

function addFoodItem() {
    const foodName = foodNameInput.value.trim();
    const calories = parseInt(caloriesInput.value) || 0;
    const protein = parseInt(proteinInput.value) || 0;
    const carbs = parseInt(carbsInput.value) || 0;
    const fats = parseInt(fatsInput.value) || 0;
    const mealType = mealTypeSelect.value;

    if (!foodName) return;

    const row = document.createElement('tr');
    row.dataset.calories = calories;
    row.dataset.protein = protein;
    row.dataset.carbs = carbs;
    row.dataset.fats = fats;

    row.innerHTML = `
        <td>${mealType}</td>
        <td>${foodName}</td>
        <td>${calories}</td>
        <td>${protein}</td>
        <td>${carbs}</td>
        <td>${fats}</td>
    `;

    // Insert row according to meal order: Breakfast, Lunch, Dinner, Snack
    const rows = Array.from(nutritionTableBody.querySelectorAll('tr'));
    let inserted = false;
    const order = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
    for (let i = 0; i < rows.length; i++) {
        if (order.indexOf(mealType) < order.indexOf(rows[i].children[0].textContent)) {
            nutritionTableBody.insertBefore(row, rows[i]);
            inserted = true;
            break;
        }
    }
    if (!inserted) nutritionTableBody.appendChild(row);

    foodNameInput.value = '';
    caloriesInput.value = '';
    proteinInput.value = '';
    carbsInput.value = '';
    fatsInput.value = '';

    updateDashboardStats();
}

addFoodBtn.addEventListener('click', addFoodItem);

/* =========================================================
   WEEKLY VIEW NAVIGATION
========================================================= */
const weekDays = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
let currentDayIndex = new Date().getDay() - 1; // 0=Monday
if(currentDayIndex < 0) currentDayIndex = 6;

function showWeekDay(dayIndex) {
    sections.forEach(sec => sec.style.display = 'none');
    const daySection = document.getElementById(`day-${weekDays[dayIndex].toLowerCase()}`);
    if (daySection) daySection.style.display = 'block';
}

document.getElementById('prev-day-btn').addEventListener('click', () => {
    currentDayIndex = (currentDayIndex - 1 + 7) % 7;
    showWeekDay(currentDayIndex);
});
document.getElementById('next-day-btn').addEventListener('click', () => {
    currentDayIndex = (currentDayIndex + 1) % 7;
    showWeekDay(currentDayIndex);
});

/* =========================================================
   ANALYTICS CHARTS
========================================================= */
const nutritionChartCtx = document.getElementById('nutrition-chart').getContext('2d');
const nutritionChart = new Chart(nutritionChartCtx, {
    type: 'doughnut',
    data: {
        labels: ['Protein', 'Carbs', 'Fats'],
        datasets: [{
            label: 'Macros',
            data: [0,0,0],
            backgroundColor: ['#FF6384','#36A2EB','#FFCE56'],
        }]
    },
    options: {
        responsive: true,
        plugins: {
            legend: { position: 'bottom' },
        }
    }
});

function updateNutritionChart() {
    const rows = Array.from(nutritionTableBody.querySelectorAll('tr'));
    let protein = 0, carbs = 0, fats = 0;
    rows.forEach(row => {
        protein += parseInt(row.dataset.protein || 0);
        carbs += parseInt(row.dataset.carbs || 0);
        fats += parseInt(row.dataset.fats || 0);
    });
    nutritionChart.data.datasets[0].data = [protein, carbs, fats];
    nutritionChart.update();
}

nutritionTableBody.addEventListener('DOMNodeInserted', updateNutritionChart);

/* =========================================================
   BARCODE SCANNER
========================================================= */
const barcodeInput = document.getElementById('barcode-input');
const scanBtn = document.getElementById('scan-barcode-btn');

scanBtn.addEventListener('click', () => {
    const code = barcodeInput.value.trim();
    if (!code) return;

    // Example: fake API or lookup
    const mockDatabase = {
        '0123456789012': {name: 'Banana', calories: 100, protein: 1, carbs: 27, fats: 0, type: 'Snack'},
        '0987654321098': {name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fats: 4, type: 'Lunch'}
    };

    const food = mockDatabase[code];
    if (food) {
        foodNameInput.value = food.name;
        caloriesInput.value = food.calories;
        proteinInput.value = food.protein;
        carbsInput.value = food.carbs;
        fatsInput.value = food.fats;
        mealTypeSelect.value = food.type;
        addFoodItem();
    } else {
        alert('Food not found in database.');
    }
    barcodeInput.value = '';
});
/* =========================================================
   WORKOUT SECTION
========================================================= */
const addWorkoutBtn = document.getElementById('add-workout-btn');
const workoutNameInput = document.getElementById('workout-name');
const workoutRepsInput = document.getElementById('workout-reps');
const workoutSetsInput = document.getElementById('workout-sets');
const workoutTableBody = document.querySelector('#workout-table tbody');

function addWorkout() {
    const name = workoutNameInput.value.trim();
    const reps = parseInt(workoutRepsInput.value) || 0;
    const sets = parseInt(workoutSetsInput.value) || 0;
    if (!name) return;

    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${name}</td>
        <td>${reps}</td>
        <td>${sets}</td>
    `;
    workoutTableBody.appendChild(row);

    workoutNameInput.value = '';
    workoutRepsInput.value = '';
    workoutSetsInput.value = '';

    updateDashboardStats();
}

addWorkoutBtn.addEventListener('click', addWorkout);

/* =========================================================
   BODY MEASUREMENTS SECTION
========================================================= */
const addMeasurementBtn = document.getElementById('add-measurement-btn');
const weightInput = document.getElementById('weight-input');
const heightInput = document.getElementById('height-input');
const waistInput = document.getElementById('waist-input');
const bodyTableBody = document.querySelector('#body-table tbody');

function addMeasurement() {
    const weight = parseFloat(weightInput.value) || 0;
    const height = parseFloat(heightInput.value) || 0;
    const waist = parseFloat(waistInput.value) || 0;

    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${weight}</td>
        <td>${height}</td>
        <td>${waist}</td>
    `;
    bodyTableBody.appendChild(row);

    weightInput.value = '';
    heightInput.value = '';
    waistInput.value = '';

    updateDashboardStats();
}

addMeasurementBtn.addEventListener('click', addMeasurement);

/* =========================================================
   HISTORY SECTION
========================================================= */
const historyTableBody = document.querySelector('#history-table tbody');

function saveHistoryEntry(type, details) {
    const row = document.createElement('tr');
    const date = new Date().toLocaleDateString();
    row.innerHTML = `
        <td>${date}</td>
        <td>${type}</td>
        <td>${details}</td>
    `;
    historyTableBody.appendChild(row);
    updateDashboardStats();
}

/* =========================================================
   DASHBOARD STATS
========================================================= */
const workoutsCountEl = document.getElementById('dashboard-workouts');
const caloriesTotalEl = document.getElementById('dashboard-calories');
const macrosTotalEl = document.getElementById('dashboard-macros');

function updateDashboardStats() {
    // Workouts
    workoutsCountEl.textContent = workoutTableBody.querySelectorAll('tr').length;

    // Nutrition totals
    let calories = 0, protein = 0, carbs = 0, fats = 0;
    const foodRows = nutritionTableBody.querySelectorAll('tr');
    foodRows.forEach(row => {
        calories += parseInt(row.dataset.calories || 0);
        protein += parseInt(row.dataset.protein || 0);
        carbs += parseInt(row.dataset.carbs || 0);
        fats += parseInt(row.dataset.fats || 0);
    });

    caloriesTotalEl.textContent = calories;
    macrosTotalEl.textContent = `P: ${protein}g / C: ${carbs}g / F: ${fats}g`;

    // Save offline cache
    saveOfflineData();
}

/* =========================================================
   OFFLINE-FIRST CACHING
========================================================= */
function saveOfflineData() {
    const data = {
        workouts: Array.from(workoutTableBody.querySelectorAll('tr')).map(tr => ({
            name: tr.children[0].textContent,
            reps: tr.children[1].textContent,
            sets: tr.children[2].textContent
        })),
        nutrition: Array.from(nutritionTableBody.querySelectorAll('tr')).map(tr => ({
            meal: tr.children[0].textContent,
            name: tr.children[1].textContent,
            calories: tr.children[2].textContent,
            protein: tr.children[3].textContent,
            carbs: tr.children[4].textContent,
            fats: tr.children[5].textContent
        })),
        bodyMeasurements: Array.from(bodyTableBody.querySelectorAll('tr')).map(tr => ({
            weight: tr.children[0].textContent,
            height: tr.children[1].textContent,
            waist: tr.children[2].textContent
        })),
        history: Array.from(historyTableBody.querySelectorAll('tr')).map(tr => ({
            date: tr.children[0].textContent,
            type: tr.children[1].textContent,
            details: tr.children[2].textContent
        }))
    };
    localStorage.setItem('gymAppData', JSON.stringify(data));
}

function loadOfflineData() {
    const data = JSON.parse(localStorage.getItem('gymAppData') || '{}');

    if (data.workouts) {
        data.workouts.forEach(w => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${w.name}</td><td>${w.reps}</td><td>${w.sets}</td>`;
            workoutTableBody.appendChild(row);
        });
    }

    if (data.nutrition) {
        data.nutrition.forEach(f => {
            const row = document.createElement('tr');
            row.dataset.calories = f.calories;
            row.dataset.protein = f.protein;
            row.dataset.carbs = f.carbs;
            row.dataset.fats = f.fats;
            row.innerHTML = `<td>${f.meal}</td><td>${f.name}</td><td>${f.calories}</td><td>${f.protein}</td><td>${f.carbs}</td><td>${f.fats}</td>`;
            nutritionTableBody.appendChild(row);
        });
        updateNutritionChart();
    }

    if (data.bodyMeasurements) {
        data.bodyMeasurements.forEach(b => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${b.weight}</td><td>${b.height}</td><td>${b.waist}</td>`;
            bodyTableBody.appendChild(row);
        });
    }

    if (data.history) {
        data.history.forEach(h => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${h.date}</td><td>${h.type}</td><td>${h.details}</td>`;
            historyTableBody.appendChild(row);
        });
    }

    updateDashboardStats();
}

window.addEventListener('load', loadOfflineData);

/* =========================================================
   ACTIVE SECTION HIGHLIGHTING
========================================================= */
const navLinks = document.querySelectorAll('.nav-link');

navLinks.forEach(link => {
    link.addEventListener('click', e => {
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        const sectionId = link.dataset.section;
        sections.forEach(sec => sec.style.display = 'none');
        document.getElementById(sectionId).style.display = 'block';
    });
});

/* =========================================================
   SLIDE-IN ANIMATION
========================================================= */
sections.forEach(sec => {
    sec.classList.add('slide-in');
});
/* =========================================================
   BURGER MENU TOGGLE
========================================================= */
const burgerBtn = document.getElementById('burger-btn');
const sideMenu = document.getElementById('side-menu');

burgerBtn.addEventListener('click', () => {
    sideMenu.classList.toggle('menu-open');
});

/* =========================================================
   NAVIGATION FROM DASHBOARD
========================================================= */
const dashboardLinks = document.querySelectorAll('.dashboard-link');
dashboardLinks.forEach(link => {
    link.addEventListener('click', e => {
        const sectionId = link.dataset.section;
        // Hide all sections
        sections.forEach(sec => sec.style.display = 'none');
        // Show selected section
        const target = document.getElementById(sectionId);
        target.style.display = 'block';
        // Slide-in animation
        target.classList.remove('slide-in');
        void target.offsetWidth; // trigger reflow
        target.classList.add('slide-in');

        // Highlight active in side menu
        navLinks.forEach(l => l.classList.remove('active'));
        document.querySelector(`.nav-link[data-section="${sectionId}"]`).classList.add('active');
    });
});

/* =========================================================
   ANIMATION RE-TRIGGER FOR MENU ITEMS
========================================================= */
navLinks.forEach(link => {
    link.addEventListener('click', e => {
        const sectionId = link.dataset.section;
        const target = document.getElementById(sectionId);
        target.classList.remove('slide-in');
        void target.offsetWidth;
        target.classList.add('slide-in');
    });
});

/* =========================================================
   MACRO AND CALORIE CHART
========================================================= */
const ctx = document.getElementById('nutritionChart').getContext('2d');
let nutritionChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
        labels: ['Protein', 'Carbs', 'Fats'],
        datasets: [{
            label: 'Macros',
            data: [0, 0, 0],
            backgroundColor: ['#36A2EB', '#FFCE56', '#FF6384']
        }]
    },
    options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } }
    }
});

function updateNutritionChart() {
    let protein = 0, carbs = 0, fats = 0;
    const foodRows = nutritionTableBody.querySelectorAll('tr');
    foodRows.forEach(row => {
        protein += parseInt(row.dataset.protein || 0);
        carbs += parseInt(row.dataset.carbs || 0);
        fats += parseInt(row.dataset.fats || 0);
    });
    nutritionChart.data.datasets[0].data = [protein, carbs, fats];
    nutritionChart.update();
}

/* =========================================================
   WEEKLY VIEWS
========================================================= */
const weeklyViewBtn = document.getElementById('weekly-view-btn');
const weeklyViewSection = document.getElementById('weekly-view');

weeklyViewBtn.addEventListener('click', () => {
    // Populate weekly summary (example: total workouts and calories)
    let weeklyWorkouts = workoutTableBody.querySelectorAll('tr').length;
    let weeklyCalories = 0;
    nutritionTableBody.querySelectorAll('tr').forEach(row => {
        weeklyCalories += parseInt(row.dataset.calories || 0);
    });

    weeklyViewSection.innerHTML = `
        <h3>Weekly Summary</h3>
        <p>Total Workouts: ${weeklyWorkouts}</p>
        <p>Total Calories: ${weeklyCalories}</p>
    `;
    sections.forEach(sec => sec.style.display = 'none');
    weeklyViewSection.style.display = 'block';
    weeklyViewSection.classList.add('slide-in');
});

/* =========================================================
   FINAL INITIALIZATION
========================================================= */
updateDashboardStats();
sections.forEach(sec => sec.style.display = 'none');
document.getElementById('dashboard').style.display = 'block';
document.querySelector('.nav-link[data-section="dashboard"]').classList.add('active');
