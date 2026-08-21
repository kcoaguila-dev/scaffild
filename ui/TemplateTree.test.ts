import { describe, it, expect } from 'vitest';
import { fromRawStructure, toRawStructure, isFileItem } from './TemplateTree';

describe('TemplateTree Structure Parsing & Conversion', () => {
  it('identifies media and project file extensions accurately', () => {
    expect(isFileItem('[project].prproj')).toBe(true);
    expect(isFileItem('[project]_Thumbnail.psd')).toBe(true);
    expect(isFileItem('01_PROJECT_FILES')).toBe(false);
    expect(isFileItem('A_ROLL')).toBe(false);
    expect(isFileItem('script.txt')).toBe(true);
  });

  it('converts nested raw YAML structures into interactive tree nodes', () => {
    const raw = [
      {
        '01_PROJECT_FILES': ['[project].prproj']
      },
      {
        '02_FOOTAGE': ['A_ROLL', 'B_ROLL']
      },
      'README.md'
    ];

    const nodes = fromRawStructure(raw);
    expect(nodes.length).toBe(3);
    expect(nodes[0].name).toBe('01_PROJECT_FILES');
    expect(nodes[0].children.length).toBe(1);
    expect(nodes[0].children[0].name).toBe('[project].prproj');
    expect(nodes[1].name).toBe('02_FOOTAGE');
    expect(nodes[1].children.length).toBe(2);
    expect(nodes[2].name).toBe('README.md');

    // Roundtrip back to raw structure
    const backToRaw = toRawStructure(nodes);
    expect(backToRaw).toEqual(raw);
  });
});
