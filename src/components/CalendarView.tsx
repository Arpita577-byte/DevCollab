import { useMemo } from "react";

type Task = { id: string; title: string; due_date: string | null; priority: string };

export function CalendarView({ tasks }: { tasks: Task[] }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDate = useMemo(() => {
    const m: Record<string, Task[]> = {};
    tasks.forEach(t => { if (t.due_date) { m[t.due_date] = m[t.due_date] || []; m[t.due_date].push(t); } });
    return m;
  }, [tasks]);

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthLabel = first.toLocaleString("en", { month: "long", year: "numeric" });

  return (
    <div>
      <h3 className="font-semibold mb-3">{monthLabel}</h3>
      <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground mb-1">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d} className="px-2 py-1 font-medium">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const iso = `${year}-${String(month + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const dayTasks = byDate[iso] ?? [];
          const isToday = d === today.getDate();
          return (
            <div key={i} className={`glass rounded-md p-2 min-h-[90px] ${isToday ? "ring-1 ring-primary" : ""}`}>
              <div className="text-xs font-medium mb-1">{d}</div>
              <div className="space-y-1">
                {dayTasks.slice(0, 3).map(t => (
                  <div key={t.id} className="text-[10px] truncate px-1.5 py-0.5 rounded bg-primary/15 text-foreground">{t.title}</div>
                ))}
                {dayTasks.length > 3 && <p className="text-[10px] text-muted-foreground">+{dayTasks.length - 3} more</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
