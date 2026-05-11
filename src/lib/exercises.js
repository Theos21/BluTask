export const DEFAULT_EXERCISES = [
  // Chest
  { name: 'Bench Press',          muscle_group: 'Chest',     category: 'strength' },
  { name: 'Incline Bench Press',  muscle_group: 'Chest',     category: 'strength' },
  { name: 'Cable Fly',            muscle_group: 'Chest',     category: 'strength' },
  { name: 'Push-Up',              muscle_group: 'Chest',     category: 'strength' },
  { name: 'Dumbbell Fly',         muscle_group: 'Chest',     category: 'strength' },
  // Back
  { name: 'Pull-Up',              muscle_group: 'Back',      category: 'strength' },
  { name: 'Barbell Row',          muscle_group: 'Back',      category: 'strength' },
  { name: 'Lat Pulldown',         muscle_group: 'Back',      category: 'strength' },
  { name: 'Seated Cable Row',     muscle_group: 'Back',      category: 'strength' },
  { name: 'Deadlift',             muscle_group: 'Back',      category: 'strength' },
  { name: 'Face Pull',            muscle_group: 'Back',      category: 'strength' },
  // Shoulders
  { name: 'Overhead Press',       muscle_group: 'Shoulders', category: 'strength' },
  { name: 'Lateral Raise',        muscle_group: 'Shoulders', category: 'strength' },
  { name: 'Front Raise',          muscle_group: 'Shoulders', category: 'strength' },
  { name: 'Arnold Press',         muscle_group: 'Shoulders', category: 'strength' },
  { name: 'Rear Delt Fly',        muscle_group: 'Shoulders', category: 'strength' },
  // Arms
  { name: 'Bicep Curl',           muscle_group: 'Arms',      category: 'strength' },
  { name: 'Hammer Curl',          muscle_group: 'Arms',      category: 'strength' },
  { name: 'Tricep Pushdown',      muscle_group: 'Arms',      category: 'strength' },
  { name: 'Skull Crusher',        muscle_group: 'Arms',      category: 'strength' },
  { name: 'Preacher Curl',        muscle_group: 'Arms',      category: 'strength' },
  { name: 'Overhead Tricep Ext',  muscle_group: 'Arms',      category: 'strength' },
  // Legs
  { name: 'Squat',                muscle_group: 'Legs',      category: 'strength' },
  { name: 'Romanian Deadlift',    muscle_group: 'Legs',      category: 'strength' },
  { name: 'Leg Press',            muscle_group: 'Legs',      category: 'strength' },
  { name: 'Leg Extension',        muscle_group: 'Legs',      category: 'strength' },
  { name: 'Leg Curl',             muscle_group: 'Legs',      category: 'strength' },
  { name: 'Calf Raise',           muscle_group: 'Legs',      category: 'strength' },
  { name: 'Hip Thrust',           muscle_group: 'Legs',      category: 'strength' },
  { name: 'Walking Lunge',        muscle_group: 'Legs',      category: 'strength' },
  // Core
  { name: 'Plank',                muscle_group: 'Core',      category: 'strength' },
  { name: 'Crunch',               muscle_group: 'Core',      category: 'strength' },
  { name: 'Russian Twist',        muscle_group: 'Core',      category: 'strength' },
  { name: 'Leg Raise',            muscle_group: 'Core',      category: 'strength' },
  { name: 'Cable Crunch',         muscle_group: 'Core',      category: 'strength' },
  { name: 'Ab Wheel Rollout',     muscle_group: 'Core',      category: 'strength' },
  // Cardio
  { name: 'Treadmill Run',        muscle_group: 'Cardio',    category: 'cardio'   },
  { name: 'Rowing Machine',       muscle_group: 'Cardio',    category: 'cardio'   },
  { name: 'Stationary Bike',      muscle_group: 'Cardio',    category: 'cardio'   },
  { name: 'Jump Rope',            muscle_group: 'Cardio',    category: 'cardio'   },
  { name: 'Stair Climber',        muscle_group: 'Cardio',    category: 'cardio'   },
  { name: 'Elliptical',           muscle_group: 'Cardio',    category: 'cardio'   },
]

export const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio']

export const SPLIT_TYPES = [
  { value: 'push',      label: 'Push' },
  { value: 'pull',      label: 'Pull' },
  { value: 'legs',      label: 'Legs' },
  { value: 'upper',     label: 'Upper Body' },
  { value: 'lower',     label: 'Lower Body' },
  { value: 'full_body', label: 'Full Body' },
  { value: 'cardio',    label: 'Cardio' },
  { value: 'custom',    label: 'Custom' },
]
