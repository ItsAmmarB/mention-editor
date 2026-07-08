import { describe, expect, it } from 'vitest';
import { serialize, deserialize } from './serialize';
import { MentionFieldOption } from './types';

const fields: MentionFieldOption[] = [
  { id: 'a1b2c3d4-0000-0000-0000-000000000001', label: 'Landlord Name' },
  { id: 'a1b2c3d4-0000-0000-0000-000000000002', label: 'Monthly Rent' },
];

const roundTrip = (wire: string) => serialize(deserialize(wire, fields));

describe('serialize <-> deserialize round-trip', () => {
  it('plain text with no mentions', () => {
    const wire = 'Hello, this is plain text with no mentions.';
    expect(roundTrip(wire)).toBe(wire);
  });

  it('text with one mention', () => {
    const wire = `Hello <@${fields[0].id}>, please sign here.`;
    expect(roundTrip(wire)).toBe(wire);
  });

  it('two adjacent mentions separated by a space', () => {
    const wire = `<@${fields[0].id}> <@${fields[1].id}>`;
    expect(roundTrip(wire)).toBe(wire);
  });

  it('two mentions with no separator at all', () => {
    const wire = `<@${fields[0].id}><@${fields[1].id}>`;
    expect(roundTrip(wire)).toBe(wire);
  });

  it('a mention at the very start of the string', () => {
    const wire = `<@${fields[0].id}> pays rent to the landlord.`;
    expect(roundTrip(wire)).toBe(wire);
  });

  it('a mention at the very end of the string', () => {
    const wire = `The rent is paid by <@${fields[0].id}>`;
    expect(roundTrip(wire)).toBe(wire);
  });

  it('a string containing a newline (paragraph break)', () => {
    const wire = `Clause 1 mentions <@${fields[0].id}>.\nClause 2 mentions <@${fields[1].id}>.`;
    expect(roundTrip(wire)).toBe(wire);
  });

  it('empty string', () => {
    expect(roundTrip('')).toBe('');
  });

  it('multiple consecutive newlines (blank paragraphs)', () => {
    const wire = 'first\n\nthird';
    expect(roundTrip(wire)).toBe(wire);
  });

  it('falls back to the raw id as the label when the field is unknown', () => {
    const wire = '<@unknown-id-123>';
    const value = deserialize(wire, fields);
    const paragraph = value[0] as { children: { field?: { label: string } }[] };
    expect(paragraph.children[1].field?.label).toBe('unknown-id-123');
    expect(serialize(value)).toBe(wire);
  });

  it('deserialize produces Slate-valid shape: inline voids surrounded by text nodes', () => {
    const wire = `<@${fields[0].id}><@${fields[1].id}>`;
    const value = deserialize(wire, fields) as unknown as {
      children: { text?: string; type?: string }[];
    }[];
    const children = value[0].children;
    // text, mention, text, mention, text
    expect(children).toHaveLength(5);
    expect(children[0].text).toBe('');
    expect(children[1].type).toBe('mention');
    expect(children[2].text).toBe('');
    expect(children[3].type).toBe('mention');
    expect(children[4].text).toBe('');
  });

  it('an unmatched "<@" with no closing bracket is left as plain text', () => {
    const wire = `Contact <@ someone for help`;
    expect(roundTrip(wire)).toBe(wire);
  });
});
