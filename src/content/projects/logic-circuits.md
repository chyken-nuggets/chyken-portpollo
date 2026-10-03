---
title: Logic Circuits
year: 2026
role: 'Solo developer: Minecraft mod'
summary: 'A NeoForge mod for Minecraft 1.21.1 that adds compact, ready-to-use logic gates, adders and a latch to the redstone system.'
tags: [minecraft, neoforge, java, mod]
cover: ../../assets/halftone/cover-logic-circuits.png
coverAlt: 'Illustration: a logic diagram where an AND gate feeds an OR gate that lights a lamp.'
links:
  - label: Repository
    url: https://github.com/chyken-nuggets/LogicCircuitsMod-1.21.1
  - label: Releases
    url: https://github.com/chyken-nuggets/LogicCircuitsMod-1.21.1/releases
featured: true
order: 2
---

## Overview

Building logic out of redstone dust, torches and repeaters gets bulky fast. Logic Circuits adds the common components as single blocks, so you can build combinational circuits, add binary values and store a bit without wiring every gate by hand. Made just for fun.

## Components

All of them live in the Redstone Blocks creative tab.

- **Gates:** NOT, OR, AND, NOR, NAND, XOR and XNOR. They behave like redstone diodes: the facing shows the output, inputs come in from the sides, and each has a two-tick delay.
- **Arithmetic and memory:** a Half Adder, a Full Adder and an SR Latch, each taking up two adjacent blocks.

## Details

- Minecraft 1.21.1 on NeoForge 21.1.234 or newer, built with Java 21
- Server-compatible, with no dependencies beyond NeoForge and Minecraft
- Block models, block states and loot tables are data-generated
- MIT licensed; v1.0.1 is the latest release
