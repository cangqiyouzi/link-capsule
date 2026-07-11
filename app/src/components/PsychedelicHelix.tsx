import { useMemo } from 'react';

const BLOCK_COUNT = 24;
const HELIX_TEXTS = ['LINK CAPSULE', 'SAVE IT NOW', 'READ LATER', 'DIGITAL MIND', '记忆胶囊'];

function getZOffset(index: number): string {
  const z = Math.sin(Math.PI * (index / BLOCK_COUNT)) * 15;
  return `${z}vw`;
}

function getText(index: number): string {
  return HELIX_TEXTS[index % HELIX_TEXTS.length];
}

export default function PsychedelicHelix() {
  const blocks = useMemo(() => {
    return Array.from({ length: BLOCK_COUNT }, (_, i) => ({
      index: i,
      text: getText(i),
      zOffset: getZOffset(i),
    }));
  }, []);

  return (
    <div className="spiral-container" aria-hidden="true">
      <div className="spiral-column column-left">
        {blocks.map((b) => (
          <div
            key={`left-${b.index}`}
            className="spiral-block"
            style={{
              top: `${(b.index / BLOCK_COUNT) * 100}%`,
            }}
          >
            <span
              className="spiral-text"
              style={{ transform: `translateZ(${b.zOffset})` }}
            >
              {b.text}
            </span>
          </div>
        ))}
      </div>
      <div className="spiral-column column-right">
        {blocks.map((b) => (
          <div
            key={`right-${b.index}`}
            className="spiral-block"
            style={{
              top: `${(b.index / BLOCK_COUNT) * 100}%`,
            }}
          >
            <span
              className="spiral-text"
              style={{ transform: `translateZ(${b.zOffset})` }}
            >
              {b.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
