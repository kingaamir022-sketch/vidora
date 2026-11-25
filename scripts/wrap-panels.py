#!/usr/bin/env python3
"""Wrap Vidora editor panels in PanelShell (CapCut-fix D1).
Per panel: add PanelShell import, replace the w-72 outer div with
<PanelShell subNav={...}>, replace the last </div> with </PanelShell>.
The sub-navs reference state the follow-up edits add/rename.
"""
import re
import sys

SUBNAVS = {
    'AudioPanel': '''subNav={<>
        <SubNavItem active={showFavorites} onClick={() => setShowFavorites(true)}>Favorites</SubNavItem>
        <SubNavItem active={!showFavorites && subTab === 'music'} onClick={() => { setSubTab('music'); setShowFavorites(false); }}>Music</SubNavItem>
        <SubNavItem active={!showFavorites && subTab === 'sfx'} onClick={() => { setSubTab('sfx'); setShowFavorites(false); }}>Sound effects</SubNavItem>
      </>}''',
    'TextPanel': '''subNav={<>
        <SubNavItem active={subTab === 'templates'} onClick={() => setSubTab('templates')}>Templates</SubNavItem>
        <SubNavItem active={subTab === 'effects'} onClick={() => setSubTab('effects')}>Effects</SubNavItem>
        <SubNavItem active={subTab === 'ai-text-fx'} onClick={() => setSubTab('ai-text-fx')}>AI text FX</SubNavItem>
      </>}''',
    'StickersPanel': '''subNav={<>
        <SubNavGroup title="Yours">
          <SubNavItem active={category === 'Favorites'} onClick={() => setCategory('Favorites')}>Favorites</SubNavItem>
        </SubNavGroup>
        <SubNavGroup title="Stickers">
          {STICKER_NAV.map((n) => (
            <SubNavItem key={n} active={category === n} onClick={() => setCategory(n)}>{n}</SubNavItem>
          ))}
        </SubNavGroup>
      </>}''',
    'EffectsPanel': '''subNav={<>
        <SubNavItem active={effectNav.group === 'favorites'} onClick={() => setEffectNav({ category: 'All', group: 'favorites' })}>Favorites</SubNavItem>
        <SubNavGroup title="Video effects">
          {VIDEO_EFFECT_NAV.map((n) => (
            <SubNavItem key={n} active={effectNav.group === 'video' && effectNav.category === n} onClick={() => setEffectNav({ category: n, group: 'video' })}>{n}</SubNavItem>
          ))}
        </SubNavGroup>
        <SubNavGroup title="Body effects">
          {BODY_EFFECT_NAV.map((n) => (
            <SubNavItem key={n} active={effectNav.group === 'body' && effectNav.category === n} onClick={() => setEffectNav({ category: n, group: 'body' })}>{n}</SubNavItem>
          ))}
        </SubNavGroup>
      </>}''',
    'TransitionsPanel': '''subNav={<>
        <SubNavItem active={category === 'Favorites'} onClick={() => setCategory('Favorites')}>Favorites</SubNavItem>
        <SubNavGroup title="Transitions">
          {TRANSITION_NAV.map((n) => (
            <SubNavItem key={n} active={category === n} onClick={() => setCategory(n)}>{n}</SubNavItem>
          ))}
        </SubNavGroup>
      </>}''',
    'CaptionsPanel': '''subNav={<>
        <SubNavItem active={capSection === 'auto'} onClick={() => setCapSection('auto')}>Auto captions</SubNavItem>
        <SubNavGroup title="Templates">
          {CAPTION_TEMPLATE_NAV.map((n) => (
            <SubNavItem key={n} active={capSection === 'templates' && templateCategory === n} onClick={() => { setCapSection('templates'); setTemplateCategory(n); }}>{n}</SubNavItem>
          ))}
        </SubNavGroup>
        <SubNavItem active={capSection === 'lyrics'} onClick={() => setCapSection('lyrics')}>Auto lyrics</SubNavItem>
      </>}''',
    'TemplatesPanel': '''subNav={<>
        <SubNavGroup title="Yours">
          <SubNavItem active={category === 'Favorites'} onClick={() => setCategory('Favorites')}>Favorites</SubNavItem>
        </SubNavGroup>
        <SubNavGroup title="Templates">
          {TEMPLATE_NAV.map((n) => (
            <SubNavItem key={n} active={category === n} onClick={() => setCategory(n)}>{n}</SubNavItem>
          ))}
        </SubNavGroup>
      </>}''',
}

IMPORTS = {
    'AudioPanel': "import PanelShell, { PanelSearch, SectionHeading, SubNavItem } from './PanelShell';",
    'TextPanel': "import PanelShell, { PanelSearch, SectionHeading, SubNavItem } from './PanelShell';",
    'StickersPanel': "import PanelShell, { PanelSearch, SectionHeading, SubNavGroup, SubNavItem } from './PanelShell';",
    'EffectsPanel': "import PanelShell, { PanelSearch, SectionHeading, SubNavGroup, SubNavItem } from './PanelShell';",
    'TransitionsPanel': "import PanelShell, { PanelSearch, SectionHeading, SubNavGroup, SubNavItem } from './PanelShell';",
    'CaptionsPanel': "import PanelShell, { PanelSearch, SectionHeading, SubNavGroup, SubNavItem } from './PanelShell';",
    'TemplatesPanel': "import PanelShell, { PanelSearch, SectionHeading, SubNavGroup, SubNavItem } from './PanelShell';",
}

OUTER_RE = re.compile(
    r'^    <div className="w-72 shrink-0 overflow-y-auto border-r border-zinc-800 bg-zinc-950 p-4 text-zinc-100" aria-label="[^"]*">\s*$',
    re.M,
)


def convert(name: str, path: str) -> None:
    src = open(path).read()
    # 1. import: insert after the last import line.
    lines = src.split('\n')
    last_import = max(i for i, l in enumerate(lines) if l.startswith('import '))
    lines.insert(last_import + 1, IMPORTS[name])
    src = '\n'.join(lines)
    # 2. outer div -> PanelShell.
    subnav = SUBNAVS[name]
    replacement = f'    <PanelShell\n      {subnav}\n    >'
    src2, n = OUTER_RE.subn(replacement, src, count=1)
    assert n == 1, f'{name}: outer div not found'
    src = src2
    # 3. last </div> -> </PanelShell>.
    idx = src.rfind('    </div>')
    assert idx != -1, f'{name}: closing div not found'
    src = src[:idx] + '    </PanelShell>' + src[idx + len('    </div>'):]
    open(path, 'w').write(src)
    print(f'{name}: converted')


if __name__ == '__main__':
    for name in sys.argv[1:]:
        convert(name, f'/home/hatch/workspace/vidora/src/components/{name}.tsx')
