"""Single source of truth for slots. Chat, the calendar and click-booking all use this."""
import json, os, random
from datetime import date, datetime, timedelta

DAYS_AHEAD = 21
POOL = ["10:00 AM", "11:00 AM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"]
FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "bookings.json")


def _load():
    try:
        with open(FILE) as f:
            return json.load(f)
    except Exception:
        return []


def _save(items):
    with open(FILE, "w") as f:
        json.dump(items, f)


def _short(d):
    return f"{d.strftime('%b')} {d.day}"          # "Sep 24"


def _passed(d, t):
    """True if this slot's start time is already in the past (server local time)."""
    return datetime.strptime(f"{d.isoformat()} {t}", "%Y-%m-%d %I:%M %p") <= datetime.now()


def get_all_slots():
    """Every slot for the next DAYS_AHEAD weekdays, with a booked flag."""
    taken = {(b["iso"], b["time"]) for b in _load()}
    out, d, sid = [], date.today(), 1
    for _ in range(DAYS_AHEAD):
        if d.weekday() < 5:                        # Mon-Fri only
            n = d.day % 3
            times = sorted({POOL[(n + i * 2) % len(POOL)] for i in range(3)}, key=POOL.index)
            for t in times:
                if _passed(d, t):
                    continue
                out.append({
                    "id": sid, "iso": d.isoformat(), "day": d.strftime("%A"),
                    "date": _short(d), "time": t, "booked": (d.isoformat(), t) in taken,
                })
                sid += 1
        d += timedelta(days=1)
    return out


def get_available_slots():
    return [s for s in get_all_slots() if not s["booked"]]


def book_slot(day, date_str, time):
    """Book by date label ("Sep 24") + time. Returns booking dict, or None if unavailable."""
    date_str, time = date_str.strip(), time.strip().upper()
    for s in get_available_slots():
        if s["date"].lower() == date_str.lower() and s["time"] == time:
            return _commit(s)
    return None


def book_slot_iso(iso, time):
    for s in get_available_slots():
        if s["iso"] == iso and s["time"] == time:
            return _commit(s)
    return None


def _commit(s):
    b = {"id": "AB-" + str(random.randint(10000, 99999)), "iso": s["iso"], "day": s["day"],
         "date": s["date"], "time": s["time"]}
    items = _load(); items.append(b); _save(items)
    return b