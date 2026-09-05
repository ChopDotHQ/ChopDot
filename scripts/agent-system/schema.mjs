import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalJson } from './core.mjs';

const SCRIPT_ROOT = path.dirname(fileURLToPath(import.meta.url));
export const REPOSITORY_ROOT = path.resolve(SCRIPT_ROOT, '..', '..');
export const GOVERNANCE_ROOT = path.join(REPOSITORY_ROOT, 'governance', 'agent-system');

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepEqual(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function pointer(root, reference) {
  if (!reference.startsWith('#/')) throw new Error(`Unsupported non-local schema reference: ${reference}`);
  return reference.slice(2).split('/').reduce((value, token) => value?.[token.replace(/~1/g, '/').replace(/~0/g, '~')], root);
}

function typeMatches(value, type) {
  switch (type) {
    case 'null': return value === null;
    case 'array': return Array.isArray(value);
    case 'object': return isObject(value);
    case 'integer': return Number.isInteger(value);
    case 'number': return typeof value === 'number' && Number.isFinite(value);
    case 'string': return typeof value === 'string';
    case 'boolean': return typeof value === 'boolean';
    default: throw new Error(`Unsupported JSON Schema type: ${type}`);
  }
}

function add(issues, instancePath, schemaPath, keyword, message) {
  issues.push({ path: instancePath || '$', schema_path: schemaPath, code: keyword, message });
}

function visit(value, schema, rootSchema, instancePath, schemaPath, issues, collect = true) {
  if (schema === true) return true;
  if (schema === false) {
    if (collect) add(issues, instancePath, schemaPath, 'false_schema', 'Value is forbidden by schema');
    return false;
  }
  if (!isObject(schema)) throw new Error(`Invalid schema node at ${schemaPath}`);
  if (schema.$ref) {
    const target = pointer(rootSchema, schema.$ref);
    if (target === undefined) throw new Error(`Unresolved schema reference: ${schema.$ref}`);
    return visit(value, target, rootSchema, instancePath, schema.$ref, issues, collect);
  }

  let valid = true;
  const fail = (keyword, message) => {
    valid = false;
    if (collect) add(issues, instancePath, schemaPath, keyword, message);
  };
  const probe = (candidate, candidateSchema, candidatePath = schemaPath) => {
    const local = [];
    return visit(candidate, candidateSchema, rootSchema, instancePath, candidatePath, local, false);
  };

  if (schema.type !== undefined) {
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!allowed.some((type) => typeMatches(value, type))) {
      fail('type', `Expected ${allowed.join(' or ')}`);
      return false;
    }
  }
  if ('const' in schema && !deepEqual(value, schema.const)) fail('const', `Expected constant ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.some((entry) => deepEqual(value, entry))) fail('enum', `Expected one of ${schema.enum.map((entry) => JSON.stringify(entry)).join(', ')}`);
  if (schema.not && probe(value, schema.not, `${schemaPath}/not`)) fail('not', 'Value matches a forbidden schema');
  if (schema.allOf) schema.allOf.forEach((child, index) => { if (!visit(value, child, rootSchema, instancePath, `${schemaPath}/allOf/${index}`, issues, collect)) valid = false; });
  if (schema.oneOf) {
    const matches = schema.oneOf.filter((child, index) => probe(value, child, `${schemaPath}/oneOf/${index}`)).length;
    if (matches !== 1) fail('oneOf', `Expected exactly one matching schema, found ${matches}`);
  }
  if (schema.if) {
    const branch = probe(value, schema.if, `${schemaPath}/if`) ? schema.then : schema.else;
    const keyword = probe(value, schema.if, `${schemaPath}/if`) ? 'then' : 'else';
    if (branch && !visit(value, branch, rootSchema, instancePath, `${schemaPath}/${keyword}`, issues, collect)) valid = false;
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) fail('minLength', `Must have at least ${schema.minLength} characters`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) fail('maxLength', `Must have at most ${schema.maxLength} characters`);
    if (schema.pattern !== undefined && !new RegExp(schema.pattern, 'u').test(value)) fail('pattern', `Does not match ${schema.pattern}`);
    if (schema.format === 'date-time' && (!Number.isFinite(Date.parse(value)) || !/[zZ]|[+-]\d\d:\d\d$/.test(value))) fail('format', 'Must be an RFC 3339 date-time with timezone');
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (schema.minimum !== undefined && value < schema.minimum) fail('minimum', `Must be at least ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) fail('maximum', `Must be at most ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) fail('minItems', `Must contain at least ${schema.minItems} items`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) fail('maxItems', `Must contain at most ${schema.maxItems} items`);
    if (schema.uniqueItems && new Set(value.map((entry) => canonicalJson(entry))).size !== value.length) fail('uniqueItems', 'Items must be unique');
    if (schema.items) value.forEach((entry, index) => { if (!visit(entry, schema.items, rootSchema, `${instancePath}/${index}`, `${schemaPath}/items`, issues, collect)) valid = false; });
    if (schema.contains && !value.some((entry) => probe(entry, schema.contains, `${schemaPath}/contains`))) fail('contains', 'No item matches the required schema');
  }
  if (isObject(value)) {
    for (const key of schema.required ?? []) if (!(key in value)) {
      valid = false;
      if (collect) add(issues, `${instancePath}/${key}`, `${schemaPath}/required`, 'required', 'Required property is missing');
    }
    const properties = schema.properties ?? {};
    for (const [key, child] of Object.entries(properties)) if (key in value && !visit(value[key], child, rootSchema, `${instancePath}/${key}`, `${schemaPath}/properties/${key}`, issues, collect)) valid = false;
    if (schema.additionalProperties === false) for (const key of Object.keys(value)) if (!(key in properties)) {
      valid = false;
      if (collect) add(issues, `${instancePath}/${key}`, `${schemaPath}/additionalProperties`, 'additionalProperties', 'Unknown property is not allowed');
    }
  }
  return valid;
}

export function validateSchemaInstance(instance, schema) {
  const issues = [];
  visit(instance, schema, schema, '', '#', issues, true);
  return { valid: issues.length === 0, issues };
}

const SCHEMA_KEYWORDS = new Set([
  '$schema', '$id', '$ref', '$defs', '$comment', 'title', 'description', 'type', 'required',
  'properties', 'additionalProperties', 'const', 'enum', 'format', 'pattern', 'minLength',
  'maxLength', 'minimum', 'maximum', 'minItems', 'maxItems', 'uniqueItems', 'items',
  'contains', 'allOf', 'oneOf', 'not', 'if', 'then', 'else',
]);

export function validateSchemaDocument(schema) {
  const issues = [];
  function check(node, schemaPath, root) {
    if (typeof node === 'boolean') return;
    if (!isObject(node)) { add(issues, '$', schemaPath, 'schema', 'Schema node must be an object or boolean'); return; }
    for (const keyword of Object.keys(node)) if (!SCHEMA_KEYWORDS.has(keyword)) add(issues, '$', `${schemaPath}/${keyword}`, 'unsupported_keyword', `Unsupported schema keyword: ${keyword}`);
    if (node.$ref) {
      try { if (pointer(root, node.$ref) === undefined) throw new Error('missing'); }
      catch { add(issues, '$', `${schemaPath}/$ref`, '$ref', `Unresolved or unsupported schema reference: ${node.$ref}`); }
    }
    if (node.pattern) try { new RegExp(node.pattern, 'u'); } catch { add(issues, '$', `${schemaPath}/pattern`, 'pattern', 'Schema contains an invalid regular expression'); }
    if (node.required && (!Array.isArray(node.required) || node.required.some((entry) => typeof entry !== 'string') || new Set(node.required).size !== node.required.length)) add(issues, '$', `${schemaPath}/required`, 'required', 'required must be an array of unique property names');
    if (node.type !== undefined) {
      const types = Array.isArray(node.type) ? node.type : [node.type];
      const supported = ['null', 'array', 'object', 'integer', 'number', 'string', 'boolean'];
      if (!types.length || types.some((entry) => !supported.includes(entry))) add(issues, '$', `${schemaPath}/type`, 'type', 'Schema declares an unsupported type');
    }
    for (const [keyword, collection] of [['properties', node.properties], ['$defs', node.$defs]]) {
      if (collection !== undefined && !isObject(collection)) add(issues, '$', `${schemaPath}/${keyword}`, keyword, `${keyword} must be an object`);
      else for (const [name, child] of Object.entries(collection ?? {})) check(child, `${schemaPath}/${keyword}/${name}`, root);
    }
    for (const keyword of ['additionalProperties', 'items', 'contains', 'not', 'if', 'then', 'else']) if (node[keyword] !== undefined && typeof node[keyword] !== 'boolean') check(node[keyword], `${schemaPath}/${keyword}`, root);
    for (const keyword of ['allOf', 'oneOf']) {
      if (node[keyword] !== undefined && (!Array.isArray(node[keyword]) || !node[keyword].length)) add(issues, '$', `${schemaPath}/${keyword}`, keyword, `${keyword} must be a non-empty array`);
      else (node[keyword] ?? []).forEach((child, index) => check(child, `${schemaPath}/${keyword}/${index}`, root));
    }
  }
  check(schema, '#', schema);
  return { valid: issues.length === 0, issues };
}

export function loadGovernanceJson(...segments) {
  return JSON.parse(readFileSync(path.join(GOVERNANCE_ROOT, ...segments), 'utf8'));
}

export function loadGovernanceJsonFrom(root, ...segments) {
  return JSON.parse(readFileSync(path.join(path.resolve(root), 'governance', 'agent-system', ...segments), 'utf8'));
}

export function validateGovernanceInstance(instance, schemaFile) {
  return validateSchemaInstance(instance, loadGovernanceJson('contracts', schemaFile));
}
