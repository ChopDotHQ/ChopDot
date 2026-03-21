import { useId } from 'react';

export const ChopDotMark = ({
  size = 48,
  useBlackAndWhite = false,
  useWhite = false,
}: {
  size?: number;
  useBlackAndWhite?: boolean;
  useWhite?: boolean;
}) => {
  const maskId = useId();
  let fillColor: string;
  if (useWhite) {
    fillColor = '#FFFFFF';
  } else if (useBlackAndWhite) {
    fillColor = '#000000';
  } else {
    fillColor = 'var(--accent)';
  }
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" role="img" aria-hidden="true">
      <defs>
        <mask id={maskId}>
          <rect x="0" y="0" width="256" height="256" fill="white" />
          <rect x="-64" y="112" width="384" height="32" fill="black" transform="rotate(-35 128 128)" />
        </mask>
      </defs>
      <circle cx="128" cy="128" r="96" fill={fillColor} mask={`url(#${maskId})`} />
    </svg>
  );
};
