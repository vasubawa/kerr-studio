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

const float PI = 3.141592653589793f;

float hash3(int x, int y, int z) {
    uint h = (uint(x) * 15731u + uint(y) * 789221u + uint(z) * 1376312589u) & 0x7fffffffu;
    h = (h >> 13u) ^ h;
    h = (h * (h * h * 15731u + 789221u) + 1376312589u) & 0x7fffffffu;
    return float(h) / 2147483647.f;
}
float noise3(vec3 p) {
    int x = int(floor(p[0]));
    int y = int(floor(p[1]));
    int z = int(floor(p[2]));
    float u = p[0] - floor(p[0]);
    float v = p[1] - floor(p[1]);
    float w = p[2] - floor(p[2]);
    u = u * u * u * (u * (u * 6.f - 15.f) + 10.f);
    v = v * v * v * (v * (v * 6.f - 15.f) + 10.f);
    w = w * w * w * (w * (w * 6.f - 15.f) + 10.f);
    return mix(mix(mix(hash3(x, y, z), hash3(x + 1, y, z), u), mix(hash3(x, y + 1, z), hash3(x + 1, y + 1, z), u), v), mix(mix(hash3(x, y, z + 1), hash3(x + 1, y, z + 1), u), mix(hash3(x, y + 1, z + 1), hash3(x + 1, y + 1, z + 1), u), v), w);
}

vec3 thermal(float k) {
    float t = clamp((k - 2200.f) / 5100.f, 0.f, 1.f);
    vec3 low = vec3(1.f, .40f, .16f);
    vec3 warm = vec3(1.f, .65f, .40f);
    vec3 hot = vec3(1.f, .88f, .86f);
    vec3 white = vec3(.96f, .86f, 1.f);
    vec3 c = mix(low, warm, smoothstep(0.f, .45f, t));
    c = mix(c, hot, smoothstep(.3f, .83f, t));
    return mix(c, white, smoothstep(.75f, 1.f, t));
}

uniform sampler2D uField;
float sampleLength;
vec2 sampleDx, sampleDy;
vec2 fieldGradient(vec2 p, float shear) {
    return vec2(p.x / max(uOuterRadius, 1.f), p.y / (2.f * PI) + shear * p.x) * vec2(textureSize(uField, 0));
}
vec3 filteredField(vec2 uv, vec2 segment, vec2 dx, vec2 dy, float shear) {
    vec2 a = fieldGradient(segment, shear), b = fieldGradient(dx, shear), c = fieldGradient(dy, shear);
    float xx = a.x * a.x + b.x * b.x + c.x * c.x + 1.f;
    float xy = a.x * a.y + b.x * b.y + c.x * c.y;
    float yy = a.y * a.y + b.y * b.y + c.y * c.y + 1.f;
    float root = sqrt(xx);
    vec2 size = vec2(textureSize(uField, 0));
    vec2 gx = vec2(root, xy / root) / size;
    vec2 gy = vec2(0.f, sqrt(max(yy - xy * xy / xx, 1.f))) / size;
    return textureGrad(uField, uv, gx, gy).xyz;
}
vec3 advectedField(float r, float ph, float phase, float rate, vec2 footprint, vec2 dx, vec2 dy) {
    float t = fract(phase), speed = rate * pow(max(r, 2.f) / 10.f, -1.5f);
    float f = t * t * t * (t * (t * 6.f - 15.f) + 10.f);
    float a = (ph - 2.f * PI * speed * t + PI) / (2.f * PI);
    float b = (ph - 2.f * PI * speed * (t - 1.f) + PI) / (2.f * PI);
    vec3 q = mix(filteredField(vec2(r / max(uOuterRadius, 1.f), a), footprint, dx, dy, 1.5f * speed * t / r), filteredField(vec2(r / max(uOuterRadius, 1.f), b), footprint, dx, dy, 1.5f * speed * (t - 1.f) / r), f);
    q = vec3(.5f) + (q - vec3(.5f)) / sqrt((1.f - f) * (1.f - f) + f * f);
    return vec3(q.x, clamp(q.y, 0.f, 1.f), clamp(q.z, .06f, .94f));
}
void plasma(vec3 pos, vec3 direction, float InnerRadius, float OuterRadius, float Phase, float OrbitRate, float Radiance, float Temperature, float Thickness, float Contrast, float Seed, out vec3 emission, out float density) {
    float r = sqrt(pos[0] * pos[0] + pos[1] * pos[1]), z = pos[2];
    density = 0.f;
    emission = vec3(0);
    float h = (Thickness + uHopper * max(r - InnerRadius, 0.f)) * pow(max(r, 2.f) / 6.f, .45f);
    if(r <= InnerRadius || r >= OuterRadius || abs(z) > h * 6.f)
        return;
    float ph = atan(pos.y, pos.x);
    vec2 radial = pos.xy / r, angular = vec2(-pos.y, pos.x) / (r * r);
    vec2 footprint = vec2(dot(radial, direction.xy), dot(angular, direction.xy)) * sampleLength;
    vec2 dx = vec2(dot(radial, sampleDx), dot(angular, sampleDx));
    vec2 dy = vec2(dot(radial, sampleDy), dot(angular, sampleDy));
    vec3 q = advectedField(r, ph, Phase, OrbitRate, footprint, dx, dy);
    float middle = h * 0.65f * (q[2] - .5f);
    h *= .6f + .8f * q[2];
    float vertical = exp(-.5f * pow((z - middle) / h, 2.f));
    float edge = smoothstep(InnerRadius, InnerRadius + max(uInnerFade * .55f, .04f), r) * (1.f - smoothstep(OuterRadius * .62f, OuterRadius, r));
    float structure = exp(Contrast * .55f * (q[0] - .5f));
    float cohesion = mix(1.f, structure, .28f + .52f * smoothstep(InnerRadius + 1.2f, OuterRadius * .4f, r));
    float radialPack = pow(max(r, InnerRadius + .15f) / (InnerRadius + 2.2f), -1.05f);
    density = 18.f * uDiskDensity * cohesion * vertical * edge * radialPack * (1.f - smoothstep(OuterRadius * .38f, OuterRadius * .72f, r));
    float profile = .7f * pow(max(r, InnerRadius + .1f) / 5.2f, -.85f) * exp(-max(r - 5.0f, 0.f) / 1.1f);
    float temp = clamp(Temperature * pow(max(r, InnerRadius) / 5.2f, -clamp(uTempFall, .2f, 2.f)), 2200.f, 8500.f);
    temp *= .91f + .25f * smoothstep(.38f, .64f, q[0]);
    float face = 1.f;
    float stripes = .42f + 1.15f * q[1];
    vec3 ray = normalize(direction);
    float front = .14f * pow(r / 7.5f, -.75f) * exp(-max(r - 8.f, 0.f) / 3.2f) + .28f * exp(-.5f * pow((r - 4.1f) / .95f, 2.f));
    profile = max(profile, front * .95f);
    vec3 velocity = vec3(-pos[1] / r, pos[0] / r, 0.f);
    float kepler = clamp(r / max(pow(max(r, .5f), 1.5f) + uSpin, .5f), 0.f, .7f);
    float v = mix(min(.68f, .52f * sqrt(5.f / r)), kepler, clamp(uOrbit, 0.f, 1.f));
    velocity *= v;
    float doppler = sqrt(1.f - dot(velocity, velocity)) / max(.25f, 1.f + dot(velocity, ray));
    float beam = uFrequencyShift == 0 ? 1.f : doppler;
    float colorPow = uFrequencyShift == 0 ? 0.f : clamp(uColorShift, 0.f, 2.f);
    float brightPow = uFrequencyShift == 2 ? 2.4f : 0.f;
    float intensity = exp(Contrast * .55f * (q[0] - .5f));
    intensity = 1.25f * intensity / (1.f + intensity / 4.f);
    float innerRing = exp(-.5f * pow((r - 4.3f) / .9f, 2.f));
    float ringTemp = temp * (1.f + uPhotonRingBoost * .35f * innerRing);
    emission = thermal(ringTemp * pow(max(beam, .2f), colorPow)) * Radiance * profile * intensity * stripes * face * pow(max(beam, .2f), brightPow);
    emission *= 1.f + (uFrequencyShift == 2 ? uLimb * max(0.f, beam - 1.f) : 0.f);
    emission *= 1.f + uPhotonRingBoost * .12f * innerRing;
    emission *= pow(max(temp, 1.f) / max(Temperature, 1.f), clamp(uTempPower, 0.f, 2.f));
    float gray = dot(emission, vec3(.3f, .59f, .11f));
    emission = mix(vec3(gray), emission, clamp(uSaturation, 0.f, 2.f));
    if(uReddening > .001f)
        emission = vec3(emission.r, emission.g / (1.f + uReddening * .35f), emission.b / (1.f + uReddening * .85f));
    float coverTop = exp(-.5f * pow((z - middle - 2.0f * h) / (.62f * h), 2.f));
    float coverBottom = exp(-.5f * pow((z - middle + 2.0f * h) / (.62f * h), 2.f));
    float cover = 8.0f * (coverTop + coverBottom) * sqrt(structure) * edge * (1.f - smoothstep(16.f, 28.f, r)) * smoothstep(4.5f, 7.f, r);
    vec3 skin = thermal(max(2300.f, temp * .62f)) * Radiance * 0.019f * pow(r / 8.f, -.7f) * intensity * (.22f + 1.56f * q[1]);
    emission = (emission * density + skin * cover) / max(density + cover, .000001f);
    density += cover;
}

vec3 environment_haze(vec3 C, vec3 direction) {
    vec3 q = (C - vec3(20.f, 0.f, 5.f)) / vec3(28.f, 16.f, 10.f);
    vec3 v = normalize(direction) / vec3(28.f, 16.f, 10.f);
    float aa = dot(v, v), bb = dot(q, v), distance2 = max(0.f, dot(q, q) - bb * bb / aa);
    return vec3(.046f, .035f, .029f) * exp(-.5f * distance2) * smoothstep(0.f, 2.f, -bb / aa);
}

vec4 starHash(vec3 p) {
    uvec3 x = uvec3(ivec3(p));
    x = 1103515245u * ((x.xyz >> 1u) ^ (x.yzx));
    uint h = 1103515245u * ((x.x ^ x.z) ^ (x.y >> 3u));
    uvec4 rz = uvec4(h, h * 16807u, h * 48271u, h * 69621u);
    return vec4((rz >> 1) & uvec4(0x7fffffffu)) / float(0x7fffffff);
}
vec3 fieldStars(vec3 p) {
    if(uStars <= .01f)
        return vec3(0.f);
    vec3 col = vec3(0.f);
    float rad = .087f * uSize.y;
    float dens = clamp(uStars, 0.f, 3.f) / 3.f * .62f;
    float z = 1.f;
    mat3 turn = mat3(0.86564f, -0.28535f, 0.41140f, 0.50033f, 0.46255f, -0.73193f, 0.01856f, 0.83942f, 0.54317f);
    for(int i = 0; i < 5; i++) {
        p *= turn;
        vec3 q = abs(p);
        vec3 p2 = p / max(q.x, max(q.y, q.z));
        p2 *= rad;
        vec3 ip = floor(p2 + 1e-5f);
        vec3 fp = fract(p2 + 1e-5f);
        vec4 rand = starHash(ip * 283.1f);
        vec3 q2 = abs(p2);
        vec3 pl = 1.f - step(max(q2.x, max(q2.y, q2.z)), q2);
        vec3 pp = fp - ((rand.xyz - .5f) * .6f + .5f) * pl;
        float pr = length(ip) - rad;
        float keep = dens;
        if(pr > 0.f)
            keep = max(0.f, dens - dens * pr * .002f);
        if(rand.w > keep)
            pp += 1e6f;
        float d = dot(pp, pp) / (pow(fract(rand.w * 172.1f), 32.f) + .25f);
        float bri = dot(rand.xyz * (1.f - pl), vec3(1.f));
        float id = fract(rand.w * 101.f);
        col += bri * z * .00009f / pow(d + .025f, 3.f) * (mix(vec3(1.f, .45f, .1f), vec3(.75f, .85f, 1.f), id) * .6f + .4f);
        rad = floor(rad * 1.08f);
        dens *= 1.45f;
        z *= .6f;
        p = p.yxz;
    }
    return col;
}
vec3 rock_light(vec3 nn, vec3 vv) {
    vec3 n = normalize(nn), v = normalize(vv), light = normalize(vec3(-1.f, .45f, .12f));
    float rocks = .6f * noise3(vec3(n) * 17.f + vec3(43.f, 11.f, 8.f)) + .4f * noise3(vec3(n) * 51.f);
    float albedo = .023f + .024f * rocks;
    float diffuse = max(0.f, dot(n, light));
    float spec = .9f * pow(max(0.f, dot(reflect(-light, n), v)), 64.f);
    return vec3(1.f, .88f, .74f) * albedo * 40.f * diffuse + vec3(1.f, .96f, .92f) * spec + vec3(.0005f, .0004f, .0003f);
}
void foreground_planet(vec3 C, vec3 direction, out vec3 Light, out float Alpha) {
    vec3 ray = normalize(direction);
    vec3 center = vec3(46.563894274f, -3.75105676885f, 6.6124344442f);
    float radius = .10f;
    vec3 q = C - center;
    float b = dot(q, ray), disc = b * b - dot(q, q) + radius * radius;
    Light = vec3(0);
    Alpha = 0.f;
    if(disc <= 0.f)
        return;
    float distance = -b - sqrt(disc);
    if(distance <= 0.f)
        return;
    vec3 hitNormal = normalize(C + ray * distance - center);
    Light = rock_light(hitNormal, -ray);
    Alpha = 1.f;
}

vec2 signNotZero(vec2 v) {
    return vec2(v.x >= 0.f ? 1.f : -1.f, v.y >= 0.f ? 1.f : -1.f);
}
vec2 encodeRay(vec3 ray) {
    ray /= abs(ray.x) + abs(ray.y) + abs(ray.z);
    return ray.z >= 0.f ? ray.xy : (1.f - abs(ray.yx)) * signNotZero(ray.xy);
}
vec3 decodeRay(vec2 encoded) {
    vec3 ray = vec3(encoded, 1.f - abs(encoded.x) - abs(encoded.y));
    ray.xy -= signNotZero(ray.xy) * clamp(-ray.z, 0.f, 1.f);
    return normalize(ray);
}
float raySide(vec4 hit) {
    return 1.f - abs(hit.z) - abs(hit.w);
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
    float da = a.x > 100.f || raySide(a) * raySide(center) < 0.f ? 1e6f : length(a.xy - center.xy);
    float db = b.x > 100.f || raySide(b) * raySide(center) < 0.f ? 1e6f : length(b.xy - center.xy);
    if(min(da, db) > length(center.xy) * .5f)
        return center;
    if(da <= db)
        return a;
    return vec4(2.f * center.xy - b.xy, encodeRay(normalize(2.f * hitRay(center) - hitRay(b))));
}
void integrateHit(sampler2D map, ivec2 px, inout vec3 light, inout float trans, int order) {
    vec4 hit = sampleHit(map, px);
    if(hit.x > 100.f || trans < .002f)
        return;
    vec3 ray = hitRay(hit);
    vec4 hx = adjacentHit(map, px, ivec2(1, 0), hit), hy = adjacentHit(map, px, ivec2(0, 1), hit);
    vec2 dx = hx.xy - hit.xy, dy = hy.xy - hit.xy;
    vec2 drx = hitRay(hx).xy - ray.xy, dry = hitRay(hy).xy - ray.xy;
    float r = length(hit.xy), h = (uDiskThickness + uHopper * max(r - uInnerRadius, 0.f)) * pow(max(r, 2.f) / 6.f, .45f);
    float span = min(6.f * h / max(abs(ray.z), .012f), 14.f);
    float ds = 2.f * span / float(uSteps);
    sampleLength = ds;
    for(int i = 0; i < 40; i++) {
        if(i >= uSteps || trans < .002f)
            break;
        float distance = -span + (float(i) + .5f) * ds;
        vec3 pt = vec3(hit.xy, 0.f) + ray * distance;
        if(uHeatHaze > .001f) {
            float n = hash3(int(pt.x * 3.f), int(pt.y * 3.f), int(uPhase * 20.f));
            pt.xy += (n - .5f) * uHeatHaze * .35f * vec2(1.f, .6f);
        }
        sampleDx = dx + distance * drx;
        sampleDy = dy + distance * dry;
        vec3 emission;
        float density;
        plasma(pt, ray, uInnerRadius, uOuterRadius, uPhase, uSwirl, uRadiance, uDiskTemperature, uDiskThickness, uContrast, 83.f, emission, density);
        float opacity = 1.f - exp(-density * ds);
        light += trans * opacity * emission;
        trans *= 1.f - opacity;
    }
}
void main() {
    vec2 uv = gl_FragCoord.xy / uSize;
    vec3 dir = normalize(uForward + uRight * ((uv.x - .5f + uShift.x) * uFilm) + uUp * (((uv.y - .5f) / uAspect + uShift.y) * uFilm));
    vec3 planet;
    float planetAlpha;
    foreground_planet(uCamera, dir, planet, planetAlpha);
    if(planetAlpha > 0.f) {
        outputColor = vec4(planet, 1.f);
        return;
    }
    vec3 light = vec3(0.f);
    float trans = 1.f;
    ivec2 px = ivec2(gl_FragCoord.xy);
    integrateHit(uHit0, px, light, trans, 0);
    integrateHit(uHit1, px, light, trans, 1);
    integrateHit(uHit2, px, light, trans, 2);
    vec4 escaped = texelFetch(uSky, clamp(px, ivec2(0), ivec2(uSize) - 1), 0);
    float inSky = step(.5f, escaped.z);
    vec3 starDir = dir;
    if(uLensing > .001f && inSky > .5f) {
        vec3 bent = decodeRay(escaped.xy);
        starDir = normalize(mix(dir, bent, clamp(uLensing, 0.f, 1.f)));
        if(uLensing > 1.f)
            starDir = normalize(bent + (bent - dir) * (uLensing - 1.f));
    }
    float holeImpact = length(cross(uCamera, dir));
    float wind = max(escaped.w, 0.f);
    light *= 1.f + uPhotonRingBoost * .25f * clamp(wind, 0.f, 3.f);
    light = mix(light, light * vec3(.82f, .93f, 1.25f), clamp(uPhotonRingBoost * wind * .1f, 0.f, .7f));
    light += vec3(1.f, .72f, .45f) * exp(-pow((holeImpact - 5.2f) / .35f, 2.f)) * uHorizonGlow * trans;
    vec3 stars = fieldStars(starDir) * inSky * trans;
    if(uStarShift > .001f && wind > .02f) {
        float shift = 1.f + uStarShift * clamp(wind, 0.f, 2.f);
        stars = mix(stars, stars * vec3(.7f, .9f, 1.45f), clamp(uStarShift * wind, 0.f, 1.f));
        stars *= min(pow(shift, 1.25f), 3.5f);
    }
    outputColor = vec4(light + environment_haze(uCamera, dir) * uHaze + stars, 1.f);
}
