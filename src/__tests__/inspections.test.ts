import { describe, expect, test } from 'vitest';
import { getAnswersText, searchMatches, toCsv, Field } from '../components/Inspections/utils';
import { getDetailPreviewText } from '../components/Inspections/FieldPreview';

describe('Inspections utilities', () => {
  test('search matches field name/type/options', () => {
    const field: Field = {
      id: 'f1', name: 'Windshield Condition', type: 'select',
      options: [ { id: '1', label: 'Good', value: 'good' }, { id: '2', label: 'Bad', value: 'bad' } ]
    };
    expect(searchMatches(field, 'windshield')).toBe(true);
    expect(searchMatches(field, 'select')).toBe(true);
    expect(searchMatches(field, 'Good')).toBe(true);
    expect(searchMatches(field, 'nope')).toBe(false);
  });

  test('answers text for select/multiselect/boolean/rating', () => {
    expect(getAnswersText({ id: 'a', name: 'A', type: 'select', options: [{ id: '1', label: 'X', value: 'x' }] })).toBe('X');
    expect(getAnswersText({ id: 'b', name: 'B', type: 'multiselect', options: [{ id: '1', label: 'Y', value: 'y' }] })).toBe('Y');
    expect(getAnswersText({ id: 'c', name: 'C', type: 'boolean' })).toBe('Yes, No');
    expect(getAnswersText({ id: 'd', name: 'D', type: 'rating', maxRating: 5 })).toBe('5 stars');
  });

  test('detail preview mapping select/multiselect/boolean/rating', () => {
    expect(getDetailPreviewText({ id: 's', name: 'S', type: 'select', sampleAnswer: 'x', options: [{ id: '1', label: 'X', value: 'x' }] })).toBe('X');
    expect(getDetailPreviewText({ id: 'm', name: 'M', type: 'multiselect', sampleAnswer: ['y'], options: [{ id: '1', label: 'Y', value: 'y' }] })).toBe('Y');
    expect(getDetailPreviewText({ id: 'bo', name: 'BO', type: 'boolean', sampleAnswer: true })).toBe('Yes');
    expect(getDetailPreviewText({ id: 'r', name: 'R', type: 'rating', sampleAnswer: 3, maxRating: 5 })).toBe('3/5');
  });

  test('CSV export contains 4 columns and rows', () => {
    const rows = [
      { name: 'VIN', type: 'text', answers: '1HG...', detail: '1HG...' },
      { name: 'OK?', type: 'boolean', answers: 'Yes, No', detail: 'Yes' },
    ];
    const csv = toCsv(rows);
    const lines = csv.split('\n');
    expect(lines[0].split(',').length).toBe(4);
    expect(lines.length).toBe(1 + rows.length);
  });
});


