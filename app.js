/* =========================================================
   GLOBAL VARIABLES & STATE
   ========================================================= */

const appState = {
    workouts: [], // Array of all workouts
    nutrition: [], // Array of food logs
    bodyMetrics: {
        shoulders: [],
        chest: [],
        waist: [],
        glutes: [],
        arms: [],
        legs: []
    },
    photos: [], // Multiple photos per date
    history: [],
    readinessScore: 0,
    offline: false,
    activeSection: 'dashboard'
};

const elements = {
    burgerBtn: document.getElementById('burger-btn'),
    sideMenu: document.getElementById('side-menu'),
    sections: document.querySelectorAll('.section'),
    thumbNavButtons: document.querySelectorAll('.thumb-nav button'),
    offlineIndicator: document.getElementById('offline-indicator'),
    dashboardCards: document.querySelectorAll('.dashboard-card')
};

/* =========================================================
   UTILITY FUNCTIONS
   ========================================================= */

function setActiveSection(sectionId) {
    appState.activeSection = sectionId;

    // Hide all sections
    elements.sections.forEach(sec => {
        sec.classList.remove('active');
    });

    // Show the selected section
    const activeSec = document.getElementById(sectionId);
    if (activeSec) {
        activeSec.classList.add('active');
    }

    // Highlight in side menu
    elements.sideMenu.querySelectorAll('a').forEach(link => {
        if (link.dataset.target === sectionId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

/* =========================================================
   BURGER MENU TOGGLE
   ========================================================= */

elements.burgerBtn.addEventListener('click', () => {
    elements.sideMenu.classList.toggle('active');
});

/* =========================================================
   THUMB NAVIGATION HANDLERS
   ========================================================= */

elements.thumbNavButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const target = e.currentTarget.dataset.target;
        setActiveSection(target);
    });
});

/* =========================================================
   OFFLINE DETECTION
   ========================================================= */

window.addEventListener('online', () => {
    appState.offline = false;
    elements.offlineIndicator.classList.remove('active');
});

window.addEventListener('offline', () => {
    appState.offline = true;
    elements.offlineIndicator.classList.add('active');
});

/* =========================================================
   DASHBOARD UPDATES
   ========================================================= */

function updateDashboard() {
    // Example: Workout completed today
    const workoutsToday = appState.workouts.filter(w => w.date === getTodayDate());
    const workoutCard = document.getElementById('workouts-today-count');
    if (workoutCard) workoutCard.textContent = workoutsToday.length;

    // Nutrition totals
    const nutritionCard = document.getElementById('nutrition-summary');
    if (nutritionCard) {
        const totalCalories = appState.nutrition.reduce((sum, f) => sum + f.calories, 0);
        const totalProtein = appState.nutrition.reduce((sum, f) => sum + f.protein, 0);
        const totalCarbs = appState.nutrition.reduce((sum, f) => sum + f.carbs, 0);
        const totalFat = appState.nutrition.reduce((sum, f) => sum + f.fat, 0);
        nutritionCard.innerHTML = `
            <p>Calories: ${totalCalories}</p>
            <p>Protein: ${totalProtein}g</p>
            <p>Carbs: ${totalCarbs}g</p>
            <p>Fat: ${totalFat}g</p>
        `;
    }

    // Readiness score
    const readinessCard = document.getElementById('readiness-score');
    if (readinessCard) {
        readinessCard.querySelector('.score').textContent = appState.readinessScore;
    }
}

/* =========================================================
   HELPER FUNCTIONS
   ========================================================= */

function getTodayDate() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}
/* =========================================================
   BODY METRICS FUNCTIONS
   ========================================================= */

function addBodyMetric(date, metricName, value) {
    if (!appState.bodyMetrics[metricName]) {
        console.warn(`Metric ${metricName} does not exist.`);
        return;
    }
    appState.bodyMetrics[metricName].push({ date, value });
    updateBodyMetricChart(metricName);
}

function updateBodyMetricChart(metricName) {
    const data = appState.bodyMetrics[metricName];
    const chartContainer = document.getElementById(`${metricName}-chart`);
    if (!chartContainer) return;

    // Clear existing chart
    chartContainer.innerHTML = '';

    // Create simple line chart (HTML-based for now)
    const maxVal = Math.max(...data.map(d => d.value), 1);
    data.forEach((point, index) => {
        const bar = document.createElement('div');
        bar.classList.add('chart-bar');
        bar.style.height = `${(point.value / maxVal) * 100}%`;
        bar.title = `${point.date}: ${point.value}`;
        chartContainer.appendChild(bar);
    });
}

/* =========================================================
   PHOTO MANAGEMENT
   ========================================================= */

function addBodyPhoto(date, photoURL) {
    if (!appState.photos[date]) {
        appState.photos[date] = [];
    }
    appState.photos[date].push(photoURL);
    updatePhotoTimeline(date);
}

function updatePhotoTimeline(date) {
    const timelineContainer = document.getElementById('photo-timeline');
    if (!timelineContainer) return;

    timelineContainer.innerHTML = '';

    Object.keys(appState.photos).sort().forEach(d => {
        const dateGroup = document.createElement('div');
        dateGroup.classList.add('photo-date-group');
        const dateLabel = document.createElement('h4');
        dateLabel.textContent = d;
        dateGroup.appendChild(dateLabel);

        appState.photos[d].forEach(url => {
            const img = document.createElement('img');
            img.src = url;
            img.classList.add('body-photo');
            dateGroup.appendChild(img);
        });

        timelineContainer.appendChild(dateGroup);
    });
}

/* =========================================================
   NUTRITION LOGGING
   ========================================================= */

function addNutrition(date, mealType, foodItem) {
    // mealType: Breakfast, Lunch, Dinner, Snack
    appState.nutrition.push({ date, mealType, ...foodItem });
    sortNutrition();
    renderNutritionTable();
}

function sortNutrition() {
    const mealOrder = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
    appState.nutrition.sort((a, b) => {
        if (a.date !== b.date) return new Date(a.date) - new Date(b.date);
        return mealOrder.indexOf(a.mealType) - mealOrder.indexOf(b.mealType);
    });
}

function renderNutritionTable() {
    const tableBody = document.getElementById('nutrition-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    appState.nutrition.forEach(entry => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${entry.date}</td>
            <td>${entry.mealType}</td>
            <td>${entry.name}</td>
            <td>${entry.calories}</td>
            <td>${entry.protein}</td>
            <td>${entry.carbs}</td>
            <td>${entry.fat}</td>
        `;
        tableBody.appendChild(tr);
    });
}

/* =========================================================
   WORKOUT FOCUS + EQUIPMENT LOGIC
   ========================================================= */

function getAvailableExercises(focus, equipmentList) {
    // Example: filtering exercises based on focus and available equipment
    const allExercises = [
        { name: 'Bench Press', focus: 'push', equipment: 'barbell' },
        { name: 'Squat', focus: 'squat', equipment: 'barbell' },
        { name: 'Pull Up', focus: 'pull', equipment: 'pull-up bar' },
        { name: 'Deadlift', focus: 'hinge', equipment: 'barbell' },
        { name: 'Bicep Curl', focus: 'arms', equipment: 'dumbbell' },
        { name: 'Leg Press', focus: 'lower body', equipment: 'machine' }
    ];

    return allExercises.filter(ex => 
        ex.focus === focus && equipmentList.includes(ex.equipment)
    );
}

/* =========================================================
   AUTOGENERATED WORKOUT
   ========================================================= */

function generateWorkout(focus, equipmentList) {
    const exercises = getAvailableExercises(focus, equipmentList);
    const workout = exercises.map(e => ({
        name: e.name,
        sets: 3,
        reps: 8,
        weight: 0 // Can integrate progressive overload logic later
    }));

    return workout;
}
/* =========================================================
   AI-STYLE PROGRESSIVE OVERLOAD
   ========================================================= */

function applyProgressiveOverload(workout) {
    // Increase weight or reps intelligently based on last session
    workout.forEach(exercise => {
        const lastSession = appState.history.find(h =>
            h.workout.some(e => e.name === exercise.name)
        );

        if (!lastSession) return;

        const lastEx = lastSession.workout.find(e => e.name === exercise.name);

        // Simple progressive logic: +2.5% weight if last set completed
        if (lastEx && lastEx.completedSets >= lastEx.sets) {
            exercise.weight = Math.round((lastEx.weight * 1.025) * 10) / 10;
        } else {
            exercise.weight = lastEx ? lastEx.weight : 0;
        }

        // Optional: increase reps if weight same
        if (exercise.weight === lastEx.weight) {
            exercise.reps = lastEx.reps + 1;
        }
    });

    return workout;
}

/* =========================================================
   READINESS SCORE
   ========================================================= */

function computeReadinessScore() {
    const sleep = appState.dailyStats.sleep || 7; // hours
    const fatigue = appState.dailyStats.fatigue || 5; // 1-10
    const stress = appState.dailyStats.stress || 5; // 1-10
    const injury = appState.dailyStats.injury || 0; // 0-1

    // Example simple formula: 0-100%
    let score = 100;
    score -= fatigue * 5;
    score -= stress * 3;
    score -= injury * 20;
    if (sleep < 6) score -= (6 - sleep) * 5;

    appState.readiness = Math.max(0, Math.min(100, score));
    renderReadinessScore();
}

function renderReadinessScore() {
    const readinessEl = document.getElementById('readiness-score');
    if (!readinessEl) return;

    readinessEl.textContent = `${appState.readiness}% Ready`;
    readinessEl.style.color = appState.readiness > 70 ? 'green' :
                              appState.readiness > 40 ? 'orange' : 'red';
}

/* =========================================================
   EXERCISE SUBSTITUTION
   ========================================================= */

function substituteExercise(originalExercise, equipmentList) {
    // Substitute if equipment missing
    const equipment = originalExercise.equipment;
    if (equipmentList.includes(equipment)) return originalExercise;

    // Find alternative with same focus
    const alternatives = [
        { name: 'Push-up', focus: 'push', equipment: 'bodyweight' },
        { name: 'Goblet Squat', focus: 'squat', equipment: 'dumbbell' },
        { name: 'Dumbbell Row', focus: 'pull', equipment: 'dumbbell' },
        { name: 'Hip Thrust', focus: 'glutes', equipment: 'bodyweight' }
    ];

    return alternatives.find(a => a.focus === originalExercise.focus) || originalExercise;
}

/* =========================================================
   MOBILE-FIRST SWIPE NAVIGATION
   ========================================================= */

let currentSectionIndex = 0;
const sections = ['dashboard', 'gymConfig', 'workout', 'nutrition', 'bodyMetrics', 'history'];

function showSection(index) {
    sections.forEach((sec, i) => {
        const el = document.getElementById(sec);
        if (!el) return;
        el.style.transform = `translateX(${(i - index) * 100}%)`;
        el.style.transition = 'transform 0.4s ease';
    });

    highlightActiveSection(index);
    currentSectionIndex = index;
}

function highlightActiveSection(index) {
    sections.forEach((sec, i) => {
        const btn = document.querySelector(`.nav-btn[data-section="${sec}"]`);
        if (!btn) return;
        btn.classList.toggle('active', i === index);
    });
}

// Swipe detection
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleGesture();
});

function handleGesture() {
    if (touchEndX < touchStartX - 50) {
        showSection(Math.min(currentSectionIndex + 1, sections.length - 1));
    }
    if (touchEndX > touchStartX + 50) {
        showSection(Math.max(currentSectionIndex - 1, 0));
    }
}

/* =========================================================
   ONE-HAND THUMB UI INTERACTIONS
   ========================================================= */

function initThumbNavigation() {
    const thumbNav = document.getElementById('thumb-nav');
    if (!thumbNav) return;

    thumbNav.addEventListener('click', e => {
        const targetSection = e.target.dataset.section;
        if (!targetSection) return;
        const index = sections.indexOf(targetSection);
        if (index !== -1) showSection(index);
    });
}

/* =========================================================
   INIT FUNCTION
   ========================================================= */

function initApp() {
    computeReadinessScore();
    showSection(0);
    initThumbNavigation();
}

document.addEventListener('DOMContentLoaded', initApp);
/* =========================================================
   DASHBOARD OVERVIEW RENDERING
   ========================================================= */

function renderDashboard() {
    const workoutsTodayEl = document.getElementById('dashboard-workouts');
    const caloriesEl = document.getElementById('dashboard-calories');
    const macrosEl = document.getElementById('dashboard-macros');
    const bodyMetricsEl = document.getElementById('dashboard-body-metrics');

    // Workouts completed today
    const workoutsToday = appState.history.filter(h => h.date === getToday()).length;
    workoutsTodayEl.textContent = workoutsToday;

    // Nutrition summary
    const todayNutrition = appState.nutrition.filter(n => n.date === getToday());
    const totalCalories = todayNutrition.reduce((sum, n) => sum + n.calories, 0);
    const totalProtein = todayNutrition.reduce((sum, n) => sum + n.protein, 0);
    const totalCarbs = todayNutrition.reduce((sum, n) => sum + n.carbs, 0);
    const totalFat = todayNutrition.reduce((sum, n) => sum + n.fat, 0);

    caloriesEl.textContent = `${totalCalories} kcal`;
    macrosEl.textContent = `P:${totalProtein}g C:${totalCarbs}g F:${totalFat}g`;

    // Body metrics overview
    const metrics = appState.bodyMetrics;
    bodyMetricsEl.innerHTML = `
        Shoulders: ${metrics.shoulders || '-'} cm <br>
        Chest: ${metrics.chest || '-'} cm <br>
        Waist: ${metrics.waist || '-'} cm <br>
        Glutes: ${metrics.glutes || '-'} cm <br>
        Arms: ${metrics.arms || '-'} cm <br>
        Legs: ${metrics.legs || '-'} cm
    `;
}

/* =========================================================
   BURGER MENU TOGGLE & SLIDE-IN ANIMATION
   ========================================================= */

const burgerBtn = document.getElementById('burger-menu');
const sideMenu = document.getElementById('side-menu');

burgerBtn.addEventListener('click', () => {
    if (!sideMenu.classList.contains('open')) {
        sideMenu.classList.add('open');
        sideMenu.style.transform = 'translateX(0)';
    } else {
        sideMenu.classList.remove('open');
        sideMenu.style.transform = 'translateX(-100%)';
    }
});

// Close menu when clicking outside
document.addEventListener('click', e => {
    if (!sideMenu.contains(e.target) && !burgerBtn.contains(e.target)) {
        sideMenu.classList.remove('open');
        sideMenu.style.transform = 'translateX(-100%)';
    }
});

/* =========================================================
   SECTION SLIDE-IN ANIMATIONS
   ========================================================= */

function applySlideInAnimation(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    section.style.opacity = 0;
    section.style.transform = 'translateY(50px)';
    section.style.transition = 'all 0.5s ease';

    requestAnimationFrame(() => {
        section.style.opacity = 1;
        section.style.transform = 'translateY(0)';
    });
}

/* =========================================================
   NUTRITION WEEKLY VIEW
   ========================================================= */

function renderNutritionWeekly() {
    const weekDays = 7;
    const today = new Date();
    const weeklyData = [];

    for (let i = 0; i < weekDays; i++) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const dayNutrition = appState.nutrition.filter(n => n.date === dateStr);
        const totalCalories = dayNutrition.reduce((sum, n) => sum + n.calories, 0);
        weeklyData.unshift({ date: dateStr, calories: totalCalories });
    }

    const weeklyEl = document.getElementById('nutrition-weekly');
    weeklyEl.innerHTML = weeklyData.map(d => `<div>${d.date}: ${d.calories} kcal</div>`).join('');
}

/* =========================================================
   AUTOSORT NUTRITION BY MEAL TYPE
   ========================================================= */

function sortNutritionByMeal() {
    const mealsOrder = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
    appState.nutrition.sort((a, b) => mealsOrder.indexOf(a.mealType) - mealsOrder.indexOf(b.mealType));
}

/* =========================================================
   DASHBOARD NAVIGATION FROM CARDS
   ========================================================= */

document.querySelectorAll('.dashboard-card').forEach(card => {
    card.addEventListener('click', () => {
        const targetSection = card.dataset.section;
        const index = sections.indexOf(targetSection);
        if (index !== -1) showSection(index);
    });
});

/* =========================================================
   INTEGRATION OF ALL INIT FUNCTIONS
   ========================================================= */

function initDashboard() {
    renderDashboard();
    renderNutritionWeekly();
    sortNutritionByMeal();
}

document.addEventListener('DOMContentLoaded', () => {
    initApp(); // from previous JS parts
    initDashboard();
});/* =========================================================
   BODY METRICS PROGRESS CHARTS
   ========================================================= */

function renderBodyMetricsChart() {
    const ctx = document.getElementById('bodyMetricsChart').getContext('2d');

    const labels = appState.bodyMetricsHistory.map(entry => entry.date);
    const datasets = [
        { label: 'Shoulders', data: appState.bodyMetricsHistory.map(e => e.shoulders || 0), borderColor: '#FF6384', fill: false },
        { label: 'Chest', data: appState.bodyMetricsHistory.map(e => e.chest || 0), borderColor: '#36A2EB', fill: false },
        { label: 'Waist', data: appState.bodyMetricsHistory.map(e => e.waist || 0), borderColor: '#FFCE56', fill: false },
        { label: 'Glutes', data: appState.bodyMetricsHistory.map(e => e.glutes || 0), borderColor: '#4BC0C0', fill: false },
        { label: 'Arms', data: appState.bodyMetricsHistory.map(e => e.arms || 0), borderColor: '#9966FF', fill: false },
        { label: 'Legs', data: appState.bodyMetricsHistory.map(e => e.legs || 0), borderColor: '#FF9F40', fill: false }
    ];

    if (window.bodyChart) {
        window.bodyChart.destroy();
    }

    window.bodyChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: { responsive: true, plugins: { legend: { position: 'top' } } }
    });
}

/* =========================================================
   PHOTO TIMELINE SLIDER
   ========================================================= */

function renderPhotoTimeline() {
    const container = document.getElementById('photoTimeline');
    container.innerHTML = '';
    appState.bodyPhotos.forEach((photo, idx) => {
        const imgEl = document.createElement('img');
        imgEl.src = photo.url;
        imgEl.alt = `Photo ${idx + 1}`;
        imgEl.classList.add('timeline-photo');
        container.appendChild(imgEl);
    });
}

/* =========================================================
   AUTOGENERATED WORKOUTS BASED ON FOCUS + EQUIPMENT
   ========================================================= */

function generateWorkout(focus, equipmentList) {
    const exercises = appState.exercises.filter(ex => {
        const matchesFocus = ex.focus.includes(focus);
        const availableEquipment = ex.equipment.every(eq => equipmentList.includes(eq));
        return matchesFocus && availableEquipment;
    });

    // Apply AI-style progressive overload: increase reps or weight if previously completed
    const workout = exercises.map(ex => {
        const lastSession = appState.history.filter(h => h.exerciseId === ex.id).pop();
        let weight = ex.defaultWeight;
        let reps = ex.defaultReps;

        if (lastSession) {
            weight += Math.round(weight * 0.05); // increase 5%
            reps = Math.min(reps + 1, ex.maxReps);
        }

        return { ...ex, weight, reps };
    });

    return workout;
}

/* =========================================================
   RENDER GENERATED WORKOUTS TO UI
   ========================================================= */

function renderGeneratedWorkout(workout, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    workout.forEach(ex => {
        const exDiv = document.createElement('div');
        exDiv.classList.add('workout-exercise');
        exDiv.innerHTML = `
            <h4>${ex.name}</h4>
            <p>Sets: ${ex.sets} | Reps: ${ex.reps} | Weight: ${ex.weight}kg</p>
            <p>Focus: ${ex.focus.join(', ')} | Equipment: ${ex.equipment.join(', ')}</p>
        `;
        container.appendChild(exDiv);
    });
}

/* =========================================================
   INIT GENERATED WORKOUT BASED ON USER SELECTION
   ========================================================= */

document.getElementById('generateWorkoutBtn').addEventListener('click', () => {
    const focus = document.getElementById('workoutFocus').value;
    const equipmentList = appState.userEquipment;
    const workout = generateWorkout(focus, equipmentList);
    renderGeneratedWorkout(workout, 'generatedWorkoutContainer');
});

/* =========================================================
   UPDATE DASHBOARD AND CHARTS WHEN BODY METRICS CHANGE
   ========================================================= */

function updateBodyMetrics(newMetrics) {
    const today = getToday();
    appState.bodyMetricsHistory.push({ date: today, ...newMetrics });
    appState.bodyMetrics = { ...newMetrics };
    renderDashboard();
    renderBodyMetricsChart();
    renderPhotoTimeline();
}

/* =========================================================
   PHOTO UPLOAD HANDLING
   ========================================================= */

document.getElementById('addPhotoBtn').addEventListener('change', e => {
    const files = e.target.files;
    for (const file of files) {
        const reader = new FileReader();
        reader.onload = () => {
            appState.bodyPhotos.push({ url: reader.result, date: getToday() });
            renderPhotoTimeline();
        };
        reader.readAsDataURL(file);
    }
});

/* =========================================================
   INIT BODY METRICS SECTION
   ========================================================= */

function initBodyMetricsSection() {
    renderBodyMetricsChart();
    renderPhotoTimeline();
}

/* =========================================================
   FINAL INIT
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    initBodyMetricsSection();
});/* =========================================================
   READINESS SCORE
   ========================================================= */

// Example calculation based on sleep, nutrition, previous workout fatigue
function calculateReadiness() {
    const sleepScore = appState.userSleepHours / 8; // normalized 0-1
    const nutritionScore = appState.todayCalories / appState.dailyCaloriesGoal; // normalized 0-1
    const fatigueScore = 1 - (appState.lastWorkoutFatigue / 10); // normalized 0-1
    const readiness = Math.round((sleepScore * 0.4 + nutritionScore * 0.3 + fatigueScore * 0.3) * 100);
    appState.readinessScore = readiness;
    renderReadiness();
}

function renderReadiness() {
    const container = document.getElementById('readinessScore');
    container.innerHTML = `<h3>Readiness: ${appState.readinessScore}%</h3>`;
}

/* =========================================================
   RELOAD / REFRESH SECTION
   ========================================================= */

document.getElementById('reloadAppBtn').addEventListener('click', () => {
    location.reload();
});

/* =========================================================
   EXERCISE SUBSTITUTION
   ========================================================= */

function substituteExercise(exercise) {
    const alternatives = appState.exercises.filter(ex => {
        if (ex.id === exercise.id) return false;
        const matchesFocus = ex.focus.some(f => exercise.focus.includes(f));
        const hasEquipment = ex.equipment.every(eq => appState.userEquipment.includes(eq));
        return matchesFocus && hasEquipment;
    });
    return alternatives.length ? alternatives[0] : exercise; // fallback to original if none found
}

/* =========================================================
   APPLY SUBSTITUTIONS BEFORE GENERATING WORKOUT
   ========================================================= */

function generateWorkoutWithSubstitution(focus, equipmentList) {
    let workout = generateWorkout(focus, equipmentList);
    workout = workout.map(ex => {
        const available = ex.equipment.every(eq => equipmentList.includes(eq));
        return available ? ex : substituteExercise(ex);
    });
    return workout;
}

/* =========================================================
   MOBILE-FIRST ONE-HAND THUMB NAVIGATION
   ========================================================= */

const navItems = document.querySelectorAll('.nav-item');
let activeNavItem = null;

function activateNavItem(itemId) {
    navItems.forEach(item => item.classList.remove('active'));
    const item = document.getElementById(itemId);
    if (item) item.classList.add('active');
    activeNavItem = itemId;
    showSection(itemId.replace('Nav', 'Section'));
}

function showSection(sectionId) {
    const sections = document.querySelectorAll('.app-section');
    sections.forEach(sec => sec.classList.add('hidden'));
    const section = document.getElementById(sectionId);
    if (section) section.classList.remove('hidden');
}

/* =========================================================
   SWIPE NAVIGATION
   ========================================================= */

let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipeGesture();
});

function handleSwipeGesture() {
    if (touchEndX < touchStartX - 50) { // swipe left
        goToNextSection();
    } else if (touchEndX > touchStartX + 50) { // swipe right
        goToPreviousSection();
    }
}

function goToNextSection() {
    const sectionIds = Array.from(document.querySelectorAll('.app-section')).map(s => s.id);
    let index = sectionIds.indexOf(activeNavItem.replace('Nav', 'Section'));
    index = (index + 1) % sectionIds.length;
    activateNavItem(sectionIds[index] + 'Nav');
}

function goToPreviousSection() {
    const sectionIds = Array.from(document.querySelectorAll('.app-section')).map(s => s.id);
    let index = sectionIds.indexOf(activeNavItem.replace('Nav', 'Section'));
    index = (index - 1 + sectionIds.length) % sectionIds.length;
    activateNavItem(sectionIds[index] + 'Nav');
}

/* =========================================================
   INIT MOBILE NAV
   ========================================================= */

function initMobileNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            activateNavItem(item.id);
        });
    });

    // Set first nav item as active by default
    if (navItems.length) activateNavItem(navItems[0].id);
}

/* =========================================================
   FINAL INITIALIZATION
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
    calculateReadiness();
    initMobileNavigation();

    // Initial workout generation for default focus
    const defaultFocus = document.getElementById('workoutFocus').value || 'Full Body';
    const defaultWorkout = generateWorkoutWithSubstitution(defaultFocus, appState.userEquipment);
    renderGeneratedWorkout(defaultWorkout, 'generatedWorkoutContainer');

    // Dashboard, body metrics, photos
    initDashboard();
    initBodyMetricsSection();
});
