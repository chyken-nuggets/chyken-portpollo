---
title: ASSEMBL-AR
year: 2026
role: 'Solo developer: Android, computer vision, AR'
summary: 'An offline Android app that walks you through building the NEOBOT Personal Robot Kit, checking each step with the camera and guiding it with AR overlays.'
tags: [android, java, opencv, augmented-reality]
cover: ../../assets/halftone/cover-assembl-ar.png
coverAlt: 'Illustration: a phone pointing an arrow at a highlighted part beside a small wheeled robot kit.'
links:
  - label: Repository
    url: https://github.com/chyken-nuggets/ASSEMBL-AR
featured: true
order: 1
---

## Overview

ASSEMBL-AR guides the assembly and wiring of the NEOBOT Personal Robot Kit on an Android phone. The bundled project breaks the build into 129 guided actions across 18 sections, drawn from the kit's manual. Progress is saved on the device, and some steps stay locked until a camera check or a physical check has passed.

## What it does

- **Guided assembly:** ordered, manual-derived instructions with saved progress, warnings, reference pages and physical confirmation prompts.
- **Camera checks:** CameraX and OpenCV recognise supported parts and assembly anchors, then evaluate placement, orientation, scale and polarity where they apply.
- **AR guidance:** OpenGL ES overlays draw component outlines, target positions, arrows, pin-routing cues and status feedback.
- **Learning and parts reference:** searchable learning modules and a component library with pin mappings, manual references and interactive 3D previews.
- **Parts tester:** a separate build that installs alongside the main app for loose-part diagnostics and exporting recognition samples.

> The app gives guided checks, not a replacement for hands-on inspection. Tightness, hidden connections and electrical continuity still need checking on the physical robot.

## Offline by design

Manuals, 3D models, reference images, learning content and recognition data all ship with the app. Camera frames are processed on the device, and the app requests camera permission only; it doesn't declare internet access.

## Stack

- Java 11, AndroidX, Material Components
- CameraX with Camera2, OpenCV feature matching and geometry checks
- OpenGL ES 2.0 for the AR layer, SQLite for local storage
- JUnit 4, AndroidX Test and Espresso
- Gradle (Kotlin DSL), Android 10 (API 29) and newer

The source is viewable on GitHub under a proprietary, view-only licence.
