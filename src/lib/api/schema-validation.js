import { BadRequestError } from './error-handler.js';

/**
 * Simple schema validation system without external dependencies
 */
export class ValidationSchema {
  constructor(fields = {}) {
    this.fields = fields;
  }

  validate(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new BadRequestError('Request body must be a JSON object');
    }

    const errors = [];
    const validated = {};

    // Check for unknown fields
    const allowedFields = Object.keys(this.fields);
    const providedFields = Object.keys(data);
    const unknownFields = providedFields.filter(f => !allowedFields.includes(f));

    if (unknownFields.length > 0) {
      unknownFields.forEach(field => {
        errors.push({ field, message: 'Unexpected field' });
      });
    }

    // Validate each field
    for (const [fieldName, fieldSpec] of Object.entries(this.fields)) {
      const value = data[fieldName];

      try {
        validated[fieldName] = fieldSpec.validate(value);
      } catch (err) {
        errors.push({
          field: fieldName,
          message: err.message || 'Validation failed',
        });
      }
    }

    if (errors.length > 0) {
      throw new BadRequestError('Validation failed', errors);
    }

    return validated;
  }
}

/**
 * Field type validators
 */
export const fieldTypes = {
  string: (options = {}) => ({
    minLength: options.minLength || 0,
    maxLength: options.maxLength || 10000,
    pattern: options.pattern || null,
    nullable: options.nullable || false,
    trim: options.trim !== false,
    validate(value) {
      if (value === null || value === undefined) {
        if (this.nullable) return null;
        throw new Error('Required field');
      }

      if (typeof value !== 'string') {
        throw new Error('Must be a string');
      }

      let str = this.trim ? value.trim() : value;

      if (str.length < this.minLength) {
        throw new Error(`Must be at least ${this.minLength} characters`);
      }

      if (str.length > this.maxLength) {
        throw new Error(`Must be at most ${this.maxLength} characters`);
      }

      if (this.pattern && !this.pattern.test(str)) {
        throw new Error('Invalid format');
      }

      return str;
    },
  }),

  email: () => ({
    validate(value) {
      if (!value) throw new Error('Email is required');
      if (typeof value !== 'string') throw new Error('Email must be a string');

      const email = value.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }

      return email;
    },
  }),

  number: (options = {}) => ({
    min: options.min ?? -Infinity,
    max: options.max ?? Infinity,
    integer: options.integer || false,
    nonNegative: options.nonNegative || false,
    validate(value) {
      if (value === null || value === undefined) {
        if (options.nullable) return null;
        throw new Error('Required field');
      }

      const num = Number(value);
      if (Number.isNaN(num)) {
        throw new Error('Must be a number');
      }

      if (this.integer && !Number.isInteger(num)) {
        throw new Error('Must be an integer');
      }

      if (this.nonNegative && num < 0) {
        throw new Error('Must be non-negative');
      }

      if (num < this.min) {
        throw new Error(`Must be at least ${this.min}`);
      }

      if (num > this.max) {
        throw new Error(`Must be at most ${this.max}`);
      }

      return num;
    },
  }),

  boolean: () => ({
    validate(value) {
      if (value === null || value === undefined) {
        throw new Error('Required field');
      }

      if (typeof value !== 'boolean') {
        throw new Error('Must be a boolean');
      }

      return value;
    },
  }),

  array: (itemValidator, options = {}) => ({
    maxLength: options.maxLength || 1000,
    nullable: options.nullable || false,
    validate(value) {
      if (value === null || value === undefined) {
        if (this.nullable) return null;
        throw new Error('Required field');
      }

      if (!Array.isArray(value)) {
        throw new Error('Must be an array');
      }

      if (value.length > this.maxLength) {
        throw new Error(`Array must have at most ${this.maxLength} items`);
      }

      return value.map((item, idx) => {
        try {
          return itemValidator.validate(item);
        } catch (err) {
          throw new Error(`Item ${idx}: ${err.message}`);
        }
      });
    },
  }),

  enum: (allowedValues = []) => ({
    validate(value) {
      if (value === null || value === undefined) {
        throw new Error('Required field');
      }

      if (!allowedValues.includes(value)) {
        throw new Error(`Must be one of: ${allowedValues.join(', ')}`);
      }

      return value;
    },
  }),

  object: (schema) => ({
    validate(value) {
      if (!value || typeof value !== 'object') {
        throw new Error('Must be an object');
      }

      return schema.validate(value);
    },
  }),
};

/**
 * Helpful presets for common field patterns
 */
export const commonFields = {
  displayName: () => fieldTypes.string({ minLength: 1, maxLength: 120 }),
  email: () => fieldTypes.email(),
  password: () => fieldTypes.string({ minLength: 6, maxLength: 128 }),
  uid: () => fieldTypes.string({ minLength: 20, maxLength: 128 }),
  phoneNumber: () => fieldTypes.string({ minLength: 6, maxLength: 20 }),
  bio: () => fieldTypes.string({ maxLength: 500, nullable: true }),
  photoURL: () => fieldTypes.string({ minLength: 1, nullable: true }),
  url: () => fieldTypes.string({
    pattern: /^https?:\/\/[^\s]+$/,
    maxLength: 2048,
  }),
  slug: () => fieldTypes.string({
    minLength: 1,
    maxLength: 255,
    pattern: /^[a-z0-9-]+$/,
  }),
};
