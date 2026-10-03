import type {
  BlackHoleOptions,
  BlackHoleQuality,
  CameraPose,
  FrequencyShift,
} from "./black-hole-engine";

export type { FrequencyShift } from "./black-hole-engine";

export type KerrLook = {
  camera: CameraPose;
  disk: {
    frequencyShift: FrequencyShift;
    temperature: number;
    radiance: number;
    thickness: number;
    innerRadius: number;
    outerRadius: number;
    density: number;
    swirl: number;
    contrast: number;
    hopper: number;
    reddening: number;
    colorShift: number;
    limb: number;
    starShift: number;
    heatHaze: number;
    innerFade: number;
    tempFall: number;
    tempPower: number;
    saturation: number;
    orbit: number;
  };
  spacetime: {
    spin: number;
    charge: number;
    photonRingBoost: number;
    horizonGlow: number;
    speed: number;
    steps: number;
    lensing: number;
  };
  optics: {
    glow: number;
    stars: number;
    haze: number;
    vignette: number;
    chromatic: number;
    quality: BlackHoleQuality;
  };
};

type LookEngine = {
  setPose(pose: CameraPose): void;
  setOptions(options: Partial<BlackHoleOptions>): void;
};

const CAMERA_KEYS = [
  "distance",
  "azimuth",
  "elevation",
  "roll",
  "shiftX",
  "shiftY",
  "film",
  "exposure",
] as const;

const DISK_KEYS = [
  "temperature",
  "radiance",
  "thickness",
  "innerRadius",
  "outerRadius",
  "density",
  "swirl",
  "contrast",
  "hopper",
  "reddening",
] as const;

const SPACETIME_KEYS = [
  "spin",
  "charge",
  "photonRingBoost",
  "horizonGlow",
  "speed",
  "steps",
] as const;

const OPTIC_KEYS = ["glow", "stars", "haze", "vignette", "chromatic"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isQuality(value: unknown): value is BlackHoleQuality {
  return value === "auto" || value === "performance" || value === "balanced" || value === "high";
}

function isFrequencyShift(value: unknown): value is FrequencyShift {
  return value === "off" || value === "color" || value === "color+bright";
}

export function readFrequencyShift(disk: Record<string, unknown>): FrequencyShift {
  if (isFrequencyShift(disk.frequencyShift)) return disk.frequencyShift;
  if (typeof disk.doppler === "number" && Number.isFinite(disk.doppler)) {
    return disk.doppler === 0 ? "off" : "color+bright";
  }
  return "color+bright";
}

function readNumbers(
  source: Record<string, unknown>,
  keys: readonly string[],
): Record<string, number> | null {
  const out: Record<string, number> = {};
  for (const key of keys) {
    const value = source[key];
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    out[key] = value;
  }
  return out;
}

function round(value: number, places: number): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

export function parseKerrLook(value: unknown): KerrLook | null {
  if (!isRecord(value)) return null;
  const cameraSource = value.camera;
  const diskSource = value.disk;
  const spacetimeSource = value.spacetime;
  const opticsSource = value.optics;
  if (
    !isRecord(cameraSource) ||
    !isRecord(diskSource) ||
    !isRecord(spacetimeSource) ||
    !isRecord(opticsSource)
  ) {
    return null;
  }
  if (!isQuality(opticsSource.quality)) return null;

  const camera = readNumbers(cameraSource, CAMERA_KEYS);
  const disk = readNumbers(diskSource, DISK_KEYS);
  const spacetime = readNumbers(spacetimeSource, SPACETIME_KEYS);
  const optics = readNumbers(opticsSource, OPTIC_KEYS);
  if (!camera || !disk || !spacetime || !optics) return null;

  return {
    camera: {
      distance: camera.distance,
      azimuth: camera.azimuth,
      elevation: camera.elevation,
      roll: camera.roll,
      shiftX: camera.shiftX,
      shiftY: camera.shiftY,
      film: camera.film,
      exposure: camera.exposure,
    },
    disk: {
      frequencyShift: readFrequencyShift(diskSource),
      temperature: disk.temperature,
      radiance: disk.radiance,
      thickness: disk.thickness,
      innerRadius: disk.innerRadius,
      outerRadius: disk.outerRadius,
      density: disk.density,
      swirl: disk.swirl,
      contrast: disk.contrast,
      hopper: disk.hopper,
      reddening: disk.reddening,
      colorShift:
        typeof diskSource.colorShift === "number" && Number.isFinite(diskSource.colorShift)
          ? diskSource.colorShift
          : 0.4,
      limb:
        typeof diskSource.limb === "number" && Number.isFinite(diskSource.limb)
          ? diskSource.limb
          : 0,
      starShift:
        typeof diskSource.starShift === "number" && Number.isFinite(diskSource.starShift)
          ? diskSource.starShift
          : 0.8,
      heatHaze:
        typeof diskSource.heatHaze === "number" && Number.isFinite(diskSource.heatHaze)
          ? diskSource.heatHaze
          : 0,
      innerFade:
        typeof diskSource.innerFade === "number" && Number.isFinite(diskSource.innerFade)
          ? diskSource.innerFade
          : 0.8,
      tempFall:
        typeof diskSource.tempFall === "number" && Number.isFinite(diskSource.tempFall)
          ? diskSource.tempFall
          : 0.72,
      tempPower:
        typeof diskSource.tempPower === "number" && Number.isFinite(diskSource.tempPower)
          ? diskSource.tempPower
          : 0,
      saturation:
        typeof diskSource.saturation === "number" && Number.isFinite(diskSource.saturation)
          ? diskSource.saturation
          : 1,
      orbit:
        typeof diskSource.orbit === "number" && Number.isFinite(diskSource.orbit)
          ? diskSource.orbit
          : 1,
    },
    spacetime: {
      spin: spacetime.spin,
      charge: spacetime.charge,
      photonRingBoost: spacetime.photonRingBoost,
      horizonGlow: spacetime.horizonGlow,
      speed: spacetime.speed,
      steps: Math.round(spacetime.steps),
      lensing:
        typeof spacetimeSource.lensing === "number" && Number.isFinite(spacetimeSource.lensing)
          ? spacetimeSource.lensing
          : 1,
    },
    optics: {
      glow: optics.glow,
      stars: optics.stars,
      haze: optics.haze,
      vignette: optics.vignette,
      chromatic: optics.chromatic,
      quality: opticsSource.quality,
    },
  };
}

export function optionsFromLook(look: KerrLook): BlackHoleOptions {
  return {
    frequencyShift: look.disk.frequencyShift,
    temperature: look.disk.temperature,
    radiance: look.disk.radiance,
    thickness: look.disk.thickness,
    innerRadius: look.disk.innerRadius,
    outerRadius: look.disk.outerRadius,
    density: look.disk.density,
    swirl: look.disk.swirl,
    contrast: look.disk.contrast,
    hopper: look.disk.hopper,
    reddening: look.disk.reddening,
    colorShift: look.disk.colorShift,
    limb: look.disk.limb,
    starShift: look.disk.starShift,
    heatHaze: look.disk.heatHaze,
    innerFade: look.disk.innerFade,
    tempFall: look.disk.tempFall,
    tempPower: look.disk.tempPower,
    saturation: look.disk.saturation,
    orbit: look.disk.orbit,
    spin: look.spacetime.spin,
    charge: look.spacetime.charge,
    photonRingBoost: look.spacetime.photonRingBoost,
    horizonGlow: look.spacetime.horizonGlow,
    speed: look.spacetime.speed,
    steps: look.spacetime.steps,
    lensing: look.spacetime.lensing,
    glow: look.optics.glow,
    stars: look.optics.stars,
    haze: look.optics.haze,
    vignette: look.optics.vignette,
    chromatic: look.optics.chromatic,
    quality: look.optics.quality,
    exposure: look.camera.exposure,
  };
}

export function applyKerrLook(engine: LookEngine, look: KerrLook): void {
  engine.setPose(look.camera);
  engine.setOptions(optionsFromLook(look));
}

type LookSource = {
  frequencyShift: FrequencyShift;
  colorShift: number;
  limb: number;
  starShift: number;
  heatHaze: number;
  innerFade: number;
  tempFall: number;
  tempPower: number;
  saturation: number;
  orbit: number;
  temperature: number;
  radiance: number;
  thickness: number;
  innerRadius: number;
  outerRadius: number;
  density: number;
  swirl: number;
  contrast: number;
  hopper: number;
  reddening: number;
  spin: number;
  charge: number;
  photonRingBoost: number;
  horizonGlow: number;
  speed: number;
  steps: number;
  lensing: number;
  glow: number;
  stars: number;
  haze: number;
  vignette: number;
  chromatic: number;
  quality: BlackHoleQuality;
  exposure: number;
};

export function kerrLookFrom(pose: CameraPose, options: LookSource): KerrLook {
  return {
    camera: {
      distance: round(pose.distance, 2),
      elevation: round(pose.elevation, 5),
      azimuth: round(pose.azimuth, 5),
      roll: round(pose.roll, 5),
      film: round(pose.film, 3),
      shiftX: round(pose.shiftX, 3),
      shiftY: round(pose.shiftY, 3),
      exposure: round(pose.exposure, 3),
    },
    disk: {
      frequencyShift: options.frequencyShift,
      colorShift: round(options.colorShift, 2),
      limb: round(options.limb, 2),
      starShift: round(options.starShift, 2),
      heatHaze: round(options.heatHaze, 2),
      innerFade: round(options.innerFade, 2),
      tempFall: round(options.tempFall, 2),
      tempPower: round(options.tempPower, 2),
      saturation: round(options.saturation, 2),
      orbit: round(options.orbit, 2),
      temperature: round(options.temperature, 0),
      radiance: round(options.radiance, 2),
      thickness: round(options.thickness, 4),
      innerRadius: round(options.innerRadius, 2),
      outerRadius: round(options.outerRadius, 2),
      density: round(options.density, 2),
      swirl: round(options.swirl, 2),
      contrast: round(options.contrast, 2),
      hopper: round(options.hopper, 4),
      reddening: round(options.reddening, 2),
    },
    spacetime: {
      spin: round(options.spin, 2),
      charge: round(options.charge, 2),
      photonRingBoost: round(options.photonRingBoost, 2),
      horizonGlow: round(options.horizonGlow, 2),
      speed: round(options.speed, 2),
      steps: Math.round(options.steps),
      lensing: round(options.lensing, 2),
    },
    optics: {
      glow: round(options.glow, 2),
      stars: round(options.stars, 2),
      haze: round(options.haze, 2),
      vignette: round(options.vignette, 3),
      chromatic: round(options.chromatic, 4),
      quality: options.quality,
    },
  };
}
