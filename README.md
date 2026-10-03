# Kerr black hole

A spinning Kerr black hole in the browser. Null geodesics run in WebGL2 fragment shaders (RK4). The disk shows frequency shift, and the stars follow the bent escape rays.

This started as the hero sky in a portfolio site, then grew into its own studio and copyable kit.

![Default look — spin a = 0.6, frequency shift on, starfield warp 0.15](./public/og.png)

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3002](http://localhost:3002).

```bash
npm run build
```

For Vercel, point at the repo root (`vercel.json` sets the build). Relative asset URLs work at the site root.

## Controls

| Tab | What it changes |
| --- | --- |
| Camera | Distance, elevation, azimuth, roll, film, frame shift |
| Disk | Frequency shift (`off` / `color` / `color+bright`), temperature, radiance, thickness, radii, density, swirl, contrast |
| Physics | Spin $a$, charge, animation speed, volume steps, starfield warp |
| Optics | Exposure, glow, stars, haze, vignette, chromatic aberration, quality |
| Presets | Default, Closer, Quiet disk |

Keyboard: `H` HUD, `Space` pause, `S` snapshot, `R` reset. Drag to orbit. Wheel to zoom (16M–250M).

Default look is [`src/kit/look.json`](./src/kit/look.json) (the frame above). Starfield warp defaults to `0.15`. Quiet disk turns frequency shift off.

## Kit

Copy [`src/kit/`](./src/kit/README.md) into another project. That folder is the engine, shaders (including shared `trace.glsl`), and `look.json`.

| Pass | File | Role |
| --- | --- | --- |
| Field | `field.frag` | Disk velocity and density field |
| Geodesic | `geodesic.frag` + `trace.glsl` | Kerr null geodesics |
| Adaptive | `adaptive.frag` + `trace.glsl` | Edge refinement on the lens map |
| Volume | `volume.frag` | Disk plasma, frequency shift, stars |
| Bloom | `blur.frag` | Separable bloom |
| Composite | `composite.frag` | ACES tonemap |

Studio download JSON writes the same shape as `look.json`.

## Physics notes

Kerr metric in Boyer-Lindquist coordinates, $M = 1$:

$$
\rho^2 = r^2 + a^2\cos^2\theta, \quad \Delta = r^2 - 2Mr + a^2
$$

- Event horizon: $r_+ = M + \sqrt{M^2 - a^2}$
- Frequency factor on the disk: $D = \sqrt{1 - v^2}/(1 + \mathbf{v}\cdot\mathbf{n})$

See [`docs/engine-customization.md`](./docs/engine-customization.md) for which controls are physical and which are grades.

## License

MIT © [Dhruv Sharma](https://github.com/vasubawa)
