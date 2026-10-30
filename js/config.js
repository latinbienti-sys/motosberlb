/*
 * Configuración base de proveedores, ciclos, planes y asignaciones.
 * Fase 1: datos locales. Más adelante esta estructura se alimenta desde Odoo
 * (ver js/datasource.js); los nombres de campos están pensados para mapearse 1:1.
 *
 * Reglas clave:
 *  - Un PLAN define la condición (inicial %, número de cuotas, frecuencia).
 *  - Una ASIGNACIÓN liga un modelo a un plan desde una fecha (vigencia) y puede
 *    sobreescribir campos del plan (override). Para cambiar la condición de un
 *    modelo se agrega una nueva asignación; el historial se conserva.
 *  - Cada venta guarda una FOTO de la condición vigente al momento de la venta,
 *    por lo que cambios futuros no alteran ventas ya registradas.
 */
window.DEFAULT_CONFIG = {
    version: 1,

    // Ciclo que elige el cliente -> días en que se paga al proveedor
    ciclos: [
        { id: 'A', nombre: 'Ciclo A', diasCliente: [3, 18], diasProveedor: [5, 20] },
        { id: 'B', nombre: 'Ciclo B', diasCliente: [10, 25], diasProveedor: [12, 27] }
    ],

    proveedores: [
        {
            id: 'MLA',
            nombre: 'MULTISERVICIOS LAS AMERICAS C.A',
            marca: 'Bera',
            odooPartnerId: null,

            planes: [
                {
                    id: 'MLA-C1',
                    categoria: 1,
                    nombre: 'Categoría 1 – Alta Rotación / "Lomito" (100% Contado)',
                    financiable: false,
                    inicialPct: 100,
                    numCuotas: 0,
                    frecuencia: 'quincenal',
                    nota: 'Solo contado / por asignación. Se paga 100% al proveedor de inmediato.'
                },
                {
                    id: 'MLA-C2',
                    categoria: 2,
                    nombre: 'Categoría 2 – Financiamiento a 60 Días',
                    financiable: true,
                    inicialPct: 30,
                    numCuotas: 4,
                    frecuencia: 'quincenal',
                    nota: '30% inicial + saldo en 4 cuotas quincenales.'
                },
                {
                    id: 'MLA-C3',
                    categoria: 3,
                    nombre: 'Categoría 3 – Financiamiento a 4 Meses (Prueba Limitada)',
                    financiable: true,
                    inicialPct: 30,
                    numCuotas: 8,
                    frecuencia: 'quincenal',
                    nota: '30% inicial + saldo en 8 cuotas quincenales.'
                }
            ],

            // costo = valor de la moto que se paga al proveedor; precioVenta = al cliente.
            // Se dejan en 0 hasta que lleguen desde Odoo (se pueden editar en Condiciones).
            modelos: [
                { id: 'SOCIALISTA', nombre: 'Socialista', costo: 0, precioVenta: 0 },
                { id: 'BWS',        nombre: 'BWS',        costo: 0, precioVenta: 0 },
                { id: 'KAVAK',      nombre: 'Kavak',      costo: 0, precioVenta: 0 },
                { id: 'DT250',      nombre: 'DT 250',     costo: 0, precioVenta: 0 },
                { id: 'GR250',      nombre: 'GR 250',     costo: 0, precioVenta: 0 },
                { id: 'LEON',       nombre: 'León',       costo: 0, precioVenta: 0 },
                { id: 'BR200',      nombre: 'BR200',      costo: 0, precioVenta: 0 },
                { id: 'BRZ',        nombre: 'BRZ',        costo: 0, precioVenta: 0 },
                { id: 'BRX',        nombre: 'BRX',        costo: 0, precioVenta: 0 },
                { id: 'X1',         nombre: 'X1',         costo: 0, precioVenta: 0 },
                { id: 'MILAN',      nombre: 'Milan',      costo: 0, precioVenta: 0 },
                { id: 'RUNNER',     nombre: 'Runner',     costo: 0, precioVenta: 0 },
                { id: 'COBRA',      nombre: 'Cobra',      costo: 0, precioVenta: 0 },
                { id: 'SBR',        nombre: 'SBR ("Caballito de hierro")', costo: 0, precioVenta: 0 },
                { id: 'BRF',        nombre: 'BRF',        costo: 0, precioVenta: 0 }
            ],

            // override opcional: { inicialPct, numCuotas } solo para ese modelo
            asignaciones: [
                { modelo: 'SOCIALISTA', plan: 'MLA-C1', desde: '2026-10-01' },
                { modelo: 'BWS',        plan: 'MLA-C1', desde: '2026-10-01' },
                { modelo: 'KAVAK',      plan: 'MLA-C1', desde: '2026-10-01' },
                { modelo: 'DT250',      plan: 'MLA-C1', desde: '2026-10-01' },
                { modelo: 'GR250',      plan: 'MLA-C1', desde: '2026-10-01' },
                { modelo: 'LEON',       plan: 'MLA-C2', desde: '2026-10-01' },
                { modelo: 'BR200',      plan: 'MLA-C2', desde: '2026-10-01' },
                { modelo: 'BRZ',        plan: 'MLA-C2', desde: '2026-10-01' },
                { modelo: 'BRX',        plan: 'MLA-C2', desde: '2026-10-01' },
                { modelo: 'X1',         plan: 'MLA-C3', desde: '2026-10-01' },
                { modelo: 'MILAN',      plan: 'MLA-C3', desde: '2026-10-01' },
                { modelo: 'RUNNER',     plan: 'MLA-C3', desde: '2026-10-01' },
                { modelo: 'COBRA',      plan: 'MLA-C3', desde: '2026-10-01' },
                { modelo: 'SBR',        plan: 'MLA-C3', desde: '2026-10-01' },
                { modelo: 'BRF',        plan: 'MLA-C3', desde: '2026-10-01' }
            ]
        }
    ]
};
