#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

layout(location = 0) out vec4 outputColor;

uniform sampler2D uHit0;
uniform sampler2D uHit1;
uniform sampler2D uHit2;
uniform sampler2D uSky;
uniform vec2 uSize;
uniform float uAspect;
uniform vec3 uCamera;
uniform vec3 uRight;
uniform vec3 uUp;
uniform vec3 uForward;
uniform vec2 uShift;
uniform float uFilm;
uniform float uPhase;
uniform float uContrast;
uniform int uSteps;
uniform int uFrequencyShift;
uniform float uColorShift;
uniform float uLimb;
uniform float uInnerRadius;
uniform float uOuterRadius;
uniform float uDiskThickness;
uniform float uDiskDensity;
uniform float uDiskTemperature;
uniform float uRadiance;
uniform float uStars;
uniform float uHaze;
uniform float uSwirl;
uniform float uLensing;
uniform float uHopper;
uniform float uReddening;
uniform float uPhotonRingBoost;
uniform float uHorizonGlow;
uniform float uSpin;
uniform float uStarShift;
uniform float uHeatHaze;
uniform float uInnerFade;
uniform float uTempFall;
uniform float uTempPower;
uniform float uSaturation;
uniform float uOrbit;

const float PI = 3.141592653589793;

float hash3(int x, int y, int z) {
    uint h = (uint(x) * 15731u + uint(y) * 789221u + uint(z) * 1376312589u) & 0x7fffffffu;
    h = (h >> 13u) ^ h;
    h = (h * (h * h * 15731u + 789221u) + 1376312589u) & 0x7fffffffu;
    return float(h) / 2147483647.;
}
float noise3(vec3 p) {
    int x = int(floor(p[0]));
    int y = int(floor(p[1]));
    int z = int(floor(p[2]));
    float u = p[0] - floor(p[0]);
    float v = p[1] - floor(p[1]);
    float w = p[2] - floor(p[2]);
    u = u * u * u * (u * (u * 6. - 15.) + 10.);
    v = v * v * v * (v * (v * 6. - 15.) + 10.);
    w = w * w * w * (w * (w * 6. - 15.) + 10.);
    return mix(mix(mix(hash3(x, y, z), hash3(x + 1, y, z), u), mix(hash3(x, y + 1, z), hash3(x + 1, y + 1, z), u), v), mix(mix(hash3(x, y, z + 1), hash3(x + 1, y, z + 1), u), mix(hash3(x, y + 1, z + 1), hash3(x + 1, y + 1, z + 1), u), v), w);
}

vec3 thermal(float k) {
    float t = clamp((k - 2200.) / 5100., 0., 1.);
    vec3 low = vec3(1., .40, .16);
    vec3 warm = vec3(1., .65, .40);
    vec3 hot = vec3(1., .88, .86);
    vec3 white = vec3(.96, .86, 1.);
    vec3 c = mix(low, warm, smoothstep(0., .45, t));
    c = mix(c, hot, smoothstep(.3, .83, t));
    return mix(c, white, smoothstep(.75, 1., t));
}

uniform sampler2D uField;
float sampleLength;
vec2 sampleDx, sampleDy;
vec2 fieldGradient(vec2 p, float shear) {
    return vec2(p.x / max(uOuterRadius, 1.), p.y / (2. * PI) + shear * p.x) * vec2(textureSize(uField, 0));
}
vec3 filteredField(vec2 uv, vec2 segment, vec2 dx, vec2 dy, float shear) {
    vec2 a = fieldGradient(segment, shear), b = fieldGradient(dx, shear), c = fieldGradient(dy, shear);
    float xx = a.x * a.x + b.x * b.x + c.x * c.x + 1.;
    float xy = a.x * a.y + b.x * b.y + c.x * c.y;
    float yy = a.y * a.y + b.y * b.y + c.y * c.y + 1.;
    float root = sqrt(xx);
    vec2 size = vec2(textureSize(uField, 0));
    vec2 gx = vec2(root, xy / root) / size;
    vec2 gy = vec2(0., sqrt(max(yy - xy * xy / xx, 1.))) / size;
    return textureGrad(uField, uv, gx, gy).xyz;
}
vec3 advectedField(float r, float ph, float phase, float rate, vec2 footprint, vec2 dx, vec2 dy) {
    float t = fract(phase), speed = rate * pow(max(r, 2.) / 10., -1.5);
    float f = t * t * t * (t * (t * 6. - 15.) + 10.);
    float a = (ph - 2. * PI * speed * t + PI) / (2. * PI);
    float b = (ph - 2. * PI * speed * (t - 1.) + PI) / (2. * PI);
    vec3 q = mix(filteredField(vec2(r / max(uOuterRadius, 1.), a), footprint, dx, dy, 1.5 * speed * t / r), filteredField(vec2(r / max(uOuterRadius, 1.), b), footprint, dx, dy, 1.5 * speed * (t - 1.) / r), f);
    q = vec3(.5) + (q - vec3(.5)) / sqrt((1. - f) * (1. - f) + f * f);
    return vec3(q.x, clamp(q.y, 0., 1.), clamp(q.z, .06, .94));
}
void plasma(vec3 pos, vec3 direction, float InnerRadius, float OuterRadius, float Phase, float OrbitRate, float Radiance, float Temperature, float Thickness, float Contrast, float Seed, out vec3 emission, out float density) {
    float r = sqrt(pos[0] * pos[0] + pos[1] * pos[1]), z = pos[2];
    density = 0.;
    emission = vec3(0);
    float h = (Thickness + uHopper * max(r - InnerRadius, 0.)) * pow(max(r, 2.) / 6., .45);
    if (r <= InnerRadius || r >= OuterRadius || abs(z) > h * 6.)
        return;
    float ph = atan(pos.y, pos.x);
    vec2 radial = pos.xy / r, angular = vec2(-pos.y, pos.x) / (r * r);
    vec2 footprint = vec2(dot(radial, direction.xy), dot(angular, direction.xy)) * sampleLength;
    vec2 dx = vec2(dot(radial, sampleDx), dot(angular, sampleDx));
    vec2 dy = vec2(dot(radial, sampleDy), dot(angular, sampleDy));
    vec3 q = advectedField(r, ph, Phase, OrbitRate, footprint, dx, dy);
    float middle = h * 0.65 * (q[2] - .5);
    h *= .6 + .8 * q[2];
    float vertical = exp(-.5 * pow((z - middle) / h, 2.));
    float edge = smoothstep(InnerRadius, InnerRadius + max(uInnerFade * .55, .04), r) * (1. - smoothstep(OuterRadius * .62, OuterRadius, r));
    float structure = exp(Contrast * .55 * (q[0] - .5));
    float cohesion = mix(1., structure, .28 + .52 * smoothstep(InnerRadius + 1.2, OuterRadius * .4, r));
    float radialPack = pow(max(r, InnerRadius + .15) / (InnerRadius + 2.2), -1.05);
    density = 18. * uDiskDensity * cohesion * vertical * edge * radialPack * (1. - smoothstep(OuterRadius * .38, OuterRadius * .72, r));
    float profile = .7 * pow(max(r, InnerRadius + .1) / 5.2, -.85) * exp(-max(r - 5.0, 0.) / 1.1);
    float temp = clamp(Temperature * pow(max(r, InnerRadius) / 5.2, -clamp(uTempFall, .2, 2.)), 2200., 8500.);
    temp *= .91 + .25 * smoothstep(.38, .64, q[0]);
    float face = 1.;
    float stripes = .42 + 1.15 * q[1];
    vec3 ray = normalize(direction);
    float front = .14 * pow(r / 7.5, -.75) * exp(-max(r - 8., 0.) / 3.2) + .28 * exp(-.5 * pow((r - 4.1) / .95, 2.));
    profile = max(profile, front * .95);
    vec3 velocity = vec3(-pos[1] / r, pos[0] / r, 0.);
    float kepler = clamp(r / max(pow(max(r, .5), 1.5) + uSpin, .5), 0., .7);
    float v = mix(min(.68, .52 * sqrt(5. / r)), kepler, clamp(uOrbit, 0., 1.));
    velocity *= v;
    float doppler = sqrt(1. - dot(velocity, velocity)) / max(.25, 1. + dot(velocity, ray));
    float beam = uFrequencyShift == 0 ? 1. : doppler;
    float colorPow = uFrequencyShift == 0 ? 0. : clamp(uColorShift, 0., 2.);
    float brightPow = uFrequencyShift == 2 ? 2.4 : 0.;
    float intensity = exp(Contrast * .55 * (q[0] - .5));
    intensity = 1.25 * intensity / (1. + intensity / 4.);
    float innerRing = exp(-.5 * pow((r - 4.3) / .9, 2.));
    float ringTemp = temp * (1. + uPhotonRingBoost * .35 * innerRing);
    emission = thermal(ringTemp * pow(max(beam, .2), colorPow)) * Radiance * profile * intensity * stripes * face * pow(max(beam, .2), brightPow);
    emission *= 1. + (uFrequencyShift == 2 ? uLimb * max(0., beam - 1.) : 0.);
    emission *= 1. + uPhotonRingBoost * .12 * innerRing;
    emission *= pow(max(temp, 1.) / max(Temperature, 1.), clamp(uTempPower, 0., 2.));
    float gray = dot(emission, vec3(.3, .59, .11));
    emission = mix(vec3(gray), emission, clamp(uSaturation, 0., 2.));
    if (uReddening > .001)
        emission = vec3(emission.r, emission.g / (1. + uReddening * .35), emission.b / (1. + uReddening * .85));
    float coverTop = exp(-.5 * pow((z - middle - 2.0 * h) / (.62 * h), 2.));
    float coverBottom = exp(-.5 * pow((z - middle + 2.0 * h) / (.62 * h), 2.));
    float cover = 8.0 * (coverTop + coverBottom) * sqrt(structure) * edge * (1. - smoothstep(16., 28., r)) * smoothstep(4.5, 7., r);
    vec3 skin = thermal(max(2300., temp * .62)) * Radiance * 0.019 * pow(r / 8., -.7) * intensity * (.22 + 1.56 * q[1]);
    emission = (emission * density + skin * cover) / max(density + cover, .000001);
    density += cover;
}

vec3 environment_haze(vec3 C, vec3 direction) {
    vec3 q = (C - vec3(20., 0., 5.)) / vec3(28., 16., 10.);
    vec3 v = normalize(direction) / vec3(28., 16., 10.);
    float aa = dot(v, v), bb = dot(q, v), distance2 = max(0., dot(q, q) - bb * bb / aa);
    return vec3(.046, .035, .029) * exp(-.5 * distance2) * smoothstep(0., 2., -bb / aa);
}

vec4 starHash(vec3 p) {
    uvec3 x = uvec3(ivec3(p));
    x = 1103515245u * ((x.xyz >> 1u) ^ (x.yzx));
    uint h = 1103515245u * ((x.x ^ x.z) ^ (x.y >> 3u));
    uvec4 rz = uvec4(h, h * 16807u, h * 48271u, h * 69621u);
    return vec4((rz >> 1) & uvec4(0x7fffffffu)) / float(0x7fffffff);
}
vec3 fieldStars(vec3 p) {
    if (uStars <= .01)
        return vec3(0.);
    vec3 col = vec3(0.);
    float rad = .087 * uSize.y;
    float dens = clamp(uStars, 0., 3.) / 3. * .62;
    float z = 1.;
    mat3 turn = mat3(0.86564, -0.28535, 0.41140, 0.50033, 0.46255, -0.73193, 0.01856, 0.83942, 0.54317);
    for (int i = 0; i < 5; i++) {
        p *= turn;
        vec3 q = abs(p);
        vec3 p2 = p / max(q.x, max(q.y, q.z));
        p2 *= rad;
        vec3 ip = floor(p2 + 1e-5);
        vec3 fp = fract(p2 + 1e-5);
        vec4 rand = starHash(ip * 283.1);
        vec3 q2 = abs(p2);
        vec3 pl = 1. - step(max(q2.x, max(q2.y, q2.z)), q2);
        vec3 pp = fp - ((rand.xyz - .5) * .6 + .5) * pl;
        float pr = length(ip) - rad;
        float keep = dens;
        if (pr > 0.)
            keep = max(0., dens - dens * pr * .002);
        if (rand.w > keep)
            pp += 1e6;
        float d = dot(pp, pp) / (pow(fract(rand.w * 172.1), 32.) + .25);
        float bri = dot(rand.xyz * (1. - pl), vec3(1.));
        float id = fract(rand.w * 101.);
        col += bri * z * .00009 / pow(d + .025, 3.) * (mix(vec3(1., .45, .1), vec3(.75, .85, 1.), id) * .6 + .4);
        rad = floor(rad * 1.08);
        dens *= 1.45;
        z *= .6;
        p = p.yxz;
    }
    return col;
}
vec3 rock_light(vec3 nn, vec3 vv) {
    vec3 n = normalize(nn), v = normalize(vv), light = normalize(vec3(-1., .45, .12));
    float rocks = .6 * noise3(vec3(n) * 17. + vec3(43., 11., 8.)) + .4 * noise3(vec3(n) * 51.);
    float albedo = .023 + .024 * rocks;
    float diffuse = max(0., dot(n, light));
    float spec = .9 * pow(max(0., dot(reflect(-light, n), v)), 64.);
    return vec3(1., .88, .74) * albedo * 40. * diffuse + vec3(1., .96, .92) * spec + vec3(.0005, .0004, .0003);
}
void foreground_planet(vec3 C, vec3 direction, out vec3 Light, out float Alpha) {
    vec3 ray = normalize(direction);
    vec3 center = vec3(46.563894274, -3.75105676885, 6.6124344442);
    float radius = .10;
    vec3 q = C - center;
    float b = dot(q, ray), disc = b * b - dot(q, q) + radius * radius;
    Light = vec3(0);
    Alpha = 0.;
    if (disc <= 0.)
        return;
    float distance = -b - sqrt(disc);
    if (distance <= 0.)
        return;
    vec3 hitNormal = normalize(C + ray * distance - center);
    Light = rock_light(hitNormal, -ray);
    Alpha = 1.;
}

vec2 signNotZero(vec2 v) {
    return vec2(v.x >= 0. ? 1. : -1., v.y >= 0. ? 1. : -1.);
}
vec2 encodeRay(vec3 ray) {
    ray /= abs(ray.x) + abs(ray.y) + abs(ray.z);
    return ray.z >= 0. ? ray.xy : (1. - abs(ray.yx)) * signNotZero(ray.xy);
}
vec3 decodeRay(vec2 encoded) {
    vec3 ray = vec3(encoded, 1. - abs(encoded.x) - abs(encoded.y));
    ray.xy -= signNotZero(ray.xy) * clamp(-ray.z, 0., 1.);
    return normalize(ray);
}
float raySide(vec4 hit) {
    return 1. - abs(hit.z) - abs(hit.w);
}

vec3 hitRay(vec4 hit) {
    return decodeRay(hit.zw);
}
vec4 sampleHit(sampler2D map, ivec2 px) {
    return texelFetch(map, clamp(px, ivec2(0), ivec2(uSize) - 1), 0);
}
vec4 adjacentHit(sampler2D map, ivec2 px, ivec2 offset, vec4 center) {
    vec4 a = sampleHit(map, px + offset);
    vec4 b = sampleHit(map, px - offset);
    float da = a.x > 100. || raySide(a) * raySide(center) < 0. ? 1e6 : length(a.xy - center.xy);
    float db = b.x > 100. || raySide(b) * raySide(center) < 0. ? 1e6 : length(b.xy - center.xy);
    if (min(da, db) > length(center.xy) * .5)
        return center;
    if (da <= db)
        return a;
    return vec4(2. * center.xy - b.xy, encodeRay(normalize(2. * hitRay(center) - hitRay(b))));
}
void integrateHit(sampler2D map, ivec2 px, inout vec3 light, inout float trans, int order) {
    vec4 hit = sampleHit(map, px);
    if (hit.x > 100. || trans < .002)
        return;
    vec3 ray = hitRay(hit);
    vec4 hx = adjacentHit(map, px, ivec2(1, 0), hit), hy = adjacentHit(map, px, ivec2(0, 1), hit);
    vec2 dx = hx.xy - hit.xy, dy = hy.xy - hit.xy;
    vec2 drx = hitRay(hx).xy - ray.xy, dry = hitRay(hy).xy - ray.xy;
    float r = length(hit.xy), h = (uDiskThickness + uHopper * max(r - uInnerRadius, 0.)) * pow(max(r, 2.) / 6., .45);
    float span = min(6. * h / max(abs(ray.z), .012), 14.);
    float ds = 2. * span / float(uSteps);
    sampleLength = ds;
    for (int i = 0; i < 40; i++) {
        if (i >= uSteps || trans < .002)
            break;
        float distance = -span + (float(i) + .5) * ds;
        vec3 pt = vec3(hit.xy, 0.) + ray * distance;
        if (uHeatHaze > .001) {
            float n = hash3(int(pt.x * 3.), int(pt.y * 3.), int(uPhase * 20.));
            pt.xy += (n - .5) * uHeatHaze * .35 * vec2(1., .6);
        }
        sampleDx = dx + distance * drx;
        sampleDy = dy + distance * dry;
        vec3 emission;
        float density;
        plasma(pt, ray, uInnerRadius, uOuterRadius, uPhase, uSwirl, uRadiance, uDiskTemperature, uDiskThickness, uContrast, 83., emission, density);
        float opacity = 1. - exp(-density * ds);
        light += trans * opacity * emission;
        trans *= 1. - opacity;
    }
}
void main() {
    vec2 uv = gl_FragCoord.xy / uSize;
    vec3 dir = normalize(uForward + uRight * ((uv.x - .5 + uShift.x) * uFilm) + uUp * (((uv.y - .5) / uAspect + uShift.y) * uFilm));
    vec3 planet;
    float planetAlpha;
    foreground_planet(uCamera, dir, planet, planetAlpha);
    if (planetAlpha > 0.) {
        outputColor = vec4(planet, 1.);
        return;
    }
    vec3 light = vec3(0.);
    float trans = 1.;
    ivec2 px = ivec2(gl_FragCoord.xy);
    integrateHit(uHit0, px, light, trans, 0);
    integrateHit(uHit1, px, light, trans, 1);
    integrateHit(uHit2, px, light, trans, 2);
    vec4 escaped = texelFetch(uSky, clamp(px, ivec2(0), ivec2(uSize) - 1), 0);
    float inSky = step(.5, escaped.z);
    vec3 starDir = dir;
    if (uLensing > .001 && inSky > .5) {
        vec3 bent = decodeRay(escaped.xy);
        starDir = normalize(mix(dir, bent, clamp(uLensing, 0., 1.)));
        if (uLensing > 1.)
            starDir = normalize(bent + (bent - dir) * (uLensing - 1.));
    }
    float holeImpact = length(cross(uCamera, dir));
    float wind = max(escaped.w, 0.);
    light *= 1. + uPhotonRingBoost * .25 * clamp(wind, 0., 3.);
    light = mix(light, light * vec3(.82, .93, 1.25), clamp(uPhotonRingBoost * wind * .1, 0., .7));
    light += vec3(1., .72, .45) * exp(-pow((holeImpact - 5.2) / .35, 2.)) * uHorizonGlow * trans;
    vec3 stars = fieldStars(starDir) * inSky * trans;
    if (uStarShift > .001 && wind > .02) {
        float shift = 1. + uStarShift * clamp(wind, 0., 2.);
        stars = mix(stars, stars * vec3(.7, .9, 1.45), clamp(uStarShift * wind, 0., 1.));
        stars *= min(pow(shift, 1.25), 3.5);
    }
    outputColor = vec4(light + environment_haze(uCamera, dir) * uHaze + stars, 1.);
}
