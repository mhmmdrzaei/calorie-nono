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

  // Convert to metric for calculations
  const weightKg = weightLbs / 2.20462;
  const totalInches = heightFt * 12 + heightIn;
  const heightCm = totalInches * 2.54;

  // Calculate BMR & TDEE
  const bmr = calcBMR(weightKg, heightCm, age, gender);
  const tdee = calcTDEE(bmr, activity);

  // Food search & diary state
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<Food[]>([]);
  const [log, setLog] = useState<Food[]>([]);

  // History of daily totals
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lastLogDate, setLastLogDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // On mount: load stats, diary, history, and handle rollover
  useEffect(() => {
    // Load stats
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

    // Load history
    const storedHistory = localStorage.getItem("calorieHistory");
    const hist: HistoryEntry[] = storedHistory ? JSON.parse(storedHistory) : [];

    // Determine today's date
    const today = new Date().toISOString().slice(0, 10);
    const storedLast = localStorage.getItem("lastLogDate") || today;

    // Load diary
    const savedLog = localStorage.getItem("calorieLog");
    const diary: Food[] = savedLog ? JSON.parse(savedLog) : [];

    let newHistory = hist;
    if (storedLast !== today) {
      // Move yesterday's total into history
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
    localStorage.setItem("calorieStats", JSON.stringify({ weightLbs, heightFt, heightIn, age, gender, activity }));
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
      // Archive today's total
      const total = Math.round(log.reduce((sum, f) => sum + f.nf_calories, 0));
      const entry: HistoryEntry = { date: lastLogDate, total };
      const newHistory = [...history, entry];
      setHistory(newHistory);
      localStorage.setItem("calorieHistory", JSON.stringify(newHistory));
      // Clear diary
      setLog([]);
      localStorage.setItem("calorieLog", JSON.stringify([]));
      // Update lastLogDate
      const newDate = new Date().toISOString().slice(0, 10);
      setLastLogDate(newDate);
      localStorage.setItem("lastLogDate", newDate);
    }, msToMidnight);

    return () => clearTimeout(timer);
    
  }, [history, lastLogDate, log]);

  // Handle food search
  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const res = await axios.post(
      "https://trackapi.nutritionix.com/v2/natural/nutrients",
      { query },
      { headers: {
          "x-app-id": process.env.NX_APP_ID!,
          "x-app-key": process.env.NX_API_KEY!,
          "x-remote-user-id": "0",
          "Content-Type": "application/json",
        }}
    );
    setResults(res.data.foods);
  }

  function addToLog(item: Food) {
    setLog(prev => [...prev, item]);
  }

  const totalConsumed = Math.round(log.reduce((sum, f) => sum + f.nf_calories, 0));
  const remaining = tdee - totalConsumed;

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-center">Mohammads Mannorexia Tool</h1>

        {/* Stats Section */}
        <section className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">Your Stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col">
              <span className="font-medium">Weight (lbs)</span>
              <input type="number" value={weightLbs} onChange={e => setWeightLbs(+e.target.value)} className="mt-1 border rounded p-2" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col">
                <span className="font-medium">Height (ft)</span>
                <input type="number" value={heightFt} onChange={e => setHeightFt(+e.target.value)} className="mt-1 border rounded p-2" />
              </label>
              <label className="flex flex-col">
                <span className="font-medium">Height (in)</span>
                <input type="number" value={heightIn} onChange={e => setHeightIn(+e.target.value)} className="mt-1 border rounded p-2" />
              </label>
            </div>
            <label className="flex flex-col">
              <span className="font-medium">Age</span>
              <input type="number" value={age} onChange={e => setAge(+e.target.value)} className="mt-1 border rounded p-2" />
            </label>
            <label className="flex flex-col">
              <span className="font-medium">Gender</span>
              <select value={gender} onChange={e => setGender(e.target.value as "male"|"female")} className="mt-1 border rounded p-2">
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </label>
            <label className="col-span-1 md:col-span-2 flex flex-col">
              <span className="font-medium">Activity Level</span>
              <select value={activity} onChange={e => setActivity(+e.target.value)} className="mt-1 border rounded p-2">
                <option value={1.2}>Sedentary (1.2)</option>
                <option value={1.375}>Light (1.375)</option>
                <option value={1.55}>Moderate (1.55)</option>
                <option value={1.725}>Active (1.725)</option>
              </select>
            </label>
          </div>
          <p className="mt-4 text-lg">
            <span className="font-semibold">BMR:</span> {Math.round(bmr)} kcal/day
            <span className="ml-6 font-semibold">TDEE:</span> {tdee} kcal/day
          </p>
        </section>

        {/* Food Search Section */}
        <section className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">Search Foods</h2>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row sm:space-x-3 space-y-3 sm:space-y-0">
            <input className="flex-1 border rounded p-2" value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. 1 apple, 200g chicken" />
            <button type="submit" className="px-4 py-2 rounded-xl shadow bg-blue-600 text-white hover:bg-blue-700">Search</button>
          </form>
          <ul className="mt-4 space-y-3">
            {results.map((f, i) => (
              <li key={i} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 p-4 rounded-lg">
                <div className="font-medium mb-2 sm:mb-0">{f.food_name} ({f.serving_qty} {f.serving_unit})</div>
                <div className="flex items-center space-x-3">
                  <span className="font-semibold">{Math.round(f.nf_calories)} kcal</span>
                  <button onClick={() => addToLog(f)} className="px-3 py-1 rounded-lg shadow bg-green-500 text-white hover:bg-green-600">Add</button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Today's Diary */}
        <section className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">Todays Diary</h2>
          <ul className="list-disc pl-5 space-y-1">
            {log.map((f, i) => (
              <li key={i}>{f.food_name}: {Math.round(f.nf_calories)} kcal</li>
            ))}
          </ul>
          <p className="mt-4 text-lg">
            <span className="font-semibold">Total:</span> {totalConsumed} kcal
            <span className="ml-6 font-semibold">Remaining:</span> {remaining > 0 ? remaining : 0} kcal
          </p>
        </section>

        {/* History of Totals */}
        <section className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">History</h2>
          {history.length === 0 ? (
            <p className="text-gray-500">No history yet.</p>
          ) : (
            <ul className="list-disc pl-5 space-y-1">
              {history.map((h, i) => (<li key={i}>{h.date}: {h.total} kcal</li>))}
            </ul>
          )}
        </section>

      </div>
    </div>
  );
}
