# WarpStack

**Warpage analysis for 2.5D / 3D chiplet reliability.**

WarpStack predicts how a chiplet, module, or package stack **bends** under thermal load. From a single
structured floorplan description it builds a mechanical model of the layer stack, applies the
assembly-to-operating thermal load, and returns the out-of-plane warpage. It is a **hybrid engine** with
three methods on the same inputs:

- **High-fidelity at various resolution** — a detailed 3D method that resolves the package through its
  full thickness, reporting warpage **per surface** (die-level active surface *and* continuous package
  surface). On the MI350-class study the answer moves **0.33%** across a 2.25x refinement range, so a
  resolution you can afford already carries the answer a far finer one would give. The reference the
  other two methods are measured against. With **resolution on demand** it also delivers 50 µm or
  10 µm at the corners and gaps you name: on the MI350-class package, 10 µm at five critical regions
  in **5.4 min and 27 GB** on one desktop, where a uniform 10 µm mesh is projected at 2.9 B DOF and
  ~25 TB — and the peak corner stress comes in 5.6x above what the coarse mesh reports.
- **WarpStack-GNN** — an AI-accelerated method trained on numerical ground truth that predicts the
  full warpage map in **19.4 ms** at **0.5% error**, 2,146x faster than solving the same package in 3D.
  Global exploration: once trained for a design, it answers anywhere in that design's space.
- **WarpStack-MOR** — a physics-based compact model built once per design over a bounded box around a
  nominal design. Once built it answers a new material or thermal design point in well under a
  millisecond, with a rigorous error bound attached. Localized exploration.

This repository hosts the **WarpStack** promotion site, live at
**<https://sheldonucr.github.io/warpstack_io/>**. It is organised into three areas: a **features &
capabilities** page ([index.html](index.html)) that highlights the tool, its input and its output; a
**white-paper series** ([whitepapers.html](whitepapers.html)) that holds all the technical detail and
results, one paper per method; and a **contact** section on every page. Each figure and table appears
once, in the white paper it belongs to.

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

The full 3D solve is the reference throughout.

The 3D and WarpStack-MOR results use one reference design, measured end to end:
**2nm CoWoS - 8 HBM stacks x 12-hi DRAM + 2 GPUs - 108 chiplets** — a 56.2 × 57.5 mm package with
135 die regions and 237 mechanical layers, imported from IEEE 3Dblox.
At FEM mesh 64 that is 169,602 degrees of freedom and 45,035 solid elements.
WarpStack-GNN is measured on this same package, described again below.

Measured on an Apple M3, single core. Full data in
`warpstack/tests/warpstack_io_results_sept_2026/` and `warpstack/src_gcn/docs/`.

### Detailed 3D — the reference answer

| Quantity | Value |
| --- | ---: |
| Package | 56.2 × 57.5 mm |
| Chiplet instances | 108 |
| Die regions | 135 |
| Mechanical layers | 237 |
| Solid elements | 45,035 |
| Degrees of freedom | 169,602 |
| Full 3D solve | **40.6 s** |

Peak-to-peak warpage 1332 µm at mesh 64.

### WarpStack-MOR vs 3D — a what-if the model was never built at

Stiffening the ABF substrate from 24.0 to 28.8 GPa moves peak-to-peak warpage by
**+40.9 µm**. The WarpStack-MOR resolves that shift without a new 3D solve:

| Quantity | Full 3D solve | WarpStack-MOR |
| --- | ---: | ---: |
| Peak-to-peak warpage | 1372.7 µm | 1372.6 µm |
| Time per design point | 40.6 s | **51 µs** |
| Peak-to-peak difference | reference | 0.043 µm |
| Whole-map difference (rel. L2) | — | 0.003 % |
| Largest local difference | — | 0.036 µm |
| Speedup | 1× | **798,000×** |

This point sits outside the set the model was built from. A further 8 design points drawn
from across the material design space were each solved with full full 3D solve and compared:
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

### High-fidelity at various resolution — a separate, converged study

The table above is a *different design* from the one below. The reference design used for speed and
for 3D-vs-MOR agreement has absolute warpage that is still moving with the mesh. The resolution
evidence comes from a study of an **AMD MI350-class** package — 64 x 72 mm, 457 mechanical layers,
273 footprint regions, 8 compute dies + 2 I/O dies + 8 twelve-high HBM3E stacks, cooled 200 -> 85 C:

| resolution | free DOFs | peak-to-peak | change |
| --- | ---: | ---: | ---: |
| 1143 µm | 351,222 | 1828.0 µm | — |
| 758 µm | 703,230 | 1830.6 µm | 0.14% |
| 507 µm | 1,427,412 | 1834.0 µm | 0.18% |

Four times the degrees of freedom moves the answer by **6.0 µm — 0.33%** across a 2.25x refinement
range, and the largest point-by-point difference anywhere on the surface is **3.3 µm (0.18% of
peak-to-peak)**. Total numerical uncertainty is **+/-0.55%**. The reported run is 507 µm, 1.43 M DOF,
**11 minutes** and 12.5 GB on an Apple M3 laptop; a 50 µm mesh on the same package would be **107 M
DOF** and roughly **0.9 TB** — 75x the degrees of freedom, and never solved, because the evidence says
the answer it would return is already in hand.

**Scope.** Free package body: no board, BGA, lid or stiffener, and no moisture, cure shrinkage or
gravity — each of which stiffens a real assembly and reduces warpage. Material properties are library
values, not vendor data. Production parts of this class measure substantially lower; 1834.0 µm is a
property of the model as specified, **not a prediction of shipping hardware**. AMD, Instinct and MI350
are trademarks of Advanced Micro Devices, Inc.; NoveetyAI is not affiliated with, endorsed by, or
sponsored by AMD.

### WarpStack-GNN — AI inference, benchmarked against numerical ground truth

**WarpStack-GNN** learns a package's warpage behaviour from results produced by the full 3D method, then returns the full warpage map without solving. A network is trained per design.

Measured on the same **2nm CoWoS** package as the 3D and MOR results above: 56.2 x 57.5 mm, 135
stacked die columns, 237 mechanical layers, 45,035 solid elements, 169,602 degrees of freedom at FEM
mesh 64. Full data in `warpstack/tests/TVLSI_data_sept_2026/results/`.

| Method | Type | Runtime / design | Speedup vs 3D | Error vs 3D |
| --- | --- | ---: | ---: | ---: |
| Full 3D solve | numerical | 41.54 s | 1x (reference) | ground truth |
| **WarpStack-GNN** | **AI** | **19.4 ms** | **2,146x** | **0.49% whole-map** |

Accuracy is reported two ways, against the same 3D method:

| Quantity | 512 held-out design points | 6 fresh 3D solves |
| --- | ---: | ---: |
| Mean 3D peak-to-peak | 1,393 µm | 1,699 µm |
| Whole-map difference (RMSE / p2p) | 0.38% | 0.49% |
| Peak-to-peak error | 1.41% | 1.89% |
| Correlation with 3D | 0.9996 | 0.99996 |

- **2,146x faster than the full 3D solve reference**, single core, at 0.49% whole-map difference against
  six independently solved 3D fields.
- **Genuinely held out:** the 512 scored points come from material configurations kept entirely out of
  training, so the network is scored on combinations it was never shown. Each point varies the material
  set *and* the thermal load.
- **Efficient to train:** 32.2 min to generate 1,792 labelled 3D warpage fields plus 50.8 min of
  training — 83.1 min one-time. Training data comes from WarpStack's own 3D formulation, generated far
  more efficiently than a brute-force sweep of solves.
- **Break-even at 120 design points.** Past that the network is cheaper than solving directly: a
  1,000-point sweep drops from 11.5 hours to 83 minutes.

Generalization to designs outside the one a network was trained on has not yet been measured.

---

## Agentic-flow ready

WarpStack is built to drop straight into **agentic EDA and system-design workflows**, and to work with
*any* agentic flow. A first-class CLI and structured data interface let autonomous design agents call
a full **3D solve**, **WarpStack-MOR**, or **WarpStack-GNN**, read back machine-readable results, and
feed them into floorplanning, stack-up, and material-selection loops — for **warpage-aware optimization**
and **warpage reliability sign-off** of chiplets and advanced packages in system design. With millisecond
AI inference, warpage finally runs at the speed of the loop itself.

- **Agentic-flow ready** — driven by autonomous agents; nothing in the loop needs a GUI.
- **CLI-first & headless** — every method is scriptable from the command line.
- **Structured data interface** — machine-readable floorplans in; warpage surfaces, peak-to-peak bow,
  and signed difference maps out, ready for closed-loop automation.
- **Warpage-aware optimization** — at 19.4 ms per evaluation, WarpStack-GNN lets agents sweep thousands
  of floorplans, stack-ups, and materials in a live loop, steering each candidate toward lower bow.
- **Reliability sign-off** — WarpStack-MOR or WarpStack-GNN screens the whole design space; detailed 3D
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
├── index.html                 Features & capabilities: what it is, its capabilities, input and output.
├── whitepapers.html           White-paper series index — one card per paper.
├── whitepaper-resolution.html White paper 01 · high-fidelity at various resolution (MI350 study).
├── whitepaper-gnn.html        White paper 02 · WarpStack-GNN, global design-space exploration.
├── whitepaper-mor.html        White paper 03 · WarpStack-MOR, localized design-space exploration.
├── whitepaper-apr.html        White paper 04 · resolution on demand (MI350 study, 50 µm / 10 µm).
├── assets/
│   ├── site.css        Shared stylesheet for every page.
│   ├── site.js         Shared behaviour: mobile nav, scroll reveal, bar animation.
│   └── figs/           Result figures — each used once, in its white paper (hero map on index).
│       ├── mi350_floorplan.png             MI350-class package floorplan as modelled
│       ├── mi350_warpage_map.png           MI350-class warpage, 507 µm resolution
│       ├── mi350_profile_resolutions.png   two resolutions overlaid, with the residual
│       ├── stack_hbm4_2nm.png              3D structure view of the 2nm CoWoS stack
│       ├── warpage_hbm4_2nm_3d_active.png  full 3D solve reference surface
│       ├── warpage_hbm4_2nm_mor.png        WarpStack-MOR surface (hero image)
│       ├── warpage_hbm4_2nm_3d_whatif.png  full 3D solve, stiffened-substrate what-if
│       ├── warpage_hbm4_2nm_mor_whatif.png WarpStack-MOR, same what-if
│       ├── warpage_hbm4_2nm_diff.png       signed 3D − WarpStack-MOR difference
│       └── warpage_hbm4_2nm_gnn_vs_3d.png 3D reference vs WarpStack-GNN, with the difference
└── README.md
```

The figures are real WarpStack outputs (from the batch above), cropped from the interactive viewer to
keep the plot and colorbar.

---

## Local preview

The site is static HTML with no build step. Serve the folder and open it in a browser:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/index.html  (and /whitepapers.html)
```

Or open `index.html` directly in a browser — the stylesheet and script are plain relative references,
so they resolve over `file://` too.

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
- **full 3D solve method** (default) — a detailed numerical model that resolves the package through its
  full thickness; writes both the active-surface and package-surface warpage.
- **WarpStack-MOR** — a physics-based compact model built once per design from the same 3D formulation.
  Once built it answers a new material or thermal design point in 51 µs instead of a full solve
  (798,000× faster on the reference design), matching the 3D surface to a small fraction of a micron.
- **WarpStack-GNN** — an AI-accelerated method trained on numerical ground truth: it predicts the
  full warpage map directly from the design description and returns warpage in the same format as the
  numerical methods, in milliseconds. A network is trained per design.
- **Compare mode** (`--compare`) — runs two models on matching surfaces and writes signed difference maps.
- **CLI-first & scriptable** — structured JSON in, CSV/JSON reports out; run one design or a whole batch.

---

## Contact

WarpStack is in active development. For a demo or a walkthrough on your own 2.5D/3D chiplet designs:

- **Email:** <noveetyai@noveetymanagement.com>

© 2026 NoveetyAI, Inc. All rights reserved.
