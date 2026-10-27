import type { LessonTeach } from "./teach";

const W = [
  { term: "Rung", meaning: "One line of ladder logic between the two power rails." },
  { term: "Scan", meaning: "One pass of the program: read inputs, solve every rung top to bottom, write outputs." },
  { term: "State machine", meaning: "A program that is in exactly one state at a time, with rules for moving to the next." },
];
const SAFE = ["Stop the PLC before you change the program.", "The rig is a simulator. Never test logic on live plant."];

/** Teaching panels for the junction, lift and fan drive lessons. */
export const TEACH_SEQUENCES: Record<string, LessonTeach> = {
  "m-traffic": {
    goal: "Run a junction as a six phase state machine that serves the side road and pedestrians on demand.",
    learn: ["step number", "EQU and MOV", "phase timers", "demand request", "all red clearance"],
    wires: [1, 2, 3, 5, 6, 7],
    steps: [
      "Run the PLC. Main green lights.",
      "Watch the red car stop at the side road line. The loop turns on.",
      "After 10 s of main green, the lights step to amber, all red, then side green.",
      "Press WAIT on the ped pole. The walk man lights in the next side green.",
      "Fail the loop detector. What happens to the side road car?",
    ],
    between: ["One number holds the whole state: easy to watch, hard to get two states at once.", "All red gives the junction time to clear.", ...SAFE],
    tour: [
      { kicker: "Scene 1 of 3 · State", title: "One number, one phase", lines: [2, 4], lead: "Step holds which phase is running.", body: "EQU(Step, 1) is true only in main green. MOV writes the next step when the phase is finished.", handsTo: ["Step"] },
      { kicker: "Scene 2 of 3 · Demand", title: "Only change when asked", lines: [3, 4], lead: "Main green moves on after its minimum time, and only if a car or a pedestrian is waiting.", body: "The main road is not stopped for nobody. Ped_Req remembers a short button press.", handsTo: ["Car_Wait", "Ped_Req"] },
      { kicker: "Scene 3 of 3 · Lights", title: "Decode the step", lines: [17, 23], lead: "Each light is a compare on Step.", body: "Because only one step can be active, two greens can never be on together.", handsTo: ["Main_Green", "Side_Green", "Walk"] },
    ],
    story: [
      { t: "step 1", text: "Main green. Green_T counts 10 s." },
      { t: "car", text: "The side car stops on the loop. Car_Wait turns on." },
      { t: "step 2 to 3", text: "Main amber for 3 s, then all red for 1 s." },
      { t: "step 4", text: "Side green and walk for 8 s. The car goes." },
      { t: "step 5 to 1", text: "Side amber, all red, back to main green." },
    ],
    words: [...W, { term: "Phase", meaning: "One state of a junction, with its own set of lights." }, { term: "Clearance", meaning: "An all red interval that lets traffic leave the junction before the next green." }],
  },

  "m-lift": {
    goal: "Answer calls on three floors, choose the direction from where the car is, and work the doors safely.",
    learn: ["request memory", "position tracking", "direction choice", "door cycle", "motion interlocks"],
    wires: [1, 2, 3, 4, 5, 6, 7],
    steps: [
      "Run the PLC. The car waits at floor 1 with its doors closed.",
      "Press the call button on floor 3. The car passes floor 2 and stops at 3.",
      "Watch the doors open, wait 3 s and close.",
      "Call floors 1 and 2 together. Which does it serve first, and why?",
      "Stick the doors open from their popover and call another floor. The car must not move.",
    ],
    between: ["Door interlocks are hardwired on real lifts; the program is a second layer.", "Collective control serves calls in the direction of travel.", ...SAFE],
    tour: [
      { kicker: "Scene 1 of 3 · Remember", title: "Calls and position", lines: [2, 7], lead: "Calls latch requests; floor sensors write Pos.", body: "A short press is never lost, and the program always knows the last floor the car was level with.", handsTo: ["Req_3", "Pos"] },
      { kicker: "Scene 2 of 3 · Arrive", title: "Stop and open", lines: [8, 16], lead: "Level with a requested floor starts a door cycle.", body: "Open, dwell 3 s, close, then end the cycle. The request for that floor clears on arrival.", precise: "Closing latches so the dwell timer resetting cannot reopen the doors.", handsTo: ["Door_Cycle", "Closing"] },
      { kicker: "Scene 3 of 3 · Move", title: "Only when it is safe", lines: [17, 20], lead: "Want_Up and Want_Down compare requests with Pos.", body: "The motor rungs also need the doors proven closed, no door cycle, and the other direction off.", handsTo: ["Motor_Up", "Motor_Down"] },
    ],
    story: [
      { t: "call", text: "You press 3. Req_3 latches. Pos is 1." },
      { t: "up", text: "Want_Up is on, the doors are closed, Motor_Up runs." },
      { t: "floor 2", text: "Floor_2 turns on and Pos becomes 2, but there is no Req_2." },
      { t: "floor 3", text: "Floor_3 with Req_3: Door_Cycle latches, the motor stops." },
      { t: "doors", text: "Open, 3 s, close. The cycle ends and Req_3 is cleared." },
    ],
    words: [...W, { term: "Interlock", meaning: "A condition that must be true before something may happen, such as doors closed before moving." }, { term: "Dwell", meaning: "The time the doors stay open at a floor." }],
  },

  "p-vsd": {
    goal: "Run a fan through a variable speed drive with a scaled speed reference and a minimum speed.",
    learn: ["run command", "analog output", "speed reference", "ramps", "minimum speed", "drive feedback"],
    wires: [1, 2, 3, 4, 6, 8, 9, 11],
    steps: [
      "Run the PLC and tap START. Watch the frequency ramp up.",
      "Open the speed pot popover and turn it down to zero. The drive holds 10 Hz.",
      "Turn it up to full. The drive ramps to 50 Hz at 10 Hz per second.",
      "Tap STOP. The drive ramps down.",
      "Remove rung 5 and set the pot to zero. Why is that bad for a fan cooled motor?",
    ],
    between: ["Drives ramp up and down, so starts are gentle.", "Use the drive's relays as feedback, not just your own command.", ...SAFE],
    tour: [
      { kicker: "Scene 1 of 3 · Run", title: "Command and permission", lines: [2, 3], lead: "Run_Cmd needs the drive's ready relay.", body: "If the drive is not ready, the program does not ask it to run.", handsTo: ["Drive_Ready", "Drive_Run"] },
      { kicker: "Scene 2 of 3 · Scale", title: "Pot to percent to reference", lines: [4, 8], lead: "Scale the pot to percent, clamp, scale back.", body: "Working in percent makes the minimum speed and any other limits easy to read and change.", precise: "0 to 27648 on the analog output gives 0 to 10 V, which the drive reads as 0 to 50 Hz.", handsTo: ["Speed_Pct", "Speed_Ref"] },
      { kicker: "Scene 3 of 3 · Feedback", title: "Trust the drive's relays", lines: [9, 9], lead: "The run lamp follows Drive_Running, not Run_Cmd.", body: "The lamp shows what the motor is really doing, including the ramp down after Stop.", handsTo: ["Run_Lamp"] },
    ],
    story: [
      { t: "start", text: "You tap START. Ready is 1, so Run_Cmd seals." },
      { t: "scale", text: "The pot reads 16588, which is 60 %." },
      { t: "ref", text: "60 % becomes 16588 on the analog output: 30 Hz." },
      { t: "ramp", text: "The drive climbs at 10 Hz per second. At 30 Hz At_Speed turns on." },
      { t: "stop", text: "STOP drops Run_Cmd. The drive ramps down to zero." },
    ],
    words: [...W, { term: "VSD", meaning: "Variable speed drive: turns fixed mains into variable frequency to change motor speed." }, { term: "Speed reference", meaning: "The speed the PLC asks for, usually on an analog signal." }],
  },

  "p-vsd-faults": {
    goal: "Handle drive faults safely: stop, show them, retry the reset a limited number of times, then lock out.",
    learn: ["fault relay", "reset pulse", "retry limit", "lockout", "flashing versus steady"],
    wires: [1, 2, 3, 5, 7, 9, 10, 11],
    steps: [
      "Run the PLC and start the fan.",
      "Open the fan popover and jam it. After 1 s the drive trips on overcurrent.",
      "Clear the jam. 5 s later the program pulses the drive's reset. Start again.",
      "Leave it jammed and start it twice more. The third trip locks out with a steady lamp.",
      "Clear the jam and press RESET to remove the lockout.",
    ],
    between: ["Automatic resets must be limited, or a fault can repeat forever.", "Never restart a machine automatically after a fault unless it is designed for it.", ...SAFE],
    tour: [
      { kicker: "Scene 1 of 3 · Stop", title: "Fault drops the command", lines: [2, 3], lead: "XIO(Drive_Fault) and XIO(Lockout) sit in the seal.", body: "After any fault the run command is gone. A person must start the fan again.", handsTo: ["Run_Cmd", "Drive_Fault"] },
      { kicker: "Scene 2 of 3 · Retry", title: "Limited automatic resets", lines: [5, 9], lead: "Count faults, wait 5 s, pulse the reset, lock out at three.", body: "A one shot counts each new fault once. Three in a row means something is really wrong.", precise: "The drive resets on the rising edge of DI2, so a pulse is enough.", handsTo: ["Trips", "Drive_Reset", "Lockout"] },
      { kicker: "Scene 3 of 3 · Show", title: "Flashing or steady", lines: [10, 12], lead: "Flashing while the program is handling it, steady when it needs a person.", body: "The operator can tell at a glance whether to wait or to come and look.", handsTo: ["Fault_Lamp"] },
    ],
    story: [
      { t: "jam", text: "The fan jams. Current climbs past 16 A." },
      { t: "1 s", text: "The drive trips: F001. Drive_Fault turns on, Run_Cmd drops." },
      { t: "count", text: "Trips counts 1. Retry_T starts." },
      { t: "5 s", text: "Drive_Reset pulses. The fault clears if the jam has." },
      { t: "third", text: "A third trip latches Lockout. Only RESET clears it." },
    ],
    words: [...W, { term: "Fault relay", meaning: "A drive output that closes while the drive is tripped." }, { term: "Lockout", meaning: "A latched state that needs a person to clear it before the machine can run." }],
  },
};
