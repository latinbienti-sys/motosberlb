/*
 * Capa de datos. Hoy guarda en el navegador (localStorage); cuando conectemos Odoo
 * se implementa OdooSource con la misma interfaz y se cambia DataSource.activo.
 */
window.DataSource = (function () {
    const KEY_CONFIG = 'motosberlb.config';
    const KEY_VENTAS = 'motosberlb.ventas';

    function leer(key, defecto) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : defecto;
        } catch (e) {
            return defecto;
        }
    }

    function escribir(key, valor) {
        try {
            localStorage.setItem(key, JSON.stringify(valor));
        } catch (e) {
            console.warn('No se pudo guardar en el navegador', e);
        }
    }

    const LocalSource = {
        getConfig() {
            const guardada = leer(KEY_CONFIG, null);
            if (guardada && guardada.version === window.DEFAULT_CONFIG.version) return guardada;
            return JSON.parse(JSON.stringify(window.DEFAULT_CONFIG));
        },
        saveConfig(config) { escribir(KEY_CONFIG, config); },
        resetConfig() {
            try { localStorage.removeItem(KEY_CONFIG); } catch (e) {}
            return this.getConfig();
        },
        getVentas() { return leer(KEY_VENTAS, []); },
        saveVentas(ventas) { escribir(KEY_VENTAS, ventas); }
    };

    // Pendiente: leer productos/precios (product.product), partners y facturas desde Odoo
    const OdooSource = {
        getConfig() { throw new Error('Integración Odoo pendiente'); },
        saveConfig() { throw new Error('Integración Odoo pendiente'); },
        resetConfig() { throw new Error('Integración Odoo pendiente'); },
        getVentas() { throw new Error('Integración Odoo pendiente'); },
        saveVentas() { throw new Error('Integración Odoo pendiente'); }
    };

    return { activo: LocalSource, LocalSource, OdooSource };
})();
