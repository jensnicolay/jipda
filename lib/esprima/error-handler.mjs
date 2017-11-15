/* tslint:disable:max-classes-per-file */
export class ErrorHandler {
    constructor() {
        this.errors = [];
        this.tolerant = false;
    }
    recordError(error) {
        this.errors.push(error);
    }
    tolerate(error) {
        if (this.tolerant) {
            this.recordError(error);
        }
        else {
            throw error;
        }
    }
    constructError(msg, column) {
        let error = new Error(msg);
        try {
            throw error;
        }
        catch (base) {
            /* istanbul ignore else */
            if (Object.create && Object.defineProperty) {
                error = Object.create(base);
                Object.defineProperty(error, 'column', { value: column });
            }
        }
        /* istanbul ignore next */
        return error;
    }
    createError(index, line, col, description) {
        const msg = 'Line ' + line + ': ' + description;
        const error = this.constructError(msg, col);
        error.index = index;
        error.lineNumber = line;
        error.description = description;
        return error;
    }
    throwError(index, line, col, description) {
        throw this.createError(index, line, col, description);
    }
    tolerateError(index, line, col, description) {
        const error = this.createError(index, line, col, description);
        if (this.tolerant) {
            this.recordError(error);
        }
        else {
            throw error;
        }
    }
}
