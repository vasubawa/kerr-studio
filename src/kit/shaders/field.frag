#version 300 es
precision highp float;
precision highp int;

layout(location = 0) out vec4 outputColor;

uniform vec2 uSize;

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

vec3 orbital_field(float r, float ph, float z, float Seed) {
    float cs = cos(ph);
    float sn = sin(ph);
    float s = Seed * .137f;
    float warp = .09f * (noise3(vec3(r * .72f + s, cs * 4.1f, sn * 4.1f)) - .5f) + .028f * (noise3(vec3(r * 2.7f, cs * 10.1f + s, sn * 10.1f)) - .5f);
    float ca = ph + .26f * log(max(r, 2.f) / 6.f);
    float cc = cos(ca);
    float ss = sin(ca);
    float macro0 = noise3(vec3(r * 1.0f * 2.3f + s, cc * 1.0f * 19.f, ss * 1.0f * 19.f));
    float macro1 = noise3(vec3(r * 1.0f * 7.2f, cc * 1.0f * 52.f + s, ss * 1.0f * 52.f));
    float macro2 = noise3(vec3(r * 1.0f * 19.f + s, cc * 1.0f * 110.f, ss * 1.0f * 110.f));
    float cloudEnvelope = noise3(vec3(r * .9f + s + 37.f, cc * 5.3f, ss * 5.3f));
    float eddy = .54f * macro0 + .30f * macro1 + .16f * macro2;
    float cloud = .5f + (eddy - .5f) * (.5f + 1.2f * smoothstep(.2f, .8f, cloudEnvelope)) + .35f * (cloudEnvelope - .5f);
    float rr = r + warp + .23f * (macro0 - .5f) + .065f * (macro1 - .5f);
    float theta = ph + .32f * log(max(r, 2.f) / 6.f);
    float fc = cos(theta);
    float fs = sin(theta);
    float large = noise3(vec3(rr * 3.2f + s, fc * 4.5f, fs * 4.5f));
    float middle = noise3(vec3(rr * 12.0f, fc * 7.0f + s, fs * 7.0f));
    float small = noise3(vec3(rr * 37.0f, fc * 38.0f, fs * 38.0f + s));
    float fine = noise3(vec3(rr * 95.0f + s, fc * 145.0f, fs * 145.0f));
    float filament = .18f * large + .34f * middle + .30f * small + .18f * fine;
    float band = .5f + 1.20f * (cloud - .5f) + .7f * (filament - .5f);
    float ridge = clamp(.5f + 1.8f * (.65f * small + .35f * fine - .5f), 0.f, 1.f);
    float height = noise3(vec3(rr * 1.7f + s, cs * 3.0f, sn * 3.0f));
    return vec3(band, ridge, .85f * cloud + .15f * height);
}

void main() {
    float r = gl_FragCoord.x / uSize.x * 36.f;
    float ph = gl_FragCoord.y / uSize.y * 2.f * PI - PI;
    outputColor = vec4(orbital_field(r, ph, 0.f, 83.f), 1.f);
}
