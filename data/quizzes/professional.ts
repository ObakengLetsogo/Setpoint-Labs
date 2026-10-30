import type { QuizQuestion } from "./types";

const Q = (q: string, options: string[], answer: number, why: string): QuizQuestion => ({ q, options, answer, why });

export const QUIZ_PROFESSIONAL: Record<string, QuizQuestion[]> = {
  "p-pid-what": [
    Q("In a level loop, the PV is...", ["the measured level", "the valve opening", "the wanted level", "the pump"], 0, "Process value."),
    Q("The SP is...", ["where you want the PV to be", "the measured value", "the valve signal", "the scan time"], 0, "Setpoint."),
    Q("The CV is...", ["the controller's output to the valve", "the level", "the setpoint", "the alarm"], 0, "Control variable."),
    Q("Proportional only control leaves...", ["an offset", "no error ever", "the valve shut", "an alarm"], 0, "Some error is needed to hold the valve open."),
    Q("Raising KP usually...", ["reduces offset but can make the loop swing", "stops the loop", "has no effect", "removes the valve"], 0, "More gain, more risk."),
    Q("On and off control of a valve makes the level...", ["swing between two limits", "stay exactly on setpoint", "freeze", "drain"], 0, "Bang-bang control."),
    Q("A control valve differs from a solenoid valve because it...", ["can sit at any opening from 0 to 100 %", "is only open or shut", "has no signal", "needs air only"], 0, "Modulating."),
    Q("With KP 3 and an error of 5 %, the P part of the output is...", ["15 %", "3 %", "5 %", "8 %"], 0, "3 × 5."),
    Q("When demand rises in a P only loop, the offset...", ["grows", "disappears", "stays the same", "reverses"], 0, "More flow needs more error."),
    Q("A loop that measures and corrects is called...", ["closed loop", "open loop", "sequence", "interlock"], 0, "Feedback."),
  ],
  "p-pid-block": [
    Q("Integral action...", ["keeps moving the output while error remains", "reacts to rate of change", "only works in hand", "stops the loop"], 0, "It removes offset."),
    Q("A shorter TI makes integral action...", ["stronger and faster", "weaker", "switch off", "reverse"], 0, "Fewer seconds per repeat."),
    Q("Bumpless transfer means...", ["switching hand to auto without the output jumping", "no alarms", "a soft start motor", "no tuning"], 0, "The PID tracks the hand value."),
    Q("In hand, who sets the valve?", ["The operator", "The PID", "The transmitter", "Nobody"], 0, "Hand is manual."),
    Q("TD acts on...", ["how fast the PV is changing", "the size of the error only", "the total error over time", "the setpoint"], 0, "Derivative."),
    Q("Most level and flow loops use...", ["P and I, with little or no D", "D only", "no tuning", "P only always"], 0, "Derivative amplifies noise."),
    Q("A direct acting loop raises CV when...", ["PV is below SP", "PV is above SP", "never", "PV equals SP"], 0, "Error positive, output up."),
    Q("Which loop would normally be reverse acting?", ["An outlet valve holding a tank level", "An inlet valve holding a tank level", "A heater holding temperature", "None"], 0, "Opening the outlet lowers the level."),
    Q("In TIA Portal, the usual PID block is...", ["PID_Compact", "TON", "MOVE", "CTU"], 0, "Siemens PID_Compact."),
    Q("In Studio 5000, an enhanced PID is...", ["PIDE", "TOF", "MOV", "OTL"], 0, "Rockwell PIDE."),
  ],
  "p-pid-tune": [
    Q("A loop whose valve slams between 0 and 100 % is...", ["tuned too hard", "tuned too gently", "in hand", "perfect"], 0, "Too much gain or integral."),
    Q("A safe first step when tuning on site is to...", ["start gentle and tighten slowly", "start with maximum gain", "switch off the transmitter", "tune in hand"], 0, "Avoid upsetting the plant."),
    Q("Overshoot is...", ["how far PV goes past setpoint", "the setpoint", "the valve size", "the scan time"], 0, "Past the target."),
    Q("A sawtooth trend with a steady setpoint often means...", ["a sticking valve", "perfect tuning", "a failed lamp", "a full tank"], 0, "Stiction."),
    Q("Can tuning fix valve stiction?", ["No, fix the valve", "Yes, raise KP", "Yes, remove TI", "Yes, add TD"], 0, "It is mechanical."),
    Q("Why do lags make a loop swing?", ["Corrections arrive late and overshoot", "They speed it up", "They remove error", "They do not"], 0, "Dead time and lag."),
    Q("Settling time is...", ["how long until PV stays within a band of SP", "the scan time", "the valve stroke", "the TI value"], 0, "Within a band."),
    Q("To prove a tuning you would...", ["step the setpoint and change the load, and keep the trend", "look once", "switch to hand", "remove the integral"], 0, "Evidence."),
    Q("A loop that is smooth but very slow needs...", ["more gain or a shorter TI", "less gain", "a longer TI", "no change"], 0, "Tighten it."),
    Q("Settled in this lesson needs the error within...", ["2 % for 15 s", "10 % for 1 s", "0 % forever", "50 %"], 0, "TON(Settled, 15000)."),
  ],
  "p-pid-cascade": [
    Q("In cascade, the master loop's output is...", ["the slave loop's setpoint", "the valve", "an alarm", "a lamp"], 0, "Loop into loop."),
    Q("Which loop should be faster?", ["The inner (slave) loop", "The outer (master) loop", "Both equal", "Neither"], 0, "Several times faster."),
    Q("Cascade helps most with disturbances that...", ["the inner loop sees first, like supply pressure", "never happen", "change the setpoint", "are in the PLC"], 0, "Correct them before the outer PV moves."),
    Q("Which loop do you tune first?", ["The inner loop, with the outer in hand", "The outer loop", "Both at once", "Neither"], 0, "Inside out."),
    Q("In hand, Flow_SP tracks Flow_PV so that...", ["going to auto is bumpless", "the valve shuts", "alarms clear", "nothing"], 0, "PV tracking."),
    Q("If the flow transmitter fails low in cascade...", ["the flow loop opens the valve fully", "nothing happens", "the level loop takes over", "the PLC stops"], 0, "It sees no flow."),
    Q("Here the master loop is...", ["LIC1, level", "FIC1, flow", "the selector", "the valve"], 0, "Level is outer."),
    Q("A supply pressure drop at a fixed valve opening gives...", ["less flow", "more flow", "the same flow", "no change in level ever"], 0, "Less pressure, less flow."),
    Q("FIC usually stands for...", ["flow indicating controller", "fast integral control", "field input card", "flow interlock contact"], 0, "ISA tag letters."),
    Q("LIC usually stands for...", ["level indicating controller", "loop input card", "low integral constant", "level interlock contact"], 0, "ISA tag letters."),
  ],
};
