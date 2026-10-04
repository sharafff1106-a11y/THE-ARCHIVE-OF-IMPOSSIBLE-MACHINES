/**
 * Memory particles are fully GPU-driven: every particle's path is a pure
 * function of a per-particle seed and an accumulated flow time. No CPU
 * loops, no buffer uploads per frame. Freezing the machine is simply
 * "stop advancing uFlow" — the particles hang in mid-air.
 *
 * Two populations share one draw call:
 *   seed.y <  0.5  → chamber dust: slow orbit inside the glass.
 *   seed.y >= 0.5  → memory stream: spirals inward, climbs the core,
 *                    leaves through the crown and blooms into the room.
 */

export const memoryParticleVertex = /* glsl */ `
  attribute vec4 aSeed;

  uniform float uFlow;
  uniform float uDust;     // 0..1 visibility of chamber dust
  uniform float uEmit;     // 0..1 visibility of memory stream
  uniform float uPurge;    // 0..1 outward burst
  uniform float uSize;
  uniform float uPixelRatio;

  varying float vAlpha;
  varying float vHeat;

  const float TAU = 6.2831853;

  void main() {
    vec3 p;
    float alpha;
    float size = 1.0;

    if (aSeed.y < 0.5) {
      // ── dust ──
      float t = fract(aSeed.x + uFlow * (0.02 + aSeed.z * 0.03));
      float a = aSeed.w * TAU + uFlow * (0.25 + aSeed.z * 0.6);
      float r = 0.12 + 0.42 * aSeed.z + 0.03 * sin(uFlow * 2.0 + aSeed.x * 40.0);
      p = vec3(cos(a) * r, mix(-0.92, 0.92, t), sin(a) * r);
      alpha = uDust * smoothstep(0.0, 0.08, t) * smoothstep(1.0, 0.9, t) * (0.35 + 0.65 * aSeed.w);
      size = 0.55 + aSeed.z * 0.6;
      vHeat = 0.0;
    } else {
      // ── memory stream ──
      float s = fract(aSeed.x + uFlow * (0.05 + aSeed.z * 0.04));
      float a = aSeed.w * TAU + s * 9.0;
      if (s < 0.4) {
        float k = s / 0.4;
        float r = mix(0.5, 0.06, k * k);
        p = vec3(cos(a) * r, mix(-0.85, 1.05, k), sin(a) * r);
      } else if (s < 0.5) {
        float k = (s - 0.4) / 0.1;
        p = vec3(cos(a) * 0.05, mix(1.05, 1.72, k), sin(a) * 0.05);
      } else {
        float k = (s - 0.5) / 0.5;
        float spread = (1.2 + aSeed.z * 2.6) * sqrt(k);
        float lift = k * (1.4 + aSeed.w * 1.4) - k * k * 1.2;
        float aa = aSeed.w * TAU + k * 1.6 * (aSeed.z - 0.5);
        p = vec3(cos(aa) * spread, 1.72 + lift, sin(aa) * spread * 0.8);
      }
      alpha = uEmit * smoothstep(0.0, 0.05, s) * (1.0 - smoothstep(0.75, 1.0, s));
      size = 1.0 + aSeed.z * 1.4;
      vHeat = step(0.93, aSeed.z);
    }

    // purge: everything is thrown outward from the core
    vec3 dir = normalize(p + vec3(0.0001, 0.0, 0.0001));
    p += dir * uPurge * (2.5 + aSeed.z * 4.0);
    alpha *= 1.0 - uPurge * 0.6;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * size * uPixelRatio * (6.0 / -mv.z);
    vAlpha = alpha;
  }
`;

export const memoryParticleFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uHeatColor;
  uniform float uOverload;

  varying float vAlpha;
  varying float vHeat;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    core = pow(core, 1.8);
    vec3 col = mix(uColor, uHeatColor, vHeat * uOverload);
    gl_FragColor = vec4(col, core * vAlpha);
  }
`;
