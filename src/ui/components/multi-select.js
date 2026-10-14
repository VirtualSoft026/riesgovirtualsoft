const MULTISELECT_REGISTRY = new Map();
let outsideClickListenerRegistered = false;

/**
 * Closes every registered multi-select except the optional excluded container.
 *
 * @param {HTMLElement|null} excludedContainer
 * @returns {void}
 */
function closeOpenMultiSelects(excludedContainer = null) {
    for (const entry of MULTISELECT_REGISTRY.values()) {
        if (entry.container !== excludedContainer) {
            entry.container.classList.remove('open');

            const parentPanel =
                entry.container.closest('.glass-panel');

            if (parentPanel) {
                parentPanel.style.zIndex =
                    parentPanel.dataset.origZIndex || '';
            }
        }
    }
}

/**
 * Registers the global click listener used to close selectors when the user
 * clicks outside an active multi-select.
 *
 * @returns {void}
 */
function registerOutsideClickListener() {
    if (
        outsideClickListenerRegistered ||
        typeof document === 'undefined'
    ) {
        return;
    }

    document.addEventListener('click', (event) => {
        for (const entry of MULTISELECT_REGISTRY.values()) {
            if (!entry.container.contains(event.target)) {
                entry.container.classList.remove('open');

                const parentPanel =
                    entry.container.closest('.glass-panel');

                if (parentPanel) {
                    parentPanel.style.zIndex =
                        parentPanel.dataset.origZIndex || '';
                }
            }
        }
    });

    outsideClickListenerRegistered = true;
}

/**
 * Updates the visible label according to the selected values.
 *
 * @param {HTMLElement} labelElement
 * @param {Set<string>} selectedValues
 * @param {string[]} optionsList
 * @returns {void}
 */
function updateLabel(
    labelElement,
    selectedValues,
    optionsList
) {
    if (
        selectedValues.size === 0 ||
        selectedValues.size === optionsList.length
    ) {
        labelElement.textContent = 'Todos los gestores';
        return;
    }

    if (selectedValues.size === 1) {
        labelElement.textContent =
            Array.from(selectedValues)[0];
        return;
    }

    labelElement.textContent =
        `${selectedValues.size} gestores seleccionados`;
}

/**
 * Renders the available options using the current filter.
 *
 * @param {HTMLElement} optionsListElement
 * @param {string[]} optionsList
 * @param {Set<string>} selectedValues
 * @param {string} filter
 * @param {(values: string[]) => void} notifyChange
 * @returns {void}
 */
function renderOptions(
    optionsListElement,
    optionsList,
    selectedValues,
    filter,
    notifyChange
) {
    optionsListElement.innerHTML = '';

    const cleanFilter = String(filter || '')
        .toLowerCase()
        .trim();

    optionsList.forEach((optionValue) => {
        if (
            cleanFilter &&
            !optionValue.toLowerCase().includes(cleanFilter)
        ) {
            return;
        }

        const item = document.createElement('label');
        item.className = 'custom-multiselect-option';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = optionValue;
        checkbox.checked = selectedValues.has(optionValue);

        checkbox.addEventListener('change', (event) => {
            if (event.target.checked) {
                selectedValues.add(optionValue);
            } else {
                selectedValues.delete(optionValue);
            }

            notifyChange();
        });

        const label = document.createElement('span');
        label.textContent = optionValue;

        item.appendChild(checkbox);
        item.appendChild(label);
        optionsListElement.appendChild(item);
    });
}

/**
 * Creates and registers a multi-select control.
 *
 * @param {string} containerId
 * @param {string[]} optionsList
 * @param {(values: string[]) => void} [onChangeCallback]
 * @returns {{
 *   getValues: () => string[],
 *   reset: () => void,
 *   setValues: (values: string[]) => void
 * }}
 */
export function setupCustomMultiSelect(
    containerId,
    optionsList,
    onChangeCallback
) {
    const container = document.getElementById(containerId);

    if (!container) {
        return {
            getValues: () => [],
            reset: () => {},
            setValues: () => {}
        };
    }

    const normalizedOptions = Array.isArray(optionsList)
        ? [...optionsList]
        : [];

    const selectedValues = new Set();

    container.innerHTML = `
        <div class="custom-multiselect-btn" tabindex="0">
            <span class="multiselect-label">
                Todos los gestores
            </span>
            <i class="bx bx-chevron-down"></i>
        </div>
        <div class="custom-multiselect-dropdown">
            <div class="custom-multiselect-actions">
                <button
                    type="button"
                    class="btn-select-all"
                >
                    Seleccionar Todos
                </button>
                <button
                    type="button"
                    class="btn-clear-all"
                >
                    Desmarcar Todos
                </button>
            </div>
            <div
                style="padding: 4px 6px; margin-bottom: 6px;"
            >
                <input
                    type="text"
                    id="${containerId}-search"
                    name="${containerId}-search"
                    aria-label="Buscar gestor"
                    placeholder="Buscar gestor..."
                    class="multiselect-search-input modern-input"
                    style="width: 100%; height: 32px; font-size: 12px; padding: 4px 10px; background: rgba(255,255,255,0.05); border-radius: 8px;"
                >
            </div>
            <div class="multiselect-options-list"></div>
        </div>
    `;

    const trigger = container.querySelector(
        '.custom-multiselect-btn'
    );

    const labelElement = container.querySelector(
        '.multiselect-label'
    );

    const optionsListElement = container.querySelector(
        '.multiselect-options-list'
    );

    const searchInput = container.querySelector(
        '.multiselect-search-input'
    );

    const selectAllButton = container.querySelector(
        '.btn-select-all'
    );

    const clearAllButton = container.querySelector(
        '.btn-clear-all'
    );

    const notifyChange = () => {
        updateLabel(
            labelElement,
            selectedValues,
            normalizedOptions
        );

        renderOptions(
            optionsListElement,
            normalizedOptions,
            selectedValues,
            searchInput ? searchInput.value : '',
            notifyChange
        );

        if (typeof onChangeCallback === 'function') {
            onChangeCallback(Array.from(selectedValues));
        }
    };

    const getValues = () =>
        Array.from(selectedValues);

    const reset = () => {
        selectedValues.clear();

        updateLabel(
            labelElement,
            selectedValues,
            normalizedOptions
        );

        renderOptions(
            optionsListElement,
            normalizedOptions,
            selectedValues,
            searchInput ? searchInput.value : '',
            notifyChange
        );
    };

    const setValues = (values) => {
        selectedValues.clear();

        if (Array.isArray(values)) {
            const allowedValues = new Set(normalizedOptions);

            values.forEach((value) => {
                if (allowedValues.has(value)) {
                    selectedValues.add(value);
                }
            });
        }

        updateLabel(
            labelElement,
            selectedValues,
            normalizedOptions
        );

        renderOptions(
            optionsListElement,
            normalizedOptions,
            selectedValues,
            searchInput ? searchInput.value : '',
            notifyChange
        );
    };

    const entry = {
        container,
        getValues,
        reset,
        setValues
    };

    MULTISELECT_REGISTRY.set(containerId, entry);
    registerOutsideClickListener();

    renderOptions(
        optionsListElement,
        normalizedOptions,
        selectedValues,
        '',
        notifyChange
    );

    updateLabel(
        labelElement,
        selectedValues,
        normalizedOptions
    );

    trigger.addEventListener('click', (event) => {
        event.stopPropagation();

        const isOpen =
            container.classList.contains('open');

        closeOpenMultiSelects(container);

        if (isOpen) {
            return;
        }

        container.classList.add('open');

        const parentPanel =
            container.closest('.glass-panel');

        if (parentPanel) {
            if (
                parentPanel.dataset.origZIndex ===
                undefined
            ) {
                parentPanel.dataset.origZIndex =
                    parentPanel.style.zIndex || '';
            }

            parentPanel.style.zIndex = '99999';
        }

        if (searchInput) {
            searchInput.focus();
        }
    });

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderOptions(
                optionsListElement,
                normalizedOptions,
                selectedValues,
                searchInput.value,
                notifyChange
            );
        });

        searchInput.addEventListener('click', (event) => {
            event.stopPropagation();
        });
    }

    selectAllButton.addEventListener('click', (event) => {
        event.stopPropagation();

        normalizedOptions.forEach((optionValue) => {
            selectedValues.add(optionValue);
        });

        notifyChange();
    });

    clearAllButton.addEventListener('click', (event) => {
        event.stopPropagation();

        selectedValues.clear();
        notifyChange();
    });

    return {
        getValues,
        reset,
        setValues
    };
}

/**
 * Returns the selected values of a registered multi-select.
 *
 * @param {string} containerId
 * @returns {string[]}
 */
export function getSelectedMultiSelectValues(containerId) {
    const entry = MULTISELECT_REGISTRY.get(containerId);

    if (!entry) {
        return [];
    }

    return entry.getValues();
}

/**
 * Resets a registered multi-select.
 *
 * @param {string} containerId
 * @returns {void}
 */
export function resetCustomMultiSelect(containerId) {
    const entry = MULTISELECT_REGISTRY.get(containerId);

    if (entry) {
        entry.reset();
    }
}

/**
 * Sets the selected values of a registered multi-select.
 *
 * @param {string} containerId
 * @param {string[]} newValuesArray
 * @returns {void}
 */
export function setCustomMultiSelectValues(
    containerId,
    newValuesArray
) {
    const entry = MULTISELECT_REGISTRY.get(containerId);

    if (entry) {
        entry.setValues(newValuesArray);
    }
}
