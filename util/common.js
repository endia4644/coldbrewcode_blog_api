export function isEmpty(value){
    // 1. null이나 undefined인 경우
    if (value === null || value === undefined) return true;

    // 2. 문자열이나 배열인 경우 (length 확인)
    if (typeof value === 'string' || Array.isArray(value)) {
        return value.length === 0;
    }

    // 3. 객체인 경우 (키의 개수 확인)
    if (typeof value === 'object') {
        return Object.keys(value).length === 0;
    }

    return false;
}