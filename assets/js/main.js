'use strict';

const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.main-nav');

if (menuButton && navigation) {
  menuButton.hidden = false;
  const closeMenu = () => {
    menuButton.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('is-open');
  };
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!open));
    navigation.classList.toggle('is-open', !open);
  });
  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      menuButton.focus();
    }
  });
  window.matchMedia('(min-width: 1001px)').addEventListener('change', closeMenu);
}


// Native summaries retain Enter/Space support; name also groups answers without JS.
const faqItems = [...document.querySelectorAll('.faq-list details')];
const syncFaqState = () => {
  faqItems.forEach(item => {
    item.querySelector('summary').setAttribute('aria-expanded', String(item.open));
  });
};
faqItems.forEach(item => {
  const summary = item.querySelector('summary');
  summary.addEventListener('click', event => {
    event.preventDefault();
    const topBefore = summary.getBoundingClientRect().top;
    const willOpen = !item.open;
    faqItems.forEach(other => { other.open = other === item && willOpen; });
    syncFaqState();
    // Keep the activated question in place when an answer above it collapses.
    const offset = summary.getBoundingClientRect().top - topBefore;
    if (Math.abs(offset) > 1) window.scrollBy({ top: offset, behavior: 'instant' });
  });
  item.addEventListener('toggle', () => {
    if (item.open) faqItems.forEach(other => { if (other !== item) other.open = false; });
    syncFaqState();
  });
});
syncFaqState();
