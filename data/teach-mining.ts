import type { LessonTeach } from "./teach";

// Teaching panels for the Mining industry track.

const BETWEEN = ["On a mine, nobody works on a belt without isolating and locking it out.", "Stop the PLC before you change the program.", "Edits apply on the next Run."];

export const TEACH_MINING: Record<string, LessonTeach> = {
  "n-conveyor-chain": {
    goal: "Run a mine's conveyor chain: start behind a siren from the discharge end, stop it empty, and trip it on every belt switch.",
    learn: ["starting from the discharge end", "pre-start sirens", "running belts empty", "pull-wires, sway and speed switches", "blocked chutes"],
    wires: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    steps: [
      "Switch the PLC to RUN and tap Start. Count the 5 s siren before anything moves.",
      "Watch CV02 start, then CV01 once CV02 is at speed, then the crusher, then the feeder.",
      "Press Stop. The feeder stops at once; the crusher, CV01 and CV02 stop in turn, empty.",
      "Start again and pull CV01's pull-wire. CV01 stops at its starter; the program trips the crusher and feeder.",
      "Reset the pull-wire at the switch, press Reset, then Start. Then try CV02 slipping and a belt running off.",
    ],
    between: BETWEEN,
    tour: [
      { kicker: "Scene 1 of 4 · Siren", title: "Warn before moving", lines: [4, 5], lead: "5 s of siren and flashing light before any belt moves.", body: "Mine standards call for an audible and visible warning along the whole belt before it starts.", handsTo: ["Siren"] },
      { kicker: "Scene 2 of 4 · Start order", title: "From the stockpile back", lines: [6, 12], lead: "Each belt starts only when the one it feeds is proved at speed.", body: "Start the other way round and ore lands on a belt that is not moving: spillage, blocked chutes and a day of shovelling.", handsTo: ["Spd_02", "Spd_01"] },
      { kicker: "Scene 3 of 4 · Stop order", title: "Run empty", lines: [6, 10], lead: "Off-delay timers keep each belt running until it has emptied.", body: "A belt stopped full is hard to start again and spills when it does.", handsTo: ["CV01_Run", "CV02_Run"] },
      { kicker: "Scene 4 of 4 · Trips", title: "Every switch counts", lines: [13, 16], lead: "Pull-wire, sway, slip or blocked chute: the chain trips.", body: "The pull-wires also stop their own belt at the starter, so they work even if the PLC does not.", precise: "In South Africa the Mine Health and Safety Act and the mine's own code of practice for conveyor belts set what protection each belt must have.", handsTo: ["Trip"] },
    ],
    story: [
      { t: "siren", text: "5 s of warning along both belts." },
      { t: "start", text: "CV02, CV01, crusher, feeder: each proved before the next." },
      { t: "stop", text: "Feeder off; belts run on until empty." },
      { t: "pull-wire", text: "Someone pulls the wire: that belt stops, the chain trips." },
    ],
    words: [{ term: "Pull-wire", meaning: "A steel rope along the belt: pulling it anywhere stops the belt." }, { term: "Belt sway", meaning: "A belt running off to one side; switches at the edges detect it." }, { term: "Speed switch", meaning: "A sensor on the tail pulley that proves the belt is moving at speed." }, { term: "Transfer chute", meaning: "Where one conveyor tips onto the next." }],
  },

  "n-crusher-feed": {
    goal: "Keep a crusher fully loaded without tripping it, by controlling the feeder from the crusher's current.",
    learn: ["crusher loading", "motor current as a measurement", "PID on feed rate", "ore hardness disturbances", "overload warnings"],
    wires: [1, 2, 3, 12],
    steps: [
      "Switch the PLC to RUN and tap Start. Watch Cr_Amps climb to 80 A and the feeder settle near 60 %.",
      "Raise the ore hardness to 1.5. The current jumps; the feeder slows to about 42 %.",
      "Wait for the current to settle back at 80 A.",
      "Change rung 5 to MOV(100, Feeder_Speed) and run with hard ore: the crusher trips on overload.",
      "Put the PID back. Try soft ore, 0.7: the feeder speeds up to keep the crusher working.",
    ],
    between: BETWEEN,
    tour: [
      { kicker: "Scene 1 of 2 · Measure", title: "Current shows load", lines: [6, 6], lead: "The crusher's current rises with the ore it is breaking.", body: "No extra instrument is needed: the motor protection relay already measures it.", handsTo: ["Cr_Amps"] },
      { kicker: "Scene 2 of 2 · Control", title: "Feed to suit the ore", lines: [5, 6], lead: "The PID trims the feeder to hold 80 A.", body: "Gentle tuning, because ore takes a few seconds to travel from feeder to crusher.", precise: "Larger plants often control on crusher power or cavity level instead, with the current as a limit.", handsTo: ["Feeder_Speed"] },
    ],
    story: [
      { t: "normal ore", text: "80 A at about 60 % feed." },
      { t: "hard ore", text: "Current jumps; feed drops to about 42 %; back to 80 A." },
      { t: "no control", text: "Full feed on hard ore: the crusher trips." },
    ],
    words: [{ term: "Choke feeding", meaning: "Keeping a crusher full so it breaks rock against rock." }, { term: "Tramp steel", meaning: "Steel in the ore, like a broken bolt, that can jam a crusher." }, { term: "Feeder", meaning: "A vibrating tray under the hopper that sets the ore flow." }],
  },
};
