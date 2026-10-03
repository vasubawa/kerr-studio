#version 300 es
#extension GL_GOOGLE_include_directive : enable
precision highp float;
precision highp int;
precision highp sampler2D;

layout(location = 0) out vec4 hit0;
layout(location = 1) out vec4 hit1;
layout(location = 2) out vec4 hit2;
layout(location = 3) out vec4 sky;

uniform sampler2D uCoarse0;
uniform sampler2D uCoarse1;
uniform sampler2D uCoarse2;
uniform sampler2D uCoarse3;
uniform vec2 uSize;

float raySide(vec4 hit);
vec2 encodeRay(vec3 ray);
vec3 decodeRay(vec2 encoded);
void traceRay(vec2 uv, out vec4 hit0, out vec4 hit1, out vec4 hit2, out vec4 sky);

#include "trace.glsl"

bool reconstruct(sampler2D map, vec2 uv, out vec4 result) {
    ivec2 size = textureSize(map, 0);
    vec2 p = uv * vec2(size) - .5f;
    ivec2 base = ivec2(floor(p));
    vec2 f = fract(p);
    vec4 a = texelFetch(map, clamp(base, ivec2(0), size - 1), 0);
    vec4 b = texelFetch(map, clamp(base + ivec2(1, 0), ivec2(0), size - 1), 0);
    vec4 c = texelFetch(map, clamp(base + ivec2(0, 1), ivec2(0), size - 1), 0);
    vec4 d = texelFetch(map, clamp(base + ivec2(1, 1), ivec2(0), size - 1), 0);
    result = vec4(1000.f, 0.f, 0.f, 0.f);
    if(min(min(a.x, b.x), min(c.x, d.x)) > 100.f)
        return true;
    if(max(max(a.x, b.x), max(c.x, d.x)) > 100.f)
        return false;
    float side = raySide(a);
    if(min(min(side * raySide(b), side * raySide(c)), side * raySide(d)) < 0.f)
        return false;
    vec2 ab = b.xy - a.xy, ac = c.xy - a.xy, bd = d.xy - b.xy, cd = d.xy - c.xy;
    float extent = max(.25f, length(a.xy) * .08f);
    if(max(max(length(ab), length(ac)), max(length(bd), length(cd))) > extent)
        return false;
    if(length(a.xy - b.xy - c.xy + d.xy) > max(.025f, length(a.xy) * .006f))
        return false;
    vec3 ra = decodeRay(a.zw), rb = decodeRay(b.zw), rc = decodeRay(c.zw), rd = decodeRay(d.zw);
    if(min(min(dot(ra, rb), dot(ra, rc)), dot(ra, rd)) < .995f)
        return false;
    vec2 xy = mix(mix(a.xy, b.xy, f.x), mix(c.xy, d.xy, f.x), f.y);
    vec3 ray = normalize(mix(mix(ra, rb, f.x), mix(rc, rd, f.x), f.y));
    result = vec4(xy, encodeRay(ray));
    return true;
}

bool reconstructSky(sampler2D map, vec2 uv, out vec4 result) {
    ivec2 size = textureSize(map, 0);
    vec2 p = uv * vec2(size) - .5f;
    ivec2 base = ivec2(floor(p));
    vec2 f = fract(p);
    vec4 a = texelFetch(map, clamp(base, ivec2(0), size - 1), 0);
    vec4 b = texelFetch(map, clamp(base + ivec2(1, 0), ivec2(0), size - 1), 0);
    vec4 c = texelFetch(map, clamp(base + ivec2(0, 1), ivec2(0), size - 1), 0);
    vec4 d = texelFetch(map, clamp(base + ivec2(1, 1), ivec2(0), size - 1), 0);
    result = vec4(0.f);
    float lo = min(min(a.z, b.z), min(c.z, d.z));
    float hi = max(max(a.z, b.z), max(c.z, d.z));
    if(hi < .5f)
        return false;
    if(lo < .5f)
        return false;
    vec3 ra = decodeRay(a.xy), rb = decodeRay(b.xy), rc = decodeRay(c.xy), rd = decodeRay(d.xy);
    if(min(min(dot(ra, rb), dot(ra, rc)), dot(ra, rd)) < .995f)
        return false;
    vec3 ray = normalize(mix(mix(ra, rb, f.x), mix(rc, rd, f.x), f.y));
    result = vec4(encodeRay(ray), 1.f, mix(mix(a.w, b.w, f.x), mix(c.w, d.w, f.x), f.y));
    return true;
}

void main() {
    vec2 uv = gl_FragCoord.xy / uSize;
    bool a = reconstruct(uCoarse0, uv, hit0);
    bool b = reconstruct(uCoarse1, uv, hit1);
    bool c = reconstruct(uCoarse2, uv, hit2);
    bool s = reconstructSky(uCoarse3, uv, sky);
    if(!a || !b || !c || !s)
        traceRay(uv, hit0, hit1, hit2, sky);
}
