/**
 * Copia a supervisión de los correos de FormSubmit (permisos y cierre de turno).
 *
 * W-40: única declaración de la dirección de copia (app.js l. 3 la repetía).
 */
export const FORM_SUBMIT_CC =
    'sara.santamaria@virtualsoft.tech,oriana.borja@virtualsoft.tech';

/**
 * Agrega la copia (`_cc`) al MISMO `FormData` y lo devuelve (W-13, NOTA_3).
 *
 * Contrato de app.js (l. 5-7): muta el formulario recibido, así que sirve a los llamadores que ignoran el valor
 * devuelto y a los que lo usan. Es idempotente: si el formulario ya tiene esa copia, no la repite.
 *
 * @param {FormData} formData
 * @param {string} [carbonCopy=FORM_SUBMIT_CC]
 * @returns {FormData} el mismo objeto recibido
 */
export function appendFormSubmitCc(
    formData,
    carbonCopy = FORM_SUBMIT_CC
) {
    if (!(formData instanceof FormData)) {
        throw new TypeError('formData must be an instance of FormData');
    }

    if (!formData.getAll('_cc').includes(carbonCopy)) {
        formData.append('_cc', carbonCopy);
    }

    return formData;
}
