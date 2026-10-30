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

  "p-inst-tx": {
    goal: "Read four kinds of transmitter, scale their signals and tell a real zero from a broken loop.",
    learn: ["4-20 mA", "two wire transmitters", "raw counts", "scaling", "NAMUR NE43 fault limits"],
    wires: [1, 2, 3, 4, 5, 6],
    steps: [
      "Switch the PLC to RUN. Read Press_dBar, Level_Pct, Flow_Pct and Temp_C in the code card.",
      "Move each slider and watch the transmitter display, the raw count and the scaled value.",
      "Raise TT1 to 100 °C.",
      "Open FT1's loop. FT_Raw goes to -6912: 0 mA. The fault lamp lights.",
      "Break TT1's RTD wire. The transmitter drives to 21.5 mA and TT_Fault lights.",
    ],
    between: ["Isolate before you break into a loop on live plant.", ...BETWEEN.slice(0, 2)],
    tour: [
      { kicker: "Scene 1 of 3 · The signal", title: "Why 4 to 20", lines: [2, 2], lead: "4 mA is the bottom of the range, 20 mA the top.", body: "A two wire transmitter powers itself from the loop, so it needs a little current even at zero. That is why the bottom is 4, not 0.", handsTo: ["PT_Raw"] },
      { kicker: "Scene 2 of 3 · Scaling", title: "Counts to units", lines: [2, 5], lead: "Multiply by the span, divide by 27648.", body: "Siemens cards give 0 to 27648. Allen Bradley cards can scale in the card itself. Either way, check the range on the transmitter's data plate.", handsTo: ["Press_dBar", "Temp_C"] },
      { kicker: "Scene 3 of 3 · Faults", title: "Below 3.6, above 21", lines: [6, 8], lead: "Outside these limits the value cannot be trusted.", body: "NAMUR NE43 sets these limits. A transmitter that detects its own fault drives its current outside them on purpose.", precise: "A temperature transmitter with a broken RTD usually goes upscale, so a heater controlled from it switches off: the safe way.", handsTo: ["FT_Fault", "TT_Fault"] },
    ],
    story: [
      { t: "4 mA", text: "Bottom of range: raw 0." },
      { t: "20 mA", text: "Top of range: raw 27648." },
      { t: "0 mA", text: "Dead loop: raw -6912, fault." },
      { t: "21.5 mA", text: "Burnout upscale: fault." },
    ],
    words: [{ term: "4-20 mA", meaning: "The standard analogue current signal: 4 mA at 0 %, 20 mA at 100 %." }, { term: "Two wire", meaning: "A transmitter powered by its own signal loop." }, { term: "Raw counts", meaning: "The number the input card gives, 0 to 27648 on Siemens." }, { term: "Burnout", meaning: "Driving the signal outside range on a sensor fault, up or down." }, { term: "PT100", meaning: "A platinum resistance sensor: 100 ohms at 0 °C." }],
  },

  "p-inst-cal": {
    goal: "Loop test and calibrate a transmitter with a calibrator, at five points, and record it.",
    learn: ["loop calibrators", "sourcing and measuring", "five point checks", "as found and as left", "zero and span"],
    wires: [1, 2, 6],
    steps: [
      "Switch the PLC to RUN. Switch the calibrator to source.",
      "Inject 4 mA. Press_dBar should read 0. Write it down.",
      "Inject 8, 12, 16 and 20 mA. Expect 25, 50, 75 and 100.",
      "Switch back to measure. Set the zero shift fault on PT1 and compare its reading with the applied pressure.",
      "Trim the zero on the HART communicator, then check again: that is as found, then as left.",
    ],
    between: ["Tell the control room before you inject into a live loop.", ...BETWEEN.slice(0, 2)],
    tour: [
      { kicker: "Scene 1 of 2 · The path", title: "Field to screen", lines: [2, 2], lead: "Injecting at the field end tests every wire, terminal and the scaling in one go.", body: "If 12 mA in gives 50 % on the screen, the loop is right. If not, measure at each terminal until it changes.", handsTo: ["PT_Raw", "Press_dBar"] },
      { kicker: "Scene 2 of 2 · Limits", title: "Prove the alarms too", lines: [3, 3], lead: "Inject 3 mA and 22 mA: the fault lamp must light.", body: "A loop test that never checks the fault detection is only half done.", precise: "A zero error shifts every point by the same amount. A span error grows towards the top of the range.", handsTo: ["Fault_Lamp"] },
    ],
    story: [
      { t: "as found", text: "Record the five readings before touching anything." },
      { t: "adjust", text: "Trim zero, then span." },
      { t: "as left", text: "Record the five readings again and sign the sheet." },
    ],
    words: [{ term: "Source", meaning: "The calibrator supplies a known current in place of the transmitter." }, { term: "Measure", meaning: "The calibrator reads the loop current, in series with the loop." }, { term: "Zero", meaning: "The reading at the bottom of the range." }, { term: "Span", meaning: "The difference between the top and bottom of the range." }, { term: "As found / as left", meaning: "Readings recorded before and after adjustment." }],
  },

  "p-inst-hart": {
    goal: "Use HART to re-range and diagnose a smart transmitter, and make the program follow it.",
    learn: ["HART", "re-ranging", "device status", "trim", "scaling from the device"],
    wires: [1, 2, 6],
    steps: [
      "Switch the PLC to RUN. Set 4 bar on PT1: Press_dBar reads 40.",
      "On the HART communicator, change PT1's range to 0-16 bar. The mA drops to 8, but Press_dBar still reads 40.",
      "Change line 2 to use 100 instead of PT_URV and run again. Now it reads 25: wrong.",
      "Put PT_URV back. Fail PT1's sensor.",
      "PT_Diag lights from the HART status, and PT_Low from the 3.6 mA current.",
    ],
    between: BETWEEN.slice(0, 2),
    tour: [
      { kicker: "Scene 1 of 3 · Two signals", title: "Analogue and digital", lines: [2, 2], lead: "The 4-20 mA carries the value; HART rides on top of it.", body: "HART is a small digital signal on the same pair of wires. Old cards ignore it; HART cards and handhelds read it.", handsTo: ["PT_URV"] },
      { kicker: "Scene 2 of 3 · Status", title: "The device knows", lines: [3, 3], lead: "The transmitter reports its own sensor fault.", body: "Diagnostics tell you a transmitter is failing before the reading goes wrong.", handsTo: ["PT_Status", "PT_Diag"] },
      { kicker: "Scene 3 of 3 · Belt and braces", title: "Two ways to catch it", lines: [4, 5], lead: "The current check still works if HART is lost.", body: "Use both: the diagnosis for detail, the current limits as a backup.", precise: "Re-ranging changes what each mA means. Every system reading that loop must be updated, or follow the device as this program does.", handsTo: ["Fault_Lamp"] },
    ],
    story: [
      { t: "4 bar", text: "Range 0-10: 10.4 mA, Press_dBar 40." },
      { t: "re-range", text: "Range 0-16: 8 mA, still 40." },
      { t: "sensor fails", text: "3.6 mA and status 1: fault lamp." },
    ],
    words: [{ term: "HART", meaning: "Highway Addressable Remote Transducer: digital data on a 4-20 mA loop." }, { term: "URV / LRV", meaning: "Upper and lower range values of a transmitter." }, { term: "Re-range", meaning: "Changing what 4 and 20 mA stand for." }, { term: "Device status", meaning: "The transmitter's own report of its health." }],
  },
};
