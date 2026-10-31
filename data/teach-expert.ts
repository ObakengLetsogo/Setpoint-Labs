import type { LessonTeach } from "./teach";

// Teaching panels for the Expert lessons added from the Curriculum and Lecture Guide.

const BETWEEN = ["Stop the PLC before you change the program.", "Edits apply on the next Run.", "Read the code card: every line shows its value as it runs."];

export const TEACH_EXPERT: Record<string, LessonTeach> = {
  "e-structure": {
    goal: "Structure a machine as a standard state machine, so every machine on a plant reads and behaves the same.",
    learn: ["state machines", "PackML states", "one place for transitions", "outputs decided by state", "plant standards"],
    wires: [1, 2, 3, 4, 6, 7],
    steps: [
      "Switch the PLC to RUN. State reads 1, Stopped.",
      "Tap Start: 2, Starting, for 2 s, then 3, Execute.",
      "Press Stop: 4, Stopping, for 3 s with the belt running empty, then 1.",
      "Start again, then press the E-stop: 5, Aborted. Release it and tap Start to return to Stopped.",
      "Add a state 6, Held, entered from Execute while the exit eye is blocked, and left when it clears.",
    ],
    between: BETWEEN,
    tour: [
      { kicker: "Scene 1 of 3 · States", title: "Named in one place", lines: [1, 2], lead: "Five states, numbered and named at the top.", body: "PackML defines 17 states for packaging machines; most plants use a subset, the same on every machine.", handsTo: ["State"] },
      { kicker: "Scene 2 of 3 · Transitions", title: "Where each state may go", lines: [15, 22], lead: "Each CASE arm only lists its own way out.", body: "You can read any machine's behaviour from this block alone, and SCADA can show State with one standard faceplate.", handsTo: ["State"] },
      { kicker: "Scene 3 of 3 · Outputs", title: "Decided by state", lines: [24, 27], lead: "Outputs are set after the state machine, from the state.", body: "No output is written in two places, so there is never a fight over who controls it.", precise: "ISA-TR88.00.02 (PackML) also standardises the tags a machine exposes, so lines from different builders can talk to one MES.", handsTo: ["Belt_Run"] },
    ],
    story: [
      { t: "1 Stopped", text: "Waiting for Start." },
      { t: "2 Starting", text: "Checks before moving." },
      { t: "3 Execute", text: "Producing." },
      { t: "4 Stopping", text: "Running empty." },
      { t: "5 Aborted", text: "E-stop or fault." },
    ],
    words: [{ term: "State machine", meaning: "A program that is always in exactly one named state, with defined moves between them." }, { term: "PackML", meaning: "A standard state model for machines, from ISA-TR88." }, { term: "Transition", meaning: "A move from one state to another, on a condition." }],
  },

  "e-arrays": {
    goal: "Use arrays, indexes and FOR loops: keep the last five readings and work out their average.",
    learn: ["arrays", "indexes", "ring buffers", "MOD", "FOR loops"],
    wires: [1, 2, 3, 4, 6, 7],
    steps: [
      "Switch the PLC to RUN with the infeed on. Tap Start.",
      "Watch Gap[0] to Gap[4] fill, about 2500 ms each, and Idx wrap 0 to 4 and back.",
      "Turn the infeed off for 6 s, then on again.",
      "The long gap lifts Avg_Gap over 3000: Feed_Slow and the red lamp.",
      "After five normal cartons the long gap is pushed out and the alarm clears.",
    ],
    between: BETWEEN,
    tour: [
      { kicker: "Scene 1 of 3 · The array", title: "Five values, one name", lines: [3, 3], lead: "Gap[0] to Gap[4].", body: "In TIA Portal: Array[0..4] of Int in a data block. In Studio 5000: an INT[5] tag.", handsTo: ["Gap[0]"] },
      { kicker: "Scene 2 of 3 · Indirect", title: "The index picks the slot", lines: [12, 15], lead: "Gap[Idx] writes wherever Idx points.", body: "MOD 5 wraps the index, so the oldest value is always the one overwritten.", precise: "An index outside the bounds faults a real PLC. Here it stops the simulation with a message.", handsTo: ["Idx"] },
      { kicker: "Scene 3 of 3 · The loop", title: "Work through them all", lines: [17, 19], lead: "FOR i := 0 TO 4 adds every slot.", body: "Loops run inside one scan. Keep them short: a long loop makes the scan slow.", handsTo: ["Avg_Gap", "Feed_Slow"] },
    ],
    story: [
      { t: "steady", text: "Five gaps of about 2.5 s." },
      { t: "starved", text: "One gap of 8 s: the average passes 3 s." },
      { t: "recovered", text: "Five normal gaps later, it clears." },
    ],
    words: [{ term: "Array", meaning: "Numbered values of one type under one name." }, { term: "Index", meaning: "The number that picks one element of an array." }, { term: "Ring buffer", meaning: "An array whose index wraps round, keeping the newest values." }, { term: "MOD", meaning: "The remainder after division: 5 MOD 5 is 0." }],
  },

  "e-recipes": {
    goal: "Drive a batch sequence from a recipe table, and keep a batch log.",
    learn: ["recipes", "data driven sequences", "tables as arrays", "batch logging", "changing products without code"],
    wires: [1, 2, 3, 4, 5, 6, 7, 8],
    steps: [
      "Switch the PLC to RUN and tap Start. Recipe 2: A 3 s, B 5 s, mix 6 s, then drain.",
      "When it finishes, Count is 1 and Log[0] holds the batch time.",
      "Change line 17 to Recipe := 1 and run again.",
      "A different product, from the same sequence.",
      "Add a fourth recipe: one new row of numbers, and allow Recipe := 4.",
    ],
    between: BETWEEN,
    tour: [
      { kicker: "Scene 1 of 3 · The table", title: "Settings in arrays", lines: [11, 14], lead: "One array per setting; the row is the recipe.", body: "On a real plant the table lives in a data block, loaded from the HMI or a recipe database.", handsTo: ["FillA[2]"] },
      { kicker: "Scene 2 of 3 · The sequence", title: "Times from the table", lines: [22, 29], lead: "PT := FillA[Recipe] picks this product's time.", body: "The sequence never changes for a new product; only the numbers do.", handsTo: ["Step", "Recipe"] },
      { kicker: "Scene 3 of 3 · The log", title: "What happened", lines: [30, 30], lead: "Each batch's time goes into the next row of the log.", body: "Batch records prove what was made and how, and are required in food, beverage and pharmaceutical plants.", precise: "ISA-88 is the standard for batch control: recipes, procedures and the records they produce.", handsTo: ["Log[0]", "Count"] },
    ],
    story: [
      { t: "recipe 2", text: "A 3 s, B 5 s, mix 6 s." },
      { t: "logged", text: "Count 1, Log[0] the batch time." },
      { t: "recipe 1", text: "A 5 s, B 3 s, mix 4 s: same code." },
    ],
    words: [{ term: "Recipe", meaning: "The set of values that makes one product." }, { term: "Batch", meaning: "One run of a recipe, from start to finish." }, { term: "ISA-88", meaning: "The international standard for batch control." }],
  },

  "e-testing": {
    goal: "Test logic before site: run it against a simulation and build monitors that check its rules every scan.",
    learn: ["simulation testing", "invariants", "self-checking code", "test coverage", "FAT before site"],
    wires: [1, 2, 3, 4, 5, 6, 7],
    steps: [
      "Switch the PLC to RUN. Run forward, stop, wait for zero speed, run reverse.",
      "Checks climbs every scan; Violations stays empty.",
      "Break the interlock on lines 11 and 12, then press FWD and REV together.",
      "Violations counts the broken rule and Test_Fail latches.",
      "Put the interlock back. Think of a third rule worth checking, and add it.",
    ],
    between: BETWEEN,
    tour: [
      { kicker: "Scene 1 of 3 · The logic", title: "What should happen", lines: [5, 12], lead: "Sealed directions, zero speed to start, each blocks the other.", body: "This is the program under test.", handsTo: ["KF_Fwd", "KR_Rev"] },
      { kicker: "Scene 2 of 3 · The rules", title: "What must never happen", lines: [13, 16], lead: "Two invariants, checked every scan.", body: "Writing the rules separately from the logic catches mistakes the logic itself cannot see.", handsTo: ["Checks", "Violations"] },
      { kicker: "Scene 3 of 3 · Coverage", title: "Try to break it", lines: [17, 17], lead: "A test only proves what it exercised.", body: "List the cases: every button, every fault, every order. Then run them all, on the simulator first, then at the factory acceptance test.", precise: "PLCSIM in TIA Portal and Emulate 5000 for Logix run real projects without hardware.", handsTo: ["Test_Fail"] },
    ],
    story: [
      { t: "normal", text: "Forward, stop, reverse: no violations." },
      { t: "bug", text: "Interlock removed: both contactors on." },
      { t: "caught", text: "The monitor counts it and latches Test_Fail." },
    ],
    words: [{ term: "Invariant", meaning: "A rule that must always be true." }, { term: "Simulation", meaning: "Running the program against a model instead of the real plant." }, { term: "FAT", meaning: "Factory acceptance test: proving the system before it goes to site." }],
  },

  "e-diagnostics": {
    goal: "Build diagnostics operators can use: an event log with times and a first-out alarm.",
    learn: ["event logs", "first-out alarms", "edge detection", "timestamps", "root cause"],
    wires: [1, 2, 3, 4, 5, 6, 7, 8],
    steps: [
      "Switch the PLC to RUN and tap Start.",
      "Trip pump 1. First_Out = 1; Ev[0] = 1 with its time in EvT[0].",
      "Trip pump 2. Ev[1] = 2 is logged, but First_Out stays 1.",
      "Clear both trips and press ACK. First_Out clears; the log stays.",
      "Add a code 4 for the low float uncovered while a pump runs.",
    ],
    between: BETWEEN,
    tour: [
      { kicker: "Scene 1 of 3 · Events", title: "Edges, not levels", lines: [21, 24], lead: "An event is the moment a signal changes.", body: "F_TRIG on a healthy signal fires once when it fails, so each fault is logged once.", handsTo: ["Code"] },
      { kicker: "Scene 2 of 3 · The log", title: "What and when", lines: [25, 28], lead: "Code and time, side by side, in a ring of eight.", body: "With times, a cascade can be read in order: what failed first, and how long before the next.", handsTo: ["Ev[0]", "EvT[0]"] },
      { kicker: "Scene 3 of 3 · First-out", title: "The real cause", lines: [29, 31], lead: "The first event since ACK stays shown.", body: "When one trip causes others, the first-out points at the cause, not the symptoms.", precise: "PLCs keep their own diagnostic buffer too: TIA Portal's diagnostics buffer and Logix's controller fault log.", handsTo: ["First_Out"] },
    ],
    story: [
      { t: "pump 1 trips", text: "Event 1, first-out 1." },
      { t: "pump 2 trips", text: "Event 2 logged; first-out still 1." },
      { t: "ACK", text: "First-out clears; history kept." },
    ],
    words: [{ term: "Event log", meaning: "A record of what happened and when." }, { term: "First-out", meaning: "The first alarm in a cascade, usually the cause." }, { term: "Timestamp", meaning: "The time recorded with an event." }],
  },

  "e-remote-io": {
    goal: "Protect a plant from stale remote data: watch a heartbeat, not just the network status.",
    learn: ["remote I/O", "stale data", "heartbeats", "watchdog timers", "failing safe on comms loss"],
    wires: [1, 2, 3, 4, 6, 7],
    steps: [
      "Switch the PLC to RUN and tap Start. Watch Res_HB count up once a second.",
      "Cut the fibre. RIO2_OK drops, Comms_Fault comes on, and the pump stops.",
      "Clear it, Start again, then choose the stale gateway fault.",
      "RIO2_OK stays on, but Res_HB stops. After 3 s Comms_Fault stops the pump.",
      "Delete the heartbeat from rung 4 and try again: the reservoir overflows on a frozen reading.",
    ],
    between: BETWEEN,
    tour: [
      { kicker: "Scene 1 of 3 · Stale data", title: "The last value that arrived", lines: [6, 7], lead: "The PLC fills on Res_Level, which comes over the network.", body: "If the link fails, many devices hold the last value. A level that never changes looks perfectly normal.", handsTo: ["Res_Level"] },
      { kicker: "Scene 2 of 3 · Heartbeat", title: "Prove it is alive", lines: [3, 4], lead: "The remote controller adds one every second.", body: "If the number stops changing for 3 s, the data is not fresh, whatever any status bit says.", handsTo: ["Res_HB", "HB_T"] },
      { kicker: "Scene 3 of 3 · Fail safe", title: "Decide what loss means", lines: [5, 7], lead: "Comms fault: stop the pump and alarm.", body: "For each remote signal, decide the safe action on loss: stop, hold last speed, or run to a timer. Write it down and test it.", precise: "PROFINET and EtherNet/IP have their own watchdogs, but an end-to-end heartbeat also covers gateways, converters and the remote program itself.", handsTo: ["Comms_Fault"] },
    ],
    story: [
      { t: "normal", text: "Heartbeat counting; pump fills 50 to 90 %." },
      { t: "fibre cut", text: "Status drops; pump stops." },
      { t: "stale gateway", text: "Status lies; heartbeat freezes; pump stops after 3 s." },
    ],
    words: [{ term: "Remote I/O", meaning: "Input and output modules far from the CPU, linked by a network." }, { term: "Heartbeat", meaning: "A value that changes regularly to prove a device is alive." }, { term: "Watchdog", meaning: "A timer that faults when an expected change does not happen." }, { term: "Stale data", meaning: "A value that has stopped updating." }],
  },

  "e-opcua": {
    goal: "Connect a PLC to SCADA and IT systems with OPC UA and MQTT, and validate every value written in.",
    learn: ["OPC UA", "MQTT", "publishing tags", "write validation", "keeping the last good value"],
    wires: [1, 2, 3, 4, 6, 7],
    steps: [
      "Switch the PLC to RUN. Press the SCADA start command on the SCADA popover.",
      "The station fills to SCADA_SP, 70 %. OPC_Level shows the published level.",
      "Move the SCADA setpoint to 120 %. SP_Reject comes on; Fill_SP stays at 70.",
      "Set it to 50 %: accepted, and the station now fills to 50.",
      "Think about what else should be checked: how fast a setpoint may change, and who may change it.",
    ],
    between: BETWEEN,
    tour: [
      { kicker: "Scene 1 of 3 · OPC UA", title: "Typed, named, secure", lines: [2, 2], lead: "SCADA writes SCADA_Start and SCADA_SP over OPC UA.", body: "OPC UA carries names, types and units, encrypts traffic and checks certificates, across any PLC brand.", handsTo: ["SCADA_Start"] },
      { kicker: "Scene 2 of 3 · Validate", title: "A request, not a command", lines: [3, 4], lead: "Only 0 to 100 % is copied in.", body: "A bad value keeps the last good setpoint and raises a flag. Never let an outside system put an impossible value into control.", handsTo: ["SCADA_SP", "Fill_SP", "SP_Reject"] },
      { kicker: "Scene 3 of 3 · Publish", title: "Data for everyone", lines: [10, 10], lead: "OPC_Level, scaled to percent.", body: "Publish clean, scaled values with clear names. MQTT sends the same data to cloud dashboards through a broker.", precise: "The S7-1500 and many other PLCs have an OPC UA server built in; Sparkplug B is a common MQTT format for industry.", handsTo: ["OPC_Level"] },
    ],
    story: [
      { t: "start", text: "SCADA starts the station at 70 %." },
      { t: "bad value", text: "120 % rejected; 70 % kept." },
      { t: "good value", text: "50 % accepted." },
    ],
    words: [{ term: "OPC UA", meaning: "A secure, vendor neutral standard for reading and writing industrial data." }, { term: "MQTT", meaning: "A light publish and subscribe protocol, common for cloud and IoT." }, { term: "Broker", meaning: "The MQTT server that passes messages between publishers and subscribers." }, { term: "Validation", meaning: "Checking a value is sensible before using it." }],
  },

  "e-cyber": {
    goal: "Defend a PLC against bad writes from the network, and know the wider defences around it.",
    learn: ["IEC 62443", "zones and conduits", "range checks", "rate limits", "lockout and local reset"],
    wires: [1, 2, 3, 5],
    steps: [
      "Switch the PLC to RUN. Turn on the rogue device fault on SCADA.",
      "It writes 999 % and spams start. Rejects climbs; after 3, Remote_Lock and the red lamp.",
      "Fill_SP never takes the bad value.",
      "Turn the rogue device off. Remote control stays locked.",
      "On site: turn the key and press local Start. Remote_Lock and Rejects reset.",
    ],
    between: ["Report any unexplained writes or devices on a plant network.", ...BETWEEN.slice(0, 2)],
    tour: [
      { kicker: "Scene 1 of 3 · Rate", title: "Not too often", lines: [2, 5], lead: "At most one start every 10 s.", body: "Real operators do not press start twice a second. A flood of commands is a fault or an attack.", handsTo: ["Start_Req", "Rejects"] },
      { kicker: "Scene 2 of 3 · Lockout", title: "Three strikes", lines: [6, 8], lead: "Three rejected writes lock out remote control.", body: "The plant keeps running on its last good values, and local control still works.", handsTo: ["Remote_Lock"] },
      { kicker: "Scene 3 of 3 · On site", title: "A person decides", lines: [11, 11], lead: "Only the key, on site, clears the lock.", body: "An attacker on the network cannot undo it.", precise: "IEC 62443 also calls for zones and conduits, firewalls, removing default passwords, patching and monitoring. The program is the last line, not the only one.", handsTo: ["Key_Allow"] },
    ],
    story: [
      { t: "attack", text: "999 % and start twice a second." },
      { t: "defended", text: "Bad values rejected; commands rate limited." },
      { t: "locked", text: "Three rejects: remote control locked." },
      { t: "reset", text: "Key on site clears it." },
    ],
    words: [{ term: "IEC 62443", meaning: "The international standard for industrial cyber security." }, { term: "Zone", meaning: "A group of devices with the same security needs." }, { term: "Defence in depth", meaning: "Several layers of protection, so one failing is not enough." }, { term: "Rate limit", meaning: "Allowing only so many commands in a given time." }],
  },

  "e-remote-access": {
    goal: "Give vendors remote access safely: requested, approved on site, time limited, visible and logged.",
    learn: ["remote access risks", "on-site approval", "time limits", "visibility", "access logs"],
    wires: [1, 5, 7],
    steps: [
      "Switch the PLC to RUN. Turn on the vendor's request with the key off: nothing opens.",
      "Withdraw the request. Turn the key on.",
      "Request again: the session opens and the amber lamp lights. Sessions counts 1.",
      "Wait 30 s: the session closes by itself.",
      "Turn the key off during a session: it closes at once.",
    ],
    between: BETWEEN,
    tour: [
      { kicker: "Scene 1 of 3 · Approval", title: "Asked, then allowed", lines: [2, 2], lead: "A fresh request with the key on opens a session.", body: "Approval needs a person on site, not just a password someone could steal.", handsTo: ["Remote_Req", "Key_Allow"] },
      { kicker: "Scene 2 of 3 · Time", title: "It ends by itself", lines: [3, 4], lead: "The session closes after its time, or when the key is turned off.", body: "Forgotten open connections are a favourite way into plants.", handsTo: ["Session", "Sess_T"] },
      { kicker: "Scene 3 of 3 · Visible", title: "Everyone can see", lines: [5, 6], lead: "A lamp, and a count for the log.", body: "Operators should always know when someone is connected remotely.", precise: "On real sites remote access goes through a jump server or a secure remote access appliance, with multi-factor sign-in and recorded sessions.", handsTo: ["Remote_Lamp", "Sessions"] },
    ],
    story: [
      { t: "request", text: "Key off: refused." },
      { t: "approved", text: "Key on, new request: session open." },
      { t: "expired", text: "30 s later it closes itself." },
    ],
    words: [{ term: "Remote access", meaning: "Connecting to plant systems from outside the site." }, { term: "Jump server", meaning: "A controlled computer that remote users must go through." }, { term: "MFA", meaning: "Multi-factor authentication: more than a password." }],
  },

  "e-architecture": {
    goal: "Place each part of a plant's control in the right layer, and keep the plant running when the upper layers fail.",
    learn: ["the Purdue model", "levels 0 to 4", "local control first", "safe defaults", "data for the business"],
    wires: [1, 2, 3, 4, 6, 7],
    steps: [
      "Switch the PLC to RUN. Press the SCADA start command: Level 2 starts Level 1.",
      "Move the SCADA setpoint to 50 %: accepted. Try 10 %: below the limit, ignored.",
      "Watch Starts and Run_Secs: the figures Levels 3 and 4 ask for.",
      "Cut the fibre from the networked station's popover. Level 1 still controls locally on what it knows.",
      "List, for this station, what lives at each level: field, control, supervision, site, business.",
    ],
    between: BETWEEN,
    tour: [
      { kicker: "Scene 1 of 3 · Level 1", title: "Control stands alone", lines: [2, 8], lead: "The pump is run by the PLC itself.", body: "If SCADA, the historian and the business systems all disappeared, this logic would carry on.", handsTo: ["Pump_Run"] },
      { kicker: "Scene 2 of 3 · Level 2", title: "Supervise within limits", lines: [3, 4], lead: "SCADA's setpoint is accepted between 20 and 95 %.", body: "Without a value, the PLC uses its own safe default.", handsTo: ["Fill_SP"] },
      { kicker: "Scene 3 of 3 · Levels 3 and 4", title: "Information flows up", lines: [9, 11], lead: "Starts and running time, ready for a historian.", body: "Maintenance plans from running hours; the business reports pumped volume and energy.", precise: "IEC 62264 (ISA-95) defines the interface between control and business systems; Purdue zones also shape network security.", handsTo: ["Starts", "Run_Secs"] },
    ],
    story: [
      { t: "Level 0", text: "Pump, level transmitter." },
      { t: "Level 1", text: "The PLC runs the station." },
      { t: "Level 2", text: "SCADA gives the setpoint." },
      { t: "Levels 3-4", text: "Starts and hours for reports." },
    ],
    words: [{ term: "Purdue model", meaning: "A layered view of plant systems, from field devices to business systems." }, { term: "ISA-95", meaning: "The standard for linking control systems with business systems." }, { term: "MES", meaning: "Manufacturing execution system: runs production at site level." }],
  },

  "e-dcs": {
    goal: "Think like a DCS: one tested template per device type, used for every device.",
    learn: ["DCS and PLC", "device templates", "data per device", "configuration over code", "consistency"],
    wires: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    steps: [
      "Switch the PLC to RUN, tap Start. Pump 1 runs on demand.",
      "Trip pump 1. Fail[1] latches and pump 2 runs.",
      "Watch Hours[2] count while it runs.",
      "Clear the trip and press ACK: Fail[1] clears.",
      "Change the arrays to [1..3] and the loop to 1 TO 3: the template itself stays as it is.",
    ],
    between: BETWEEN,
    tour: [
      { kicker: "Scene 1 of 3 · Data", title: "One row per device", lines: [3, 7], lead: "Each array holds one value per pump.", body: "In a DCS this is the configuration of each control module.", handsTo: ["Fail[1]"] },
      { kicker: "Scene 2 of 3 · Template", title: "Write once", lines: [21, 26], lead: "The same five lines run for every pump.", body: "Test the template once, thoroughly; every device then behaves the same.", handsTo: ["Out[1]", "Out[2]"] },
      { kicker: "Scene 3 of 3 · Scale", title: "A thousand motors", lines: [28, 29], lead: "Only the mapping to real I/O is per device.", body: "This is how a DCS stays consistent across a refinery or a smelter.", precise: "Siemens PCS 7, ABB 800xA, Emerson DeltaV and Honeywell Experion all build on libraries of device and loop templates.", handsTo: ["P1_Run"] },
    ],
    story: [
      { t: "normal", text: "Pump 1 duty." },
      { t: "trip", text: "Template marks it failed; pump 2 runs." },
      { t: "hours", text: "Counted the same way for both." },
    ],
    words: [{ term: "DCS", meaning: "Distributed control system: plant-wide control built from standard modules." }, { term: "Control module", meaning: "One device's logic and data, built from a template." }, { term: "Typical", meaning: "A standard, tested design reused for every similar device." }],
  },

  "e-batch": {
    goal: "Run a batch in ISA-88 phases, and hold and restart it without losing it.",
    learn: ["ISA-88", "procedures and phases", "hold and restart", "safe held states", "batch records"],
    wires: [1, 2, 3, 4, 5, 6, 7, 8],
    steps: [
      "Switch the PLC to RUN and tap Start. Watch Phase and Secs.",
      "Press Stop during phase 2. Held: everything stops, and Secs stops counting.",
      "Tap Start: the batch carries on in phase 2 from where it stopped.",
      "Let it finish: Batches counts 1.",
      "Add a phase: a second mix after a rest, by adding a row to PT and a step.",
    ],
    between: BETWEEN,
    tour: [
      { kicker: "Scene 1 of 3 · Phases", title: "Small reusable jobs", lines: [17, 21], lead: "Fill, fill, mix, drain: each a phase.", body: "ISA-88 builds recipes from phases, so the same equipment makes many products.", handsTo: ["Phase"] },
      { kicker: "Scene 2 of 3 · Hold", title: "Stop, but keep it", lines: [12, 15], lead: "Held stops everything but remembers the phase and its time.", body: "Aborting a batch can waste thousands of rand of ingredients. Holding keeps the choice open.", handsTo: ["Held", "Secs"] },
      { kicker: "Scene 3 of 3 · Safe", title: "Outputs off while held", lines: [23, 28], lead: "Run is false while held, so every output is off.", body: "Each phase's held state must be safe; for some, safe means keeping the agitator running.", precise: "ISA-88 phase states also include stopping, aborting, pausing and complete.", handsTo: ["Run"] },
    ],
    story: [
      { t: "running", text: "Phase 2, 2 s done." },
      { t: "held", text: "Stop pressed: all off, time frozen." },
      { t: "restarted", text: "Phase 2 resumes; the batch completes." },
    ],
    words: [{ term: "Phase", meaning: "The smallest batch job, like fill or mix." }, { term: "Held", meaning: "Paused in a safe state, ready to restart." }, { term: "ISA-88", meaning: "The standard for batch control." }],
  },

  "e-alarm-mgmt": {
    goal: "Manage alarms the way ISA-18.2 asks: priorities, acknowledgement, horn for the urgent, suppression of consequences.",
    learn: ["alarm floods", "priorities", "acknowledgement", "audible alarms", "state based suppression"],
    wires: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    steps: [
      "Switch the PLC to RUN, tap Start. Trip both pumps: Unacked becomes 2, no horn.",
      "Raise the inflow. The lag float alarm is held back once the high-high comes in.",
      "High-high: priority 1, the horn sounds.",
      "Press ACK: horn off, lamp steady.",
      "Clear the trips. As the water falls, the alarms clear.",
    ],
    between: BETWEEN,
    tour: [
      { kicker: "Scene 1 of 3 · Priority", title: "Not all alarms are equal", lines: [15, 15], lead: "1 urgent, 2 important, 3 advisory.", body: "Each alarm needs a defined operator action. If there is none, it should not be an alarm.", handsTo: ["Prio[1]"] },
      { kicker: "Scene 2 of 3 · Suppression", title: "Do not repeat the cause", lines: [20, 20], lead: "High level is hidden while high-high is active.", body: "Consequential alarms add noise exactly when the operator is busiest.", handsTo: ["Act[4]"] },
      { kicker: "Scene 3 of 3 · Acknowledge", title: "Seen, not solved", lines: [23, 36], lead: "Flashing until acknowledged, steady after.", body: "The horn is kept for priority 1, so it always means act now.", precise: "EEMUA 191 suggests an operator should get no more than about one alarm every 10 minutes in steady operation.", handsTo: ["Unacked", "Horn"] },
    ],
    story: [
      { t: "trips", text: "Two priority 2 alarms, flashing." },
      { t: "high-high", text: "Priority 1: the horn." },
      { t: "ACK", text: "Horn off, lamp steady." },
    ],
    words: [{ term: "Alarm flood", meaning: "More alarms than an operator can handle, often 10 or more in 10 minutes." }, { term: "Suppression", meaning: "Hiding an alarm that adds nothing while another is active." }, { term: "Shelving", meaning: "An operator hiding a nuisance alarm for a limited time, with a record." }, { term: "ISA-18.2", meaning: "The standard for alarm management in the process industries." }],
  },

  "e-historian": {
    goal: "Store process history efficiently and turn it into reports.",
    learn: ["historians", "sampling", "deadband compression", "summaries", "reports and records"],
    wires: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    steps: [
      "Switch the PLC to RUN, tap Start. Samples counts every 5 s.",
      "While the level moves, Logged keeps up with Samples.",
      "Stop the pumps and set the inflow to 0. The level stops moving; Logged stops.",
      "Read Hi, Lo and Avg: a summary of what was stored.",
      "Change the deadband from 2 to 5 and compare how much is logged.",
    ],
    between: BETWEEN,
    tour: [
      { kicker: "Scene 1 of 3 · Sample", title: "Every 5 s", lines: [13, 16], lead: "A sample is taken on a fixed period.", body: "Historians sample fast processes faster and slow ones slower.", handsTo: ["Samples"] },
      { kicker: "Scene 2 of 3 · Compress", title: "Only real changes", lines: [17, 22], lead: "Store a value only when it has moved by more than 2 %.", body: "A level that sits still all night needs one value, not 8640.", handsTo: ["Logged", "Hist[0]"] },
      { kicker: "Scene 3 of 3 · Report", title: "Low, high, average", lines: [25, 32], lead: "A loop summarises what is stored.", body: "Shift reports, daily totals and regulator returns are summaries like these.", precise: "AVEVA PI, Canary and Ignition historians use similar deadband and swinging-door compression.", handsTo: ["Hi", "Lo", "Avg"] },
    ],
    story: [
      { t: "moving", text: "Most samples logged." },
      { t: "still", text: "Samples continue; logging stops." },
      { t: "report", text: "Low, high and average of what was kept." },
    ],
    words: [{ term: "Historian", meaning: "A database for process values over time." }, { term: "Deadband", meaning: "The change needed before a new value is stored." }, { term: "Compression", meaning: "Storing fewer values without losing the shape of the data." }],
  },

  "e-upg-why": {
    goal: "Build the business case for upgrading an old control system from evidence, not opinion.",
    learn: ["obsolescence", "spares and skills risk", "downtime cost", "the business case", "timing an upgrade"],
    wires: [1, 6],
    steps: [
      "Switch the PLC to RUN. Start the conveyor on the old PLC.",
      "Fail the old PLC's CPU. The conveyor stops; Failures counts 1.",
      "Watch Down_S and Lost_Rand climb.",
      "Clear the fault. Note what 10 minutes of downtime would cost: R12 000.",
      "Compare a year of failures with an upgrade quote: that is the case for the plant manager.",
    ],
    between: BETWEEN,
    tour: [
      { kicker: "Scene 1 of 2 · Evidence", title: "How often, how long", lines: [2, 4], lead: "Failures and seconds down, counted automatically.", body: "Plant managers fund upgrades on numbers: failures a year, hours lost, spares that cannot be bought.", handsTo: ["Failures", "Down_S"] },
      { kicker: "Scene 2 of 2 · Cost", title: "Downtime in rand", lines: [5, 5], lead: "R20 a second is R72 000 an hour of lost production.", body: "One long stoppage while hunting for an S5 card on the second-hand market can pay for the whole upgrade.", precise: "Siemens ended S5 support years ago; Rockwell lists PLC-5 and SLC 500 as discontinued.", handsTo: ["Lost_Rand"] },
    ],
    story: [
      { t: "running", text: "The old PLC still works, for now." },
      { t: "failure", text: "CPU fails; the conveyor stops." },
      { t: "cost", text: "Every second counted in rand." },
    ],
    words: [{ term: "Obsolescence", meaning: "When a product is no longer made or supported." }, { term: "Business case", meaning: "The argument, in money and risk, for spending on a project." }, { term: "Downtime", meaning: "Time the plant cannot produce." }],
  },

  "e-upg-audit": {
    goal: "Audit an old system before changing it: back up, list, observe, and find what nobody wrote down.",
    learn: ["backups first", "I/O lists", "observing behaviour", "hidden logic", "the audit report"],
    wires: [1, 2, 3, 4, 5],
    steps: [
      "Switch the PLC to RUN. Hold Start: the old PLC runs the motor. Old_Starts counts it.",
      "Stop. Open the guard, close it, and at once hold Start.",
      "Nothing happens: Refused counts 1.",
      "Wait 5 s and try again: it starts.",
      "Write the finding: the old program will not start within 5 s of the guard closing.",
    ],
    between: ["Back up the old program, and keep two copies, before anything else.", ...BETWEEN.slice(0, 2)],
    tour: [
      { kicker: "Scene 1 of 2 · Watch", title: "What the old PLC does", lines: [2, 2], lead: "Every start the old PLC makes is counted.", body: "Run the new PLC as a recorder first: it reads the same inputs and the old outputs.", handsTo: ["Old_Starts"] },
      { kicker: "Scene 2 of 2 · Surprises", title: "Healthy, but refused", lines: [3, 4], lead: "Start held, guard closed, Stop healthy, but no motor.", body: "Old programs hold years of undocumented fixes. Each one you miss becomes a surprise on cutover day.", precise: "If the old program cannot be uploaded, the audit is all you have: photos, I/O lists, and observed behaviour.", handsTo: ["Refused"] },
    ],
    story: [
      { t: "backup", text: "Upload and store the old program." },
      { t: "observe", text: "Log what the old PLC does." },
      { t: "finding", text: "A 5 s guard delay nobody wrote down." },
    ],
    words: [{ term: "Audit", meaning: "A careful record of an existing system before changing it." }, { term: "I/O list", meaning: "Every input and output with its address and purpose." }, { term: "As-found", meaning: "How the system really was before you touched it." }],
  },

  "e-upg-map": {
    goal: "Convert an old program to a new platform: map every address, keep every behaviour, and prove it in shadow.",
    learn: ["address mapping", "instruction conversion", "naming tags", "keeping quirks", "shadow testing"],
    wires: [1, 2, 3, 4, 5, 7],
    steps: [
      "Set the changeover to 1, shadow. Switch the PLC to RUN.",
      "Start and stop a few times; open and close the guard; try a start inside the 5 s.",
      "Mismatches stays at 0 while Shadow_S counts up.",
      "Delete XIC(Guard_T.DN) from rung 2 and repeat: a mismatch.",
      "Put it back. Write the mapping table: old address, new tag, purpose.",
    ],
    between: BETWEEN,
    tour: [
      { kicker: "Scene 1 of 3 · Mapping", title: "Addresses become names", lines: [1, 3], lead: "I 32.0 becomes Start_PB; Q 32.0 becomes Motor_Run.", body: "A mapping table, old address to new tag, is the backbone of every migration.", handsTo: ["Start_PB", "Motor_Run"] },
      { kicker: "Scene 2 of 3 · Quirks", title: "Keep the hidden rule", lines: [2, 2], lead: "The guard delay the audit found, now named and commented.", body: "Convert behaviour, not just instructions. If a quirk is wrong, change it later, deliberately, with the plant's agreement.", handsTo: ["Guard_T"] },
      { kicker: "Scene 3 of 3 · Shadow", title: "Prove it side by side", lines: [6, 7], lead: "The new PLC runs, unconnected, while the old one drives.", body: "Every disagreement is counted. Zero over a full set of cases is the evidence for cutover.", precise: "TIA Portal can migrate S7-300/400 projects; S5 code usually needs a converter and careful manual checking.", handsTo: ["Mismatches", "Shadow_S"] },
    ],
    story: [
      { t: "old", text: "A I32.0, O Q32.0, A I32.1, A I32.2, = Q32.0." },
      { t: "new", text: "Named ladder, with the guard delay." },
      { t: "shadow", text: "No mismatches over 30 s of tests." },
    ],
    words: [{ term: "Mapping table", meaning: "A list linking each old address to its new tag." }, { term: "Shadow mode", meaning: "Running the new system alongside the old, compared but not connected." }, { term: "STL", meaning: "Statement list: the old text language of S5 and S7." }],
  },

  "e-upg-plan": {
    goal: "Plan a cutover: the test list, the timing, the people and the way back.",
    learn: ["cutover plans", "test coverage", "rollback", "shutdown windows", "evidence"],
    wires: [1, 2, 3, 4, 7],
    steps: [
      "Set the changeover to 1. Switch the PLC to RUN.",
      "Run a start and a stop: Coverage 2.",
      "Start, open the guard while running: 3.",
      "Close the guard and hold Start at once: 4.",
      "Check Mismatches is still 0. The test stage of the plan is done.",
    ],
    between: BETWEEN,
    tour: [
      { kicker: "Scene 1 of 2 · Cases", title: "What must be proved", lines: [5, 8], lead: "Four cases, each latched once seen.", body: "A real plan lists every function, every interlock and every alarm, and who will witness each.", handsTo: ["C_Start", "C_Refuse"] },
      { kicker: "Scene 2 of 2 · Score", title: "Coverage", lines: [9, 13], lead: "The program keeps the score.", body: "With full coverage and no mismatches, the plan moves to the cutover window, with a written rollback to the old PLC.", precise: "Plan the cutover inside a planned shutdown, with the old program, old cards and spare time held in reserve.", handsTo: ["Coverage"] },
    ],
    story: [
      { t: "plan", text: "When, who, how long, how to go back." },
      { t: "test", text: "Four cases in shadow." },
      { t: "ready", text: "Coverage 4, mismatches 0." },
    ],
    words: [{ term: "Cutover", meaning: "The moment the new system takes over from the old." }, { term: "Rollback", meaning: "Going back to the old system if the new one fails." }, { term: "Coverage", meaning: "How much of what must be tested has been tested." }],
  },

  "e-upg-cutover": {
    goal: "Cut over safely: gate the new PLC on proof, take over, commission, and hand over.",
    learn: ["proof gates", "taking control", "commissioning", "decommissioning", "handover"],
    wires: [1, 2, 3, 7],
    steps: [
      "Set the changeover to 1 and switch the PLC to RUN. Wait 20 s: Ready.",
      "Move the changeover to 2 and press Start: the new PLC drives the motor.",
      "Fail the old PLC: the plant does not notice.",
      "Try it again without waiting for Ready: the new PLC refuses to drive.",
      "Hand over: the mapping table, the new program, the test records and a trained operator.",
    ],
    between: BETWEEN,
    tour: [
      { kicker: "Scene 1 of 2 · Gate", title: "Earn the right to drive", lines: [4, 5], lead: "20 s of shadow with no mismatches latches Ready.", body: "The new PLC protects the plant from a cutover made too soon.", handsTo: ["Ready"] },
      { kicker: "Scene 2 of 2 · Take over", title: "Position 2", lines: [6, 7], lead: "In position 2 the new PLC drives, once Ready.", body: "Switch the old PLC off and watch: if nothing changes, the cutover is complete.", precise: "Handover packs: as-built drawings, I/O list, program backups, test records, training records and the warranty terms.", handsTo: ["Motor_Run"] },
    ],
    story: [
      { t: "proved", text: "20 s shadow, no mismatches: Ready." },
      { t: "cutover", text: "Changeover to 2: new PLC drives." },
      { t: "handover", text: "Old PLC off; plant runs." },
    ],
    words: [{ term: "Commissioning", meaning: "Proving the system works on site before handover." }, { term: "Decommissioning", meaning: "Safely removing the old system." }, { term: "Handover", meaning: "Passing the working system and its documents to the owner." }],
  },

  "e-fat-sat": {
    goal: "Write testable specifications and prove a system with FAT and SAT, step by step.",
    learn: ["functional specifications", "test scripts", "FAT", "SAT", "punch lists"],
    wires: [1, 2, 3, 4, 6, 7],
    steps: [
      "Switch the PLC to RUN. T1: tap Start. Test becomes 1.",
      "T2: press Stop. T3: start, then E-stop. Each passes only if the belt stopped.",
      "T4: start and jam the exit eye: after 4 s the belt stops, Jam on.",
      "T5: clear the jam and tap Start. Test reaches 5.",
      "Write a test sheet: number, action, expected result, pass or fail, signature.",
    ],
    between: BETWEEN,
    tour: [
      { kicker: "Scene 1 of 2 · Spec", title: "Write it so it can be tested", lines: [2, 5], lead: "Every behaviour here was a line in the specification.", body: "\"The belt shall stop within 1 s of the E-stop\" can be tested; \"the belt shall be safe\" cannot.", handsTo: ["Belt_Run", "Jam"] },
      { kicker: "Scene 2 of 2 · Script", title: "Only real results count", lines: [6, 10], lead: "Test only moves on when the expected result happened.", body: "FAT in the workshop, SAT again on site. Anything that fails goes on the punch list until fixed and retested.", precise: "IEC 62381 describes FAT, SAT and site integration tests for process automation.", handsTo: ["Test"] },
    ],
    story: [
      { t: "T1-T3", text: "Start, stop, E-stop." },
      { t: "T4", text: "Jam detected and stopped." },
      { t: "T5", text: "Recovered. All passed." },
    ],
    words: [{ term: "FAT", meaning: "Factory acceptance test, before shipping." }, { term: "SAT", meaning: "Site acceptance test, after installation." }, { term: "Punch list", meaning: "The list of items still to fix before acceptance." }],
  },

  "e-quoting": {
    goal: "Estimate an automation job from its scope, so the quote is neither a loss nor a lost bid.",
    learn: ["I/O based estimating", "fixed and variable tasks", "rates", "contingency", "scope changes"],
    wires: [1],
    steps: [
      "Switch the PLC to RUN. Read Total_Hours and Quote for 12 I/O.",
      "Change IO_Count to 24 and run again.",
      "Hours that scale with I/O doubled; FAT, commissioning and documentation did not.",
      "Change the contingency to 25 % for an old plant with no drawings.",
      "Write the assumptions that go with the quote: what is included, and what is not.",
    ],
    between: BETWEEN,
    tour: [
      { kicker: "Scene 1 of 2 · Scope", title: "Count the I/O", lines: [9, 16], lead: "Design, wiring and programming hours scale with the I/O count.", body: "FAT, commissioning and documentation are closer to fixed for a job of this size.", handsTo: ["IO_Count", "Hours[1]"] },
      { kicker: "Scene 2 of 2 · Price", title: "Labour, hardware, contingency", lines: [18, 22], lead: "Hours times rate, plus hardware, plus 15 %.", body: "Contingency pays for what the site will surprise you with. Scope changes later are quoted as variations.", precise: "Always state exclusions: civil work, cabling outside the panel, client delays, and travel.", handsTo: ["Quote"] },
    ],
    story: [
      { t: "12 I/O", text: "First estimate." },
      { t: "24 I/O", text: "Per point hours double; fixed tasks stay." },
      { t: "risk", text: "More contingency for unknown old plants." },
    ],
    words: [{ term: "Estimate", meaning: "A calculated forecast of hours and cost." }, { term: "Contingency", meaning: "A reserve for unknowns, as a share of the cost." }, { term: "Variation", meaning: "A priced change to the agreed scope." }],
  },
};
