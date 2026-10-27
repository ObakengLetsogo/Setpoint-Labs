import type { LessonContent } from "../types";
import { IO } from "./io";

const SEAL = "RUNG 1: (XIC(Start_PB) OR XIC(Run_Seal)) AND XIO(Stop_PB) AND XIC(Overload_OK) OTE(Run_Seal)";

/** Foundations lessons beyond the first three, all on the motor starter bench. */
export const FOUNDATIONS_MORE: Record<string, LessonContent> = {
  "f-symbols": {
    difficulty: "beginner",
    checkpoint: {
      steps: [(m) => Boolean(m.Beacon), (m) => !m.Beacon, (m) => Boolean(m["Run_T.DN"])],
      message: "latched the beacon, unlatched it and ran the timer to its preset",
    },
    summary:
      "Ladder logic is drawn with a handful of symbols. This lab puts the common ones on one panel: open and closed contacts, a plain coil, latch and unlatch coils and a timer. Run it and press each button to see what every symbol does.",
    facts: [
      { icon: "press", text: "Hold Start: the plain coil follows the rung while you hold it." },
      { icon: "watch", text: "Tap AUX: the latch coil turns the beacon on and keeps it on. Tap Stop to unlatch it." },
      { icon: "bolt", text: "Hold Start for two seconds: the timer finishes and its done bit lights the run lamp." },
    ],
    io: [IO.start, IO.stop, IO.aux, IO.ol, IO.run, IO.runLamp, IO.faultLamp, IO.beacon],
    steps: [
      { line: 2, text: "XIC is the normally open contact, XIO the normally closed one. OTE is the plain coil." },
      { line: 3, text: "OTL is a latch coil. One true scan sets Beacon and it stays set." },
      { line: 4, text: "OTU is the unlatch coil. It clears what OTL set." },
      { line: 5, text: "TON is a timer box. It counts while its rung is true." },
      { line: 6, text: "Run_T.DN is the timer's done bit, used here as an ordinary contact." },
      { line: 7, text: "The same input can be read either way round: XIO(Overload_OK) lights the fault lamp on a trip." },
    ],
    code: [
      "// Six symbols on one panel. Run it, then try each button.",
      "RUNG 1: XIC(Start_PB) XIO(Stop_PB) OTE(Motor_Run)",
      "RUNG 2: XIC(Aux_PB) OTL(Beacon)",
      "RUNG 3: XIC(Stop_PB) OTU(Beacon)",
      "RUNG 4: XIC(Motor_Run) TON(Run_T, 2000)",
      "RUNG 5: XIC(Run_T.DN) OTE(Run_Lamp)",
      "RUNG 6: XIO(Overload_OK) OTE(Fault_Lamp)",
    ],
    specs: [
      { label: "Rungs", value: "6" },
      { label: "Symbols", value: "XIC · XIO · OTE · OTL · OTU · TON" },
      { label: "Scan time", value: "100 ms" },
      { label: "Level", value: "Beginner" },
    ],
  },

  "f-scan": {
    difficulty: "beginner",
    checkpoint: { steps: [(m) => Boolean(m.Run_Lamp) && !m.Motor_Run, (m) => Boolean(m.Motor_Run)], message: "saw the motor turn on one scan after the lamp" },
    summary:
      "A PLC never reacts to a wire directly. It copies every input into memory, solves the rungs from top to bottom, then writes the outputs. That loop is the scan, and the order of your rungs decides what each rung can see.",
    facts: [
      { icon: "info", text: "Inputs are read once at the start of each scan, into the input image." },
      { icon: "watch", text: "Rungs run top to bottom. A rung only sees what earlier rungs wrote in this scan." },
      { icon: "bolt", text: "Outputs are written at the end of the scan, all at once." },
    ],
    io: [IO.start, IO.aux, IO.run, IO.runLamp, IO.beacon],
    steps: [
      { line: 2, text: "Rung 1 reads Run_Lamp before rung 2 has written it this scan, so it sees the value from the last scan." },
      { line: 3, text: "Rung 2 copies Start to the run lamp. The motor follows one scan later." },
      { line: 4, text: "Rung 3 is the simplest program there is: one input straight to one output." },
    ],
    code: [
      "// Two rungs written in the wrong order on purpose.",
      "RUNG 1: XIC(Run_Lamp) OTE(Motor_Run)",
      "RUNG 2: XIC(Start_PB) OTE(Run_Lamp)",
      "RUNG 3: XIC(Aux_PB) OTE(Beacon)",
    ],
    specs: [
      { label: "Rungs", value: "3" },
      { label: "Idea", value: "Scan order" },
      { label: "Delay shown", value: "1 scan" },
      { label: "Level", value: "Beginner" },
    ],
  },

  "f-latch": {
    difficulty: "beginner",
    checkpoint: { steps: [(m, i) => Boolean(m.Motor_Run) && !i.Start_PB, (m) => !m.Motor_Run], message: "latched the motor on and unlatched it" },
    summary:
      "A latch coil sets a bit and leaves it set, even after the rung goes false. An unlatch coil clears it. Latches are tidy for remembering events, but they need care: on many PLCs a latched output keeps its state through a power cut.",
    facts: [
      { icon: "press", text: "Tap Start. The motor latches on and stays on." },
      { icon: "bolt", text: "Tap Stop, or trip the overload. Either one unlatches the motor." },
      { icon: "shield", text: "Ask what happens after a power cut. A latched motor could restart by itself." },
    ],
    io: [IO.start, IO.stop, IO.ol, IO.run, IO.runLamp],
    steps: [
      { line: 2, text: "OTL(Motor_Run) sets the motor bit when Start is pressed and the overload is healthy." },
      { line: 3, text: "OTU(Motor_Run) clears it when Stop is pressed or the overload trips." },
      { line: 4, text: "The run lamp follows the motor bit with a plain coil." },
    ],
    code: [
      "// Latch on with Start, unlatch with Stop or a trip.",
      "RUNG 1: XIC(Start_PB) XIC(Overload_OK) OTL(Motor_Run)",
      "RUNG 2: XIC(Stop_PB) OR XIO(Overload_OK) OTU(Motor_Run)",
      "RUNG 3: XIC(Motor_Run) OTE(Run_Lamp)",
    ],
    specs: [
      { label: "Rungs", value: "3" },
      { label: "Instructions", value: "OTL · OTU" },
      { label: "Retentive", value: "Yes, on most PLCs" },
      { label: "Level", value: "Beginner" },
    ],
  },

  "f-jog": {
    difficulty: "beginner",
    checkpoint: { steps: [(m, i) => Boolean(m.Motor_Run) && Boolean(i.Aux_PB) && !m.Run_Seal], message: "jogged the motor on AUX without sealing in" },
    summary:
      "Jog runs a motor only while you hold a button, for lining up a belt or a coupling. The trick is that jog must never seal in. Here the AUX button jogs, and it also breaks the seal so a jog can never leave the motor running.",
    facts: [
      { icon: "press", text: "Hold AUX. The motor runs only while you hold it." },
      { icon: "watch", text: "Tap Start. The seal holds the motor on, as before." },
      { icon: "shield", text: "Hold AUX while running. The seal drops, so letting go stops the motor." },
    ],
    io: [IO.start, IO.stop, IO.aux, IO.ol, IO.run, IO.runLamp, IO.seal],
    steps: [
      { line: 2, text: "XIO(Aux_PB) in the seal rung: pressing jog breaks the seal, so a jog never latches." },
      { line: 3, text: "The motor runs from the seal OR from AUX, and Stop or a trip always wins." },
      { line: 4, text: "The run lamp only shows a sealed run, not a jog." },
    ],
    code: [
      "// AUX jogs: the motor runs only while you hold it.",
      "RUNG 1: (XIC(Start_PB) OR XIC(Run_Seal)) AND XIO(Stop_PB) AND XIO(Aux_PB) AND XIC(Overload_OK) OTE(Run_Seal)",
      "RUNG 2: (XIC(Run_Seal) OR XIC(Aux_PB)) AND XIO(Stop_PB) AND XIC(Overload_OK) OTE(Motor_Run)",
      "RUNG 3: XIC(Run_Seal) OTE(Run_Lamp)",
    ],
    specs: [
      { label: "Rungs", value: "3" },
      { label: "Pattern", value: "Jog and run" },
      { label: "Jog button", value: "AUX · I0.4" },
      { label: "Level", value: "Beginner" },
    ],
  },

  "f-ton": {
    difficulty: "beginner",
    checkpoint: { steps: [(m) => Boolean(m.Beacon), (m) => Boolean(m.Motor_Run) && Boolean(m["Warn_T.DN"])], message: "warned for three seconds, then started" },
    summary:
      "An on-delay timer waits before it acts. Large machines warn people before they move: press Start and the beacon sounds for three seconds, then the motor starts. Press Stop during the warning and nothing moves.",
    facts: [
      { icon: "press", text: "Tap Start. The beacon sounds and the timer counts to 3 s." },
      { icon: "watch", text: "At the preset the done bit turns on and the motor starts." },
      { icon: "shield", text: "Tap Stop during the warning. The start request is cancelled." },
    ],
    io: [IO.start, IO.stop, IO.ol, IO.run, IO.runLamp, IO.beacon],
    steps: [
      { line: 2, text: "Start_Req seals in like Run_Seal did. It means someone asked for a start." },
      { line: 3, text: "TON(Warn_T, 3000) counts while the request is on. ACC climbs to the preset of 3000 ms." },
      { line: 4, text: "The beacon sounds while the request is on but the timer is not done." },
      { line: 5, text: "Warn_T.DN turns on at the preset and runs the motor." },
    ],
    code: [
      "// Warn for three seconds before the motor starts.",
      "RUNG 1: (XIC(Start_PB) OR XIC(Start_Req)) AND XIO(Stop_PB) AND XIC(Overload_OK) OTE(Start_Req)",
      "RUNG 2: XIC(Start_Req) TON(Warn_T, 3000)",
      "RUNG 3: XIC(Start_Req) XIO(Warn_T.DN) OTE(Beacon)",
      "RUNG 4: XIC(Warn_T.DN) OTE(Motor_Run) OTE(Run_Lamp)",
    ],
    specs: [
      { label: "Rungs", value: "4" },
      { label: "Timer", value: "TON · 3 s" },
      { label: "Bits", value: ".EN · .TT · .DN · .ACC" },
      { label: "Level", value: "Beginner" },
    ],
  },

  "f-tof": {
    difficulty: "beginner",
    checkpoint: { steps: [(m) => Boolean(m.Motor_Run), (m) => !m.Motor_Run && Boolean(m.Run_Lamp)], message: "kept the lamp lit while the motor coasted down" },
    summary:
      "An off-delay timer keeps its done bit on for a while after the rung goes false. A motor keeps turning after you stop it, so the run lamp stays lit for five seconds as a warning that the shaft is still moving.",
    facts: [
      { icon: "press", text: "Start the motor, then tap Stop." },
      { icon: "watch", text: "The contactor drops at once, but the run lamp stays lit for 5 s." },
      { icon: "info", text: "TOF is the mirror of TON: it delays the off, not the on." },
    ],
    io: [IO.start, IO.stop, IO.ol, IO.run, IO.runLamp, IO.seal],
    steps: [
      { line: 2, text: "The usual seal-in rung." },
      { line: 3, text: "The contactor follows the seal, so Stop removes power at once." },
      { line: 4, text: "TOF(Coast_T, 5000): its done bit turns on with the rung and stays on 5 s after it goes false." },
      { line: 5, text: "The run lamp follows the off-delay done bit." },
    ],
    code: [
      "// The run lamp stays lit while the shaft coasts down.",
      SEAL,
      "RUNG 2: XIC(Run_Seal) OTE(Motor_Run)",
      "RUNG 3: XIC(Run_Seal) TOF(Coast_T, 5000)",
      "RUNG 4: XIC(Coast_T.DN) OTE(Run_Lamp)",
    ],
    specs: [
      { label: "Rungs", value: "4" },
      { label: "Timer", value: "TOF · 5 s" },
      { label: "Use", value: "Run-on warnings, fans, pumps" },
      { label: "Level", value: "Beginner" },
    ],
  },

  "f-flasher": {
    difficulty: "intermediate",
    checkpoint: { steps: [(m) => Boolean(m.Alarm), (m) => Boolean(m.Alarm_Ack), (m) => !m.Alarm], message: "raised, acknowledged and cleared an alarm" },
    summary:
      "Good alarms follow a pattern. A new alarm flashes and sounds. Acknowledging it silences the sounder and the lamp goes steady. When the cause is fixed the alarm clears. Two timers make the flasher.",
    facts: [
      { icon: "bolt", text: "Trip the overload. The fault lamp flashes and the beacon sounds." },
      { icon: "press", text: "Tap AUX to acknowledge. The beacon stops and the lamp goes steady." },
      { icon: "watch", text: "Reset the overload. The alarm clears and the lamp goes out." },
    ],
    io: [IO.start, IO.stop, IO.aux, IO.ol, IO.run, IO.runLamp, IO.faultLamp, IO.beacon],
    steps: [
      { line: 2, text: "Flash_A times 0.5 s while Flash_B is not done." },
      { line: 3, text: "Flash_B times the next 0.5 s, then resets Flash_A. Flash_A.DN is now a 1 Hz flasher." },
      { line: 6, text: "A trip latches the Alarm bit, so a short trip is never missed." },
      { line: 7, text: "AUX acknowledges: Alarm_Ack latches while the alarm is up." },
      { line: 8, text: "When the overload is healthy again and the alarm was acknowledged, both bits clear." },
      { line: 9, text: "The lamp flashes before the acknowledge and goes steady after it." },
      { line: 10, text: "The beacon sounds only until someone acknowledges." },
    ],
    code: [
      "// Flash until acknowledged, steady until cleared.",
      "RUNG 1: XIO(Flash_B.DN) TON(Flash_A, 500)",
      "RUNG 2: XIC(Flash_A.DN) TON(Flash_B, 500)",
      SEAL.replace("RUNG 1", "RUNG 3"),
      "RUNG 4: XIC(Run_Seal) OTE(Motor_Run) OTE(Run_Lamp)",
      "RUNG 5: XIO(Overload_OK) OTL(Alarm)",
      "RUNG 6: XIC(Alarm) XIC(Aux_PB) OTL(Alarm_Ack)",
      "RUNG 7: XIC(Overload_OK) XIC(Alarm_Ack) OTU(Alarm) OTU(Alarm_Ack)",
      "RUNG 8: XIC(Alarm) (XIO(Alarm_Ack) XIC(Flash_A.DN) OR XIC(Alarm_Ack)) OTE(Fault_Lamp)",
      "RUNG 9: XIC(Alarm) XIO(Alarm_Ack) OTE(Beacon)",
    ],
    specs: [
      { label: "Rungs", value: "9" },
      { label: "Flasher", value: "2 × TON · 1 Hz" },
      { label: "Pattern", value: "Flash, acknowledge, clear" },
      { label: "Level", value: "Intermediate" },
    ],
  },

  "f-counters": {
    difficulty: "beginner",
    checkpoint: { steps: [(m) => Boolean(m["Starts.DN"]), (m) => !m["Starts.DN"]], message: "counted five starts and reset the counter" },
    summary:
      "A counter adds one every time its rung turns on. Here it counts motor starts. After five starts the beacon asks for a service. Hold AUX while the motor is stopped to reset the count, as a technician would after the service.",
    facts: [
      { icon: "press", text: "Start and stop the motor five times." },
      { icon: "watch", text: "The counter's ACC climbs by one per start. At 5 its done bit lights the beacon." },
      { icon: "bolt", text: "With the motor stopped, press AUX to reset the count." },
    ],
    io: [IO.start, IO.stop, IO.aux, IO.ol, IO.run, IO.runLamp, IO.beacon, IO.seal],
    steps: [
      { line: 2, text: "The usual seal-in rung." },
      { line: 4, text: "CTU(Starts, 5) adds one each time Run_Seal turns on, not on every scan it stays on." },
      { line: 5, text: "Starts.DN turns on once ACC reaches the preset of 5." },
      { line: 6, text: "RES clears the count. XIO(Run_Seal) stops anyone resetting it while the motor runs." },
    ],
    code: [
      "// Count the starts. After five, the beacon asks for a service.",
      SEAL,
      "RUNG 2: XIC(Run_Seal) OTE(Motor_Run) OTE(Run_Lamp)",
      "RUNG 3: XIC(Run_Seal) CTU(Starts, 5)",
      "RUNG 4: XIC(Starts.DN) OTE(Beacon)",
      "RUNG 5: XIC(Aux_PB) XIO(Run_Seal) RES(Starts)",
    ],
    specs: [
      { label: "Rungs", value: "5" },
      { label: "Counter", value: "CTU · preset 5" },
      { label: "Bits", value: ".ACC · .PRE · .DN" },
      { label: "Level", value: "Beginner" },
    ],
  },

  "f-compare": {
    difficulty: "intermediate",
    checkpoint: { steps: [(m) => Number(m.Run_Seconds) >= 3, (m) => Boolean(m.High_Trip)], message: "logged run time and tripped a jammed motor on current" },
    summary:
      "Analog values are numbers, and compare instructions turn numbers into true or false. The bench measures motor current. Above 4 A the beacon warns; above 6 A for two seconds the PLC trips the motor before the thermal overload does. A one second timer and ADD log the run time.",
    facts: [
      { icon: "watch", text: "Start the motor. The start current spikes for a moment, then settles near 1 A." },
      { icon: "bolt", text: "Jam the shaft from the motor popover. Current climbs, the beacon warns, then the PLC trips." },
      { icon: "info", text: "Motor_Amps counts tenths of an amp: 26 means 2.6 A." },
    ],
    io: [IO.start, IO.stop, IO.aux, IO.ol, IO.amps, IO.run, IO.runLamp, IO.faultLamp, IO.beacon],
    steps: [
      { line: 2, text: "The seal-in now also drops on High_Trip." },
      { line: 4, text: "GRT(Motor_Amps, 40) is true while the current is above 4.0 A." },
      { line: 5, text: "Above 6.0 A a timer starts. The short spike at every start never lasts 2 s." },
      { line: 6, text: "If it does, High_Trip latches and stops the motor." },
      { line: 8, text: "AUX clears the trip, but only while the motor is stopped." },
      { line: 9, text: "Sec_T restarts itself every second while the motor runs." },
      { line: 10, text: "Each time it finishes, ADD adds one to Run_Seconds." },
    ],
    code: [
      "// Warn above 4 A, trip above 6 A for 2 s, log the run time.",
      "RUNG 1: (XIC(Start_PB) OR XIC(Run_Seal)) AND XIO(Stop_PB) AND XIC(Overload_OK) AND XIO(High_Trip) OTE(Run_Seal)",
      "RUNG 2: XIC(Run_Seal) OTE(Motor_Run) OTE(Run_Lamp)",
      "RUNG 3: GRT(Motor_Amps, 40) OTE(Beacon)",
      "RUNG 4: GRT(Motor_Amps, 60) TON(High_T, 2000)",
      "RUNG 5: XIC(High_T.DN) OTL(High_Trip)",
      "RUNG 6: XIC(High_Trip) OTE(Fault_Lamp)",
      "RUNG 7: XIC(Aux_PB) XIO(Run_Seal) OTU(High_Trip)",
      "RUNG 8: XIC(Motor_Run) XIO(Sec_T.DN) TON(Sec_T, 1000)",
      "RUNG 9: XIC(Sec_T.DN) ADD(Run_Seconds, 1, Run_Seconds)",
    ],
    specs: [
      { label: "Rungs", value: "9" },
      { label: "Analog in", value: "IW64 · 0.1 A per count" },
      { label: "Instructions", value: "GRT · TON · ADD" },
      { label: "Level", value: "Intermediate" },
    ],
  },

  "f-edge": {
    difficulty: "intermediate",
    checkpoint: { steps: [(m) => Boolean(m.Turn_On), (m) => Boolean(m.Turn_Off)], message: "toggled the motor on and off with one button" },
    summary:
      "Edge detection catches the moment a signal changes, not how long it stays on. A one shot passes power for a single scan when its rung turns on. With it, one AUX button can start the motor on one tap and stop it on the next.",
    facts: [
      { icon: "press", text: "Tap AUX. The motor starts." },
      { icon: "press", text: "Tap AUX again. The motor stops." },
      { icon: "info", text: "Without the one shot, a press lasting several scans would toggle on, off, on..." },
    ],
    io: [IO.stop, IO.aux, IO.ol, IO.run, IO.runLamp],
    steps: [
      { line: 2, text: "ONS(Aux_OS) passes for one scan when AUX goes from 0 to 1. Aux_OS stores last scan's state." },
      { line: 3, text: "A tap while stopped means turn on." },
      { line: 4, text: "A tap while running means turn off. Both rungs read Run_Cmd before it changes." },
      { line: 5, text: "Turn_On latches the run command." },
      { line: 6, text: "Turn_Off, Stop or a trip unlatches it." },
      { line: 7, text: "The contactor and lamp follow the run command." },
    ],
    code: [
      "// One button, two jobs: tap AUX to start, tap again to stop.",
      "RUNG 1: XIC(Aux_PB) ONS(Aux_OS) OTE(Aux_Tap)",
      "RUNG 2: XIC(Aux_Tap) XIO(Run_Cmd) OTE(Turn_On)",
      "RUNG 3: XIC(Aux_Tap) XIC(Run_Cmd) OTE(Turn_Off)",
      "RUNG 4: XIC(Turn_On) OTL(Run_Cmd)",
      "RUNG 5: XIC(Turn_Off) OR XIC(Stop_PB) OR XIO(Overload_OK) OTU(Run_Cmd)",
      "RUNG 6: XIC(Run_Cmd) OTE(Motor_Run) OTE(Run_Lamp)",
    ],
    specs: [
      { label: "Rungs", value: "6" },
      { label: "Instruction", value: "ONS · one shot" },
      { label: "Pattern", value: "Push on, push off" },
      { label: "Level", value: "Intermediate" },
    ],
  },

  "f-estop": {
    difficulty: "intermediate",
    checkpoint: {
      steps: [(m) => Boolean(m.EStop_Latched), (m, i) => Boolean(i.EStop_OK) && !m.EStop_Latched && Boolean(m.Motor_Run)],
      message: "stopped on the E-stop, reset it and restarted",
    },
    summary:
      "An E-stop must stop the machine and keep it stopped until someone deliberately resets it. Releasing the mushroom is not enough. On real plant the E-stop breaks the power through a safety relay; the PLC only watches it and manages the reset.",
    facts: [
      { icon: "shield", text: "Press the E-stop while running. Everything stops and the fault lamp lights." },
      { icon: "press", text: "Release it. The motor still cannot start." },
      { icon: "bolt", text: "Press AUX to reset, then Start." },
    ],
    io: [IO.start, IO.stop, IO.estop, IO.aux, IO.ol, IO.run, IO.runLamp, IO.faultLamp],
    steps: [
      { line: 2, text: "EStop_OK is normally closed, so it reads 0 when pressed. That latches EStop_Latched." },
      { line: 3, text: "The latch only clears with the E-stop released AND the reset button pressed." },
      { line: 4, text: "While latched, the seal can neither start nor hold." },
      { line: 6, text: "The fault lamp shows the E-stop is still waiting for a reset." },
    ],
    code: [
      "// Release the E-stop, press AUX to reset, then Start.",
      "RUNG 1: XIO(EStop_OK) OTL(EStop_Latched)",
      "RUNG 2: XIC(EStop_OK) XIC(Aux_PB) OTU(EStop_Latched)",
      "RUNG 3: (XIC(Start_PB) OR XIC(Run_Seal)) AND XIO(Stop_PB) AND XIC(Overload_OK) AND XIO(EStop_Latched) OTE(Run_Seal)",
      "RUNG 4: XIC(Run_Seal) OTE(Motor_Run) OTE(Run_Lamp)",
      "RUNG 5: XIC(EStop_Latched) OTE(Fault_Lamp)",
    ],
    specs: [
      { label: "Rungs", value: "5" },
      { label: "Category", value: "Stop category 0" },
      { label: "Reset", value: "Manual · AUX" },
      { label: "Level", value: "Intermediate" },
    ],
  },

  "f-safe-stop": {
    difficulty: "intermediate",
    rigOptions: { stopNC: true },
    checkpoint: {
      steps: [(m) => Boolean(m.Motor_Run), (m, _i, f) => Boolean(f.brokenStop) && !m.Motor_Run],
      message: "a broken stop wire stopped the motor instead of hiding the stop",
    },
    summary:
      "Stop buttons are wired normally closed. At rest the input reads 1; pressing Stop or breaking the wire both read 0, and both stop the machine. A normally open stop with a broken wire would let the machine run with no way to stop it.",
    facts: [
      { icon: "info", text: "On this lesson the Stop button is rewired normally closed. I0.1 reads 1 at rest." },
      { icon: "bolt", text: "Start the motor, then break the stop wire from the Stop popover. The motor stops." },
      { icon: "shield", text: "The fault lamp shows the stop circuit is open, so nobody keeps pressing Start." },
    ],
    io: [IO.start, IO.stopNC, IO.ol, IO.estop, IO.run, IO.runLamp, IO.faultLamp],
    steps: [
      { line: 2, text: "XIC(Stop_PB) now: the rung needs the stop circuit to be healthy and closed." },
      { line: 3, text: "The contactor and lamp follow the seal." },
      { line: 4, text: "An open stop circuit, pressed or broken, lights the fault lamp." },
    ],
    code: [
      "// Stop is wired normally closed: I0.1 reads 1 until you press it.",
      "RUNG 1: (XIC(Start_PB) OR XIC(Run_Seal)) AND XIC(Stop_PB) AND XIC(Overload_OK) AND XIC(EStop_OK) OTE(Run_Seal)",
      "RUNG 2: XIC(Run_Seal) OTE(Motor_Run) OTE(Run_Lamp)",
      "RUNG 3: XIO(Stop_PB) OTE(Fault_Lamp)",
    ],
    specs: [
      { label: "Rungs", value: "3" },
      { label: "Stop wiring", value: "Normally closed" },
      { label: "Principle", value: "Fail safe" },
      { label: "Level", value: "Intermediate" },
    ],
  },
};
