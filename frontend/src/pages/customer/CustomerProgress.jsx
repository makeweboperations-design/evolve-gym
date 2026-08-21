import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import Checklist from '../../components/ui/Checklist.jsx';
import '../../components/ui/checklist.css';
import './progress.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateKey(year, month, day) {
  // month is 1-12 here (calendar-natural), matches what the backend expects.
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function todayKey() {
  const now = new Date();
  return toDateKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

// Achievement gallery — computed entirely from data already loaded
// (records/goal/goalProgress), no extra backend calls needed. `unlocked`
// receives (records, goal, goalProgress) and returns a boolean.
const BADGE_DEFS = [
  {
    key: 'first-log', emoji: '🌱', label: 'First Log',
    description: 'Logged your first entry',
    unlocked: (r) => r.totalDaysLogged >= 1,
  },
  {
    key: 'streak-3', emoji: '🔥', label: '3-Day Streak',
    description: 'Logged 3 days in a row',
    unlocked: (r) => r.longestStreak >= 3,
  },
  {
    key: 'streak-7', emoji: '🔥', label: '7-Day Streak',
    description: 'Logged 7 days in a row',
    unlocked: (r) => r.longestStreak >= 7,
  },
  {
    key: 'streak-14', emoji: '🔥', label: '14-Day Streak',
    description: 'Logged 2 weeks in a row',
    unlocked: (r) => r.longestStreak >= 14,
  },
  {
    key: 'streak-30', emoji: '🔥', label: '30-Day Streak',
    description: 'Logged a full month in a row',
    unlocked: (r) => r.longestStreak >= 30,
  },
  {
    key: 'streak-100', emoji: '💯', label: '100-Day Streak',
    description: 'Logged 100 days in a row',
    unlocked: (r) => r.longestStreak >= 100,
  },
  {
    key: 'days-14', emoji: '📅', label: '2 Weeks Logged',
    description: 'Logged 14 days total (not necessarily in a row)',
    unlocked: (r) => r.totalDaysLogged >= 14,
  },
  {
    key: 'days-30', emoji: '📅', label: '30 Days Logged',
    description: 'Logged 30 days total',
    unlocked: (r) => r.totalDaysLogged >= 30,
  },
  {
    key: 'days-100', emoji: '📅', label: '100 Days Logged',
    description: 'Logged 100 days total',
    unlocked: (r) => r.totalDaysLogged >= 100,
  },
  {
    key: 'goal-set', emoji: '🎯', label: 'Goal Setter',
    description: 'Set a weight goal',
    unlocked: (r, g) => !!g,
  },
  {
    key: 'goal-reached', emoji: '🏆', label: 'Goal Crusher',
    description: 'Hit your target weight',
    unlocked: (r, g, gp) => !!gp && gp.percent >= 100,
  },
  {
    key: 'bmi-checked', emoji: '⚖️', label: 'Know Your Numbers',
    description: 'Calculated your BMI',
    unlocked: (r, g, gp, wh, wg, bmi) => !!bmi?.available,
  },
  {
    key: 'hydration-hero', emoji: '💧', label: 'Hydration Hero',
    description: 'Hit your water goal at least once',
    unlocked: (r, g, gp, waterHistory, waterGoal) =>
      !!waterGoal && waterHistory.some((h) => h.water_ml >= waterGoal.daily_goal_ml),
  },
  {
    key: 'hydration-streak-3', emoji: '💧', label: 'Hydration Streak',
    description: 'Hit your water goal 3 days in a row',
    unlocked: (r, g, gp, waterHistory, waterGoal) => {
      if (!waterGoal || waterHistory.length < 3) return false;
      const sorted = [...waterHistory].sort((a, b) => a.log_date.localeCompare(b.log_date));
      let run = 0;
      for (const h of sorted) {
        run = h.water_ml >= waterGoal.daily_goal_ml ? run + 1 : 0;
        if (run >= 3) return true;
      }
      return false;
    },
  },
  {
    key: 'measurements', emoji: '📏', label: 'Body Tracker',
    description: 'Logged a body measurement',
    unlocked: (r) => !!r.hasMeasurement,
  },
];

export default function CustomerProgress() {
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12

  const [logsByDate, setLogsByDate] = useState({});
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [weeklyLogs, setWeeklyLogs] = useState([]);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [view, setView] = useState('today'); // 'today' | 'week' | 'month' — keeps the dashboard from showing everything stacked at once
  const [mainTab, setMainTab] = useState('tracker'); // 'tracker' | 'achievements'

  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [form, setForm] = useState({
    weightKg: '', notes: '', photoUrl: '',
    dietNotes: '', dietChecklist: [],
    workoutNotes: '', workoutChecklist: [],
    waistCm: '', chestCm: '', armsCm: '', hipsCm: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const [membershipStatus, setMembershipStatus] = useState('checking'); // 'checking' | 'ok' | 'locked'

  const [goal, setGoal] = useState(null);
  const [goalLoaded, setGoalLoaded] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalForm, setGoalForm] = useState({ goalType: 'lose', targetWeightKg: '', targetDate: '' });
  const [goalSaving, setGoalSaving] = useState(false);
  const [goalError, setGoalError] = useState('');

  const [bmiData, setBmiData] = useState(null);
  const [editingHeight, setEditingHeight] = useState(false);
  const [heightInput, setHeightInput] = useState('');
  const [heightSaving, setHeightSaving] = useState(false);
  const [measurements, setMeasurements] = useState(null);
  const [records, setRecords] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [celebration, setCelebration] = useState(null); // { text } | null

  const [waterGoal, setWaterGoal] = useState(null);
  const [waterMl, setWaterMl] = useState(0);
  const [waterLoaded, setWaterLoaded] = useState(false);
  const [editingWaterGoal, setEditingWaterGoal] = useState(false);
  const [waterGoalInput, setWaterGoalInput] = useState('');
  const [waterCustomInput, setWaterCustomInput] = useState('');
  const [waterBusy, setWaterBusy] = useState(false);
  const [waterJustAdded, setWaterJustAdded] = useState(false);
  const [waterHistory, setWaterHistory] = useState([]);
  const [showWaterHistory, setShowWaterHistory] = useState(false);

  useEffect(() => {
    if (user?.is_active === false) {
      setMembershipStatus('locked');
      return;
    }
    api.get('/memberships/me')
      .then(({ data }) => {
        const ok = data && ['active', 'expiring_soon'].includes(data.computed_status);
        setMembershipStatus(ok ? 'ok' : 'locked');
      })
      .catch(() => setMembershipStatus('locked'));
  }, [user]);

  async function loadMonth() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/progress?year=${year}&month=${month}`);
      const map = {};
      data.logs.forEach((log) => {
        map[log.log_date.slice(0, 10)] = log;
      });
      setLogsByDate(map);
      setSummary(data.summary);
    } catch (err) {
      setError('Could not load your progress for this month.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  async function loadWeek() {
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 6); // last 7 days, today included
      const fmt = (d) => d.toISOString().slice(0, 10);
      const { data } = await api.get(`/progress/range?start=${fmt(start)}&end=${fmt(end)}`);
      setWeeklyLogs(data.logs);
      setWeeklySummary(data.summary);
    } catch (err) {
      // Weekly view is a nice-to-have alongside the month view — fail quietly.
    }
  }

  useEffect(() => {
    loadWeek();
  }, []);

  useEffect(() => {
    if (view === 'today') setSelectedDate(todayKey());
  }, [view]);

  // Whenever the selected day changes, populate the form from that day's
  // existing entry (or blank it out if there isn't one yet).
  useEffect(() => {
    const existing = logsByDate[selectedDate];
    setForm({
      weightKg: existing?.weight_kg ?? '',
      notes: existing?.notes ?? '',
      photoUrl: existing?.photo_url ?? '',
      dietNotes: existing?.diet_notes ?? '',
      dietChecklist: existing?.diet_checklist ?? [],
      workoutNotes: existing?.workout_notes ?? '',
      workoutChecklist: existing?.workout_checklist ?? [],
      waistCm: existing?.waist_cm ?? '',
      chestCm: existing?.chest_cm ?? '',
      armsCm: existing?.arms_cm ?? '',
      hipsCm: existing?.hips_cm ?? '',
    });
    setImageFile(null);
    setImagePreview('');
    setSaveMessage('');
    setSaveError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, logsByDate]);

  const calendarCells = useMemo(() => {
    const firstOfMonth = new Date(year, month - 1, 1);
    const startWeekday = firstOfMonth.getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month, 0).getDate();

    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [year, month]);

  const weightTrend = useMemo(() => {
    return Object.values(logsByDate)
      .filter((log) => log.weight_kg !== null && log.weight_kg !== undefined)
      .sort((a, b) => a.log_date.localeCompare(b.log_date))
      .map((log) => ({ day: log.log_date.slice(8, 10), weight: Number(log.weight_kg) }));
  }, [logsByDate]);

  const checklistCompletion = useMemo(() => {
    function tally(field) {
      let done = 0, pending = 0;
      Object.values(logsByDate).forEach((log) => {
        (log[field] || []).forEach((item) => (item.done ? done++ : pending++));
      });
      return [
        { name: 'Completed', value: done },
        { name: 'Pending', value: pending },
      ];
    }
    return {
      diet: tally('diet_checklist'),
      workout: tally('workout_checklist'),
    };
  }, [logsByDate]);

  const CHART_COLORS = ['#E60000', '#00A3E0'];

  const streak = useMemo(() => {
    const allLogged = new Set([
      ...Object.keys(logsByDate),
      ...weeklyLogs.map((l) => l.log_date.slice(0, 10)),
    ]);
    let count = 0;
    const cursor = new Date();
    // Walk backward from today; stop at the first day with no entry.
    // (Simple by design — checks up to 60 days back, which comfortably
    // covers any real streak without needing a dedicated backend query.)
    for (let i = 0; i < 60; i++) {
      const key = toDateKey(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
      if (allLogged.has(key)) {
        count++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  }, [logsByDate, weeklyLogs]);

  const todaysEntry = useMemo(() => {
    return logsByDate[todayKey()] || weeklyLogs.find((l) => l.log_date.slice(0, 10) === todayKey()) || null;
  }, [logsByDate, weeklyLogs]);

  const yesterdaysEntry = useMemo(() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const key = toDateKey(y.getFullYear(), y.getMonth() + 1, y.getDate());
    return logsByDate[key] || weeklyLogs.find((l) => l.log_date.slice(0, 10) === key) || null;
  }, [logsByDate, weeklyLogs]);

  function checklistPercent(entry, field) {
    const items = entry?.[field] || [];
    if (items.length === 0) return null;
    const done = items.filter((i) => i.done).length;
    return Math.round((done / items.length) * 100);
  }

  const todayWeightDelta = useMemo(() => {
    if (!todaysEntry?.weight_kg || !yesterdaysEntry?.weight_kg) return null;
    return Number((Number(todaysEntry.weight_kg) - Number(yesterdaysEntry.weight_kg)).toFixed(1));
  }, [todaysEntry, yesterdaysEntry]);

  async function loadGoal() {
    try {
      const { data } = await api.get('/progress/goal');
      setGoal(data);
    } catch (err) {
      // No goal set yet is a normal state, not an error worth surfacing.
    } finally {
      setGoalLoaded(true);
    }
  }

  useEffect(() => {
    if (membershipStatus === 'ok') {
      loadGoal();
      loadBmi();
      loadRecords();
      loadHeatmap();
      loadWater();
      loadMeasurements();
    }
  }, [membershipStatus]);

  // The water card tracks whichever date is selected in the calendar
  // (same as the rest of the day-detail form) — refetch it when that
  // changes so it doesn't keep showing a stale/wrong day's total.
  useEffect(() => {
    if (membershipStatus === 'ok') loadWater();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  async function loadHeatmap() {
    try {
      const { data } = await api.get('/progress/heatmap', { params: { weeks: 12 } });
      setHeatmap(data);
    } catch (err) {
      // Non-critical — heatmap just won't render this load.
    }
  }

  async function loadWater() {
    try {
      const [{ data: goal }, { data: dayLog }] = await Promise.all([
        api.get('/progress/water-goal'),
        api.get(`/progress/${selectedDate}`),
      ]);
      setWaterGoal(goal);
      setWaterMl(dayLog?.water_ml || 0);
    } catch (err) {
      // Non-critical
    } finally {
      setWaterLoaded(true);
    }
    loadWaterHistory();
  }

  async function loadWaterHistory() {
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 13);
      const toStr = (d) => d.toISOString().slice(0, 10);
      const { data } = await api.get('/progress/range', { params: { start: toStr(start), end: toStr(end) } });
      setWaterHistory((data.logs || []).filter((l) => l.water_ml !== null && l.water_ml !== undefined));
    } catch (err) {
      // Non-critical
    }
  }

  async function handleAddWater(amountMl) {
    const newTotal = Math.max(0, waterMl + amountMl);
    setWaterBusy(true);
    try {
      const { data: saved } = await api.post('/progress', { date: selectedDate, waterMl: newTotal });
      setWaterMl(newTotal);
      if (saved?.achievements?.waterGoalReached) {
        setCelebration({ text: '💧 Daily water goal reached — great hydration!' });
        setWaterJustAdded(true);
        setTimeout(() => setWaterJustAdded(false), 1200);
      }
      loadHeatmap();
      loadWaterHistory();
    } catch (err) {
      // keep it low-key — a failed quick-add isn't worth a scary error banner
    } finally {
      setWaterBusy(false);
    }
  }

  function startEditWaterGoal() {
    setWaterGoalInput(String(waterGoal?.daily_goal_ml || 2500));
    setEditingWaterGoal(true);
  }

  async function handleSaveWaterGoal(e) {
    e.preventDefault();
    const ml = Number(waterGoalInput);
    if (!ml || ml <= 0) return;
    setWaterBusy(true);
    try {
      const { data } = await api.put('/progress/water-goal', { dailyGoalMl: ml });
      setWaterGoal(data);
      setEditingWaterGoal(false);
    } catch (err) {
      // form stays open on failure so they can retry
    } finally {
      setWaterBusy(false);
    }
  }

  async function loadBmi() {
    try {
      const { data } = await api.get('/progress/bmi');
      setBmiData(data);
    } catch (err) {
      // Non-critical — just leave the BMI card in its "not available yet" state.
    }
  }

  function startEditHeight() {
    setHeightInput(bmiData?.heightCm ? String(bmiData.heightCm) : '');
    setEditingHeight(true);
  }

  async function handleSaveHeight(e) {
    e.preventDefault();
    const cm = Number(heightInput);
    if (!cm || cm <= 0) return;
    setHeightSaving(true);
    try {
      await api.put('/progress/height', { heightCm: cm });
      await loadBmi();
      setEditingHeight(false);
    } catch (err) {
      // form stays open on failure so they can retry
    } finally {
      setHeightSaving(false);
    }
  }

  async function loadMeasurements() {
    try {
      const { data } = await api.get('/progress/measurements');
      setMeasurements(data);
    } catch (err) {
      // Non-critical
    }
  }

  async function loadRecords() {
    try {
      const { data } = await api.get('/progress/records');
      setRecords(data);
    } catch (err) {
      // Non-critical — records card just won't populate this load.
    }
  }

  function startEditGoal() {
    setGoalForm({
      goalType: goal?.goal_type || 'lose',
      targetWeightKg: goal?.target_weight_kg ?? '',
      targetDate: goal?.target_date ? goal.target_date.slice(0, 10) : '',
    });
    setGoalError('');
    setEditingGoal(true);
  }

  async function handleSaveGoal(e) {
    e.preventDefault();
    if (!goalForm.targetWeightKg) {
      setGoalError('Enter a target weight to track progress toward.');
      return;
    }
    setGoalSaving(true);
    setGoalError('');
    try {
      const startingWeightKg = goal?.starting_weight_kg ?? latestWeight ?? Number(goalForm.targetWeightKg);
      const { data } = await api.put('/progress/goal', {
        goalType: goalForm.goalType,
        targetWeightKg: Number(goalForm.targetWeightKg),
        targetDate: goalForm.targetDate || undefined,
        startingWeightKg,
      });
      setGoal(data);
      setEditingGoal(false);
    } catch (err) {
      setGoalError('Could not save your goal — please try again.');
    } finally {
      setGoalSaving(false);
    }
  }

  async function handleClearGoal() {
    if (!window.confirm('Clear your current goal?')) return;
    try {
      await api.delete('/progress/goal');
      setGoal(null);
      setEditingGoal(false);
    } catch (err) {
      setGoalError('Could not clear your goal.');
    }
  }

  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => setCelebration(null), 6000);
    return () => clearTimeout(timer);
  }, [celebration]);

  function scrollToForm() {
    document.getElementById('progress-log-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const latestWeight = useMemo(() => {
    const all = [...Object.values(logsByDate), ...weeklyLogs]
      .filter((l) => l.weight_kg !== null && l.weight_kg !== undefined)
      .sort((a, b) => b.log_date.localeCompare(a.log_date));
    return all[0] ? Number(all[0].weight_kg) : null;
  }, [logsByDate, weeklyLogs]);

  const goalProgress = useMemo(() => {
    if (!goal || !goal.target_weight_kg || !goal.starting_weight_kg || latestWeight === null) return null;
    const start = Number(goal.starting_weight_kg);
    const target = Number(goal.target_weight_kg);
    const current = latestWeight;

    if (goal.goal_type === 'maintain') {
      const band = Math.max(Math.abs(start - target), 1);
      const distance = Math.abs(current - target);
      const percent = Math.max(0, Math.min(100, Math.round((1 - distance / band) * 100)));
      return { percent, remaining: Number((current - target).toFixed(1)), onTrack: distance <= band * 0.15 };
    }

    const totalDelta = target - start; // negative for "lose", positive for "gain"
    if (totalDelta === 0) return { percent: 100, remaining: 0, onTrack: true };
    const doneDelta = current - start;
    const rawPercent = (doneDelta / totalDelta) * 100;
    const percent = Math.max(0, Math.min(100, Math.round(rawPercent)));
    const remaining = Number((target - current).toFixed(1));
    return { percent, remaining, onTrack: rawPercent >= 0 };
  }, [goal, latestWeight]);

  function motivationalMessage() {
    if (streak === 0) {
      return todaysEntry
        ? "Nice, you're logged for today — come back tomorrow to start a streak."
        : "You haven't logged today yet — it only takes a minute, and it's the single best thing you can do for your goal right now.";
    }
    if (streak < 3) return `${streak}-day streak — you're just getting started, keep it up!`;
    if (streak < 7) return `${streak}-day streak going — a full week is right around the corner.`;
    if (streak < 30) return `${streak}-day streak — this is becoming a real habit. Great work.`;
    return `${streak}-day streak — that's serious consistency. Outstanding.`;
  }

  const paceInsight = useMemo(() => {
    if (weightTrend.length < 2) return null;
    const first = weightTrend[0];
    const last = weightTrend[weightTrend.length - 1];
    const daySpan = Number(last.day) - Number(first.day);
    if (daySpan <= 0) return null;

    const totalChange = last.weight - first.weight;
    const perWeek = Number(((totalChange / daySpan) * 7).toFixed(2));
    if (perWeek === 0) return { perWeek, weeksToGoal: null };

    let weeksToGoal = null;
    if (goal?.target_weight_kg) {
      const remaining = Number(goal.target_weight_kg) - last.weight;
      // Only project if the current pace is actually moving toward the target.
      if ((remaining > 0 && perWeek > 0) || (remaining < 0 && perWeek < 0)) {
        weeksToGoal = Math.ceil(Math.abs(remaining / perWeek));
      }
    }
    return { perWeek, weeksToGoal };
  }, [weightTrend, goal]);

  const heatmapWeeks = useMemo(() => {
    if (!heatmap) return [];
    const levelByDate = new Map(heatmap.days.map((d) => [d.date, d.level]));
    const start = new Date(heatmap.startDate + 'T00:00:00');
    // Align the grid to start on a Sunday so weeks stack into clean columns.
    const startDay = start.getDay();
    start.setDate(start.getDate() - startDay);

    const todayStr = todayKey();
    const weeks = [];
    let cursor = new Date(start);
    for (let w = 0; w < heatmap.weeks + 1; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const key = toDateKey(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
        week.push({
          key,
          level: levelByDate.get(key) || 0,
          isToday: key === todayStr,
          inRange: key >= heatmap.startDate && key <= heatmap.endDate,
          monthLabel: cursor.getDate() <= 7 ? cursor.toLocaleDateString(undefined, { month: 'short' }) : null,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  }, [heatmap]);

  const LEVEL_LABELS = ['No entry', 'Checked in', 'Lightly logged', 'Well logged', 'Fully logged'];

  function handleHeatmapCellClick(day) {
    if (!day.inRange) return;
    const [y, m, d] = day.key.split('-').map(Number);
    setYear(y);
    setMonth(m);
    setSelectedDate(day.key);
    setView('month');
    setTimeout(() => document.getElementById('progress-log-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }

  const dailyScore = useMemo(() => {
    if (!todaysEntry) return { percent: 0, parts: [] };
    const parts = [
      { label: 'Weight logged', done: todaysEntry.weight_kg !== null && todaysEntry.weight_kg !== undefined },
      { label: 'Diet checklist', done: (todaysEntry.diet_checklist || []).length > 0 && (todaysEntry.diet_checklist || []).every((i) => i.done) },
      { label: 'Workout checklist', done: (todaysEntry.workout_checklist || []).length > 0 && (todaysEntry.workout_checklist || []).every((i) => i.done) },
      { label: 'Water goal', done: !!waterGoal && waterMl >= waterGoal.daily_goal_ml },
    ];
    const doneCount = parts.filter((p) => p.done).length;
    return { percent: Math.round((doneCount / parts.length) * 100), parts };
  }, [todaysEntry, waterGoal, waterMl]);

  function goToPrevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); } else { setMonth((m) => m - 1); }
  }
  function goToNextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); } else { setMonth((m) => m + 1); }
  }

  function handleImagePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setSaveError('Please choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSaveError('That image is larger than 5MB.');
      return;
    }
    setSaveError('');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaveMessage('');
    try {
      let photoUrl = form.photoUrl || undefined;
      if (imageFile) {
        const body = new FormData();
        body.append('image', imageFile);
        const { data } = await api.post('/community/upload-image', body);
        photoUrl = data.url;
      }

      const { data: saved } = await api.post('/progress', {
        date: selectedDate,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        notes: form.notes || undefined,
        photoUrl,
        dietNotes: form.dietNotes || undefined,
        dietChecklist: form.dietChecklist,
        workoutNotes: form.workoutNotes || undefined,
        workoutChecklist: form.workoutChecklist,
        waistCm: form.waistCm ? Number(form.waistCm) : undefined,
        chestCm: form.chestCm ? Number(form.chestCm) : undefined,
        armsCm: form.armsCm ? Number(form.armsCm) : undefined,
        hipsCm: form.hipsCm ? Number(form.hipsCm) : undefined,
      });
      setSaveMessage('Saved!');
      await loadMonth();
      await loadWeek();
      loadBmi();
      loadRecords();
      loadHeatmap();
      loadWater();
      loadMeasurements();

      const a = saved?.achievements;
      if (a?.streakMilestone) {
        setCelebration({ text: `🔥 ${a.streakMilestone}-day streak! That's real consistency.` });
      } else if (a?.newLowestWeight) {
        setCelebration({ text: `🏆 New lowest weight logged: ${a.newLowestWeight} kg!` });
      } else if (a?.newHighestWeight && goal?.goal_type === 'gain') {
        setCelebration({ text: `🏆 New highest weight logged: ${a.newHighestWeight} kg!` });
      }
    } catch (err) {
      setSaveError('Could not save this entry — please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!logsByDate[selectedDate]) return;
    if (!window.confirm('Delete this day\'s entry?')) return;
    try {
      await api.delete(`/progress/${selectedDate}`);
      await loadMonth();
      await loadWeek();
    } catch (err) {
      setSaveError('Could not delete this entry.');
    }
  }

  const selectedEntry = logsByDate[selectedDate];
  const selectedLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="progress-page">
      {celebration && (
        <div className="progress-celebration-toast" role="status">
          {celebration.text}
        </div>
      )}

      <div className="progress-header">
        <h2>Progress Tracker</h2>
        <p className="progress-sub">Log your weight and notes daily, and see your progress at a glance.</p>
      </div>

      {membershipStatus === 'checking' ? (
        <LoadingSpinner label="Checking your membership…" />
      ) : membershipStatus === 'locked' ? (
        <div className="dash-feature-locked">
          <strong>Progress tracker unavailable</strong>
          {user?.is_active === false
            ? "Your account isn't active yet. If you just signed up, an admin needs to approve your account first — otherwise please contact the gym front desk."
            : 'Renew your membership to use the progress tracker.'}
        </div>
      ) : (
        <>
      <div className="progress-streak">
        {streak > 0 ? '🔥' : '👋'} {motivationalMessage()}
      </div>

      <div className="progress-main-tabs">
        <button className={mainTab === 'tracker' ? 'active' : ''} onClick={() => setMainTab('tracker')}>Tracker</button>
        <button className={mainTab === 'achievements' ? 'active' : ''} onClick={() => setMainTab('achievements')}>
          Achievements
        </button>
      </div>

      {mainTab === 'achievements' ? (
        <div className="progress-badges-card">
          <h4>Achievements</h4>
          <p className="progress-goal-hint" style={{ marginBottom: 16 }}>
            Unlock these by using the tracker regularly — some are quick wins, others take real consistency.
          </p>
          <div className="progress-badges-grid">
            {BADGE_DEFS.map((badge) => {
              const unlocked = badge.unlocked(records, goal, goalProgress, waterHistory, waterGoal, bmiData);
              return (
                <div key={badge.key} className={`progress-badge ${unlocked ? 'unlocked' : 'locked'}`} title={badge.description}>
                  <span className="progress-badge-emoji">{unlocked ? badge.emoji : '🔒'}</span>
                  <span className="progress-badge-label">{badge.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>

      {goalLoaded && (
        <div className="progress-goal-card">
          {!goal || editingGoal ? (
            <form className="progress-goal-form" onSubmit={handleSaveGoal}>
              <div className="progress-goal-form-head">
                <h3>{goal ? 'Update your goal' : 'Set a goal'}</h3>
                <p>Give yourself a target — it's the easiest way to know if today's choices are working.</p>
              </div>
              <div className="progress-goal-form-row">
                <label>
                  Goal
                  <select
                    value={goalForm.goalType}
                    onChange={(e) => setGoalForm((f) => ({ ...f, goalType: e.target.value }))}
                  >
                    <option value="lose">Lose weight</option>
                    <option value="gain">Gain weight</option>
                    <option value="maintain">Maintain weight</option>
                  </select>
                </label>
                <label>
                  Target weight (kg)
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={goalForm.targetWeightKg}
                    onChange={(e) => setGoalForm((f) => ({ ...f, targetWeightKg: e.target.value }))}
                    placeholder="e.g. 65"
                  />
                </label>
                <label>
                  Target date (optional)
                  <input
                    type="date"
                    value={goalForm.targetDate}
                    onChange={(e) => setGoalForm((f) => ({ ...f, targetDate: e.target.value }))}
                  />
                </label>
              </div>
              {latestWeight === null && (
                <p className="progress-goal-hint">
                  Log a weight entry first so we have a starting point to measure your progress from.
                </p>
              )}
              {goalError && <p className="progress-error">{goalError}</p>}
              <div className="progress-goal-form-actions">
                <button type="submit" className="progress-save-btn" disabled={goalSaving}>
                  {goalSaving ? 'Saving…' : 'Save goal'}
                </button>
                {goal && (
                  <button type="button" className="progress-delete-btn" onClick={() => setEditingGoal(false)}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          ) : (
            <div className="progress-goal-summary">
              <div className="progress-goal-summary-head">
                <h3>
                  {goal.goal_type === 'lose' && 'Weight loss goal'}
                  {goal.goal_type === 'gain' && 'Weight gain goal'}
                  {goal.goal_type === 'maintain' && 'Maintenance goal'}
                </h3>
                <div className="progress-goal-summary-actions">
                  <button type="button" onClick={startEditGoal}>Edit</button>
                  <button type="button" onClick={handleClearGoal}>Clear</button>
                </div>
              </div>

              {goalProgress ? (
                <>
                  <div className="progress-goal-bar-track">
                    <div
                      className={`progress-goal-bar-fill ${goalProgress.onTrack ? '' : 'off-track'}`}
                      style={{ width: `${goalProgress.percent}%` }}
                    />
                  </div>
                  <div className="progress-goal-stats">
                    <span><strong>{goalProgress.percent}%</strong> of the way there</span>
                    <span>
                      {goal.goal_type === 'maintain'
                        ? Math.abs(goalProgress.remaining) < 0.1
                          ? 'Right on target'
                          : `${Math.abs(goalProgress.remaining)} kg ${goalProgress.remaining > 0 ? 'above' : 'below'} target`
                        : goalProgress.remaining === 0
                          ? 'Target reached! 🎉'
                          : `${Math.abs(goalProgress.remaining)} kg to go`}
                    </span>
                    <span>Target: {goal.target_weight_kg} kg{goal.target_date ? ` by ${new Date(goal.target_date).toLocaleDateString()}` : ''}</span>
                  </div>
                </>
              ) : (
                <p className="progress-goal-hint">
                  Log a weight entry to start seeing your progress toward {goal.target_weight_kg} kg.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="progress-water-card">
        <div className="progress-water-visual">
          <div className={`water-bottle ${waterJustAdded ? 'just-added' : ''}`}>
            <div className="water-bottle-neck" />
            <div className="water-bottle-cap" />
            <div className="water-bottle-body">
              <div
                className="water-bottle-fill"
                style={{ height: `${waterGoal ? Math.min(100, (waterMl / waterGoal.daily_goal_ml) * 100) : 0}%` }}
              >
                <div className="water-bottle-wave" />
              </div>
            </div>
          </div>
        </div>

        <div className="progress-water-info">
          <h4>💧 Water intake — {selectedDate === todayKey() ? 'Today' : new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</h4>

          {!waterLoaded ? (
            <p className="progress-goal-hint">Loading…</p>
          ) : (
            <>
              <div className="progress-water-amount">
                <strong>{(waterMl / 1000).toFixed(2)} L</strong>
                <span> / {waterGoal ? (waterGoal.daily_goal_ml / 1000).toFixed(1) : '2.5'} L goal</span>
              </div>

              {waterGoal && (
                <div className="progress-water-percent">
                  {Math.min(100, Math.round((waterMl / waterGoal.daily_goal_ml) * 100))}% of today's goal
                  {waterMl >= waterGoal.daily_goal_ml && ' — reached! 🎉'}
                </div>
              )}

              <div className="progress-water-quickadd">
                <button type="button" onClick={() => handleAddWater(250)} disabled={waterBusy}>+250 ml</button>
                <button type="button" onClick={() => handleAddWater(500)} disabled={waterBusy}>+500 ml</button>
                <button type="button" onClick={() => handleAddWater(1000)} disabled={waterBusy}>+1 L</button>
                {waterMl > 0 && (
                  <button type="button" className="progress-water-undo" onClick={() => handleAddWater(-250)} disabled={waterBusy}>
                    −250 ml
                  </button>
                )}
              </div>

              <form
                className="progress-water-custom"
                onSubmit={(e) => {
                  e.preventDefault();
                  const amount = Number(waterCustomInput);
                  if (amount > 0) {
                    handleAddWater(amount);
                    setWaterCustomInput('');
                  }
                }}
              >
                <input
                  type="number"
                  min="1"
                  placeholder="Custom amount (ml)"
                  value={waterCustomInput}
                  onChange={(e) => setWaterCustomInput(e.target.value)}
                />
                <button type="submit" disabled={waterBusy || !waterCustomInput}>Add</button>
              </form>

              {editingWaterGoal ? (
                <form className="progress-water-goal-form" onSubmit={handleSaveWaterGoal}>
                  <label>
                    Daily goal (ml)
                    <input
                      type="number"
                      min="500"
                      step="100"
                      value={waterGoalInput}
                      onChange={(e) => setWaterGoalInput(e.target.value)}
                    />
                  </label>
                  <div className="progress-water-goal-form-actions">
                    <button type="submit" disabled={waterBusy}>Save</button>
                    <button type="button" onClick={() => setEditingWaterGoal(false)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <button type="button" className="progress-water-edit-goal" onClick={startEditWaterGoal}>
                  {waterGoal ? 'Edit daily goal' : 'Set a daily goal'}
                </button>
              )}
              {' · '}
              <button type="button" className="progress-water-edit-goal" onClick={() => setShowWaterHistory((v) => !v)}>
                {showWaterHistory ? 'Hide history' : 'View 14-day history'}
              </button>

              {showWaterHistory && (
                <div className="progress-water-history">
                  {waterHistory.length === 0 ? (
                    <p className="progress-goal-hint">No water logged in the last 14 days yet.</p>
                  ) : (
                    <div className="progress-water-history-bars">
                      {waterHistory.map((h) => {
                        const goalMl = waterGoal?.daily_goal_ml || 2500;
                        const pct = Math.min(100, Math.round((h.water_ml / goalMl) * 100));
                        return (
                          <div key={h.log_date} className="progress-water-history-bar-wrap" title={`${new Date(h.log_date).toLocaleDateString()}: ${h.water_ml} ml (${pct}%)`}>
                            <div className="progress-water-history-bar" style={{ height: `${Math.max(4, pct)}%` }} />
                            <span>{new Date(h.log_date).getDate()}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="progress-mini-cards">
        <div className="progress-mini-card">
          <h4>Current BMI</h4>
          {!bmiData ? (
            <p className="progress-goal-hint">Loading…</p>
          ) : editingHeight ? (
            <form className="progress-height-form" onSubmit={handleSaveHeight}>
              <label>
                Height (cm)
                <input
                  type="number" step="0.1" min="50" max="250"
                  value={heightInput}
                  onChange={(e) => setHeightInput(e.target.value)}
                  autoFocus
                />
              </label>
              <div className="progress-height-form-actions">
                <button type="submit" disabled={heightSaving}>{heightSaving ? 'Saving…' : 'Save'}</button>
                <button type="button" onClick={() => setEditingHeight(false)}>Cancel</button>
              </div>
            </form>
          ) : !bmiData.available ? (
            <>
              <p className="progress-goal-hint">
                {bmiData.heightCm
                  ? 'Log a weight entry to auto-calculate your BMI.'
                  : "Add your height to auto-calculate your BMI from your logged weight — no need for a separate calculator."}
              </p>
              <button type="button" className="progress-water-edit-goal" onClick={startEditHeight}>
                {bmiData.heightCm ? 'Edit height' : 'Add height'}
              </button>
            </>
          ) : (
            <>
              <div className="progress-mini-card-value">{bmiData.bmi}</div>
              <div className="progress-mini-card-sub">{bmiData.category}</div>
              <div className="progress-mini-card-footnote">
                Based on {bmiData.weightKg} kg · {bmiData.heightCm} cm
              </div>
              <button type="button" className="progress-water-edit-goal" onClick={startEditHeight}>
                Edit height
              </button>
            </>
          )}
        </div>

        <div className="progress-mini-card">
          <h4>Body measurements</h4>
          {!measurements ? (
            <p className="progress-goal-hint">No measurements logged yet — add waist, chest, arms, or hips in today's entry below.</p>
          ) : (
            <>
              <ul className="progress-records-list">
                {measurements.waist_cm !== null && <li><span>Waist</span><strong>{measurements.waist_cm} cm</strong></li>}
                {measurements.chest_cm !== null && <li><span>Chest</span><strong>{measurements.chest_cm} cm</strong></li>}
                {measurements.arms_cm !== null && <li><span>Arms</span><strong>{measurements.arms_cm} cm</strong></li>}
                {measurements.hips_cm !== null && <li><span>Hips</span><strong>{measurements.hips_cm} cm</strong></li>}
              </ul>
              <div className="progress-mini-card-footnote">
                As of {new Date(measurements.log_date).toLocaleDateString()}
              </div>
            </>
          )}
        </div>

        <div className="progress-mini-card">
          <h4>Personal records</h4>
          {!records ? (
            <p className="progress-goal-hint">Loading…</p>
          ) : records.totalDaysLogged === 0 ? (
            <p className="progress-goal-hint">Log your first entry to start building your records.</p>
          ) : (
            <ul className="progress-records-list">
              <li><span>Longest streak</span><strong>{records.longestStreak} day{records.longestStreak === 1 ? '' : 's'}</strong></li>
              <li><span>Total days logged</span><strong>{records.totalDaysLogged}</strong></li>
              {records.lowestWeight !== null && (
                <li><span>Lowest weight</span><strong>{records.lowestWeight} kg</strong></li>
              )}
              {records.highestWeight !== null && (
                <li><span>Highest weight</span><strong>{records.highestWeight} kg</strong></li>
              )}
            </ul>
          )}
        </div>
      </div>

      {heatmap && heatmapWeeks.length > 0 && (
        <div className="progress-heatmap-card">
          <h4>Consistency, last {heatmap.weeks} weeks</h4>
          <div className="progress-heatmap-scroll">
            <div className="progress-heatmap-months">
              {heatmapWeeks.map((week, wi) => (
                <span key={wi} className="progress-heatmap-month-label">
                  {week[0].monthLabel || ''}
                </span>
              ))}
            </div>
            <div className="progress-heatmap-body">
              <div className="progress-heatmap-daylabels">
                <span>Mon</span>
                <span>Wed</span>
                <span>Fri</span>
              </div>
              <div className="progress-heatmap-grid">
                {heatmapWeeks.map((week, wi) => (
                  <div className="progress-heatmap-col" key={wi}>
                    {week.map((day) => (
                      <button
                        key={day.key}
                        type="button"
                        disabled={!day.inRange}
                        onClick={() => handleHeatmapCellClick(day)}
                        className={`progress-heatmap-cell level-${day.level} ${day.isToday ? 'today' : ''} ${!day.inRange ? 'out-of-range' : ''}`}
                      >
                        {day.inRange && (
                          <span className="progress-heatmap-tooltip">
                            {new Date(day.key + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            {' — '}
                            {LEVEL_LABELS[day.level]}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="progress-heatmap-legend">
            <span>Less</span>
            <span className="progress-heatmap-cell level-0" />
            <span className="progress-heatmap-cell level-1" />
            <span className="progress-heatmap-cell level-2" />
            <span className="progress-heatmap-cell level-3" />
            <span className="progress-heatmap-cell level-4" />
            <span>More</span>
          </div>
        </div>
      )}

      <div className="progress-view-toggle">
        <button className={view === 'today' ? 'active' : ''} onClick={() => setView('today')}>Today</button>
        <button className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>This Week</button>
        <button className={view === 'month' ? 'active' : ''} onClick={() => setView('month')}>This Month</button>
      </div>

      {view === 'today' && (
        <div className="progress-week-card">
          <div className="progress-summary">
            <div className="progress-summary-stat">
              <span className="progress-summary-value">
                {todaysEntry?.weight_kg ?? '—'}
                {todaysEntry?.weight_kg ? ' kg' : ''}
              </span>
              <span className="progress-summary-label">Today's weight</span>
            </div>
            <div className="progress-summary-stat">
              <span className="progress-summary-value">
                {todayWeightDelta === null ? '—' : `${todayWeightDelta > 0 ? '+' : ''}${todayWeightDelta} kg`}
              </span>
              <span className="progress-summary-label">Vs. yesterday</span>
            </div>
            <div className="progress-summary-stat">
              <span className="progress-summary-value">
                {checklistPercent(todaysEntry, 'diet_checklist') ?? '—'}
                {checklistPercent(todaysEntry, 'diet_checklist') !== null ? '%' : ''}
              </span>
              <span className="progress-summary-label">🥗 Diet checklist</span>
            </div>
            <div className="progress-summary-stat">
              <span className="progress-summary-value">
                {checklistPercent(todaysEntry, 'workout_checklist') ?? '—'}
                {checklistPercent(todaysEntry, 'workout_checklist') !== null ? '%' : ''}
              </span>
              <span className="progress-summary-label">🏋️ Workout checklist</span>
            </div>
          </div>

          <div className="progress-daily-ring-wrap">
            <svg viewBox="0 0 100 100" className="progress-daily-ring">
              <circle cx="50" cy="50" r="42" className="progress-daily-ring-track" />
              <circle
                cx="50" cy="50" r="42"
                className="progress-daily-ring-fill"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - dailyScore.percent / 100)}`}
              />
              <text x="50" y="47" textAnchor="middle" className="progress-daily-ring-num">{dailyScore.percent}%</text>
              <text x="50" y="63" textAnchor="middle" className="progress-daily-ring-caption">today</text>
            </svg>
            <div className="progress-daily-ring-checklist">
              {dailyScore.parts.map((p) => (
                <span key={p.label} className={p.done ? 'done' : ''}>
                  {p.done ? '✓' : '○'} {p.label}
                </span>
              ))}
            </div>
          </div>

          {!todaysEntry ? (
            <>
              <p className="progress-empty-today">
                Nothing logged for today yet — fill in the form below to log your weight, diet, and workout.
              </p>
              <button type="button" className="progress-quicklog-btn" onClick={scrollToForm}>
                Log today's entry ↓
              </button>
            </>
          ) : (
            <>
              <p className="progress-empty-today">
                You've logged today already — you can update it any time before midnight.
              </p>
              <button type="button" className="progress-quicklog-btn" onClick={scrollToForm}>
                Update today's entry ↓
              </button>
            </>
          )}
        </div>
      )}

      {view === 'week' && weeklySummary && (
        <div className="progress-week-card">
          <div className="progress-summary">
            <div className="progress-summary-stat">
              <span className="progress-summary-value">{weeklySummary.daysLogged}</span>
              <span className="progress-summary-label">Days logged</span>
            </div>
            <div className="progress-summary-stat">
              <span className="progress-summary-value">
                {weeklySummary.weightChange === null ? '—' : `${weeklySummary.weightChange > 0 ? '+' : ''}${weeklySummary.weightChange} kg`}
              </span>
              <span className="progress-summary-label">Change this week</span>
            </div>
            <div className="progress-summary-stat">
              <span className="progress-summary-value">{weeklySummary.endWeight ?? '—'}</span>
              <span className="progress-summary-label">Latest weight (kg)</span>
            </div>
          </div>
          {weeklyLogs.filter((l) => l.weight_kg !== null).length > 1 && (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart
                data={weeklyLogs
                  .filter((l) => l.weight_kg !== null)
                  .map((l) => ({ day: l.log_date.slice(5, 10), weight: Number(l.weight_kg) }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e2dc" />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis fontSize={11} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip />
                <Line type="monotone" dataKey="weight" stroke="#4a7c1f" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {view === 'month' && (
        <>
          {summary && (
            <div className="progress-summary">
              <div className="progress-summary-stat">
                <span className="progress-summary-value">{summary.daysLogged}</span>
                <span className="progress-summary-label">Days logged</span>
              </div>
              <div className="progress-summary-stat">
                <span className="progress-summary-value">
                  {summary.weightChange === null ? '—' : `${summary.weightChange > 0 ? '+' : ''}${summary.weightChange} kg`}
                </span>
                <span className="progress-summary-label">Change this month</span>
              </div>
              <div className="progress-summary-stat">
                <span className="progress-summary-value">{summary.endWeight ?? '—'}</span>
                <span className="progress-summary-label">Latest weight (kg)</span>
              </div>
            </div>
          )}

          {weightTrend.length > 1 && (
            <div className="progress-chart-card">
              <h3>Weight trend this month</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={weightTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eeece7" />
                  <XAxis dataKey="day" fontSize={12} />
                  <YAxis fontSize={12} domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip />
                  <Line type="monotone" dataKey="weight" stroke="#4a7c1f" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
              {paceInsight && (
                <p className="progress-pace-insight">
                  {paceInsight.perWeek === 0
                    ? 'Your weight has held steady this month.'
                    : `Averaging ${paceInsight.perWeek > 0 ? '+' : ''}${paceInsight.perWeek} kg/week this month.`}
                  {paceInsight.weeksToGoal && (
                    <> At this pace, you'll reach your goal in about {paceInsight.weeksToGoal} week{paceInsight.weeksToGoal === 1 ? '' : 's'}.</>
                  )}
                </p>
              )}
            </div>
          )}

          {(checklistCompletion.diet.some((d) => d.value > 0) || checklistCompletion.workout.some((d) => d.value > 0)) && (
            <div className="progress-chart-row">
              <div className="progress-chart-card">
                <h3>🥗 Diet checklist completion</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={checklistCompletion.diet} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>
                      {checklistCompletion.diet.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="progress-chart-card">
                <h3>🏋️ Workout checklist completion</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={checklistCompletion.workout} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>
                      {checklistCompletion.workout.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      <div className="progress-calendar-nav">
        <button onClick={goToPrevMonth}>‹</button>
        <span>{MONTH_NAMES[month - 1]} {year}</span>
        <button onClick={goToNextMonth}>›</button>
      </div>

      {error && <p className="progress-error">{error}</p>}

      {loading ? (
        <LoadingSpinner label="Loading your progress…" />
      ) : (
        <>
          <div className="progress-calendar-grid">
            {WEEKDAYS.map((w) => (
              <div key={w} className="progress-weekday">{w}</div>
            ))}
            {calendarCells.map((day, i) => {
              if (day === null) return <div key={`blank-${i}`} className="progress-day empty" />;
              const key = toDateKey(year, month, day);
              const entry = logsByDate[key];
              const isSelected = key === selectedDate;
              const isToday = key === todayKey();
              return (
                <button
                  key={key}
                  className={`progress-day ${entry ? 'logged' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                  onClick={() => setSelectedDate(key)}
                >
                  <span className="progress-day-number">{day}</span>
                  {entry?.weight_kg && <span className="progress-day-weight">{entry.weight_kg}kg</span>}
                  {entry && !entry.weight_kg && <span className="progress-day-dot" />}
                </button>
              );
            })}
          </div>

          <div className="progress-detail" id="progress-log-form">
            <h3>{selectedLabel}</h3>
            <form className="progress-form" onSubmit={handleSave}>
              <div className="progress-field">
                <label>Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  value={form.weightKg}
                  onChange={(e) => setForm((f) => ({ ...f, weightKg: e.target.value }))}
                  placeholder="e.g. 68.5"
                />
              </div>

              <div className="progress-field">
                <label>Body measurements (cm) — optional</label>
                <div className="progress-measurements-grid">
                  <input
                    type="number" step="0.1" min="1" placeholder="Waist"
                    value={form.waistCm}
                    onChange={(e) => setForm((f) => ({ ...f, waistCm: e.target.value }))}
                  />
                  <input
                    type="number" step="0.1" min="1" placeholder="Chest"
                    value={form.chestCm}
                    onChange={(e) => setForm((f) => ({ ...f, chestCm: e.target.value }))}
                  />
                  <input
                    type="number" step="0.1" min="1" placeholder="Arms"
                    value={form.armsCm}
                    onChange={(e) => setForm((f) => ({ ...f, armsCm: e.target.value }))}
                  />
                  <input
                    type="number" step="0.1" min="1" placeholder="Hips"
                    value={form.hipsCm}
                    onChange={(e) => setForm((f) => ({ ...f, hipsCm: e.target.value }))}
                  />
                </div>
              </div>
              <div className="progress-field">
                <label>Notes</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="How did today's session go?"
                />
              </div>
              <div className="progress-field">
                <label>Progress photo</label>
                {(imagePreview || form.photoUrl) && (
                  <img className="progress-photo-preview" src={imagePreview || form.photoUrl} alt="" />
                )}
                <label className="progress-photo-btn">
                  {imagePreview || form.photoUrl ? 'Change photo' : 'Add a photo'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImagePick} hidden />
                </label>
              </div>

              <div className="progress-section-divider" />

              <div className="progress-field">
                <label>🥗 Diet notes</label>
                <textarea
                  rows={2}
                  value={form.dietNotes}
                  onChange={(e) => setForm((f) => ({ ...f, dietNotes: e.target.value }))}
                  placeholder="What did you eat today?"
                />
              </div>
              <div className="progress-field">
                <label>Diet checklist</label>
                <Checklist
                  items={form.dietChecklist}
                  onChange={(items) => setForm((f) => ({ ...f, dietChecklist: items }))}
                />
              </div>

              <div className="progress-section-divider" />

              <div className="progress-field">
                <label>🏋️ Workout notes</label>
                <textarea
                  rows={2}
                  value={form.workoutNotes}
                  onChange={(e) => setForm((f) => ({ ...f, workoutNotes: e.target.value }))}
                  placeholder="What did you train today?"
                />
              </div>
              <div className="progress-field">
                <label>Workout checklist</label>
                <Checklist
                  items={form.workoutChecklist}
                  onChange={(items) => setForm((f) => ({ ...f, workoutChecklist: items }))}
                />
              </div>

              {saveError && <p className="progress-error">{saveError}</p>}
              {saveMessage && <p className="progress-success">{saveMessage}</p>}

              <div className="progress-form-actions">
                <button type="submit" className="progress-save-btn" disabled={saving}>
                  {saving ? 'Saving…' : 'Save entry'}
                </button>
                {selectedEntry && (
                  <button type="button" className="progress-delete-btn" onClick={handleDelete}>
                    Delete entry
                  </button>
                )}
              </div>
            </form>
          </div>
        </>
      )}
        </>
      )}
        </>
      )}
    </div>
  );
}
