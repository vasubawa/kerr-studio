import {
  BlackHoleEngine,
  CameraPose,
  kerrDiskInnerRadius,
  type FrequencyShift,
} from "./kit/black-hole-engine";
import { kerrLookFrom, optionsFromLook, parseKerrLook } from "./kit/look";

const canvas = document.getElementById("blackhole-canvas") as HTMLCanvasElement;
const fpsCounter = document.getElementById("fps-counter") as HTMLElement;
const statSpacetime = document.getElementById("stat-spacetime") as HTMLElement;
const toast = document.getElementById("hud-toast") as HTMLElement;
let currentPose: CameraPose = {
  distance: 75,
  azimuth: 0,
  elevation: 0.10472,
  roll: 0.27925,
  shiftX: -0.35,
  shiftY: -0.03,
  film: 0.35,
  exposure: -0.5,
};

let currentOptions = {
  contrast: 10.0,
  speed: 0.65,
  spin: 0.6,
  charge: 0.0,
  frequencyShift: "color+bright" as FrequencyShift,
  colorShift: 0.4,
  limb: 0.0,
  innerRadius: 2.29,
  outerRadius: 36.0,
  thickness: 0.035,
  hopper: 0.0,
  reddening: 0.0,
  photonRingBoost: 0.0,
  horizonGlow: 0.0,
  temperature: 7200.0,
  radiance: 8.0,
  stars: 1.3,
  haze: 0.4,
  density: 1.0,
  swirl: 0.4,
  lensing: 0.15,
  starShift: 0.45,
  heatHaze: 0.0,
  innerFade: 0.8,
  tempFall: 0.72,
  tempPower: 0.0,
  saturation: 1.0,
  orbit: 0.0,
  vignette: 0.0,
  chromatic: 0.0,
  steps: 18,
  glow: 1.0,
  exposure: -0.5,
  quality: "balanced" as const,
};

let engine: BlackHoleEngine | null = null;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
/** Speed restored after orbit drag (animation pauses while dragging). */
let speedBeforeDrag = 0;
const pDistance = document.getElementById("param-distance") as HTMLInputElement;
const distVal = document.getElementById("dist-val") as HTMLElement;
const pElevation = document.getElementById("param-elevation") as HTMLInputElement;
const elevVal = document.getElementById("elev-val") as HTMLElement;
const pAzimuth = document.getElementById("param-azimuth") as HTMLInputElement;
const azimVal = document.getElementById("azim-val") as HTMLElement;
const pRoll = document.getElementById("param-roll") as HTMLInputElement;
const rollVal = document.getElementById("roll-val") as HTMLElement;
const pFilm = document.getElementById("param-film") as HTMLInputElement;
const filmVal = document.getElementById("film-val") as HTMLElement;
const pShiftX = document.getElementById("param-shiftx") as HTMLInputElement;
const shiftXVal = document.getElementById("shiftx-val") as HTMLElement;
const pShiftY = document.getElementById("param-shifty") as HTMLInputElement;
const shiftYVal = document.getElementById("shifty-val") as HTMLElement;
const pFreqShift = document.getElementById("param-freqshift");
const freqShiftVal = document.getElementById("freqshift-val") as HTMLElement;
const pColorShift = document.getElementById("param-colorshift") as HTMLInputElement;
const colorShiftVal = document.getElementById("colorshift-val") as HTMLElement;
const pLimb = document.getElementById("param-limb") as HTMLInputElement;
const limbVal = document.getElementById("limb-val") as HTMLElement;
const pTemp = document.getElementById("param-temp") as HTMLInputElement;
const tempVal = document.getElementById("temp-val") as HTMLElement;
const pRadiance = document.getElementById("param-radiance") as HTMLInputElement;
const radianceVal = document.getElementById("radiance-val") as HTMLElement;
const pThickness = document.getElementById("param-thickness") as HTMLInputElement;
const thicknessVal = document.getElementById("thickness-val") as HTMLElement;
const pHopper = document.getElementById("param-hopper") as HTMLInputElement;
const hopperVal = document.getElementById("hopper-val") as HTMLElement;
const pReddening = document.getElementById("param-reddening") as HTMLInputElement;
const reddeningVal = document.getElementById("reddening-val") as HTMLElement;
const pInner = document.getElementById("param-inner") as HTMLInputElement;
const innerVal = document.getElementById("inner-val") as HTMLElement;
const pOuter = document.getElementById("param-outer") as HTMLInputElement;
const outerVal = document.getElementById("outer-val") as HTMLElement;
const pDensity = document.getElementById("param-density") as HTMLInputElement;
const densityVal = document.getElementById("density-val") as HTMLElement;
const pSwirl = document.getElementById("param-swirl") as HTMLInputElement;
const swirlVal = document.getElementById("swirl-val") as HTMLElement;
const pContrast = document.getElementById("param-contrast") as HTMLInputElement;
const contrastVal = document.getElementById("contrast-val") as HTMLElement;
const pSpin = document.getElementById("param-spin") as HTMLInputElement;
const spinVal = document.getElementById("spin-val") as HTMLElement;
const pCharge = document.getElementById("param-charge") as HTMLInputElement;
const chargeVal = document.getElementById("charge-val") as HTMLElement;
const pSpeed = document.getElementById("param-speed") as HTMLInputElement;
const speedVal = document.getElementById("speed-val") as HTMLElement;
const pRingBoost = document.getElementById("param-ringboost") as HTMLInputElement;
const ringboostVal = document.getElementById("ringboost-val") as HTMLElement;
const pHorizonGlow = document.getElementById("param-horizonglow") as HTMLInputElement;
const horizonglowVal = document.getElementById("horizonglow-val") as HTMLElement;
const pLensing = document.getElementById("param-lensing") as HTMLInputElement;
const lensingVal = document.getElementById("lensing-val") as HTMLElement;
const pStarShift = document.getElementById("param-starshift") as HTMLInputElement;
const starShiftVal = document.getElementById("starshift-val") as HTMLElement;
const pHeat = document.getElementById("param-heathaze") as HTMLInputElement;
const heatVal = document.getElementById("hazeheat-val") as HTMLElement;
const pInnerFade = document.getElementById("param-innerfade") as HTMLInputElement;
const innerFadeVal = document.getElementById("innerfade-val") as HTMLElement;
const pTempFall = document.getElementById("param-tempfall") as HTMLInputElement;
const tempFallVal = document.getElementById("tempfall-val") as HTMLElement;
const pTempPower = document.getElementById("param-temppower") as HTMLInputElement;
const tempPowerVal = document.getElementById("temppower-val") as HTMLElement;
const pSat = document.getElementById("param-saturation") as HTMLInputElement;
const satVal = document.getElementById("sat-val") as HTMLElement;
const pOrbit = document.getElementById("param-orbit") as HTMLInputElement;
const orbitVal = document.getElementById("orbit-val") as HTMLElement;
const pSteps = document.getElementById("param-steps") as HTMLInputElement;
const stepsVal = document.getElementById("steps-val") as HTMLElement;
const pExposure = document.getElementById("param-exposure") as HTMLInputElement;
const expoVal = document.getElementById("expo-val") as HTMLElement;
const pGlow = document.getElementById("param-glow") as HTMLInputElement;
const glowVal = document.getElementById("glow-val") as HTMLElement;
const pStars = document.getElementById("param-stars") as HTMLInputElement;
const starsVal = document.getElementById("stars-val") as HTMLElement;
const pHaze = document.getElementById("param-haze") as HTMLInputElement;
const hazeVal = document.getElementById("haze-val") as HTMLElement;
const pVignette = document.getElementById("param-vignette") as HTMLInputElement;
const vignetteVal = document.getElementById("vignette-val") as HTMLElement;
const pChromatic = document.getElementById("param-chromatic") as HTMLInputElement;
const chromaticVal = document.getElementById("chromatic-val") as HTMLElement;
const pQuality = document.getElementById("param-quality") as HTMLSelectElement;

function syncUI() {
  if (pDistance && distVal) {
    pDistance.value = currentPose.distance.toFixed(1);
    distVal.textContent = currentPose.distance.toFixed(1) + " M";
  }
  if (pElevation && elevVal) {
    pElevation.value = currentPose.elevation.toFixed(2);
    elevVal.textContent = Math.round(currentPose.elevation * (180 / Math.PI)) + "°";
  }
  if (pAzimuth && azimVal) {
    pAzimuth.value = currentPose.azimuth.toFixed(2);
    azimVal.textContent = Math.round(currentPose.azimuth * (180 / Math.PI)) + "°";
  }
  if (pRoll && rollVal) {
    pRoll.value = currentPose.roll.toFixed(2);
    rollVal.textContent = Math.round(currentPose.roll * (180 / Math.PI)) + "°";
  }
  if (pFilm && filmVal) {
    pFilm.value = currentPose.film.toFixed(2);
    filmVal.textContent = currentPose.film.toFixed(2);
  }
  if (pShiftX && shiftXVal) {
    pShiftX.value = currentPose.shiftX.toFixed(2);
    shiftXVal.textContent = currentPose.shiftX.toFixed(2);
  }
  if (pShiftY && shiftYVal) {
    pShiftY.value = currentPose.shiftY.toFixed(2);
    shiftYVal.textContent = currentPose.shiftY.toFixed(2);
  }

  if (pFreqShift && freqShiftVal) {
    freqShiftVal.textContent = currentOptions.frequencyShift;
    pFreqShift.querySelectorAll("button[data-mode]").forEach((button) => {
      button.classList.toggle(
        "active",
        button.getAttribute("data-mode") === currentOptions.frequencyShift,
      );
    });
  }
  if (pColorShift && colorShiftVal) {
    pColorShift.value = currentOptions.colorShift.toFixed(2);
    colorShiftVal.textContent = currentOptions.colorShift.toFixed(2);
  }
  if (pLimb && limbVal) {
    pLimb.value = currentOptions.limb.toFixed(2);
    limbVal.textContent = currentOptions.limb.toFixed(2);
  }
  if (pTemp && tempVal) {
    pTemp.value = currentOptions.temperature.toFixed(0);
    tempVal.textContent = currentOptions.temperature.toFixed(0) + "K";
  }
  if (pRadiance && radianceVal) {
    pRadiance.value = currentOptions.radiance.toFixed(1);
    radianceVal.textContent = currentOptions.radiance.toFixed(1);
  }
  if (pThickness && thicknessVal) {
    pThickness.value = currentOptions.thickness.toFixed(3);
    thicknessVal.textContent = currentOptions.thickness.toFixed(3);
  }
  if (pHopper && hopperVal) {
    pHopper.value = currentOptions.hopper.toFixed(3);
    hopperVal.textContent = currentOptions.hopper.toFixed(3);
  }
  if (pReddening && reddeningVal) {
    pReddening.value = currentOptions.reddening.toFixed(2);
    reddeningVal.textContent = currentOptions.reddening.toFixed(2);
  }
  if (pInner && innerVal) {
    pInner.value = currentOptions.innerRadius.toFixed(2);
    innerVal.textContent = currentOptions.innerRadius.toFixed(2) + " M";
  }
  if (pOuter && outerVal) {
    pOuter.value = currentOptions.outerRadius.toFixed(1);
    outerVal.textContent = currentOptions.outerRadius.toFixed(1) + " M";
  }
  if (pDensity && densityVal) {
    pDensity.value = currentOptions.density.toFixed(2);
    densityVal.textContent = currentOptions.density.toFixed(2) + "x";
  }
  if (pSwirl && swirlVal) {
    pSwirl.value = currentOptions.swirl.toFixed(2);
    swirlVal.textContent = currentOptions.swirl.toFixed(2) + "x";
  }
  if (pContrast && contrastVal) {
    pContrast.value = currentOptions.contrast.toFixed(1);
    contrastVal.textContent = currentOptions.contrast.toFixed(1);
  }

  if (pSpin && spinVal) {
    pSpin.value = currentOptions.spin.toFixed(2);
    spinVal.textContent = currentOptions.spin.toFixed(2);
  }
  if (pCharge && chargeVal) {
    pCharge.value = currentOptions.charge.toFixed(2);
    chargeVal.textContent = currentOptions.charge.toFixed(2);
  }
  if (pRingBoost && ringboostVal) {
    pRingBoost.value = currentOptions.photonRingBoost.toFixed(1);
    ringboostVal.textContent = currentOptions.photonRingBoost.toFixed(2) + "x";
  }
  if (pHorizonGlow && horizonglowVal) {
    pHorizonGlow.value = currentOptions.horizonGlow.toFixed(2);
    horizonglowVal.textContent = currentOptions.horizonGlow.toFixed(2) + "x";
  }
  if (pLensing && lensingVal) {
    pLensing.value = currentOptions.lensing.toFixed(2);
    lensingVal.textContent = currentOptions.lensing.toFixed(2) + "x";
  }
  if (pStarShift && starShiftVal) {
    pStarShift.value = currentOptions.starShift.toFixed(2);
    starShiftVal.textContent = currentOptions.starShift.toFixed(2);
  }
  if (pHeat && heatVal) {
    pHeat.value = currentOptions.heatHaze.toFixed(2);
    heatVal.textContent = currentOptions.heatHaze.toFixed(2);
  }
  if (pInnerFade && innerFadeVal) {
    pInnerFade.value = currentOptions.innerFade.toFixed(2);
    innerFadeVal.textContent = currentOptions.innerFade.toFixed(2);
  }
  if (pTempFall && tempFallVal) {
    pTempFall.value = currentOptions.tempFall.toFixed(2);
    tempFallVal.textContent = currentOptions.tempFall.toFixed(2);
  }
  if (pTempPower && tempPowerVal) {
    pTempPower.value = currentOptions.tempPower.toFixed(2);
    tempPowerVal.textContent = currentOptions.tempPower.toFixed(2);
  }
  if (pSat && satVal) {
    pSat.value = currentOptions.saturation.toFixed(2);
    satVal.textContent = currentOptions.saturation.toFixed(2);
  }
  if (pOrbit && orbitVal) {
    pOrbit.value = currentOptions.orbit.toFixed(2);
    orbitVal.textContent = currentOptions.orbit.toFixed(2);
  }
  if (pSpeed && speedVal) {
    pSpeed.value = currentOptions.speed.toFixed(2);
    speedVal.textContent = currentOptions.speed.toFixed(2) + "x";
  }
  if (pSteps && stepsVal) {
    pSteps.value = currentOptions.steps.toString();
    stepsVal.textContent = currentOptions.steps.toString();
  }

  if (pExposure && expoVal) {
    pExposure.value = currentPose.exposure.toFixed(2);
    expoVal.textContent = currentPose.exposure.toFixed(2);
  }
  if (pGlow && glowVal) {
    pGlow.value = currentOptions.glow.toFixed(2);
    glowVal.textContent = currentOptions.glow.toFixed(2);
  }
  if (pStars && starsVal) {
    pStars.value = currentOptions.stars.toFixed(1);
    starsVal.textContent = currentOptions.stars <= 0.01 ? "off" : currentOptions.stars.toFixed(1);
  }
  if (pHaze && hazeVal) {
    pHaze.value = currentOptions.haze.toFixed(1);
    hazeVal.textContent = currentOptions.haze.toFixed(1) + "x";
  }
  if (pVignette && vignetteVal) {
    pVignette.value = currentOptions.vignette.toFixed(2);
    vignetteVal.textContent = currentOptions.vignette.toFixed(2);
  }
  if (pChromatic && chromaticVal) {
    pChromatic.value = currentOptions.chromatic.toFixed(4);
    chromaticVal.textContent = currentOptions.chromatic.toFixed(4);
  }
  if (pQuality) {
    pQuality.value = currentOptions.quality;
  }

  if (statSpacetime) {
    if (currentOptions.charge > 0.01) {
      statSpacetime.textContent = `Kerr-Newman (a = ${currentOptions.spin.toFixed(2)}, Q = ${currentOptions.charge.toFixed(2)})`;
    } else if (currentOptions.spin > 0.01) {
      statSpacetime.textContent = `Kerr (a = ${currentOptions.spin.toFixed(2)})`;
    } else {
      statSpacetime.textContent = "Schwarzschild (a = 0.00)";
    }
  }
}

function updateEngine() {
  if (!engine) return;
  engine.setPose(currentPose);
  engine.setOptions({
    speed: currentOptions.speed,
    contrast: currentOptions.contrast,
    glow: currentOptions.glow,
    spin: currentOptions.spin,
    charge: currentOptions.charge,
    lensing: currentOptions.lensing,
    starShift: currentOptions.starShift,
    heatHaze: currentOptions.heatHaze,
    innerFade: currentOptions.innerFade,
    tempFall: currentOptions.tempFall,
    tempPower: currentOptions.tempPower,
    saturation: currentOptions.saturation,
    orbit: currentOptions.orbit,
    hopper: currentOptions.hopper,
    reddening: currentOptions.reddening,
    photonRingBoost: currentOptions.photonRingBoost,
    horizonGlow: currentOptions.horizonGlow,
    frequencyShift: currentOptions.frequencyShift,
    colorShift: currentOptions.colorShift,
    limb: currentOptions.limb,
    innerRadius: currentOptions.innerRadius,
    outerRadius: currentOptions.outerRadius,
    thickness: currentOptions.thickness,
    temperature: currentOptions.temperature,
    radiance: currentOptions.radiance,
    stars: currentOptions.stars,
    haze: currentOptions.haze,
    density: currentOptions.density,
    swirl: currentOptions.swirl,
    vignette: currentOptions.vignette,
    chromatic: currentOptions.chromatic,
    steps: currentOptions.steps,
    exposure: currentPose.exposure,
    quality: currentOptions.quality,
  });
  syncUI();
}

async function bootstrap() {
  try {
    engine = new BlackHoleEngine(
      canvas,
      currentOptions,
      (err) => console.error("[BlackHole Engine Error]:", err),
      () => {
        if (engine) engine.setPose(currentPose);
      },
    );

    await engine.initialize();
    updateEngine();
  } catch (err) {
    console.error("[Kerr Engine] Initialization failed:", err);
  }
}
pDistance?.addEventListener("input", () => {
  currentPose.distance = parseFloat(pDistance.value);
  updateEngine();
});
pElevation?.addEventListener("input", () => {
  currentPose.elevation = parseFloat(pElevation.value);
  updateEngine();
});
pAzimuth?.addEventListener("input", () => {
  currentPose.azimuth = parseFloat(pAzimuth.value);
  updateEngine();
});
pRoll?.addEventListener("input", () => {
  currentPose.roll = parseFloat(pRoll.value);
  updateEngine();
});
pFilm?.addEventListener("input", () => {
  currentPose.film = parseFloat(pFilm.value);
  updateEngine();
});
pShiftX?.addEventListener("input", () => {
  currentPose.shiftX = parseFloat(pShiftX.value);
  updateEngine();
});
pShiftY?.addEventListener("input", () => {
  currentPose.shiftY = parseFloat(pShiftY.value);
  updateEngine();
});
pFreqShift?.querySelectorAll("button[data-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    const mode = button.getAttribute("data-mode");
    if (mode !== "off" && mode !== "color" && mode !== "color+bright") return;
    currentOptions.frequencyShift = mode;
    updateEngine();
  });
});
pColorShift?.addEventListener("input", () => {
  currentOptions.colorShift = parseFloat(pColorShift.value);
  updateEngine();
});
pLimb?.addEventListener("input", () => {
  currentOptions.limb = parseFloat(pLimb.value);
  updateEngine();
});
pTemp?.addEventListener("input", () => {
  currentOptions.temperature = parseFloat(pTemp.value);
  updateEngine();
});
pRadiance?.addEventListener("input", () => {
  currentOptions.radiance = parseFloat(pRadiance.value);
  updateEngine();
});
pThickness?.addEventListener("input", () => {
  currentOptions.thickness = parseFloat(pThickness.value);
  updateEngine();
});
pHopper?.addEventListener("input", () => {
  currentOptions.hopper = parseFloat(pHopper.value);
  updateEngine();
});
pReddening?.addEventListener("input", () => {
  currentOptions.reddening = parseFloat(pReddening.value);
  updateEngine();
});
pInner?.addEventListener("input", () => {
  currentOptions.innerRadius = parseFloat(pInner.value);
  updateEngine();
});
pOuter?.addEventListener("input", () => {
  currentOptions.outerRadius = parseFloat(pOuter.value);
  updateEngine();
});
pDensity?.addEventListener("input", () => {
  currentOptions.density = parseFloat(pDensity.value);
  updateEngine();
});
pSwirl?.addEventListener("input", () => {
  currentOptions.swirl = parseFloat(pSwirl.value);
  updateEngine();
});
pContrast?.addEventListener("input", () => {
  currentOptions.contrast = parseFloat(pContrast.value);
  updateEngine();
});
pSpin?.addEventListener("input", () => {
  currentOptions.spin = parseFloat(pSpin.value);
  currentOptions.innerRadius = kerrDiskInnerRadius(currentOptions.spin);
  updateEngine();
});
pCharge?.addEventListener("input", () => {
  currentOptions.charge = parseFloat(pCharge.value);
  updateEngine();
});
pRingBoost?.addEventListener("input", () => {
  currentOptions.photonRingBoost = parseFloat(pRingBoost.value);
  updateEngine();
});
pHorizonGlow?.addEventListener("input", () => {
  currentOptions.horizonGlow = parseFloat(pHorizonGlow.value);
  updateEngine();
});
pLensing?.addEventListener("input", () => {
  currentOptions.lensing = parseFloat(pLensing.value);
  updateEngine();
});
pStarShift?.addEventListener("input", () => {
  currentOptions.starShift = parseFloat(pStarShift.value);
  updateEngine();
});
pHeat?.addEventListener("input", () => {
  currentOptions.heatHaze = parseFloat(pHeat.value);
  updateEngine();
});
pInnerFade?.addEventListener("input", () => {
  currentOptions.innerFade = parseFloat(pInnerFade.value);
  updateEngine();
});
pTempFall?.addEventListener("input", () => {
  currentOptions.tempFall = parseFloat(pTempFall.value);
  updateEngine();
});
pTempPower?.addEventListener("input", () => {
  currentOptions.tempPower = parseFloat(pTempPower.value);
  updateEngine();
});
pSat?.addEventListener("input", () => {
  currentOptions.saturation = parseFloat(pSat.value);
  updateEngine();
});
pOrbit?.addEventListener("input", () => {
  currentOptions.orbit = parseFloat(pOrbit.value);
  updateEngine();
});
pSpeed?.addEventListener("input", () => {
  currentOptions.speed = parseFloat(pSpeed.value);
  updateEngine();
});
pSteps?.addEventListener("input", () => {
  currentOptions.steps = parseInt(pSteps.value, 10);
  updateEngine();
});
pExposure?.addEventListener("input", () => {
  currentPose.exposure = parseFloat(pExposure.value);
  currentOptions.exposure = currentPose.exposure;
  updateEngine();
});
pGlow?.addEventListener("input", () => {
  currentOptions.glow = parseFloat(pGlow.value);
  updateEngine();
});
pStars?.addEventListener("input", () => {
  currentOptions.stars = parseFloat(pStars.value);
  updateEngine();
});
pHaze?.addEventListener("input", () => {
  currentOptions.haze = parseFloat(pHaze.value);
  updateEngine();
});
pVignette?.addEventListener("input", () => {
  currentOptions.vignette = parseFloat(pVignette.value);
  updateEngine();
});
pChromatic?.addEventListener("input", () => {
  currentOptions.chromatic = parseFloat(pChromatic.value);
  updateEngine();
});
pQuality?.addEventListener("change", () => {
  currentOptions.quality = pQuality.value as any;
  updateEngine();
});
window.addEventListener("mousedown", (e) => {
  if ((e.target as HTMLElement).closest(".hud-panel")) return;
  isDragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  // Pause disk animation for the whole drag — keep currentOptions in sync so
  // updateEngine() on mousemove does not immediately restore speed.
  speedBeforeDrag = currentOptions.speed;
  if (speedBeforeDrag > 0) {
    currentOptions.speed = 0;
    engine?.setOptions({ speed: 0 });
  }
});

window.addEventListener("mousemove", (e) => {
  if (!isDragging || !engine) return;
  const dx = e.clientX - lastMouseX;
  const dy = e.clientY - lastMouseY;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;

  currentPose.azimuth = ((currentPose.azimuth + dx * 0.005 + Math.PI) % (2 * Math.PI)) - Math.PI;
  currentPose.elevation = Math.max(-0.78, Math.min(0.78, currentPose.elevation - dy * 0.003));
  updateEngine();
});

window.addEventListener("mouseup", () => {
  if (!isDragging) return;
  isDragging = false;
  if (speedBeforeDrag > 0) {
    currentOptions.speed = speedBeforeDrag;
    engine?.setOptions({ speed: speedBeforeDrag });
  }
});
window.addEventListener(
  "wheel",
  (e) => {
    if (!engine) return;
    const factor = 1 + Math.abs(e.deltaY) * 0.0015;
    if (e.deltaY > 0) {
      currentPose.distance = Math.min(250, currentPose.distance * factor);
    } else {
      currentPose.distance = Math.max(16, currentPose.distance / factor);
    }
    updateEngine();
  },
  { passive: true },
);
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));

    btn.classList.add("active");
    const tabId = (btn as HTMLElement).dataset.tab;
    if (tabId) document.getElementById(tabId)?.classList.add("active");
  });
});

type StudioOptions = typeof currentOptions;

type SavedProfile = {
  name: string;
  pose: CameraPose;
  options: StudioOptions;
};

const launchProfile: SavedProfile = {
  name: "Default",
  pose: { ...currentPose },
  options: { ...currentOptions },
};

const builtinLooks: SavedProfile[] = [
  launchProfile,
  {
    name: "Closer",
    pose: {
      distance: 68,
      azimuth: 0,
      elevation: 0.10472,
      roll: 0.27925,
      shiftX: -0.26,
      shiftY: -0.04,
      film: 0.3,
      exposure: -0.35,
    },
    options: { ...launchProfile.options, exposure: -0.35 },
  },
  {
    name: "Quiet disk",
    pose: {
      distance: 60,
      azimuth: 0,
      elevation: 0.5,
      roll: 0,
      shiftX: 0,
      shiftY: 0,
      film: 0.45,
      exposure: -0.7,
    },
    options: {
      ...launchProfile.options,
      spin: 0,
      frequencyShift: "off",
      temperature: 3400,
      thickness: 0.07,
      outerRadius: 50,
      radiance: 12,
      contrast: 4,
      glow: 2.2,
      stars: 0.3,
      exposure: -0.7,
    },
  },
];

const PROFILE_COOKIE = "kerr_profiles";
const PROFILE_MAX = 3500;

function showToast(message: string) {
  toast.textContent = message;
  toast.classList.add("visible");
  setTimeout(() => toast.classList.remove("visible"), 2500);
}

function readProfiles(): SavedProfile[] {
  const row = document.cookie.split("; ").find((part) => part.startsWith(PROFILE_COOKIE + "="));
  if (!row) return [];
  try {
    const parsed = JSON.parse(
      decodeURIComponent(row.slice(PROFILE_COOKIE.length + 1)),
    ) as SavedProfile[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) => item && typeof item.name === "string" && item.pose && item.options,
    );
  } catch {
    return [];
  }
}

function writeProfiles(profiles: SavedProfile[]): boolean {
  const value = encodeURIComponent(JSON.stringify(profiles));
  if (value.length > PROFILE_MAX) return false;
  document.cookie = PROFILE_COOKIE + "=" + value + "; Max-Age=31536000; Path=/; SameSite=Lax";
  return true;
}

function applyProfile(pose: CameraPose, options: StudioOptions) {
  Object.assign(currentPose, pose);
  Object.assign(currentOptions, options);
  currentOptions.innerRadius = kerrDiskInnerRadius(currentOptions.spin);
  updateEngine();
}

function restoreLaunch() {
  applyProfile({ ...launchProfile.pose }, { ...launchProfile.options });
}

function renderProfiles() {
  const list = document.getElementById("profile-list");
  if (!list) return;
  list.replaceChildren();

  builtinLooks.forEach((look) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preset-btn";
    const title = document.createElement("strong");
    title.textContent = look.name;
    const detail = document.createElement("small");
    detail.textContent =
      look.name === "Default"
        ? "75M, 6 deg, 16 deg roll"
        : look.name === "Closer"
          ? "68M, exposure -0.35"
          : "a = 0, 3400K, thick, no beaming";
    button.append(title, detail);
    button.addEventListener("click", () => applyProfile({ ...look.pose }, { ...look.options }));
    list.append(button);
  });

  for (const profile of readProfiles()) {
    const row = document.createElement("div");
    row.className = "profile-row";
    const load = document.createElement("button");
    load.type = "button";
    load.className = "preset-btn";
    const name = document.createElement("strong");
    name.textContent = profile.name;
    load.append(name);
    load.addEventListener("click", () => applyProfile(profile.pose, profile.options));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "profile-delete";
    remove.setAttribute("aria-label", "Delete " + profile.name);
    remove.textContent = "\u00d7";
    remove.addEventListener("click", () => {
      writeProfiles(readProfiles().filter((item) => item.name !== profile.name));
      renderProfiles();
    });
    row.append(load, remove);
    list.append(row);
  }
}

document.getElementById("profile-save-btn")?.addEventListener("click", () => {
  const input = document.getElementById("profile-name") as HTMLInputElement | null;
  const name = input?.value.trim() || "Look";
  const next = readProfiles().filter((item) => item.name !== name);
  next.push({
    name,
    pose: { ...currentPose },
    options: { ...currentOptions },
  });
  if (!writeProfiles(next)) {
    showToast("Cookie is full. Delete a saved look first.");
    return;
  }
  if (input) input.value = "";
  renderProfiles();
  showToast('Saved "' + name + '".');
});

renderProfiles();
const toggleBtn = document.getElementById("toggle-panel-btn");
const panel = document.getElementById("controls-panel");
toggleBtn?.addEventListener("click", () => {
  panel?.classList.toggle("minimized");
  const minimized = panel?.classList.contains("minimized");
  toggleBtn.textContent = minimized ? "+" : "−";
  toggleBtn.title = minimized ? "Expand Panel" : "Minimize Panel";
});

function currentLookText(): string {
  return JSON.stringify(kerrLookFrom(currentPose, currentOptions), null, 2);
}

function applyLookText(text: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    showToast("That file is not JSON.");
    return;
  }
  const look = parseKerrLook(parsed);
  if (!look) {
    showToast("JSON is missing camera, disk, spacetime, or optics.");
    return;
  }
  Object.assign(currentPose, look.camera);
  Object.assign(currentOptions, optionsFromLook(look));
  currentOptions.innerRadius = kerrDiskInnerRadius(currentOptions.spin);
  updateEngine();
  showToast("Look loaded.");
}

document.getElementById("copy-config-btn")?.addEventListener("click", async () => {
  const text = currentLookText();
  try {
    await navigator.clipboard.writeText(text);
    showToast("Look copied.");
  } catch {
    prompt("Copy this look:", text);
  }
});

document.getElementById("download-json-btn")?.addEventListener("click", () => {
  const blob = new Blob([currentLookText()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "kerr-look.json";
  link.click();
  URL.revokeObjectURL(url);
  showToast("Look downloaded.");
});

const loadInput = document.getElementById("load-json-input");
document.getElementById("load-json-btn")?.addEventListener("click", () => {
  if (loadInput instanceof HTMLInputElement) loadInput.click();
});
loadInput?.addEventListener("change", () => {
  if (!(loadInput instanceof HTMLInputElement)) return;
  const file = loadInput.files?.[0];
  loadInput.value = "";
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") applyLookText(reader.result);
  };
  reader.readAsText(file);
});
const snapshotBtn = document.getElementById("snapshot-btn");
snapshotBtn?.addEventListener("click", () => {
  if (engine) {
    engine.captureSnapshot(`kerr-studio-${Date.now()}.png`);
    toast.textContent = "Snapshot captured!";
    toast.classList.add("visible");
    setTimeout(() => toast.classList.remove("visible"), 2500);
  }
});
const resetBtn = document.getElementById("reset-defaults-btn");
resetBtn?.addEventListener("click", () => {
  restoreLaunch();
});
window.addEventListener("keydown", (e) => {
  if (
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLTextAreaElement ||
    e.target instanceof HTMLSelectElement
  )
    return;

  if (e.key === "h" || e.key === "H") {
    const hud = document.getElementById("controls-panel");
    const stats = document.querySelector(".hud-stats") as HTMLElement;
    const header = document.querySelector(".hud-header") as HTMLElement;
    const footer = document.querySelector(".hud-footer") as HTMLElement;
    const isHidden = hud?.style.display === "none";
    const displayVal = isHidden ? "" : "none";
    if (hud) hud.style.display = displayVal;
    if (stats) stats.style.display = displayVal;
    if (header) header.style.display = displayVal;
    if (footer) footer.style.display = displayVal;
  } else if (e.key === " ") {
    e.preventDefault();
    currentOptions.speed = currentOptions.speed > 0 ? 0.0 : 0.65;
    updateEngine();
  } else if (e.key === "s" || e.key === "S") {
    engine?.captureSnapshot(`kerr-studio-${Date.now()}.png`);
  } else if (e.key === "r" || e.key === "R") {
    restoreLaunch();
  }
});
let frameCount = 0;
let lastFpsTime = performance.now();
function updateFps() {
  const now = performance.now();
  if (engine) {
    // Prefer real completed render frames from the engine.
    const engineFps = engine.getFps();
    if (engineFps > 0) {
      fpsCounter.textContent = engineFps.toString();
      requestAnimationFrame(updateFps);
      return;
    }
  }
  frameCount++;
  if (now - lastFpsTime >= 1000) {
    fpsCounter.textContent = Math.round((frameCount * 1000) / (now - lastFpsTime)).toString();
    frameCount = 0;
    lastFpsTime = now;
  }
  requestAnimationFrame(updateFps);
}
requestAnimationFrame(updateFps);

bootstrap();
