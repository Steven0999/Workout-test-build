const MEAL_ORDER = ["Breakfast", "Lunch", "Dinner", "Snack"];

const state = {
    foods: JSON.parse(localStorage.getItem("FOODS")) || []
};

function showView(view) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById(`view-${view}`).classList.remove("hidden");
}

function toggleMenu() {
    document.getElementById("side-menu").classList.toggle("hidden");
}

function navigate(view) {
    toggleMenu();
    showView(view);
}

function addFood() {
    const food = {
        id: Date.now(),
        name: food-name.value,
        cal: Number(food-cal.value),
        prot: Number(food-prot.value),
        carb: Number(food-carb.value),
        fat: Number(food-fat.value),
        meal: food-meal.value,
        date: new Date().toISOString().split("T")[0]
    };

    state.foods.push(food);
    localStorage.setItem("FOODS", JSON.stringify(state.foods));
    renderNutrition();
}

function renderNutrition() {
    const tbody = document.getElementById("nutrition-table");
    tbody.innerHTML = "";

    let cal = 0, prot = 0, carb = 0, fat = 0;

    MEAL_ORDER.forEach(meal => {
        state.foods.filter(f => f.meal === meal).forEach(f => {
            cal += f.cal;
            prot += f.prot;
            carb += f.carb;
            fat += f.fat;

            tbody.innerHTML += `
                <tr>
                    <td>${f.meal}</td>
                    <td>${f.name}</td>
                    <td>${f.cal}</td>
                    <td>${f.prot}</td>
                    <td>${f.carb}</td>
                    <td>${f.fat}</td>
                    <td><button onclick="removeFood(${f.id})">❌</button></td>
                </tr>
            `;
        });
    });

    total-cal.textContent = cal;
    total-prot.textContent = prot;

    macro-cal.textContent = cal;
    macro-prot.textContent = prot;
    macro-carb.textContent = carb;
    macro-fat.textContent = fat;

    updateDashboard();
    renderChart();
    renderWeekly();
}

function removeFood(id) {
    state.foods = state.foods.filter(f => f.id !== id);
    localStorage.setItem("FOODS", JSON.stringify(state.foods));
    renderNutrition();
}

let scanner;
function startScanner() {
    scanner = new Html5Qrcode("barcode-reader");
    scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 },
        code => alert("Scanned: " + code));
}

let nutritionChart;
function renderChart() {
    const ctx = document.getElementById("nutritionChart").getContext("2d");
    const daily = {};
    state.foods.forEach(f => daily[f.date] = (daily[f.date] || 0) + f.cal);

    if (nutritionChart) nutritionChart.destroy();
    nutritionChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: Object.keys(daily),
            datasets: [{ label: "Calories", data: Object.values(daily) }]
        }
    });
}

function renderWeekly() {
    const tbody = document.getElementById("weekly-table");
    tbody.innerHTML = "";
    const week = {};
    state.foods.forEach(f => {
        week[f.date] = week[f.date] || { cal: 0, prot: 0 };
        week[f.date].cal += f.cal;
        week[f.date].prot += f.prot;
    });

    Object.entries(week).forEach(([d, v]) => {
        tbody.innerHTML += `<tr><td>${d}</td><td>${v.cal}</td><td>${v.prot}</td></tr>`;
    });
}

function updateDashboard() {
    const today = new Date().toISOString().split("T")[0];
    let cal = 0, prot = 0, carb = 0, fat = 0;

    state.foods.filter(f => f.date === today).forEach(f => {
        cal += f.cal;
        prot += f.prot;
        carb += f.carb;
        fat += f.fat;
    });

    dash-cal.textContent = cal;
    dash-prot.textContent = prot;
    dash-carb.textContent = carb;
    dash-fat.textContent = fat;
}

document.addEventListener("DOMContentLoaded", () => {
    renderNutrition();
    showView("dashboard");
});
