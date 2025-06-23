export function calcBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: "male" | "female"
) {
  // Mifflin–St Jeor
  const s = gender === "male" ? 5 : -161;
  return 10 * weightKg + 6.25 * heightCm - 5 * age + s;
}

// activityFactor e.g. 1.2 sedentary → 1.375 lightly active → 1.55 moderately active, etc.
export function calcTDEE(bmr: number, activityFactor: number) {
  return Math.round(bmr * activityFactor);
}
