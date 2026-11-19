// modelli.js: l'elenco di tutti gli occhiali, usato sia da index.html sia da dettaglio.html.
// Le griglie dei modelli e il negozio si costruiscono da qui (vedi js/visore3d.js e js/carrello.js),
// quindi per aggiungere, togliere, rinominare o cambiare prezzo a un modello basta cambiare questo elenco.
//
//   id       = il nome nell'indirizzo della pagina di dettaglio (dettaglio.html?modello=id): senza spazi
//   nome     = il nome del prodotto (inventato), quello che si legge sotto la casella, nel titolo e nel carrello
//   autore   = chi l'ha progettato (vuoto per il mio)
//   prezzo   = il prezzo in euro (inventato)
//   file     = il file 3D (.glb oppure .3dm di Rhino)
//   base     = true se nel file c'è una base cilindrica sotto l'occhiale da togliere
//   nascondi = i pezzi da nascondere, per nome (es. una testa-manichino nel file)
//   stanghe  = false se l'occhiale non ha stanghe (es. una maschera con l'elastico): niente Chiuso/Aperto
//   rotazione = [x, y, z] in gradi, per raddrizzare un modello esportato girato diversamente dagli altri.
//              Il verso giusto: lenti davanti (+Z), stanghe verso -Z, alto verso +Y

export const MODELLI = [
    { id: 'mio',               nome: 'Orbita',    autore: '',                  prezzo: 189, file: 'models/occhiale.3dm', base: true },
    { id: 'giuli',             nome: 'Brina',     autore: 'Giuli',             prezzo: 149, file: 'gls/3d_occhiali_giuli.glb' },
    { id: 'anna-porcellini',   nome: 'Corallo',   autore: 'Anna Porcellini',   prezzo: 169, file: 'gls/AnnaPorcellini.glb' },
    { id: 'eleonora-nobili',   nome: 'Abisso',    autore: 'Eleonora Nobili',   prezzo: 219, file: 'gls/Eleonora_Nobili.glb', stanghe: false },
    { id: 'edoardo-fabbri',    nome: 'Arlecchino', autore: 'Edoardo Fabbri',   prezzo: 135, file: 'gls/fabbri_Edoardo.glb', rotazione: [0, 0, 180] },
    { id: 'federica-cancello', nome: 'Levante',   autore: 'Federica Cancello', prezzo: 179, file: 'gls/federicacancello.glb', nascondi: '^testa' },
    { id: 'giacomo-cerioni',   nome: 'Cristallo', autore: 'Giacomo Cerioni',   prezzo: 239, file: 'gls/giacomocerioni.glb', rotazione: [0, 180, 0] },
    { id: 'luca-giorgetti',    nome: 'Scirocco',  autore: 'Luca Giorgetti',    prezzo: 159, file: 'gls/lucagiorgetti.glb' },
    { id: 'luigi-boccarossa',  nome: 'Ombra',     autore: 'Luigi Boccarossa',  prezzo: 129, file: 'gls/luigiboccarossa.glb' },
    { id: 'valentina-vicinanza', nome: 'Lince',   autore: 'Valentina Vicinanza', prezzo: 199, file: 'gls/valentinavicinanza.glb' }
];

// il prezzo scritto all'italiana: 189 → "189,00 €"
export function formattaPrezzo(euro) {
    return euro.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
}

// le versioni speciali che hanno un prezzo tutto loro (al posto di quello del modello).
//   modello = l'id del modello che ha questa versione
//   colore  = il colore che la riconosce: se un pezzo qualsiasi ce l'ha, si paga il prezzo della versione
export const VERSIONI_SPECIALI = [
    { nome: 'Gargoz', modello: 'mio', colore: 'Grigio a pois rosa', prezzo: 999.99 }
];

// il prezzo di un occhiale con i colori scelti (un elenco di nomi di colore, es. ["Beige", "Azzurro", ...])
export function prezzoDi(voce, nomiColori) {
    const speciale = VERSIONI_SPECIALI.find(function(v) {
        return v.modello === voce.id && nomiColori.indexOf(v.colore) !== -1;
    });
    return speciale ? speciale.prezzo : voce.prezzo;
}

// le lenti da scegliere prima di pagare: la prima è inclusa nel prezzo
export const LENTI = [
    { id: 'standard',      nome: 'Standard',              descrizione: 'Filtro UV400, antigraffio.',                         prezzo: 0 },
    { id: 'polarizzate',   nome: 'Polarizzate',           descrizione: 'Tolgono i riflessi di acqua, neve e asfalto.',       prezzo: 49 },
    { id: 'fotocromatiche', nome: 'Fotocromatiche',       descrizione: 'Si scuriscono al sole e tornano chiare al chiuso.',  prezzo: 79 },
    { id: 'graduate',      nome: 'Graduate',              descrizione: 'Da vista, con la tua prescrizione.',                 prezzo: 129 },
    { id: 'graduate-pol',  nome: 'Graduate polarizzate',  descrizione: 'Da vista e senza riflessi: il meglio dei due mondi.', prezzo: 169 }
];

export function lenteDaId(id) {
    return LENTI.find(function(l) {
        return l.id === id;
    }) || LENTI[0];
}

// i supplementi per le personalizzazioni, dai colori scelti in ordine:
// [lenti, stanga Dx, stanga Sx, nasello, montatura centrale]. Una versione speciale (Gargoz) ha già il suo prezzo
export function personalizzazioniDi(voce, nomiColori) {
    const speciale = VERSIONI_SPECIALI.some(function(v) {
        return v.modello === voce.id && nomiColori.indexOf(v.colore) !== -1;
    });
    if (speciale || nomiColori.length < 5) {
        return [];
    }
    const extra = [];
    const [lenti, stangaDx, stangaSx, nasello, montatura] = nomiColori;
    if (stangaDx !== stangaSx) {
        extra.push({ nome: 'Stanghette di due colori diversi', prezzo: 15 });
    }
    if (nasello !== montatura) {
        extra.push({ nome: 'Nasello in contrasto con la montatura', prezzo: 10 });
    }
    if (stangaDx !== montatura && stangaSx !== montatura) {
        extra.push({ nome: 'Stanghette in contrasto con la montatura', prezzo: 12 });
    }
    const diversi = new Set([stangaDx, stangaSx, nasello, montatura]).size;
    if (diversi >= 3) {
        extra.push({ nome: 'Montatura a ' + diversi + ' colori', prezzo: (diversi - 2) * 8 });
    }
    if (lenti !== 'Grigio antracite') {
        extra.push({ nome: 'Lenti colorate (' + lenti.toLowerCase() + ')', prezzo: 9 });
    }
    return extra;
}

// il totale dei supplementi
export function prezzoPersonalizzazioni(voce, nomiColori) {
    return personalizzazioniDi(voce, nomiColori).reduce(function(somma, p) {
        return somma + p.prezzo;
    }, 0);
}
