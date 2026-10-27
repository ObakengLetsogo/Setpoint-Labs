import type { LessonTeach } from "./teach";

const W = [
  { term: "Rung", meaning: "One line of ladder logic between the two power rails." },
  { term: "Scan", meaning: "One pass of the program: read inputs, solve every rung top to bottom, write outputs." },
];
const SAFE = ["Stop the PLC before you change the program.", "The rig is a simulator. Never test logic on live plant."];
const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Teaching panels for the Wiring and Commissioning and the Advanced tracks. */
export const TEACH_ADVANCED: Record<string, LessonTeach> = {
  "w-schematics": {
    goal: "Read the starter's schematic, find every wire on the bench and run the circuit it describes.",
    learn: ["device tags", "supply rails", "terminal numbers", "wire numbers", "drawing to bench"],
    wires: ALL,
    steps: [
      "Open the wiring view and play it through. Each wire is one line on the drawing.",
      "Find S1, S2, S0 and F2 on the bench. Each one lands on a PLC input.",
      "Find K1, H1 and H2. Each one hangs off a PLC output and returns to 0 V.",
      "Run the PLC, tap Start and let go. K1 stays in through the seal.",
      "Tap Stop. Name every device the signal passed through.",
    ],
    between: ["A schematic shows connections, a layout drawing shows positions.", ...SAFE],
    tour: [
      { kicker: "Scene 1 of 2 · Inputs", title: "Left rail to the PLC", lines: [2, 2], lead: "24 V runs through each button into an input.", body: "S1 Start, S2 Stop, F2's 95-96 contact and the E-stop S0 all switch the same supply into I0.0 to I0.3.", handsTo: ["Start_PB", "Stop_PB", "Overload_OK", "EStop_OK"] },
      { kicker: "Scene 2 of 2 · Outputs", title: "PLC to the coils", lines: [3, 4], lead: "Each output sources 24 V into a coil or lamp.", body: "Q0.0 feeds K1's A1. A2 returns to 0 V. Without the return nothing happens, however good the program is.", handsTo: ["Motor_Run", "Run_Lamp", "Fault_Lamp"] },
    ],
    story: [
      { t: "drawing", text: "You trace S1 from the 24 V rail to I0.0." },
      { t: "you", text: "You tap Start. I0.0 goes to 1 and the seal closes." },
      { t: "K1", text: "Q0.0 energises K1 between A1 and A2." },
    ],
    words: [...W, { term: "Device tag", meaning: "A letter and number naming a device on the drawing: S1, K1, F2, H1." }, { term: "Schematic", meaning: "A drawing of how things are connected, not where they are." }],
  },

  "w-power-control": {
    goal: "Tell the 400 V power circuit from the 24 V control circuit, and watch the overload link them.",
    learn: ["power circuit", "control circuit", "starting current", "overload protection", "current transducer"],
    wires: [1, 2, 3, 4, 5, 6, 7, 8, 9, 11],
    steps: [
      "Run the PLC and tap Start. The beacon flashes on for the starting current.",
      "Watch Motor_Amps settle near 9, under 1 A, once the motor is at speed.",
      "Jam the shaft from the motor popover. The current climbs and stays high.",
      "After a few seconds the overload trips. Its contact opens and the fault lamp lights.",
      "Clear the jam, reset the overload and start again.",
    ],
    between: ["Starting current is five to seven times rated current for a direct on line start.", ...SAFE],
    tour: [
      { kicker: "Scene 1 of 2 · Current", title: "Measured, not guessed", lines: [4, 4], lead: "GRT(Motor_Amps, 40) lights the beacon above 4 A.", body: "The transducer turns motor current into a number. At start it is high, then falls as the motor reaches speed.", handsTo: ["Motor_Amps", "Beacon"] },
      { kicker: "Scene 2 of 2 · Overload", title: "Where the circuits meet", lines: [5, 5], lead: "The overload heats with current and trips.", body: "It sits in the power circuit, but its 95-96 contact sits in the control circuit and tells the PLC.", handsTo: ["Overload_OK", "Fault_Lamp"] },
    ],
    story: [
      { t: "start", text: "K1 closes and current jumps to over 15 A." },
      { t: "speed", text: "The motor speeds up and the current falls." },
      { t: "jam", text: "The shaft stops. Current stays high, the overload heats and trips." },
    ],
    words: [...W, { term: "Power circuit", meaning: "The high voltage path from supply to motor." }, { term: "Control circuit", meaning: "The low voltage path through buttons, PLC and coils." }],
  },

  "w-terminals": {
    goal: "Read a device's terminal numbers and use a normally closed stop correctly.",
    learn: ["13-14 normally open", "11-12 normally closed", "A1-A2 coil", "95-96 overload", "fail safe wiring"],
    wires: ALL,
    steps: [
      "Look at the wiring view. Name each terminal pair and whether it is open or closed at rest.",
      "Run the PLC. I0.1 reads 1 with Stop at rest.",
      "Tap Start, then Stop. The motor stops because I0.1 goes to 0.",
      "Press the E-stop. The fault lamp lights.",
    ],
    between: ["The units digit gives the contact type, the tens digit numbers the contact.", ...SAFE],
    tour: [
      { kicker: "Scene 1 of 2 · Normally closed", title: "1 at rest", lines: [2, 2], lead: "XIC(Stop_PB) passes while Stop is not pressed.", body: "A normally closed stop is read with a normally open contact in the program. It is the most common source of confusion on site.", handsTo: ["Stop_PB"] },
      { kicker: "Scene 2 of 2 · Safety inputs", title: "Open means stop", lines: [4, 4], lead: "Overload 95-96 and the E-stop both open on a fault.", body: "A broken wire reads the same as the fault, so the machine stops either way.", handsTo: ["Overload_OK", "EStop_OK", "Fault_Lamp"] },
    ],
    story: [
      { t: "rest", text: "Stop's closed contact holds I0.1 at 1." },
      { t: "you", text: "You press Stop. The contact opens, I0.1 falls to 0, the seal drops." },
    ],
    words: [...W, { term: "Normally closed", meaning: "Closed at rest, opens when operated. Terminals ending 1-2." }, { term: "Normally open", meaning: "Open at rest, closes when operated. Terminals ending 3-4." }],
  },

  "w-multimeter": {
    goal: "Find a broken wire with a voltmeter, repair it and prove the repair.",
    learn: ["voltage testing", "0 V reference", "half split", "open circuit", "prove the repair"],
    wires: ALL,
    steps: [
      "Break the stop wire from the Stop popover. Run the PLC and try to start. Nothing happens.",
      "In the multimeter put black on 0 V and red on L+ 24V. You should read 24 V.",
      "Move red to the Stop button's wired terminal: 24 V. Move it to I0.1: 0 V.",
      "The fault is between those two points. Clear the fault to repair the wire.",
      "Start the motor to prove the repair.",
    ],
    between: ["Always prove the meter on a known live point before trusting a 0 V reading.", ...SAFE],
    tour: [
      { kicker: "Scene 1 of 2 · Symptom", title: "It will not start", lines: [2, 2], lead: "The seal needs I0.1 at 1.", body: "With the wire broken I0.1 reads 0, which looks exactly like Stop being pressed.", handsTo: ["Stop_PB"] },
      { kicker: "Scene 2 of 2 · Clue", title: "The fault lamp", lines: [4, 4], lead: "XIO(Stop_PB) lights the fault lamp.", body: "The program tells you the stop circuit is open. The meter tells you where.", handsTo: ["Fault_Lamp"] },
    ],
    story: [
      { t: "meter", text: "24 V at the supply. Good meter, live supply." },
      { t: "meter", text: "24 V at the button, 0 V at the PLC. The wire is open." },
      { t: "repair", text: "Wire repaired. The motor starts." },
    ],
    words: [...W, { term: "Open circuit", meaning: "A break in a circuit. No current flows and the far side reads 0 V." }, { term: "Half split", meaning: "Measuring in the middle of a circuit to halve where the fault can be." }],
  },

  "w-loop-check": {
    goal: "Prove every input and output from the field device to the PLC, then bump the motor.",
    learn: ["loop check", "input proving", "output proving", "two hand bump", "check sheet"],
    wires: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    steps: [
      "Run the PLC. Tap Start: the run lamp lights.",
      "Tap Stop, trip the overload and press the E-stop, one at a time: the fault lamp lights each time.",
      "Reset everything. Tap AUX: the beacon lights.",
      "Hold Start and AUX together to bump the motor. Check it turns the right way.",
    ],
    between: ["Tick each loop on a check sheet as you prove it.", ...SAFE],
    tour: [
      { kicker: "Scene 1 of 2 · Inputs", title: "Every input lights something", lines: [2, 4], lead: "Start, Stop, the safeties and AUX each drive a lamp.", body: "You see each signal arrive without the motor ever moving.", handsTo: ["Run_Lamp", "Fault_Lamp", "Beacon"] },
      { kicker: "Scene 2 of 2 · Bump", title: "Two hands", lines: [5, 5], lead: "Motor_Run needs Start and AUX together.", body: "A short bump checks rotation before the machine is coupled to its load.", handsTo: ["Motor_Run"] },
    ],
    story: [
      { t: "inputs", text: "Five inputs proved, one lamp at a time." },
      { t: "bump", text: "Two hands, a short turn of the shaft, direction checked." },
    ],
    words: [...W, { term: "Loop check", meaning: "Proving a signal from the field device through the wiring to the PLC, or back." }, { term: "Bump", meaning: "A very short run to check a motor turns the right way." }],
  },

  "w-commissioning": {
    goal: "Test a finished starter against its spec: start warning, E-stop and no automatic restart.",
    learn: ["specification", "start warning", "E-stop test", "manual restart", "sign-off"],
    wires: [1, 2, 3, 4, 5, 6, 7, 8, 9, 11],
    steps: [
      "Run the PLC and tap Start. The beacon sounds for 3 s before K1 pulls in.",
      "With the motor running, press the E-stop. It stops at once.",
      "Release the E-stop. The motor must stay off.",
      "Tap Start again. The warning runs and the motor starts.",
    ],
    between: ["Record each test, the result and who witnessed it.", ...SAFE],
    tour: [
      { kicker: "Scene 1 of 2 · Warning", title: "Three seconds first", lines: [2, 4], lead: "Start latches Warn, Warn_T times 3 s.", body: "Only a finished warning can begin the seal, so nobody near the machine is surprised.", handsTo: ["Warn", "Warn_T", "Beacon"] },
      { kicker: "Scene 2 of 2 · Restart", title: "Never by itself", lines: [4, 6], lead: "The E-stop drops the seal.", body: "Releasing it does not bring the seal back. Only a new Start, and a new warning, can.", handsTo: ["Run_Seal", "EStop_OK"] },
    ],
    story: [
      { t: "start", text: "Beacon for 3 s, then K1." },
      { t: "E-stop", text: "Stopped at once." },
      { t: "release", text: "Still stopped. Test passed." },
    ],
    words: [...W, { term: "Commissioning", meaning: "Proving a finished machine works to its specification before handover." }, { term: "Automatic restart", meaning: "A machine starting by itself when a stop condition clears. Not allowed after an E-stop." }],
  },

  "a-structured-text": {
    goal: "Write the motor starter in structured text and compare it with the ladder.",
    learn: ["assignment", "AND OR NOT", "VAR block", "function block call", "T# literals"],
    wires: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    steps: [
      "The code card opens in structured text. Read each line against the ladder.",
      "Run the PLC and tap Start. Watch each line show its value.",
      "After 3 s the run lamp lights from Run_T.Q.",
      "Switch to ladder to see the same program as rungs.",
      "Change T#3s to T#1s and run again.",
    ],
    between: ["Structured text keywords are not case sensitive, so a tag cannot be called If or Case.", ...SAFE],
    tour: [
      { kicker: "Scene 1 of 2 · Expression", title: "A rung on one line", lines: [6, 7], lead: "The seal-in is one boolean expression.", body: "OR replaces a parallel branch, AND replaces contacts in series, NOT replaces XIO.", handsTo: ["Run_Seal", "Motor_Run"] },
      { kicker: "Scene 2 of 2 · Timer", title: "Call the block", lines: [8, 9], lead: "Run_T(IN := Motor_Run, PT := T#3s).", body: "The instance is declared in VAR. Its output Q is the done bit.", handsTo: ["Run_T", "Run_Lamp"] },
    ],
    story: [
      { t: "you", text: "You tap Start. Run_Seal goes TRUE." },
      { t: "timer", text: "Run_T counts to 3 s and Q goes TRUE." },
    ],
    words: [...W, { term: "Structured text", meaning: "The IEC 61131-3 text language, similar to Pascal." }, { term: "Instance", meaning: "One copy of a function block with its own memory." }],
  },

  "a-function-blocks": {
    goal: "Count motor starts with R_TRIG and CTU, and reset the count after a service.",
    learn: ["function block", "instance", "R_TRIG", "CTU", "reset input"],
    wires: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    steps: [
      "Run the PLC. Start and stop the motor three times.",
      "On the third start the service beacon lights.",
      "Tap AUX to reset the counter. The beacon goes out.",
      "Switch to ladder and find the same blocks as ONS, CTU and RES.",
    ],
    between: ["Every instance keeps its own memory, so declare one per use.", ...SAFE],
    tour: [
      { kicker: "Scene 1 of 2 · Edge", title: "One pulse per start", lines: [10, 10], lead: "Start_Edge(CLK := Motor_Run).", body: "R_TRIG's Q is TRUE for one scan when Motor_Run rises.", handsTo: ["Start_Edge"] },
      { kicker: "Scene 2 of 2 · Count", title: "Three and done", lines: [11, 12], lead: "Starts(CU := Start_Edge.Q, R := Aux_PB, PV := 3).", body: "Q goes TRUE at three. R clears the count.", handsTo: ["Starts", "Beacon"] },
    ],
    story: [
      { t: "starts", text: "One, two, three. Starts.Q goes TRUE." },
      { t: "service", text: "AUX resets the count." },
    ],
    words: [...W, { term: "Function block", meaning: "Reusable logic with inputs, outputs and its own memory." }, { term: "R_TRIG", meaning: "Rising edge detector: TRUE for one scan when its input goes from FALSE to TRUE." }],
  },

  "a-comms": {
    goal: "Run a drive as if over a network, with a heartbeat and a reply watchdog.",
    learn: ["cyclic I/O", "control and status words", "heartbeat", "watchdog", "comms fault"],
    wires: [1, 2, 3, 4, 5, 7, 8, 9, 11],
    steps: [
      "Run the PLC and tap Start. The drive ramps up.",
      "Watch Heartbeat climb once a second.",
      "Cut the mains from the drive popover. The drive stops replying running.",
      "After 8 s the comms fault latches and the run command drops.",
      "Restore the mains and tap RESET.",
    ],
    between: ["A watchdog turns silence into a fault you can see.", ...SAFE],
    tour: [
      { kicker: "Scene 1 of 2 · Heartbeat", title: "I am alive", lines: [5, 6], lead: "Beat_T restarts itself every second.", body: "Each time it finishes, Heartbeat goes up by one. A changing number proves the sender is running.", handsTo: ["Beat_T", "Heartbeat"] },
      { kicker: "Scene 2 of 2 · Watchdog", title: "No reply, no run", lines: [7, 9], lead: "Commanded to run but not running for 8 s.", body: "Comms_Fault latches and the run command drops until RESET.", handsTo: ["Reply_T", "Comms_Fault"] },
    ],
    story: [
      { t: "run", text: "Drive_Run on, the drive replies running." },
      { t: "loss", text: "No reply for 8 s. Comms fault." },
    ],
    words: [...W, { term: "Heartbeat", meaning: "A value that changes regularly to prove a device is alive." }, { term: "Watchdog", meaning: "A timer that faults if an expected event does not arrive in time." }],
  },

  "a-hmi": {
    goal: "Prepare the tags an HMI needs: a percent level, one state number and a latched alarm.",
    learn: ["HMI tags", "state number", "scaling", "alarm latch", "acknowledge"],
    wires: [1, 2, 3, 4, 5, 6, 7, 8],
    steps: [
      "Run the PLC. State is 0.",
      "Tap AUTO. State becomes 1, then 2 while the tank fills.",
      "Tap OFF and turn the demand up. Below 15 % State becomes 3 and the alarm lamp lights.",
      "Tap AUTO to refill. Once above 15 %, tap OFF to acknowledge the alarm.",
    ],
    between: ["Prepare tags in the PLC. The screen should only display them.", ...SAFE],
    tour: [
      { kicker: "Scene 1 of 2 · State", title: "One number for the screen", lines: [9, 13], lead: "MOV(0, State) then later rungs raise it.", body: "The last true rung wins, so the highest priority goes last.", handsTo: ["State"] },
      { kicker: "Scene 2 of 2 · Alarm", title: "Stays until seen and clear", lines: [12, 15], lead: "Low_Alarm latches below 15 %.", body: "It clears only when acknowledged and the level is back.", handsTo: ["Low_Alarm", "Alarm_Lamp"] },
    ],
    story: [
      { t: "auto", text: "State 2, filling." },
      { t: "low", text: "State 3, low level alarm." },
      { t: "ack", text: "Level back, OFF pressed, alarm cleared." },
    ],
    words: [...W, { term: "HMI", meaning: "Human machine interface, the operator screen." }, { term: "SCADA", meaning: "Supervisory control and data acquisition: screens, alarms and history across a site." }],
  },

  "a-fault-finding": {
    goal: "Build diagnostics that catch a stuck button and a stalled motor before the overload does.",
    learn: ["diagnostics", "plausibility check", "stall detection", "latched fault", "reset after cause"],
    wires: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    steps: [
      "Stick the Start button from its popover. Run the PLC and wait 5 s. The beacon lights.",
      "Clear the stuck button and tap AUX to reset.",
      "Start the motor, then jam the shaft. After 1.5 s the motor stops and the beacon lights.",
      "Clear the jam and tap AUX.",
    ],
    between: ["A diagnostic is only useful if it says what it saw.", ...SAFE],
    tour: [
      { kicker: "Scene 1 of 2 · Stuck button", title: "Nobody holds Start for 5 s", lines: [4, 5], lead: "Held_T times while Start reads pressed.", body: "Too long means the contact is stuck. Start_Stuck latches and blocks the seal.", handsTo: ["Held_T", "Start_Stuck"] },
      { kicker: "Scene 2 of 2 · Stall", title: "Too much current for too long", lines: [6, 7], lead: "Over 6 A for 1.5 s while running.", body: "Stalled latches and drops the seal before the overload has to trip.", handsTo: ["Stall_T", "Stalled"] },
    ],
    story: [
      { t: "stuck", text: "Start reads pressed for 5 s. Diagnostic latched." },
      { t: "jam", text: "Current stays high. Stall caught, motor stopped." },
    ],
    words: [...W, { term: "Plausibility check", meaning: "Comparing a signal with what is physically likely." }, { term: "Stall", meaning: "A motor powered but not turning. It draws high current." }],
  },

  "a-documentation": {
    goal: "Hand over a program that explains itself, with run hours and start counts for maintenance.",
    learn: ["rung comments", "drawing references", "tag naming", "run hours", "start counts"],
    wires: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    steps: [
      "Read the comments. Each names a purpose and a drawing.",
      "Run the PLC and run the motor for at least 5 s.",
      "Watch Run_Secs count up.",
      "Stop and start again. Starts reaches 2.",
    ],
    between: ["Write the comment for the person who opens the program at 3 a.m.", ...SAFE],
    tour: [
      { kicker: "Scene 1 of 2 · Comments", title: "Say why, not what", lines: [1, 4], lead: "Each block starts with its purpose and drawing.", body: "The rung already says what it does. The comment says why and where to look.", handsTo: [] },
      { kicker: "Scene 2 of 2 · Maintenance", title: "Numbers for the log", lines: [6, 10], lead: "Run seconds and starts.", body: "Both tell maintenance when the motor is due a service.", handsTo: ["Run_Secs", "Starts"] },
    ],
    story: [
      { t: "run", text: "Run_Secs counts each second of running." },
      { t: "start", text: "Starts adds one per start." },
    ],
    words: [...W, { term: "Handover", meaning: "Passing a finished machine and its documents to the owner." }, { term: "Run hours", meaning: "Total running time, used to plan maintenance." }],
  },
};
