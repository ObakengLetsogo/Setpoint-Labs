import type { LessonTeach } from "./teach";

// Teaching panels for the Professional lessons added from the Curriculum and Lecture Guide.

const LOOP = [
  { term: "PV", meaning: "Process value: what the transmitter measures, here the tank level." },
  { term: "SP", meaning: "Setpoint: where you want the PV to be." },
  { term: "CV", meaning: "Control variable: the PID's output, here the valve opening." },
  { term: "Error", meaning: "The difference between SP and PV." },
];
const BETWEEN = ["Stop the PLC before you change the program.", "Edits apply on the next Run.", "Change one tuning value at a time and watch the trend."];

export const TEACH_PROFESSIONAL: Record<string, LessonTeach> = {
  "p-pid-what": {
    goal: "See why closed loop control beats on and off control, and why proportional control alone leaves an offset.",
    learn: ["open and closed loops", "PV, SP and CV", "proportional gain", "offset", "control valves"],
    wires: [1, 2, 3, 4, 5, 7, 8],
    steps: [
      "Switch the PLC to RUN. Turn the selector to auto and tap Start.",
      "Watch the faceplate trend: the valve opens wide, then closes as the level nears setpoint.",
      "Read the level when it settles. It sits below setpoint: that is offset.",
      "Turn the plant demand up to 0.9. The offset grows.",
      "Change KP to 6 and run again. Smaller offset, but watch for the start of a swing.",
    ],
    between: BETWEEN,
    tour: [
      { kicker: "Scene 1 of 3 · The loop", title: "Measure, compare, act", lines: [5, 5], lead: "Every scan the PID reads PV, compares it with SP and writes CV.", body: "That loop of measuring and correcting is closed loop control. On and off control only knows full open or shut.", handsTo: ["Level_PV", "Level_SP", "Valve_CV"] },
      { kicker: "Scene 2 of 3 · Gain", title: "How hard to push", lines: [3, 3], lead: "KP 3 opens the valve 3 % for every 1 % of error.", body: "More gain means a smaller offset and a faster response, until the loop starts to swing.", handsTo: ["LIC1"] },
      { kicker: "Scene 3 of 3 · Offset", title: "Why P alone falls short", lines: [4, 4], lead: "With TI 0 the valve only opens while there is error.", body: "To keep water flowing in, some error must remain. Integral action, in the next lesson, removes it.", precise: "The PID here works in percent: PV, SP and CV are all 0 to 100.", handsTo: [] },
    ],
    story: [
      { t: "start", text: "The level is far below setpoint, so the valve opens wide." },
      { t: "closing", text: "As the level rises the error shrinks and the valve closes." },
      { t: "settled", text: "Inflow matches demand with a small error left: the offset." },
    ],
    words: [...LOOP, { term: "Gain (KP)", meaning: "How much the output moves for each unit of error." }, { term: "Offset", meaning: "The error that stays when a loop uses proportional action only." }],
  },

  "p-pid-block": {
    goal: "Configure a complete PID block: tuning, hand and auto, and bumpless transfer.",
    learn: ["KP, TI and TD", "integral action", "hand and auto", "bumpless transfer", "direct and reverse acting"],
    wires: [1, 2, 3, 4, 5, 7, 8],
    steps: [
      "Switch the PLC to RUN with the selector in hand.",
      "Set the hand output to 30 % on the valve's popover. The valve follows.",
      "Turn the selector to auto and tap Start. The valve does not jump.",
      "Watch the level settle exactly on setpoint.",
      "Change the setpoint on the tank's popover to 40 % and watch the loop follow it down.",
    ],
    between: BETWEEN,
    tour: [
      { kicker: "Scene 1 of 3 · Tuning", title: "Three numbers", lines: [3, 5], lead: "KP, TI and TD are the loop's tuning.", body: "In TIA Portal they live in PID_Compact's settings. In Studio 5000 they are members of a PIDE tag.", handsTo: ["LIC1"] },
      { kicker: "Scene 2 of 3 · Integral", title: "No offset", lines: [6, 6], lead: "TI keeps nudging the valve as long as any error remains.", body: "The shorter TI is, the faster it acts, and the more likely the loop is to overshoot.", handsTo: ["Valve_CV"] },
      { kicker: "Scene 3 of 3 · Hand", title: "Bumpless transfer", lines: [7, 7], lead: "In hand the operator writes the valve.", body: "The PID tracks that value, so when it takes over it starts from where the operator left the valve.", precise: "This block is direct acting: CV rises when PV is below SP. A loop on an outlet valve would be reverse acting, set with LIC1.REV.", handsTo: ["Hand_CV"] },
    ],
    story: [
      { t: "hand", text: "The operator holds the valve at 30 %." },
      { t: "auto", text: "The PID starts from 30 %: no bump." },
      { t: "settled", text: "The integral removes the last of the error." },
    ],
    words: [...LOOP, { term: "Integral (TI)", meaning: "Action that keeps growing while error remains, in seconds per repeat." }, { term: "Derivative (TD)", meaning: "Action on how fast the PV is changing." }, { term: "Bumpless", meaning: "Switching hand to auto without the output jumping." }],
  },

  "p-pid-tune": {
    goal: "Recognise a badly tuned loop on its trend, and tune it to settle.",
    learn: ["oscillation", "overshoot", "settling time", "a safe tuning method", "valve stiction"],
    wires: [1, 2, 3, 4, 5, 7, 8],
    steps: [
      "Run the program as it is, in auto. Watch the trend swing.",
      "Stop. Change KP to 2 and TI to 300: gentle. Run, and watch a slow, smooth response.",
      "Raise KP until the level just starts to overshoot, then halve it.",
      "Shorten TI until the level reaches setpoint in about a minute. KP 4 and TI 120 is close.",
      "Settled turns on after 15 s within 2 %. Then try the stiction fault and look at the sawtooth.",
    ],
    between: BETWEEN,
    tour: [
      { kicker: "Scene 1 of 3 · Too hard", title: "Swinging", lines: [3, 4], lead: "High gain and short TI make the valve slam.", body: "Each correction arrives late because of the lags in the pipe and transmitter, so it overshoots the other way.", handsTo: ["LIC1"] },
      { kicker: "Scene 2 of 3 · Measure", title: "How far off", lines: [7, 7], lead: "Err is the level minus the setpoint.", body: "A loop is judged on overshoot, how long it takes to settle, and whether it swings.", handsTo: ["Err"] },
      { kicker: "Scene 3 of 3 · Proof", title: "Settled", lines: [8, 8], lead: "15 s inside 2 % turns Settled on.", body: "On site you prove tuning with a setpoint step and a load change, and keep the trend as a record.", precise: "If the valve sticks, the trend shows a sawtooth. Fix the valve first: tuning cannot cure stiction.", handsTo: ["Settled"] },
    ],
    story: [
      { t: "too hard", text: "The valve slams open and shut; the level swings by 10 %." },
      { t: "gentle", text: "Low gain, long TI: smooth but slow." },
      { t: "tuned", text: "Fast to setpoint with little overshoot." },
    ],
    words: [...LOOP, { term: "Overshoot", meaning: "How far the PV goes past setpoint." }, { term: "Settling time", meaning: "How long until the PV stays within a band of setpoint." }, { term: "Stiction", meaning: "A valve that sticks, then jumps: it causes a sawtooth trend." }],
  },

  "p-pid-cascade": {
    goal: "Build a cascade loop and see it reject a supply disturbance that a single loop cannot.",
    learn: ["master and slave loops", "flow control", "disturbance rejection", "PV tracking", "tuning order"],
    wires: [1, 2, 3, 4, 5, 6, 7, 8],
    steps: [
      "Switch the PLC to RUN, select auto and tap Start.",
      "Wait for the level to settle at setpoint.",
      "Drop the supply pressure to 0.6 on its gauge's popover.",
      "Watch Flow_SP stay steady while Valve_CV opens: the flow loop has corrected it.",
      "Fail the flow transmitter. The flow loop opens the valve fully: cascade relies on its inner transmitter.",
    ],
    between: ["Tune the inner loop first, with the outer loop in hand.", ...BETWEEN.slice(0, 2)],
    tour: [
      { kicker: "Scene 1 of 3 · Master", title: "The level loop", lines: [7, 7], lead: "LIC1 decides how much flow the tank needs.", body: "Its output is not a valve. It is the flow loop's setpoint.", handsTo: ["Flow_SP"] },
      { kicker: "Scene 2 of 3 · Slave", title: "The flow loop", lines: [8, 8], lead: "FIC1 moves the valve to get that flow.", body: "Flow answers the valve in a second or two, so this loop can be fast.", handsTo: ["Flow_PV", "Valve_CV"] },
      { kicker: "Scene 3 of 3 · Hand", title: "Both loops bumpless", lines: [9, 10], lead: "In hand, Flow_SP follows the measured flow.", body: "So when auto starts, both loops start from the plant as it is.", precise: "The inner loop must be several times faster than the outer, or cascade gives no benefit.", handsTo: ["Flow_SP"] },
    ],
    story: [
      { t: "steady", text: "Level at setpoint, flow matching demand." },
      { t: "supply drops", text: "Flow falls; FIC1 opens the valve within seconds." },
      { t: "result", text: "The level barely moves." },
    ],
    words: [...LOOP, { term: "Cascade", meaning: "One loop's output is another loop's setpoint." }, { term: "Master / slave", meaning: "The outer, slow loop and the inner, fast loop of a cascade." }, { term: "Disturbance", meaning: "Anything that upsets the process, such as a supply pressure change." }],
  },
};
