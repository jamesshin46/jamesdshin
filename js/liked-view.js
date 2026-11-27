// #/liked: the visitor's own "Liked" playlist of experiences, clubs, and schools they hearted.

import { getOrg } from './data.js';
import { el, clear, present, timeAgo } from './utils.js';
import { icon } from './icons.js';
import { setTopbar } from './topbar.js';
import { likes, heartButton, onLikesChange } from './likes.js';
import { logoOrb, orgDatesLabel, isPreRelease } from './orgs.js';
import { playChapter } from './player.js';

const KIND = { experience: 'Experience', club: 'Club', education: 'Education' };

export function renderLikedView(view) {
  const count = el('p', { class: 'liked-meta' });
  const playBtn = el('button', { class: 'play-xl', type: 'button' },
    el('span', { class: 'play-xl-circle', html: icon('play') }),
    el('span', { class: 'play-xl-label' }, el('span', { class: 'micro' }, 'Playlist'), el('span', {}, 'Play')));
  const body = el('div', { class: 'liked-body' });

  view.append(el('article', { class: 'liked' },
    el('header', { class: 'liked-hero' },
      el('div', { class: 'liked-cover', 'aria-hidden': 'true', html: icon('heartFilled', { size: 64 }) }),
      el('div', { class: 'liked-id' },
        el('p', { class: 'micro' }, 'Playlist'),
        el('h1', { class: 'liked-title' }, 'Liked'),
        count)),
    el('div', { class: 'liked-actions' }, playBtn),
    body));

  const render = () => {
    if (!body.isConnected) return off();
    const items = likes().map(l => ({ ...l, org: getOrg(l.id) }));
    count.textContent = `Saved in this browser · ${items.length} ${items.length === 1 ? 'item' : 'items'}`;
    const firstPlayable = items.map(i => i.org).find(o => o.chapters.length && !isPreRelease(o));
    playBtn.disabled = !firstPlayable;
    playBtn.onclick = firstPlayable ? () => playChapter(firstPlayable.id, firstPlayable.chapters[0].id) : null;

    clear(body);
    if (!items.length) {
      body.append(el('div', { class: 'liked-empty' },
        el('span', { class: 'liked-empty-icon', html: icon('heart', { size: 36 }) }),
        el('p', { class: 'liked-empty-title' }, 'Things you like will show up here'),
        el('p', { class: 'muted' }, 'Tap the heart on any experience, club, or school to save it.'),
        el('a', { class: 'pill-btn', href: '#/' }, 'Browse the portfolio')));
      return;
    }
    body.append(
      el('div', { class: 'liked-cols micro', 'aria-hidden': 'true' },
        el('span', {}, '#'), el('span', {}, 'Title'), el('span', {}, 'Type'), el('span', {}, 'Date added'), el('span')),
      el('ol', { class: 'liked-list' }, items.map((it, i) => {
        const o = it.org;
        return el('li', { class: 'liked-row' },
          el('span', { class: 'liked-num num' }, String(i + 1)),
          el('a', { class: 'liked-main', href: `#/org/${encodeURIComponent(o.id)}` },
            logoOrb(o, { shape: o.kind === 'club' ? 'circle' : 'square', size: 'node' }),
            el('span', { class: 'liked-text' },
              el('span', { class: 'liked-name' }, o.name),
              el('span', { class: 'liked-sub' }, [o.roles[0]?.title, orgDatesLabel(o)].filter(present).join(' · ')))),
          el('span', { class: 'liked-kind' }, KIND[o.kind] ?? ''),
          el('span', { class: 'liked-when' }, timeAgo(new Date(it.at).toISOString()) ?? ''),
          heartButton(o.id, { size: 20 }));
      })));
  };
  const off = onLikesChange(render);
  render();
  setTopbar({ title: 'Liked', color: 'var(--accent)', threshold: 180 });
}
