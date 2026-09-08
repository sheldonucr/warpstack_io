# WarpStack

**Hybrid numerical + AI warpage analysis for 2.5D / 3D chiplet reliability.**

WarpStack predicts how a chiplet, module, or package stack **bends** under thermal load. From a single
structured floorplan description it builds a mechanical model of the layer stack, applies the
assembly-to-operating thermal load, and returns the out-of-plane warpage. It is a **hybrid engine** with
three methods on the same inputs — numerical when you need ground truth, AI when you need it now:

- **3D numerical** — a detailed numerical method that resolves the package through its full thickness,
  reporting warpage **per surface** (die-level active surface *and* continuous package surface). The
  ground-truth fidelity for complex, interleaved multi-layer stacks, and the reference the other two
  methods are measured against.
- **MOR-model** — a physics-based compact model built once per design from the same 3D formulation.
  Once built it answers a new material or thermal design point in well under a millisecond, turning
  design-space exploration from an overnight batch into an interactive sweep.
- **WarpStack-AI (GNN)** — an AI-accelerated method trained on numerical ground truth that predicts the full
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

One reference design, measured end to end: **2nm CoWoS - 8 HBM stacks x 12-hi DRAM + 2 GPUs - 108 chiplets** — a 56.2 × 57.5 mm package with
135 die regions and 237 mechanical layers, imported from IEEE 3Dblox.
At FEM mesh 64 that is 169,602 degrees of freedom and 45,035 solid elements.

Measured on an Apple M3, single core. Full data in
`warpstack/tests/warpstack_io_results_sept_2026/`.

### Detailed 3D — the reference answer

| Quantity | Value |
| --- | ---: |
| Package | 56.2 × 57.5 mm |
| Chiplet instances | 108 |
| Die regions | 135 |
| Mechanical layers | 237 |
| Solid elements | 45,035 |
| Degrees of freedom | 169,602 |
| 3D numerical solve | **40.6 s** |

Peak-to-peak warpage 1332 µm at mesh 64.

### MOR-model vs 3D — a what-if the model was never built at

Stiffening the ABF substrate from 24.0 to 28.8 GPa moves peak-to-peak warpage by
**+40.9 µm**. The MOR-model resolves that shift without a new 3D solve:

| Quantity | 3D numerical | MOR-model |
| --- | ---: | ---: |
| Peak-to-peak warpage | 1372.7 µm | 1372.6 µm |
| Time per design point | 40.6 s | **51 µs** |
| Peak-to-peak difference | reference | 0.043 µm |
| Whole-map difference (rel. L2) | — | 0.003 % |
| Largest local difference | — | 0.036 µm |
| Speedup | 1× | **798,000×** |

This point sits outside the set the model was built from. A further 8 design points drawn
from across the material design space were each solved with full 3D numerical and compared:
worst whole-map difference **0.006 %**.

Building the model costs 17 min of 3D solves up front — about
25× a single 3D run — so it pays for itself within roughly
25 evaluations.

### Read the micron figures with the mesh in mind

| mesh | free DOFs | 3D wall | peak-to-peak |
| --- | ---: | ---: | ---: |
| 32 | 57,954 | 5.3 s | 811 µm |
| 48 | 109,434 | 17.1 s | 1117 µm |
| 64 | 169,602 | 40.6 s | 1373 µm |
| 80 | 260,910 | 130.8 s | 1473 µm |

Absolute warpage is still rising with mesh refinement, so quote it with the mesh. The speedup and
the 3D-vs-MOR agreement are unaffected — both are measured at one fixed mesh.

**Mechanical properties for this design are illustrative** values for the material classes involved
(silicon, ABF substrate, BEOL, bond layers), not calibrated 2nm, HBM4 or CoWoS process data. Absolute
warpage is therefore indicative; timings and the 3D-vs-MOR agreement do not depend on them.

### WarpStack-AI (GNN) — AI inference, benchmarked against numerical ground truth

Once trained on numerical ground truth, **WarpStack-AI (GNN)** predicts a full warpage map in **~1.5 ms** —
orders of magnitude faster than a numerical solve — while staying within ~1–2% of the numerical answer.

| Method | Type | Runtime / design | Speedup vs 3D | Error vs numerical |
| --- | --- | ---: | ---: | ---: |
| 3D numerical | numerical | 174.5 s | 1× (reference) | ground truth |
| **WarpStack-AI (GNN)** | **AI** | **1.46 ms** | **119,766×** | **1.26% NRMSE / 2.21%** |

- **~120,000× faster than the 3D numerical reference**, at **1.26%** normalized RMSE, **2.21%** peak-warpage error, and **0.97%** normalized MAE
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
detailed 3D numerical, the **MOR-model**, or **WarpStack-AI (GNN) inference**, read back machine-readable results, and
feed them into floorplanning, stack-up, and material-selection loops — for **warpage-aware optimization**
and **warpage reliability sign-off** of chiplets and advanced packages in system design. With millisecond
AI inference, warpage finally runs at the speed of the loop itself.

- **Agentic-flow ready** — driven by autonomous agents; nothing in the loop needs a GUI.
- **CLI-first & headless** — every method is scriptable from the command line.
- **Structured data interface** — machine-readable floorplans in; warpage surfaces, peak-to-peak bow,
  and signed difference maps out, ready for closed-loop automation.
- **Warpage-aware optimization** — at ~1.5 ms per evaluation, WarpStack-AI (GNN) lets agents sweep thousands
  of floorplans, stack-ups, and materials in a live loop, steering each candidate toward lower bow.
- **Reliability sign-off** — the MOR-model or AI screens the whole design space; detailed 3D
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
│       ├── stack_hbm4_2nm.png              3D structure view of the 2nm CoWoS stack
│       ├── warpage_hbm4_2nm_3d_active.png  3D numerical reference surface
│       ├── warpage_hbm4_2nm_mor.png        MOR-model surface (hero image)
│       ├── warpage_hbm4_2nm_3d_whatif.png  3D numerical, stiffened-substrate what-if
│       ├── warpage_hbm4_2nm_mor_whatif.png MOR-model, same what-if
│       └── warpage_hbm4_2nm_diff.png       signed 3D − MOR-model difference
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

- **IEEE 3Dblox input** — accepts designs described in **IEEE 3Dblox**, the IEEE-standard modular
  description language for physical stacking, dimensions, and logical connectivity in 2.5D and 3D-IC
  designs, alongside WarpStack's native floorplan JSON.
- **3D numerical method** (default) — a detailed numerical model that resolves the package through its
  full thickness; writes both the active-surface and package-surface warpage.
- **MOR-model** — a physics-based compact model built once per design from the same 3D formulation.
  Once built it answers a new material or thermal design point in 51 µs instead of a full solve
  (798,000× faster on the reference design), matching the 3D surface to a small fraction of a micron.
- **WarpStack-AI (GNN)** — an AI-accelerated method trained on numerical ground truth: it predicts the full
  warpage map directly, returns warpage in the same format as the numerical methods in milliseconds, and
  generalizes to unseen designs.
- **Compare mode** (`--compare`) — runs two models on matching surfaces and writes signed difference maps.
- **CLI-first & scriptable** — structured JSON in, CSV/JSON reports out; run one design or a whole batch.

---

## Contact

WarpStack is in active development. For a demo or a walkthrough on your own 2.5D/3D chiplet designs:

- **Email:** <noveetyai@noveetymanagement.com>

© 2026 NoveetyAI, Inc. All rights reserved.
