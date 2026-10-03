/**
 * Effective withdrawal approval time in minutes (SLA adjusted by shift).
 * Calculation start = MAX(creation time, manager shift start);
 * result = approval time - calculation start, rounded to 2 decimals and
 * never negative. Invalid inputs yield 0.
 *
 * @param {string|number|Date} creacionTime
 * @param {string|number|Date|null} aprobacionTime
 * @param {string|number|Date|null} [inicioTurnoTime]
 * @returns {number}
 */
export function calculateEffectiveApprovalTime(creacionTime, aprobacionTime, inicioTurnoTime) {
    if (!aprobacionTime) {
        return 0;
    }

    const creacionMs = new Date(creacionTime).getTime();
    const aprobacionMs = new Date(aprobacionTime).getTime();
    let inicioTurnoMs = inicioTurnoTime ? new Date(inicioTurnoTime).getTime() : 0;

    if (isNaN(creacionMs) || isNaN(aprobacionMs)) {
        return 0;
    }

    if (isNaN(inicioTurnoMs)) {
        inicioTurnoMs = 0;
    }

    const horaInicioCalculoMs = Math.max(creacionMs, inicioTurnoMs);
    const diffMins = (aprobacionMs - horaInicioCalculoMs) / 60000;

    return Math.max(0, Math.round(diffMins * 100) / 100);
}
