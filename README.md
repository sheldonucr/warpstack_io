# WarpStack

**Hybrid numerical + AI warpage analysis for 2.5D / 3D chiplet reliability.**

WarpStack predicts how a chiplet, module, or package stack **bends** under thermal load. From a single
structured floorplan description it builds a mechanical model of the layer stack, applies the
assembly-to-operating thermal load, and returns the out-of-plane warpage. It is a **hybrid engine** with
three methods on the same inputs — numerical when you need ground truth, AI when you need it now:

- **2D numerical** — a fast numerical method that returns a full warpage map for *any* design in about a
  third of a second. Ideal for screening a whole design space.
- **3D numerical** — a detailed numerical method that resolves the package through its full thickness,
  reporting warpage **per surface** (die-level active surface *and* continuous package surface). The
  ground-truth fidelity for complex, interleaved multi-layer stacks.
- **WarpStack-GNN** — an AI-accelerated method trained on numerical ground truth that predicts the full
  warpage map in **~1.5 ms** at **~1% error**, and generalizes to designs it has never seen. Fast enough
  to put warpage inside a live optimization loop.

This repository hosts the **WarpStack** promotion site, live at
**<https://sheldonucr.github.io/warpstack_io/>**.

---

## Why warpage matters

Stacking silicon, interposers, and memory bonds materials with very different coefficients of thermal
expansion (CTE). As the assembly cools from its bonding temperature to operating temperature, those
mismatches make the whole package bow and twist — and that warpage is a first-order reliability risk in
2.5D and 3D integration:

- **Heat makes it move.** Every material expands by a different amount; thermal cycling turns the
  mismatch into internal stress that warps the structure.
- **Warpage causes failures.** Excessive bow leads to cracked dies, delaminated layers, and solder-joint
  defects — **opening** (the gap grows and the joint pulls apart into an open circuit) and **bridging**
  (the gap closes and neighboring joints merge into a short).
- **It has to be checked often.** Floorplanning, stack-up, and material choices all change how a package
  warps, so designers need a warpage answer *per iteration* — not once, at the very end.

WarpStack closes that gap: **fast enough to screen every candidate, accurate enough to sign off the hard
ones.**

---

## Headline results

A batch of **nine** 2.5D and 3D benchmark designs — from a 3-layer module to an 11-layer 3D chiplet,
10–18 dies each — solved with both methods. Warpage is reported as peak-to-peak out-of-plane deflection
in microns.

### Fast 2D — screen every design in under a second

The 2D solve time barely moves with design size: **every design lands between 0.34 s and 0.36 s**,
regardless of layer count (3–11), die count (10–18), or package size (5–200 mm on a side).

| Design | Layers | Dies | 2D time |
| --- | ---: | ---: | ---: |
| 3-layer module | 3 | 12 | 0.342 s |
| Planar 16-die array | 3 | 16 | 0.347 s |
| Arbitrary-layer module | 5 | 12 | 0.345 s |
| GaAs RF PA array | 5 | 15 | 0.347 s |
| HBM3 memory stack | 6 | 10 | 0.346 s |
| 5 nm CPU | 7 | 18 | 0.347 s |
| 2.5D chiplet | 9 | 14 | 0.347 s |
| 11-layer 3D chiplet | 11 | 16 | 0.356 s |

### 2D vs 3D — where fast is already close enough

For a large share of designs, the fast 2D map already predicts the 3D peak warpage within roughly
**10–20%** — close enough to screen and rank candidates before committing to a full 3D run. Deep,
interleaved stacks diverge more — exactly the cases where the 3D analysis earns its extra time.

| Design | 2D peak | 3D peak | Agreement |
| --- | ---: | ---: | ---: |
| Arbitrary-layer module (5L) | 251 µm | 269 µm | 93% |
| 2.5D chiplet (9L) | 50 µm | 44 µm | 88% |
| Planar 16-die array (3L) | 1465 µm | 1256 µm | 86% |
| HBM3 memory stack (6L) | 10.1 µm | 8.3 µm | 83% |
| 16-die array, variant (3L) | 1696 µm | 1370 µm | 81% |

### How much faster 2D runs

The 3D solve grows with the size and depth of the stack — from ~9 s for a simple module to ~8 minutes
for the 11-layer chiplet. The 2D solve stays near 0.35 s throughout, so the speed gap widens exactly
where design-space exploration needs it most.

| Design | Speedup (3D ÷ 2D) |
| --- | ---: |
| 11-layer 3D chiplet | **1411×** |
| 2.5D chiplet | 285× |
| 5 nm CPU | 153× |
| GaAs RF PA array | 57× |
| HBM3 memory stack | 33× |
| 3-layer module | 26× |

### WarpStack-GNN — AI inference, benchmarked against numerical ground truth

Once trained on numerical ground truth, **WarpStack-GNN** predicts a full warpage map in **~1.5 ms** —
orders of magnitude faster than a numerical solve — while staying within ~1–2% of the numerical answer.

| Method | Type | Runtime / design | Speedup vs 3D | Error vs numerical |
| --- | --- | ---: | ---: | ---: |
| 3D numerical | numerical | 174.5 s | 1× (reference) | ground truth |
| 2D numerical | numerical | ~0.35 s | ~500× | screening |
| **WarpStack-GNN** | **AI** | **1.46 ms** | **119,766×** | **1.26% NRMSE / 2.21%** |

- **~120,000× faster than the 3D numerical reference** and **~200× faster than the fast 2D numerical
  method**, at **1.26%** normalized RMSE, **2.21%** peak-warpage error, and **0.97%** normalized MAE
  against numerical ground truth.
- **Efficient to train:** ~33 minutes — roughly **70% less** training time than a comparable AI baseline
  at equal accuracy.
- **Generalizes to unseen designs:** on four held-out design families never seen in training, accuracy
  holds at **≤ 3.69%** normalized RMSE, at the same millisecond runtime — accurate enough for early-stage
  warpage-aware optimization on brand-new designs, without retraining.

---

## Agentic-flow ready

WarpStack is built to drop straight into **agentic EDA and system-design workflows**, and to work with
*any* agentic flow. A first-class CLI and structured data interface let autonomous design agents call
fast 2D numerical, detailed 3D numerical, or **WarpStack-GNN AI inference**, read back machine-readable results, and
feed them into floorplanning, stack-up, and material-selection loops — for **warpage-aware optimization**
and **warpage reliability sign-off** of chiplets and advanced packages in system design. With millisecond
AI inference, warpage finally runs at the speed of the loop itself.

- **Agentic-flow ready** — driven by autonomous agents; nothing in the loop needs a GUI.
- **CLI-first & headless** — every method is scriptable from the command line.
- **Structured data interface** — machine-readable floorplans in; warpage surfaces, peak-to-peak bow,
  and signed `3D − 2D` difference maps out, ready for closed-loop automation.
- **Warpage-aware optimization** — at ~1.5 ms per evaluation, WarpStack-GNN lets agents sweep thousands
  of floorplans, stack-ups, and materials in a live loop, steering each candidate toward lower bow.
- **Reliability sign-off** — AI or fast 2D numerical screens the whole design space; detailed 3D
  numerical signs off the critical designs against warpage limits before tape-out and assembly.

```text
Agentic EDA / system-design flow
        │  invokes WarpStack (CLI + structured data)
        ▼
WarpStack warpage analysis  ──►  warpage maps + peak-to-peak margins
        │  returns machine-readable results
        ▼
Fed back to the agent  ──►  steers the next floorplan / stack / material iteration
```

---

## What's in this repository

```text
.
├── index.html          Single-file promotion site (self-contained: inline CSS/JS/SVG).
├── assets/
│   └── figs/           Result figures used by the page.
│       ├── warpage_chiplet_2p5d_14.png     2D warpage map (hero)
│       ├── warpage_cores_16_1.png          2D warpage map (16-die array)
│       ├── stack_cores_16_1.png            3D structure view (16-die array)
│       ├── stack_hbm3.png                  3D structure view (HBM3 stack)
│       ├── warpage_hbm3_2d.png             HBM3 — 2D numerical result
│       ├── warpage_hbm3_3d_active.png      HBM3 — 3D active (die) surface
│       └── warpage_hbm3_3d_package.png     HBM3 — 3D package surface
└── README.md
```

The figures are real WarpStack outputs (from the batch above), cropped from the interactive viewer to
keep the plot and colorbar.

---

## Local preview

The site is a single static HTML file with no build step and no external dependencies. Serve the folder
and open it in a browser:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

Or open `index.html` directly in a browser.

---

## About the WarpStack tool

The site presents results from **WarpStack**, a hybrid single-floorplan warpage analysis tool for
chiplet, module, and package stacks. It reads a structured floorplan JSON (package geometry, an arbitrary
mechanical layer stack with per-layer materials, and per-die/module placement), builds the mechanical
model, applies the thermal delta, and writes warpage CSVs plus a simulation report — or predicts the
warpage map directly with the trained AI method.

- **2D numerical method** (default) — a fast numerical model that solves the bow on a plane.
- **3D numerical method** (`--3d`) — a detailed numerical model that resolves the package through its
  full thickness; writes both the active-surface and package-surface warpage.
- **WarpStack-GNN** — an AI-accelerated method trained on numerical ground truth: it predicts the full
  warpage map directly, returns warpage in the same format as the numerical methods in milliseconds, and
  generalizes to unseen designs.
- **Compare mode** (`--compare`) — runs both numerical solvers and writes signed `3D − 2D` difference maps.
- **CLI-first & scriptable** — structured JSON in, CSV/JSON reports out; run one design or a whole batch.

---

## Contact

WarpStack is in active development. For a demo or a walkthrough on your own 2.5D/3D chiplet designs:

- **Email:** <noveetyai@noveetymanagement.com>

© 2026 NoveetyAI, Inc. All rights reserved.
