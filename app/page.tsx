"use client";
import { useState, useEffect, FormEvent } from "react";
import axios from "axios";
import { calcBMR, calcTDEE } from "@/app/lib/calorie";

type Food = {
  food_name: string;
  nf_calories: number;
  serving_qty: number;
  serving_unit: string;
};

type HistoryEntry = { date: string; total: number };

export default function Home() {
  // --- User stats in imperial ---
  const [weightLbs, setWeightLbs] = useState<number>(154);
  const [heightFt, setHeightFt] = useState<number>(5);
  const [heightIn, setHeightIn] = useState<number>(9);
  const [age, setAge] = useState<number>(30);
  const [gender, setGender] = useState<"male" | "female">("male");
  const [activity, setActivity] = useState<number>(1.2);

  // Convert to metric for BMR/TDEE
  const weightKg = weightLbs / 2.20462;
  const totalInches = heightFt * 12 + heightIn;
  const heightCm = totalInches * 2.54;
  const bmr = calcBMR(weightKg, heightCm, age, gender);
  const tdee = calcTDEE(bmr, activity);

  // Food search and diary
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<Food[]>([]);
  const [portions, setPortions] = useState<Record<number, number>>({});
  const [log, setLog] = useState<Food[]>([]);

  // History and rollover
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lastLogDate, setLastLogDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // On mount: load from localStorage and handle date change
  useEffect(() => {
    const stats = localStorage.getItem("calorieStats");
    if (stats) {
      const s = JSON.parse(stats);
      setWeightLbs(s.weightLbs);
      setHeightFt(s.heightFt);
      setHeightIn(s.heightIn);
      setAge(s.age);
      setGender(s.gender);
      setActivity(s.activity);
    }
    const storedHistory = localStorage.getItem("calorieHistory");
    const hist: HistoryEntry[] = storedHistory ? JSON.parse(storedHistory) : [];
    const today = new Date().toISOString().slice(0, 10);
    const storedLast = localStorage.getItem("lastLogDate") || today;
    const savedLog = localStorage.getItem("calorieLog");
    const diary: Food[] = savedLog ? JSON.parse(savedLog) : [];
    let newHistory = hist;
    if (storedLast !== today) {
      const total = Math.round(diary.reduce((sum, f) => sum + f.nf_calories, 0));
      newHistory = [...hist, { date: storedLast, total }];
      localStorage.setItem("calorieHistory", JSON.stringify(newHistory));
      localStorage.setItem("calorieLog", JSON.stringify([]));
      setLog([]);
    } else {
      setLog(diary);
    }
    setHistory(newHistory);
    setLastLogDate(today);
    localStorage.setItem("lastLogDate", today);
  }, []);

  // Persist stats
  useEffect(() => {
    localStorage.setItem(
      "calorieStats",
      JSON.stringify({ weightLbs, heightFt, heightIn, age, gender, activity })
    );
  }, [weightLbs, heightFt, heightIn, age, gender, activity]);

  // Persist diary
  useEffect(() => {
    localStorage.setItem("calorieLog", JSON.stringify(log));
  }, [log]);

  // Midnight rollover timer
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const msToMidnight = tomorrow.getTime() - now.getTime();
    const timer = setTimeout(() => {
      const total = Math.round(log.reduce((sum, f) => sum + f.nf_calories, 0));
      const entry: HistoryEntry = { date: lastLogDate, total };
      const newHistory = [...history, entry];
      setHistory(newHistory);
      localStorage.setItem("calorieHistory", JSON.stringify(newHistory));
      setLog([]);
      localStorage.setItem("calorieLog", JSON.stringify([]));
      const newDate = new Date().toISOString().slice(0, 10);
      setLastLogDate(newDate);
      localStorage.setItem("lastLogDate", newDate);
    }, msToMidnight);
    return () => clearTimeout(timer);
  }, [history, lastLogDate, log]);

  // Search handler
  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const res = await axios.post("/api/nutrition", { query });
    setResults(res.data.foods);
    // Initialize portions
    const initial: Record<number, number> = {};
    res.data.foods.forEach((_: Food, i: number) => (initial[i] = 1));
    setPortions(initial);
  }

  // Add with portion
  function addToLog(item: Food, idx: number) {
    const multiplier = portions[idx] || 1;
    const calories = Math.round(item.nf_calories * multiplier);
    setLog(prev => [...prev, { ...item, nf_calories: calories }]);
  }

  // Remove entry
  function removeFromLog(idx: number) {
    setLog(prev => prev.filter((_, i) => i !== idx));
  }

  const totalConsumed = Math.round(log.reduce((sum, f) => sum + f.nf_calories, 0));
  const remaining = tdee - totalConsumed;

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold text-center mb-2">Mohammads mannorexia tool</h1>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Stats */}
        <section className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">Your Stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col">
              <span>Weight (lbs)</span>
              <input type="number" value={weightLbs} onChange={e => setWeightLbs(+e.target.value)} className="mt-1 border rounded p-2" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col">
                <span>Height (ft)</span>
                <input type="number" value={heightFt} onChange={e => setHeightFt(+e.target.value)} className="mt-1 border rounded p-2" />
              </label>
              <label className="flex flex-col">
                <span>Height (in)</span>
                <input type="number" value={heightIn} onChange={e => setHeightIn(+e.target.value)} className="mt-1 border rounded p-2" />
              </label>
            </div>
            <label className="flex flex-col">
              <span>Age</span>
              <input type="number" value={age} onChange={e => setAge(+e.target.value)} className="mt-1 border rounded p-2" />
            </label>
            <label className="flex flex-col">
              <span>Gender</span>
              <select value={gender} onChange={e => setGender(e.target.value as "male"|"female")} className="mt-1 border rounded p-2">
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </label>
            <label className="col-span-1 md:col-span-2 flex flex-col">
              <span>Activity Level</span>
              <select value={activity} onChange={e => setActivity(+e.target.value)} className="mt-1 border rounded p-2">
                <option value={1.2}>Sedentary</option>
                <option value={1.375}>Light</option>
                <option value={1.55}>Moderate</option>
                <option value={1.725}>Active</option>
              </select>
            </label>
          </div>
          <p className="mt-4 text-lg">
            <span className="font-semibold">BMR:</span> {Math.round(bmr)} kcal/day
            <span className="ml-6 font-semibold">TDEE:</span> {tdee} kcal/day
          </p>
        </section>

        {/* Food Search */}
        <section className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">Search Foods</h2>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row sm:space-x-3 space-y-3 sm:space-y-0">
            <input className="flex-1 border rounded p-2" value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. 1 apple" />
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl">Search</button>
          </form>
          <ul className="mt-4 space-y-3">
            {results.map((f, i) => (
              <li key={i} className="bg-gray-50 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div className="flex-1">
                  <div className="font-medium">{f.food_name} ({f.serving_qty} {f.serving_unit})</div>
                  <div className="mt-2">
                    <label className="mr-2">Portion:</label>
                    <select value={portions[i] ?? 1} onChange={e => setPortions(prev => ({ ...prev, [i]: +e.target.value }))} className="border rounded p-1">
                      <option value={1}>Full</option>
                      <option value={0.5}>½</option>
                      <option value={0.25}>¼</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3 sm:mt-0 flex items-center space-x-3">
                  <span className="font-semibold">{Math.round((f.nf_calories * (portions[i] ?? 1))) } kcal</span>
                  <button onClick={() => addToLog(f, i)} className="px-3 py-1 bg-green-500 text-white rounded-lg">Add</button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Todays Diary */}
        <section className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">Todays Diary</h2>
          <ul className="space-y-2">
            {log.map((f, i) => (
              <li key={i} className="flex justify-between items-center">
                <span>{f.food_name}: {f.nf_calories} kcal</span>
                <button onClick={() => removeFromLog(i)} className="text-red-500">Remove</button>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-lg">
            <span className="font-semibold">Total:</span> {totalConsumed} kcal
            <span className="ml-6 font-semibold">Remaining:</span> {remaining > 0 ? remaining : 0} kcal
          </p>
        </section>

        {/* History */}
        <section className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">History</h2>
          {history.length === 0 ? (
            <p className="text-gray-500">No history yet.</p>
          ) : (
            <ul className="space-y-1">
              {history.map((h, idx) => (
                <li key={idx}>{h.date}: {h.total} kcal</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
