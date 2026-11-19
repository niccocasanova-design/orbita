// rendere selezionabili i campioni: ogni gruppo (1. Lenti, 2. Stanga Dx...)
// funziona da solo, così scegliere un colore in un gruppo non cambia la selezione negli altri
document.querySelectorAll('.campioni').forEach(function(gruppo) {
    const bottoniColore = gruppo.querySelectorAll('.campione');
    const valoreColore = gruppo.parentElement.querySelector('.opzione-valore');

    bottoniColore.forEach(function(bottone) {
        bottone.addEventListener('click', function() {
            // tolgo la selezione dai campioni di questo gruppo...
            bottoniColore.forEach(function(b) {
                b.classList.remove('selected');
            });
            // ...e la metto solo su quello cliccato
            bottone.classList.add('selected');
            // scrivo il nome del colore a destra del titolo
            valoreColore.textContent = bottone.dataset.nome;
            // il colore delle parti 3D viene cambiato in js/visore3d.js
        });
    });
});

// le versioni (Vulcano, Aputa, Ape): ognuna sceglie un colore per ciascuno dei gruppi
const bottoniPreset = document.querySelectorAll('.preset');
const valorePreset = bottoniPreset[0].parentElement.parentElement.querySelector('.opzione-valore');
const gruppiColore = document.querySelectorAll('.campioni');
let staApplicandoPreset = false;   // serve a capire se un campione è stato cliccato a mano o dalla versione

bottoniPreset.forEach(function(bottone) {
    bottone.addEventListener('click', function() {
        // i nomi dei colori, uno per gruppo: "Beige,Azzurro,Azzurro,Beige,Azzurro" diventa una lista di 5
        const colori = bottone.dataset.colori.split(',');
        staApplicandoPreset = true;
        gruppiColore.forEach(function(gruppo, i) {
            // cerco nel gruppo il campione con quel nome e lo "clicco": così si aggiornano
            // sia la selezione nel pannello sia il colore delle parti 3D (in js/visore3d.js)
            gruppo.querySelector('.campione[data-nome="' + colori[i] + '"]').click();
        });
        staApplicandoPreset = false;

        bottoniPreset.forEach(function(b) {
            b.classList.remove('selected');
        });
        bottone.classList.add('selected');
        valorePreset.textContent = bottone.dataset.nome;
    });
});

// se cambio a mano il colore di un gruppo, la lampada non è più una delle versioni
document.querySelectorAll('.campione').forEach(function(campione) {
    campione.addEventListener('click', function() {
        if (staApplicandoPreset) {
            return;
        }
        bottoniPreset.forEach(function(b) {
            b.classList.remove('selected');
        });
        valorePreset.textContent = 'Personalizzata';
    });
});

// rendere selezionabili i bottoni di Modalità (Chiuso, Aperto)
const bottoniModalita = document.querySelectorAll('.modalita');
const valoreModalita = bottoniModalita[0].parentElement.parentElement.querySelector('.opzione-valore');

bottoniModalita.forEach(function(bottone) {
    bottone.addEventListener('click', function() {
        // "Indossato" è un interruttore: se è già scelto, il secondo clic lo toglie di dosso
        // e la modalità torna "Aperto" (le stanghe restano aperte, come quando è indossato)
        let scelto = bottone;
        if (bottone.dataset.modalita === 'indossato' && bottone.classList.contains('selected')) {
            scelto = document.querySelector('.modalita[data-modalita="aperto"]');
        }
        bottoniModalita.forEach(function(b) {
            b.classList.remove('selected');
        });
        scelto.classList.add('selected');
        valoreModalita.textContent = scelto.dataset.nome;
        // l'animazione delle stanghe e della telecamera è in js/visore3d.js
    });
});

// il bottone Scomponi è un interruttore: ogni clic lo accende o lo spegne
// (acceso = occhiale scomposto, e la scritta diventa "Ricomponi")
const bottoneScomponi = document.querySelector('.scomponi');
bottoneScomponi.addEventListener('click', function() {
    const scomposto = bottoneScomponi.classList.toggle('selected');
    bottoneScomponi.textContent = scomposto ? 'Ricomponi' : 'Scomponi';
    bottoneScomponi.setAttribute('aria-pressed', scomposto ? 'true' : 'false');
    // l'animazione dei pezzi è in js/visore3d.js
});
