import { describe, it, expect } from "vitest";
import { validarComprobante, type ComprobanteParaValidar } from "./validar";

// ── Base comprobante válido ────────────────────────────────────────────────

function base(overrides: Partial<ComprobanteParaValidar> = {}): ComprobanteParaValidar {
  return {
    tipoRegistro: 1,
    tipoComprobante: 109, // Factura
    fechaEmision: new Date("2024-06-15"),
    timbrado: "12345678",
    numero: "001-001-0000001",
    rucContraparte: "80012345",
    dvContraparte: 0,
    montoGravado10: 1_100_000,
    iva10: 100_000,
    montoGravado5: 0,
    iva5: 0,
    exento: 0,
    total: 1_100_000,
    imputaIva: "S",
    imputaIre: "N",
    imputaIrpRsp: "N",
    noImputa: "N",
    estado: "REGISTRADO",
    campos: [],
    nombreContraparte: "Empresa S.A.",
    tipoIdentificacionContraparte: 1,
    ...overrides,
  };
}

function codigos(c: ComprobanteParaValidar) {
  return validarComprobante(c).map((e) => e.codigo);
}

// ── V-001 — Total = suma de gravados ─────────────────────────────────────

describe("V-001 — total = gravado10 + gravado5 + exento", () => {
  it("pasa cuando los montos cuadran", () => {
    expect(codigos(base())).not.toContain("V-001");
  });

  it("falla cuando el total no cuadra", () => {
    expect(codigos(base({ total: 1_200_000 }))).toContain("V-001");
  });

  it("tolera diferencia de hasta 2 Gs", () => {
    expect(codigos(base({ total: 1_100_001 }))).not.toContain("V-001");
    expect(codigos(base({ total: 1_100_002 }))).not.toContain("V-001");
    expect(codigos(base({ total: 1_100_003 }))).toContain("V-001");
  });

  it("no aplica para tipos 101/104/105/112 en COMPRAS (tipoRegistro=2)", () => {
    const c = base({
      tipoRegistro: 2,
      tipoComprobante: 101,
      montoGravado10: 0,
      iva10: 0,
      total: 500_000,
    });
    expect(codigos(c)).not.toContain("V-001");
  });
});

// ── V-002 — RUC formato ───────────────────────────────────────────────────

describe("V-002 — RUC sin DV solo dígitos 1-8", () => {
  it("pasa para RUC válido 8 dígitos", () => {
    expect(codigos(base({ rucContraparte: "80012345" }))).not.toContain("V-002");
  });

  it("pasa para RUC válido 1 dígito", () => {
    expect(codigos(base({ rucContraparte: "1" }))).not.toContain("V-002");
  });

  it("falla si tiene letras", () => {
    expect(codigos(base({ rucContraparte: "800AB345" }))).toContain("V-002");
  });

  it("falla si tiene más de 8 dígitos", () => {
    expect(codigos(base({ rucContraparte: "123456789" }))).toContain("V-002");
  });

  it("falla si tiene guión (con DV)", () => {
    expect(codigos(base({ rucContraparte: "80012345-0" }))).toContain("V-002");
  });

  it("no aplica si rucContraparte está vacío", () => {
    expect(codigos(base({ rucContraparte: "" }))).not.toContain("V-002");
  });
});

// ── V-003 — DV módulo 11 ─────────────────────────────────────────────────

describe("V-003 — DV módulo 11", () => {
  it("pasa cuando el DV es correcto", () => {
    expect(codigos(base({ rucContraparte: "80012345", dvContraparte: 0 }))).not.toContain("V-003");
  });

  it("advierte cuando el DV es incorrecto", () => {
    const errs = validarComprobante(base({ rucContraparte: "80012345", dvContraparte: 5 }));
    const v003 = errs.find((e) => e.codigo === "V-003");
    expect(v003).toBeDefined();
    expect(v003?.severidad).toBe("ADV"); // advertencia, no bloqueante
  });
});

// ── V-004 — Timbrado ─────────────────────────────────────────────────────

describe("V-004 — Timbrado 8 dígitos numéricos", () => {
  it("pasa con 8 dígitos exactos", () => {
    expect(codigos(base())).not.toContain("V-004");
  });

  it("falla con menos de 8 dígitos", () => {
    expect(codigos(base({ timbrado: "1234567" }))).toContain("V-004");
  });

  it("falla con letras", () => {
    expect(codigos(base({ timbrado: "1234567A" }))).toContain("V-004");
  });

  it("no aplica para tipo 107", () => {
    expect(codigos(base({ tipoComprobante: 107, timbrado: "000" }))).not.toContain("V-004");
  });
});

// ── V-005 — Número formato ───────────────────────────────────────────────

describe("V-005 — Número de comprobante ###-###-#######", () => {
  it("pasa con formato correcto", () => {
    expect(codigos(base())).not.toContain("V-005");
  });

  it("falla con formato sin guiones", () => {
    expect(codigos(base({ numero: "0010010000001" }))).toContain("V-005");
  });

  it("no aplica para tipo 107", () => {
    expect(codigos(base({ tipoComprobante: 107, numero: "any" }))).not.toContain("V-005");
  });
});

// ── V-006 — Fecha ────────────────────────────────────────────────────────

describe("V-006 — Fecha emisión válida", () => {
  it("pasa con fecha válida pasada >= 2021", () => {
    expect(codigos(base())).not.toContain("V-006");
  });

  it("falla con fecha futura", () => {
    const futura = new Date();
    futura.setFullYear(futura.getFullYear() + 1);
    expect(codigos(base({ fechaEmision: futura }))).toContain("V-006");
  });

  it("falla con fecha anterior al 2021", () => {
    expect(codigos(base({ fechaEmision: new Date("2020-12-31") }))).toContain("V-006");
  });

  it("falla si es null", () => {
    expect(codigos(base({ fechaEmision: null }))).toContain("V-006");
  });
});

// ── C-003 — Total > 0 ────────────────────────────────────────────────────

describe("C-003 — Total > 0", () => {
  it("pasa con total positivo", () => {
    expect(codigos(base())).not.toContain("C-003");
  });

  it("falla con total cero", () => {
    expect(codigos(base({ total: 0, montoGravado10: 0, iva10: 0 }))).toContain("C-003");
  });
});

// ── V-014 — Al menos una imputación ──────────────────────────────────────

describe("V-014 — Al menos una imputación S al registrar", () => {
  it("pasa con al menos una imputación S", () => {
    expect(codigos(base())).not.toContain("V-014");
  });

  it("falla si todas son N y estado=REGISTRADO", () => {
    expect(
      codigos(base({ imputaIva: "N", imputaIre: "N", imputaIrpRsp: "N", noImputa: "N" })),
    ).toContain("V-014");
  });

  it("no bloquea si estado no es REGISTRADO", () => {
    expect(
      codigos(
        base({
          imputaIva: "N",
          imputaIre: "N",
          imputaIrpRsp: "N",
          noImputa: "N",
          estado: "EN_REVISION",
        }),
      ),
    ).not.toContain("V-014");
  });
});

// ── V-016 — Régimen del cliente ───────────────────────────────────────────

describe("V-016 — Régimen del cliente permite la imputación", () => {
  it("pasa si el cliente tiene IVA y se imputa IVA", () => {
    expect(
      codigos(
        base({
          imputaIva: "S",
          imputaIre: "N",
          imputaIrpRsp: "N",
          noImputa: "N",
          regimenCliente: ["IVA"],
        }),
      ),
    ).not.toContain("V-016");
  });

  it("falla si el cliente no tiene IVA pero se imputa IVA", () => {
    expect(
      codigos(
        base({
          imputaIva: "S",
          imputaIre: "N",
          imputaIrpRsp: "N",
          noImputa: "N",
          regimenCliente: ["IRE"],
        }),
      ),
    ).toContain("V-016");
  });

  it("pasa si el cliente tiene IRE y se imputa IRE", () => {
    expect(
      codigos(
        base({
          imputaIva: "N",
          imputaIre: "S",
          imputaIrpRsp: "N",
          noImputa: "N",
          regimenCliente: ["IVA", "IRE"],
        }),
      ),
    ).not.toContain("V-016");
  });

  it("pasa si el cliente tiene IRE_SIMPLE y se imputa IRE", () => {
    expect(
      codigos(
        base({
          imputaIva: "N",
          imputaIre: "S",
          imputaIrpRsp: "N",
          noImputa: "N",
          regimenCliente: ["IVA", "IRE_SIMPLE"],
        }),
      ),
    ).not.toContain("V-016");
  });

  it("falla si el cliente no tiene IRE ni IRE_SIMPLE pero se imputa IRE", () => {
    expect(
      codigos(
        base({
          imputaIva: "S",
          imputaIre: "S",
          imputaIrpRsp: "N",
          noImputa: "N",
          regimenCliente: ["IVA"],
        }),
      ),
    ).toContain("V-016");
  });

  it("pasa si el cliente tiene IRP_RSP y se imputa IRP-RSP", () => {
    expect(
      codigos(
        base({
          imputaIva: "S",
          imputaIre: "N",
          imputaIrpRsp: "S",
          noImputa: "N",
          regimenCliente: ["IVA", "IRP_RSP"],
        }),
      ),
    ).not.toContain("V-016");
  });

  it("falla si el cliente no tiene IRP_RSP pero se imputa IRP-RSP", () => {
    expect(
      codigos(
        base({
          imputaIva: "S",
          imputaIre: "N",
          imputaIrpRsp: "S",
          noImputa: "N",
          regimenCliente: ["IVA"],
        }),
      ),
    ).toContain("V-016");
  });

  it("no aplica si regimenCliente es null (dato no disponible)", () => {
    expect(codigos(base({ imputaIva: "S", regimenCliente: null }))).not.toContain("V-016");
  });

  it("no aplica si regimenCliente es array vacío", () => {
    expect(codigos(base({ imputaIva: "S", regimenCliente: [] }))).not.toContain("V-016");
  });

  it("noImputa=S no genera V-016 aunque el régimen no coincida", () => {
    expect(
      codigos(
        base({
          imputaIva: "N",
          imputaIre: "N",
          imputaIrpRsp: "N",
          noImputa: "S",
          regimenCliente: ["IRE"],
        }),
      ),
    ).not.toContain("V-016");
  });
});

// ── V-017 — Comprobante asociado para NC/ND ───────────────────────────────

describe("V-017 — Comprobante asociado para NC/ND", () => {
  it("no aplica para factura (109)", () => {
    expect(codigos(base())).not.toContain("V-017");
  });

  it("falla para nota de crédito (110) sin asociado", () => {
    expect(codigos(base({ tipoComprobante: 110 }))).toContain("V-017");
  });

  it("pasa para nota de crédito (110) con número y timbrado asociados", () => {
    expect(
      codigos(
        base({
          tipoComprobante: 110,
          comprobanteAsociadoNumero: "001-001-0000001",
          comprobanteAsociadoTimbrado: "12345678",
        }),
      ),
    ).not.toContain("V-017");
  });

  it("falla para nota de débito (111) sin asociado", () => {
    expect(codigos(base({ tipoComprobante: 111 }))).toContain("V-017");
  });
});

// ── C-001 / C-002 — Coherencia IVA ──────────────────────────────────────

describe("C-001 — IVA 10 coherencia", () => {
  it("no produce C-001 cuando el IVA cuadra", () => {
    // gravado10=1100000 → iva10 = 1100000/11 = 100000
    expect(codigos(base())).not.toContain("C-001");
  });

  it("produce C-001 como ADV cuando el IVA difiere significativamente", () => {
    const errs = validarComprobante(base({ iva10: 50_000 }));
    const c001 = errs.find((e) => e.codigo === "C-001");
    expect(c001).toBeDefined();
    expect(c001?.severidad).toBe("ADV");
  });
});

describe("C-002 — IVA 5 coherencia", () => {
  it("produce C-002 como ADV cuando el IVA 5 difiere", () => {
    const errs = validarComprobante(
      base({
        montoGravado10: 0,
        iva10: 0,
        montoGravado5: 2_100_000,
        iva5: 50_000, // debería ser 100000
        total: 2_100_000,
      }),
    );
    const c002 = errs.find((e) => e.codigo === "C-002");
    expect(c002).toBeDefined();
    expect(c002?.severidad).toBe("ADV");
  });
});

// ── C-004 — Montos enteros ────────────────────────────────────────────────

describe("C-004 — Montos enteros (PYG sin decimales)", () => {
  it("pasa con montos enteros", () => {
    expect(codigos(base())).not.toContain("C-004");
  });

  it("falla con total decimal", () => {
    expect(codigos(base({ total: 1_100_000.5 }))).toContain("C-004");
  });
});

// ── V-015 — noImputa requiere otra imputación ─────────────────────────────

describe("V-015 — noImputa=S requiere otra imputación en COMPRAS/EGRESOS", () => {
  it("no aplica en VENTAS (tipoRegistro=1)", () => {
    expect(
      codigos(base({ imputaIva: "N", imputaIre: "N", imputaIrpRsp: "N", noImputa: "S" })),
    ).not.toContain("V-015");
  });

  it("falla en COMPRAS si noImputa=S y todas las demás son N", () => {
    expect(
      codigos(
        base({ tipoRegistro: 2, imputaIva: "N", imputaIre: "N", imputaIrpRsp: "N", noImputa: "S" }),
      ),
    ).toContain("V-015");
  });

  it("pasa en COMPRAS si noImputa=S y también imputaIva=S", () => {
    expect(
      codigos(
        base({ tipoRegistro: 2, imputaIva: "S", imputaIre: "N", imputaIrpRsp: "N", noImputa: "S" }),
      ),
    ).not.toContain("V-015");
  });

  it("falla en EGRESOS si noImputa=S y todas las demás son N", () => {
    expect(
      codigos(
        base({ tipoRegistro: 4, imputaIva: "N", imputaIre: "N", imputaIrpRsp: "N", noImputa: "S" }),
      ),
    ).toContain("V-015");
  });
});

// ── V-019 — Tipos especiales en COMPRAS ──────────────────────────────────

describe("V-019 — tipos 101/104/105/112 en COMPRAS: gravados deben ser 0", () => {
  it("falla si gravado10 > 0 para tipo 101 en COMPRAS", () => {
    expect(
      codigos(
        base({
          tipoRegistro: 2,
          tipoComprobante: 101,
          montoGravado10: 500_000,
          iva10: 45_455,
          total: 500_000,
        }),
      ),
    ).toContain("V-019");
  });

  it("pasa si gravado10=gravado5=exento=0 para tipo 101 en COMPRAS", () => {
    const c = base({
      tipoRegistro: 2,
      tipoComprobante: 101,
      montoGravado10: 0,
      iva10: 0,
      montoGravado5: 0,
      iva5: 0,
      exento: 0,
      total: 500_000,
    });
    expect(codigos(c)).not.toContain("V-019");
  });

  it("no aplica para tipo 101 en VENTAS", () => {
    expect(codigos(base({ tipoRegistro: 1, tipoComprobante: 101 }))).not.toContain("V-019");
  });

  it("no aplica para tipo 109 (factura) en COMPRAS", () => {
    expect(codigos(base({ tipoRegistro: 2, tipoComprobante: 109 }))).not.toContain("V-019");
  });
});

// ── V-007 — Fecha período MM/AAAA ────────────────────────────────────────

describe("V-007 — fechaPeriodo MM/AAAA para tipos 206 y 208", () => {
  it("pasa con formato válido y fecha ≥ 01/2021 para tipo 208", () => {
    expect(
      codigos(base({ tipoRegistro: 3, tipoComprobante: 208, fechaPeriodo: "06/2024" })),
    ).not.toContain("V-007");
  });

  it("pasa con 01/2021 (límite inferior)", () => {
    expect(
      codigos(base({ tipoRegistro: 4, tipoComprobante: 206, fechaPeriodo: "01/2021" })),
    ).not.toContain("V-007");
  });

  it("falla cuando fechaPeriodo está ausente para tipo 208", () => {
    expect(codigos(base({ tipoRegistro: 3, tipoComprobante: 208, fechaPeriodo: null }))).toContain(
      "V-007",
    );
  });

  it("falla cuando fechaPeriodo está ausente para tipo 206", () => {
    expect(codigos(base({ tipoRegistro: 4, tipoComprobante: 206, fechaPeriodo: null }))).toContain(
      "V-007",
    );
  });

  it("falla con formato incorrecto (dd/mm/yyyy)", () => {
    expect(
      codigos(base({ tipoRegistro: 3, tipoComprobante: 208, fechaPeriodo: "15/06/2024" })),
    ).toContain("V-007");
  });

  it("falla con año anterior a 2021", () => {
    expect(
      codigos(base({ tipoRegistro: 3, tipoComprobante: 208, fechaPeriodo: "12/2020" })),
    ).toContain("V-007");
  });

  it("falla con mes 00", () => {
    expect(
      codigos(base({ tipoRegistro: 3, tipoComprobante: 208, fechaPeriodo: "00/2024" })),
    ).toContain("V-007");
  });

  it("falla con mes 13", () => {
    expect(
      codigos(base({ tipoRegistro: 3, tipoComprobante: 208, fechaPeriodo: "13/2024" })),
    ).toContain("V-007");
  });

  it("no aplica para tipo 109 (Factura)", () => {
    // No debe exigir fechaPeriodo para una factura normal
    expect(codigos(base({ tipoComprobante: 109, fechaPeriodo: null }))).not.toContain("V-007");
  });
});

// ── V-013 — Imputaciones ∈ {S, N} ────────────────────────────────────────

describe("V-013 — imputaIva / imputaIre / imputaIrpRsp ∈ {S, N}", () => {
  it("pasa cuando todas son S o N", () => {
    expect(codigos(base({ imputaIva: "S", imputaIre: "N", imputaIrpRsp: "N" }))).not.toContain(
      "V-013",
    );
  });

  it('falla cuando imputaIva es "s" (minúscula)', () => {
    expect(codigos(base({ imputaIva: "s" }))).toContain("V-013");
  });

  it("falla cuando imputaIre es cadena vacía", () => {
    expect(codigos(base({ imputaIre: "" }))).toContain("V-013");
  });

  it('falla cuando imputaIrpRsp es "SI"', () => {
    expect(codigos(base({ imputaIrpRsp: "SI" }))).toContain("V-013");
  });

  it("produce un error distinto por cada campo inválido", () => {
    const errs = validarComprobante(base({ imputaIva: "x", imputaIre: "y", imputaIrpRsp: "z" }));
    const v013 = errs.filter((e) => e.codigo === "V-013");
    expect(v013.length).toBe(3);
  });
});

// ── V-008 — Condición de operación ───────────────────────────────────────

describe("V-008 — condicionOperacion ∈ {1,2} para tipo 109 (Factura)", () => {
  it("pasa con condición 1 (Contado)", () => {
    expect(codigos(base({ condicionOperacion: 1 }))).not.toContain("V-008");
  });

  it("pasa con condición 2 (Crédito)", () => {
    expect(codigos(base({ condicionOperacion: 2 }))).not.toContain("V-008");
  });

  it("falla con condición 3", () => {
    expect(codigos(base({ condicionOperacion: 3 }))).toContain("V-008");
  });

  it("falla con condición 0", () => {
    expect(codigos(base({ condicionOperacion: 0 }))).toContain("V-008");
  });

  it("no aplica para tipo distinto de 109 (aunque condición sea inválida)", () => {
    // tipo 103 = Boleta de Venta; V-008 solo aplica a 109
    expect(codigos(base({ tipoComprobante: 103, condicionOperacion: 99 }))).not.toContain("V-008");
  });

  it("no aplica si condicionOperacion es null", () => {
    expect(codigos(base({ condicionOperacion: null }))).not.toContain("V-008");
  });
});

// ── V-009 — Moneda extranjera ─────────────────────────────────────────────

describe("V-009 — operacionMonedaExtranjera ∈ {S, N}", () => {
  it('pasa con valor "S"', () => {
    expect(codigos(base({ operacionMonedaExtranjera: "S" }))).not.toContain("V-009");
  });

  it('pasa con valor "N"', () => {
    expect(codigos(base({ operacionMonedaExtranjera: "N" }))).not.toContain("V-009");
  });

  it('falla con valor "s" (minúscula)', () => {
    expect(codigos(base({ operacionMonedaExtranjera: "s" }))).toContain("V-009");
  });

  it('falla con valor "SI"', () => {
    expect(codigos(base({ operacionMonedaExtranjera: "SI" }))).toContain("V-009");
  });

  it("falla con cadena vacía", () => {
    expect(codigos(base({ operacionMonedaExtranjera: "" }))).toContain("V-009");
  });

  it("no aplica si operacionMonedaExtranjera es null", () => {
    expect(codigos(base({ operacionMonedaExtranjera: null }))).not.toContain("V-009");
  });
});

// ── V-010 — Tipo identificación válido ───────────────────────────────────

describe("V-010 — Tipo identificación ∈ Tabla 3", () => {
  it("pasa para tipo 11 (RUC)", () => {
    expect(codigos(base({ tipoIdentificacionContraparte: 11 }))).not.toContain("V-010");
  });

  it("pasa para tipo 12 (CI)", () => {
    expect(codigos(base({ tipoIdentificacionContraparte: 12 }))).not.toContain("V-010");
  });

  it("pasa para tipo 17 (Id. Tributaria)", () => {
    expect(codigos(base({ tipoIdentificacionContraparte: 17 }))).not.toContain("V-010");
  });

  it("falla para tipo 0", () => {
    expect(codigos(base({ tipoIdentificacionContraparte: 0 }))).toContain("V-010");
  });

  it("falla para tipo 99", () => {
    expect(codigos(base({ tipoIdentificacionContraparte: 99 }))).toContain("V-010");
  });

  it("no aplica si tipoIdentificacionContraparte es null", () => {
    expect(codigos(base({ tipoIdentificacionContraparte: null }))).not.toContain("V-010");
  });
});

// ── V-011 — Tipo comprobante permitido para tipo de registro ──────────────

describe("V-011 — Tipo comprobante ∈ Tabla 4 y permitido para registro", () => {
  it("pasa para factura (109) en VENTAS", () => {
    expect(codigos(base({ tipoRegistro: 1, tipoComprobante: 109 }))).not.toContain("V-011");
  });

  it("pasa para autofactura (101) en COMPRAS", () => {
    expect(
      codigos(
        base({
          tipoRegistro: 2,
          tipoComprobante: 101,
          montoGravado10: 0,
          iva10: 0,
          total: 500_000,
        }),
      ),
    ).not.toContain("V-011");
  });

  it("falla para autofactura (101) en VENTAS", () => {
    expect(codigos(base({ tipoRegistro: 1, tipoComprobante: 101 }))).toContain("V-011");
  });

  it("pasa para comprobante ingreso a crédito (203) en INGRESOS", () => {
    expect(
      codigos(
        base({
          tipoRegistro: 3,
          tipoComprobante: 203,
          comprobanteAsociadoNumero: "001-001-0000001",
          comprobanteAsociadoTimbrado: "12345678",
        }),
      ),
    ).not.toContain("V-011");
  });

  it("falla para factura (109) en EGRESOS", () => {
    expect(codigos(base({ tipoRegistro: 4, tipoComprobante: 109 }))).toContain("V-011");
  });

  it("pasa para transferencia (211) en EGRESOS", () => {
    expect(codigos(base({ tipoRegistro: 4, tipoComprobante: 211 }))).not.toContain("V-011");
  });

  it("falla para transferencia (211) en VENTAS", () => {
    expect(codigos(base({ tipoRegistro: 1, tipoComprobante: 211 }))).toContain("V-011");
  });
});

// ── V-020 — Especificar tipo documento ───────────────────────────────────

describe("V-020 — especificarTipoDocumento para tipos 209 y 210", () => {
  it("pasa para tipo 209 (Otros egresos) con texto informado", () => {
    expect(
      codigos(
        base({
          tipoRegistro: 4,
          tipoComprobante: 209,
          especificarTipoDocumento: "Recibo honorarios",
        }),
      ),
    ).not.toContain("V-020");
  });

  it("falla para tipo 209 sin especificar documento", () => {
    expect(
      codigos(base({ tipoRegistro: 4, tipoComprobante: 209, especificarTipoDocumento: null })),
    ).toContain("V-020");
  });

  it("falla para tipo 209 con texto vacío", () => {
    expect(
      codigos(base({ tipoRegistro: 4, tipoComprobante: 209, especificarTipoDocumento: "   " })),
    ).toContain("V-020");
  });

  it("pasa para tipo 210 (Otros ingresos) con texto informado", () => {
    expect(
      codigos(
        base({ tipoRegistro: 3, tipoComprobante: 210, especificarTipoDocumento: "Alquiler" }),
      ),
    ).not.toContain("V-020");
  });

  it("falla para tipo 210 sin especificar documento", () => {
    expect(
      codigos(base({ tipoRegistro: 3, tipoComprobante: 210, especificarTipoDocumento: null })),
    ).toContain("V-020");
  });

  it("no aplica para tipo 109 (Factura)", () => {
    expect(codigos(base({ tipoComprobante: 109, especificarTipoDocumento: null }))).not.toContain(
      "V-020",
    );
  });
});

// ── V-021 — Número cuenta/tarjeta y banco ────────────────────────────────

describe("V-021 — numeroCuentaTarjeta y bancoCoop para tipos 207 y 211", () => {
  it("pasa para tipo 207 con ambos campos informados", () => {
    const errs = codigos(
      base({
        tipoRegistro: 4,
        tipoComprobante: 207,
        numeroCuentaTarjeta: "1234567890",
        bancoCoop: "Banco Continental",
      }),
    );
    expect(errs).not.toContain("V-021");
  });

  it("falla para tipo 207 sin número de cuenta", () => {
    expect(
      codigos(
        base({
          tipoRegistro: 4,
          tipoComprobante: 207,
          numeroCuentaTarjeta: null,
          bancoCoop: "Banco Continental",
        }),
      ),
    ).toContain("V-021");
  });

  it("falla para tipo 207 sin banco", () => {
    expect(
      codigos(
        base({
          tipoRegistro: 4,
          tipoComprobante: 207,
          numeroCuentaTarjeta: "1234567890",
          bancoCoop: null,
        }),
      ),
    ).toContain("V-021");
  });

  it("produce dos errores V-021 si faltan ambos campos", () => {
    const errs = validarComprobante(
      base({ tipoRegistro: 4, tipoComprobante: 207, numeroCuentaTarjeta: null, bancoCoop: null }),
    );
    expect(errs.filter((e) => e.codigo === "V-021").length).toBe(2);
  });

  it("pasa para tipo 211 con ambos campos informados", () => {
    expect(
      codigos(
        base({
          tipoRegistro: 4,
          tipoComprobante: 211,
          numeroCuentaTarjeta: "0987654321",
          bancoCoop: "Cooperativa",
        }),
      ),
    ).not.toContain("V-021");
  });

  it("falla para tipo 211 con banco vacío", () => {
    expect(
      codigos(
        base({
          tipoRegistro: 4,
          tipoComprobante: 211,
          numeroCuentaTarjeta: "0987654321",
          bancoCoop: "",
        }),
      ),
    ).toContain("V-021");
  });

  it("no aplica para tipo 109 (Factura)", () => {
    expect(
      codigos(base({ tipoComprobante: 109, numeroCuentaTarjeta: null, bancoCoop: null })),
    ).not.toContain("V-021");
  });
});

// ── V-022 — Identificador del empleador ──────────────────────────────────

describe("V-022 — identificadorEmpleador para tipo 206 (Extracto IPS)", () => {
  it("pasa para tipo 206 con identificador informado", () => {
    expect(
      codigos(
        base({
          tipoRegistro: 4,
          tipoComprobante: 206,
          fechaPeriodo: "06/2024",
          identificadorEmpleador: "123456",
        }),
      ),
    ).not.toContain("V-022");
  });

  it("falla para tipo 206 sin identificador del empleador", () => {
    expect(
      codigos(
        base({
          tipoRegistro: 4,
          tipoComprobante: 206,
          fechaPeriodo: "06/2024",
          identificadorEmpleador: null,
        }),
      ),
    ).toContain("V-022");
  });

  it("falla para tipo 206 con identificador vacío", () => {
    expect(
      codigos(
        base({
          tipoRegistro: 4,
          tipoComprobante: 206,
          fechaPeriodo: "06/2024",
          identificadorEmpleador: "  ",
        }),
      ),
    ).toContain("V-022");
  });

  it("no aplica para tipo 109 (Factura)", () => {
    expect(codigos(base({ tipoComprobante: 109, identificadorEmpleador: null }))).not.toContain(
      "V-022",
    );
  });

  it("no aplica para tipo 208 (Liquidación salario)", () => {
    expect(
      codigos(
        base({
          tipoRegistro: 3,
          tipoComprobante: 208,
          fechaPeriodo: "06/2024",
          identificadorEmpleador: null,
        }),
      ),
    ).not.toContain("V-022");
  });
});

// ── K-001 — Baja confianza ────────────────────────────────────────────────

describe("K-001 — Campo crítico baja confianza", () => {
  it("no genera error si no hay campos con baja confianza", () => {
    expect(
      codigos(base({ campos: [{ campo: "timbrado", confianza: 95, status: "OK" }] })),
    ).not.toContain("K-001");
  });

  it("genera K-001 si campo crítico tiene confianza < 70", () => {
    expect(
      codigos(base({ campos: [{ campo: "timbrado", confianza: 60, status: "OK" }] })),
    ).toContain("K-001");
  });

  it("no genera K-001 para campo no crítico con baja confianza", () => {
    expect(
      codigos(base({ campos: [{ campo: "nombre_emisor", confianza: 50, status: "OK" }] })),
    ).not.toContain("K-001");
  });
});
