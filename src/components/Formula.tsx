import type {FormulaCard, Tile} from '../content/types';

const ROLE_NAME = {subject: 'subject', verb: 'verb', object: 'object', time: 'time'} as const;

/** One formula line as coloured chips: "I + play + football + every day". */
export function FormulaLine({parts, joiner = '+'}: {parts: Tile[]; joiner?: string}) {
  return (
    <p className="formula-line">
      {parts.map((p, i) => (
        <span key={`${p.text}-${i}`} className="formula-part">
          {i > 0 ? (
            <span className="formula-join" aria-hidden="true">
              {joiner}
            </span>
          ) : null}
          <span className={`gchip g-${p.role}`}>
            {p.text}
            <span className="visually-hidden"> ({ROLE_NAME[p.role]})</span>
          </span>
        </span>
      ))}
    </p>
  );
}

export function FormulaRows({card}: {card: FormulaCard}) {
  return (
    <div className="formula-rows">
      <FormulaLine parts={card.parts} joiner={card.joiner} />
      {card.rows?.map((r, i) => <FormulaLine key={i} parts={r} joiner={card.joiner} />)}
    </div>
  );
}

/** The colour key, so the colours always have words next to them. */
export function RoleLegend() {
  return (
    <ul className="role-legend" aria-label="Colour key">
      <li>
        <span className="gdot g-subject" aria-hidden="true" /> Who
      </li>
      <li>
        <span className="gdot g-verb" aria-hidden="true" /> Action
      </li>
      <li>
        <span className="gdot g-object" aria-hidden="true" /> What
      </li>
      <li>
        <span className="gdot g-time" aria-hidden="true" /> When
      </li>
    </ul>
  );
}
