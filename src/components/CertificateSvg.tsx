import type { CSSProperties } from 'react';
import type { CertificateLayout, DrawOperation } from '../lib/layout/buildLayout';
import { PAGE } from '../lib/layout/layoutGrid';

const ptToMm = (points: number) => (points * 25.4) / 72;

export function CertificateSvg({ layout, className = '' }: { layout: CertificateLayout; className?: string }) {
  return (
    <svg
      className={`certificateSvg ${className}`}
      viewBox={`0 0 ${PAGE.width} ${PAGE.height}`}
      role="img"
      aria-label="Certificate preview"
      preserveAspectRatio="xMidYMid meet"
    >
      {layout.operations.map((operation) => renderOperation(operation))}
    </svg>
  );
}

function renderOperation(operation: DrawOperation) {
  if (operation.type === 'image') {
    return (
      <image
        key={operation.key}
        href={operation.href}
        x={operation.x}
        y={operation.y}
        width={operation.width}
        height={operation.height}
        preserveAspectRatio={operation.preserveAspectRatio === 'meet' ? 'xMidYMid meet' : 'none'}
      />
    );
  }
  if (operation.type === 'line') {
    return <line key={operation.key} x1={operation.x1} y1={operation.y1} x2={operation.x2} y2={operation.y2} stroke={operation.color} strokeWidth={operation.width} />;
  }
  if (operation.type === 'rect') {
    return <rect key={operation.key} x={operation.x} y={operation.y} width={operation.width} height={operation.height} fill={operation.fill} />;
  }
  const style: CSSProperties = {
    fontFamily: `"${operation.family}"`,
    fontSize: `${ptToMm(operation.sizePt)}px`,
    letterSpacing: `${ptToMm(operation.trackingPt)}px`,
  };
  return (
    <text
      key={operation.key}
      x={operation.x}
      y={operation.y}
      textAnchor={operation.align === 'middle' ? 'middle' : operation.align === 'end' ? 'end' : 'start'}
      fill={operation.color}
      style={style}
    >
      {operation.text}
    </text>
  );
}
