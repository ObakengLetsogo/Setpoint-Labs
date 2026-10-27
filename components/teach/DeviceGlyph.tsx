/** Small drawn field devices for the wiring view, 30 x 30 units centred on (x, y). */
export function DeviceGlyph({ id, x, y, live }: { id: string; x: number; y: number; live: boolean }) {
  return <g transform={`translate(${x - 15} ${y - 15})`}>{GLYPHS[id]?.(live) ?? null}</g>;
}

const bezel = <rect x={1} y={1} width={28} height={28} rx={6} fill="#2a3038" />;

function button(color: string, pressed: boolean) {
  return (
    <>
      {bezel}
      <circle cx={15} cy={15} r={10} fill="#c9ced4" />
      <circle cx={15} cy={pressed ? 15.6 : 14.4} r={8} fill={color} />
      <ellipse cx={12.4} cy={11.4} rx={3.2} ry={1.8} fill="#ffffff" opacity={pressed ? 0.15 : 0.35} />
    </>
  );
}

function lamp(color: string, lit: boolean) {
  return (
    <>
      {bezel}
      {lit && <circle cx={15} cy={15} r={13} fill={color} opacity={0.25} />}
      <circle cx={15} cy={15} r={9} fill={lit ? color : "#5b636d"} stroke="#c9ced4" strokeWidth={1.6} />
      <path d="M 9.6 9.6 L 20.4 20.4 M 20.4 9.6 L 9.6 20.4" stroke={lit ? "#ffffff" : "#8b939c"} strokeWidth={1.4} strokeLinecap="round" opacity={0.8} />
    </>
  );
}

const GLYPHS: Record<string, (live: boolean) => React.ReactNode> = {
  start: (live) => button("#22a061", live),
  stop: (live) => button("#d23c3c", live),
  estop: (healthy) => (
    <>
      <rect x={1} y={1} width={28} height={28} rx={6} fill="#e8b81f" />
      <circle cx={15} cy={15} r={11} fill="#2a3038" opacity={0.25} />
      <circle cx={15} cy={healthy ? 14 : 15.4} r={9.5} fill="#d23c3c" />
      <ellipse cx={12} cy={10.6} rx={3.6} ry={2} fill="#ffffff" opacity={0.3} />
    </>
  ),
  overload: (healthy) => (
    <>
      <rect x={1} y={3} width={28} height={24} rx={4} fill="#3d434a" />
      <circle cx={9.5} cy={12} r={4} fill="#2457a6" />
      <circle cx={20.5} cy={12} r={4.4} fill="#efede7" />
      <path d="M 20.5 12 L 22.6 9.6" stroke="#f26b1d" strokeWidth={1.4} strokeLinecap="round" />
      <rect x={7} y={19.5} width={16} height={3.4} rx={1.7} fill={healthy ? "#22a061" : "#ff7a2a"} />
    </>
  ),
  coil: (energised) => (
    <>
      <path d="M 15 1 V 8 M 15 22 V 29" stroke="#8d949c" strokeWidth={1.6} />
      <rect x={6} y={8} width={18} height={14} rx={2} fill={energised ? "#2457a6" : "#ffffff"} stroke="#2457a6" strokeWidth={1.8} />
      <path d="M 9 15 h 12" stroke={energised ? "#ffffff" : "#2457a6"} strokeWidth={1.2} strokeDasharray="2 2" />
    </>
  ),
  runLamp: (lit) => lamp("#22a061", lit),
  faultLamp: (lit) => lamp("#e5484d", lit),
};
