import type { LessonTeach } from "./teach";

const W = [
  { term: "Rung", meaning: "One line of ladder logic between the two power rails." },
  { term: "Scan", meaning: "One pass of the program: read inputs, solve every rung top to bottom, write outputs." },
  { term: "Contactor", meaning: "A heavy duty relay that switches motor power when its coil is energised." },
  { term: "Interlock", meaning: "A condition that stops two actions that must never happen together." },
];
const SAFE = ["Stop the PLC before you change the program.", "The rig is a simulator. Never test logic on live plant."];

/** Teaching panels for the machines track. Wire numbers refer to each rig's wiring list. */
export const TEACH_MACHINES: Record<string, LessonTeach> = {
  "m-star-delta": {
    goal: "Start a 7.5 kW motor in star, then change over to delta after a timed run up, with a gap so the two never overlap.",
    learn: ["star and delta connections", "starting current", "changeover timer", "transition gap", "main, star and delta contactors"],
    wires: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    steps: [
      "Run the PLC and tap Start. K1 and K2 close.",
      "Open the motor card. Note the current while it runs up in star.",
      "After 5 s watch K2 open, then K3 close 100 ms later.",
      "Set Gap_T to 1 and run again. Explain why the gap matters.",
      "Change Star_T to 2000. Does the motor reach speed in star before the changeover?",
    ],
    between: ["Star-delta suits pumps and fans that start lightly loaded.", "The overload sits in the winding circuit, so set it to the phase current.", ...SAFE],
    tour: [
      { kicker: "Scene 1 of 3 · Start", title: "Main and star together", lines: [2, 5], lead: "K1 follows the seal, and K2 is on until the timer is done.", body: "With K1 and K2 closed each winding sees 230 V. Current and torque are about a third of a direct start.", handsTo: ["K1_Main", "K2_Star"] },
      { kicker: "Scene 2 of 3 · Change over", title: "Open star, wait, close delta", lines: [5, 6], lead: "When Star_T is done, K2 drops. Gap_T then waits 100 ms.", body: "The gap gives K2's contacts time to open and the arc to die before K3 closes.", precise: "Without it, for a few milliseconds both would be closed: a phase to phase short.", handsTo: ["Gap_T"] },
      { kicker: "Scene 3 of 3 · Run", title: "Delta for full power", lines: [7, 7], lead: "K3 closes with the run lamp.", body: "Each winding now sees the full 400 V. The motor delivers its rated power.", handsTo: ["K3_Delta", "Run_Lamp"] },
    ],
    story: [
      { t: "you", text: "You tap Start. Run_Seal, K1 and K2 turn on." },
      { t: "star", text: "The motor accelerates on reduced voltage, about 30 A instead of 90 A." },
      { t: "5 s", text: "Star_T is done. K2 drops." },
      { t: "+100 ms", text: "Gap_T is done. K3 closes, the run lamp lights." },
      { t: "delta", text: "A short current bump, then the motor runs at full speed." },
    ],
    words: [...W, { term: "Star", meaning: "Windings joined at one end into a star point. Each winding sees 230 V on a 400 V supply." }, { term: "Delta", meaning: "Windings joined end to end in a triangle. Each winding sees the full 400 V." }],
  },

  "m-interlock": {
    goal: "Make it impossible for star and delta to close together, even if a contactor welds shut.",
    learn: ["software interlock", "feedback from an aux contact", "welded contacts", "fault latch", "defence in depth"],
    wires: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    steps: [
      "Run the PLC and start the motor. It changes over as before.",
      "Stop it. Open the K2 popover and weld its contacts.",
      "Start again. After the star time, K3 stays open and the motor stops.",
      "Clear the weld, press Stop to reset the fault and start again.",
      "Delete XIO(K2_Fb) from rung 5, weld K2 and start. What does the breaker do?",
    ],
    between: ["Real panels also wire NC aux contacts in each coil circuit.", "A program can only trust what it can measure.", ...SAFE],
    tour: [
      { kicker: "Scene 1 of 3 · Logic", title: "Each coil blocks the other", lines: [5, 7], lead: "XIO(K3_Delta) in the star rung, XIO(K2_Star) in the delta rung.", body: "The program never asks for both. That covers mistakes in the program, not failures in the hardware.", handsTo: ["K2_Star", "K3_Delta"] },
      { kicker: "Scene 2 of 3 · Feedback", title: "Prove it opened", lines: [6, 6], lead: "XIO(K2_Fb): the gap only starts once K2's aux contact reads open.", body: "K2_Fb is wired from the contactor itself. If the main contacts weld, the aux stays closed too.", precise: "Commanding off is not the same as being off. Feedback closes that gap.", handsTo: ["K2_Fb"] },
      { kicker: "Scene 3 of 3 · Fault", title: "Stop safely", lines: [8, 10], lead: "Still closed 2 s after the command to open means welded.", body: "Weld_Fault latches and drops the seal. K1 opens and the motor stops instead of shorting the supply.", handsTo: ["Weld_Fault"] },
    ],
    story: [
      { t: "weld", text: "K2's main contacts are welded shut." },
      { t: "5 s", text: "Star_T is done. The program drops K2_Star, but K2_Fb stays 1." },
      { t: "rung 6", text: "Gap_T never starts, so K3 can never close." },
      { t: "7 s", text: "Weld_T is done. Weld_Fault latches, the seal drops, K1 opens." },
      { t: "you", text: "With the weld cleared, Stop resets the fault." },
    ],
    words: [...W, { term: "Aux contact", meaning: "A small contact on a contactor that moves with its main contacts, used to read back its real state." }, { term: "Welded contacts", meaning: "Main contacts stuck closed by an arc. The coil can drop but the contacts stay shut." }],
  },

  "m-reversing": {
    goal: "Run a motor forward or in reverse, never both, and only change direction from standstill.",
    learn: ["phase reversal", "direction interlock", "zero speed", "plugging", "two layers of interlock"],
    wires: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    steps: [
      "Run the PLC and tap FWD. The coupling turns and the green lamp lights.",
      "Tap REV while running. Nothing happens.",
      "Tap Stop. Watch the speed fall and Zero_Speed turn on.",
      "Tap REV. The motor runs the other way, blue lamp lit.",
      "Remove XIC(Zero_Speed) from rung 2 and reverse while running. Watch the current.",
    ],
    between: ["Reversing a spinning motor draws more current than starting it.", "Mechanical interlocks stop both contactors closing even if the coils both energise.", ...SAFE],
    tour: [
      { kicker: "Scene 1 of 3 · Direction", title: "One run bit each way", lines: [2, 3], lead: "Fwd_Run and Rev_Run each seal in and lock the other out.", body: "Once one direction is running, the other button does nothing until you stop.", handsTo: ["Fwd_Run", "Rev_Run"] },
      { kicker: "Scene 2 of 3 · Standstill", title: "Wait for zero speed", lines: [2, 3], lead: "A new start needs XIC(Zero_Speed).", body: "The switch on the shaft reports when it has stopped turning. Only then can either direction start.", precise: "Plugging, reversing while spinning, is used deliberately on some machines, but never by accident.", handsTo: ["Zero_Speed"] },
      { kicker: "Scene 3 of 3 · Outputs", title: "Interlock the coils too", lines: [4, 5], lead: "KF needs KR off, and KR needs KF off.", body: "A second, independent check right on the outputs, mirrored in the hardware by NC aux contacts.", handsTo: ["KF_Fwd", "KR_Rev"] },
    ],
    story: [
      { t: "you", text: "You tap FWD at standstill. Fwd_Run seals, KF closes." },
      { t: "you", text: "You tap REV. XIO(Fwd_Run) blocks it." },
      { t: "you", text: "You tap Stop. KF opens and the motor coasts down." },
      { t: "zero", text: "The shaft stops. Zero_Speed turns on." },
      { t: "you", text: "You tap REV. Rev_Run seals, KR closes, the motor turns the other way." },
    ],
    words: [...W, { term: "Plugging", meaning: "Reversing a motor while it still turns. It brakes hard and draws a very large current." }, { term: "Zero speed switch", meaning: "A sensor on the shaft that turns on when it has stopped." }],
  },
};
