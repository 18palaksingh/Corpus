import type { GoalInput, GoalProgress, UserInput } from '../types.js';
import { inr, inrCompact, monthYear } from '../format.js';
import { monthsBetween } from './dates.js';

/** A goal is on track when nothing beyond its existing funding is needed. */
export function isOnTrack(goal: GoalInput): boolean {
  return goal.monthlyShortfall <= 0;
}

/**
 * Goals as the dashboard renders them.
 *
 * A goal that is on track shows its progress and the date it lands. A goal that
 * is behind shows "Behind" and what closing it costs per month — the number the
 * plan then acts on.
 */
export function computeGoals(user: UserInput): GoalProgress[] {
  return [...user.goals]
    .sort((a, b) => a.priority - b.priority)
    .map((goal) => {
      const progress = goal.target === 0 ? 0 : goal.current / goal.target;
      const onTrack = isOnTrack(goal);
      const monthsOut = monthsBetween(user.period.start, goal.targetDate);

      const caption = onTrack
        ? `${inrCompact(goal.current)} of ${inrCompact(goal.target)} · ${
            monthsOut <= 24
              ? `complete by ${monthYear(goal.targetDate)}`
              : `on track for ${new Date(goal.targetDate).getUTCFullYear()}`
          }`
        : `Needs ${inr(goal.monthlyShortfall)} a month more · the plan starts it`;

      return {
        id: goal.id,
        label: goal.label,
        progress,
        fill: Math.max(0, Math.min(1, progress)),
        rightValue: onTrack ? `${Math.round(progress * 100)}%` : 'Behind',
        onTrack,
        caption,
      };
    });
}

/** Goals that need more money than they are currently getting, highest priority first. */
export function behindGoals(user: UserInput): GoalInput[] {
  return [...user.goals].filter((g) => !isOnTrack(g)).sort((a, b) => a.priority - b.priority);
}
