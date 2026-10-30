/*
 * Motor de condiciones de pago. Funciones puras, sin DOM ni almacenamiento,
 * para poder reutilizarlas igual cuando los datos vengan de Odoo.
 */
window.Condiciones = (function () {

    function parseFecha(iso) {
        const [y, m, d] = iso.split('-').map(Number);
        return new Date(y, m - 1, d);
    }

    function isoFecha(date) {
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${date.getFullYear()}-${m}-${d}`;
    }

    function redondear(n) {
        return Math.round(n * 100) / 100;
    }

    // Divide un monto en n cuotas; la última absorbe la diferencia de centavos
    function dividir(total, n) {
        if (n <= 0) return [];
        const base = Math.floor((total * 100) / n) / 100;
        const cuotas = Array(n).fill(base);
        cuotas[n - 1] = redondear(total - base * (n - 1));
        return cuotas;
    }

    // Próximas n fechas (estrictamente después de fechaBase) que caen en los días del ciclo.
    // Devuelve también el índice del día dentro del ciclo para mapearlo al día de proveedor.
    function proximasFechas(fechaBase, dias, n) {
        const base = parseFecha(fechaBase);
        const res = [];
        let y = base.getFullYear();
        let m = base.getMonth();
        while (res.length < n) {
            dias.forEach((dia, idx) => {
                const f = new Date(y, m, dia);
                if (f > base && res.length < n) res.push({ fecha: f, idx });
            });
            m++;
            if (m > 11) { m = 0; y++; }
        }
        return res;
    }

    function buscarProveedor(config, proveedorId) {
        return config.proveedores.find(p => p.id === proveedorId);
    }

    function buscarCiclo(config, cicloId) {
        return config.ciclos.find(c => c.id === cicloId);
    }

    // Asignación vigente de un modelo a una fecha: la de "desde" más reciente <= fecha
    function asignacionVigente(proveedor, modeloId, fecha) {
        return proveedor.asignaciones
            .filter(a => a.modelo === modeloId && a.desde <= fecha && (!a.hasta || a.hasta >= fecha))
            .sort((a, b) => b.desde.localeCompare(a.desde))[0] || null;
    }

    // Condición efectiva (plan + override) de un modelo en una fecha
    function resolverCondicion(config, proveedorId, modeloId, fecha) {
        const proveedor = buscarProveedor(config, proveedorId);
        if (!proveedor) return null;
        const asignacion = asignacionVigente(proveedor, modeloId, fecha);
        if (!asignacion) return null;
        const plan = proveedor.planes.find(p => p.id === asignacion.plan);
        if (!plan) return null;
        const efectiva = Object.assign({}, plan, asignacion.override || {});
        efectiva.financiable = efectiva.numCuotas > 0 && efectiva.inicialPct < 100;
        efectiva.planId = plan.id;
        efectiva.asignacionDesde = asignacion.desde;
        efectiva.tieneOverride = !!(asignacion.override && Object.keys(asignacion.override).length);
        return efectiva;
    }

    /*
     * Genera los dos cronogramas de una venta:
     *  - cliente: inicial en la fecha de venta + cuotas en los días del ciclo del cliente
     *  - proveedor: inicial pagado de inmediato + cuotas en los días de proveedor del mismo ciclo
     *    (cliente día 3 -> proveedor día 5 del mismo mes, 18 -> 20, 10 -> 12, 25 -> 27)
     */
    function generarCronogramas(config, venta) {
        const cond = venta.condicion;
        const ciclo = buscarCiclo(config, venta.ciclo);
        const pct = cond.inicialPct / 100;
        const n = cond.financiable ? cond.numCuotas : 0;

        const inicialCliente = redondear(venta.precioVenta * pct);
        const inicialProveedor = redondear(venta.costo * pct);
        const cuotasCliente = dividir(redondear(venta.precioVenta - inicialCliente), n);
        const cuotasProveedor = dividir(redondear(venta.costo - inicialProveedor), n);

        const cliente = [{ nro: 0, concepto: cond.financiable ? `Inicial ${cond.inicialPct}%` : 'Contado 100%', fecha: venta.fecha, monto: inicialCliente }];
        const proveedor = [{ nro: 0, concepto: cond.financiable ? `Inicial ${cond.inicialPct}%` : 'Pago 100%', fecha: venta.fecha, monto: inicialProveedor }];

        if (n > 0 && ciclo) {
            proximasFechas(venta.fecha, ciclo.diasCliente, n).forEach((f, i) => {
                const fechaProv = new Date(f.fecha.getFullYear(), f.fecha.getMonth(), ciclo.diasProveedor[f.idx]);
                cliente.push({ nro: i + 1, concepto: `Cuota ${i + 1}/${n}`, fecha: isoFecha(f.fecha), monto: cuotasCliente[i] });
                proveedor.push({ nro: i + 1, concepto: `Cuota ${i + 1}/${n}`, fecha: isoFecha(fechaProv), monto: cuotasProveedor[i] });
            });
        }
        return { cliente, proveedor };
    }

    return { parseFecha, isoFecha, redondear, dividir, proximasFechas, buscarProveedor, buscarCiclo, asignacionVigente, resolverCondicion, generarCronogramas };
})();
