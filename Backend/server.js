const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// This "Route" will listen for when you finish a workout
app.post('/api/workouts', (req, res) => {
    const workoutData = req.body;
    console.log("Received a workout:", workoutData);
    
    // For now, we just send back a success message
    res.status(200).json({ message: "Workout saved successfully!" });
});

// This "Route" will listen for food logs
app.post('/api/nutrition', (req, res) => {
    const foodData = req.body;
    console.log("Received food log:", foodData);
    res.status(200).json({ message: "Nutrition logged!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
