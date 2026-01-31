# PathSnap

A tool inspired by Minecraft’s NGTO Builder.
It cleanly places a selected cross-section structure along a curve (Bezier curve).

## Contact / Support

* If you have questions or need help, please contact me on Discord
  **Discord:** `initial_ki`

## Main Features

* High-speed block placement along curves
* Start drawing a new curve **aligned with the direction** of an existing curve (snap feature)
* Easy-to-understand UI / simple command-based controls

---

## Selection Mode Controls

### Set Pos1

Defines the **cross-section structure** that will be placed along the curve.
Left-click to set Pos1.

### Set Pos2

Right-click to set Pos2.
If Pos1 is already set, all blocks in the range from Pos1 to Pos2 are saved as the cross-section.

> [!IMPORTANT]
> The cross-section must be a “flat” shape.
> **Only planar structures with a thickness of 1 block** can be saved.
>
> This is because the cross-section is rotated and moved along the curve,
> and a 3D structure cannot have its correct orientation determined.

---

## Curve Mode Controls

### Add a Control Point

Right-click to add a control point for the curve (Bezier curve).
You can check the position and number of control points using particles and the UI.

> [!NOTE]
> Bezier curves do not pass directly through control points.
> Instead, the curve is “pulled” toward them.
>
> Placing control points farther away results in smoother, gentler curves.

### Remove the Last Control Point

Left-click to remove the most recently added control point.
Changes are immediately reflected in the particles and UI.

---

## About the Snap Feature

Snap data is stored in the **question mark block** at the endpoints of already placed curves.

When you right-click that block:

* The starting position of the curve
* The direction of the curve (tangent direction)

are automatically read, allowing you to start creating a new curve
**with a natural, smoothly connected direction** from the previous one.

---

## Commands

### `/mode`

Switches between selection mode and curve mode.

### `/do`

Places the cross-section structure along the curve when the following conditions are met:

* There are at least two control points
* A cross-section structure has been saved in selection mode
