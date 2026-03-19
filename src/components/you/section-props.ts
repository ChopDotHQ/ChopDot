import type { CSSProperties } from 'react';

export interface PSAStyleProps {
  isPSA: boolean;
  psaCardClass: string;
  psaCardStyle?: CSSProperties;
  psaCardHoverStyle?: CSSProperties;
}

export function psaMouseHandlers(props: PSAStyleProps) {
  if (!props.isPSA) return {};
  return {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      if (props.psaCardHoverStyle) Object.assign(e.currentTarget.style, props.psaCardHoverStyle);
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      if (props.psaCardStyle) Object.assign(e.currentTarget.style, props.psaCardStyle);
    },
  };
}
