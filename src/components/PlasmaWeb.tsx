"use client";

import React, { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Color, Triangle } from "ogl";

const vertexShader = `
attribute vec2 uv;
attribute vec2 position;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
uniform vec2 uFocal;
uniform float uFlowSpeed;
uniform float uDensity;
uniform float uHueShift;
uniform float uSpeed;
uniform vec2 uMouse;
uniform float uGlowIntensity;
uniform float uSaturation;
uniform bool uMouseAttraction;
uniform float uPulseIntensity;
uniform float uWebComplexity;
uniform float uAttractionStrength;
uniform float uMouseActiveFactor;
uniform float uEnergyFlow;
uniform bool uTransparent;
uniform float uBrightness;

varying vec2 vUv;

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
    vec2 uv = vUv;
    vec2 p = (uv - 0.5) * uResolution.z;
    
    float time = uTime * uSpeed;
    
    // Mouse interaction
    float distToMouse = length(uv - uMouse);
    float mouseEffect = exp(-distToMouse * 5.0 * uAttractionStrength) * uMouseActiveFactor;
    
    // Plasma calculation
    float v = 0.0;
    vec2 p2 = p * uDensity;
    
    v += sin(p2.x + time * uFlowSpeed);
    v += sin((p2.y + time * uFlowSpeed) * 0.5);
    v += sin((p2.x + p2.y + time * uFlowSpeed) * 0.5);
    
    p2 += time * 0.2;
    v += sin(length(p2) + time);
    
    // Color mapping
    float hue = fract(uHueShift / 360.0 + v * 0.1 + time * 0.05);
    vec3 color = hsv2rgb(vec3(hue, uSaturation, uBrightness));
    
    // Web effect
    float web = noise(p * 10.0 * uWebComplexity + time * 0.1);
    web = pow(web, 3.0) * uGlowIntensity;
    
    // Pulse
    float pulse = sin(time * 2.0) * 0.5 + 0.5;
    color += web * uPulseIntensity * pulse;
    
    // Mouse attraction glow
    if (uMouseAttraction) {
        color += vec3(0.5, 0.2, 0.8) * mouseEffect * uGlowIntensity;
    }
    
    float alpha = uTransparent ? clamp(length(color) * 1.5, 0.0, 1.0) : 1.0;
    gl_FragColor = vec4(color, alpha);
}
`;

interface PlasmaWebProps {
  focal?: [number, number];
  flowSpeed?: number;
  density?: number;
  hueShift?: number;
  disableAnimation?: boolean;
  speed?: number;
  mouseInteraction?: boolean;
  glowIntensity?: number;
  saturation?: number;
  mouseAttraction?: boolean;
  pulseIntensity?: number;
  webComplexity?: number;
  attractionStrength?: number;
  energyFlow?: number;
  transparent?: boolean;
  brightness?: number;
}

export function PlasmaWeb({
  focal = [0.5, 0.5],
  flowSpeed = 0.5,
  density = 1,
  hueShift = 240,
  disableAnimation = false,
  speed = 1.0,
  mouseInteraction = true,
  glowIntensity = 0.8,
  saturation = 0.7,
  mouseAttraction = true,
  pulseIntensity = 0.4,
  webComplexity = 1.0,
  attractionStrength = 1.0,
  energyFlow = 1.0,
  transparent = true,
  brightness = 0.9,
}: PlasmaWebProps) {
  const ctnDom = useRef<HTMLDivElement>(null);
  const targetMousePos = useRef({ x: 0.5, y: 0.5 });
  const smoothMousePos = useRef({ x: 0.5, y: 0.5 });
  const targetMouseActive = useRef(0.0);
  const smoothMouseActive = useRef(0.0);

  useEffect(() => {
    if (!ctnDom.current) return;
    const ctn = ctnDom.current;
    const renderer = new Renderer({
      alpha: transparent,
      premultipliedAlpha: false,
    });
    const gl = renderer.gl;

    if (transparent) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
    } else {
      gl.clearColor(0, 0, 0, 1);
    }

    let program: Program;

    function resize() {
      const scale = 1;
      renderer.setSize(ctn.offsetWidth * scale, ctn.offsetHeight * scale);
      if (program) {
        program.uniforms.uResolution.value = new Color(
          gl.canvas.width,
          gl.canvas.height,
          gl.canvas.width / gl.canvas.height
        );
      }
    }
    window.addEventListener("resize", resize, false);
    resize();

    const geometry = new Triangle(gl);
    program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: {
          value: new Color(
            gl.canvas.width,
            gl.canvas.height,
            gl.canvas.width / gl.canvas.height
          ),
        },
        uFocal: { value: new Float32Array(focal) },
        uFlowSpeed: { value: flowSpeed },
        uDensity: { value: density },
        uHueShift: { value: hueShift },
        uSpeed: { value: speed },
        uMouse: {
          value: new Float32Array([
            smoothMousePos.current.x,
            smoothMousePos.current.y,
          ]),
        },
        uGlowIntensity: { value: glowIntensity },
        uSaturation: { value: saturation },
        uMouseAttraction: { value: mouseAttraction },
        uPulseIntensity: { value: pulseIntensity },
        uWebComplexity: { value: webComplexity },
        uAttractionStrength: { value: attractionStrength },
        uMouseActiveFactor: { value: 0.0 },
        uEnergyFlow: { value: energyFlow },
        uTransparent: { value: transparent },
        uBrightness: { value: brightness },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });
    let animateId: number;

    function update(t: number) {
      animateId = requestAnimationFrame(update);
      if (!disableAnimation) {
        program.uniforms.uTime.value = t * 0.001;
      }

      const lerpFactor = 0.08;
      smoothMousePos.current.x +=
        (targetMousePos.current.x - smoothMousePos.current.x) * lerpFactor;
      smoothMousePos.current.y +=
        (targetMousePos.current.y - smoothMousePos.current.y) * lerpFactor;

      smoothMouseActive.current +=
        (targetMouseActive.current - smoothMouseActive.current) * lerpFactor;

      program.uniforms.uMouse.value[0] = smoothMousePos.current.x;
      program.uniforms.uMouse.value[1] = smoothMousePos.current.y;
      program.uniforms.uMouseActiveFactor.value = smoothMouseActive.current;

      renderer.render({ scene: mesh });
    }
    animateId = requestAnimationFrame(update);
    ctn.appendChild(gl.canvas);

    function handleMouseMove(e: MouseEvent) {
      const rect = ctn.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      targetMousePos.current = { x, y };
      targetMouseActive.current = 1.0;
    }

    function handleMouseLeave() {
      targetMouseActive.current = 0.0;
    }

    if (mouseInteraction) {
      ctn.addEventListener("mousemove", handleMouseMove);
      ctn.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      cancelAnimationFrame(animateId);
      window.removeEventListener("resize", resize);
      if (mouseInteraction) {
        ctn.removeEventListener("mousemove", handleMouseMove);
        ctn.removeEventListener("mouseleave", handleMouseLeave);
      }
      ctn.removeChild(gl.canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [
    focal,
    flowSpeed,
    density,
    hueShift,
    disableAnimation,
    speed,
    mouseInteraction,
    glowIntensity,
    saturation,
    mouseAttraction,
    pulseIntensity,
    webComplexity,
    attractionStrength,
    energyFlow,
    transparent,
    brightness,
  ]);

  return <div ref={ctnDom} className="w-full h-full relative" />;
}
