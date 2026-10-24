/**
 * Test suite for TagChipInput - standalone render check.
 * No JSX here (file is .test.ts, not .test.tsx - see vitest.config.ts's
 * `include` glob) - React.createElement stands in for JSX syntax, which is
 * fine since this file isn't parsed with a JSX-enabled loader.
 */

import { createElement } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TagChipInput from './TagChipInput';
import type { TagChip } from '../types/tagChip';

const OPTIONS = {
  typeOptions: ['fire', 'psychic', 'dragon'],
  moveOptions: ['fire-blast', 'psychic', 'dragon-dance'],
  abilityOptions: ['flash-fire', 'levitate'],
};

describe('TagChipInput', () => {
  it('renders standalone with no chips selected', () => {
    render(createElement(TagChipInput, { chips: [], onChipsChange: vi.fn(), ...OPTIONS }));
    expect(screen.getByPlaceholderText('Search type/move/ability...')).toBeTruthy();
  });

  it('renders existing chips with a remove affordance', () => {
    const chips: TagChip[] = [{ category: 'type', value: 'fire' }];
    render(createElement(TagChipInput, { chips, onChipsChange: vi.fn(), ...OPTIONS }));
    expect(screen.getByText('fire')).toBeTruthy();
    expect(screen.getByLabelText('Remove fire')).toBeTruthy();
  });

  it('shows disambiguated, category-labeled options when typing a dual type/move name', () => {
    render(createElement(TagChipInput, { chips: [], onChipsChange: vi.fn(), ...OPTIONS }));
    fireEvent.change(screen.getByPlaceholderText('Search type/move/ability...'), {
      target: { value: 'psychic' },
    });
    expect(screen.getAllByText('Psychic')).toHaveLength(2);
    expect(screen.getByText('Type')).toBeTruthy();
    expect(screen.getByText('Move')).toBeTruthy();
  });

  it('adds a chip and clears the query on option click', () => {
    const onChipsChange = vi.fn();
    render(createElement(TagChipInput, { chips: [], onChipsChange, ...OPTIONS }));
    const input = screen.getByPlaceholderText('Search type/move/ability...');
    fireEvent.change(input, { target: { value: 'fire' } });
    fireEvent.click(screen.getByText('Fire'));
    expect(onChipsChange).toHaveBeenCalledWith([{ category: 'type', value: 'fire' }]);
  });

  it('removes a chip on remove-button click', () => {
    const onChipsChange = vi.fn();
    const chips: TagChip[] = [{ category: 'ability', value: 'flash-fire' }];
    render(createElement(TagChipInput, { chips, onChipsChange, ...OPTIONS }));
    fireEvent.click(screen.getByLabelText('Remove flash-fire'));
    expect(onChipsChange).toHaveBeenCalledWith([]);
  });
});
