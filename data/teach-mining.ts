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

  "n-dewatering": {
    goal: "Run a mine pump station: duty and standby, alternation, run-dry protection and a rising water alarm.",
    learn: ["duty and standby", "alternating pumps", "flow switches", "running dry", "rate of rise"],
    wires: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    steps: [
      "Switch the PLC to RUN and tap Start. Pump 1 runs when the water reaches the lead float.",
      "Make pump 1 lose its prime. It runs with no flow; after 8 s P1_Fail latches and pump 2 takes over.",
      "Raise the inflow to full. Pump 2 alone cannot keep up: Rise_Alarm comes on.",
      "Watch the level: the alarm came long before the high-high float. That is the time to act.",
      "Clear the fault, lower the inflow and press Acknowledge. The pumps alternate again on each demand.",
    ],
    between: BETWEEN,
    tour: [
      { kicker: "Scene 1 of 3 · Duty", title: "Share the work", lines: [3, 6], lead: "Each new demand swaps the duty pump.", body: "Both pumps get used, so a seized standby is found long before it is needed.", handsTo: ["Duty"] },
      { kicker: "Scene 2 of 3 · Proof", title: "Running is not pumping", lines: [11, 14], lead: "No flow for 8 s while running: lost prime.", body: "A pump running dry wrecks its seals and bearings in minutes. The flow switch proves water is moving.", handsTo: ["Flow1_OK", "P1_Fail"] },
      { kicker: "Scene 3 of 3 · Rate of rise", title: "See it coming", lines: [16, 18], lead: "Compare the level with 10 s ago.", body: "Water rising while pumps run means inflow is winning. Act now: start more pumps, find the inflow, warn the shafts below.", precise: "A real station also logs pumped volume and running hours, and many mines run pumps on off-peak tariffs.", handsTo: ["Rise", "Rise_Alarm"] },
    ],
    story: [
      { t: "duty", text: "Pump 1 runs on the first demand." },
      { t: "lost prime", text: "No flow for 8 s: pump 1 trips; pump 2 takes over." },
      { t: "inflow", text: "Water rises faster than one pump can handle: alarm." },
    ],
    words: [{ term: "Duty / standby", meaning: "One pump runs; the other waits to take over." }, { term: "Prime", meaning: "Water filling a pump's casing so it can pump; without it, it runs dry." }, { term: "Flow switch", meaning: "A switch on the delivery pipe that proves water is flowing." }, { term: "Rate of rise", meaning: "How fast the level climbs." }],
  },

  "n-ventilation": {
    goal: "Run a main ventilation fan: prove the airflow, protect the bearing, and cut section power on methane.",
    learn: ["main fans", "proving airflow", "vibration monitoring", "methane limits", "section power interlocks"],
    wires: [1, 2, 3, 4, 7, 9, 11],
    steps: [
      "Switch the PLC to RUN and tap Start. Once the fan's pressure passes 600 Pa, Section_Power comes on.",
      "Make the bearing fail. Vib_x10 climbs past 45: Vib_Warn.",
      "It passes 71: after 2 s the fan trips and the section's power goes off with the airflow.",
      "With the fan stopped, CH4_x100 climbs. At 140 the gas trip latches.",
      "Clear the bearing, wait for the methane to fall below 100, Reset, Start.",
    ],
    between: BETWEEN,
    tour: [
      { kicker: "Scene 1 of 3 · Air first", title: "Prove it, then power", lines: [10, 10], lead: "Section power needs the fan running and its pressure proved.", body: "A fan whose motor turns but whose airflow is lost (a broken belt, a closed door) protects nobody.", handsTo: ["Airflow_Pa", "Section_Power"] },
      { kicker: "Scene 2 of 3 · Bearing", title: "Warn, then trip", lines: [5, 7], lead: "4.5 mm/s warns; 7.1 mm/s trips.", body: "Vibration climbs for days or weeks before a bearing fails. The warning gives the engineers time to plan a repair.", handsTo: ["Vib_x10", "Vib_Trip"] },
      { kicker: "Scene 3 of 3 · Gas", title: "No sparks in methane", lines: [8, 9], lead: "1.4 % latches the trip; reset only below 1 %.", body: "Methane explodes between about 5 and 15 % in air. Electrical power is cut long before that.", precise: "Limits and actions are set by the mine's code of practice under the Mine Health and Safety Act; this lesson uses 1.4 % to show the idea.", handsTo: ["CH4_x100", "Gas_Trip"] },
    ],
    story: [
      { t: "start", text: "Fan up to speed, airflow proved, section powered." },
      { t: "bearing", text: "Vibration climbs: warning, then trip." },
      { t: "gas", text: "No airflow, methane rises: power stays locked off." },
    ],
    words: [{ term: "Main fan", meaning: "The large fan at the surface that ventilates the whole mine." }, { term: "Return airway", meaning: "The route the used air takes back to the fan." }, { term: "Methane", meaning: "A flammable gas released from coal and some rock." }, { term: "mm/s", meaning: "The unit of vibration velocity used to judge machine health." }],
  },

  "n-hoist": {
    goal: "Understand how a winder is controlled: the speed profile, slow-down points and overwind protection.",
    learn: ["winders and skips", "speed profiles", "slow-down switches", "creep speed", "overwind protection"],
    wires: [1, 2, 3, 4, 5],
    steps: [
      "Switch the PLC to RUN. Call the skip up: Hoist_Fast is on through the shaft.",
      "At the slow-down switch it creeps the last part and stops at the tip.",
      "Send it down: fast, then creep, then stop at the loading box.",
      "Fail the slow-down switch below the tip and wind up again.",
      "The skip arrives fast, overshoots the tip and trips the overwind switch: the brakes stop it.",
    ],
    between: ["Real winders are run only by certified winding engine drivers.", ...BETWEEN.slice(1)],
    tour: [
      { kicker: "Scene 1 of 3 · Wind", title: "Up or down", lines: [2, 7], lead: "A wind runs until the skip reaches the end it was sent to.", body: "Never both directions at once, and never with the shaft gate open.", handsTo: ["Wind_Up", "Wind_Down"] },
      { kicker: "Scene 2 of 3 · Profile", title: "Fast, then creep", lines: [8, 8], lead: "Full speed only until the slow-down switch.", body: "A skip at full speed needs a long way to stop. Creep speed lets it stop exactly at the tip.", handsTo: ["Hoist_Fast"] },
      { kicker: "Scene 3 of 3 · Overwind", title: "The last line", lines: [3, 5], lead: "The overwind switch stops every wind and drops the brakes.", body: "It is wired into the brake circuit, not just the PLC, so it works when everything else has failed.", precise: "Real winders have duplicated, certified protection: overspeed, overwind, slack rope and more, under the Mine Health and Safety Act's regulations for winding plant.", handsTo: ["Overwind"] },
    ],
    story: [
      { t: "wind up", text: "Fast through the shaft." },
      { t: "slow-down", text: "Creep the last stretch." },
      { t: "tip", text: "Stop exactly at the tip." },
      { t: "overwind", text: "A failed switch: the overwind brakes it." },
    ],
    words: [{ term: "Winder", meaning: "The machine that hoists skips or cages up and down a shaft." }, { term: "Skip", meaning: "A container that carries rock up the shaft." }, { term: "Creep speed", meaning: "A slow speed for the last part of a wind." }, { term: "Overwind", meaning: "The conveyance travelling past its normal stopping point." }],
  },
};
