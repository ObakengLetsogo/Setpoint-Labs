import type { IoPoint, LessonContent } from "../types";

// The Mining industry track: hands-on labs on mine equipment, built on the core levels.

const io = (address: string, tagName: string, color: string, connectsTo: string, description: string): IoPoint => ({ address, tagName, color, connectsTo, description });

const MC = {
  start: io("I0.0", "Start_PB", "#2e9e5b", "Control room start", "Momentary"),
  stop: io("I0.1", "Stop_PB", "#d64545", "Control room stop", "NC, 1 at rest"),
  reset: io("I0.2", "Reset_PB", "#2457a6", "Trip reset", "Momentary"),
  pw1: io("I0.3", "PW_01", "#c9a227", "CV01 pull-wires", "1 when healthy"),
  pw2: io("I0.4", "PW_02", "#c9a227", "CV02 pull-wires", "1 when healthy"),
  sw1: io("I0.5", "Sway_01", "#6b6f76", "CV01 sway switches", "1 when the belt runs true"),
  sw2: io("I0.6", "Sway_02", "#6b6f76", "CV02 sway switches", "1 when the belt runs true"),
  sp1: io("I0.7", "Spd_01", "#2457a6", "CV01 speed switch", "1 above 90 % speed"),
  sp2: io("I1.0", "Spd_02", "#2457a6", "CV02 speed switch", "1 above 90 % speed"),
  chute: io("I1.1", "Chute_Blk", "#d64545", "Blocked chute probe", "1 when blocked"),
  crFb: io("I1.2", "Cr_FB", "#2457a6", "Crusher contactor auxiliary", "1 when running"),
  crTrip: io("I1.3", "Cr_Trip", "#d64545", "Crusher protection trip", "1 when tripped"),
  crA: io("IW64", "Cr_Amps", "#6b4fa0", "Crusher current", "Amps, full load 100 A"),
  siren: io("Q0.0", "Siren", "#e0a526", "Pre-start siren", "Along both belts"),
  cv2: io("Q0.1", "CV02_Run", "#2457a6", "CV02 starter", "Through its pull-wires"),
  cv1: io("Q0.2", "CV01_Run", "#2457a6", "CV01 starter", "Through its pull-wires"),
  cr: io("Q0.3", "Crusher_Run", "#2457a6", "Crusher starter", "250 kW"),
  fdr: io("Q0.4", "Feeder_Run", "#2457a6", "Feeder run", "Vibrating feeder"),
  fdrSpd: io("QW64", "Feeder_Speed", "#6b4fa0", "Feeder speed", "0 to 100 %"),
  runLamp: io("Q0.5", "Run_Lamp", "#2e9e5b", "Chain running", "Green"),
  faultLamp: io("Q0.6", "Fault_Lamp", "#d64545", "Chain tripped", "Red"),
};

export const MINING: Record<string, LessonContent> = {
  "n-conveyor-chain": {
    difficulty: "advanced",
    checkpoint: {
      steps: [
        (m) => Boolean(m.Siren) && !m.CV02_Run,
        (m) => Boolean(m.Feeder_Run),
        (m) => !m.Seq_Run && !m.Feeder_Run && !m.Crusher_Run && Boolean(m.CV02_Run),
        (m, i) => !i.PW_01 && Boolean(m.Trip) && !m.Crusher_Run,
      ],
      message: "started the chain behind the siren from the stockpile end, stopped it empty, and tripped it with a pull-wire",
    },
    summary:
      "On a mine, conveyors run in chains. They start from the discharge end: the siren sounds so nobody is near a belt, then the last belt starts, and each belt upstream starts only once the one after it is proved up to speed. They stop the other way round: the feeder first, then each belt runs on until it is empty. Every belt has pull-wires along its length, sway switches and a speed switch, and the transfer chutes have blocked chute probes. Any of them trips the chain.",
    facts: [
      { icon: "press", text: "Tap Start. The siren sounds for 5 s, then CV02, CV01, the crusher and the feeder start in turn, each waiting for the one after it." },
      { icon: "watch", text: "Press Stop. The feeder stops at once; the crusher, CV01 and CV02 run on and stop empty, in that order." },
      { icon: "shield", text: "Start again and pull CV01's pull-wire. CV01 stops at its starter, and the program trips everything feeding it." },
    ],
    io: [MC.start, MC.stop, MC.reset, MC.pw1, MC.pw2, MC.sw1, MC.sw2, MC.sp1, MC.sp2, MC.chute, MC.crFb, MC.siren, MC.cv2, MC.cv1, MC.cr, MC.fdr, MC.runLamp, MC.faultLamp],
    steps: [
      { line: 2, text: "Start latches the sequence, unless the chain has tripped." },
      { line: 4, text: "The siren sounds for 5 s before anything moves." },
      { line: 6, text: "CV02 starts first, and runs on for 15 s after a stop so it empties." },
      { line: 8, text: "CV01 starts only once CV02 is proved at speed, and runs on for 10 s." },
      { line: 10, text: "The crusher waits for CV01, and runs on for 5 s." },
      { line: 12, text: "The feeder runs only while everything after it is running. It stops first." },
      { line: 13, text: "A belt that does not reach speed within 4 s is slipping." },
      { line: 14, text: "Any pull-wire, sway switch, blocked chute or slip trips the chain." },
      { line: 16, text: "Reset only clears the trip once every switch is healthy again." },
    ],
    code: [
      "// A conveyor chain: siren, start from the discharge end, stop empty, trip on any switch.",
      "RUNG 1: XIC(Start_PB) XIO(Trip) OTL(Seq_Run)",
      "RUNG 2: XIO(Stop_PB) OTU(Seq_Run)",
      "RUNG 3: XIC(Seq_Run) TON(Siren_T, 5000)",
      "RUNG 4: XIC(Seq_Run) XIO(Siren_T.DN) OTE(Siren)",
      "RUNG 5: XIC(Siren_T.DN) TOF(CV02_On, 15000)",
      "RUNG 6: XIC(CV02_On.DN) XIO(Trip) OTE(CV02_Run)",
      "RUNG 7: XIC(Siren_T.DN) XIC(Spd_02) TOF(CV01_On, 10000)",
      "RUNG 8: XIC(CV01_On.DN) XIC(Spd_02) XIO(Trip) OTE(CV01_Run)",
      "RUNG 9: XIC(Siren_T.DN) XIC(Spd_01) TOF(Cr_On, 5000)",
      "RUNG 10: XIC(Cr_On.DN) XIC(Spd_01) XIO(Trip) OTE(Crusher_Run)",
      "RUNG 11: XIC(Seq_Run) XIC(Siren_T.DN) XIC(Cr_FB) XIC(Spd_01) XIC(Spd_02) XIO(Trip) OTE(Feeder_Run)",
      "RUNG 12: XIC(CV02_Run) XIO(Spd_02) TON(Slip_T, 4000)",
      "RUNG 13: XIO(PW_01) OR XIO(PW_02) OR XIO(Sway_01) OR XIO(Sway_02) OR XIC(Chute_Blk) OR XIC(Slip_T.DN) OTL(Trip)",
      "RUNG 14: XIC(Trip) OTU(Seq_Run)",
      "RUNG 15: XIC(Reset_PB) XIC(PW_01) XIC(PW_02) XIC(Sway_01) XIC(Sway_02) XIO(Chute_Blk) OTU(Trip)",
      "RUNG 16: XIC(Feeder_Run) OTE(Run_Lamp)",
      "RUNG 17: XIC(Trip) OTE(Fault_Lamp)",
    ],
    specs: [
      { label: "Start", value: "Siren, then CV02, CV01, crusher, feeder" },
      { label: "Stop", value: "Feeder first, belts run empty" },
      { label: "Trips", value: "Pull-wire, sway, slip, chute" },
      { label: "Level", value: "Advanced" },
    ],
  },

  "n-crusher-feed": {
    difficulty: "advanced",
    checkpoint: {
      steps: [
        (m, i) => Boolean(m.Feeder_Run) && Math.abs(Number(i.Cr_Amps) - 80) <= 4,
        (m, i) => Boolean(m.Feeder_Run) && Math.abs(Number(i.Cr_Amps) - 80) <= 4 && Number(m.Feeder_Speed) < 50,
      ],
      message: "held the crusher at 80 A by trimming the feed, then held it again on harder ore",
    },
    summary:
      "A crusher earns its keep when it is full and working, but harder ore can overload it and stop the plant. So the feeder's speed is controlled from the crusher's own motor current: a PID holds the current at 80 % of full load. Softer ore lets the feeder speed up; harder ore slows it down. The crusher stays loaded, and it does not trip.",
    facts: [
      { icon: "watch", text: "Run the chain. The PID brings the crusher to 80 A and the feeder settles near 60 %." },
      { icon: "bolt", text: "Make the ore harder, 1.5 ×. Current jumps, the PID slows the feeder, and the current comes back to 80 A." },
      { icon: "info", text: "Try it without the PID: change rung 5 to MOV(100, Feeder_Speed). Hard ore trips the crusher within seconds." },
    ],
    io: [MC.start, MC.stop, MC.crFb, MC.crTrip, MC.crA, MC.cv2, MC.cv1, MC.cr, MC.fdr, MC.fdrSpd, MC.runLamp, MC.faultLamp],
    steps: [
      { line: 2, text: "A simple run for this lesson: the chain sequence is the last lesson's job." },
      { line: 4, text: "The feeder runs once the crusher is proved running." },
      { line: 5, text: "Gentle tuning: the crusher's current lags the feed by a few seconds." },
      { line: 6, text: "The PID holds Cr_Amps at 80 by moving the feeder's speed." },
      { line: 7, text: "Feeder stopped, speed reference zero." },
      { line: 8, text: "Over 110 A for 3 s, warn: the crusher is close to tripping." },
    ],
    code: [
      "// Feed the crusher as hard as it can take, and no harder.",
      "RUNG 1: (XIC(Start_PB) OR XIC(Run)) AND XIC(Stop_PB) AND XIO(Cr_Trip) OTE(Run)",
      "RUNG 2: XIC(Run) OTE(CV02_Run) OTE(CV01_Run) OTE(Crusher_Run)",
      "RUNG 3: XIC(Run) XIC(Cr_FB) OTE(Feeder_Run)",
      "RUNG 4: MOV(0.8, JIC1.KP) MOV(8, JIC1.TI)",
      "RUNG 5: XIC(Feeder_Run) PID(JIC1, Cr_Amps, 80, Feeder_Speed)",
      "RUNG 6: XIO(Feeder_Run) MOV(0, Feeder_Speed)",
      "RUNG 7: GRT(Cr_Amps, 110) TON(Hi_T, 3000)",
      "RUNG 8: XIC(Hi_T.DN) OR XIC(Cr_Trip) OTE(Fault_Lamp)",
      "RUNG 9: XIC(Feeder_Run) OTE(Run_Lamp)",
    ],
    specs: [
      { label: "Crusher", value: "250 kW, 100 A full load" },
      { label: "Setpoint", value: "80 A" },
      { label: "Controls", value: "Feeder speed" },
      { label: "Level", value: "Advanced" },
    ],
  },
};
