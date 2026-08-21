// System-provided generic templates for diet and workout plans.
// Trainers pick one of these as a starting point for a client, then tweak
// it before saving — the client can keep editing it further after that,
// or switch to a different template later.

const WORKOUT_TEMPLATES = {
  weight_loss: {
    label: 'Weight loss',
    title: 'Weight loss — workout plan',
    notes: `Mon: Full-body circuit — Squat 3x15, Push-up 3x12, Row 3x12, 20 min incline walk
Tue: Cardio — 30 min steady-state (jog/cycle) + core (Plank 3x45s, Bicycle crunch 3x20)
Wed: Rest or light mobility/stretching
Thu: Full-body circuit — Lunge 3x12/leg, Bench press 3x12, Lat pulldown 3x12, 20 min incline walk
Fri: HIIT — 20 min intervals (30s hard / 90s easy) + core
Sat: Active recovery — 45 min brisk walk or swim
Sun: Rest`,
  },
  weight_gain: {
    label: 'Weight gain',
    title: 'Weight gain — workout plan',
    notes: `Mon: Push — Bench press 4x8, Overhead press 3x10, Incline DB press 3x10, Triceps pushdown 3x12
Tue: Pull — Deadlift 4x6, Barbell row 4x8, Lat pulldown 3x10, Biceps curl 3x12
Wed: Rest
Thu: Legs — Squat 4x8, Leg press 3x10, Romanian deadlift 3x10, Calf raise 4x15
Fri: Push — Overhead press 4x8, Incline bench 3x10, Dips 3x10, Lateral raise 3x15
Sat: Pull — Deadlift 3x5, Pull-up 4xAMRAP, Cable row 3x10, Face pull 3x15
Sun: Rest — prioritize sleep and meals`,
  },
  maintain: {
    label: 'Maintain weight',
    title: 'Maintenance — workout plan',
    notes: `Mon: Full-body strength — Squat 3x10, Bench press 3x10, Row 3x10
Tue: Cardio — 25 min moderate (jog/cycle/swim)
Wed: Full-body strength — Deadlift 3x8, Overhead press 3x10, Pull-up/assisted 3x8
Thu: Rest or yoga/mobility
Fri: Full-body strength — Lunge 3x12/leg, Incline press 3x10, Lat pulldown 3x10
Sat: Recreational activity — sport, hike, or long walk
Sun: Rest`,
  },
};

const DIET_TEMPLATES = {
  weight_loss: {
    label: 'Weight loss',
    title: 'Weight loss — diet plan',
    notes: `Target: moderate calorie deficit (~500 kcal/day below maintenance)
Breakfast: Oats + egg whites + fruit (~350 kcal)
Mid-morning: Handful of nuts or a protein shake (~150 kcal)
Lunch: Grilled chicken/paneer + salad + 1 cup brown rice (~500 kcal)
Evening: Green tea + roasted chana (~100 kcal)
Dinner: Grilled fish/tofu + sauteed vegetables (~400 kcal)
Water: 3+ litres/day. Limit sugar, fried food, and late-night snacking.`,
  },
  weight_gain: {
    label: 'Weight gain',
    title: 'Weight gain — diet plan',
    notes: `Target: calorie surplus (~300-500 kcal/day above maintenance)
Breakfast: Paratha/eggs + milk + banana (~600 kcal)
Mid-morning: Peanut butter sandwich + protein shake (~400 kcal)
Lunch: Rice/roti + dal + chicken/paneer + ghee (~700 kcal)
Evening: Dry fruits + milk (~300 kcal)
Dinner: Roti + curry + vegetables + curd (~600 kcal)
Before bed: Casein/paneer or a glass of milk (~200 kcal)
Water: 3+ litres/day. Prioritize protein at every meal.`,
  },
  maintain: {
    label: 'Maintain weight',
    title: 'Maintenance — diet plan',
    notes: `Target: calories roughly matching maintenance, balanced macros
Breakfast: Eggs/poha + fruit (~400 kcal)
Lunch: Roti/rice + dal + vegetable + salad (~500 kcal)
Evening snack: Fruit or roasted nuts (~150 kcal)
Dinner: Roti + vegetable + protein (paneer/chicken/tofu) (~450 kcal)
Water: 2.5-3 litres/day. Keep meals consistent and minimize processed food.`,
  },
};

const GOALS = ['weight_loss', 'weight_gain', 'maintain'];

module.exports = { WORKOUT_TEMPLATES, DIET_TEMPLATES, GOALS };
