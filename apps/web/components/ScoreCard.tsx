import type { ScoreBreakdown } from '@corpus/core';

import p from './primitives.module.css';
import s from './Dashboard.module.css';

/**
 * The Corpus score.
 *
 * A number, a four-segment bar and one sentence. No factor breakdown and no
 * "how this was calculated" expander — that is a deliberate product decision,
 * not an omission. See the note at the top of the model's `constants.ts`.
 */
export function ScoreCard({ score }: { score: ScoreBreakdown }) {
  return (
    <section className={`${p.cardDark} ${s.scoreCard}`} aria-label="Corpus score">
      <div className="microLabel microLabelOnDark">CORPUS SCORE</div>

      <div className={s.scoreValue}>
        <div className={p.heroMetric}>{score.value}</div>
        <div className={s.scoreOutOf}>/{100}</div>
      </div>

      <div className={s.scoreSegments} aria-hidden>
        {Array.from({ length: score.totalSegments }, (_, i) => (
          <div
            key={i}
            className={`${s.segment} ${i < score.segmentsFilled ? s.segmentFilled : ''}`}
          />
        ))}
      </div>

      <p className={p.bodyOnDark}>{score.summary}</p>
    </section>
  );
}
