#version 300 es
#extension GL_GOOGLE_include_directive : enable
precision highp float;
precision highp int;

layout(location = 0) out vec4 hit0;
layout(location = 1) out vec4 hit1;
layout(location = 2) out vec4 hit2;
layout(location = 3) out vec4 sky;

uniform vec2 uSize;

void traceRay(vec2 uv, out vec4 hit0, out vec4 hit1, out vec4 hit2, out vec4 sky);

#include "trace.glsl"
void main() {
    traceRay(gl_FragCoord.xy / uSize, hit0, hit1, hit2, sky);
}
