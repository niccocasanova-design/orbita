// carrello.js: il negozio (dimostrativo) di Octulus, usato sia da index.html sia da dettaglio.html.
// Lo script aggiunge da solo alla pagina: il tasto "Carrello" nella barra in alto, il prezzo e il tasto
// "Aggiungi al carrello" nel pannello, e la finestra dell'acquisto, in quattro passi come nei negozi Apple:
//   Carrello → Lenti → Consegna → Pagamento → Grazie
// Nel carrello ogni occhiale si salva con i colori scelti pezzo per pezzo e con le lenti.
// Il prezzo di un occhiale = prezzo del modello (o della versione speciale) + personalizzazioni + lenti.
// L'acquisto è solo una prova: nessun pagamento, nessun numero di carta, nessun dato inviato.
import {
    MODELLI, LENTI, formattaPrezzo, prezzoDi, lenteDaId, personalizzazioniDi, prezzoPersonalizzazioni
} from './modelli.js';

const CHIAVE = 'occhiale3d-carrello';   // dove il browser tiene il carrello (resta anche cambiando pagina)

// le consegne e i pagamenti tra cui scegliere
const CONSEGNE = [
    { id: 'standard', nome: 'Standard', descrizione: 'Arriva in 3-5 giorni lavorativi.', prezzo: 0 },
    { id: 'express',  nome: 'Express',  descrizione: 'Arriva domani, se ordini entro le 18.', prezzo: 9 },
    { id: 'negozio',  nome: 'Ritiro in negozio', descrizione: 'Pronto in 2 ore, nel negozio Octulus più vicino.', prezzo: 0 }
];
const PAGAMENTI = [
    { id: 'carta',    nome: 'Carta di credito o di debito', descrizione: 'Paghi in un\'unica soluzione.' },
    { id: 'rate',     nome: 'In 12 rate a tasso zero',      descrizione: 'Una piccola cifra al mese, senza interessi.' },
    { id: 'telefono', nome: 'Pagamento rapido dal telefono', descrizione: 'Confermi con il volto o l\'impronta.' },
    { id: 'bonifico', nome: 'Bonifico bancario',             descrizione: 'Spediamo quando arriva il bonifico.' }
];


// --- il contenuto del carrello: un elenco di righe { chiave, id, colori, versione, lente, quantita } ---
function leggiCarrello() {
    try {
        const salvato = JSON.parse(localStorage.getItem(CHIAVE));
        return Array.isArray(salvato) ? salvato : [];
    } catch (errore) {
        return [];   // navigazione privata o memoria bloccata: il carrello vale solo finché la pagina è aperta
    }
}
let carrello = leggiCarrello();
let consegnaScelta = CONSEGNE[0].id;
let pagamentoScelto = PAGAMENTI[0].id;

function salvaCarrello() {
    try {
        localStorage.setItem(CHIAVE, JSON.stringify(carrello));
    } catch (errore) {
        // niente: il carrello funziona lo stesso, solo non resta salvato
    }
    aggiornaTutto();
}

function modelloDaId(id) {
    return MODELLI.find(function(voce) {
        return voce.id === id;
    });
}

// il modello mostrato ora nel visore (lo scrive js/visore3d.js in body data-modello)
function modelloAttuale() {
    return modelloDaId(document.body.dataset.modello) || MODELLI[0];
}

// i colori scelti ora nel pannello: un elenco { pezzo: "Lenti", nome: "Azzurro", colore: "#7fb3d5" }
function coloriScelti() {
    return Array.from(document.querySelectorAll('.campioni')).map(function(gruppo) {
        const titolo = gruppo.parentElement.querySelector('.opzione-titolo').firstChild.textContent;
        const campione = gruppo.querySelector('.campione.selected');
        return {
            pezzo: titolo.replace(/^\s*\d+\.\s*/, '').trim(),   // "1. Lenti" → "Lenti"
            nome: campione.dataset.nome,
            colore: campione.dataset.color
        };
    });
}

function versioneScelta() {
    const scelta = document.querySelector('.preset.selected');
    return scelta ? scelta.dataset.nome : 'Personalizzata';
}

function nomeDelColore(c) {
    return c.nome;
}

// i prezzi di una riga, pezzo per pezzo
function contiRiga(voce, riga) {
    const nomi = riga.colori.map(nomeDelColore);
    const base = prezzoDi(voce, nomi);
    const extra = prezzoPersonalizzazioni(voce, nomi);
    const lente = lenteDaId(riga.lente);
    return { base: base, extra: extra, lente: lente, unitario: base + extra + lente.prezzo };
}
function prezzoRiga(voce, riga) {
    return contiRiga(voce, riga).unitario;
}

function aggiungiAlCarrello() {
    const voce = modelloAttuale();
    const colori = coloriScelti();
    // lo stesso modello con gli stessi colori diventa una riga sola, con la quantità che aumenta
    const chiave = voce.id + '|' + colori.map(nomeDelColore).join(',');
    const riga = carrello.find(function(r) {
        return r.chiave === chiave;
    });
    if (riga) {
        riga.quantita += 1;
    } else {
        // la foto dell'occhiale così com'è nel visore, con i colori scelti (js/visore3d.js): nel carrello vedi proprio quello che compri
        const foto = window.fotoConfigurazione ? window.fotoConfigurazione() : null;
        carrello.push({ chiave: chiave, id: voce.id, colori: colori, versione: versioneScelta(), lente: LENTI[0].id, quantita: 1, foto: foto });
    }
    salvaCarrello();
    apriCarrello('carrello');
}

function subtotale() {
    return carrello.reduce(function(somma, riga) {
        const voce = modelloDaId(riga.id);
        return somma + (voce ? prezzoRiga(voce, riga) * riga.quantita : 0);
    }, 0);
}
function costoConsegna() {
    return CONSEGNE.find(function(c) {
        return c.id === consegnaScelta;
    }).prezzo;
}
function totale() {
    return subtotale() + (carrello.length ? costoConsegna() : 0);
}

function pezziNelCarrello() {
    return carrello.reduce(function(somma, riga) {
        return somma + riga.quantita;
    }, 0);
}


// --- 1. il tasto "Carrello" nella barra in alto, con il numero di occhiali ---
document.querySelectorAll('.pr-nav-dentro').forEach(function(barra) {
    const tasto = document.createElement('button');
    tasto.type = 'button';
    tasto.className = 'pr-nav-carrello';
    tasto.setAttribute('aria-label', 'Carrello');
    // la sagoma del carrello della spesa, disegnata in SVG, con il numero di occhiali sopra
    tasto.innerHTML = '<svg class="pr-nav-carrello-icona" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 3.5h2.6l2.4 11.2a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.2l1.7-7.3H6.2"/><circle cx="9.6" cy="20" r="1.4"/><circle cx="17.4" cy="20" r="1.4"/></svg>' +
        '<span class="pr-nav-carrello-testo">Carrello</span> <span class="pr-nav-conteggio" aria-label="occhiali nel carrello">0</span>';
    tasto.addEventListener('click', function() {
        apriCarrello('carrello');
    });
    barra.insertBefore(tasto, barra.querySelector('.pr-nav-azione'));
});


// --- 2. nel pannello: il prezzo sotto il nome, le personalizzazioni a pagamento e "Aggiungi al carrello" ---
const pannello = document.querySelector('.pannello');
let prezzoPannello = null;
let extraPannello = null;
if (pannello) {
    prezzoPannello = document.createElement('p');
    prezzoPannello.className = 'pannello-prezzo';
    pannello.querySelector('.font-3').after(prezzoPannello);

    const acquisto = document.createElement('div');
    acquisto.className = 'pr pannello-acquisto';
    acquisto.innerHTML =
        '<ul class="pannello-extra"></ul>' +
        '<button type="button" class="pr-bottone pannello-aggiungi">Aggiungi al carrello</button>' +
        '<p class="pannello-nota">Le lenti le scegli nel passo successivo. Spedizione e resi gratuiti.</p>';
    acquisto.querySelector('.pannello-aggiungi').addEventListener('click', aggiungiAlCarrello);
    extraPannello = acquisto.querySelector('.pannello-extra');
    pannello.appendChild(acquisto);
}

function aggiornaPrezzoPannello() {
    if (!prezzoPannello) {
        return;
    }
    const voce = modelloAttuale();
    const nomi = coloriScelti().map(nomeDelColore);
    const extra = personalizzazioniDi(voce, nomi);
    prezzoPannello.textContent = formattaPrezzo(prezzoDi(voce, nomi) + prezzoPersonalizzazioni(voce, nomi));
    extraPannello.innerHTML = '';
    extra.forEach(function(p) {
        const li = document.createElement('li');
        li.append(testo('span', p.nome), testo('span', '+ ' + formattaPrezzo(p.prezzo)));
        extraPannello.appendChild(li);
    });
    extraPannello.hidden = extra.length === 0;
}
// quando js/visore3d.js carica un altro modello, aggiorno il prezzo
document.addEventListener('modellocambiato', aggiornaPrezzoPannello);
// e anche quando cambio un colore o una versione (il clic arriva qui dopo che il pannello ha cambiato la scelta)
document.addEventListener('click', function(evento) {
    if (evento.target.closest('.campione, .preset')) {
        aggiornaPrezzoPannello();
    }
});

// un elemento con dentro solo testo (con textContent: i dati salvati non diventano mai HTML)
function testo(tag, contenuto, classe) {
    const e = document.createElement(tag);
    e.textContent = contenuto;
    if (classe) {
        e.className = classe;
    }
    return e;
}


// --- 3. la finestra dell'acquisto ---
const PASSI = ['carrello', 'lenti', 'consegna', 'pagamento'];
const finestra = document.createElement('dialog');
finestra.className = 'pr carrello';
finestra.setAttribute('aria-labelledby', 'carrello-titolo');
finestra.innerHTML = `
  <div class="carrello-dentro">
    <div class="carrello-testa">
        <span class="carrello-marchio"><img src="img/octulus.svg" alt="" width="28" height="28"> Octulus</span>
        <ol class="carrello-tappe" aria-label="I passi dell'acquisto">
            <li data-tappa="carrello">Carrello</li>
            <li data-tappa="lenti">Lenti</li>
            <li data-tappa="consegna">Consegna</li>
            <li data-tappa="pagamento">Pagamento</li>
        </ol>
        <button type="button" class="carrello-chiudi" aria-label="Chiudi">Chiudi</button>
    </div>

    <!-- CARRELLO -->
    <div class="carrello-passo" data-passo="carrello">
        <h2 id="carrello-titolo" class="carrello-grande">Il totale del tuo carrello è <span class="carrello-subtotale"></span>.</h2>
        <p class="carrello-sotto">Spedizione e resi gratuiti su tutti gli ordini.</p>
        <button type="button" class="pr-bottone carrello-avanti carrello-in-alto" data-vai="lenti">Procedi</button>
        <ul class="carrello-righe"></ul>
        <button type="button" class="carrello-svuota">Svuota il carrello</button>
        <p class="carrello-vuoto">Il tuo carrello è vuoto. Scegli un occhiale, dagli i tuoi colori e aggiungilo.</p>
        <div class="carrello-conti">
            <p><span>Subtotale</span><span class="carrello-subtotale"></span></p>
            <p><span>Spedizione</span><span>Gratuita</span></p>
            <p class="carrello-totale"><span>Totale</span><span class="carrello-subtotale"></span></p>
            <p class="carrello-rate"></p>
            <button type="button" class="pr-bottone carrello-avanti" data-vai="lenti">Procedi</button>
        </div>
    </div>

    <!-- LENTI -->
    <div class="carrello-passo carrello-con-riepilogo" data-passo="lenti" hidden>
        <div class="carrello-principale">
            <h2 class="carrello-grande">Che lenti vuoi?</h2>
            <p class="carrello-sotto">Le standard sono incluse. Puoi sceglierne di diverse per ogni occhiale.</p>
            <div class="carrello-scelte-lenti"></div>
            <div class="carrello-bottoni">
                <button type="button" class="carrello-indietro" data-vai="carrello">Torna al carrello</button>
                <button type="button" class="pr-bottone carrello-avanti" data-vai="consegna">Continua</button>
            </div>
        </div>
        <aside class="carrello-riepilogo"></aside>
    </div>

    <!-- CONSEGNA -->
    <form class="carrello-passo carrello-con-riepilogo" data-passo="consegna" hidden>
        <div class="carrello-principale">
            <h2 class="carrello-grande">Dove te li mandiamo?</h2>
            <fieldset class="carrello-tessere" data-scelta="consegna"><legend>Consegna</legend></fieldset>
            <div class="carrello-campi">
                <label>Nome<input name="nome" autocomplete="given-name" required></label>
                <label>Cognome<input name="cognome" autocomplete="family-name" required></label>
                <label class="largo">Indirizzo<input name="indirizzo" autocomplete="street-address" required></label>
                <label>CAP<input name="cap" autocomplete="postal-code" inputmode="numeric" pattern="[0-9]{5}" required></label>
                <label>Città<input name="citta" autocomplete="address-level2" required></label>
                <label class="largo">Email<input name="email" type="email" autocomplete="email" required></label>
            </div>
            <div class="carrello-bottoni">
                <button type="button" class="carrello-indietro" data-vai="lenti">Torna alle lenti</button>
                <button type="submit" class="pr-bottone">Continua con il pagamento</button>
            </div>
        </div>
        <aside class="carrello-riepilogo"></aside>
    </form>

    <!-- PAGAMENTO -->
    <div class="carrello-passo carrello-con-riepilogo" data-passo="pagamento" hidden>
        <div class="carrello-principale">
            <h2 class="carrello-grande">Come vuoi pagare?</h2>
            <fieldset class="carrello-tessere" data-scelta="pagamento"><legend>Pagamento</legend></fieldset>
            <p class="carrello-avviso">Questo è un negozio dimostrativo: non ti chiediamo nessun numero di carta, non paghi nulla e nessun dato viene inviato.</p>
            <div class="carrello-bottoni">
                <button type="button" class="carrello-indietro" data-vai="consegna">Torna alla consegna</button>
                <button type="button" class="pr-bottone carrello-conferma">Ordina ora</button>
            </div>
        </div>
        <aside class="carrello-riepilogo"></aside>
    </div>

    <!-- GRAZIE -->
    <div class="carrello-passo carrello-grazie" data-passo="grazie" hidden>
        <img src="img/octulus.svg" alt="" width="120" height="120">
        <h2 class="carrello-grande">Grazie, il tuo ordine è confermato.</h2>
        <p>Numero d'ordine <strong class="carrello-numero"></strong>. Ti abbiamo scritto (per finta) a <span class="carrello-email"></span>.</p>
        <p class="carrello-avviso">Nessun pagamento è stato effettuato: è una dimostrazione.</p>
        <button type="button" class="pr-bottone carrello-continua">Continua a guardare</button>
    </div>
  </div>
`;
document.body.appendChild(finestra);

const righe = finestra.querySelector('.carrello-righe');
const moduloConsegna = finestra.querySelector('form[data-passo="consegna"]');

function mostraPasso(nome) {
    finestra.querySelectorAll('.carrello-passo').forEach(function(passo) {
        passo.hidden = passo.dataset.passo !== nome;
    });
    // le tappe in alto: quella attuale accesa, quelle già fatte spuntate
    const qui = PASSI.indexOf(nome);
    finestra.querySelector('.carrello-tappe').hidden = nome === 'grazie';
    finestra.querySelectorAll('.carrello-tappe li').forEach(function(li, i) {
        li.classList.toggle('fatta', qui === -1 || i < qui);
        li.classList.toggle('attuale', i === qui);
    });
    finestra.scrollTop = 0;
}

function apriCarrello(passo) {
    aggiornaTutto();
    mostraPasso(passo);
    if (!finestra.open) {
        finestra.showModal();
    }
}

// le tessere da scegliere (lenti, consegna, pagamento): dei radio con l'aspetto di riquadri
function tessere(contenitore, nomeGruppo, opzioni, scelta, alCambio, conPrezzo) {
    contenitore.querySelectorAll('label').forEach(function(l) {
        l.remove();
    });
    opzioni.forEach(function(o) {
        const tessera = document.createElement('label');
        tessera.className = 'carrello-tessera';
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = nomeGruppo;
        radio.value = o.id;
        radio.checked = o.id === scelta;
        radio.addEventListener('change', function() {
            alCambio(o.id);
        });
        const testi = document.createElement('span');
        testi.append(testo('strong', o.nome), testo('small', o.descrizione));
        tessera.append(radio, testi);
        if (conPrezzo) {
            tessera.append(testo('span', o.prezzo ? '+ ' + formattaPrezzo(o.prezzo) : 'Incluso', 'carrello-tessera-prezzo'));
        }
        contenitore.appendChild(tessera);
    });
}

// i pallini con i colori di una riga
function pallini(colori) {
    const contenitore = document.createElement('span');
    contenitore.className = 'pr-pallini';
    colori.forEach(function(c) {
        const pallino = document.createElement('i');
        const pois = /^pois:(#[0-9a-f]{6}):(#[0-9a-f]{6})$/i.exec(c.colore);
        if (pois) {
            // il grigio a pois rosa di Gargoz: un fondo con dei puntini
            pallino.style.background = 'radial-gradient(' + pois[2] + ' 30%, transparent 33%) 0 0 / 5px 5px, ' + pois[1];
        } else {
            pallino.style.background = c.colore;
        }
        pallino.title = c.pezzo + ': ' + c.nome;
        contenitore.appendChild(pallino);
    });
    return contenitore;
}

// una riga "nome ......... prezzo"
function voceConto(nome, valore, classe) {
    const p = document.createElement('p');
    if (classe) {
        p.className = classe;
    }
    p.append(testo('span', nome), testo('span', valore));
    return p;
}

// la foto di un occhiale: quella della galleria; per Orbita, se la galleria non è ancora pronta, la foto in apertura
function fotoDi(id, riga) {
    if (riga && riga.foto) {
        return riga.foto;   // la foto scattata quando l'hai aggiunto, con i tuoi colori
    }
    if (riga) {
        return null;   // una riga salvata senza foto: meglio solo i pallini che una foto con colori diversi
    }
    if (window.fotoOcchiali && window.fotoOcchiali[id]) {
        return window.fotoOcchiali[id];
    }
    const eroe = document.querySelector('.pr-scatto-eroe');
    if (id === 'mio' && eroe && eroe.naturalWidth > 1) {
        return eroe.src;
    }
    return null;
}
// quando arriva una nuova foto, ridisegno le righe
document.addEventListener('fotoocchiale', function() {
    disegnaRighe();
});

// il carrello: una riga grande per ogni occhiale
function disegnaRighe() {
    righe.innerHTML = '';
    carrello.forEach(function(riga, indice) {
        const voce = modelloDaId(riga.id);
        if (!voce) {
            return;   // un modello tolto dall'elenco
        }
        const conti = contiRiga(voce, riga);
        const li = document.createElement('li');
        li.className = 'carrello-riga';

        const icona = document.createElement('div');
        icona.className = 'carrello-riga-icona';
        // la foto dell'occhiale (il mockup della galleria, da js/visore3d.js); sotto, i colori scelti
        const foto = fotoDi(voce.id, riga);
        if (foto) {
            const img = document.createElement('img');
            img.src = foto;
            img.alt = voce.nome;
            icona.appendChild(img);
            icona.classList.add('con-foto');
        }
        icona.appendChild(pallini(riga.colori));

        const testoRiga = document.createElement('div');
        testoRiga.className = 'carrello-riga-testo';
        testoRiga.append(
            testo('strong', voce.nome + (riga.versione !== 'Personalizzata' ? ' ' + riga.versione : '')),
            testo('span', (voce.autore ? 'Progetto di ' + voce.autore + ' · ' : '') + riga.colori.map(function(c) {
                return c.pezzo + ' ' + c.nome.toLowerCase();
            }).join(', '), 'carrello-riga-colori')
        );
        // il dettaglio del prezzo: base, personalizzazioni, lenti
        const dettaglio = document.createElement('div');
        dettaglio.className = 'carrello-riga-dettaglio';
        dettaglio.append(voceConto(riga.versione === 'Gargoz' ? 'Versione Gargoz' : 'Occhiale', formattaPrezzo(conti.base)));
        personalizzazioniDi(voce, riga.colori.map(nomeDelColore)).forEach(function(p) {
            dettaglio.append(voceConto(p.nome, '+ ' + formattaPrezzo(p.prezzo)));
        });
        dettaglio.append(voceConto('Lenti ' + conti.lente.nome.toLowerCase(), conti.lente.prezzo ? '+ ' + formattaPrezzo(conti.lente.prezzo) : 'Incluse'));
        testoRiga.append(dettaglio);

        // a destra: la quantità (un menu, come nei negozi Apple), il prezzo e "Rimuovi"
        const destra = document.createElement('div');
        destra.className = 'carrello-riga-destra';
        const quantita = document.createElement('select');
        quantita.className = 'carrello-quantita';
        quantita.setAttribute('aria-label', 'Quantità');
        for (let n = 1; n <= Math.max(10, riga.quantita); n++) {
            const opzione = testo('option', String(n));
            opzione.value = n;
            opzione.selected = n === riga.quantita;
            quantita.appendChild(opzione);
        }
        quantita.addEventListener('change', function() {
            riga.quantita = Number(quantita.value);
            salvaCarrello();
        });
        const togli = document.createElement('button');
        togli.type = 'button';
        togli.className = 'carrello-togli';
        togli.setAttribute('aria-label', 'Rimuovi ' + voce.nome + ' dal carrello');
        togli.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 12.5h9l1-12.5M10 11v5M14 11v5"/></svg> Rimuovi';
        togli.addEventListener('click', function() {
            carrello.splice(indice, 1);
            salvaCarrello();
        });
        destra.append(quantita, testo('span', formattaPrezzo(conti.unitario * riga.quantita), 'carrello-riga-prezzo'), togli);

        li.append(icona, testoRiga, destra);
        righe.appendChild(li);
    });
}

// il passo Lenti: per ogni occhiale, le tessere delle lenti
function disegnaLenti() {
    const contenitore = finestra.querySelector('.carrello-scelte-lenti');
    contenitore.innerHTML = '';
    carrello.forEach(function(riga, indice) {
        const voce = modelloDaId(riga.id);
        if (!voce) {
            return;
        }
        const gruppo = document.createElement('fieldset');
        gruppo.className = 'carrello-tessere';
        gruppo.appendChild(testo('legend', voce.nome + (riga.quantita > 1 ? ' × ' + riga.quantita : '')));
        tessere(gruppo, 'lente-' + indice, LENTI, riga.lente || LENTI[0].id, function(id) {
            riga.lente = id;
            salvaCarrello();
        }, true);
        contenitore.appendChild(gruppo);
    });
}

// il riepilogo a destra nei passi Lenti, Consegna e Pagamento
function disegnaRiepiloghi() {
    finestra.querySelectorAll('.carrello-riepilogo').forEach(function(aside) {
        aside.innerHTML = '';
        aside.appendChild(testo('h3', 'Riepilogo'));
        carrello.forEach(function(riga) {
            const voce = modelloDaId(riga.id);
            if (voce) {
                aside.appendChild(voceConto(riga.quantita + ' × ' + voce.nome + ' · lenti ' + lenteDaId(riga.lente).nome.toLowerCase(),
                    formattaPrezzo(prezzoRiga(voce, riga) * riga.quantita)));
            }
        });
        aside.appendChild(voceConto('Subtotale', formattaPrezzo(subtotale()), 'carrello-separa'));
        const consegna = costoConsegna();
        aside.appendChild(voceConto('Consegna', consegna ? formattaPrezzo(consegna) : 'Gratuita'));
        aside.appendChild(voceConto('Totale', formattaPrezzo(totale()), 'carrello-totale'));
        aside.appendChild(testo('p', 'Oppure ' + formattaPrezzo(totale() / 12) + ' al mese per 12 mesi, a tasso zero.', 'carrello-rate'));
    });
}

function aggiornaTutto() {
    disegnaRighe();
    disegnaLenti();
    disegnaRiepiloghi();
    const vuoto = carrello.length === 0;
    finestra.querySelector('.carrello-vuoto').hidden = !vuoto;
    finestra.querySelector('.carrello-conti').hidden = vuoto;
    finestra.querySelector('.carrello-in-alto').hidden = vuoto;
    finestra.querySelector('.carrello-svuota').hidden = vuoto;
    finestra.querySelectorAll('.carrello-subtotale').forEach(function(e) {
        e.textContent = formattaPrezzo(subtotale());
    });
    finestra.querySelector('.carrello-conti .carrello-rate').textContent =
        'Oppure ' + formattaPrezzo(subtotale() / 12) + ' al mese per 12 mesi, a tasso zero.';
    document.querySelectorAll('.pr-nav-conteggio').forEach(function(conteggio) {
        conteggio.textContent = pezziNelCarrello();
        conteggio.hidden = pezziNelCarrello() === 0;
    });
}

// le tessere di consegna e pagamento
tessere(finestra.querySelector('[data-scelta="consegna"]'), 'consegna', CONSEGNE, consegnaScelta, function(id) {
    consegnaScelta = id;
    disegnaRiepiloghi();
}, true);
tessere(finestra.querySelector('[data-scelta="pagamento"]'), 'pagamento', PAGAMENTI, pagamentoScelto, function(id) {
    pagamentoScelto = id;
}, false);

// i bottoni avanti / indietro tra i passi
finestra.addEventListener('click', function(evento) {
    const vai = evento.target.closest('[data-vai]');
    if (vai && !(vai.type === 'submit')) {
        mostraPasso(vai.dataset.vai);
    }
    // clic sul fondo scuro fuori dalla finestra: la chiude
    if (evento.target === finestra) {
        finestra.close();
    }
});
// la consegna è un modulo: il browser controlla da solo i campi obbligatori prima di andare avanti
moduloConsegna.addEventListener('submit', function(evento) {
    evento.preventDefault();
    mostraPasso('pagamento');
});
// svuota tutto il carrello in un colpo (con una conferma, perché non si torna indietro)
finestra.querySelector('.carrello-svuota').addEventListener('click', function() {
    if (window.confirm('Vuoi togliere tutti gli occhiali dal carrello?')) {
        carrello = [];
        salvaCarrello();
    }
});
finestra.querySelector('.carrello-chiudi').addEventListener('click', function() {
    finestra.close();
});
finestra.querySelector('.carrello-conferma').addEventListener('click', function() {
    // un numero d'ordine di fantasia; i dati del modulo restano nella pagina e poi si cancellano
    finestra.querySelector('.carrello-numero').textContent = 'OC-' + Math.floor(100000 + Math.random() * 900000);
    finestra.querySelector('.carrello-email').textContent = moduloConsegna.elements.email.value;
    moduloConsegna.reset();
    carrello = [];
    salvaCarrello();
    mostraPasso('grazie');
});
finestra.querySelector('.carrello-continua').addEventListener('click', function() {
    finestra.close();
});

// se il carrello cambia in un'altra scheda del sito, lo aggiorno anche qui
window.addEventListener('storage', function(evento) {
    if (evento.key === CHIAVE) {
        carrello = leggiCarrello();
        aggiornaTutto();
    }
});

aggiornaTutto();
aggiornaPrezzoPannello();
