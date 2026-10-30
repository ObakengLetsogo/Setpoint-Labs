// What each track's practical assessment asks for. The tests that mark it live on the server.

import type { RigId } from "./curriculum";

export interface AssessmentBrief {
  trackId: string;
  title: string;
  rig: RigId;
  brief: string;
  requirements: string[];
  /** Tags the program must use, with their meaning. */
  io: [string, string][];
  starter: string;
}

const STARTER = (lines: string[]) => [...lines.map((l) => `// ${l}`), ""].join("\n");

export const ASSESSMENTS: AssessmentBrief[] = [
  {
    trackId: "foundations",
    title: "Motor starter with protection",
    rig: "motor-starter",
    brief: "Write the control program for a direct on line starter that a plant could actually use.",
    requirements: [
      "Start runs the motor, and it keeps running after Start is released.",
      "Stop, a tripped overload or the E-stop stops it at once.",
      "Holding Start while Stop is pressed must not run the motor.",
      "The run lamp lights once the motor has run for 3 s.",
      "The fault lamp flashes, 0.5 s on and 0.5 s off, while the overload is tripped.",
      "Releasing the E-stop must not restart the motor.",
    ],
    io: [
      ["Start_PB", "I0.0, normally open"],
      ["Stop_PB", "I0.1, normally open: 1 while pressed"],
      ["Overload_OK", "I0.2, 1 while healthy"],
      ["EStop_OK", "I0.3, 1 while released"],
      ["Motor_Run", "Q0.0, contactor"],
      ["Run_Lamp", "Q0.1"],
      ["Fault_Lamp", "Q0.2"],
    ],
    starter: STARTER(["Foundations assessment: motor starter with protection."]),
  },
  {
    trackId: "machines",
    title: "Reversing starter",
    rig: "reversing",
    brief: "Control a reversing starter that can never short two phases and never plugs a spinning motor.",
    requirements: [
      "FWD runs forward and REV runs in reverse, each sealing in.",
      "KF_Fwd and KR_Rev must never be on in the same scan.",
      "While running one way, the other button does nothing.",
      "A new start in either direction needs Zero_Speed.",
      "Stop and a tripped overload stop either direction.",
      "Each direction lights its own lamp.",
    ],
    io: [
      ["Fwd_PB", "I0.0"],
      ["Rev_PB", "I0.1"],
      ["Stop_PB", "I0.2, normally closed: 1 at rest"],
      ["Overload_OK", "I0.3, 1 while healthy"],
      ["Zero_Speed", "I0.4, 1 while the shaft is still"],
      ["KF_Fwd", "Q0.0"],
      ["KR_Rev", "Q0.1"],
      ["Fwd_Lamp", "Q0.2"],
      ["Rev_Lamp", "Q0.3"],
    ],
    starter: STARTER(["Machines assessment: reversing starter."]),
  },
  {
    trackId: "process",
    title: "Tank level on a transmitter",
    rig: "tank",
    brief: "Keep a tank between 30 % and 75 % using its level transmitter, with a high level alarm.",
    requirements: [
      "Scale Level_Raw, 0 to 27648, into Level_Pct, 0 to 100.",
      "In auto, open the inlet below 30 % and keep it open until 75 %.",
      "Leaving auto closes the inlet.",
      "Light Alarm_Lamp while the level is above 90 %, in auto or not.",
      "Run_Lamp shows auto.",
    ],
    io: [
      ["Start_PB", "I0.0, AUTO, momentary"],
      ["Stop_PB", "I0.1, OFF, normally closed: 1 at rest"],
      ["Level_Raw", "IW64, 0 to 27648"],
      ["Inlet_Valve", "Q0.0"],
      ["Run_Lamp", "Q0.1"],
      ["Alarm_Lamp", "Q0.2"],
    ],
    starter: STARTER(["Process assessment: tank level on a transmitter."]),
  },
  {
    trackId: "wiring",
    title: "Commissioning sign-off",
    rig: "motor-starter",
    brief: "The customer specification for a starter you are commissioning. Every line is a test.",
    requirements: [
      "Start sounds the beacon for 3 s before the motor runs.",
      "The motor must not run during the warning.",
      "Stop during the warning cancels it.",
      "Stop, the overload or the E-stop stops the motor.",
      "After an E-stop, the motor stays off until a new Start and a new warning.",
    ],
    io: [
      ["Start_PB", "I0.0"],
      ["Stop_PB", "I0.1, normally open"],
      ["Overload_OK", "I0.2"],
      ["EStop_OK", "I0.3"],
      ["Motor_Run", "Q0.0"],
      ["Beacon", "Q0.3"],
    ],
    starter: STARTER(["Wiring and Commissioning assessment: commissioning sign-off."]),
  },
  {
    trackId: "advanced",
    title: "Drive with a watchdog",
    rig: "vsd",
    brief: "Run a drive as if over a network, in ladder or structured text, and catch a drive that stops answering.",
    requirements: [
      "Start runs the drive through Drive_Run, Stop stops it. Starting needs Drive_Ready.",
      "Heartbeat counts up by one every second.",
      "If Drive_Run is on but Drive_Running stays off for 5 s, latch Comms_Fault and drop the run command.",
      "Fault_Lamp shows Comms_Fault; Reset_PB clears it.",
      "Copy Speed_Pot to Speed_Ref.",
    ],
    io: [
      ["Start_PB", "I0.0"],
      ["Stop_PB", "I0.1, normally closed: 1 at rest"],
      ["Drive_Ready", "I0.2"],
      ["Drive_Running", "I0.3"],
      ["Reset_PB", "I0.6"],
      ["Speed_Pot", "IW64"],
      ["Drive_Run", "Q0.0"],
      ["Fault_Lamp", "Q0.2"],
      ["Speed_Ref", "QW64"],
      ["Heartbeat", "a word in memory"],
      ["Comms_Fault", "a bit in memory"],
    ],
    starter: STARTER(["Advanced assessment: drive with a watchdog. Ladder or structured text."]),
  },
  {
    trackId: "platforms",
    title: "Start counter for maintenance",
    rig: "motor-starter",
    brief: "The same logic every platform tour used, written by you. Any language.",
    requirements: [
      "Start and Stop control the motor with a seal-in; the overload stops it.",
      "Count each start once, however long Start is held.",
      "After 5 starts, light the beacon.",
      "AUX resets the count and puts the beacon out.",
    ],
    io: [
      ["Start_PB", "I0.0"],
      ["Stop_PB", "I0.1, normally open"],
      ["Overload_OK", "I0.2"],
      ["Aux_PB", "I0.4"],
      ["Motor_Run", "Q0.0"],
      ["Beacon", "Q0.3"],
    ],
    starter: STARTER(["Platform tours assessment: start counter for maintenance."]),
  },
  {
    trackId: "safety-systems",
    title: "The cell's safety program",
    rig: "safety",
    brief: "Write the safety program for the guarded cell: two channel inputs, a monitored reset, contactor feedback and a discrepancy check.",
    requirements: [
      "With every safety input healthy and K_FB on, releasing Reset_PB turns F_K1 and F_K2 on.",
      "A Reset_PB held down does nothing until it is released.",
      "The E-stop, the door or the light curtain opening turns F_K1 and F_K2 off.",
      "Closing a guard again does not turn them back on without a new reset.",
      "Reset is refused unless K_FB proves both contactors are open.",
      "If ES_A and ES_B disagree for more than half a second, latch F_Disc and keep the outputs off until both channels have opened and Reset is pressed again.",
    ],
    io: [
      ["ES_A, ES_B", "I0.3, I0.4: E-stop channels, 1 when released"],
      ["Door_A, Door_B", "I0.5, I0.6: door channels, 1 when closed"],
      ["LC_OSSD1, LC_OSSD2", "I0.7, I1.0: light curtain, 1 when clear"],
      ["K_FB", "I1.1: both contactors open"],
      ["Reset_PB", "I0.2: safety reset"],
      ["F_K1, F_K2", "Safety outputs to the contactors"],
      ["F_Disc", "Discrepancy fault, latched"],
    ],
    starter: STARTER(["Safety Systems assessment: the cell's safety program."]),
  },
  {
    trackId: "mining",
    title: "Commission conveyors CV01 and CV02",
    rig: "mineconv",
    brief: "The mine's specification for the two conveyors from the crusher to the stockpile. Every line is a test.",
    requirements: [
      "Start sounds the siren for at least 4 s before CV02 runs, then the siren stops.",
      "CV01 runs only while CV02 is proved at speed by Spd_02.",
      "A pulled wire, a sway switch or a blocked chute stops CV01 and CV02 at once.",
      "After a trip, Start alone does nothing. Reset clears the trip once every switch is healthy, then Start runs the belts again.",
      "Stop lets both belts run on for at least 4 s to empty, then stops them within 20 s.",
    ],
    io: [
      ["Start_PB, Stop_PB, Reset_PB", "I0.0 to I0.2. Stop is NC, 1 at rest"],
      ["PW_01, PW_02", "I0.3, I0.4: pull-wires, 1 when healthy"],
      ["Sway_01, Sway_02", "I0.5, I0.6: 1 when the belt runs true"],
      ["Spd_01, Spd_02", "I0.7, I1.0: 1 at speed"],
      ["Chute_Blk", "I1.1: 1 when blocked"],
      ["Siren, CV02_Run, CV01_Run", "Q0.0 to Q0.2"],
    ],
    starter: STARTER(["Mining assessment: commission CV01 and CV02."]),
  },
];

export const assessmentFor = (trackId: string) => ASSESSMENTS.find((a) => a.trackId === trackId);
