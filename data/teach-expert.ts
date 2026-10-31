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
};
