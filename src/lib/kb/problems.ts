import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = 'parser' | 'hint' | 'one-day move' | 'unplaced';

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  tenants: number;
  firstSeen: string;
  lastSeen: string;
  tagged: Record<string, number>;
  filedUnder: Problem[];
};

export const PROBLEMS: Record<Problem, { shows: string; fix: string }> = {
  parser: {
    shows: 'Day and month swapped: 7 April arrives as 4 July.',
    fix: 'Make the shared parser read dates in the tenant locale. This is the fix queued under #4471.',
  },
  hint: {
    shows: 'Day and month swapped, but only for bookings made through the booking-v3 form.',
    fix: 'booking-v3 prints MM/DD/YYYY under a field it reads day first. Change the hint to the tenant order.',
  },
  'one-day move': {
    shows: 'The date moves by one day, or two attendees see different days. No swap.',
    fix: 'Not the parser. Look at time zones when the invite is built.',
  },
  unplaced: {
    shows: 'No tenant on file, so no cause can be read.',
    fix: 'Find the tenant first.',
  },
};

export function mergedInto(reports: Report[], ticket: number): Report[] {
  return uniqueById(reports).filter((r) => r.mergedInto === ticket);
}

function group(problem: Problem, rs: Report[], filedUnder: Problem[] = []): ProblemGroup {
  const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
  return {
    problem,
    reports: rs,
    tenants: new Set(rs.map((r) => r.tenant)).size,
    firstSeen: days[0],
    lastSeen: days[days.length - 1],
    tagged: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.meta.intakeTag]: (n[r.meta.intakeTag] ?? 0) + 1 }), {}),
    filedUnder,
  };
}

export function groupByProblem(
  reports: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemGroup[] {
  const merged = mergedInto(reports, ticket);
  const byCause = new Map<Problem, Report[]>();
  for (const r of merged) {
    const c = causeOf(r, tenantOf(r)) ?? 'unplaced';
    byCause.set(c, [...(byCause.get(c) ?? []), r]);
  }
  const groups = [...byCause.entries()].map(([c, rs]) => group(c, rs)).sort((a, b) => b.reports.length - a.reports.length);
  const moved = merged.filter((r) => oneDayMove.includes(r.id));
  if (moved.length) {
    const under = [...new Set(moved.map((r) => causeOf(r, tenantOf(r)) ?? 'unplaced'))];
    groups.push(group('one-day move', moved, under));
  }
  return groups;
}
