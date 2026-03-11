export const normalizeFundName = (name) => {
    if (!name) return '';
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

export const getMatchingFundKey = (navObject, searchKey) => {
    if (!navObject || !searchKey) return searchKey;
    if (navObject[searchKey] !== undefined) return searchKey;

    const normalizedSearch = normalizeFundName(searchKey);
    for (const key of Object.keys(navObject)) {
        if (normalizeFundName(key) === normalizedSearch) {
            return key;
        }
    }
    return searchKey;
};
