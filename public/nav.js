const menuBtn  = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');
menuBtn.addEventListener('click', () => {
  const expanded = navLinks.classList.toggle('active');
  menuBtn.setAttribute('aria-expanded', expanded);
});
navLinks.querySelectorAll('a').forEach(l => l.addEventListener('click', () => {
  navLinks.classList.remove('active');
  menuBtn.setAttribute('aria-expanded', 'false');
}));
