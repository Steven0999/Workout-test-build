const MEAL_ORDER = ["Breakfast", "Lunch", "Dinner", "Snack"];

const state = {
    foods: JSON.parse(localStorage.getItem("FOODS")) || []
};

/* ---------- NAVIGATION ---------- */
function showView(view) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById(`view-${view}`).classList.remove("hidden");

    document.querySelectorAll("#side-menu button").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.view === view);
    });
}

function toggleMenu() {
    document.getElementById("side-menu").classList.toggle("open");
}

function navigate(view) {
    toggleMenu();
    showView(view);
}

/* ---------- DASHBOARD ---------- */
function updateDashboard() {
    const today = new Date().toISOString().split("T")[0];
    let cal = 0, prot = 0, carb = 0, fat = 0;

    state.foods.filter(f => f.date === today).forEach(f => {
        cal += f.cal;
        prot += f.prot;
        carb += f.carb || 0;
        fat += f.fat || 0;
    });

    dash-cal.textContent = cal;
    dash-prot.textContent = prot;
    dash-carb.textContent = carb;
    dash-fat.textContent = fat;

    const goals = JSON.parse(localStorage.getItem("MACRO_GOALS")) || {
        cal: 2500, prot: 180, carb: 300, fat: 70
    };

    dash-cal-rem.textContent = Math.max(goals.cal - cal, 0);
    dash-prot-rem.textContent = Math.max(goals.prot - prot, 0);
    dash-carb-rem.textContent = Math.max(goals.carb - carb, 0);
    dash-fat-rem.textContent = Math.max(goals.fat - fat, 0);
}

/* ---------- OFFLINE FIRST ---------- */
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(() => {});
    });
}

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("burger-btn").addEventListener("click", toggleMenu);
    showView("dashboard");
    updateDashboard();
});
