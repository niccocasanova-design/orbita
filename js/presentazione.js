// presentazione.js: la barra di navigazione e la comparsa dei blocchi durante lo scorrimento

// il menu su telefono: "Menu" apre e chiude la tendina con i link
const barra = document.querySelector('.pr-nav');
const bottoneMenu = document.querySelector('.pr-nav-menu');

bottoneMenu.addEventListener('click', function() {
    const aperta = barra.classList.toggle('aperta');
    bottoneMenu.setAttribute('aria-expanded', aperta ? 'true' : 'false');
    bottoneMenu.textContent = aperta ? 'Chiudi' : 'Menu';
});

// cliccando un link la tendina si richiude
document.querySelectorAll('.pr-nav-link a').forEach(function(link) {
    link.addEventListener('click', function() {
        barra.classList.remove('aperta');
        bottoneMenu.setAttribute('aria-expanded', 'false');
        bottoneMenu.textContent = 'Menu';
    });
});

// i blocchi con .pr-rivela compaiono (salendo un po') quando entrano nello schermo.
// Di solito lo fa GSAP in js/animazioni.js; questa è la comparsa semplice di riserva, se GSAP non è arrivato dalla rete.
// IntersectionObserver avvisa quando un elemento diventa visibile, senza calcoli a ogni scorrimento
const conGsap = window.gsap && window.ScrollTrigger && window.SplitText;
if (!conGsap) {
    document.documentElement.classList.remove('pr-gsap-attesa');
}
if (!conGsap && 'IntersectionObserver' in window) {
    document.querySelector('div.pr').classList.add('pr-animazioni');
    const osservatore = new IntersectionObserver(function(voci) {
        voci.forEach(function(voce) {
            if (voce.isIntersecting) {
                voce.target.classList.add('visibile');
                osservatore.unobserve(voce.target);   // compare una volta sola
            }
        });
    }, { rootMargin: '0px 0px -10% 0px' });

    document.querySelectorAll('.pr-rivela').forEach(function(elemento) {
        osservatore.observe(elemento);
    });
}
