import type { GoalProgress } from '@corpus/core';
import { barHeight, clampFill, color } from '@corpus/core';

import p from './primitives.module.css';
import s from './Dashboard.module.css';

/** Goals, projected on the approved plan. A goal that is behind is drawn in the negative colour. */
export function GoalsCard({ goals }: { goals: GoalProgress[] }) {
  return (
    <section className={`${p.card} ${p.cardPadded} ${s.goalsCard}`} aria-label="Goals">
      <div className={s.goalsHeader}>
        <h2 className="cardHeading" style={{ margin: 0 }}>
          Goals
        </h2>
        <div className={p.cardHeaderMeta}>Projected on the approved plan</div>
      </div>

      <div className={s.goalsGrid}>
        {goals.map((goal) => (
          <div key={goal.id} className={s.goal}>
            <div className={s.goalHeader}>
              <div className={s.goalLabel}>{goal.label}</div>
              <div className={`${s.goalValue} ${goal.onTrack ? '' : s.goalValueBehind}`}>
                {goal.rightValue}
              </div>
            </div>

            <div
              className={p.track}
              style={{ height: barHeight.goal }}
              role="progressbar"
              aria-label={goal.label}
              aria-valuenow={Math.round(goal.progress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={p.fill}
                style={{
                  width: clampFill(goal.fill),
                  background: goal.onTrack ? color.accent : color.negative,
                }}
              />
            </div>

            <div className={s.goalCaption}>{goal.caption}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
