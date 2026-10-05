import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";

// Sélecteurs natifs Android (boîtes de dialogue), à la place des
// <input type="datetime-local"> et <input type="time"> du web.

function openPicker(mode: "date" | "time", value: Date): Promise<Date | null> {
  return new Promise((resolve) => {
    DateTimePickerAndroid.open({
      value,
      mode,
      is24Hour: true,
      onChange: (event, date) => resolve(event.type === "set" && date ? date : null),
    });
  });
}

/** Date puis heure, enchaînées (Android n'a pas de sélecteur combiné). */
export async function pickDateTime(initial: Date): Promise<Date | null> {
  const day = await openPicker("date", initial);
  if (!day) return null;
  const time = await openPicker("time", day);
  return time;
}

/** Heure au format "HH:MM" (plages horaires des règles d'automatisation). */
export async function pickTime(hhmm: string): Promise<string | null> {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const initial = new Date();
  initial.setHours(hours || 0, minutes || 0, 0, 0);
  const picked = await openPicker("time", initial);
  if (!picked) return null;
  return `${String(picked.getHours()).padStart(2, "0")}:${String(picked.getMinutes()).padStart(2, "0")}`;
}
