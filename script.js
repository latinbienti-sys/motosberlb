document.addEventListener('DOMContentLoaded', function () {
    const C = window.Condiciones;
    const ds = window.DataSource.activo;

    let config = ds.getConfig();
    let ventas = ds.getVentas();
    const hoy = C.isoFecha(new Date());

    const $ = id => document.getElementById(id);

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }

    function dinero(n) {
        return '$' + Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function fechaCorta(iso) {
        const [y, m, d] = iso.split('-');
        return `${d}/${m}/${y}`;
    }

    function opciones(lista, valor, texto) {
        return lista.map(x => `<option value="${esc(x[valor])}">${esc(x[texto])}</option>`).join('');
    }

    function guardarConfig() { ds.saveConfig(config); }
    function guardarVentas() { ds.saveVentas(ventas); }

    // ---------- Tabs ----------
    const tabButtons = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    tabButtons.forEach(button => {
        button.addEventListener('click', function (e) {
            e.preventDefault();
            tabButtons.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            button.classList.add('active');
            const content = $(button.getAttribute('data-tab'));
            if (content) content.classList.add('active');
        });
    });

    // ---------- Ventas ----------
    function proveedorVenta() { return C.buscarProveedor(config, $('v-proveedor').value); }

    function cargarModelosVenta() {
        $('v-modelo').innerHTML = opciones(proveedorVenta().modelos, 'id', 'nombre');
        precargarPrecios();
    }

    function precargarPrecios() {
        const modelo = proveedorVenta().modelos.find(m => m.id === $('v-modelo').value);
        $('v-costo').value = modelo && modelo.costo ? modelo.costo : '';
        $('v-precio').value = modelo && modelo.precioVenta ? modelo.precioVenta : '';
    }

    function ventaEnFormulario() {
        const proveedor = proveedorVenta();
        const modelo = proveedor.modelos.find(m => m.id === $('v-modelo').value);
        const fecha = $('v-fecha').value;
        const condicion = modelo && fecha ? C.resolverCondicion(config, proveedor.id, modelo.id, fecha) : null;
        return {
            proveedorId: proveedor.id,
            proveedorNombre: proveedor.nombre,
            modeloId: modelo ? modelo.id : '',
            modeloNombre: modelo ? modelo.nombre : '',
            cliente: $('v-cliente').value.trim(),
            fecha,
            ciclo: $('v-ciclo').value,
            costo: parseFloat($('v-costo').value) || 0,
            precioVenta: parseFloat($('v-precio').value) || 0,
            condicion
        };
    }

    function tablaCronograma(filas) {
        const total = filas.reduce((s, f) => s + f.monto, 0);
        return `<table class="data-table compact"><thead><tr><th>Concepto</th><th>Fecha</th><th class="num">Monto</th></tr></thead><tbody>` +
            filas.map(f => `<tr><td>${esc(f.concepto)}</td><td>${fechaCorta(f.fecha)}</td><td class="num">${dinero(f.monto)}</td></tr>`).join('') +
            `</tbody><tfoot><tr><td colspan="2">Total</td><td class="num">${dinero(total)}</td></tr></tfoot></table>`;
    }

    function actualizarVistaPrevia() {
        const venta = ventaEnFormulario();
        const cond = venta.condicion;
        const caja = $('v-condicion');
        $('v-ciclo').disabled = !cond || !cond.financiable;

        if (!cond) {
            caja.className = 'condicion-box warn';
            caja.textContent = 'El modelo no tiene una condición vigente para esa fecha.';
            $('v-crono-cliente').innerHTML = '';
            $('v-crono-proveedor').innerHTML = '';
            return;
        }
        caja.className = `condicion-box cat${cond.categoria}`;
        caja.innerHTML = `<strong>${esc(cond.nombre)}</strong><br>` +
            (cond.financiable
                ? `Inicial ${cond.inicialPct}% + ${cond.numCuotas} cuotas ${esc(cond.frecuencia)}es`
                : 'Venta de contado / por asignación. Sin financiamiento.') +
            (cond.tieneOverride ? ' <span class="badge">condición especial del modelo</span>' : '') +
            ` · vigente desde ${fechaCorta(cond.asignacionDesde)}`;

        const cronos = C.generarCronogramas(config, venta);
        $('v-crono-cliente').innerHTML = tablaCronograma(cronos.cliente);
        $('v-crono-proveedor').innerHTML = tablaCronograma(cronos.proveedor);
    }

    function registrarVenta(e) {
        e.preventDefault();
        const venta = ventaEnFormulario();
        if (!venta.condicion) { alert('El modelo no tiene una condición vigente para esa fecha.'); return; }
        if (venta.costo <= 0 || venta.precioVenta <= 0) { alert('Indica costo y precio de venta.'); return; }
        if (!venta.condicion.financiable) venta.ciclo = '';

        const cronos = C.generarCronogramas(config, venta);
        venta.id = 'V' + Date.now();
        venta.cronogramaCliente = cronos.cliente.map(f => Object.assign({ pagado: false }, f));
        venta.cronogramaProveedor = cronos.proveedor.map(f => Object.assign({ pagado: false }, f));
        ventas.push(venta);
        guardarVentas();
        $('v-cliente').value = '';
        renderVentas();
        renderPagos();
    }

    function renderVentas() {
        const filas = ventas.slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
        $('tabla-ventas').innerHTML = filas.length ? filas.map(v => `
            <tr>
                <td>${fechaCorta(v.fecha)}</td>
                <td>${esc(v.cliente || '—')}</td>
                <td>${esc(v.modeloNombre)}</td>
                <td><span class="cat-tag cat${v.condicion.categoria}">Cat. ${v.condicion.categoria}</span> ${v.condicion.financiable ? `${v.condicion.inicialPct}% + ${v.condicion.numCuotas} cuotas` : 'Contado'}</td>
                <td>${esc(v.ciclo || '—')}</td>
                <td class="num">${dinero(v.precioVenta)}</td>
                <td class="num">${dinero(v.costo)}</td>
                <td><button class="btn-link" data-eliminar="${esc(v.id)}">Eliminar</button></td>
            </tr>`).join('') : '<tr><td colspan="8" class="muted">Sin ventas registradas.</td></tr>';
    }

    $('tabla-ventas').addEventListener('click', e => {
        const id = e.target.getAttribute('data-eliminar');
        if (!id || !confirm('¿Eliminar esta venta y su cronograma de pagos?')) return;
        ventas = ventas.filter(v => v.id !== id);
        guardarVentas();
        renderVentas();
        renderPagos();
    });

    // ---------- Pago a Proveedor ----------
    function renderPagos() {
        const filtroProv = $('p-filtro-proveedor').value;
        const filtroEstado = $('p-filtro-estado').value;
        const limite = C.isoFecha(new Date(Date.now() + 15 * 86400000));

        const todas = [];
        ventas.forEach(v => v.cronogramaProveedor.forEach((p, i) => todas.push({ venta: v, pago: p, idx: i })));
        const delProveedor = todas.filter(x => !filtroProv || x.venta.proveedorId === filtroProv);

        const total = delProveedor.reduce((s, x) => s + x.pago.monto, 0);
        const pagado = delProveedor.filter(x => x.pago.pagado).reduce((s, x) => s + x.pago.monto, 0);
        const proximos = delProveedor.filter(x => !x.pago.pagado && x.pago.fecha <= limite).reduce((s, x) => s + x.pago.monto, 0);
        $('kpi-total').textContent = dinero(total);
        $('kpi-pagado').textContent = dinero(pagado);
        $('kpi-pendiente').textContent = dinero(total - pagado);
        $('kpi-proximos').textContent = dinero(proximos);

        const filas = delProveedor
            .filter(x => filtroEstado === 'todos' || (filtroEstado === 'pagado') === x.pago.pagado)
            .sort((a, b) => a.pago.fecha.localeCompare(b.pago.fecha));

        $('tabla-pagos').innerHTML = filas.length ? filas.map(x => {
            const vencido = !x.pago.pagado && x.pago.fecha < hoy;
            return `
            <tr class="${vencido ? 'vencido' : ''}">
                <td>${fechaCorta(x.pago.fecha)}</td>
                <td>${esc(x.venta.proveedorNombre)}</td>
                <td>${esc(x.venta.modeloNombre)}</td>
                <td>${esc(x.venta.cliente || '—')}</td>
                <td>${esc(x.pago.concepto)}</td>
                <td class="num">${dinero(x.pago.monto)}</td>
                <td><label class="check"><input type="checkbox" data-venta="${esc(x.venta.id)}" data-idx="${x.idx}" ${x.pago.pagado ? 'checked' : ''}> ${x.pago.pagado ? 'Pagado' : (vencido ? 'Vencido' : 'Pendiente')}</label></td>
            </tr>`;
        }).join('') : '<tr><td colspan="7" class="muted">No hay pagos para mostrar.</td></tr>';
    }

    $('tabla-pagos').addEventListener('change', e => {
        const ventaId = e.target.getAttribute('data-venta');
        if (!ventaId) return;
        const venta = ventas.find(v => v.id === ventaId);
        venta.cronogramaProveedor[Number(e.target.getAttribute('data-idx'))].pagado = e.target.checked;
        guardarVentas();
        renderPagos();
    });

    // ---------- Condiciones ----------
    function proveedorCond() { return C.buscarProveedor(config, $('c-proveedor').value); }

    function renderCondiciones() {
        $('tabla-ciclos').innerHTML = config.ciclos.map(c =>
            `<tr><td>${esc(c.nombre)}</td><td>Días ${c.diasCliente.join(' y ')}</td><td>Días ${c.diasProveedor.join(' y ')}</td></tr>`).join('');

        const prov = proveedorCond();
        $('tabla-planes').innerHTML = prov.planes.map(p =>
            `<tr><td><span class="cat-tag cat${p.categoria}">Cat. ${p.categoria}</span> ${esc(p.nombre)}</td><td class="num">${p.inicialPct}</td><td class="num">${p.numCuotas}</td><td>${esc(p.frecuencia)}</td><td class="muted">${esc(p.nota || '')}</td></tr>`).join('');

        $('tabla-modelos').innerHTML = prov.modelos.map(m => {
            const cond = C.resolverCondicion(config, prov.id, m.id, hoy);
            return `<tr>
                <td>${esc(m.nombre)}</td>
                <td>${cond ? `<span class="cat-tag cat${cond.categoria}">Cat. ${cond.categoria}</span>` : '—'}${cond && cond.tieneOverride ? ' <span class="badge">especial</span>' : ''}</td>
                <td class="num">${cond ? cond.inicialPct : '—'}</td>
                <td class="num">${cond ? cond.numCuotas : '—'}</td>
                <td>${cond ? fechaCorta(cond.asignacionDesde) : '—'}</td>
                <td class="num"><input type="number" class="form-control input-sm" min="0" step="0.01" data-modelo="${esc(m.id)}" data-campo="costo" value="${m.costo || ''}"></td>
                <td class="num"><input type="number" class="form-control input-sm" min="0" step="0.01" data-modelo="${esc(m.id)}" data-campo="precioVenta" value="${m.precioVenta || ''}"></td>
            </tr>`;
        }).join('');

        $('a-modelo').innerHTML = opciones(prov.modelos, 'id', 'nombre');
        $('a-plan').innerHTML = opciones(prov.planes, 'id', 'nombre');

        const nombreModelo = id => (prov.modelos.find(m => m.id === id) || {}).nombre || id;
        const nombrePlan = id => {
            const p = prov.planes.find(x => x.id === id);
            return p ? `Cat. ${p.categoria}` : id;
        };
        $('tabla-historial').innerHTML = prov.asignaciones.slice()
            .sort((a, b) => b.desde.localeCompare(a.desde) || a.modelo.localeCompare(b.modelo))
            .map(a => {
                const ov = a.override || {};
                const txt = [ov.inicialPct != null ? `Inicial ${ov.inicialPct}%` : '', ov.numCuotas != null ? `${ov.numCuotas} cuotas` : ''].filter(Boolean).join(', ');
                return `<tr><td>${esc(nombreModelo(a.modelo))}</td><td>${esc(nombrePlan(a.plan))}</td><td>${fechaCorta(a.desde)}</td><td>${esc(txt || '—')}</td></tr>`;
            }).join('');
    }

    $('tabla-modelos').addEventListener('change', e => {
        const modeloId = e.target.getAttribute('data-modelo');
        if (!modeloId) return;
        const modelo = proveedorCond().modelos.find(m => m.id === modeloId);
        modelo[e.target.getAttribute('data-campo')] = parseFloat(e.target.value) || 0;
        guardarConfig();
        if ($('v-proveedor').value === $('c-proveedor').value && $('v-modelo').value === modeloId) {
            precargarPrecios();
            actualizarVistaPrevia();
        }
    });

    $('form-asignacion').addEventListener('submit', e => {
        e.preventDefault();
        const override = {};
        if ($('a-inicial').value !== '') override.inicialPct = Number($('a-inicial').value);
        if ($('a-cuotas').value !== '') override.numCuotas = Number($('a-cuotas').value);
        const prov = proveedorCond();
        const nueva = { modelo: $('a-modelo').value, plan: $('a-plan').value, desde: $('a-desde').value };
        if (Object.keys(override).length) nueva.override = override;
        // Si ya existe una asignación del mismo modelo y fecha, se reemplaza
        prov.asignaciones = prov.asignaciones.filter(a => !(a.modelo === nueva.modelo && a.desde === nueva.desde));
        prov.asignaciones.push(nueva);
        guardarConfig();
        $('a-inicial').value = '';
        $('a-cuotas').value = '';
        renderCondiciones();
        actualizarVistaPrevia();
    });

    $('btn-reset').addEventListener('click', () => {
        if (!confirm('¿Restaurar planes, asignaciones y precios a la configuración inicial? Las ventas registradas no se modifican.')) return;
        config = ds.resetConfig();
        renderCondiciones();
        cargarModelosVenta();
        actualizarVistaPrevia();
    });

    // ---------- Inicialización ----------
    const opcionesProveedores = opciones(config.proveedores, 'id', 'nombre');
    $('v-proveedor').innerHTML = opcionesProveedores;
    $('c-proveedor').innerHTML = opcionesProveedores;
    $('p-filtro-proveedor').innerHTML = '<option value="">Todos los proveedores</option>' + opcionesProveedores;
    $('v-ciclo').innerHTML = config.ciclos.map(c => `<option value="${esc(c.id)}">${esc(c.nombre)} (días ${c.diasCliente.join(' y ')})</option>`).join('');
    $('v-fecha').value = hoy;
    $('a-desde').value = hoy;

    $('v-proveedor').addEventListener('change', () => { cargarModelosVenta(); actualizarVistaPrevia(); });
    $('v-modelo').addEventListener('change', () => { precargarPrecios(); actualizarVistaPrevia(); });
    ['v-fecha', 'v-ciclo', 'v-costo', 'v-precio'].forEach(id => $(id).addEventListener('input', actualizarVistaPrevia));
    $('form-venta').addEventListener('submit', registrarVenta);
    $('c-proveedor').addEventListener('change', renderCondiciones);
    $('p-filtro-proveedor').addEventListener('change', renderPagos);
    $('p-filtro-estado').addEventListener('change', renderPagos);

    cargarModelosVenta();
    actualizarVistaPrevia();
    renderVentas();
    renderPagos();
    renderCondiciones();
});
