/**
 * Repositorio de novedades e incidentes sobre Firebase Realtime Database (nodo `logs`;
 * app.js 8744-8756 y 8764-8774). La base se INYECTA.
 *
 * Reglas (`database.rules.json`, solo lectura): `logs` lo leen solo Admin y Supervisor, así que la
 * suscripción de un Gestor es rechazada por la base (queda cancelada sin reintento); crear una entrada
 * exige usuario aprobado, nodo nuevo y `uid === auth.uid`.
 *
 * @param {{database: {ref: (path: string) => any}}} deps
 */

import { INCIDENTS_LIMIT, snapshotToIncidents } from '../../domain/incidents/incident-service.js';

export function createIncidentRepository({ database }) {
    return {
        /** Crea la novedad con clave nueva (`push` + `set`). Devuelve la clave. */
        async create(payload) {
            const newLogRef = database.ref('logs').push();
            await newLogRef.set(payload);

            return newLogRef.key;
        },

        /**
         * Suscripción en vivo a las últimas 50 novedades (más reciente primero).
         *
         * @param {(incidents: Array<object>) => void} onChange
         * @param {(error: unknown) => void} [onError] opcional; `app.js` hoy no pasa ninguno
         * @returns {() => void} función para cancelar
         */
        subscribeRecent(onChange, onError) {
            const query = database.ref('logs').orderByChild('timestamp').limitToLast(INCIDENTS_LIMIT);
            const handler = (snapshot) => onChange(snapshotToIncidents(snapshot));

            if (onError) {
                query.on('value', handler, onError);
            } else {
                query.on('value', handler);
            }

            return () => {
                if (typeof query.off === 'function') query.off('value', handler);
            };
        }
    };
}
