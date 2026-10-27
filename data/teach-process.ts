import type { LessonTeach } from "./teach";

const W = [
  { term: "Rung", meaning: "One line of ladder logic between the two power rails." },
  { term: "Scan", meaning: "One pass of the program: read inputs, solve every rung top to bottom, write outputs." },
  { term: "Float switch", meaning: "A float on a cable or rod that closes a contact when the liquid lifts it." },
];
const SAFE = ["Stop the PLC before you change the program.", "The rig is a simulator. Never test logic on live plant."];

/** Teaching panels for the process track and the batch mixer. */
export const TEACH_PROCESS: Record<string, LessonTeach> = {
  "p-tank-level": {
    goal: "Keep the tank between the low and high floats with one inlet valve.",
    learn: ["float switches", "latch and unlatch", "hysteresis", "process demand", "fail safe auto"],
    wires: [1, 2, 3, 4, 5, 6, 7],
    steps: [
      "Run the PLC and tap AUTO.",
      "Watch the level fall as the plant draws water.",
      "Below 25 % the inlet opens. Watch it stay open through 25 % until 80 %.",
      "Open the outlet popover and change the demand. The cycle speeds up or slows down.",
      "Stick the high float from its popover. What happens to the tank?",
    ],
    between: ["Floats are simple and need no power to work.", "A backup high level switch is common on real tanks.", ...SAFE],
    tour: [
      { kicker: "Scene 1 of 3 · Start filling", title: "Below the low float", lines: [4, 4], lead: "XIO(Float_Low) latches Filling.", body: "The low float drops as the water falls below it. Its contact opens and the rung latches the fill.", handsTo: ["Float_Low", "Filling"] },
      { kicker: "Scene 2 of 3 · Stop filling", title: "At the high float", lines: [5, 5], lead: "XIC(Float_High) unlatches Filling.", body: "The fill runs all the way from low to high. Between the two, the program does nothing: that band is the hysteresis.", precise: "Without the band, a single switch would open and close the valve every few seconds.", handsTo: ["Float_High"] },
      { kicker: "Scene 3 of 3 · Act", title: "Valve follows the fill", lines: [6, 6], lead: "XIC(Filling) OTE(Inlet_Valve).", body: "Leaving auto unlatches Filling, so the valve always closes when nobody is in charge.", handsTo: ["Inlet_Valve"] },
    ],
    story: [
      { t: "auto", text: "You tap AUTO. The level is 40 %, so nothing happens yet." },
      { t: "falling", text: "The plant draws water. At 25 % the low float drops." },
      { t: "fill", text: "Filling latches, the inlet opens." },
      { t: "80 %", text: "The high float lifts. Filling unlatches, the inlet closes." },
      { t: "again", text: "The cycle repeats as long as the plant draws water." },
    ],
    words: [...W, { term: "Hysteresis", meaning: "A gap between the switch on and switch off points, so a control does not chatter." }],
  },

  "p-analog": {
    goal: "Scale the level transmitter to percent and control the tank on numbers instead of floats.",
    learn: ["analog input", "raw counts", "scaling", "MUL and DIV", "compare instructions", "high alarm"],
    wires: [1, 2, 3, 6, 7, 8],
    steps: [
      "Run the PLC and tap AUTO.",
      "Watch Level_Raw and Level_Pct together in the ladder view.",
      "Below 30 % the inlet opens; at 75 % it closes.",
      "Stick the high float stuck from its popover. The analog control does not care.",
      "Change 75 to 60 in rung 6 and run again. No floats moved.",
    ],
    between: ["Multiply before dividing to keep precision in integer maths.", "Use a 32 bit integer: 27648 × 100 does not fit in 16 bits.", ...SAFE],
    tour: [
      { kicker: "Scene 1 of 3 · Scale", title: "Raw counts to percent", lines: [4, 5], lead: "MUL by 100, then DIV by 27648.", body: "27648 raw is 100 %. Multiplying first keeps the fraction that integer division would otherwise lose.", precise: "Percent = raw × 100 ÷ 27648. Half full reads 13824 raw and 50 %.", handsTo: ["Level_Raw", "Level_Pct"] },
      { kicker: "Scene 2 of 3 · Control", title: "A band in numbers", lines: [6, 8], lead: "LES(Level_Pct, 30) starts the fill, GEQ(Level_Pct, 75) stops it.", body: "The same latch and unlatch as the float lesson, but the band is now just two numbers you can change.", handsTo: ["Filling", "Inlet_Valve"] },
      { kicker: "Scene 3 of 3 · Protect", title: "High alarm", lines: [9, 9], lead: "GRT(Level_Pct, 90) lights the alarm lamp.", body: "If anything goes wrong with the fill, the operator sees it before the tank overflows.", handsTo: ["Alarm_Lamp"] },
    ],
    story: [
      { t: "read", text: "The transmitter sends 4 to 20 mA. The input card turns it into 0 to 27648." },
      { t: "rung 3", text: "Raw 8294 times 100 is 829400." },
      { t: "rung 4", text: "829400 divided by 27648 is 29. Below 30, so Filling latches." },
      { t: "75 %", text: "Level_Pct reaches 75. Filling unlatches, the inlet closes." },
      { t: "alarm", text: "Above 90 % the alarm lamp would light." },
    ],
    words: [...W, { term: "Analog input", meaning: "An input that carries a number, such as a level, rather than on or off." }, { term: "Scaling", meaning: "Converting raw counts into engineering units such as percent, bar or degrees." }],
  },

  "p-duplex": {
    goal: "Run two pumps from three floats, swapping the lead pump after every cycle and bringing in the lag pump when needed.",
    learn: ["lead and lag", "duty alternation", "falling edge", "toggle pattern", "run hours"],
    wires: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11],
    steps: [
      "Run the PLC and tap AUTO. Pump 1 runs the first cycle.",
      "Wait for the well to empty. The next cycle starts pump 2.",
      "Compare run hours in each pump's popover.",
      "Turn the inflow above three quarters. Both pumps run.",
      "Trip pump 1 during its cycle. What happens to the level?",
    ],
    between: ["Alternating duty evens out wear and proves both pumps work.", "Lag pumps are sized for the peak inflow.", ...SAFE],
    tour: [
      { kicker: "Scene 1 of 3 · Calls", title: "Floats make calls", lines: [3, 6], lead: "Lead and lag floats latch their calls; the low float clears both.", body: "A call stays on from its start float all the way down to the low float, the same band idea as the tank.", handsTo: ["Lead_Call", "Lag_Call"] },
      { kicker: "Scene 2 of 3 · Alternate", title: "Flip the duty at the end of a cycle", lines: [7, 12], lead: "Cycle_End catches the scan where Lead_Call falls.", body: "Two rungs decide which way to flip, then two more act. Deciding first means the bit flips exactly once.", precise: "Cycle_Mem is written after Cycle_End reads it, so it holds last scan's value.", handsTo: ["Duty_P2", "Cycle_End"] },
      { kicker: "Scene 3 of 3 · Run", title: "Lead, plus lag when needed", lines: [13, 14], lead: "Each pump runs as lead on its turn, and always on a lag call.", body: "Both outputs also need their overload healthy.", handsTo: ["P1_Run", "P2_Run"] },
    ],
    story: [
      { t: "cycle 1", text: "The lead float latches Lead_Call. Duty_P2 is 0, so pump 1 runs." },
      { t: "empty", text: "The low float clears Lead_Call. Cycle_End pulses, Duty_P2 flips to 1." },
      { t: "cycle 2", text: "Next time the lead float trips, pump 2 runs." },
      { t: "storm", text: "Inflow rises. The lag float latches Lag_Call and both pumps run." },
      { t: "low", text: "The low float clears both calls." },
    ],
    words: [...W, { term: "Lead pump", meaning: "The pump that starts first on a rising level, also called duty." }, { term: "Lag pump", meaning: "The second pump, started only when the lead cannot keep up." }],
  },

  "p-alarms": {
    goal: "Raise, acknowledge and clear process alarms, and change over to the standby pump automatically.",
    learn: ["alarm latch", "acknowledge", "flash and steady", "automatic changeover", "first response"],
    wires: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    steps: [
      "Run the PLC and tap AUTO. Pump 1 runs on the lead call.",
      "Trip pump 1 from its popover. Pump 2 takes over at once.",
      "The horn sounds and the alarm lamp flashes.",
      "Tap ACK. The horn stops, the lamp goes steady.",
      "Clear the trip. The alarm resets because it was acknowledged.",
    ],
    between: ["Every alarm should need an action, otherwise it is noise.", "Standby equipment should take over without waiting for a person.", ...SAFE],
    tour: [
      { kicker: "Scene 1 of 3 · Changeover", title: "Standby takes over", lines: [7, 8], lead: "Pump 2 runs on a lead call when pump 1 is not healthy.", body: "The level keeps being controlled. The alarm is there so someone fixes pump 1, not to stop a flood.", handsTo: ["P2_Run", "P1_OK"] },
      { kicker: "Scene 2 of 3 · Raise", title: "Latch every cause", lines: [9, 11], lead: "High-high level or either pump trip latches Alarm.", body: "ACK latches Alarm_Ack. Both clear only when every cause is gone and the alarm was acknowledged.", handsTo: ["Alarm", "Alarm_Ack", "Ack_PB"] },
      { kicker: "Scene 3 of 3 · Tell", title: "Flash, steady, quiet", lines: [12, 15], lead: "The same flasher pattern as the Foundations alarm lesson.", body: "New alarms flash and sound. Acknowledged alarms are steady and silent.", handsTo: ["Alarm_Lamp", "Horn"] },
    ],
    story: [
      { t: "running", text: "Pump 1 is emptying the well." },
      { t: "trip", text: "Pump 1's overload trips. P1_OK drops." },
      { t: "changeover", text: "Pump 2 runs on the same lead call. The level is still under control." },
      { t: "alarm", text: "Alarm latches. The horn sounds, the lamp flashes." },
      { t: "you", text: "You tap ACK. Steady lamp, silent horn, until pump 1 is reset." },
    ],
    words: [...W, { term: "Acknowledge", meaning: "An operator action that says I have seen this alarm. It does not clear the cause." }, { term: "Changeover", meaning: "Switching duty to a standby unit when the duty unit fails." }],
  },

  "m-mixer": {
    goal: "Run a batch as a sequence of steps: fill A, fill B, mix, drain, done.",
    learn: ["sequence steps", "step transitions", "one active step", "abort", "busy interlock"],
    wires: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    steps: [
      "Run the PLC and tap START. Valve A opens.",
      "At the mid switch, A closes and B opens.",
      "At the full switch, B closes and the agitator runs for 10 s.",
      "The drain opens until the vessel is empty, then the done lamp lights.",
      "Start a new batch and press Stop half way. Everything stops.",
    ],
    between: ["Exactly one step bit is on at a time.", "Every step needs an exit condition and a way out on Stop.", ...SAFE],
    tour: [
      { kicker: "Scene 1 of 3 · Steps", title: "One bit per step", lines: [2, 4], lead: "Start sets Step_A. Each step sets the next and clears itself.", body: "Step_A ends at the mid switch, Step_B at the full switch. Only one step is ever active.", handsTo: ["Step_A", "Step_B"] },
      { kicker: "Scene 2 of 3 · Time and level", title: "Mix, then drain", lines: [5, 8], lead: "Mixing lasts 10 s, draining runs until the low switch clears plus 2 s.", body: "Steps end on whatever proves the work is done: a level, a time, a position.", handsTo: ["Step_Mix", "Step_Drain"] },
      { kicker: "Scene 3 of 3 · Outputs", title: "Outputs follow steps", lines: [9, 15], lead: "Stop clears every step; each output follows its own step.", body: "Keeping outputs apart from the sequence logic makes both easy to read and to fault find.", handsTo: ["Valve_A", "Valve_B", "Agitator", "Drain_Valve"] },
    ],
    story: [
      { t: "start", text: "You tap START. Step_A sets, valve A opens." },
      { t: "mid", text: "LS_Mid turns on. Step_B sets, Step_A clears, valve B opens." },
      { t: "full", text: "LS_Full turns on. Step_Mix sets, the agitator runs." },
      { t: "10 s", text: "Mix_T is done. Step_Drain sets, the drain opens." },
      { t: "empty", text: "2 s after LS_Low clears, Done latches. The lamp lights." },
    ],
    words: [...W, { term: "Step", meaning: "One stage of a sequence, held by one bit, with actions and an exit condition." }, { term: "Transition", meaning: "The condition that ends a step and starts the next." }],
  },
};
