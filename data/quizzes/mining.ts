import type { QuizQuestion } from "./types";

const Q = (q: string, options: string[], answer: number, why: string): QuizQuestion => ({ q, options, answer, why });

export const QUIZ_MINING: Record<string, QuizQuestion[]> = {
  "n-conveyor-chain": [
    Q("Which conveyor in a chain starts first?", ["The one at the discharge end", "The one at the crusher", "All at once", "The longest one"], 0, "Start from the stockpile back."),
    Q("Why sound a siren before a belt starts?", ["So nobody is near a moving belt", "To test the siren", "It is optional", "To warn the PLC"], 0, "People work along belts."),
    Q("When stopping a chain, what stops first?", ["The feeder", "The last belt", "All at once", "The crusher"], 0, "Then each belt runs empty."),
    Q("Why let belts run on after a stop?", ["To empty them", "To cool the motors", "To test the brakes", "No reason"], 0, "A full belt is hard to restart."),
    Q("A pull-wire is...", ["a rope along the belt that stops it when pulled", "a data cable", "a speed sensor", "a belt splice"], 0, "Emergency stop along the length."),
    Q("Why wire pull-wires into the belt starter as well as the PLC?", ["So they stop the belt even if the PLC fails", "To save cable", "To count stops", "They are not"], 0, "Independent stop."),
    Q("A belt sway switch detects...", ["the belt running off to one side", "belt speed", "ore on the belt", "a pulled wire"], 0, "Mistracking."),
    Q("A speed switch on the tail pulley proves...", ["the belt itself is moving at speed", "the motor has power", "the siren works", "the chute is clear"], 0, "Catches slipping belts."),
    Q("If CV02 stops while CV01 keeps running...", ["the transfer chute blocks", "nothing happens", "CV02 speeds up", "the crusher stops"], 0, "Ore keeps arriving."),
    Q("Which law covers safety on South African mines?", ["The Mine Health and Safety Act", "The OHS Act only", "The Companies Act", "The Water Act"], 0, "MHSA, Act 29 of 1996."),
  ],
  "n-crusher-feed": [
    Q("Here the feeder speed is controlled from...", ["the crusher's motor current", "a timer", "the belt speed", "the siren"], 0, "Current shows load."),
    Q("When the ore gets harder, the feeder should...", ["slow down", "speed up", "stop", "reverse"], 0, "Same current, less ore."),
    Q("Why not just run the feeder at full speed?", ["Hard ore would overload and trip the crusher", "It wastes ore", "It is illegal", "No reason"], 0, "Overload."),
    Q("The setpoint in this lesson is...", ["80 A", "100 A", "120 A", "50 A"], 0, "80 % of full load."),
    Q("Why is the PID tuned gently here?", ["Ore takes seconds to reach the crusher", "The PLC is slow", "The motor is small", "It is not"], 0, "Transport lag."),
    Q("Choke feeding means...", ["keeping the crusher full", "stopping the feeder", "feeding water", "starting the belt"], 0, "Rock breaks rock."),
    Q("Tramp steel can...", ["jam the crusher", "speed it up", "cool it", "lubricate it"], 0, "Remove it with a magnet ahead of the crusher."),
    Q("Soft ore lets the feeder...", ["speed up", "slow down", "stop", "nothing"], 0, "More throughput at the same current."),
    Q("Over 110 A for 3 s, this program...", ["warns that the crusher is close to tripping", "stops the chain", "speeds up", "does nothing"], 0, "Rung 7 and 8."),
    Q("The crusher's full load current here is...", ["100 A", "80 A", "250 A", "30 A"], 0, "From the spec."),
  ],
};
