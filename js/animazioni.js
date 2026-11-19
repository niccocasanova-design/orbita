// animazioni.js: le animazioni della presentazione con GSAP (https://gsap.com)
// GSAP, ScrollTrigger e SplitText si caricano dalla rete prima di questo file (vedi in fondo a index.html).
// Se non arrivano, js/presentazione.js usa la comparsa semplice di prima e questo file non fa niente.
//
//   1. la barra verde in alto che si riempie scorrendo
//   2. l'apertura: la barra scende, "Orbita" compare lettera per lettera, poi il resto
//   3. i titoli delle sezioni salgono parola per parola
//   4. la frase grande si "accende" parola per parola mentre scorri
//   5. i riquadri, le versioni e le schede compaiono uno dopo l'altro
//   6. la vista attraverso la lente si avvicina scorrendo
//   7. le specifiche: le righe entrano e i numeri contano fino al loro valore
//   8. il configuratore e la galleria dei modelli
//   9. i bottoni "magnetici" che seguono un po' il puntatore
//  10. tutti gli altri blocchi .pr-rivela: salgono e compaiono

(function() {
    const radice = document.documentElement;
    if (!window.gsap || !window.ScrollTrigger || !window.SplitText) {
        radice.classList.remove('pr-gsap-attesa');
        return;
    }
    gsap.registerPlugin(ScrollTrigger, SplitText);

    // chi ha chiesto al sistema meno movimento vede tutto subito, senza animazioni
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        radice.classList.remove('pr-gsap-attesa');
        return;
    }

    // i blocchi partono invisibili (lo stile .pr-gsap-attesa li nascondeva già durante il caricamento);
    // da qui in poi la visibilità la gestisce GSAP con autoAlpha (opacità + visibility)
    const daRivelare = gsap.utils.toArray('.pr-rivela');
    gsap.set(daRivelare, { autoAlpha: 0 });
    radice.classList.remove('pr-gsap-attesa');
    const giaFatti = new Set();   // i blocchi che hanno già un'animazione loro: gli altri prendono quella generica (punto 10)
    function segna(elementi) {
        gsap.utils.toArray(elementi).forEach(function(e) {
            giaFatti.add(e);
        });
    }

    gsap.defaults({ ease: 'power3.out', duration: 0.9 });


    // --- 1. la barra di avanzamento: una linea verde luminosa sotto la barra di navigazione ---
    const avanzamento = document.createElement('div');
    avanzamento.className = 'pr-avanzamento';
    avanzamento.setAttribute('aria-hidden', 'true');
    document.body.appendChild(avanzamento);
    gsap.fromTo(avanzamento, { scaleX: 0 }, {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: { start: 0, end: 'max', scrub: 0.3 }
    });


    // --- 2. l'apertura, appena si apre la pagina ---
    const eroe = document.querySelector('.pr-eroe');
    if (eroe) {
        const titolo = eroe.querySelector('.pr-titolo');
        const lettere = new SplitText(titolo, { type: 'chars' });
        const apertura = gsap.timeline({ delay: 0.15 });
        apertura
            .from('.pr-nav', { yPercent: -100, autoAlpha: 0, duration: 0.8 })
            .to(eroe.querySelector('.pr-sovratitolo'), { autoAlpha: 1, y: 0, startAt: { y: 16 }, duration: 0.6 }, '-=0.4')
            .set(titolo, { autoAlpha: 1 }, '<')
            .from(lettere.chars, {
                yPercent: 70,
                rotateX: -90,
                autoAlpha: 0,
                filter: 'blur(10px)',
                transformOrigin: '50% 100%',
                stagger: 0.07,
                duration: 1.1,
                ease: 'expo.out'
            }, '<0.1')
            .to(eroe.querySelector('.pr-sottotitolo'), { autoAlpha: 1, y: 0, startAt: { y: 24 } }, '-=0.7')
            .to(eroe.querySelector('.pr-link-azioni'), { autoAlpha: 1, y: 0, startAt: { y: 24 } }, '-=0.7')
            .to(eroe.querySelector('.pr-eroe-vista'), {
                autoAlpha: 1,
                scale: 1,
                y: 0,
                startAt: { scale: 0.9, y: 60 },
                duration: 1.4,
                ease: 'expo.out'
            }, '-=0.6');
        segna(eroe.querySelectorAll('.pr-rivela'));
    }


    // --- 3. i titoli delle sezioni: le parole salgono una dopo l'altra ---
    gsap.utils.toArray('.pr-titolo-sezione.pr-rivela').forEach(function(titolo) {
        const parole = new SplitText(titolo, { type: 'words' });
        gsap.set(titolo, { autoAlpha: 1 });
        gsap.from(parole.words, {
            yPercent: 80,
            autoAlpha: 0,
            filter: 'blur(6px)',
            stagger: 0.08,
            duration: 1,
            scrollTrigger: { trigger: titolo, start: 'top 85%', once: true }
        });
        segna(titolo);
    });


    // --- 4. la frase grande: le parole si accendono mentre scorri ---
    const frase = document.querySelector('.pr-frase p.pr-rivela');
    if (frase) {
        const parole = new SplitText(frase, { type: 'words' });
        gsap.set(frase, { autoAlpha: 1 });
        gsap.fromTo(parole.words, { opacity: 0.12 }, {
            opacity: 1,
            stagger: 0.1,
            ease: 'none',
            scrollTrigger: { trigger: frase, start: 'top 80%', end: 'bottom 45%', scrub: true }
        });
        segna(frase);
    }


    // --- 5. riquadri, versioni e schede: entrano a gruppi, uno dopo l'altro ---
    const schede = gsap.utils.toArray('.pr-griglia .pr-riquadro.pr-rivela, .pr-versione.pr-rivela, .pr-provali-scelta.pr-rivela');
    segna(schede);
    ScrollTrigger.batch(schede, {
        start: 'top 88%',
        once: true,
        onEnter: function(gruppo) {
            gsap.to(gruppo, {
                autoAlpha: 1,
                y: 0,
                startAt: { y: 70 },
                stagger: 0.14,
                duration: 1.1,
                overwrite: true
            });
            // le foto dentro partono un po' ingrandite e si assestano
            gsap.from(gruppo.map(function(scheda) {
                return scheda.querySelector('img');
            }).filter(Boolean), { scale: 1.12, duration: 1.6, stagger: 0.14, ease: 'power2.out' });
        }
    });

    // il prezzo di Gargoz respira con un alone rosa
    const prezzoGargoz = document.querySelector('.pr-gargoz-prezzo');
    if (prezzoGargoz) {
        gsap.to(prezzoGargoz, {
            textShadow: '0 0 6px rgba(255, 143, 200, 0.9), 0 0 22px rgba(255, 143, 200, 0.6)',
            color: '#ffb3dc',
            duration: 1.4,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true
        });
    }


    // --- 6. la vista attraverso la lente: si avvicina e si allarga mentre arriva al centro ---
    const attraverso = document.querySelector('.pr-attraverso.pr-rivela');
    if (attraverso) {
        gsap.set(attraverso, { autoAlpha: 1 });
        gsap.fromTo(attraverso, { scale: 0.86, y: 80, opacity: 0.2 }, {
            scale: 1,
            y: 0,
            opacity: 1,
            ease: 'none',
            scrollTrigger: { trigger: attraverso, start: 'top 95%', end: 'center 55%', scrub: 0.6 }
        });
        segna(attraverso);
    }


    // --- 7. le specifiche: le righe entrano da sinistra e i numeri contano ---
    const specifiche = document.querySelector('.pr-specifiche.pr-rivela');
    if (specifiche) {
        gsap.set(specifiche, { autoAlpha: 1 });
        const righe = specifiche.querySelectorAll(':scope > div');
        gsap.from(righe, {
            x: -40,
            autoAlpha: 0,
            stagger: 0.07,
            scrollTrigger: { trigger: specifiche, start: 'top 85%', once: true }
        });
        // solo i numeri scritti a mano (5, 6, 4...): le misure le scrive js/visore3d.js quando legge il file
        specifiche.querySelectorAll('dd:not([data-misura])').forEach(function(dd) {
            const testo = dd.firstChild;
            const valore = testo && testo.nodeType === Node.TEXT_NODE ? parseInt(testo.nodeValue, 10) : NaN;
            if (isNaN(valore) || String(valore) !== testo.nodeValue.trim()) {
                return;
            }
            const conta = { n: 0 };
            testo.nodeValue = '0';
            gsap.to(conta, {
                n: valore,
                duration: 1.2,
                ease: 'power2.out',
                scrollTrigger: { trigger: dd, start: 'top 90%', once: true },
                onUpdate: function() {
                    testo.nodeValue = String(Math.round(conta.n));
                }
            });
        });
        segna(specifiche);
    }


    // --- 8. il configuratore: il visore, il pannello e le caselle delle viste ---
    const configura = document.querySelector('#configura');
    if (configura) {
        const pezzi = configura.querySelectorAll('.visore, .pannello');
        gsap.from(pezzi, {
            y: 60,
            autoAlpha: 0,
            stagger: 0.15,
            duration: 1.1,
            scrollTrigger: { trigger: configura, start: 'top 80%', once: true }
        });
        gsap.from(configura.querySelectorAll('.vista'), {
            y: 30,
            autoAlpha: 0,
            stagger: 0.06,
            duration: 0.7,
            scrollTrigger: { trigger: configura.querySelector('.viste') || configura, start: 'top 92%', once: true }
        });
    }
    // la galleria si riempie da sola (js/visore3d.js): animo le caselle che ci sono quando arriva sullo schermo
    const galleria = document.querySelector('.galleria');
    if (galleria) {
        ScrollTrigger.create({
            trigger: galleria,
            start: 'top 88%',
            once: true,
            onEnter: function() {
                gsap.from(galleria.children, { y: 40, autoAlpha: 0, scale: 0.94, stagger: 0.05, duration: 0.8 });
            }
        });
    }


    // --- 9. i bottoni magnetici: col mouse sopra si spostano un po' verso il puntatore ---
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        gsap.utils.toArray('.pr .pr-bottone, .pr-nav-azione').forEach(function(bottone) {
            const versoX = gsap.quickTo(bottone, 'x', { duration: 0.4, ease: 'power3.out' });
            const versoY = gsap.quickTo(bottone, 'y', { duration: 0.4, ease: 'power3.out' });
            bottone.addEventListener('pointermove', function(evento) {
                const box = bottone.getBoundingClientRect();
                versoX((evento.clientX - box.left - box.width / 2) * 0.3);
                versoY((evento.clientY - box.top - box.height / 2) * 0.4);
            });
            bottone.addEventListener('pointerleave', function() {
                gsap.to(bottone, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
            });
        });
    }


    // --- 10. tutti gli altri blocchi: salgono e compaiono quando entrano nello schermo ---
    const altri = daRivelare.filter(function(e) {
        return !giaFatti.has(e);
    });
    ScrollTrigger.batch(altri, {
        start: 'top 90%',
        once: true,
        onEnter: function(gruppo) {
            gsap.to(gruppo, { autoAlpha: 1, y: 0, startAt: { y: 40 }, stagger: 0.1, overwrite: true });
        }
    });

    // le foto e il 3D cambiano l'altezza di alcuni blocchi quando sono pronti: ricalcolo i punti di partenza
    window.addEventListener('load', function() {
        ScrollTrigger.refresh();
    });
})();
