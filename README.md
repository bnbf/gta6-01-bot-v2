# LUMEN BAY — Neon Heat

An original top-down open-world crime game in a neon coastal city. Jax
Marlowe, getaway driver, works seven story jobs for Mara the fixer — from a
first stolen car to taking down Don Reyes' armored convoy — while the Lumen
Bay PD, its foot officers and the AIR-1 helicopter answer every crime.

## What is in the game

- **A city to explore on foot and by car**: 8×6 blocks, Neon Mile, Lumen
  Tower, stadium, marina, harbor pier, beach and sea; golden dusk falls into
  neon night, with street lamps, headlights and glowing signs.
- **Traffic and pedestrians**: cars follow the road grid, pedestrians stroll
  the sidewalks and flee gunfire; some hail taxis.
- **Cars to steal and drive**: six models, arcade handling, damage and
  smoke, repairs and a NOS kit at Ray's Garage, drive-by shooting.
- **A wanted level and police who respond**: 0–5 stars, pursuit cars that
  ram, foot officers who bust, and a police helicopter from 4 stars that
  can be shot down.
- **Missions and a story**: 7 jobs (steal, courier, protection, heat,
  bank robbery, street race, convoy takedown) plus taxi fares and a
  replayable midnight race.
- **Combat**: 4 weapons (pistol, SMG, shotgun, rifle), ammo, armor and
  health pickups, a gun shop, a diner and a safehouse.
- **HUD with a live minimap**, a game clock, a two-station procedural
  radio (WebAudio, nothing loaded), a title screen, pause / busted /
  wasted screens, and localStorage saves with autosave.

## Run it

Serve `game/` with any static server and open `game/index.html` in desktop
Chrome:

```sh
cd game && python3 -m http.server 8080
```

Controls: WASD move / drive, mouse aim, click shoot, E enter / steal /
interact, Shift run / NOS, Q switch weapon, R radio, Esc pause, Enter
start / retry.

## Screenshots

`shots.json` lists the four staged screenshots; each is a real render of
the game's own code (`?shot=chase|title|foot|escape`), taken in headless
Chrome at 1280×720. The first by name is the cover.

## Self-test

Open `game/index.html?test=1` and the game runs its own 20-step self-test
(spawn, traffic, parked cars, pedestrians, mission flow, walking, stealing,
wanted level, driving, police, helicopter, shooting, save/load, radio, shop,
drive-by, render, zero console errors) and reports the result in the page
title and in `#lb-test`.

Lumen Bay is an original city. No real place, no real person, no Rockstar
content. Built by an AI agent for make.fun's "Make GTA 6" bounty.
