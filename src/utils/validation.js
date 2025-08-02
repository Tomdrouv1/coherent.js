// src/utils/validation.js
import { CoherentTypes, COHERENT_MARKER } from '../types/constants.js';

export const Validation = {
    validateCoherentObject,
    validateComponent,
    validateProps
};

function validateCoherentObject(obj, context = 'render') {
    if (!obj || typeof obj !== 'object') {
        throw new Error(`${context}: Expected object, received ${typeof obj}`);
    }

    if (!obj[COHERENT_MARKER]) {
        throw new Error(`${context}: Object is not a valid Coherent object`);
    }

    if (!Object.values(CoherentTypes).includes(obj.type)) {
        throw new Error(`${context}: Invalid Coherent object type: ${obj.type}`);
    }

    return true;
}

function validateComponent(componentFunction) {
    if (typeof componentFunction !== 'function') {
        throw new Error('Component must be a function');
    }

    return true;
}

function validateProps(props) {
    if (props && typeof props !== 'object') {
        throw new Error('Props must be an object');
    }

    return true;
}
