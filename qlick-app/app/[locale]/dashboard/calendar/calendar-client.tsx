"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  CalendarOff,
  UserPlus,
  Users,
  Phone,
  CheckCircle2,
  UserX,
  XCircle,
  Check,
  X,
  RotateCcw,
  Plus,
  Clock,
  CalendarClock,
  ArrowDown,
  AlertCircle,
  Info,
  Flag,
  HelpCircle,
  Pause,
  Play,
  ShieldCheck,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/format";
import { useDict } from "@/i18n/provider";
import { dashErr } from "@/lib/dash-error";
import {
  CustomerActionsModal,
  type CustomerRef,
} from "@/components/dashboard/customer-actions-modal";
import { zonedTimeToUtc } from "@/lib/availability";
import { updateBookingStatus } from "../bookings/actions";
import {
  createWalkin,
  moveBooking,
  resizeBooking,
  setBookingsPaused,
} from "./actions";
import { BookingEditModal } from "./booking-edit-modal";
import { DatePicker } from "./date-picker";
import { SelectMenu } from "@/components/ui/select-menu";
import {
  HOUR_HEIGHT,
  PX_PER_MIN,
  SNAP_MIN,
  TOP_PAD,
  addDaysStr,
  addMonthsStr,
  closedSegments,
  hourMarks,
  layoutColumn,
  localDateInZone,
  minLabel,
  minutesFromMidnight,
  type CalBooking,
  type CalStaff,
  type DayWindow,
  type OpenInterval,
} from "@/lib/calendar";

// Duration changes (dragging a booking's bottom edge) snap to 5-minute steps —
// finer than the 15-minute grid used for placing/moving bookings.
const RESIZE_SNAP_MIN = 5;
const MIN_DURATION_MIN = 15;
const STAFF_COL_WIDTH = 248;
const RAIL_WIDTH = 56;
const HEAD_HEIGHT = 56; // single header (day view)
const WEEK_DAY_HEAD = 30; // day band height (week)
const WEEK_SUB_HEAD = 46; // staff sub-header height (week)
const UNASSIGNED = "__unassigned__";

/** Week sub-column width scales with the staff member's name length. */
const subColWidth = (name: string) =>
  Math.max(122, Math.min(232, 38 + name.length * 11));
const UNASSIGNED_SUB_WIDTH = 118;

/** Translucent background + accent per resolved status. */
const STATUS_STYLE: Record<string, { bg: string; border: string }> = {
  completed: { bg: "rgba(16, 185, 129, 0.18)", border: "#10b981" },
  no_show: { bg: "rgba(245, 158, 11, 0.18)", border: "#f59e0b" },
  cancelled: { bg: "rgba(239, 68, 68, 0.18)", border: "#ef4444" },
};

export interface ServiceOpt {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  color: string | null;
}

interface ColumnDef {
  id: string; // data-colid & grouping key: `${date}|${staffId|UNASSIGNED}` (week) | staffId|UNASSIGNED (day)
  name: string;
  kind: "staff" | "unassigned";
  color: string | null;
  avatarUrl: string | null;
  dateStr: string; // date used for new bookings / now-line / grouping
  staffId: string | null; // null for the unassigned column
  isToday: boolean;
  width: number;
  open: OpenInterval[];
  isClosed: boolean;
}

interface WeekGroup {
  date: string;
  name: string;
  sub: string;
  isToday: boolean;
  width: number;
  cols: ColumnDef[];
}

interface Props {
  locale: string;
  ownerUserId: string;
  tz: string;
  bookingsPaused: boolean;
  view: "day" | "week" | "month";
  date: string; // anchor date YYYY-MM-DD
  today: string;
  days: string[]; // week days (or [date] for day view)
  dayMeta: Record<string, { open: OpenInterval[]; isClosed: boolean }>;
  staff: CalStaff[];
  bookings: CalBooking[];
  win: DayWindow;
  services: ServiceOpt[];
  staffServices: Record<string, string[]>;
  staffSchedule?: Record<string, { open: OpenInterval[]; isClosed: boolean }>;
  staffTimeOff?: Record<
    string,
    { startMin: number; endMin: number; reason: string | null }[]
  >;
}

export function CalendarClient({
  locale,
  ownerUserId,
  tz,
  bookingsPaused,
  view,
  date,
  today,
  days,
  dayMeta,
  staff,
  bookings,
  win,
  services,
  staffServices,
  staffSchedule = {},
  staffTimeOff = {},
}: Props) {
  const dd = useDict().dashboard;
  const t = dd.calendar;
  const base = `/${locale}/dashboard/calendar`;
  const isWeek = view === "week";
  const isMonth = view === "month";

  // View-switcher sliding indicator — set optimistically on click so the gold
  // pill glides instantly, before the (server) navigation resolves. Reset during
  // render (React's recommended pattern) once the real `view` prop catches up.
  const [pendingView, setPendingView] = useState<"week" | "month" | null>(null);
  const [seenView, setSeenView] = useState(view);
  if (view !== seenView) {
    setSeenView(view);
    setPendingView(null);
  }
  const indicatorMonth =
    (pendingView ?? (isMonth ? "month" : "week")) === "month";

  // Direction + optimistic label for the centre date's slide, so the new dates
  // appear instantly on click (not after the server navigation finishes). The
  // step counter keys the label so the animation replays on every click.
  const [navDir, setNavDir] = useState<"prev" | "next" | null>(null);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const [navStep, setNavStep] = useState(0);
  const [seenDate, setSeenDate] = useState(date);
  if (date !== seenDate) {
    setSeenDate(date);
    setPendingLabel(null);
  }
  const headHeight = isWeek ? WEEK_SUB_HEAD : HEAD_HEIGHT;
  const railHeadHeight = isWeek ? WEEK_DAY_HEAD + WEEK_SUB_HEAD : HEAD_HEIGHT;
  const gridHeight = (win.endMin - win.startMin) * PX_PER_MIN;
  const bodyHeight = gridHeight + TOP_PAD + 12;
  const marks = useMemo(() => hourMarks(win), [win]);

  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState<CalBooking[]>(bookings);
  useEffect(() => setRows(bookings), [bookings]);

  // Week-only staff filter.
  const [staffFilter, setStaffFilter] = useState<string>("all");

  // Help panel + temporary pause of online bookings.
  const [helpOpen, setHelpOpen] = useState(false);
  const [paused, setPaused] = useState(bookingsPaused);
  useEffect(() => setPaused(bookingsPaused), [bookingsPaused]);
  const [pausePending, startPauseTransition] = useTransition();
  const togglePause = () => {
    const next = !paused;
    setPaused(next); // optimistic
    startPauseTransition(async () => {
      const res = await setBookingsPaused(locale, next);
      if (!res.ok) {
        setPaused(!next); // revert on failure
        alert(dashErr(dd.errors, res.error, t.somethingWrong));
      }
    });
  };

  const staffColors = useMemo(() => {
    const m: Record<string, string | null> = {};
    for (const s of staff) m[s.id] = s.color;
    return m;
  }, [staff]);

  const intl = (d: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale === "el" ? "el-GR" : "en-GB", {
      ...opts,
      timeZone: "UTC",
    }).format(new Date(`${d}T12:00:00Z`));

  // Day view: one column per staff (+ unassigned).
  const columns = useMemo<ColumnDef[]>(() => {
    const cols: ColumnDef[] = staff.map((s) => ({
      id: s.id,
      name: s.name,
      kind: "staff" as const,
      color: s.color,
      avatarUrl: s.avatarUrl,
      dateStr: date,
      staffId: s.id,
      isToday: date === today,
      width: STAFF_COL_WIDTH,
      open: staffSchedule[`${date}|${s.id}`]?.open ?? win.open,
      isClosed: staffSchedule[`${date}|${s.id}`]?.isClosed ?? win.isClosed,
    }));
    cols.push({
      id: UNASSIGNED,
      name: t.unassigned,
      kind: "unassigned",
      color: "#6b7280",
      avatarUrl: null,
      dateStr: date,
      staffId: null,
      isToday: date === today,
      width: STAFF_COL_WIDTH,
      open: win.open,
      isClosed: win.isClosed,
    });
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff, win, date, today, staffSchedule]);

  // Week view: each day splits into per-staff sub-columns (+ unassigned).
  const weekGroups = useMemo<WeekGroup[]>(() => {
    if (!isWeek) return [];
    const subStaff = staff.filter(
      (s) => staffFilter === "all" || s.id === staffFilter,
    );
    return days.map((d) => {
      const dMeta = dayMeta[d] ?? { open: [], isClosed: true };
      const cols: ColumnDef[] = subStaff.map((s) => ({
        id: `${d}|${s.id}`,
        name: s.name,
        kind: "staff" as const,
        color: s.color,
        avatarUrl: s.avatarUrl,
        dateStr: d,
        staffId: s.id,
        isToday: d === today,
        width: subColWidth(s.name),
        open: staffSchedule[`${d}|${s.id}`]?.open ?? dMeta.open,
        isClosed: staffSchedule[`${d}|${s.id}`]?.isClosed ?? dMeta.isClosed,
      }));
      cols.push({
        id: `${d}|${UNASSIGNED}`,
        name: t.unassigned,
        kind: "unassigned",
        color: "#6b7280",
        avatarUrl: null,
        dateStr: d,
        staffId: null,
        isToday: d === today,
        width: UNASSIGNED_SUB_WIDTH,
        open: dMeta.open,
        isClosed: dMeta.isClosed,
      });
      return {
        date: d,
        name: intl(d, { weekday: "short" }),
        sub: intl(d, { day: "numeric", month: "short" }),
        isToday: d === today,
        width: cols.reduce((sum, c) => sum + c.width, 0),
        cols,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWeek, days, dayMeta, staff, staffFilter, staffSchedule, today, locale]);

  const bookingsByCol = useMemo(() => {
    const map = new Map<string, CalBooking[]>();
    for (const b of rows) {
      // When filtering to one staff, hide only OTHER staff (keep unassigned).
      if (isWeek && staffFilter !== "all" && b.staffId && b.staffId !== staffFilter)
        continue;
      const key = isWeek
        ? `${localDateInZone(b.startsAt, tz)}|${b.staffId ?? UNASSIGNED}`
        : (b.staffId ?? UNASSIGNED);
      const arr = map.get(key);
      if (arr) arr.push(b);
      else map.set(key, [b]);
    }
    return map;
  }, [rows, isWeek, staffFilter, tz]);

  // Month view: bookings grouped by local date.
  const monthByDay = useMemo(() => {
    const m = new Map<string, CalBooking[]>();
    if (!isMonth) return m;
    for (const b of rows) {
      const k = localDateInZone(b.startsAt, tz);
      const arr = m.get(k);
      if (arr) arr.push(b);
      else m.set(k, [b]);
    }
    for (const arr of m.values())
      arr.sort((x, y) => x.startsAt.localeCompare(y.startsAt));
    return m;
  }, [rows, isMonth, tz]);

  const isActiveStatus = (s: string) =>
    s === "pending" || s === "confirmed" || s === "completed";

  // Staff who can take an unassigned booking: can do the service AND are free
  // for its whole interval.
  const recommendedStaffFor = (b: CalBooking) => {
    if (b.staffId) return [];
    const bs = new Date(b.startsAt).getTime();
    const be = new Date(b.endsAt).getTime();
    return staff.filter((s) => {
      const capable = b.serviceId
        ? (staffServices[s.id] ?? []).includes(b.serviceId)
        : true;
      if (!capable) return false;
      return !rows.some(
        (o) =>
          o.id !== b.id &&
          o.staffId === s.id &&
          isActiveStatus(o.status) &&
          new Date(o.startsAt).getTime() < be &&
          new Date(o.endsAt).getTime() > bs,
      );
    });
  };

  // Day view: unassigned bookings shown as faint "available" ghosts in the
  // columns of staff who could take them.
  const unassignedRecs = useMemo(() => {
    if (isWeek || isMonth)
      return [] as {
        b: CalBooking;
        staffIds: string[];
        startMin: number;
        endMin: number;
      }[];
    return rows
      .filter((b) => !b.staffId && isActiveStatus(b.status))
      .map((b) => ({
        b,
        staffIds: recommendedStaffFor(b).map((s) => s.id),
        startMin: minutesFromMidnight(b.startsAt, tz),
        endMin: minutesFromMidnight(b.endsAt, tz),
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, staff, staffServices, isWeek, isMonth, tz]);

  // Drag & drop (day/week time-grid).
  const dragRef = useRef<{
    booking: CalBooking;
    durationMin: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  // Resize (bottom-edge drag).
  const resizeRef = useRef<{
    booking: CalBooking;
    startMin: number;
    origEndMin: number;
    body: HTMLElement;
  } | null>(null);
  const [resizeState, setResizeState] = useState<{
    id: string;
    endMin: number;
  } | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    x: number;
    y: number;
    label: string;
    booking: CalBooking;
    accent: string;
  } | null>(null);
  // Pending drag result awaiting confirmation.
  const [pendingMove, setPendingMove] = useState<{
    booking: CalBooking;
    startsAtIso: string;
    endsAtIso: string;
    newStaffId: string | null;
  } | null>(null);

  // Center-screen toast for action errors (drag rejections etc.).
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(id);
  }, [toast]);

  const staffName = (id: string | null) =>
    id ? (staff.find((s) => s.id === id)?.name ?? "—") : t.unassigned;

  const confirmMove = () => {
    const p = pendingMove;
    if (!p) return;
    setPendingMove(null);
    setRows((prev) =>
      prev.map((b) =>
        b.id === p.booking.id
          ? {
              ...b,
              startsAt: p.startsAtIso,
              endsAt: p.endsAtIso,
              staffId: p.newStaffId,
            }
          : b,
      ),
    );
    startTransition(async () => {
      const res = await moveBooking(locale, {
        bookingId: p.booking.id,
        startsAtIso: p.startsAtIso,
        staffId: p.newStaffId,
      });
      if (!res.ok) {
        setToast(dashErr(dd.errors, res.error, t.moveFailed));
        router.refresh();
      }
    });
  };

  // Booking action popover.
  const [active, setActive] = useState<{
    booking: CalBooking;
    x: number;
    y: number;
  } | null>(null);
  const [reportCustomer, setReportCustomer] = useState<CustomerRef | null>(null);
  // Tap-to-edit (mobile-friendly alternative to drag/resize): move or change duration.
  const [editTarget, setEditTarget] = useState<{
    booking: CalBooking;
    mode: "move" | "duration";
  } | null>(null);
  // Booking popover: measured top so it never overflows the viewport bottom
  // (bookings near the end of the shift would otherwise get clipped).
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverTop, setPopoverTop] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (!active) {
      setPopoverTop(null);
      return;
    }
    const el = popoverRef.current;
    if (!el) return;
    const h = el.offsetHeight;
    setPopoverTop(Math.max(12, Math.min(active.y, window.innerHeight - h - 12)));
  }, [active]);

  // New-booking form.
  const [newSlot, setNewSlot] = useState<{
    dateStr: string;
    startMin: number;
  } | null>(null);
  const [newForm, setNewForm] = useState({
    staffId: UNASSIGNED,
    serviceId: "",
    name: "",
    phone: "",
    notes: "",
    time: "09:00",
  });
  const [newErr, setNewErr] = useState<string | null>(null);

  // Manual bookings are the owner's call: the dialog always offers ALL active
  // services, regardless of staff_services assignments (those only constrain
  // what customers can book online).

  const changeStatus = (
    id: string,
    status: "completed" | "no_show" | "cancelled" | "confirmed",
  ) => {
    setActive(null);
    // Cancelled bookings leave the calendar entirely (they live in the
    // bookings list); other status changes just recolor the card in place.
    setRows((prev) =>
      status === "cancelled"
        ? prev.filter((b) => b.id !== id)
        : prev.map((b) => (b.id === id ? { ...b, status } : b)),
    );
    startTransition(async () => {
      const res = await updateBookingStatus(locale, id, status);
      if (!res.ok) {
        setToast(dashErr(dd.errors, res.error, t.somethingWrong));
        router.refresh();
      }
    });
  };

  // Assign an unassigned booking to a staff member (keeps the time).
  const assignTo = (b: CalBooking, staffId: string) => {
    setActive(null);
    setRows((prev) =>
      prev.map((x) => (x.id === b.id ? { ...x, staffId } : x)),
    );
    startTransition(async () => {
      const res = await moveBooking(locale, {
        bookingId: b.id,
        startsAtIso: b.startsAt,
        staffId,
      });
      if (!res.ok) {
        setToast(dashErr(dd.errors, res.error, t.assignFailed));
        router.refresh();
      }
    });
  };

  const openNew = (col: ColumnDef, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top - TOP_PAD;
    let m = win.startMin + y / PX_PER_MIN;
    m = Math.round(m / SNAP_MIN) * SNAP_MIN;
    m = Math.max(win.startMin, Math.min(m, win.endMin - SNAP_MIN));
    const defaultStaff = col.staffId ?? UNASSIGNED;
    setNewErr(null);
    setNewSlot({ dateStr: col.dateStr, startMin: m });
    setNewForm({
      staffId: defaultStaff,
      serviceId: services[0]?.id ?? "",
      name: "",
      phone: "",
      notes: "",
      time: minLabel(m),
    });
  };

  const submitNew = () => {
    if (!newSlot) return;
    setNewErr(null);
    const staffId = newForm.staffId === UNASSIGNED ? null : newForm.staffId;
    const svc = services.find((s) => s.id === newForm.serviceId);
    if (!svc) return setNewErr(t.pickService);
    const mt = /^(\d{1,2}):(\d{2})$/.exec(newForm.time.trim());
    if (!mt) return setNewErr(t.invalidTime);
    const [y, mo, d] = newSlot.dateStr.split("-").map(Number);
    const startsAtIso = zonedTimeToUtc(
      y,
      mo,
      d,
      Number(mt[1]),
      Number(mt[2]),
      tz,
    ).toISOString();
    startTransition(async () => {
      const res = await createWalkin(locale, {
        staffId,
        serviceId: svc.id,
        startsAtIso,
        customerName: newForm.name,
        customerPhone: newForm.phone,
        notes: newForm.notes,
      });
      if (!res.ok || !res.id) {
        setNewErr(dashErr(dd.errors, res.error, t.createFailed));
        return;
      }
      setRows((prev) => [
        ...prev,
        {
          id: res.id!,
          startsAt: startsAtIso,
          endsAt: res.endsAtIso!,
          staffId,
          status: "confirmed",
          serviceId: svc.id,
          serviceName: res.serviceName ?? svc.name,
          customerId: ownerUserId,
          customerName: newForm.name.trim() || null,
          customerPhone: res.customerPhone ?? null,
          customerNotes: newForm.notes.trim() || null,
          noStaffPreference: !staffId,
          color: res.color ?? svc.color ?? null,
        },
      ]);
      setNewSlot(null);
    });
  };

  // Live "now" indicator.
  const [nowMin, setNowMin] = useState<number | null>(null);
  useEffect(() => {
    const tick = () =>
      setNowMin(minutesFromMidnight(new Date().toISOString(), tz));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [tz]);

  // Drag & drop reschedule (pointer-based).
  useEffect(() => {
    if (isMonth) return;
    const target = (cx: number, cy: number, durationMin: number) => {
      const el = (
        document.elementFromPoint(cx, cy) as HTMLElement | null
      )?.closest<HTMLElement>("[data-colbody]");
      if (!el) return { colId: null as string | null, startMin: null as number | null };
      const rect = el.getBoundingClientRect();
      let m = win.startMin + (cy - rect.top - TOP_PAD) / PX_PER_MIN;
      m = Math.round(m / SNAP_MIN) * SNAP_MIN;
      m = Math.max(win.startMin, Math.min(m, win.endMin - durationMin));
      return { colId: el.getAttribute("data-colid"), startMin: m };
    };
    const onMove = (e: PointerEvent) => {
      const s = dragRef.current;
      if (!s) return;
      if (!s.moved && Math.hypot(e.clientX - s.startX, e.clientY - s.startY) < 5)
        return;
      s.moved = true;
      const t = target(e.clientX, e.clientY, s.durationMin);
      const accent =
        s.booking.color ??
        (s.booking.staffId ? staffColors[s.booking.staffId] : null) ??
        "#a0a3ab";
      setDragPreview({
        x: e.clientX,
        y: e.clientY,
        booking: s.booking,
        accent,
        label:
          t.startMin != null
            ? `${minLabel(t.startMin)}–${minLabel(t.startMin + s.durationMin)}`
            : "—",
      });
    };
    const onUp = (e: PointerEvent) => {
      const s = dragRef.current;
      if (!s) return;
      dragRef.current = null;
      setDragPreview(null);
      if (!s.moved) {
        // Plain click (no drag) → let the card's onClick open the popover.
        return;
      }
      suppressClickRef.current = true;
      const t = target(e.clientX, e.clientY, s.durationMin);
      if (!t.colId || t.startMin == null) return;
      let newDate = date;
      let newStaffId: string | null;
      if (isWeek) {
        const [d, sid] = t.colId.split("|");
        newDate = d;
        newStaffId = sid === UNASSIGNED ? null : sid;
      } else {
        newStaffId = t.colId === UNASSIGNED ? null : t.colId;
      }
      const [y, mo, d] = newDate.split("-").map(Number);
      const startsAtIso = zonedTimeToUtc(
        y,
        mo,
        d,
        Math.floor(t.startMin / 60),
        t.startMin % 60,
        tz,
      ).toISOString();
      if (startsAtIso === s.booking.startsAt && newStaffId === s.booking.staffId)
        return; // unchanged → no confirmation
      const endsAtIso = new Date(
        new Date(startsAtIso).getTime() + s.durationMin * 60_000,
      ).toISOString();
      // Ask for confirmation before committing (drops can be accidental).
      setPendingMove({
        booking: s.booking,
        startsAtIso,
        endsAtIso,
        newStaffId,
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.startMin, win.endMin, isWeek, isMonth, date, tz, locale, staffColors]);

  // Resize (drag the bottom edge to change duration).
  useEffect(() => {
    if (isMonth) return;
    const endMinAt = (cy: number, r: NonNullable<typeof resizeRef.current>) => {
      const rect = r.body.getBoundingClientRect();
      let m = win.startMin + (cy - rect.top - TOP_PAD) / PX_PER_MIN;
      m = Math.round(m / RESIZE_SNAP_MIN) * RESIZE_SNAP_MIN;
      return Math.max(r.startMin + MIN_DURATION_MIN, Math.min(m, win.endMin));
    };
    const onMove = (e: PointerEvent) => {
      const r = resizeRef.current;
      if (!r) return;
      setResizeState({ id: r.booking.id, endMin: endMinAt(e.clientY, r) });
    };
    const onUp = (e: PointerEvent) => {
      const r = resizeRef.current;
      if (!r) return;
      resizeRef.current = null;
      suppressClickRef.current = true;
      const m = endMinAt(e.clientY, r);
      setResizeState(null);
      if (m === r.origEndMin) return;
      const [y, mo, d] = localDateInZone(r.booking.startsAt, tz)
        .split("-")
        .map(Number);
      const endsAtIso = zonedTimeToUtc(
        y,
        mo,
        d,
        Math.floor(m / 60),
        m % 60,
        tz,
      ).toISOString();
      setRows((prev) =>
        prev.map((b) =>
          b.id === r.booking.id ? { ...b, endsAt: endsAtIso } : b,
        ),
      );
      startTransition(async () => {
        const res = await resizeBooking(locale, {
          bookingId: r.booking.id,
          endsAtIso,
        });
        if (!res.ok) {
          setToast(dashErr(dd.errors, res.error, t.resizeFailed));
          router.refresh();
        }
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.startMin, win.endMin, tz, locale, isMonth]);

  const dateLabel = intl(date, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const navLabel = isMonth
    ? intl(date, { month: "long", year: "numeric" })
    : isWeek
      ? `${intl(days[0], { day: "numeric", month: "short" })} – ${intl(
          days[days.length - 1],
          { day: "numeric", month: "short" },
        )}`
      : dateLabel;

  const dateDirClass =
    navDir === "next"
      ? "animate-date-next"
      : navDir === "prev"
        ? "animate-date-prev"
        : "";
  // The week-range / month label `dir` steps away — computed client-side so the
  // slide shows the new dates immediately, regardless of page-load latency.
  const stepLabel = (dir: number) =>
    isMonth
      ? intl(addMonthsStr(date, dir), { month: "long", year: "numeric" })
      : `${intl(addDaysStr(days[0], dir * 7), {
          day: "numeric",
          month: "short",
        })} – ${intl(addDaysStr(days[days.length - 1], dir * 7), {
          day: "numeric",
          month: "short",
        })}`;
  const shownLabel = pendingLabel ?? navLabel;

  const onToday = isMonth
    ? date.slice(0, 7) === today.slice(0, 7)
    : isWeek
      ? days.includes(today)
      : date === today;

  const viewSuffix = isWeek ? "&view=week" : isMonth ? "&view=month" : "";
  const navHref = (dir: number) => {
    const d = isMonth
      ? addMonthsStr(date, dir)
      : addDaysStr(date, dir * (isWeek ? 7 : 1));
    return `${base}?date=${d}${viewSuffix}`;
  };
  // Hour separators drawn at the BOTTOM of each hour cell, so there is no line
  // at the very top of the grid (above the first/opening hour).
  const gridlineBg = `repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR_HEIGHT - 1}px, var(--border) ${HOUR_HEIGHT - 1}px, var(--border) ${HOUR_HEIGHT}px)`;

  // One staff/unassigned column (header + time-grid body). Reused by Day view
  // (flat) and Week view (nested under each day).
  const renderColumn = (col: ColumnDef) => {
    const laid = layoutColumn(bookingsByCol.get(col.id) ?? [], win.startMin, tz);
    const colClosed = closedSegments({
      startMin: win.startMin,
      endMin: win.endMin,
      open: col.open,
      isClosed: col.isClosed,
    });
    const offBlocks =
      col.kind === "staff"
        ? (staffTimeOff[`${col.dateStr}|${col.staffId}`] ?? [])
        : [];
    const avatarSize = isWeek ? "size-5" : "size-7";
    return (
      <div
        key={col.id}
        className={cn(
          "shrink-0 border-l border-border",
          col.kind === "unassigned" && "bg-surface/20",
        )}
        style={{ width: col.width }}
      >
        {/* Header — staff chip (coloured pill in the staff's colour) */}
        <div
          className={cn(
            "sticky z-20 flex items-center justify-center bg-cal-header",
            isWeek ? "px-1" : "px-3",
          )}
          style={{ height: headHeight, top: isWeek ? WEEK_DAY_HEAD : 0 }}
        >
          <span
            className={cn(
              "inline-flex max-w-full items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 font-medium",
              isWeek ? "text-[11px]" : "text-sm",
            )}
            style={{
              backgroundColor: `color-mix(in srgb, ${col.color ?? "#a0a3ab"} 16%, transparent)`,
              boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${col.color ?? "#a0a3ab"} 42%, transparent)`,
            }}
          >
            <span
              className={cn(
                "grid shrink-0 place-items-center overflow-hidden rounded-full text-[11px] font-bold text-black",
                avatarSize,
              )}
              style={{ backgroundColor: col.color ?? "#a0a3ab" }}
            >
              {col.kind === "unassigned" ? (
                <Users
                  className={cn(isWeek ? "size-3" : "size-4", "text-white")}
                />
              ) : col.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={col.avatarUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                col.name.slice(0, 1).toUpperCase()
              )}
            </span>
            <span className="truncate text-foreground">{col.name}</span>
          </span>
        </div>

        {/* Body */}
        <div
          data-colbody
          data-colid={col.id}
          className="relative cursor-copy"
          onClick={(e) => {
            if (suppressClickRef.current) {
              suppressClickRef.current = false;
              return;
            }
            openNew(col, e);
          }}
          title={t.clickNew}
          style={{
            height: bodyHeight,
            backgroundImage: gridlineBg,
            backgroundPosition: `0 ${TOP_PAD}px`,
          }}
        >
          {/* Closed tint */}
          {colClosed.map((seg, i) => (
            <div
              key={i}
              className="pointer-events-none absolute inset-x-0 bg-surface/60"
              style={{
                top: (seg.startMin - win.startMin) * PX_PER_MIN + TOP_PAD,
                height: (seg.endMin - seg.startMin) * PX_PER_MIN,
              }}
            />
          ))}

          {/* Time off (ρεπό / άδειες) */}
          {offBlocks.map((off, i) => {
            const top0 = Math.max(off.startMin, win.startMin);
            const bot = Math.min(off.endMin, win.endMin);
            if (bot <= top0) return null;
            return (
              <div
                key={`to-${i}`}
                className="pointer-events-none absolute inset-x-0 z-[1] flex justify-center bg-amber-500/[0.07]"
                style={{
                  top: (top0 - win.startMin) * PX_PER_MIN + TOP_PAD,
                  height: (bot - top0) * PX_PER_MIN,
                  backgroundImage:
                    "repeating-linear-gradient(45deg, rgba(245,158,11,0.12) 0, rgba(245,158,11,0.12) 6px, transparent 6px, transparent 12px)",
                }}
              >
                <span className="mt-1 h-fit rounded bg-surface/90 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                  {off.reason || t.leaveLabel}
                </span>
              </div>
            );
          })}

          {/* Now indicator (only on today's column) */}
          {col.isToday &&
            nowMin !== null &&
            nowMin >= win.startMin &&
            nowMin <= win.endMin && (
              <div
                className="pointer-events-none absolute inset-x-0 z-10 border-t border-red-500"
                style={{ top: (nowMin - win.startMin) * PX_PER_MIN + TOP_PAD }}
              >
                <span className="absolute -left-1 -top-1 size-2 rounded-full bg-red-500" />
              </div>
            )}

          {/* Bookings */}
          {laid.map((b) => {
            const accent =
              b.color ??
              (b.staffId ? staffColors[b.staffId] : null) ??
              col.color ??
              "#a0a3ab";
            const ss = STATUS_STYLE[b.status];
            const cardBg =
              ss?.bg ?? `color-mix(in srgb, ${accent} 22%, var(--surface))`;
            const cardBorder = ss?.border ?? accent;
            const gap = 2;
            const resizing = resizeState?.id === b.id;
            const heightPx = resizing
              ? Math.max((resizeState!.endMin - b.startMin) * PX_PER_MIN, 20)
              : b.heightPx;
            const endMinShown = resizing ? resizeState!.endMin : b.endMin;
            // Density tiers keyed off the card's pixel height so text never clips
            // mid-word. Each tier adds one line as height allows:
            //   tiny     (<34px) → time range + name on ONE line
            //   twoLine  (<48px) → time range, then name          (2 lines)
            //   compact  (<64px) → + phone                        (3 lines)
            //   full    (≥64px)  → + service                      (4 lines)
            const tiny = heightPx < 34;
            const twoLine = heightPx < 48;
            const compact = heightPx < 64;
            const hasNote = !!b.customerNotes?.trim();
            return (
              <div
                key={b.id}
                role="button"
                tabIndex={0}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  // Touch/pen: no drag (too easy to mis-trigger while scrolling) —
                  // a tap opens the popover via onClick. Drag stays mouse-only (PC).
                  if (e.pointerType !== "mouse") return;
                  suppressClickRef.current = false;
                  const durationMin = Math.max(
                    SNAP_MIN,
                    Math.round(
                      (new Date(b.endsAt).getTime() -
                        new Date(b.startsAt).getTime()) /
                        60_000,
                    ),
                  );
                  dragRef.current = {
                    booking: b,
                    durationMin,
                    startX: e.clientX,
                    startY: e.clientY,
                    moved: false,
                  };
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  // Suppress the click that follows a real mouse drag/resize.
                  if (suppressClickRef.current) {
                    suppressClickRef.current = false;
                    return;
                  }
                  setActive({ booking: b, x: e.clientX, y: e.clientY });
                }}
                className={cn(
                  "absolute flex cursor-grab touch-manipulation select-none flex-col overflow-hidden rounded-lg border-l-2 px-2 text-[11px] leading-[1.2] shadow-sm transition-[filter,box-shadow] duration-150 ease-[var(--ease-out)] hover:z-10 hover:brightness-110 hover:shadow-md hover:ring-1 hover:ring-white/10 active:cursor-grabbing",
                  tiny ? "justify-center py-0" : compact ? "py-0.5" : "py-1",
                  b.status === "pending" && "border-dashed",
                  dragPreview?.booking.id === b.id &&
                    "opacity-30 ring-1 ring-gold/50",
                  resizing && "z-20 ring-1 ring-gold",
                )}
                style={{
                  top: b.topPx + TOP_PAD,
                  height: heightPx - gap,
                  left: `calc(${(b.lane / b.lanes) * 100}% + ${gap}px)`,
                  width: `calc(${(1 / b.lanes) * 100}% - ${gap * 2}px)`,
                  borderLeftColor: cardBorder,
                  backgroundColor: cardBg,
                }}
                title={[
                  `${minLabel(b.startMin)}–${minLabel(b.endMin)}`,
                  b.customerName,
                  b.customerPhone,
                  b.serviceName,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              >
                {tiny ? (
                  <div className="flex items-center gap-1 truncate font-medium leading-none text-foreground">
                    {b.status === "completed" && (
                      <Check className="size-3 shrink-0 text-emerald-500" />
                    )}
                    <span className="shrink-0 tabular-nums">
                      {minLabel(b.startMin)}–{minLabel(endMinShown)}
                    </span>
                    <span className="truncate font-normal text-foreground/90">
                      {b.customerName || b.customerPhone || t.customerFallback}
                    </span>
                    {hasNote && (
                      <StickyNote className="ml-auto size-3 shrink-0 text-gold/90" />
                    )}
                  </div>
                ) : (
                  <>
                    {/* Line 1: full time range (always). Then name, phone, and
                        service are added one per line as the height allows, so
                        nothing ever clips mid-line. */}
                    <div className="flex items-center gap-1 truncate font-medium leading-tight tabular-nums text-foreground">
                      {b.status === "completed" && (
                        <Check className="size-3 shrink-0 text-emerald-500" />
                      )}
                      <span className="truncate">
                        {minLabel(b.startMin)}–{minLabel(endMinShown)}
                      </span>
                      {hasNote && (
                        <StickyNote className="ml-auto size-3 shrink-0 text-gold/90" />
                      )}
                    </div>
                    <div className="truncate font-medium leading-tight text-foreground/90">
                      {b.customerName || b.customerPhone || t.customerFallback}
                    </div>
                    {!twoLine && b.customerName && b.customerPhone && (
                      <div className="flex items-center gap-1 truncate leading-tight text-muted">
                        <Phone className="size-3 shrink-0" />
                        <span className="truncate">{b.customerPhone}</span>
                      </div>
                    )}
                    {!compact && b.serviceName && (
                      <div className="truncate leading-tight text-muted">
                        {b.serviceName}
                      </div>
                    )}
                  </>
                )}
                {/* Resize handle (bottom edge) */}
                <div
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    if (e.pointerType !== "mouse") return; // mouse-only (PC)
                    const body = (
                      e.currentTarget as HTMLElement
                    ).closest<HTMLElement>("[data-colbody]");
                    if (!body) return;
                    resizeRef.current = {
                      booking: b,
                      startMin: b.startMin,
                      origEndMin: b.endMin,
                      body,
                    };
                  }}
                  className="absolute inset-x-0 bottom-0 z-10 hidden h-2.5 cursor-ns-resize items-end justify-center md:flex"
                  title={t.dragResize}
                >
                  <span className="mb-0.5 h-0.5 w-5 rounded-full bg-foreground/40" />
                </div>
              </div>
            );
          })}

          {/* Unassigned "available" ghosts (day view only) */}
          {col.kind === "staff" &&
            unassignedRecs
              .filter((u) => u.staffIds.includes(col.staffId ?? ""))
              .map((u) => (
                <div
                  key={`ghost-${u.b.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    suppressClickRef.current = true;
                    assignTo(u.b, col.staffId!);
                  }}
                  className="absolute inset-x-1 z-[5] flex cursor-pointer flex-col overflow-hidden rounded-md border border-dashed border-foreground/40 bg-surface/50 px-2 py-1 text-[11px] leading-[1.2] opacity-70 transition hover:border-gold hover:opacity-100"
                  style={{
                    top: (u.startMin - win.startMin) * PX_PER_MIN + TOP_PAD,
                    height: Math.max(
                      (u.endMin - u.startMin) * PX_PER_MIN - 2,
                      20,
                    ),
                  }}
                  title={`${t.availableAssign} ${col.name}`}
                >
                  <div className="flex items-center gap-1 truncate text-muted">
                    <UserPlus className="size-3 shrink-0" />
                    <span className="truncate">
                      {u.b.customerName || u.b.customerPhone || t.customerFallback}
                    </span>
                  </div>
                  <div className="truncate text-[10px] italic text-muted/80">
                    {t.noPreferenceClick}
                  </div>
                </div>
              ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* Toolbar: [view switcher] · [◀ date ▶] · [filter + picker] */}
      <div className="flex flex-col items-stretch gap-2 border-b border-border px-4 py-3 sm:px-6 md:grid md:grid-cols-3 md:items-center md:gap-3">
        {/* View switcher (Week / Month) with a sliding gold indicator */}
        <div className="relative mx-auto flex w-fit justify-self-start rounded-xl border border-border bg-surface/40 p-1 text-sm font-medium md:mx-0">
          <span
            aria-hidden
            className="absolute inset-y-1 left-1 rounded-lg bg-gold/15 ring-1 ring-inset ring-gold/25 transition-transform duration-300 ease-[var(--ease-out)]"
            style={{
              width: "calc((100% - 0.5rem) / 2)",
              transform: indicatorMonth ? "translateX(100%)" : "translateX(0)",
            }}
          />
          <Link
            href={`${base}?date=${date}&view=week`}
            onClick={() => setPendingView("week")}
            aria-current={isWeek ? "true" : undefined}
            className={cn(
              "relative z-10 w-24 rounded-lg py-1.5 text-center transition-colors duration-200 ease-[var(--ease-out)]",
              indicatorMonth ? "text-muted hover:text-foreground" : "text-gold",
            )}
          >
            {t.viewWeek}
          </Link>
          <Link
            href={`${base}?date=${date}&view=month`}
            onClick={() => setPendingView("month")}
            aria-current={isMonth ? "true" : undefined}
            className={cn(
              "relative z-10 w-24 rounded-lg py-1.5 text-center transition-colors duration-200 ease-[var(--ease-out)]",
              indicatorMonth ? "text-gold" : "text-muted hover:text-foreground",
            )}
          >
            {t.viewMonth}
          </Link>
        </div>

        {/* Date navigator */}
        <div className="flex items-center justify-center gap-2">
          <Link
            href={navHref(-1)}
            onClick={() => {
              setNavDir("prev");
              setPendingLabel(stepLabel(-1));
              setNavStep((s) => s + 1);
            }}
            className="group grid size-9 place-items-center rounded-xl bg-gold text-black transition-[transform,background-color,box-shadow] duration-200 ease-[var(--ease-out)] hover:bg-gold-bright hover:[box-shadow:0_6px_20px_-4px_var(--gold-glow)] active:scale-95"
            aria-label={t.prev}
          >
            <ChevronLeft className="size-4 transition-transform duration-200 ease-[var(--ease-out)] group-hover:-translate-x-0.5" />
          </Link>

          {onToday ? (
            <div className="min-w-[210px] overflow-hidden rounded-xl bg-gold/15 px-3 py-1.5 text-center text-sm font-semibold capitalize text-gold ring-1 ring-inset ring-gold/20">
              <span key={navStep} className={cn("block", dateDirClass)}>
                {shownLabel}
              </span>
            </div>
          ) : (
            <Link
              href={`${base}${viewSuffix ? `?${viewSuffix.slice(1)}` : ""}`}
              title={t.backToday}
              className="min-w-[210px] overflow-hidden rounded-xl px-3 py-1.5 text-center text-sm font-semibold capitalize text-foreground transition-colors duration-200 ease-[var(--ease-out)] hover:bg-surface-2"
            >
              <span key={navStep} className={cn("block", dateDirClass)}>
                {shownLabel}
              </span>
            </Link>
          )}

          <Link
            href={navHref(1)}
            onClick={() => {
              setNavDir("next");
              setPendingLabel(stepLabel(1));
              setNavStep((s) => s + 1);
            }}
            className="group grid size-9 place-items-center rounded-xl bg-gold text-black transition-[transform,background-color,box-shadow] duration-200 ease-[var(--ease-out)] hover:bg-gold-bright hover:[box-shadow:0_6px_20px_-4px_var(--gold-glow)] active:scale-95"
            aria-label={t.next}
          >
            <ChevronRight className="size-4 transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-0.5" />
          </Link>

          {!isWeek && win.isClosed && (
            <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted">
              <CalendarOff className="size-3" />
              {t.closed}
            </span>
          )}
        </div>

        {/* Staff filter (week) + date picker */}
        <div className="flex items-center justify-center gap-2 justify-self-end md:justify-end">
          {isWeek && staff.length > 0 && (
            <SelectMenu
              value={staffFilter}
              onChange={setStaffFilter}
              ariaLabel={t.allStaff}
              className="w-44"
              triggerClassName="h-9"
              options={[
                { value: "all", label: t.allStaff },
                ...staff.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          )}
          <DatePicker
            value={date}
            today={today}
            locale={locale}
            todayLabel={t.backToday}
            prevLabel={t.prev}
            nextLabel={t.next}
            onSelect={(d) => {
              setNavDir(null);
              router.push(`${base}?date=${d}${viewSuffix}`);
            }}
          />
        </div>
      </div>

      {/* Secondary bar: guide toggle + pause-online-bookings toggle */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2 sm:px-6">
        <button
          onClick={() => setHelpOpen((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors duration-200 ease-[var(--ease-out)]",
            helpOpen
              ? "border-gold/40 bg-gold/10 text-gold"
              : "border-border text-muted hover:text-foreground",
          )}
        >
          <HelpCircle className="size-3.5" />
          {t.guideButton}
        </button>
        <button
          onClick={togglePause}
          disabled={pausePending}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors duration-200 ease-[var(--ease-out)] disabled:opacity-50",
            paused
              ? "border-success/40 text-success hover:bg-success/10"
              : "border-border text-muted hover:border-warning/40 hover:bg-warning/10 hover:text-warning",
          )}
        >
          {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
          {paused ? t.resumeBookings : t.pauseBookings}
        </button>
      </div>

      {/* Paused banner */}
      {paused && (
        <div className="flex items-start gap-2 border-b border-warning/30 bg-warning/10 px-6 py-2.5 text-sm text-warning">
          <Pause className="mt-0.5 size-4 shrink-0" />
          <span>{t.pausedBanner}</span>
        </div>
      )}

      {/* Guide / instructions panel */}
      {helpOpen && (
        <div className="border-b border-border bg-surface/40 px-6 py-4 text-sm">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <h4 className="flex items-center gap-1.5 font-semibold text-foreground">
                <Info className="size-4 text-gold" />
                {t.guideTitle}
              </h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
                <li>{t.guideTip1}</li>
                <li>{t.guideTip2}</li>
                <li>{t.guideTip3}</li>
                <li>{t.guideTip4}</li>
              </ul>
            </div>
            <div>
              <h4 className="flex items-center gap-1.5 font-semibold text-foreground">
                <Clock className="size-4 text-gold" />
                {t.guideExistingTitle}
              </h4>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
                <li>{t.guideExisting1}</li>
                <li>{t.guideExisting2}</li>
                <li>{t.guideExisting3}</li>
              </ol>
            </div>
          </div>

          {/* Reassurance: the conflict + capacity engine prevents double-booking */}
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-success">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-semibold">{t.guideNoDoubleTitle}</p>
              <p className="mt-0.5 text-success/90">{t.guideNoDouble}</p>
            </div>
          </div>
        </div>
      )}

      {/* Grid area — wrapper clips the slide-in so it never spills a scrollbar */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {isMonth ? (
        <div className="animate-view flex-1 overflow-auto p-4">
          <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-border">
            {days.slice(0, 7).map((d) => (
              <div
                key={`h-${d}`}
                className="border-b border-border bg-surface/40 px-2 py-2 text-center text-xs font-semibold capitalize text-muted"
              >
                {intl(d, { weekday: "short" })}
              </div>
            ))}
            {days.map((d) => {
              const dayBk = monthByDay.get(d) ?? [];
              const inMonth = d.slice(0, 7) === date.slice(0, 7);
              const isDayToday = d === today;
              return (
                <button
                  key={d}
                  onClick={() => router.push(`${base}?date=${d}`)}
                  className={cn(
                    "flex min-h-[112px] flex-col gap-1 border-b border-r border-border p-1.5 text-left transition hover:bg-surface-2",
                    !inMonth && "opacity-40",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-6 place-items-center rounded-full text-xs font-semibold",
                      isDayToday ? "bg-gold text-black" : "text-foreground",
                    )}
                  >
                    {Number(d.slice(8, 10))}
                  </span>
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    {dayBk.slice(0, 3).map((b) => {
                      const ss = STATUS_STYLE[b.status];
                      const accent =
                        b.color ??
                        (b.staffId ? staffColors[b.staffId] : null) ??
                        "#a0a3ab";
                      const bg =
                        ss?.bg ??
                        `color-mix(in srgb, ${accent} 26%, var(--surface))`;
                      return (
                        <div
                          key={b.id}
                          className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] text-foreground"
                          style={{
                            backgroundColor: bg,
                            borderLeft: `2px solid ${ss?.border ?? accent}`,
                          }}
                          title={`${minLabel(minutesFromMidnight(b.startsAt, tz))} · ${b.customerName ?? ""} · ${b.serviceName ?? ""}`}
                        >
                          <span className="tabular-nums text-muted">
                            {minLabel(minutesFromMidnight(b.startsAt, tz))}
                          </span>
                          <span className="truncate">
                            {b.customerName ?? b.customerPhone ?? b.serviceName}
                          </span>
                        </div>
                      );
                    })}
                    {dayBk.length > 3 && (
                      <span className="px-1 text-[10px] text-muted">
                        +{dayBk.length - 3} {t.moreSuffix}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : staff.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="animate-rise flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-border bg-surface/40 px-8 py-10 elev-card">
            <span className="grid size-12 place-items-center rounded-full bg-gold/10 text-gold ring-1 ring-gold/20">
              <Users className="size-6" />
            </span>
            <p className="text-sm text-muted">{t.noStaff}</p>
            <Link
              href={`/${locale}/dashboard/staff`}
              className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-black transition-[transform,background-color] duration-200 ease-[var(--ease-out)] hover:bg-gold-bright active:scale-95"
            >
              <UserPlus className="size-4" />
              {t.manageStaff}
            </Link>
          </div>
        </div>
      ) : (
        <div className="animate-view m-4 flex min-h-0 min-w-0 flex-1 items-start">
          {/* Fixed card frame (border + corners stay) with the schedule scrolling inside it */}
          <div className="flex max-h-full max-w-full overflow-clip rounded-b-2xl">
            <div className="overflow-auto">
              <div className="flex w-max">
                {/* Hour rail — z-40 so its dark background sits ABOVE the day
                    band (z-30) too, covering the date headers of columns that
                    scroll horizontally under it (no gold peeking on the left). */}
            <div
              className="sticky left-0 z-40 shrink-0 bg-background"
              style={{ width: RAIL_WIDTH }}
            >
              <div
                className="sticky top-0 z-40 bg-background"
                style={{ height: railHeadHeight }}
              />
              <div className="relative" style={{ height: bodyHeight }}>
                {marks.map((m) => (
                  <div
                    key={m}
                    className="absolute right-2 font-display text-[11px] font-medium tabular-nums text-muted"
                    style={{ top: (m - win.startMin) * PX_PER_MIN + TOP_PAD }}
                  >
                    {minLabel(m)}
                  </div>
                ))}
              </div>
            </div>

            {/* Columns */}
            {isWeek
              ? weekGroups.map((g) => (
                  <div
                    key={g.date}
                    className={cn(
                      "mx-1.5 shrink-0 rounded-2xl ring-1 ring-inset",
                      g.isToday
                        ? "bg-gold/[0.05] ring-gold/45"
                        : "ring-gold/20",
                    )}
                    style={{ width: g.width }}
                  >
                    {/* Day band header (spans the day's staff sub-columns) */}
                    <div
                      className={cn(
                        "sticky top-0 z-30 flex items-center justify-center gap-1.5 rounded-t-2xl border-b border-border bg-cal-header",
                        g.isToday ? "text-gold" : "text-foreground",
                      )}
                      style={{ height: WEEK_DAY_HEAD }}
                    >
                      <span className="text-xs font-semibold capitalize">
                        {g.name}
                      </span>
                      <span
                        className={cn(
                          "text-[11px]",
                          g.isToday ? "text-gold/80" : "text-muted",
                        )}
                      >
                        {g.sub}
                      </span>
                    </div>
                    {/* Per-staff sub-columns */}
                    <div className="flex">{g.cols.map(renderColumn)}</div>
                  </div>
                ))
              : columns.map(renderColumn)}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Booking action popover */}
      {active &&
        (() => {
          const b = active.booking;
          const sMin = minutesFromMidnight(b.startsAt, tz);
          const eMin = minutesFromMidnight(b.endsAt, tz);
          const PANEL_W = 268;
          const PANEL_H = 260; // initial estimate before the real height is measured
          const left = Math.max(
            12,
            Math.min(active.x, window.innerWidth - PANEL_W - 12),
          );
          // Use the measured top once available; fall back to the estimate for
          // the very first paint (the layout effect corrects it before paint).
          const top =
            popoverTop ??
            Math.max(
              12,
              Math.min(active.y, window.innerHeight - PANEL_H - 12),
            );
          const statusLabel: Record<string, string> = {
            pending: t.statusPending,
            confirmed: t.statusConfirmed,
            completed: t.statusCompleted,
            no_show: t.statusNoShow,
            cancelled: t.statusCancelled,
          };
          const isResolved =
            b.status === "completed" ||
            b.status === "no_show" ||
            b.status === "cancelled";
          return (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setActive(null)}
              />
              <div
                ref={popoverRef}
                className="animate-rise fixed z-50 overflow-y-auto rounded-xl border border-border bg-surface p-4 elev-card"
                style={{
                  left,
                  top,
                  width: PANEL_W,
                  maxHeight: "calc(100vh - 24px)",
                }}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold tabular-nums text-foreground">
                      {minLabel(sMin)}–{minLabel(eMin)}
                    </p>
                    <span className="text-[11px] text-muted">
                      {statusLabel[b.status] ?? b.status}
                    </span>
                  </div>
                  <button
                    onClick={() => setActive(null)}
                    className="text-muted hover:text-foreground"
                    aria-label={dd.close}
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="space-y-1 border-t border-border pt-2 text-sm">
                  {b.customerName && (
                    <p className="font-medium text-foreground">
                      {b.customerName}
                    </p>
                  )}
                  {b.customerPhone && (
                    <a
                      href={`tel:${b.customerPhone.replace(/\s+/g, "")}`}
                      className="flex items-center gap-1.5 text-gold hover:underline"
                    >
                      <Phone className="size-3.5" />
                      {b.customerPhone}
                    </a>
                  )}
                  {b.serviceName && (
                    <p className="text-muted">{b.serviceName}</p>
                  )}
                  {b.noStaffPreference && (
                    <p className="flex items-center gap-1.5 text-gold">
                      <Info className="size-3.5 shrink-0" />
                      {t.noPreference}
                    </p>
                  )}
                  {b.customerNotes?.trim() && (
                    <div className="mt-1.5 rounded-lg bg-surface-2 px-2.5 py-2">
                      <p className="mb-0.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                        <StickyNote className="size-3.5 shrink-0 text-gold" />
                        {t.customerNote}
                      </p>
                      <p className="whitespace-pre-wrap break-words text-[13px] text-foreground/90">
                        {b.customerNotes}
                      </p>
                    </div>
                  )}
                </div>

                {!isResolved && (
                  <div className="mt-3 grid gap-1.5 border-t border-border pt-3">
                    <button
                      onClick={() => {
                        setEditTarget({ booking: b, mode: "move" });
                        setActive(null);
                      }}
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-foreground hover:bg-surface-2"
                    >
                      <CalendarClock className="size-4 text-gold" />
                      {t.moveAction}
                    </button>
                    <button
                      onClick={() => {
                        setEditTarget({ booking: b, mode: "duration" });
                        setActive(null);
                      }}
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-foreground hover:bg-surface-2"
                    >
                      <Clock className="size-4 text-gold" />
                      {t.durationAction}
                    </button>
                  </div>
                )}

                {!b.staffId &&
                  (() => {
                    const recs = recommendedStaffFor(b);
                    return (
                      <div className="mt-3 border-t border-border pt-3">
                        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                          {t.assignToLabel}
                        </p>
                        {recs.length === 0 ? (
                          <p className="text-xs text-amber-400">
                            {t.noFreeStaff}
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {recs.map((s) => (
                              <button
                                key={s.id}
                                onClick={() => assignTo(b, s.id)}
                                disabled={isPending}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm font-medium text-foreground hover:border-gold hover:text-gold disabled:opacity-40"
                              >
                                <span
                                  className="size-3 rounded-full"
                                  style={{
                                    backgroundColor: s.color ?? "#a0a3ab",
                                  }}
                                />
                                {s.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                <div className="mt-3 grid gap-1.5 border-t border-border pt-3">
                  <button
                    onClick={() => changeStatus(b.id, "completed")}
                    disabled={isPending || b.status === "completed"}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-40"
                  >
                    <CheckCircle2 className="size-4" />
                    {t.actionCompleted}
                  </button>
                  <button
                    onClick={() => changeStatus(b.id, "no_show")}
                    disabled={isPending || b.status === "no_show"}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/10 disabled:opacity-40"
                  >
                    <UserX className="size-4" />
                    {t.actionNoShow}
                  </button>
                  <button
                    onClick={() => changeStatus(b.id, "cancelled")}
                    disabled={isPending || b.status === "cancelled"}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-40"
                  >
                    <XCircle className="size-4" />
                    {t.actionCancelled}
                  </button>
                  {isResolved && (
                    <button
                      onClick={() => changeStatus(b.id, "confirmed")}
                      disabled={isPending}
                      className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-gold/10 px-2.5 py-2 text-sm font-medium text-gold hover:bg-gold/15 disabled:opacity-40"
                    >
                      <RotateCcw className="size-4" />
                      {t.restoreActive}
                    </button>
                  )}
                </div>

                {b.customerId && b.customerId !== ownerUserId && (
                  <div className="mt-1.5 border-t border-border pt-1.5">
                    <button
                      onClick={() => {
                        setReportCustomer({
                          id: b.customerId!,
                          name: b.customerName ?? t.customerFallback,
                          phone: b.customerPhone,
                        });
                        setActive(null);
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500/10 px-2.5 py-2 text-sm font-medium text-red-400 hover:bg-red-500/15"
                    >
                      <Flag className="size-4" />
                      {t.reportCustomer}
                    </button>
                  </div>
                )}
              </div>
            </>
          );
        })()}

      {reportCustomer && (
        <CustomerActionsModal
          locale={locale}
          customer={reportCustomer}
          onClose={() => setReportCustomer(null)}
        />
      )}

      {/* New booking modal */}
      {newSlot &&
        (() => {
          const avail = services;
          const svc = services.find((s) => s.id === newForm.serviceId);
          const [hh, mm] = newForm.time.split(":").map(Number);
          const endMin =
            (Number.isFinite(hh) ? hh * 60 + (mm || 0) : 0) +
            (svc?.durationMinutes ?? 0);
          const inputCls =
            "mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30";
          return (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/50"
                onClick={() => !isPending && setNewSlot(null)}
              />
              <div className="fixed left-1/2 top-1/2 z-50 w-[400px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-5 shadow-2xl">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-base font-bold text-foreground">
                      {t.newBooking}
                    </h3>
                    <p className="text-xs text-muted">
                      {intl(newSlot.dateStr, {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => setNewSlot(null)}
                    className="text-muted hover:text-foreground"
                    aria-label={dd.close}
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="grid gap-3">
                  <div className="block text-xs text-muted">
                    {t.person}
                    <SelectMenu
                      value={newForm.staffId}
                      onChange={(v) =>
                        setNewForm((f) => ({ ...f, staffId: v }))
                      }
                      disabled={isPending}
                      className="mt-1"
                      options={[
                        ...staff.map((s) => ({ value: s.id, label: s.name })),
                        { value: UNASSIGNED, label: t.unassigned },
                      ]}
                    />
                  </div>

                  <div className="grid grid-cols-[1fr_2fr] gap-3">
                    <label className="block text-xs text-muted">
                      {t.time}
                      <input
                        type="time"
                        step={SNAP_MIN * 60}
                        value={newForm.time}
                        onChange={(e) =>
                          setNewForm({ ...newForm, time: e.target.value })
                        }
                        disabled={isPending}
                        className={inputCls}
                      />
                    </label>
                    <div className="block text-xs text-muted">
                      {t.service}
                      <SelectMenu
                        value={newForm.serviceId}
                        onChange={(v) =>
                          setNewForm({ ...newForm, serviceId: v })
                        }
                        disabled={isPending}
                        placeholder="—"
                        className="mt-1"
                        options={avail.map((s) => ({
                          value: s.id,
                          label: s.name,
                        }))}
                      />
                    </div>
                  </div>

                  {svc && (
                    <p className="flex items-center gap-1.5 text-[11px] text-muted">
                      <Clock className="size-3" />
                      {formatDuration(svc.durationMinutes, locale)} · {t.endLabel}{" "}
                      {minLabel(endMin)}
                    </p>
                  )}
                  {avail.length === 0 && (
                    <p className="text-[11px] text-amber-400">
                      {t.noServicesStaff}
                    </p>
                  )}

                  <label className="block text-xs text-muted">
                    {t.customerName}
                    <input
                      value={newForm.name}
                      onChange={(e) =>
                        setNewForm({ ...newForm, name: e.target.value })
                      }
                      placeholder={t.customerNamePlaceholder}
                      disabled={isPending}
                      className={inputCls}
                    />
                  </label>

                  <label className="block text-xs text-muted">
                    {t.phone}
                    <input
                      value={newForm.phone}
                      onChange={(e) =>
                        setNewForm({ ...newForm, phone: e.target.value })
                      }
                      placeholder="+30 …"
                      disabled={isPending}
                      className={inputCls}
                    />
                  </label>

                  <p className="text-[11px] leading-snug text-muted-2">
                    {t.walkinHint}
                  </p>

                  <label className="block text-xs text-muted">
                    {t.notes}
                    <input
                      value={newForm.notes}
                      onChange={(e) =>
                        setNewForm({
                          ...newForm,
                          notes: e.target.value.slice(0, 300),
                        })
                      }
                      maxLength={300}
                      placeholder={t.notesPlaceholder}
                      disabled={isPending}
                      className={inputCls}
                    />
                  </label>

                  {newErr && (
                    <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                      {newErr}
                    </p>
                  )}

                  <div className="mt-1 flex gap-2">
                    <button
                      onClick={submitNew}
                      disabled={isPending || avail.length === 0}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold/90 disabled:opacity-40"
                    >
                      <Plus className="size-4" />
                      {isPending ? dd.saving : dd.add}
                    </button>
                    <button
                      onClick={() => setNewSlot(null)}
                      disabled={isPending}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-foreground"
                    >
                      {dd.cancel}
                    </button>
                  </div>
                </div>
              </div>
            </>
          );
        })()}

      {/* Tap-to-edit modal (move / change duration) */}
      {editTarget && (
        <BookingEditModal
          locale={locale}
          tz={tz}
          mode={editTarget.mode}
          booking={{
            id: editTarget.booking.id,
            startsAt: editTarget.booking.startsAt,
            endsAt: editTarget.booking.endsAt,
            staffId: editTarget.booking.staffId,
            customerName: editTarget.booking.customerName,
            serviceName: editTarget.booking.serviceName,
          }}
          staffNameLabel={staffName(editTarget.booking.staffId)}
          onClose={() => setEditTarget(null)}
          onMoved={({ startsAtIso, endsAtIso }) => {
            const id = editTarget.booking.id;
            setRows((prev) =>
              prev.map((b) =>
                b.id === id
                  ? { ...b, startsAt: startsAtIso, endsAt: endsAtIso }
                  : b,
              ),
            );
            setEditTarget(null);
            setToast(t.movedOk);
            router.refresh();
          }}
          onResized={({ endsAtIso }) => {
            const id = editTarget.booking.id;
            setRows((prev) =>
              prev.map((b) => (b.id === id ? { ...b, endsAt: endsAtIso } : b)),
            );
            setEditTarget(null);
            setToast(t.durationOk);
            router.refresh();
          }}
        />
      )}

      {/* Move confirmation */}
      {pendingMove &&
        (() => {
          const p = pendingMove;
          const fmtDate = (iso: string) =>
            intl(localDateInZone(iso, tz), {
              weekday: "short",
              day: "numeric",
              month: "short",
            });
          const range = (sIso: string, eIso: string) =>
            `${minLabel(minutesFromMidnight(sIso, tz))}–${minLabel(
              minutesFromMidnight(eIso, tz),
            )}`;
          return (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/50"
                onClick={() => !isPending && setPendingMove(null)}
              />
              <div className="fixed left-1/2 top-1/2 z-50 w-[360px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-5 shadow-2xl">
                <h3 className="font-display text-base font-bold text-foreground">
                  {t.moveBooking}
                </h3>
                {p.booking.customerName && (
                  <p className="mt-0.5 text-sm text-muted">
                    {p.booking.customerName}
                    {p.booking.serviceName ? ` · ${p.booking.serviceName}` : ""}
                  </p>
                )}

                <div className="mt-4 space-y-2">
                  <div className="rounded-lg border border-border px-3 py-2">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
                      {t.fromLabel}
                    </span>
                    <p className="text-sm capitalize text-foreground">
                      {fmtDate(p.booking.startsAt)} ·{" "}
                      {range(p.booking.startsAt, p.booking.endsAt)}
                    </p>
                    <p className="text-xs text-muted">
                      {staffName(p.booking.staffId)}
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <ArrowDown className="size-4 text-gold" />
                  </div>
                  <div className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-2">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-gold">
                      {t.toLabel}
                    </span>
                    <p className="text-sm capitalize text-foreground">
                      {fmtDate(p.startsAtIso)} ·{" "}
                      {range(p.startsAtIso, p.endsAtIso)}
                    </p>
                    <p className="text-xs text-muted">
                      {staffName(p.newStaffId)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={confirmMove}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold/90 disabled:opacity-40"
                  >
                    <Check className="size-4" />
                    {t.confirm}
                  </button>
                  <button
                    onClick={() => setPendingMove(null)}
                    disabled={isPending}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-foreground"
                  >
                    {dd.cancel}
                  </button>
                </div>
              </div>
            </>
          );
        })()}

      {/* Drag ghost — a lifted copy of the card following the cursor */}
      {dragPreview && (
        <div
          className="pointer-events-none fixed z-[60] w-44 rotate-2 scale-105 overflow-hidden rounded-md border-l-2 px-2 py-1 text-[11px] leading-[1.2] shadow-2xl ring-1 ring-gold/40"
          style={{
            left: dragPreview.x + 14,
            top: dragPreview.y + 8,
            borderLeftColor: dragPreview.accent,
            backgroundColor: `color-mix(in srgb, ${dragPreview.accent} 32%, var(--surface))`,
          }}
        >
          <div className="font-semibold tabular-nums text-foreground">
            {dragPreview.label}
          </div>
          {dragPreview.booking.customerName && (
            <div className="truncate font-medium text-foreground/90">
              {dragPreview.booking.customerName}
            </div>
          )}
          {dragPreview.booking.serviceName && (
            <div className="truncate text-muted">
              {dragPreview.booking.serviceName}
            </div>
          )}
        </div>
      )}

      {/* Center-screen toast */}
      {toast && (
        <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="pointer-events-auto flex max-w-sm items-start gap-3 rounded-xl border border-danger/40 bg-surface px-4 py-3 shadow-2xl">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" />
            <p className="text-sm text-foreground">{toast}</p>
            <button
              onClick={() => setToast(null)}
              className="ml-1 shrink-0 text-muted hover:text-foreground"
              aria-label={dd.close}
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
