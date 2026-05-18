import { describe, it, expect } from "vitest";
import { calcularDV, parseRuc } from "./ruc";

describe("calcularDV (módulo 11 oficial DNIT/SET)", () => {
  // DVs verificados aplicando el algoritmo a mano (ver comentarios).
  // Iteración de derecha a izquierda, factor desde 2, incremental hasta 11,
  // luego vuelve a 2. resto = suma % 11; dv = resto<=1 ? 0 : 11-resto.
  const casos: Array<[string, number]> = [
    ["1", 9], // 1*2=2, resto=2 → 11-2=9
    ["80012345", 0], // suma=122, resto=1 → 0
    ["80000358", 6], // suma=115, resto=5 → 6
    ["12345678", 9], // suma=156, resto=2 → 9
    ["80017365", 1], // suma=153, resto=10 → 1
  ];

  it.each(casos)("calcularDV(%s) === %i", (ruc, dv) => {
    expect(calcularDV(ruc)).toBe(dv);
  });

  it("rechaza no-dígitos", () => {
    expect(() => calcularDV("12a45")).toThrow();
  });

  it("rechaza vacío y >8 dígitos", () => {
    expect(() => calcularDV("")).toThrow();
    expect(() => calcularDV("123456789")).toThrow();
  });
});

describe("parseRuc", () => {
  it("acepta formato RUC-DV correcto", () => {
    const r = parseRuc("80012345-0");
    expect(r.ruc).toBe("80012345");
    expect(r.dv).toBe(0);
    expect(r.formatoCanonico).toBe("80012345-0");
  });

  it("calcula DV cuando viene sin él", () => {
    const r = parseRuc("80012345");
    expect(r.dv).toBe(0);
    expect(r.formatoCanonico).toBe("80012345-0");
  });

  it("rechaza DV incorrecto", () => {
    expect(() => parseRuc("80012345-7")).toThrow(/DV inválido/);
  });

  it("ignora espacios y puntos", () => {
    const r = parseRuc(" 80.012.345 ");
    expect(r.formatoCanonico).toBe("80012345-0");
  });

  it("rechaza letras o formato malformado", () => {
    expect(() => parseRuc("ABC123")).toThrow();
    expect(() => parseRuc("80012345-77")).toThrow();
  });
});
