// Validación de RUC paraguayo y cálculo del dígito verificador (módulo 11).
// Algoritmo oficial DNIT/SET.

export function calcularDV(rucSinDv: string): number {
  if (!/^\d+$/.test(rucSinDv)) {
    throw new Error("El RUC debe contener sólo dígitos");
  }
  if (rucSinDv.length < 1 || rucSinDv.length > 8) {
    throw new Error("El RUC sin DV debe tener entre 1 y 8 dígitos");
  }
  let suma = 0;
  let factor = 2;
  for (let i = rucSinDv.length - 1; i >= 0; i--) {
    suma += parseInt(rucSinDv[i]!, 10) * factor;
    factor = factor === 11 ? 2 : factor + 1;
  }
  const resto = suma % 11;
  const dv = resto <= 1 ? 0 : 11 - resto;
  return dv;
}

export interface RucParseado {
  ruc: string; // sin DV
  dv: number;
  formatoCanonico: string; // `RUC-DV`
}

export function parseRuc(input: string): RucParseado {
  const limpio = input.replace(/\s+/g, "").replace(/\./g, "");
  const match = limpio.match(/^(\d{1,8})-(\d)$/);
  if (match) {
    const ruc = match[1]!;
    const dv = parseInt(match[2]!, 10);
    const dvCalc = calcularDV(ruc);
    if (dv !== dvCalc) {
      throw new Error(`DV inválido: esperado ${dvCalc}, recibido ${dv}`);
    }
    return { ruc, dv, formatoCanonico: `${ruc}-${dv}` };
  }
  // Sólo dígitos: asumimos que falta el DV y lo calculamos.
  if (/^\d{1,8}$/.test(limpio)) {
    const dv = calcularDV(limpio);
    return { ruc: limpio, dv, formatoCanonico: `${limpio}-${dv}` };
  }
  throw new Error("Formato de RUC inválido. Usar `RUC-DV` o sólo dígitos sin DV.");
}
