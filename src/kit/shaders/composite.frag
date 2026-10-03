#version 300 es
precision highp float;

layout(location = 0) out vec4 outputColor;

uniform sampler2D uImage;
uniform sampler2D uBloom0;
uniform sampler2D uBloom1;
uniform sampler2D uBloom2;
uniform sampler2D uBloom3;
uniform sampler2D uBloom4;
uniform vec2 uSize;
uniform float uExposure;
uniform float uGlow;
uniform float uVignette;
uniform float uChromatic;

vec3 acesTonemap(vec3 x) {
    const float a = 2.51f;
    const float b = 0.03f;
    const float c = 2.43f;
    const float d = 0.59f;
    const float e = 0.14f;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0f, 1.0f);
}

void main() {
    vec2 uv = gl_FragCoord.xy / uSize;
    vec2 pixel = 0.65f / vec2(textureSize(uImage, 0));

    vec3 base;
    if(uChromatic > 0.0001f) {
        vec2 offset = (uv - 0.5f) * uChromatic;
        base = 0.40f * vec3(texture(uImage, uv + offset).r, texture(uImage, uv).g, texture(uImage, uv - offset).b);
    } else {
        base = 0.40f * texture(uImage, uv).rgb;
    }
    base += 0.15f * (texture(uImage, uv + vec2(pixel.x, 0.0f)).rgb +
        texture(uImage, uv - vec2(pixel.x, 0.0f)).rgb +
        texture(uImage, uv + vec2(0.0f, pixel.y)).rgb +
        texture(uImage, uv - vec2(0.0f, pixel.y)).rgb);

    vec3 bloom = 0.30f * texture(uBloom0, uv).rgb + 0.16f * texture(uBloom1, uv).rgb * vec3(0.99f, 0.82f, 1.10f);
    bloom += 0.040f * texture(uBloom2, uv).rgb * vec3(0.96f, 0.91f, 1.08f) + 0.016f * texture(uBloom3, uv).rgb + 0.018f * texture(uBloom4, uv).rgb * vec3(1.15f, 0.94f, 0.80f);

    vec3 linear = (base + uGlow * bloom + vec3(0.0015f, 0.0011f, 0.00085f)) * exp2(uExposure);
    float vig = 1.0f - uVignette * dot(uv - 0.5f, uv - 0.5f) * 2.2f;
    linear *= clamp(vig, 0.0f, 1.0f);

    outputColor = vec4(acesTonemap(linear), 1.0f);
}
