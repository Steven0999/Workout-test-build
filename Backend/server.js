const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();

// Use the port Render provides, or 3000 for local testing
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- INITIAL CHECK ---
// Ensures data.json exists with the correct structure 📂
if (!fs.existsSync('data.json')) {
    const initialData = { workouts: [], nutrition: [], metrics: [], archive: [] };
    fs.writeFileSync('data.json', JSON.stringify(initialData, null, 2));
}

// --- HELPER FUNCTION ---
// The "Brain" that reads, updates, and saves our file 🧠
function saveEntry(category, newEntry) {
    const rawData = fs.readFileSync('data.json');
    const database = JSON.parse(rawData);
    
    database[category].push(newEntry);
    
    fs.writeFileSync('data.json', JSON.stringify(database, null, 2));
}

// --- ROUTES ---

// 1. Workout Logs 💪
app.post('/api/workouts', (req, res) => {
    saveEntry('workouts', req.body);
    res.status(200).json({ message: "Workout saved!" });
});

// 2. Daily Nutrition Items 🍎
app.post('/api/nutrition', (req, res) => {
    saveEntry('nutrition', req.body);
    res.status(200).json({ message: "Food logged!" });
});

// 3. Body Metrics & Photos ⚖️
app.post('/api/metrics', (req, res) => {
    saveEntry('metrics', req.body);
    res.status(200).json({ message: "Metrics updated!" });
});

// 4. Daily Archives 📅
app.post('/api/archive', (req, res) => {
    saveEntry('archive', req.body);
    res.status(200).json({ message: "Day archived!" });
});

// 5. Global Sync (Backup) 🔄
app.post('/api/sync', (req, res) => {
    // This replaces the whole file with the current state
    fs.writeFileSync('data.json', JSON.stringify(req.body, null, 2));
    res.status(200).json({ message: "Full sync complete!" });
});

app.listen(PORT, () => {
    console.log(`Server is live at http://localhost:${PORT}`);
});
