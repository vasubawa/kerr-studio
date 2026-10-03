#version 300 es
precision highp float;

layout(location = 0) out vec4 outputColor;

uniform sampler2D uImage;
uniform vec2 uSize;
uniform vec2 uDirection;
uniform float uThreshold;

void main() {
    vec2 uv = gl_FragCoord.xy / uSize;
    vec2 offset = uDirection / vec2(textureSize(uImage, 0));
    vec3 c = max(texture(uImage, uv).rgb - uThreshold, 0.f) * .227027f;
    c += max(texture(uImage, uv + offset * 1.384615f).rgb - uThreshold, 0.f) * .316216f;
    c += max(texture(uImage, uv - offset * 1.384615f).rgb - uThreshold, 0.f) * .316216f;
    c += max(texture(uImage, uv + offset * 3.230769f).rgb - uThreshold, 0.f) * .070270f;
    c += max(texture(uImage, uv - offset * 3.230769f).rgb - uThreshold, 0.f) * .070270f;
    outputColor = vec4(c, 1.f);
}
