import type { LessonTeach } from "./teach";

// Teaching panels for the Foundation lessons added from the Curriculum and Lecture Guide.

const BASE = [
  { term: "Rung", meaning: "One line of ladder logic between the two power rails. Contacts on the left, outputs on the right." },
  { term: "Contact", meaning: "A question about a bit. Normally open (XIC) passes power when the bit is 1, normally closed (XIO) when it is 0." },
  { term: "Coil", meaning: "An output instruction. OTE writes the rung result into a bit every scan." },
  { term: "Tag", meaning: "A name for an address, like Start_PB for I0.0. The logic uses names, the wiring uses addresses." },
];
const BETWEEN = ["Stop the PLC before you change the program.", "Edits apply on the next Run.", "The rig is a simulator. Never test logic on live plant."];

export const TEACH_FOUNDATION_NEW: Record<string, LessonTeach> = {
  "f-why": {
    goal: "See why a PLC replaced the relay panel: the wiring stays, the logic becomes a program.",
    learn: ["relay logic", "inputs and outputs", "the program in between", "seal-in", "where PLCs are used"],
    wires: [1, 2, 3, 4, 6, 7, 8],
    steps: [
      "Switch the PLC to RUN.",
      "Tap Start. The motor starts and keeps running after you let go.",
      "Tap Stop. The motor stops.",
      "Read rung 1 out loud as a sentence: start, or already running, and not stopped, and not overloaded.",
      "Think of a change, such as a second stop button. On a relay panel that means new wires; here it is one more contact.",
    ],
    between: BETWEEN,
    tour: [
      { kicker: "Scene 1 of 3 · Before PLCs", title: "Logic made of wire", lines: [2, 2], lead: "On a relay panel this rung was three relays and a dozen wires.", body: "Every change meant switching off, rewiring and testing. A plant with hundreds of machines had rooms full of relays.", handsTo: ["Start_PB", "Stop_PB"] },
      { kicker: "Scene 2 of 3 · The program", title: "Logic made of text", lines: [2, 2], lead: "The PLC reads the buttons, solves this rung and drives the contactor.", body: "Motor_Run is both the answer and a contact that holds the answer once it is true. That is the seal-in you will meet again and again.", precise: "The buttons and the contactor are still wired to the PLC. Only the logic between them moved into software.", handsTo: ["Motor_Run"] },
      { kicker: "Scene 3 of 3 · On site", title: "Where you will find them", lines: [3, 3], lead: "A lamp that follows the motor is one more rung, not one more wire.", body: "PLCs run conveyors in mines, pumps at water works, filling lines in breweries and kilns in cement plants across South Africa.", handsTo: ["Run_Lamp"] },
    ],
    story: [
      { t: "you", text: "You tap Start. Rung 1 passes and Motor_Run turns on." },
      { t: "next scan", text: "Start is released, but the Motor_Run contact holds the rung true." },
      { t: "rung 2", text: "The run lamp follows Motor_Run." },
      { t: "you", text: "You tap Stop. XIO(Stop_PB) breaks the rung and the motor stops." },
    ],
    words: [...BASE, { term: "PLC", meaning: "Programmable logic controller. An industrial computer that reads inputs, runs a program and drives outputs." }, { term: "Relay logic", meaning: "Control built from relays wired together. Changing it means rewiring." }],
  },

  "f-inside": {
    goal: "Know the parts of a PLC system and prove three inputs and three outputs by their addresses.",
    learn: ["power supply", "CPU", "input module", "output module", "addresses", "24 V control"],
    wires: [1, 2, 3, 8, 9, 10, 11],
    steps: [
      "Switch the PLC to RUN.",
      "Press Start. I0.0 and Q0.1 light together on the I/O board.",
      "Press Stop. I0.1 and Q0.2 light.",
      "Press AUX. I0.4 and Q0.3 light, and the beacon turns on.",
      "Find each terminal on the wiring view and follow its wire to the button or lamp.",
    ],
    between: ["Every input and output has an address and a terminal.", ...BETWEEN.slice(1)],
    tour: [
      { kicker: "Scene 1 of 3 · Power and CPU", title: "What makes it run", lines: [1, 1], lead: "A 24 V DC supply powers the CPU and the I/O.", body: "The CPU holds the program and runs it over and over. Its RUN light shows it is scanning.", handsTo: [] },
      { kicker: "Scene 2 of 3 · Inputs", title: "The input module", lines: [2, 3], lead: "Each button closes 24 V onto an input terminal.", body: "I0.0 is the first input, I0.1 the second. The module turns 24 V into a 1 the program can read.", precise: "Compact PLCs have I/O built in; modular PLCs add input and output cards on a rack or rail.", handsTo: ["Start_PB", "Stop_PB"] },
      { kicker: "Scene 3 of 3 · Outputs", title: "The output module", lines: [4, 4], lead: "Q0.3 switches 24 V to the beacon.", body: "Outputs switch lamps, coils and beacons. Big loads like motors go through a contactor, never straight from the PLC.", handsTo: ["Aux_PB", "Beacon"] },
    ],
    story: [
      { t: "press", text: "Start closes 24 V onto I0.0. The input LED lights." },
      { t: "scan", text: "The CPU reads I0.0 as 1 and rung 1 writes Run_Lamp." },
      { t: "write", text: "Q0.1 switches on. The run lamp lights." },
      { t: "next", text: "Stop and AUX prove the next two channels the same way." },
    ],
    words: [...BASE, { term: "Input module", meaning: "Turns 24 V signals from the field into bits the CPU can read." }, { term: "Output module", meaning: "Turns bits from the CPU into 24 V signals that switch lamps and coils." }, { term: "Address", meaning: "Where a signal is: I for inputs, Q for outputs, then byte and bit, like I0.0." }],
  },

  "f-bits": {
    goal: "Tell bits, bytes and words apart, and use a word to hold a number.",
    learn: ["bit", "byte", "word", "binary", "ADD and MOV", "one shot"],
    wires: [3, 10, 11],
    steps: [
      "Switch the PLC to RUN.",
      "Tap AUX once and watch Count become 1 in the code card.",
      "Tap AUX three more times. At 4 the beacon lights.",
      "Hold AUX down. Count does not run away: ONS adds only once per press.",
      "Tap Stop. MOV writes 0 and the beacon goes out.",
    ],
    between: ["Count is a word inside the PLC, not a terminal.", ...BETWEEN.slice(1)],
    tour: [
      { kicker: "Scene 1 of 3 · A number in a word", title: "Adding one", lines: [2, 2], lead: "ADD(Count, 1, Count) reads the word, adds one and writes it back.", body: "ONS turns a held press into a single scan, so each press counts once.", handsTo: ["Aux_PB", "Count"] },
      { kicker: "Scene 2 of 3 · Comparing", title: "Is it four yet?", lines: [3, 3], lead: "GEQ(Count, 4) compares the whole word with 4.", body: "A bit can only be 0 or 1. Anything bigger, a count, a speed, a temperature, needs a word.", precise: "4 in binary is 0000 0000 0000 0100. Bit 2 of the word is set.", handsTo: ["Beacon"] },
      { kicker: "Scene 3 of 3 · Clearing", title: "Moving a value", lines: [4, 4], lead: "MOV(0, Count) writes 0 into all sixteen bits.", body: "MOV copies a value into a word. It is how programs load set points, recipes and resets.", handsTo: ["Stop_PB", "Count"] },
    ],
    story: [
      { t: "tap 1", text: "AUX rises. ONS passes for one scan and Count becomes 1." },
      { t: "tap 4", text: "Count reaches 4. GEQ is true and the beacon lights." },
      { t: "hold", text: "AUX stays held, but ONS stays false, so Count stays 4." },
      { t: "stop", text: "MOV writes 0. GEQ goes false and the beacon goes out." },
    ],
    words: [...BASE, { term: "Bit", meaning: "The smallest piece of data: 0 or 1." }, { term: "Word", meaning: "16 bits. Holds a whole number, 0 to 65535 or -32768 to 32767." }, { term: "One shot", meaning: "ONS. True for exactly one scan when its rung turns true." }],
  },

  "f-types": {
    goal: "Choose the right data type and scale a raw value into real units.",
    learn: ["BOOL", "INT", "REAL", "TIME", "scaling", "starting current"],
    wires: [1, 2, 3, 4, 6, 7, 11],
    steps: [
      "Switch the PLC to RUN.",
      "Tap Start and watch Motor_Amps jump while the motor speeds up. The beacon flashes on.",
      "Once up to speed, read Amps_A: the running current in amps.",
      "Change 40 to 30 in rung 2 and run again. When does the beacon go out now?",
      "Jam the shaft from the motor popover and watch the current climb.",
    ],
    between: BETWEEN,
    tour: [
      { kicker: "Scene 1 of 3 · BOOL", title: "On or off", lines: [2, 2], lead: "Motor_Run is a BOOL: one bit.", body: "Buttons, lamps, coils and flags are all BOOL. They answer yes or no.", handsTo: ["Motor_Run"] },
      { kicker: "Scene 2 of 3 · INT", title: "A number with a unit", lines: [3, 3], lead: "Motor_Amps is an INT in tenths of an amp.", body: "A motor draws five to seven times its rated current while it starts. Above 40, 4 A, the beacon shows that surge.", precise: "Instruments rarely send engineering units. Always check the scale: tenths, hundredths or raw counts.", handsTo: ["Motor_Amps", "Beacon"] },
      { kicker: "Scene 3 of 3 · Scaling", title: "Into real units", lines: [4, 4], lead: "DIV(Motor_Amps, 10, Amps_A) turns tenths into amps.", body: "Use REAL when you need decimals. Here 26 becomes 2.6 A when the result is a REAL.", handsTo: ["Amps_A"] },
    ],
    story: [
      { t: "start", text: "The contactor closes. Current jumps to about 15 A, Motor_Amps reads near 150." },
      { t: "rung 2", text: "150 is greater than 40, so the beacon lights." },
      { t: "1 s", text: "The motor reaches speed. Current falls to 2.6 A and the beacon goes out." },
      { t: "rung 3", text: "Amps_A shows the running current in amps." },
    ],
    words: [...BASE, { term: "BOOL", meaning: "A single bit, true or false." }, { term: "INT", meaning: "A 16 bit whole number. DINT is 32 bits." }, { term: "REAL", meaning: "A 32 bit number with decimals, for scaled values like 2.6 A." }, { term: "Scaling", meaning: "Converting a raw reading into engineering units." }],
  },

  "f-tags": {
    goal: "Use a memory bit to hold the run command, and tell addresses, tags and memory apart.",
    learn: ["I, Q and M areas", "tags", "memory bits", "one decision used twice", "tag naming"],
    wires: [1, 2, 3, 4, 6, 7, 8],
    steps: [
      "Switch the PLC to RUN.",
      "Tap Start. Run_Seal, M0.0, turns on and stays on.",
      "The motor and the run lamp both follow Run_Seal.",
      "Tap Stop. Run_Seal clears and both outputs turn off.",
      "Rename Run_Seal to Motor_Command everywhere and run again. The PLC does not care; people reading it do.",
    ],
    between: ["Good tag names say what a signal means, not where it is wired.", ...BETWEEN.slice(1)],
    tour: [
      { kicker: "Scene 1 of 3 · Memory", title: "A bit with no wire", lines: [2, 2], lead: "Run_Seal lives at M0.0, inside the PLC.", body: "Memory bits hold the program's own decisions. No terminal, no wire, just storage.", handsTo: ["Run_Seal"] },
      { kicker: "Scene 2 of 3 · Outputs", title: "Using the decision", lines: [3, 3], lead: "The contactor output reads the memory bit.", body: "Deciding once and using the result in many places keeps programs short and easy to change.", handsTo: ["Motor_Run"] },
      { kicker: "Scene 3 of 3 · Names", title: "Tags on both brands", lines: [4, 4], lead: "The run lamp follows the same bit.", body: "Siemens writes M0.0 or a tag in a data block; Allen Bradley uses named controller tags. The idea is the same.", precise: "Name tags by meaning: Pump1_Run_Cmd, not Q0_0.", handsTo: ["Run_Lamp"] },
    ],
    story: [
      { t: "you", text: "You tap Start. Rung 1 sets Run_Seal and holds it." },
      { t: "rung 2", text: "Motor_Run copies Run_Seal. The contactor closes." },
      { t: "rung 3", text: "Run_Lamp copies Run_Seal. The lamp lights." },
      { t: "you", text: "You tap Stop. Run_Seal clears and both outputs follow." },
    ],
    words: [...BASE, { term: "Memory bit", meaning: "A bit inside the PLC, M on Siemens, used for the program's own flags." }, { term: "Address", meaning: "Where a value is: I input, Q output, M memory." }],
  },

  "f-buttons": {
    goal: "Know NO and NC contacts, and see why Stop is wired normally closed.",
    learn: ["normally open", "normally closed", "fail safe", "selector switches", "limit switches", "IEC colours"],
    wires: [1, 2, 3, 4, 6, 7, 8],
    steps: [
      "Switch the PLC to RUN. Stop is wired NC in this lesson.",
      "Tap Start, then Stop. The program now uses XIC for Stop.",
      "Open the Stop popover and break its wire.",
      "Hold Start. The motor will not start: a broken wire reads like Stop pressed.",
      "Mend the wire and start again.",
    ],
    between: ["Stops and safety devices are wired NC.", "Starts are wired NO.", ...BETWEEN.slice(2)],
    tour: [
      { kicker: "Scene 1 of 3 · NO", title: "Start closes", lines: [2, 2], lead: "Start is normally open: 1 only while pressed.", body: "Selector switches and limit switches also come with NO contacts that close when operated.", handsTo: ["Start_PB"] },
      { kicker: "Scene 2 of 3 · NC", title: "Stop opens", lines: [2, 2], lead: "Wired NC, Stop reads 1 at rest and 0 when pressed.", body: "So the rung uses XIC(Stop_PB): it needs Stop to be healthy.", precise: "Wiring is one decision, the contact type in the program is another. They must agree.", handsTo: ["Stop_PB"] },
      { kicker: "Scene 3 of 3 · Fail safe", title: "When a wire breaks", lines: [2, 3], lead: "A broken NC wire also reads 0.", body: "The machine stops, which is safe. With an NO stop, a broken wire would hide the stop and the machine could not be stopped.", handsTo: ["Motor_Run", "Run_Lamp"] },
    ],
    story: [
      { t: "rest", text: "Stop is closed. I0.1 reads 1." },
      { t: "start", text: "Start closes, the rung passes and the motor seals in." },
      { t: "stop", text: "Stop opens. I0.1 reads 0 and the rung breaks." },
      { t: "fault", text: "The wire breaks. I0.1 reads 0 for good, so the motor cannot start." },
    ],
    words: [...BASE, { term: "Normally open", meaning: "NO. A contact that closes when the device is operated." }, { term: "Normally closed", meaning: "NC. A contact that opens when the device is operated." }, { term: "Fail safe", meaning: "Designed so a fault, like a broken wire, leaves the machine in a safe state." }],
  },

  "f-sensors": {
    goal: "Know the common sensor types and count parts with a photo-eye.",
    learn: ["inductive sensors", "capacitive sensors", "photo-eyes", "PNP and NPN", "counting edges"],
    wires: [1, 2, 3, 4, 5, 6, 7],
    steps: [
      "Switch the PLC to RUN and tap Start. The belt runs.",
      "Watch the exit eye light on the I/O board as each carton passes.",
      "Watch Parts.ACC count up in the code card.",
      "At five the lamp lights.",
      "Press Stop to reset the count and stop the belt.",
    ],
    between: ["A sensor's input is 1 while it sees something.", "Count the edge, not the level.", ...BETWEEN.slice(2)],
    tour: [
      { kicker: "Scene 1 of 3 · The belt", title: "Run on Start", lines: [2, 2], lead: "The belt seals in like a motor.", body: "Stop is NC on this conveyor, so the rung reads XIC(Stop_PB).", handsTo: ["Belt_Run"] },
      { kicker: "Scene 2 of 3 · The eye", title: "One carton, one count", lines: [3, 3], lead: "PE_Exit is 1 while a carton blocks the beam.", body: "A carton blocks the beam for many scans. ONS turns that into one count.", precise: "Inductive sensors see metal, capacitive sensors see most materials, photo-eyes see anything that breaks the beam.", handsTo: ["PE_Exit", "Parts"] },
      { kicker: "Scene 3 of 3 · The batch", title: "Five done", lines: [4, 5], lead: "The counter's done bit lights the lamp at five.", body: "Stop resets the counter for the next batch.", handsTo: ["Run_Lamp"] },
    ],
    story: [
      { t: "start", text: "The belt runs. Cartons travel from the infeed." },
      { t: "carton", text: "A carton blocks the exit eye. PE_Exit is 1 and ONS fires once." },
      { t: "count", text: "Parts.ACC goes up by one for each carton." },
      { t: "five", text: "Parts.DN turns on and the lamp lights." },
    ],
    words: [...BASE, { term: "Photo-eye", meaning: "A sensor that sees an object break or reflect a beam of light." }, { term: "Inductive sensor", meaning: "A proximity sensor that sees metal without touching it." }, { term: "PNP", meaning: "A sensor output that switches 24 V to the input. NPN switches 0 V." }],
  },

  "f-relays": {
    goal: "See how a small PLC output controls a big load, and prove the contactor really closed.",
    learn: ["relays", "contactors", "solenoid valves", "coil suppression", "proof of run"],
    wires: [1, 2, 3, 4, 6, 7, 8, 9],
    steps: [
      "Switch the PLC to RUN and tap Start.",
      "Watch Motor_Amps rise. Once above 5 the run lamp lights: the contactor is proved closed.",
      "Tap Stop.",
      "Change GRT(Motor_Amps, 5) to GRT(Motor_Amps, 500) and run. After 2 s the fault lamp claims the contactor failed.",
      "Put it back. A proof check must use a sensible threshold.",
    ],
    between: ["Never drive a motor straight from a PLC output.", ...BETWEEN],
    tour: [
      { kicker: "Scene 1 of 3 · The coil", title: "Small signal, big switch", lines: [2, 2], lead: "Motor_Run switches 24 V into the contactor coil.", body: "The coil pulls in the main contacts, which switch 400 V to the motor. Relays do the same for smaller loads, solenoids for valves.", handsTo: ["Motor_Run"] },
      { kicker: "Scene 2 of 3 · Proof", title: "Did it really close?", lines: [3, 3], lead: "Current above 0.5 A proves the motor is getting power.", body: "A command is not proof. A burnt coil or a blown control fuse would leave the motor stopped while the PLC thinks it runs.", handsTo: ["Motor_Amps", "Run_Lamp"] },
      { kicker: "Scene 3 of 3 · Failure", title: "Commanded, but no current", lines: [4, 5], lead: "Two seconds with a command and no current lights the fault lamp.", body: "This is how real plants find failed contactors, tripped breakers and broken motor cables.", precise: "Many plants use the contactor's auxiliary contact as feedback; current sensing also proves the motor itself.", handsTo: ["Fault_Lamp"] },
    ],
    story: [
      { t: "start", text: "Q0.0 energises the coil. The main contacts close." },
      { t: "current", text: "Motor current flows. Motor_Amps passes 5 and the run lamp lights." },
      { t: "if not", text: "No current for 2 s: Proof_T finishes and the fault lamp lights." },
    ],
    words: [...BASE, { term: "Contactor", meaning: "A heavy duty relay that switches a motor's power." }, { term: "Solenoid valve", meaning: "A valve opened by an electric coil." }, { term: "Proof of run", meaning: "Feedback that shows a commanded device really started." }],
  },

  "w-isolation": {
    goal: "Learn safe isolation and write a program that never restarts a machine by itself.",
    learn: ["isolation", "lockout and tagout", "prove dead", "manual reset", "no automatic restart"],
    wires: [1, 2, 3, 4, 5, 6, 7, 10, 11],
    steps: [
      "Switch the PLC to RUN and start the motor.",
      "Press the E-stop, standing in for the isolator. The motor stops and the beacon lights.",
      "Release the E-stop. Nothing restarts.",
      "Try Start. Still nothing: the machine is locked out.",
      "Tap AUX to reset, then start the motor again.",
    ],
    between: ["Isolate, lock, tag, prove dead: in that order.", "The program is never your isolation.", ...BETWEEN.slice(2)],
    tour: [
      { kicker: "Scene 1 of 3 · Isolate", title: "Lock out on loss of supply", lines: [2, 2], lead: "Losing EStop_OK latches Locked.", body: "On site you switch off at the isolator, fit your own lock and tag, then prove dead with a tested meter.", handsTo: ["EStop_OK", "Locked"] },
      { kicker: "Scene 2 of 3 · Reset", title: "A deliberate act", lines: [3, 3], lead: "Only AUX, with the E-stop released, clears the lockout.", body: "Removing the isolation must never start the machine. Someone must choose to reset it.", precise: "This is what the machinery regulations call protection against unexpected start-up.", handsTo: ["Aux_PB"] },
      { kicker: "Scene 3 of 3 · Run", title: "Locked means stopped", lines: [4, 5], lead: "XIO(Locked) keeps the motor rung false while locked out.", body: "The beacon shows everyone that the machine is isolated.", handsTo: ["Motor_Run", "Beacon"] },
    ],
    story: [
      { t: "isolate", text: "EStop_OK drops. Locked latches and the motor stops." },
      { t: "release", text: "EStop_OK returns. Locked stays set, so nothing restarts." },
      { t: "reset", text: "AUX with EStop_OK clears Locked." },
      { t: "start", text: "Start now runs the motor." },
    ],
    words: [...BASE, { term: "Isolation", meaning: "Disconnecting all sources of energy before work, at a lockable isolator." }, { term: "Lockout", meaning: "Fitting your own lock to the isolator so nobody can switch it back on." }, { term: "Prove dead", meaning: "Test the meter, test the circuit, test the meter again." }],
  },

  "w-protection": {
    goal: "Know what each protection device does and add an overcurrent trip that ignores the start surge.",
    learn: ["fuses and breakers", "overload relays", "earth leakage", "earthing", "time delayed trips"],
    wires: [1, 2, 3, 4, 6, 7, 9, 10],
    steps: [
      "Switch the PLC to RUN and start the motor. The start surge does not trip it.",
      "Jam the shaft from the motor popover.",
      "After 2 s above 6 A the program trips and the fault lamp lights.",
      "Clear the jam.",
      "Tap AUX to reset, then start again.",
    ],
    between: ["Protection devices are chosen for the cable and the motor, not guessed.", ...BETWEEN],
    tour: [
      { kicker: "Scene 1 of 3 · Devices", title: "Who protects what", lines: [2, 2], lead: "The motor runs only while no overcurrent is latched.", body: "Breakers and fuses clear short circuits. Overloads protect against slow overheating. Earth leakage units protect people from current escaping to earth.", handsTo: ["Motor_Run"] },
      { kicker: "Scene 2 of 3 · Time", title: "Ignore the surge", lines: [3, 4], lead: "Above 6 A for 2 s latches Overcurrent.", body: "Starting current is high but short. A jam is high and stays high. The timer tells them apart.", precise: "Breaker curves B, C and D set how much starting surge they ride through.", handsTo: ["Motor_Amps", "Overcurrent"] },
      { kicker: "Scene 3 of 3 · Reset", title: "Find the cause first", lines: [5, 6], lead: "Reset only with the motor stopped.", body: "Resetting a trip without finding the cause is how motors burn out.", handsTo: ["Aux_PB", "Fault_Lamp"] },
    ],
    story: [
      { t: "start", text: "Current jumps for under a second. OC_T starts but never finishes." },
      { t: "jam", text: "Current stays high. OC_T reaches 2 s and Overcurrent latches." },
      { t: "trip", text: "The motor stops and the fault lamp lights." },
      { t: "reset", text: "Jam cleared, AUX pressed: Overcurrent clears." },
    ],
    words: [...BASE, { term: "Circuit breaker", meaning: "Clears short circuits and heavy overloads automatically, and can be reset." }, { term: "Earth leakage", meaning: "A device that trips when current escapes to earth, protecting people." }, { term: "Earthing", meaning: "Connecting metal parts to earth so a fault trips protection instead of making them live." }],
  },

  "w-cables": {
    goal: "Choose and run cables correctly, and find a broken cable from the program.",
    learn: ["cable types", "segregation", "glands", "screened cable", "open circuit detection"],
    wires: [1, 2, 3, 4, 6, 7, 9],
    steps: [
      "Switch the PLC to RUN and start the motor.",
      "Break the Stop wire from its popover. The motor stops at once.",
      "Wait 3 s. The fault lamp lights: the stop circuit is open.",
      "Mend the wire. The fault lamp goes out.",
      "Look at the duct in the 3D view: power and signal cables run in separate ducts.",
    ],
    between: ["Power and signal cables run apart.", "Screens are earthed at one end.", ...BETWEEN.slice(2)],
    tour: [
      { kicker: "Scene 1 of 3 · Safe failure", title: "A break stops the machine", lines: [2, 2], lead: "Stop is wired NC, so a broken cable reads like Stop pressed.", body: "Cables get crushed, cut and loosened. The design makes sure that stops the machine.", handsTo: ["Stop_PB", "Motor_Run"] },
      { kicker: "Scene 2 of 3 · Detection", title: "Pressed or broken?", lines: [3, 3], lead: "Nobody holds Stop for 3 s. An open circuit that long is a cable fault.", body: "Open_T times while Stop reads 0.", handsTo: ["Open_T"] },
      { kicker: "Scene 3 of 3 · The fix", title: "Send the fitter", lines: [4, 4], lead: "The fault lamp points to the stop circuit.", body: "On site you would check the gland, the terminals and any joints on that cable run.", precise: "SANS 10142-1 sets the rules for cable sizing and installation in South Africa.", handsTo: ["Fault_Lamp"] },
    ],
    story: [
      { t: "break", text: "The Stop cable breaks. I0.1 reads 0 and the motor stops." },
      { t: "3 s", text: "Open_T finishes. The fault lamp lights." },
      { t: "repair", text: "The cable is mended. I0.1 reads 1 and the lamp goes out." },
    ],
    words: [...BASE, { term: "Gland", meaning: "The fitting that seals and grips a cable where it enters a panel or device." }, { term: "Screened cable", meaning: "Cable with a foil or braid screen that keeps electrical noise off signals." }, { term: "Segregation", meaning: "Keeping power and signal cables apart." }],
  },

  "w-wiring-io": {
    goal: "Wire and prove every input and output, the way a loop check is done before a machine runs.",
    learn: ["input wiring", "output wiring", "sourcing and sinking", "commons", "test order"],
    wires: [1, 2, 3, 5, 6, 7, 8, 9, 10, 11],
    steps: [
      "Switch the PLC to RUN.",
      "Press Start: run lamp. Press Stop: fault lamp. Press AUX: beacon.",
      "Press and release the E-stop: the beacon lights too.",
      "Hold Start and AUX together to test the contactor output last.",
      "Tick each point on a loop check sheet as you go.",
    ],
    between: ["Test outputs that move things last, and only when it is safe.", ...BETWEEN],
    tour: [
      { kicker: "Scene 1 of 3 · Inputs", title: "24 V through the device", lines: [2, 3], lead: "Each input is wired from +24 V, through the button, to the input terminal.", body: "The input card's common goes to 0 V. Closing the button completes the circuit.", handsTo: ["Start_PB", "Stop_PB"] },
      { kicker: "Scene 2 of 3 · Outputs", title: "From terminal through the load", lines: [4, 4], lead: "Each output drives its load back to 0 V.", body: "A sourcing output supplies 24 V to the load; a sinking output switches the load's return to 0 V.", precise: "The field devices and the card must match: PNP sensors with sinking inputs, NPN with sourcing inputs.", handsTo: ["Beacon"] },
      { kicker: "Scene 3 of 3 · Last", title: "The output that moves", lines: [5, 5], lead: "The contactor needs two buttons held.", body: "Outputs that move machinery are tested last, with the area clear.", handsTo: ["Motor_Run"] },
    ],
    story: [
      { t: "I0.0", text: "Start: the run lamp lights. Input and output proved." },
      { t: "I0.1", text: "Stop: the fault lamp lights." },
      { t: "I0.3, I0.4", text: "E-stop and AUX: the beacon lights." },
      { t: "Q0.0", text: "Start and AUX together: the contactor pulls in." },
    ],
    words: [...BASE, { term: "Common", meaning: "The shared return terminal of a group of inputs or outputs." }, { term: "Sourcing", meaning: "An output that supplies positive voltage to its load." }, { term: "Loop check", meaning: "Proving each signal from the field device to the PLC and back." }],
  },

  "w-projects": {
    goal: "Know what a PLC project contains, download it and watch values live.",
    learn: ["project", "hardware configuration", "download", "online monitoring", "forcing"],
    wires: [1, 2, 3, 4, 6, 7, 10],
    steps: [
      "Switch the PLC to RUN. Running a program here is like downloading it to a real PLC.",
      "Start and stop the motor twice. Watch Starts.ACC climb in the code card: that is going online.",
      "Tap AUX to reset the count.",
      "Change 999 to 3 and run. The counter's done bit now turns on after three starts.",
      "Think about forcing: setting Motor_Run by hand would start a real motor. Never do it without checking.",
    ],
    between: ["Stop, download, run: in that order.", "Keep a backup before you download.", ...BETWEEN.slice(2)],
    tour: [
      { kicker: "Scene 1 of 3 · The project", title: "More than code", lines: [1, 2], lead: "A project holds the hardware setup, the tags and the program.", body: "TIA Portal and Studio 5000 both start with the hardware: which CPU, which cards, which addresses.", handsTo: ["Motor_Run"] },
      { kicker: "Scene 2 of 3 · Online", title: "Watching it live", lines: [3, 3], lead: "Each new start adds one to Starts.", body: "Online, the software shows live values and colours true contacts green, exactly like the code card here.", handsTo: ["Starts"] },
      { kicker: "Scene 3 of 3 · Care", title: "Forcing", lines: [4, 4], lead: "AUX resets the count.", body: "Forcing sets a value no matter what the program says. It is a fault finding tool, and on a real machine it can start equipment.", precise: "Always remove forces before you leave, and say so in the handover.", handsTo: ["Aux_PB"] },
    ],
    story: [
      { t: "download", text: "The program is copied into the PLC and it goes to RUN." },
      { t: "online", text: "You watch Starts.ACC change as you start the motor." },
      { t: "change", text: "You edit the preset, download again and watch the new behaviour." },
    ],
    words: [...BASE, { term: "Download", meaning: "Copying the program from the laptop into the PLC." }, { term: "Online", meaning: "Connected to a running PLC, watching live values." }, { term: "Force", meaning: "Setting a value by hand, overriding the program. Dangerous on live plant." }],
  },

  "w-backups": {
    goal: "Back up before every change, version the program and record what changed.",
    learn: ["upload", "backup", "version numbers", "change records", "rolling back"],
    wires: [1, 2, 3, 4, 6, 7, 8],
    steps: [
      "Read the comment on line 1: version, date, who and why.",
      "Switch the PLC to RUN and start the motor. Version reads 2 and the run lamp works.",
      "Imagine the change went wrong. Going back means downloading the saved version 1.",
      "Write your own change: add a beacon that lights on a trip, make it version 3 and update the comment.",
      "Name your saved file the way the facts suggest.",
    ],
    between: ["Back up first, change second.", ...BETWEEN],
    tour: [
      { kicker: "Scene 1 of 3 · The record", title: "What, why, who, when", lines: [1, 1], lead: "The first line records the change.", body: "On site the record also goes in the machine's log book and the change form.", handsTo: [] },
      { kicker: "Scene 2 of 3 · The version", title: "Readable online", lines: [2, 2], lead: "MOV(2, Version) writes the version every scan.", body: "Anyone online can see which program is running, without guessing.", handsTo: ["Version"] },
      { kicker: "Scene 3 of 3 · The change", title: "The new rung", lines: [4, 4], lead: "The run lamp rung is what version 2 added.", body: "Small, recorded changes are easy to check and easy to undo.", precise: "Compare tools in TIA Portal and Studio 5000 show exactly what changed between two versions.", handsTo: ["Run_Lamp"] },
    ],
    story: [
      { t: "before", text: "Upload the running program and save it as version 1." },
      { t: "change", text: "Add the run lamp rung and set Version to 2." },
      { t: "record", text: "Write the comment and the log book entry." },
      { t: "if wrong", text: "Download version 1 again. The machine is back as it was." },
    ],
    words: [...BASE, { term: "Upload", meaning: "Copying the program from the PLC to the laptop." }, { term: "Backup", meaning: "A saved copy of a working program, kept off the laptop too." }, { term: "Version", meaning: "A number that names each change of a program." }],
  },

  "f-pneu-air": {
    goal: "Know how compressed air moves a cylinder, and send one out and home from the PLC.",
    learn: ["compressor and receiver", "the FRL unit", "5/2 single solenoid valve", "double acting cylinder", "reed switches"],
    wires: [1, 2, 3, 4, 6, 7, 8],
    steps: [
      "Switch the PLC to RUN.",
      "Tap Start. Y1 energises and cylinder A goes out. When it reaches the end, its reed switch lights the cycle lamp.",
      "Tap Stop. Y1 releases and the spring in the valve sends A home.",
      "Turn the air off at the FRL from its popover and tap Start. Air_OK is 0, so nothing happens.",
      "Now think: if the program did not check Air_OK, the valve would switch and the cylinder would not move. The reed switch would tell you.",
    ],
    between: ["Dump the air before you touch a cylinder.", ...BETWEEN],
    tour: [
      { kicker: "Scene 1 of 3 · The air", title: "From compressor to valve", lines: [2, 2], lead: "Start only sends A out when the pressure switch says the air is on.", body: "The compressor fills a receiver. The FRL filters the air, sets it to about 6 bar and adds a little oil.", handsTo: ["Start_PB", "Air_OK"] },
      { kicker: "Scene 2 of 3 · The valve", title: "One coil, one spring", lines: [4, 4], lead: "A_Extend energises Y1 and A goes out.", body: "A 5/2 valve has five ports and two positions. With one solenoid, a spring returns it when the coil drops out.", precise: "Lose power and a single solenoid valve goes back to its rest position. Designers choose that rest position so the machine is safe.", handsTo: ["A_Extend"] },
      { kicker: "Scene 3 of 3 · The proof", title: "Reed switches", lines: [5, 5], lead: "A_End closes when the magnet in the piston reaches it.", body: "The output only says what the PLC asked for. The reed switch says what the cylinder actually did.", handsTo: ["A_End", "Run_Lamp"] },
    ],
    story: [
      { t: "Start", text: "Air is on, so A_Out latches and Y1 energises." },
      { t: "moving", text: "Air pushes the piston out. A_Home opens." },
      { t: "A_End", text: "The magnet reaches the end switch: the cycle lamp lights." },
      { t: "Stop", text: "A_Out unlatches, Y1 drops out and the spring sends A home." },
    ],
    words: [...BASE, { term: "FRL", meaning: "Filter, regulator and lubricator: cleans the air and sets its pressure." }, { term: "5/2 valve", meaning: "A valve with five ports and two positions, used to drive a double acting cylinder." }, { term: "Reed switch", meaning: "A switch on the cylinder barrel that closes when the piston's magnet is beside it." }],
  },

  "f-pneu-seq": {
    goal: "Run an A+ B+ B- A- sequence where each move waits for the sensor of the one before.",
    learn: ["sequence notation", "step numbers", "double solenoid valves", "waiting on sensors", "counting cycles"],
    wires: [1, 2, 3, 4, 5, 6, 7, 8],
    steps: [
      "Switch the PLC to RUN with parts in the magazine.",
      "Tap Start. Watch Step in the code card go 1, 2, 3, 4 and back to 0.",
      "Watch the cylinders: A pushes the part under the press, B comes down, goes up, then A comes home.",
      "Use A's end switch fault from its popover. Start again: the sequence waits at step 1 and nothing else moves.",
      "Clear the fault. Cycles.ACC counts each finished cycle.",
    ],
    between: BETWEEN,
    tour: [
      { kicker: "Scene 1 of 4 · Ready", title: "Step 0 is home", lines: [2, 2], lead: "A cycle starts only with air, a part and both cylinders home.", body: "These checks are called start conditions. Every machine sequence has them.", handsTo: ["Start_PB", "Part_In", "A_Home", "B_Home"] },
      { kicker: "Scene 2 of 4 · Waiting", title: "Move, then prove", lines: [3, 5], lead: "Each step moves on only when the reed switch of its move closes.", body: "If a cylinder sticks, the sequence stops on that step. The step number tells you where to look.", handsTo: ["Step", "A_End", "B_End"] },
      { kicker: "Scene 3 of 4 · Outputs", title: "Decided by the step", lines: [9, 11], lead: "The outputs look only at Step.", body: "Keeping moves and step changes in separate rungs makes the program easy to read and to fault find.", precise: "B uses a double solenoid valve. It stays where it was sent when both coils are off, so B_Extend and B_Retract are each on for one step.", handsTo: ["A_Extend", "B_Extend", "B_Retract"] },
      { kicker: "Scene 4 of 4 · Done", title: "Count and go home", lines: [6, 8], lead: "A home at step 4 counts the cycle and returns to step 0.", body: "Stop sends the sequence back to step 0 at any time.", handsTo: ["Cycles"] },
    ],
    story: [
      { t: "Step 1, A+", text: "A pushes a part out of the magazine." },
      { t: "Step 2, B+", text: "B comes down to press it." },
      { t: "Step 3, B-", text: "B goes back up." },
      { t: "Step 4, A-", text: "A comes home, the cycle is counted, and Step returns to 0." },
    ],
    words: [...BASE, { term: "A+ / A-", meaning: "Cylinder A out / cylinder A home." }, { term: "Step", meaning: "A number that says which move of the sequence is happening." }, { term: "Double solenoid", meaning: "A valve with a coil each side. It stays where it was last sent." }],
  },

  "f-hmi-what": {
    goal: "Know what an HMI and SCADA are, and run a process from a screen.",
    learn: ["HMI", "SCADA", "screen tags", "screen buttons are not safety devices", "common products"],
    wires: [1, 2, 3, 5, 6, 7],
    steps: [
      "Switch the PLC to RUN.",
      "Touch START on the screen. AUTO shows and the inlet opens.",
      "Watch the level bar and the trend on the screen follow the tank.",
      "Touch STOP on the screen. The process stops, exactly like the panel Stop.",
      "Try starting from the panel and stopping from the screen. The program does not care where the bit came from.",
    ],
    between: ["The screen writes bits; the program decides.", ...BETWEEN],
    tour: [
      { kicker: "Scene 1 of 3 · The screen", title: "A window into the PLC", lines: [2, 2], lead: "HMI_Start is a bit the screen writes while you touch it.", body: "The HMI reads tags to draw the picture and writes tags when you press. It holds no machine logic itself.", handsTo: ["HMI_Start", "HMI_Stop"] },
      { kicker: "Scene 2 of 3 · Two ways in", title: "Panel or screen", lines: [2, 2], lead: "Either Start works, and either Stop stops.", body: "The panel Stop is wired NC and is the one you trust. A screen can freeze or lose its link.", precise: "Screen buttons must never be the only way to stop. E-stops and safety stops stay hard wired.", handsTo: ["Start_PB", "Stop_PB"] },
      { kicker: "Scene 3 of 3 · SCADA", title: "The whole plant", lines: [3, 3], lead: "The fill rung runs no matter which screen started it.", body: "SCADA in a control room reads many PLCs, logs history and raises alarms for a whole plant, such as a water works.", handsTo: ["Inlet_Valve"] },
    ],
    story: [
      { t: "touch", text: "The HMI writes HMI_Start = 1 while your finger is on it." },
      { t: "scan", text: "The PLC sees the bit and seals in Run_Lamp." },
      { t: "show", text: "The HMI reads Run_Lamp and shows AUTO." },
    ],
    words: [...BASE, { term: "HMI", meaning: "Human machine interface: the operator screen at a machine." }, { term: "SCADA", meaning: "Supervisory control and data acquisition: software that watches a whole plant." }, { term: "Screen tag", meaning: "A PLC tag the HMI reads or writes." }],
  },

  "f-hmi-screen": {
    goal: "Show the state of a process clearly, using a status number the screen turns into words.",
    learn: ["status words", "MOV", "later rungs win", "clear colour use", "ISA-101 idea"],
    wires: [1, 2, 3, 5, 6, 7],
    steps: [
      "Switch the PLC to RUN. Status reads 0.",
      "Touch START. Status becomes 1 while the inlet is open.",
      "Wait for the high float. Status becomes 2.",
      "Stop. Status goes back to 0.",
      "Think of a status 3, such as alarm. Where would its rung go so it wins over the others?",
    ],
    between: BETWEEN,
    tour: [
      { kicker: "Scene 1 of 3 · Default", title: "Start at zero", lines: [4, 4], lead: "Every scan, Status is first set to 0.", body: "Then later rungs overwrite it if something else is true.", handsTo: ["Status"] },
      { kicker: "Scene 2 of 3 · Filling", title: "One number, one meaning", lines: [5, 5], lead: "Auto and the inlet open make Status 1.", body: "The screen turns 1 into FILLING. Changing the words never touches the PLC.", handsTo: ["Inlet_Valve"] },
      { kicker: "Scene 3 of 3 · Full", title: "Later rungs win", lines: [6, 6], lead: "At the high float Status becomes 2.", body: "If two rungs write the same word, the last one in the scan decides.", precise: "Good screens are mostly grey. Colour is kept for things that need the operator, so they stand out.", handsTo: ["Float_High"] },
    ],
    story: [
      { t: "0", text: "Stopped: grey." },
      { t: "1", text: "Filling: the valve shows open." },
      { t: "2", text: "Full: the high float is covered." },
    ],
    words: [...BASE, { term: "Status word", meaning: "A number the program writes so the screen can show a state." }, { term: "MOV", meaning: "Copies a value into a word." }, { term: "ISA-101", meaning: "A standard for operator screens: calm, grey, colour only for what matters." }],
  },

  "f-hmi-alarms": {
    goal: "Raise, acknowledge and clear an alarm, and read the trend.",
    learn: ["alarm delay", "latching alarms", "acknowledge", "clear with hysteresis", "trends"],
    wires: [1, 2, 3, 5, 6, 7, 8],
    steps: [
      "Switch the PLC to RUN and touch START.",
      "Make the inlet valve stick open from its popover. Watch the level pass 85 % on the trend.",
      "After 2 s the alarm flashes on the screen and the alarm lamp lights.",
      "Touch ACK. The banner goes steady: someone has seen it.",
      "Clear the valve fault and stop. When the level falls below 80 % the alarm clears.",
    ],
    between: ["An alarm needs an action. If it needs none, it should not be an alarm.", ...BETWEEN],
    tour: [
      { kicker: "Scene 1 of 4 · Raise", title: "Above 85 % for 2 s", lines: [4, 5], lead: "The level must stay high for 2 s before the alarm latches.", body: "The delay stops a ripple on the surface raising and dropping the alarm many times.", handsTo: ["Level_Raw", "Alarm_Active"] },
      { kicker: "Scene 2 of 4 · Acknowledge", title: "Someone has seen it", lines: [6, 6], lead: "ACK from the screen sets Alarm_Acked.", body: "Acknowledging does not fix anything. It only says an operator knows.", handsTo: ["HMI_Ack", "Alarm_Acked"] },
      { kicker: "Scene 3 of 4 · Clear", title: "Acknowledged and gone", lines: [7, 8], lead: "It clears below 80 %, not 85 %.", body: "The gap between raise and clear is hysteresis. Without it the alarm would chatter at the limit.", handsTo: ["Alarm_Active"] },
      { kicker: "Scene 4 of 4 · Show", title: "Lamp and banner", lines: [9, 9], lead: "The lamp and the banner follow the alarm.", body: "The trend shows how the level got there, which often tells you why.", precise: "Too many alarms are as bad as none. Operators stop reading them.", handsTo: ["Alarm_Lamp"] },
    ],
    story: [
      { t: "high", text: "The level passes 85 % and stays there for 2 s." },
      { t: "flashing", text: "Unacknowledged: the banner flashes red." },
      { t: "ACK", text: "Acknowledged: the banner goes steady." },
      { t: "clear", text: "Below 80 % and acknowledged: the alarm clears." },
    ],
    words: [...BASE, { term: "Acknowledge", meaning: "Telling the system an operator has seen an alarm." }, { term: "Hysteresis", meaning: "A gap between the raise and clear limits so a signal does not chatter." }, { term: "Trend", meaning: "A graph of a value over time." }],
  },
};
