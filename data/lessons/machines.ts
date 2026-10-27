import type { IoPoint, LessonContent } from "../types";

const io = (address: string, tagName: string, color: string, connectsTo: string, description: string): IoPoint => ({ address, tagName, color, connectsTo, description });

const SD = {
  start: io("I0.0", "Start_PB", "#2e9e5b", "Start pushbutton", "Momentary, normally open"),
  stop: io("I0.1", "Stop_PB", "#d64545", "Stop pushbutton", "Normally closed: 1 at rest"),
  ol: io("I0.2", "Overload_OK", "#f26b1d", "Overload 95-96", "1 while healthy"),
  estop: io("I0.3", "EStop_OK", "#c9a227", "E-stop monitoring", "1 while released"),
  k2fb: io("I0.4", "K2_Fb", "#6b6f76", "K2 aux contact 13-14", "1 while K2's main contacts are really closed"),
  k1: io("Q0.0", "K1_Main", "#2457a6", "K1 main coil", "Closed for the whole run"),
  k2: io("Q0.1", "K2_Star", "#2457a6", "K2 star coil", "Closed during the start"),
  k3: io("Q0.2", "K3_Delta", "#2457a6", "K3 delta coil", "Closed for running"),
  lamp: io("Q0.3", "Run_Lamp", "#2e9e5b", "Green run lamp", "Lit in delta"),
};

const RV = {
  fwd: io("I0.0", "Fwd_PB", "#2e9e5b", "Forward pushbutton", "Momentary, normally open"),
  rev: io("I0.1", "Rev_PB", "#2457a6", "Reverse pushbutton", "Momentary, normally open"),
  stop: io("I0.2", "Stop_PB", "#d64545", "Stop pushbutton", "Normally closed: 1 at rest"),
  ol: io("I0.3", "Overload_OK", "#f26b1d", "Overload 95-96", "1 while healthy"),
  zero: io("I0.4", "Zero_Speed", "#6b6f76", "Zero speed switch", "1 when the shaft has stopped"),
  kf: io("Q0.0", "KF_Fwd", "#2457a6", "KF forward coil", "Phases in order"),
  kr: io("Q0.1", "KR_Rev", "#2457a6", "KR reverse coil", "Two phases swapped"),
  fl: io("Q0.2", "Fwd_Lamp", "#2e9e5b", "Forward lamp", "Lit while running forward"),
  rl: io("Q0.3", "Rev_Lamp", "#2457a6", "Reverse lamp", "Lit while running in reverse"),
};

const SEAL = "RUNG 1: (XIC(Start_PB) OR XIC(Run_Seal)) AND XIC(Stop_PB) AND XIC(Overload_OK) AND XIC(EStop_OK) OTE(Run_Seal)";

/** Lessons on the machines track. */
export const MACHINES: Record<string, LessonContent> = {
  "m-star-delta": {
    difficulty: "intermediate",
    checkpoint: {
      steps: [(m) => Boolean(m.K1_Main) && Boolean(m.K2_Star), (m) => Boolean(m.K3_Delta) && !m.K2_Star],
      message: "started in star and changed over to delta",
    },
    summary:
      "A big motor started straight on the line pulls a huge current. Star-delta starts it with each winding on 230 V instead of 400 V, a third of the current and torque, then switches to delta for full power. The PLC times the changeover and leaves a short gap so star and delta are never closed together.",
    facts: [
      { icon: "press", text: "Tap Start. K1 and K2 close: the motor starts in star." },
      { icon: "watch", text: "After 5 s K2 opens, a 100 ms gap, then K3 closes for delta." },
      { icon: "bolt", text: "Watch the current in the motor card: lower in star, a small bump at changeover." },
    ],
    io: [SD.start, SD.stop, SD.ol, SD.estop, SD.k1, SD.k2, SD.k3, SD.lamp],
    steps: [
      { line: 2, text: "A seal-in with Stop, overload and E-stop in series. Stop is wired normally closed, so it is XIC." },
      { line: 3, text: "K1, the main contactor, follows the seal for the whole run." },
      { line: 4, text: "Star_T times the star start, 5 s here. Real values come from the motor's run up time." },
      { line: 5, text: "K2 star is on from the start until the timer is done." },
      { line: 6, text: "Gap_T waits 100 ms after K2 drops, so its contacts have time to open and the arc to clear." },
      { line: 7, text: "Only then does K3 delta close, with the run lamp." },
    ],
    code: [
      "// Start in star, change to delta after 5 s with a short gap.",
      SEAL,
      "RUNG 2: XIC(Run_Seal) OTE(K1_Main)",
      "RUNG 3: XIC(Run_Seal) TON(Star_T, 5000)",
      "RUNG 4: XIC(Run_Seal) XIO(Star_T.DN) OTE(K2_Star)",
      "RUNG 5: XIC(Star_T.DN) XIO(K2_Star) TON(Gap_T, 100)",
      "RUNG 6: XIC(Gap_T.DN) OTE(K3_Delta) OTE(Run_Lamp)",
    ],
    specs: [
      { label: "Rungs", value: "6" },
      { label: "Star time", value: "5 s" },
      { label: "Changeover gap", value: "100 ms" },
      { label: "Level", value: "Intermediate" },
    ],
  },

  "m-interlock": {
    difficulty: "intermediate",
    checkpoint: {
      steps: [(m, _i, f) => Boolean(f.k2Welded) && Boolean(m.Weld_Fault) && !m.K3_Delta],
      message: "caught a welded star contactor and refused to close delta",
    },
    summary:
      "An interlock stops two things that must never happen together. Star and delta closed at once is a short circuit. This program blocks it twice: each coil's rung refuses while the other is on, and delta waits for K2's aux contact to prove K2 really opened. Weld K2 and the program stops the motor instead of closing delta.",
    facts: [
      { icon: "info", text: "Software interlock: XIO(K3_Delta) in the star rung and XIO(K2_Star) in the delta rung." },
      { icon: "shield", text: "Feedback interlock: delta waits for K2_Fb, the aux contact, to read 0." },
      { icon: "bolt", text: "Weld K2 from its popover and start. After 2 s the weld fault stops the motor." },
    ],
    io: [SD.start, SD.stop, SD.ol, SD.estop, SD.k2fb, SD.k1, SD.k2, SD.k3, SD.lamp],
    steps: [
      { line: 2, text: "The seal also drops on Weld_Fault." },
      { line: 5, text: "Star refuses while delta is on: XIO(K3_Delta)." },
      { line: 6, text: "The gap timer starts only once K2's aux contact proves the star contacts opened." },
      { line: 7, text: "Delta refuses while star is commanded on: XIO(K2_Star)." },
      { line: 8, text: "If K2 still reads closed 2 s after it was told to open, its contacts are welded." },
      { line: 9, text: "Weld_Fault latches and drops the seal, so K1 opens and the motor stops." },
      { line: 10, text: "Press Stop once K2 has opened to clear the fault." },
    ],
    code: [
      "// Star and delta interlocked in logic and by feedback.",
      "RUNG 1: (XIC(Start_PB) OR XIC(Run_Seal)) AND XIC(Stop_PB) AND XIC(Overload_OK) AND XIC(EStop_OK) AND XIO(Weld_Fault) OTE(Run_Seal)",
      "RUNG 2: XIC(Run_Seal) OTE(K1_Main)",
      "RUNG 3: XIC(Run_Seal) TON(Star_T, 5000)",
      "RUNG 4: XIC(Run_Seal) XIO(Star_T.DN) XIO(K3_Delta) OTE(K2_Star)",
      "RUNG 5: XIC(Star_T.DN) XIO(K2_Fb) TON(Gap_T, 100)",
      "RUNG 6: XIC(Gap_T.DN) XIO(K2_Star) OTE(K3_Delta) OTE(Run_Lamp)",
      "RUNG 7: XIC(Star_T.DN) XIC(K2_Fb) TON(Weld_T, 2000)",
      "RUNG 8: XIC(Weld_T.DN) OTL(Weld_Fault)",
      "RUNG 9: XIO(Stop_PB) XIO(K2_Fb) OTU(Weld_Fault)",
    ],
    specs: [
      { label: "Rungs", value: "9" },
      { label: "Interlocks", value: "Logic and feedback" },
      { label: "Weld check", value: "2 s" },
      { label: "Level", value: "Intermediate" },
    ],
  },

  "m-reversing": {
    difficulty: "intermediate",
    checkpoint: {
      steps: [(m) => Boolean(m.KF_Fwd), (m) => Boolean(m.KR_Rev)],
      message: "ran forward, stopped, and ran in reverse",
    },
    summary:
      "Swapping any two phases reverses a three phase motor. Two contactors do it, and they must never close together. Each direction locks out the other, and a new start waits for the zero speed switch, so nobody slams a spinning motor into reverse.",
    facts: [
      { icon: "press", text: "Tap FWD. The forward contactor closes and the coupling turns one way." },
      { icon: "shield", text: "Tap REV while running. Nothing happens: forward locks it out." },
      { icon: "watch", text: "Tap Stop, wait for the shaft to stop, then tap REV." },
    ],
    io: [RV.fwd, RV.rev, RV.stop, RV.ol, RV.zero, RV.kf, RV.kr, RV.fl, RV.rl],
    steps: [
      { line: 2, text: "Forward seals in. A new start needs Zero_Speed; XIO(Rev_Run) locks out reverse." },
      { line: 3, text: "Reverse is the mirror image, locked out by Fwd_Run." },
      { line: 4, text: "KF closes only if KR is off. A second, independent interlock on the outputs." },
      { line: 5, text: "KR closes only if KF is off." },
    ],
    code: [
      "// Forward and reverse, interlocked, starting only from zero speed.",
      "RUNG 1: (XIC(Fwd_PB) XIC(Zero_Speed) OR XIC(Fwd_Run)) AND XIC(Stop_PB) AND XIC(Overload_OK) AND XIO(Rev_Run) OTE(Fwd_Run)",
      "RUNG 2: (XIC(Rev_PB) XIC(Zero_Speed) OR XIC(Rev_Run)) AND XIC(Stop_PB) AND XIC(Overload_OK) AND XIO(Fwd_Run) OTE(Rev_Run)",
      "RUNG 3: XIC(Fwd_Run) XIO(KR_Rev) OTE(KF_Fwd) OTE(Fwd_Lamp)",
      "RUNG 4: XIC(Rev_Run) XIO(KF_Fwd) OTE(KR_Rev) OTE(Rev_Lamp)",
    ],
    specs: [
      { label: "Rungs", value: "4" },
      { label: "Interlocks", value: "Run bits and outputs" },
      { label: "Restart", value: "From zero speed" },
      { label: "Level", value: "Intermediate" },
    ],
  },
};
