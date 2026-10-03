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

uniform float uAspect;
uniform vec3 uCamera;
uniform vec3 uRight;
uniform vec3 uUp;
uniform vec3 uForward;
uniform vec2 uShift;
uniform float uFilm;
uniform float uSpin;
uniform float uCharge;
uniform float uInnerRadius;
uniform float uOuterRadius;
struct State {
    vec4 y;
    float phi;
};
struct Deriv {
    vec4 y;
    float phi;
};
Deriv flow(State s, float L, float Q, float a) {
    float r = s.y.x, mu = s.y.y, pr = s.y.z, pu = s.y.w;
    float pk = r * r + a * a - a * L, d = max(r * r - 2. * r + a * a + uCharge * uCharge, 1e-7);
    return Deriv(vec4(d * pr, pu, 2. * r * pk / d - (r - 1.) * (pk * pk / (d * d) + pr * pr), (a * a - Q - L * L) * mu - 2. * a * a * mu * mu * mu), a * pk / d - a + L * a * a * mu * mu / max(Q + a * a * mu * mu, 1e-10));
}
State addState(State s, Deriv k, float h) {
    return State(s.y + k.y * h, s.phi + k.phi * h);
}
State stepRay(State s, float L, float Q, float a, float h) {
    Deriv k1 = flow(s, L, Q, a), k2 = flow(addState(s, k1, h * .5), L, Q, a), k3 = flow(addState(s, k2, h * .5), L, Q, a), k4 = flow(addState(s, k3, h), L, Q, a);
    return State(s.y + h / 6. * (k1.y + 2. * k2.y + 2. * k3.y + k4.y), s.phi + h / 6. * (k1.phi + 2. * k2.phi + 2. * k3.phi + k4.phi));
}
vec3 position(State s, float L, float pol, float az) {
    float r = s.y.x, mu = s.y.y, hp = az - s.phi - atan(-s.y.w, L * mu) + pol;
    float xy = r * sqrt(max(1. - mu * mu, 0.));
    return vec3(xy * cos(hp), xy * sin(hp), r * mu);
}
vec4 escapedSky(State s, float L, float Q, float a, float pol, float az, float wind) {
    vec3 p = position(s, L, pol, az);
    Deriv velocity = flow(s, L, Q, a);
    float radial = length(p.xy), angular = -velocity.phi - L;
    vec3 ray = normalize(vec3(p.xy / max(radial, 1e-8) * velocity.y.x + vec2(-p.y, p.x) * angular, radial * s.y.w));
    if(any(isnan(ray)))
        return vec4(0.);
    return vec4(encodeRay(ray), 1., wind);
}
void traceRay(vec2 uv, out vec4 hit0, out vec4 hit1, out vec4 hit2, out vec4 sky) {
    hit0 = hit1 = hit2 = vec4(1000., 0., 0., 0.);
    sky = vec4(0.);
    vec3 dir = normalize(uForward + uRight * ((uv.x - .5 + uShift.x) * uFilm) + uUp * (((uv.y - .5) / uAspect + uShift.y) * uFilm));
    float a = uSpin, r = length(uCamera), mu = uCamera.z / r, st = sqrt(max(1. - mu * mu, 1e-8)), az = atan(uCamera.y, uCamera.x);
    float pp = -dot(dir, vec3(-sin(az), cos(az), 0.)), pt = dot(dir, vec3(mu * cos(az), mu * sin(az), -st));
    float sig = r * r + a * a * mu * mu, d = r * r - 2. * r + a * a + uCharge * uCharge, A = pow(r * r + a * a, 2.) - a * a * d * st * st;
    float en = sqrt(sig * d / A) + 2. * a * r / A * sqrt(A / sig) * st * pp;
    float L = sqrt(A / sig) * st * pp / en, pth = sqrt(sig) * pt / en, Q = pth * pth + mu * mu * (L * L / (st * st) - a * a), K = Q + (L - a) * (L - a), pk = r * r + a * a - a * L;
    float pr = (dot(dir, normalize(uCamera)) < 0. ? -1. : 1.) * sqrt(max(pk * pk - d * K, 0.)) / d;
    if(pr > 0.) {
        sky = vec4(encodeRay(dir), 1., 0.);
        return;
    }
    float pu = -st * pth, pol = atan(-pu, L * mu), hor = 1. + sqrt(max(0., 1. - a * a - uCharge * uCharge));
    State s = State(vec4(r, mu, pr, pu), 0.);
    int count = 0;
    bool fell = false;
    float wind = 0.;
    for(int it = 0; it < 1100; it++) {
        float rr = s.y.x, dd = max(rr * rr - 2. * rr + a * a + uCharge * uCharge, 1e-7);
        float h = min(.028 / max(rr, 2.5), .035 / max(abs(s.y.w), 1.));
        h = min(h, .15 * max(rr - hor, .001) / max(abs(dd * s.y.z), 1.));
        if(rr > 2.2 && rr < 6.5)
            wind += h * 6.;
        State ns = stepRay(s, L, Q, a, h);
        if(s.y.y * ns.y.y <= 0.) {
            float t = clamp(-s.y.y / (ns.y.y - s.y.y), 0., 1.);
            State crossing = stepRay(s, L, Q, a, h * t);
            for(int refine = 0; refine < 3; refine++) {
                float slope = h * crossing.y.w;
                float nextT = abs(slope) > 1e-12 ? clamp(t - crossing.y.y / slope, 0., 1.) : t;
                if(nextT == t)
                    break;
                t = nextT;
                crossing = stepRay(s, L, Q, a, h * t);
            }
            vec3 p = position(crossing, L, pol, az);
            Deriv velocity = flow(crossing, L, Q, a);
            float radial = length(p.xy), angular = -velocity.phi - L;
            vec3 ray = normalize(vec3(p.xy / max(radial, 1e-8) * velocity.y.x + vec2(-p.y, p.x) * angular, radial * crossing.y.w));
            float rad = length(p.xy);
            if(rad > uInnerRadius && rad < uOuterRadius && count < 3) {
                vec4 hit = vec4(p.xy, encodeRay(ray));
                if(count == 0)
                    hit0 = hit;
                else if(count == 1)
                    hit1 = hit;
                else
                    hit2 = hit;
                count++;
            }
        }
        s = ns;
        if(isnan(s.y.x) || isinf(s.y.x) || s.y.x < hor + .022) {
            fell = true;
            break;
        }
        if(s.y.x > uOuterRadius && s.y.z > 0.) {
            sky = escapedSky(s, L, Q, a, pol, az, wind);
            break;
        }
    }
    if(!fell && sky.z < .5 && s.y.x > 8.)
        sky = escapedSky(s, L, Q, a, pol, az, wind);
}
