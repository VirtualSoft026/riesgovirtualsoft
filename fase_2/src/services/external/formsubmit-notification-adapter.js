const FORM_SUBMIT_CC =
    'sara.santamaria@virtualsoft.tech,oriana.borja@virtualsoft.tech';

/**
 * Creates a copy of FormData and appends the configured carbon-copy address.
 *
 * The original FormData instance is not mutated.
 *
 * @param {FormData} formData
 * @param {string} [carbonCopy=FORM_SUBMIT_CC]
 * @returns {FormData}
 */
export function appendFormSubmitCc(
    formData,
    carbonCopy = FORM_SUBMIT_CC
) {
    if (!(formData instanceof FormData)) {
        throw new TypeError('formData must be an instance of FormData');
    }

    const result = new FormData();

    for (const [key, value] of formData.entries()) {
        result.append(key, value);
    }

    result.append('_cc', carbonCopy);

    return result;
}
