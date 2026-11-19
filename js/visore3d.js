import * as THREE from 'three';
// OrbitControls: permette di ruotare la vista trascinando con il mouse (o con il dito)
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// Rhino3dmLoader: legge direttamente i file di Rhino (.3dm)
import { Rhino3dmLoader } from 'three/addons/loaders/3DMLoader.js';
// GLTFLoader: legge i file .glb / .gltf, il formato più usato per i modelli 3D sul web
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// RoomEnvironment: una stanza virtuale che le superfici (soprattutto il metallo) possono riflettere
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
// l'elenco di tutti gli occhiali (lo stesso per la home e per la pagina di dettaglio)
import { MODELLI, formattaPrezzo } from './modelli.js';

const visore = document.querySelector('#visore');
const avvisoVisore = document.querySelector('.visore-segnaposto');   // la scritta "Carico il modello…"

// 1. la scena: il "mondo" che contiene gli oggetti
const scena = new THREE.Scene();

// 2. la camera: da dove guardiamo la scena
const camera = new THREE.PerspectiveCamera(45, visore.clientWidth / visore.clientHeight, 0.1, 100);
camera.position.set(3, 2, 4);
camera.lookAt(0, 0, 0);

// 3. il renderer: disegna la scena in un <canvas> dentro il visore
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(visore.clientWidth, visore.clientHeight);
visore.appendChild(renderer.domElement);

// accendo le ombre nel renderer (sono spente di default perché costano calcoli)
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;   // ombre con i bordi sfumati (la sfumatura si regola con shadow.radius)

// 4. le luci: senza luce un materiale "standard" resta nero
// luce ambiente e luce bianca illuminano l'occhiale da tutti i lati,
// il faretto dall'alto gli dà luce e ombra
scena.add(new THREE.AmbientLight(0xffffff, 0.5));
const luce = new THREE.DirectionalLight(0xffffff, 1.0);
luce.position.set(3, 5, 4);
scena.add(luce);

// lo sfondo: una "stanza" a forma di grande sfera vista dall'interno (BackSide = si vede la faccia interna),
// così la luce la illumina e l'ombra dell'occhiale ci cade sopra.
// È una sfera intera e non pavimento + cupola: in questo modo si può girare anche sotto l'occhiale
// e guardarlo dal basso senza che un pavimento copra la vista
const stanza = new THREE.Mesh(
    new THREE.SphereGeometry(10, 64, 32),
    new THREE.MeshStandardMaterial({ color: '#050705', side: THREE.BackSide })   // quasi nera, come il resto del sito
);
// la alzo un po': il fondo della sfera fa da "pavimento" a 7 unità sotto l'occhiale
stanza.position.y = 3;
stanza.receiveShadow = true;
scena.add(stanza);

// i riflessi: una stanza virtuale che le superfici riflettono. Senza, il metallo sembrerebbe nero
// (un metallo non ha colore suo: mostra quello che ha intorno)
const generatoreRiflessi = new THREE.PMREMGenerator(renderer);
const riflessi = generatoreRiflessi.fromScene(new RoomEnvironment(), 0.04).texture;
scena.environment = riflessi;
scena.environmentIntensity = 0.6;

// la luce dall'alto: un faretto sopra l'occhiale, puntato su di lui (come una luce di allestimento in mostra).
// Proietta l'ombra dell'occhiale sul fondo della stanza
const luceAlto = new THREE.SpotLight(
    0xffffff,        // bianco neutro
    150,             // intensità
    0,               // distanza massima: 0 = nessun limite
    Math.PI / 8,     // apertura del cono (22° dal centro): abbastanza per coprire tutto l'occhiale
    0.5,             // penombra: bordo sfumato
    2                // si indebolisce allontanandosi, come nella realtà
);
luceAlto.position.set(0, 6, 0);           // 6 unità sopra l'occhiale
luceAlto.target.position.set(0, 0, 0);    // al centro dell'occhiale
scena.add(luceAlto);
scena.add(luceAlto.target);
luceAlto.castShadow = true;
luceAlto.shadow.mapSize.set(1024, 1024);   // risoluzione dell'ombra: più alta = bordi più precisi
luceAlto.shadow.radius = 4;                // sfumatura del bordo dell'ombra
luceAlto.shadow.camera.near = 0.5;
luceAlto.shadow.camera.far = 20;           // la stanza è piccola: bastano 20 unità
luceAlto.shadow.bias = -0.0002;            // correzioni minime per evitare righe sulle superfici
luceAlto.shadow.normalBias = 0.01;

// il cono davanti all'occhiale (modalità Indossato), oltre le lenti: bianco, così si vede bene
// come lo colorano le lenti. La sua altezza la sistemo ogni volta che carico un modello
const cono = new THREE.Mesh(
    new THREE.ConeGeometry(1.3, 3.2, 64),
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, transparent: true, opacity: 0 })
);
cono.position.set(0, 0, 7);   // 7 unità davanti all'occhiale, nella direzione in cui guarda chi lo indossa
cono.castShadow = true;
cono.visible = false;
scena.add(cono);

// 5. i controlli: tenendo premuto e trascinando dentro il visore si ruota attorno all'occhiale
const controlli = new OrbitControls(camera, renderer.domElement);
controlli.target.set(0, 0, 0);   // la camera gira attorno al centro dell'occhiale
controlli.enableDamping = true;   // la rotazione rallenta dolcemente quando si lascia il mouse
// zoom con la rotella del mouse (o con due dita) dentro il visore, entro dei limiti:
// non troppo vicino (si entrerebbe nell'occhiale) e non troppo lontano (si uscirebbe dalla stanza)
controlli.enableZoom = true;
controlli.minDistance = 2;
controlli.maxDistance = 6.5;
controlli.enablePan = false;      // niente spostamento laterale: l'occhiale resta al centro
controlli.autoRotate = false;     // niente rotazione automatica: l'occhiale si gira solo trascinando
// rotazione anche in verticale: si può girare dall'alto (0) fino a sotto l'occhiale (Math.PI)
controlli.minPolarAngle = 0;
controlli.maxPolarAngle = Math.PI;

// il cursore a "mano" suggerisce che l'occhiale si può afferrare
// (solo quando nel riquadro grande c'è la vista 3D: le viste fisse non si trascinano)
renderer.domElement.style.cursor = 'grab';
renderer.domElement.addEventListener('pointerdown', function() {
    if (controlli.enabled) {
        renderer.domElement.style.cursor = 'grabbing';
    }
});
window.addEventListener('pointerup', function() {
    if (controlli.enabled) {
        renderer.domElement.style.cursor = 'grab';
    }
});


// ===================================================================================
// 6. CARICARE E PREPARARE UN MODELLO
// I modelli sono le voci di js/modelli.js: file è il file, base toglie la base cilindrica,
// nascondi nasconde i pezzi con quel nome (es. una testa)
// ===================================================================================

// Rhino3dmLoader usa rhino3dm, la libreria ufficiale di McNeel che legge i .3dm senza Rhino
const caricatore3dm = new Rhino3dmLoader();
caricatore3dm.setLibraryPath('https://cdn.jsdelivr.net/npm/rhino3dm@8.4.0/');
const caricatoreGlb = new GLTFLoader();

// legge il file: .3dm con il lettore di Rhino, tutto il resto (.glb) con quello glTF
async function leggiFile(file) {
    if (file.toLowerCase().endsWith('.3dm')) {
        const modello = await caricatore3dm.loadAsync(file);
        // Rhino ha l'asse Z verso l'alto, Three.js l'asse Y: giro il modello di 90° per raddrizzarlo
        // (i .glb esportati da Rhino sono già girati giusti)
        modello.rotation.x = -Math.PI / 2;
        return { radice: modello, livelli: modello.userData.layers || [] };
    }
    const dati = await caricatoreGlb.loadAsync(file);
    return { radice: dati.scene, livelli: [] };
}

// nel mio .3dm c'è una base cilindrica sotto l'occhiale: la riconosco dalla forma e la tolgo.
// La base è il pezzo più in basso di tutti: tocca il fondo del modello (l'occhiale ci sta appoggiato sopra,
// quindi non ci arriva), ha la pianta rotonda (larghezza ≈ profondità) ed è abbastanza grande
// (così non tolgo per sbaglio pezzi piccoli e tondi, come i naselli).
// Se la base è fatta di più pezzi (fianco, coperchio...), tolgo anche quelli con lo stesso centro e la stessa pianta
function togliBase(occhiale, parti) {
    occhiale.updateMatrixWorld(true);
    const scatolaTutto = new THREE.Box3().setFromObject(occhiale);
    const misuraTutto = scatolaTutto.getSize(new THREE.Vector3());
    const latoMassimo = Math.max(misuraTutto.x, misuraTutto.z);
    const tolleranza = 0.02 * misuraTutto.y;   // "tocca il fondo" = a meno del 2% dell'altezza dal fondo

    const info = parti.map(function(parte) {
        const s = new THREE.Box3().setFromObject(parte);
        const m = s.getSize(new THREE.Vector3());
        return {
            parte: parte,
            scatola: s,
            centro: s.getCenter(new THREE.Vector3()),
            pianta: Math.max(m.x, m.z),
            rotonda: Math.abs(m.x - m.z) <= 0.2 * Math.max(m.x, m.z)
        };
    });
    const basi = info.filter(function(i) {
        return i.rotonda && i.pianta >= 0.15 * latoMassimo && i.scatola.min.y <= scatolaTutto.min.y + tolleranza;
    });
    const pezziDellaBase = info.filter(function(i) {
        return basi.some(function(b) {
            const stessoCentro = Math.hypot(i.centro.x - b.centro.x, i.centro.z - b.centro.z) <= 0.1 * b.pianta;
            const stessaPianta = Math.abs(i.pianta - b.pianta) <= 0.2 * b.pianta;
            const nonSopra = i.scatola.max.y <= b.scatola.max.y + tolleranza;
            return i === b || (i.rotonda && stessoCentro && stessaPianta && nonSopra);
        });
    });
    pezziDellaBase.forEach(function(i) {
        i.parte.removeFromParent();
        parti.splice(parti.indexOf(i.parte), 1);
    });
    console.log('Base tolta: ' + pezziDellaBase.length + ' pezzi');
}

// carica un modello, tiene solo le superfici, lo misura e lo mette al centro della scena.
// Restituisce il gruppo "occhiale" (non ancora aggiunto alla scena) e l'elenco delle sue parti 3D
async function preparaModello(voce) {
    const { radice, livelli } = await leggiFile(voce.file);
    const nascondi = voce.nascondi ? new RegExp(voce.nascondi, 'i') : null;

    // tolgo curve, punti e testi del disegno (quote, tavole, Make2D...) e i pezzi da nascondere
    const daTogliere = [];
    radice.traverse(function(oggetto) {
        const daNascondere = nascondi && oggetto !== radice && nascondi.test(oggetto.name || '');
        if (oggetto.isLine || oggetto.isPoints || oggetto.isSprite || daNascondere) {
            daTogliere.push(oggetto);
        }
    });
    daTogliere.forEach(function(oggetto) {
        oggetto.removeFromParent();
    });

    const parti = [];
    radice.traverse(function(oggetto) {
        if (oggetto.isMesh) {
            oggetto.castShadow = true;      // ogni parte proietta la sua ombra
            oggetto.receiveShadow = true;   // e riceve quelle delle altre parti
            parti.push(oggetto);
        }
    });

    // alcuni modelli sono stati esportati girati (lenti dietro, sottosopra...): li raddrizzo con
    // la rotazione scritta in js/modelli.js, così tutti hanno lo stesso verso
    const raddrizza = new THREE.Group();
    if (voce.rotazione) {
        raddrizza.rotation.set(
            THREE.MathUtils.degToRad(voce.rotazione[0]),
            THREE.MathUtils.degToRad(voce.rotazione[1]),
            THREE.MathUtils.degToRad(voce.rotazione[2])
        );
    }
    raddrizza.add(radice);
    const occhiale = new THREE.Group();
    occhiale.add(raddrizza);
    if (voce.base) {
        togliBase(occhiale, parti);
    }

    // non so in che unità è il file (mm, m...) né dove si trova: misuro il modello e lo ingrandisco
    // in modo che il lato più lungo sia di 3 unità, poi lo metto al centro della scena
    occhiale.updateMatrixWorld(true);
    const scatola = new THREE.Box3().setFromObject(occhiale);
    const misura = scatola.getSize(new THREE.Vector3());
    const scala = 3 / Math.max(misura.x, misura.y, misura.z);
    occhiale.scale.set(scala, scala, scala);
    occhiale.position.copy(scatola.getCenter(new THREE.Vector3()).multiplyScalar(-scala));
    occhiale.updateMatrixWorld(true);

    preparaMateriali(parti);
    // misuraFile = le misure vere nel file (nelle sue unità), per le specifiche della presentazione
    return { occhiale: occhiale, parti: parti, livelli: livelli, misuraFile: misura.clone() };
}

// ogni parte ha il suo materiale: nei file più parti possono condividerne uno, e colorarne una
// colorerebbe anche le altre. Il "vetro" di Rhino (trasmissione) lo trasformo in una semplice
// trasparenza: è molto più leggero da disegnare e funziona anche nelle caselle piccole
function preparaMateriali(parti) {
    parti.forEach(function(parte) {
        if (Array.isArray(parte.material)) {
            parte.material = parte.material[0];   // raro: una parte con più materiali, tengo il primo
        }
        const materiale = parte.material.clone();
        const trasmissione = materiale.transmission || 0;
        parte.userData.eraTrasparente = trasmissione > 0 || materiale.transparent || materiale.opacity < 1;
        if (trasmissione > 0) {
            materiale.transmission = 0;
            materiale.transparent = true;
            materiale.opacity = Math.min(materiale.opacity, 1 - 0.5 * trasmissione);
        }
        parte.material = materiale;
    });
}

// libera la memoria della scheda grafica quando un modello non serve più
function liberaModello(occhiale) {
    occhiale.traverse(function(oggetto) {
        if (oggetto.isMesh) {
            oggetto.geometry.dispose();
            if (oggetto.material.map) {
                oggetto.material.map.dispose();
            }
            oggetto.material.dispose();
        }
    });
}


// ===================================================================================
// 7. RICONOSCERE I PEZZI: lenti, stanga-dx, stanga-sx, nasello, montatura
// (sono i data-pezzo dei gruppi di colore nel pannello)
// ===================================================================================

// il nome dell'oggetto (con quelli dei gruppi che lo contengono) e quello del livello di Rhino, se ci sono
function nomiParte(parte, radice, livelli) {
    const attributi = parte.userData.attributes || {};
    const nomi = [];
    let o = parte;
    while (o && o !== radice) {
        if (o.name) nomi.push(o.name);
        o = o.parent;
    }
    if (attributi.name) nomi.push(attributi.name);
    const livello = livelli[attributi.layerIndex];
    return {
        oggetto: nomi.join(' / '),
        livello: livello ? (livello.fullPath || livello.name || '') : '',
        materiale: parte.material.name || ''
    };
}

// 1. prima provo con i nomi: se un oggetto, un livello o un materiale si chiama "lente", "stanga dx"... uso quello
function pezzoDalNome(testo) {
    const t = testo.toLowerCase();
    if (/lent|lens/.test(t)) return 'lenti';
    if (/nasel|naso|nose|pad|ponte|bridge|gomma/.test(t)) return 'nasello';
    if (/stang|\bast[ae]\b|temple|\barms?\b/.test(t)) {
        if (/dx|destr|right|\br\b/.test(t)) return 'stanga-dx';
        if (/sx|sinistr|left|\bl\b/.test(t)) return 'stanga-sx';
        return 'stanga';   // stanga senza lato: il lato lo decido dalla posizione
    }
    if (/montat|frame|front|cornic|struttur/.test(t)) return 'montatura';
    return null;
}

function dividiInPezzi(occhiale, parti, livelli) {
    // l'occhiale guarda verso +Z e le stanghe vanno verso -Z. Chi lo indossa guarda verso +Z,
    // quindi la sua destra è verso -X
    const scatolaOcchiale = new THREE.Box3().setFromObject(occhiale);
    const misuraOcchiale = scatolaOcchiale.getSize(new THREE.Vector3());
    const centroOcchiale = scatolaOcchiale.getCenter(new THREE.Vector3());
    // la trasparenza indica una lente solo se riguarda una minoranza dei pezzi:
    // ci sono occhiali tutti trasparenti, e lì non vuol dire niente
    const trasparenti = parti.filter(function(p) {
        return p.userData.eraTrasparente;
    }).length;
    const trasparenzaSignificativa = trasparenti > 0 && trasparenti < 0.6 * parti.length;

    // 2. se il nome non basta, guardo forma e posizione rispetto a tutto l'occhiale
    function pezzoDallaForma(parte) {
        const s = new THREE.Box3().setFromObject(parte);
        const m = s.getSize(new THREE.Vector3());
        const c = s.getCenter(new THREE.Vector3());
        const distanzaDalCentro = Math.abs(c.x - centroOcchiale.x);

        // stanga: un pezzo lungo che va all'indietro (più di metà della profondità dell'occhiale)
        if (m.z > 0.5 * misuraOcchiale.z && m.x < 0.3 * misuraOcchiale.x) {
            return c.x < centroOcchiale.x ? 'stanga-dx' : 'stanga-sx';
        }
        // lente: trasparente nel file, oppure piatta, larga circa mezzo occhiale e spostata da un lato
        if (trasparenzaSignificativa && parte.userData.eraTrasparente) {
            return 'lenti';
        }
        if (m.z < 0.2 * misuraOcchiale.z && m.x > 0.2 * misuraOcchiale.x && m.x < 0.55 * misuraOcchiale.x &&
            distanzaDalCentro > 0.1 * misuraOcchiale.x) {
            return 'lenti';
        }
        // nasello: un pezzo piccolo vicino al centro
        if (Math.max(m.x, m.y, m.z) < 0.15 * misuraOcchiale.x && distanzaDalCentro < 0.15 * misuraOcchiale.x) {
            return 'nasello';
        }
        // tutto il resto è la montatura centrale (il frontale con i cerchi delle lenti)
        return 'montatura';
    }

    const radice = occhiale.children[0];
    const pezzi = {};   // per ogni pezzo, l'elenco delle sue parti 3D
    const riepilogo = [];
    parti.forEach(function(parte) {
        const nomi = nomiParte(parte, radice, livelli);
        let pezzo = pezzoDalNome(nomi.oggetto) || pezzoDalNome(nomi.livello) || pezzoDalNome(nomi.materiale);
        let come = 'nome';
        if (!pezzo) {
            pezzo = pezzoDallaForma(parte);
            come = 'forma';
        }
        if (pezzo === 'stanga' || pezzo === 'stanga-dx' || pezzo === 'stanga-sx') {
            const s = new THREE.Box3().setFromObject(parte);
            const c = s.getCenter(new THREE.Vector3());
            if (s.min.x < centroOcchiale.x - 0.25 * misuraOcchiale.x && s.max.x > centroOcchiale.x + 0.25 * misuraOcchiale.x) {
                // un solo pezzo con tutte e due le stanghe: non si può dividere né piegare
                pezzo = 'stanghe-unite';
            } else if (pezzo === 'stanga') {
                pezzo = c.x < centroOcchiale.x ? 'stanga-dx' : 'stanga-sx';
            }
        }
        if (!pezzi[pezzo]) {
            pezzi[pezzo] = [];
        }
        pezzi[pezzo].push(parte);
        riepilogo.push({ oggetto: nomi.oggetto, livello: nomi.livello, materiale: nomi.materiale, pezzo: pezzo, riconosciuto_da: come });
    });
    console.table(riepilogo);   // per controllare nella console del browser come è stato diviso l'occhiale

    // le lenti: le rendo un po' trasparenti e lisce, così il colore scelto sembra una lente colorata.
    // Si devono vedere anche da dietro (modalità Indossato)
    (pezzi.lenti || []).forEach(function(parte) {
        parte.material.transparent = true;
        parte.material.opacity = 0.6;
        parte.material.roughness = 0.1;
        parte.material.side = THREE.DoubleSide;
        parte.castShadow = false;   // una lente trasparente non fa un'ombra piena
    });
    return pezzi;
}


// ===================================================================================
// 7b. LE STANGHE COME BLOCCHI UNICI
// Una stanga si piega solo con i pezzi che stanno nel suo gruppo: tutto quello che le è attaccato
// ma era finito in un altro gruppo (terminali in gomma, viti, cerniere, pezzi della stessa mesh
// della montatura...) restava fermo, sospeso nel vuoto, quando l'occhiale si chiudeva.
// Qui, per ogni lato, raccolgo TUTTO quello che sta nella zona della stanga (dietro al frontale e
// verso l'esterno) e lo fondo in una sola mesh: un blocco unico che si piega tutto insieme.
// Le lenti e i naselli veri (che stanno al centro) non vengono mai toccati
// ===================================================================================

// i triangoli di una parte, già portati nello spazio dell'occhiale: posizioni e normali (9 numeri a triangolo)
function triangoliDellaParte(parte, matrice) {
    let geometria = parte.geometry.index ? parte.geometry.toNonIndexed() : parte.geometry.clone();
    if (!geometria.attributes.normal) {
        geometria.computeVertexNormals();
    }
    const matriceNormali = new THREE.Matrix3().getNormalMatrix(matrice);
    const posizioni = geometria.attributes.position;
    const normali = geometria.attributes.normal;
    const p = new Float32Array(posizioni.count * 3);
    const n = new Float32Array(posizioni.count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < posizioni.count; i++) {
        v.fromBufferAttribute(posizioni, i).applyMatrix4(matrice);
        p[i * 3] = v.x; p[i * 3 + 1] = v.y; p[i * 3 + 2] = v.z;
        v.fromBufferAttribute(normali, i).applyMatrix3(matriceNormali).normalize();
        n[i * 3] = v.x; n[i * 3 + 1] = v.y; n[i * 3 + 2] = v.z;
    }
    geometria.dispose();
    return { posizioni: p, normali: n, quanti: posizioni.count / 3 };
}

// una geometria fatta solo con alcuni triangoli (elenco di indici) presi da posizioni e normali
function geometriaDaTriangoli(pezziDiTriangoli) {
    let totale = 0;
    pezziDiTriangoli.forEach(function(t) {
        totale += t.indici.length;
    });
    const p = new Float32Array(totale * 9);
    const n = new Float32Array(totale * 9);
    let scritti = 0;
    pezziDiTriangoli.forEach(function(t) {
        t.indici.forEach(function(indice) {
            for (let k = 0; k < 9; k++) {
                p[scritti * 9 + k] = t.dati.posizioni[indice * 9 + k];
                n[scritti * 9 + k] = t.dati.normali[indice * 9 + k];
            }
            scritti++;
        });
    });
    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', new THREE.BufferAttribute(p, 3));
    geometria.setAttribute('normal', new THREE.BufferAttribute(n, 3));
    return geometria;
}

function costruisciStanghe(modello) {
    const pezzi = modello.pezzi;
    const occhiale = modello.occhiale;
    occhiale.updateMatrixWorld(true);
    const inverso = occhiale.matrixWorld.clone().invert();

    // la zona delle stanghe, nello spazio dell'occhiale
    const scatola = new THREE.Box3();
    modello.parti.forEach(function(parte) {
        scatola.expandByObject(parte);
    });
    scatola.applyMatrix4(inverso);
    const misura = scatola.getSize(new THREE.Vector3());
    const centro = scatola.getCenter(new THREE.Vector3());
    // dove finisce il frontale: poco dietro le lenti (o, senza lenti, il quarto davanti dell'occhiale)
    let zTaglio = scatola.max.z - 0.25 * misura.z;
    if (pezzi.lenti) {
        const scatolaLenti = new THREE.Box3();
        pezzi.lenti.forEach(function(parte) {
            scatolaLenti.expandByObject(parte);
        });
        scatolaLenti.applyMatrix4(inverso);
        zTaglio = scatolaLenti.min.z - 0.03 * misura.z;
    }
    // le stanghe stanno ai lati: lontane dal centro più di metà della mezza larghezza
    const distanzaMinima = 0.55 * misura.x / 2;

    const raccolta = { 'stanga-dx': [], 'stanga-sx': [] };   // i triangoli che finiranno in ogni stanga
    const materialeDi = { 'stanga-dx': null, 'stanga-sx': null };
    const piuTriangoli = { 'stanga-dx': 0, 'stanga-sx': 0 };
    const daLiberare = [];   // i pezzi finiti tutti dentro una stanga (li libero alla fine)
    const baricentro = new THREE.Vector3();

    Object.keys(pezzi).forEach(function(nomePezzo) {
        if (nomePezzo === 'lenti') {
            return;   // le lenti restano sempre nel frontale
        }
        pezzi[nomePezzo].slice().forEach(function(parte) {
            const matrice = inverso.clone().multiply(parte.matrixWorld);
            const dati = triangoliDellaParte(parte, matrice);
            const lati = { 'stanga-dx': [], 'stanga-sx': [], resto: [] };
            for (let t = 0; t < dati.quanti; t++) {
                const q = t * 9;
                baricentro.set(
                    (dati.posizioni[q] + dati.posizioni[q + 3] + dati.posizioni[q + 6]) / 3,
                    (dati.posizioni[q + 1] + dati.posizioni[q + 4] + dati.posizioni[q + 7]) / 3,
                    (dati.posizioni[q + 2] + dati.posizioni[q + 5] + dati.posizioni[q + 8]) / 3
                );
                // la destra di chi indossa l'occhiale è verso -X
                const lato = baricentro.x < centro.x ? 'stanga-dx' : 'stanga-sx';
                let dove = 'resto';
                if (nomePezzo === 'stanga-dx' || nomePezzo === 'stanga-sx') {
                    dove = nomePezzo;   // un pezzo già riconosciuto come stanga va tutto nella sua stanga
                } else if (nomePezzo === 'stanghe-unite') {
                    dove = lato;        // le due stanghe in un pezzo solo: le divido a metà
                } else if (baricentro.z < zTaglio && Math.abs(baricentro.x - centro.x) > distanzaMinima) {
                    dove = lato;        // un triangolo nella zona della stanga
                }
                lati[dove].push(t);
            }

            const inStanga = lati['stanga-dx'].length + lati['stanga-sx'].length;
            if (inStanga === 0) {
                return;   // questa parte non c'entra con le stanghe
            }
            // un pezzo quasi tutto nella zona della stanga (una vite, un terminale...) ci va per intero,
            // anche con quel poco che sporge: così non si spezzano i pezzi piccoli
            if (lati.resto.length > 0 && inStanga >= 0.6 * dati.quanti) {
                const latoPrincipale = lati['stanga-dx'].length >= lati['stanga-sx'].length ? 'stanga-dx' : 'stanga-sx';
                lati[latoPrincipale] = lati[latoPrincipale].concat(lati.resto);
                lati.resto = [];
            }
            ['stanga-dx', 'stanga-sx'].forEach(function(lato) {
                if (lati[lato].length === 0) {
                    return;
                }
                raccolta[lato].push({ dati: dati, indici: lati[lato] });
                // il materiale della stanga: quello della parte che le dà più triangoli
                if (lati[lato].length > piuTriangoli[lato]) {
                    piuTriangoli[lato] = lati[lato].length;
                    materialeDi[lato] = parte.material;
                }
            });

            // la parte di prima: tiene solo quello che resta (cerniere, frontale...) o sparisce
            const elenco = pezzi[nomePezzo];
            if (lati.resto.length > 0) {
                const vecchia = parte.geometry;
                // la riscrivo nello spazio dell'occhiale, quindi la sposto direttamente sotto l'occhiale
                parte.geometry = geometriaDaTriangoli([{ dati: dati, indici: lati.resto }]);
                vecchia.dispose();
                occhiale.add(parte);
                parte.position.set(0, 0, 0);
                parte.quaternion.identity();
                parte.scale.set(1, 1, 1);
                if (nomePezzo === 'stanghe-unite') {
                    // quel che resta di un pezzo "stanghe" è montatura
                    elenco.splice(elenco.indexOf(parte), 1);
                    (pezzi.montatura = pezzi.montatura || []).push(parte);
                }
            } else {
                elenco.splice(elenco.indexOf(parte), 1);
                parte.removeFromParent();
                modello.parti.splice(modello.parti.indexOf(parte), 1);
                daLiberare.push(parte);
            }
        });
    });

    // i due blocchi: una mesh per stanga, con tutti i suoi triangoli, appesa direttamente all'occhiale
    ['stanga-dx', 'stanga-sx'].forEach(function(lato) {
        if (raccolta[lato].length === 0) {
            return;
        }
        const materiale = materialeDi[lato].clone();
        const blocco = new THREE.Mesh(geometriaDaTriangoli(raccolta[lato]), materiale);
        blocco.name = lato;
        blocco.castShadow = true;
        blocco.receiveShadow = true;
        occhiale.add(blocco);
        pezzi[lato] = [blocco];
        modello.parti.push(blocco);
    });

    // libero la memoria dei pezzi che sono finiti tutti dentro le stanghe
    daLiberare.forEach(function(parte) {
        parte.geometry.dispose();
        parte.material.dispose();
    });
    // e tolgo i gruppi rimasti vuoti
    Object.keys(pezzi).forEach(function(nome) {
        if (pezzi[nome].length === 0) {
            delete pezzi[nome];
        }
    });
    console.log('Stanghe come blocchi unici: destra ' + (raccolta['stanga-dx'].length) + ' pezzi uniti, sinistra ' + (raccolta['stanga-sx'].length) + ' pezzi uniti');
}


// ===================================================================================
// 8. IL MODELLO NEL VISORE: caricaModello sostituisce quello di prima con quello scelto,
// e gli ricostruisce sopra colori, cerniere, scomposizione e vista Indossato
// ===================================================================================
let M = null;              // il modello mostrato ora: { occhiale, parti, pezzi, cerniere, spostamenti, ... }
let ultimaRichiesta = 0;   // se clicco un altro modello mentre il primo carica, il primo viene ignorato

async function caricaModello(voce) {
    const richiesta = ++ultimaRichiesta;
    avvisoVisore.textContent = 'Carico il modello…';
    avvisoVisore.hidden = false;
    let pronto;
    try {
        pronto = await preparaModello(voce);
    } catch (errore) {
        console.error(errore);
        if (richiesta === ultimaRichiesta) {
            avvisoVisore.textContent = 'Non riesco a caricare questo modello';
        }
        return;
    }
    if (richiesta !== ultimaRichiesta) {
        liberaModello(pronto.occhiale);   // nel frattempo è stato scelto un altro modello
        return;
    }
    if (pronto.parti.length === 0) {
        // succede con un .3dm salvato con "Salva piccolo": dentro non ci sono le mesh da mostrare
        avvisoVisore.textContent = 'Questo file non contiene superfici da mostrare';
        return;
    }

    // tolgo il modello di prima
    if (M) {
        scena.remove(M.occhiale);
        liberaModello(M.occhiale);
    }
    scena.add(pronto.occhiale);

    const pezzi = dividiInPezzi(pronto.occhiale, pronto.parti, pronto.livelli);
    M = {
        voce: voce,
        occhiale: pronto.occhiale,
        parti: pronto.parti,
        pezzi: pezzi
    };
    // le stanghe: per ogni lato raccolgo tutto quello che ne fa parte in un blocco unico, così si piegano
    // senza lasciare pezzi sospesi. Per gli occhiali senza stanghe (stanghe: false in js/modelli.js) niente cerniere
    if (voce.stanghe !== false) {
        costruisciStanghe(M);
    }
    M.cerniere = voce.stanghe === false ? [] : creaCerniere(M);
    M.spostamenti = calcolaSpostamenti(M);
    calcolaOcchi(M);

    // le scelte di un modello solo (data-solo="mio": il grigio a pois e la versione Gargoz di Orbita)
    // si vedono solo con quel modello. Se era scelta e cambio modello, torno al primo colore
    document.querySelectorAll('.pannello [data-solo]').forEach(function(bottone) {
        const suo = bottone.dataset.solo === voce.id;
        bottone.hidden = !suo;
        if (!suo && bottone.classList.contains('selected')) {
            if (bottone.classList.contains('campione')) {
                bottone.parentElement.querySelector('.campione').click();
            } else {
                bottone.classList.remove('selected');
            }
        }
    });

    // il nuovo modello prende subito i colori e le modalità scelti nel pannello
    document.querySelectorAll('.campioni').forEach(function(gruppo) {
        coloraPezzo(gruppo, gruppo.querySelector('.campione.selected').dataset.color);
    });
    applicaStanghe();
    applicaScomposizione();
    if (indosso > 0) {
        posaIndosso();
    }

    // il titolo del pannello diventa il nome del modello
    document.querySelector('.pannello .font-3').textContent = voce.nome;
    // avviso il carrello (js/carrello.js) che il modello mostrato è cambiato
    document.body.dataset.modello = voce.id;
    document.dispatchEvent(new CustomEvent('modellocambiato', { detail: voce }));
    scriviMisure(pronto.misuraFile);
    riempiDettaglio(voce, pronto);
    avvisoVisore.hidden = true;
    visteDaAggiornare = true;
}

// colora tutte le parti del pezzo scritto nel data-pezzo di un gruppo.
// Se le due stanghe sono un pezzo unico, le colorano sia "Stanga Dx" sia "Stanga Sx"
function coloraPezzo(gruppo, colore) {
    if (!M) {
        return;
    }
    let partiDaColorare = M.pezzi[gruppo.dataset.pezzo] || [];
    if (gruppo.dataset.pezzo === 'stanga-dx' || gruppo.dataset.pezzo === 'stanga-sx') {
        partiDaColorare = partiDaColorare.concat(M.pezzi['stanghe-unite'] || []);
    }
    partiDaColorare.forEach(function(parte) {
        tingi(parte, colore);
    });
}

// dà un colore a una parte. Il colore è "#rrggbb" oppure un motivo a pois "pois:#fondo:#pois"
// (il grigio a pois rosa della versione Gargoz). I pois li disegna lo shader della parte, nello spazio
// del pezzo: così restano attaccati quando il pezzo si muove e non servono coordinate di texture nel file
const poisDi = new WeakMap();   // materiale → i suoi valori dei pois (non in userData: clonando un materiale si copierebbero male)
const MOTIVO_POIS = /^pois:(#[0-9a-f]{6}):(#[0-9a-f]{6})$/i;
function tingi(parte, colore) {
    const materiale = parte.material;
    const pois = MOTIVO_POIS.exec(colore);
    if (pois && !poisDi.has(materiale)) {
        // la prima volta aggiungo al materiale il pezzo di shader dei pois, spento finché non serve
        const uniformi = {
            uPois: { value: 0 },
            uColorePois: { value: new THREE.Color() },
            uPassoPois: { value: 0.13 }   // la distanza tra un pois e l'altro, in unità della scena
        };
        poisDi.set(materiale, uniformi);
        materiale.onBeforeCompile = function(shader) {
            Object.assign(shader.uniforms, uniformi);
            shader.vertexShader = shader.vertexShader
                .replace('#include <common>', '#include <common>\nvarying vec3 vPois;')
                .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPois = transformed * length(modelMatrix[0].xyz);');
            shader.fragmentShader = shader.fragmentShader
                .replace('#include <common>', '#include <common>\nvarying vec3 vPois;\nuniform float uPois;\nuniform vec3 uColorePois;\nuniform float uPassoPois;')
                .replace('#include <color_fragment>', [
                    '#include <color_fragment>',
                    'if (uPois > 0.5) {',
                    '    vec3 cella = fract(vPois / uPassoPois) - 0.5;',
                    '    float distanza = length(cella);',
                    '    float bordo = fwidth(distanza);',
                    '    float dentro = 1.0 - smoothstep(0.31 - bordo, 0.31 + bordo, distanza);',
                    '    diffuseColor.rgb = mix(diffuseColor.rgb, uColorePois, dentro);',
                    '}'
                ].join('\n'));
        };
        materiale.customProgramCacheKey = function() {
            return 'pois';
        };
        materiale.needsUpdate = true;
    }
    if (pois) {
        materiale.color.set(pois[1]);
        poisDi.get(materiale).uColorePois.value.set(pois[2]);
        poisDi.get(materiale).uPois.value = 1;
    } else {
        materiale.color.set(colore);
        if (poisDi.has(materiale)) {
            poisDi.get(materiale).uPois.value = 0;
        }
    }
}

// quando clicco un campione, le parti di quel pezzo prendono il suo colore (preso da data-color)
document.querySelectorAll('.campioni').forEach(function(gruppo) {
    gruppo.querySelectorAll('.campione').forEach(function(bottone) {
        bottone.addEventListener('click', function() {
            coloraPezzo(gruppo, bottone.dataset.color);
        });
    });
});


// --- Modalità chiuso / aperto: le stanghe ruotano attorno alla loro cerniera ---
// Per ogni stanga creo un "perno" (un gruppo vuoto) proprio nel punto della cerniera e ci appendo
// sotto tutte le parti della stanga: ruotando il perno, la stanga gira attorno alla cerniera
function creaCerniera(modello, nomePezzo, latoEsterno) {
    const partiStanga = modello.pezzi[nomePezzo] || [];
    if (partiStanga.length === 0) {
        return null;
    }
    // la cerniera è all'estremità davanti della stanga (verso +Z), sul lato esterno
    const scatolaStanga = new THREE.Box3();
    partiStanga.forEach(function(parte) {
        scatolaStanga.expandByObject(parte);
    });
    const perno = new THREE.Group();
    perno.position.set(
        latoEsterno === 'destra' ? scatolaStanga.min.x : scatolaStanga.max.x,
        (scatolaStanga.min.y + scatolaStanga.max.y) / 2,
        scatolaStanga.max.z
    );
    scena.add(perno);
    modello.occhiale.attach(perno);   // attach = sposto il perno dentro l'occhiale senza cambiare dove si trova
    partiStanga.forEach(function(parte) {
        perno.attach(parte);          // ogni parte della stanga ora segue il perno, restando dov'era
    });
    return perno;
}
// la stanga destra sta verso -X e si chiude girando verso +X, la sinistra il contrario.
// Gli angoli non sono uguali (88° e 82°), così da chiuse le due stanghe non si compenetrano del tutto
function creaCerniere(modello) {
    return [
        { perno: creaCerniera(modello, 'stanga-dx', 'destra'), angoloChiuso: -88 * Math.PI / 180 },
        { perno: creaCerniera(modello, 'stanga-sx', 'sinistra'), angoloChiuso: 82 * Math.PI / 180 }
    ].filter(function(c) {
        return c.perno !== null;
    });
}

// a che punto è la chiusura: 0 = aperto, 1 = chiuso. "obiettivo" è dove deve arrivare
let chiusura = 0;
let obiettivoChiusura = document.querySelector('.modalita.selected').dataset.modalita === 'chiuso' ? 1 : 0;

function applicaStanghe() {
    M.cerniere.forEach(function(c) {
        c.perno.rotation.y = c.angoloChiuso * chiusura;
    });
}
// a ogni fotogramma (la chiamo dentro anima) avvicino la chiusura al suo obiettivo:
// ogni volta faccio l'8% della strada che manca, così il movimento rallenta dolcemente alla fine
function muoviStanghe() {
    if (Math.abs(obiettivoChiusura - chiusura) < 0.0005) {
        return false;
    }
    chiusura += (obiettivoChiusura - chiusura) * 0.08;
    applicaStanghe();
    return true;
}


// --- Scomponi: ogni pezzo si allontana dalla montatura nella sua direzione, come in un esploso tecnico ---
// Le direzioni sono in unità della scena (l'occhiale è lungo 3): x = lato, y = alto, z = avanti
function direzioneScomposizione(nomePezzo, centroParte, centroOcchiale) {
    const lato = centroParte.x < centroOcchiale.x ? -1 : 1;   // -1 = destra di chi indossa, 1 = sinistra
    if (nomePezzo === 'lenti') return new THREE.Vector3(0.35 * lato, 0, 1.3);    // avanti e un po' in fuori
    if (nomePezzo === 'nasello') return new THREE.Vector3(0.2 * lato, -0.5, -0.8); // indietro e in basso
    if (nomePezzo === 'stanga-dx') return new THREE.Vector3(-1.1, 0, -0.3);       // di lato, verso destra
    if (nomePezzo === 'stanga-sx') return new THREE.Vector3(1.1, 0, -0.3);        // di lato, verso sinistra
    if (nomePezzo === 'stanghe-unite') return new THREE.Vector3(0, 0, -1.2);      // tutte e due indietro
    return new THREE.Vector3(0, 0, 0);                                            // la montatura resta ferma
}

// per ogni parte mi salvo dove sta da composta e di quanto si sposta da scomposta.
// Lo spostamento è nello spazio del "genitore" della parte (l'occhiale o il perno della stanga),
// così se la stanga è chiusa la parte si sposta seguendo la stanga
function calcolaSpostamenti(modello) {
    const centroOcchiale = new THREE.Box3().setFromObject(modello.occhiale).getCenter(new THREE.Vector3());
    const spostamenti = [];
    Object.keys(modello.pezzi).forEach(function(nomePezzo) {
        modello.pezzi[nomePezzo].forEach(function(parte) {
            parte.updateWorldMatrix(true, false);
            const centroParte = new THREE.Box3().setFromObject(parte).getCenter(new THREE.Vector3());
            const direzione = direzioneScomposizione(nomePezzo, centroParte, centroOcchiale);
            const genitore = parte.parent;
            const da = genitore.worldToLocal(centroParte.clone());
            const a = genitore.worldToLocal(centroParte.clone().add(direzione));
            spostamenti.push({
                parte: parte,
                composta: parte.position.clone(),
                spostamento: a.sub(da)
            });
        });
    });
    return spostamenti;
}

// a che punto è la scomposizione: 0 = composto, 1 = scomposto
let scomposizione = 0;
let obiettivoScomposizione = 0;
document.querySelector('.scomponi').addEventListener('click', function() {
    obiettivoScomposizione = obiettivoScomposizione === 1 ? 0 : 1;   // ogni clic inverte: scomponi / ricomponi
});

function applicaScomposizione() {
    M.spostamenti.forEach(function(s) {
        s.parte.position.copy(s.composta).addScaledVector(s.spostamento, scomposizione);
    });
}
// a ogni fotogramma (la chiamo dentro anima): faccio il 6% della strada che manca, così rallenta alla fine
function muoviScomposizione() {
    if (Math.abs(obiettivoScomposizione - scomposizione) < 0.0005) {
        return false;
    }
    scomposizione += (obiettivoScomposizione - scomposizione) * 0.06;
    applicaScomposizione();
    return true;
}


// --- Modalità "Indossato": l'occhiale gira finché lo vedi da dietro, poi si avvicina finché sei "dentro",
// come se lo indossassi: lo guardi in prima persona, attraverso le lenti.
// In realtà muovo la telecamera e non l'occhiale: sullo schermo l'effetto è lo stesso,
// e così le viste fisse (frontale, laterali...) restano giuste ---

// dove sono gli occhi di chi lo indossa: dietro le lenti, alla loro altezza
function calcolaOcchi(modello) {
    const scatolaLenti = new THREE.Box3();
    const partiLenti = modello.pezzi.lenti && modello.pezzi.lenti.length ? modello.pezzi.lenti : modello.parti;
    partiLenti.forEach(function(parte) {
        scatolaLenti.expandByObject(parte);
    });
    modello.altezzaOcchi = (scatolaLenti.min.y + scatolaLenti.max.y) / 2;
    // 0.55 unità ≈ 2,5 cm dietro le lenti
    modello.puntoOcchi = new THREE.Vector3(0, modello.altezzaOcchi, scatolaLenti.min.z - 0.55);
    cono.position.y = modello.altezzaOcchi;
}

const campoVisivoIndossato = 95;   // da vicino serve un campo visivo largo, come quello dell'occhio (gradi)
const campoVisivoNormale = camera.fov;

// a che punto è l'animazione: 0 = vista normale, 1 = indossato. "obiettivo" è dove deve arrivare
let indosso = 0;
let obiettivoIndosso = 0;
const durataIndosso = 2.5;   // secondi per andare da un estremo all'altro
const orologioIndosso = new THREE.Clock();
// la posizione della telecamera quando parte l'animazione (per poterci tornare)
const partenza = new THREE.Spherical();

// clic su Chiuso / Aperto / Indossato
document.querySelectorAll('.modalita').forEach(function(bottone) {
    bottone.addEventListener('click', function() {
        let modalita = bottone.dataset.modalita;
        // secondo clic su "Indossato" (già indossato o mentre lo sta indossando): lo tolgo di dosso.
        // L'animazione torna indietro e la telecamera ritorna dov'era prima di indossarlo
        if (modalita === 'indossato' && obiettivoIndosso === 1) {
            modalita = 'aperto';
        }
        obiettivoChiusura = modalita === 'chiuso' ? 1 : 0;   // indossato = stanghe aperte
        const nuovoObiettivo = modalita === 'indossato' ? 1 : 0;
        if (nuovoObiettivo === 1 && indosso === 0) {
            // parto da dove si trova ora la telecamera
            partenza.setFromVector3(camera.position.clone().sub(controlli.target));
            // l'animazione si vede nel riquadro grande con la vista 3D
            mostraNelGrande(viste.find(function(v) {
                return v.nome === '3d';
            }));
        }
        obiettivoIndosso = nuovoObiettivo;
        aggiornaControlli();
    });
});

// ruotare e zoomare si può solo con la vista 3D nel riquadro grande e l'occhiale non indossato
function aggiornaControlli() {
    const libero = vistaNelGrande && vistaNelGrande.nome === '3d' && obiettivoIndosso === 0 && indosso === 0;
    controlli.enabled = libero;
    renderer.domElement.style.cursor = libero ? 'grab' : 'default';
}

// curva "morbida": parte piano, accelera e rallenta alla fine (0 → 0, 1 → 1)
function morbido(t) {
    return t * t * (3 - 2 * t);
}

// mette la telecamera nel punto del percorso che corrisponde a "indosso".
// Prima metà: giro attorno all'occhiale fino a vederlo da dietro. Seconda metà: mi avvicino agli occhi
function posaIndosso() {
    const altezzaOcchi = M ? M.altezzaOcchi : 0;
    const puntoOcchi = M ? M.puntoOcchi : new THREE.Vector3(0, 0, -0.55);

    // prima metà (0 → 0.5): rotazione attorno all'occhiale fino alla vista da dietro (asse -Z)
    const giro = morbido(Math.min(indosso / 0.5, 1));
    // la strada più corta per arrivare dietro: theta = PI (dietro), phi = PI/2 (all'altezza dell'occhiale)
    let differenza = Math.PI - partenza.theta;
    differenza = Math.atan2(Math.sin(differenza), Math.cos(differenza));
    const posizione = new THREE.Vector3().setFromSpherical(new THREE.Spherical(
        partenza.radius,
        partenza.phi + (Math.PI / 2 - partenza.phi) * giro,
        partenza.theta + differenza * giro
    ));
    posizione.y += altezzaOcchi * giro;
    const guarda = new THREE.Vector3(0, altezzaOcchi * giro, 0);

    // seconda metà (0.5 → 1): mi avvicino fino agli occhi e allargo il campo visivo
    const avvicinamento = morbido(Math.max((indosso - 0.5) / 0.5, 0));
    posizione.lerp(puntoOcchi, avvicinamento);
    guarda.z += 10 * avvicinamento;   // guardo avanti, attraverso le lenti, verso il cono
    camera.fov = campoVisivoNormale + (campoVisivoIndossato - campoVisivoNormale) * avvicinamento;
    camera.updateProjectionMatrix();
    camera.position.copy(posizione);
    camera.lookAt(guarda);

    // il cono compare (sfumando) solo alla fine, quando si guarda attraverso le lenti
    cono.visible = avvicinamento > 0;
    cono.material.opacity = avvicinamento;
}

// a ogni fotogramma (la chiamo dentro anima): faccio avanzare l'animazione verso il suo obiettivo
function muoviIndosso() {
    const passo = orologioIndosso.getDelta() / durataIndosso;
    if (indosso === obiettivoIndosso) {
        return false;   // fermo: niente da fare
    }
    indosso = obiettivoIndosso > indosso ? Math.min(indosso + passo, 1) : Math.max(indosso - passo, 0);
    posaIndosso();
    if (indosso === 0) {
        // tornato al punto di partenza: la telecamera torna a girare attorno al centro dell'occhiale
        controlli.target.set(0, 0, 0);
        aggiornaControlli();
    }
    return true;   // in movimento
}


// ===================================================================================
// 9. LE VISTE (3D, frontale, da dietro, laterali, dall'alto) nelle caselle sotto il visore.
// Le viste fisse usano telecamere "ortografiche": senza prospettiva, come le viste di un disegno tecnico
// o di Rhino. La casella "3D" mostra invece la vista ruotabile, con la telecamera del visore.
// L'occhiale guarda verso +Z; chi lo indossa ha la destra verso -X
// ===================================================================================
const mezzaAltezzaVista = 1.9;   // mezza altezza inquadrata nelle viste fisse (l'occhiale è lungo 3)
const viste = [];
document.querySelectorAll('.vista').forEach(function(casella) {
    const tela = casella.querySelector('canvas');
    const nome = casella.dataset.vista;
    let camVista = camera;   // la casella "3D" usa la telecamera del visore
    if (nome !== '3d') {
        camVista = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 30);
        if (nome === 'frontale') camVista.position.set(0, 0, 6);
        if (nome === 'dietro') camVista.position.set(0, 0, -6);
        if (nome === 'laterale-dx') camVista.position.set(-6, 0, 0);
        if (nome === 'laterale-sx') camVista.position.set(6, 0, 0);
        if (nome === 'alto') {
            camVista.position.set(0, 6, 0);
            camVista.up.set(0, 0, -1);   // dall'alto: il davanti dell'occhiale in basso nell'immagine, come una pianta
        }
        camVista.lookAt(0, 0, 0);
    }
    viste.push({ casella: casella, nome: nome, tela: tela, camera: camVista, disegno: tela.getContext('2d') });
});

// inquadra una telecamera ortografica per un riquadro con queste proporzioni (larghezza / altezza)
function inquadraOrtografica(cam, proporzione) {
    cam.left = -mezzaAltezzaVista * proporzione;
    cam.right = mezzaAltezzaVista * proporzione;
    cam.top = mezzaAltezzaVista;
    cam.bottom = -mezzaAltezzaVista;
    cam.updateProjectionMatrix();
}

// la telecamera del riquadro grande quando ci mostro una vista fissa: copia posizione e direzione
// della vista scelta, ma con le proporzioni del riquadro grande (altrimenti l'immagine si deformerebbe)
const cameraGrandeFissa = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 30);
let vistaNelGrande = viste.find(function(v) {
    return v.nome === '3d';
});

function mostraNelGrande(vista) {
    vistaNelGrande = vista;
    if (vista.nome !== '3d') {
        cameraGrandeFissa.position.copy(vista.camera.position);
        cameraGrandeFissa.up.copy(vista.camera.up);
        cameraGrandeFissa.lookAt(0, 0, 0);
        inquadraOrtografica(cameraGrandeFissa, visore.clientWidth / visore.clientHeight);
    }
    aggiornaControlli();   // si può ruotare solo con la vista 3D (e l'occhiale non indossato)
    // evidenzio la casella scelta
    viste.forEach(function(v) {
        v.casella.classList.toggle('selected', v === vista);
        v.casella.setAttribute('aria-pressed', v === vista ? 'true' : 'false');
    });
}

// quando clicco una casella, la sua vista passa nel riquadro grande
viste.forEach(function(v) {
    v.casella.addEventListener('click', function() {
        mostraNelGrande(v);
    });
});

// la risoluzione di una tela piccola segue la sua misura sulla pagina
function adattaTela(oggetto) {
    oggetto.larghezza = oggetto.tela.clientWidth;
    oggetto.altezza = oggetto.tela.clientHeight;
    oggetto.tela.width = Math.round(oggetto.larghezza * renderer.getPixelRatio());
    oggetto.tela.height = Math.round(oggetto.altezza * renderer.getPixelRatio());
}

// adatto ogni casella: risoluzione della tela e inquadratura della telecamera
function adattaViste() {
    viste.forEach(function(v) {
        adattaTela(v);
        if (v.nome !== '3d') {
            inquadraOrtografica(v.camera, v.larghezza / v.altezza);
        }
    });
    if (vistaNelGrande.nome !== '3d') {
        inquadraOrtografica(cameraGrandeFissa, visore.clientWidth / visore.clientHeight);
    }
    visteDaAggiornare = true;
}

// le caselle si ridisegnano solo quando cambia qualcosa: un clic nel pannello (colori, versioni,
// modalità), le stanghe in movimento, la vista 3D girata, un nuovo modello o la finestra che cambia misura
let visteDaAggiornare = true;
document.querySelector('.pannello').addEventListener('click', function() {
    visteDaAggiornare = true;
});
controlli.addEventListener('change', function() {
    visteDaAggiornare = true;   // la casella "3D" segue la rotazione
});
mostraNelGrande(vistaNelGrande);
adattaViste();

// le viste fisse hanno tutte lo stesso sfondo bianco: per disegnarle nascondo la stanza
// e metto il bianco come sfondo della scena, poi rimetto tutto com'era (la vista 3D resta nella stanza)
const sfondoBianco = new THREE.Color('#000000');   // (si chiama ancora "bianco", ma con il tema verde è nero)
function disegnaFissa(cam) {
    stanza.visible = false;
    const conoVisibile = cono.visible;
    cono.visible = false;   // il cono serve solo alla vista indossata
    scena.background = sfondoBianco;
    renderer.render(scena, cam);
    stanza.visible = true;
    scena.background = null;
    cono.visible = conoVisibile;
}

// disegno una tela piccola usando lo stesso renderer del visore: disegno in un angolo del canvas grande
// (solo un rettangolo, grazie allo "scissor" = forbici) e lo copio subito nella tela piccola.
// Subito dopo il riquadro grande viene ridisegnato sopra, quindi lì non si vede nulla
function disegnaInTela(oggetto, disegna) {
    const pixel = renderer.getPixelRatio();
    renderer.setScissorTest(true);
    renderer.setViewport(0, 0, oggetto.larghezza, oggetto.altezza);
    renderer.setScissor(0, 0, oggetto.larghezza, oggetto.altezza);
    disegna();
    // il rettangolo disegnato sta in basso a sinistra del canvas grande
    const l = oggetto.larghezza * pixel;
    const a = oggetto.altezza * pixel;
    const contesto = oggetto.tela.getContext('2d');
    contesto.clearRect(0, 0, oggetto.tela.width, oggetto.tela.height);
    contesto.drawImage(renderer.domElement, 0, renderer.domElement.height - a, l, a, 0, 0, oggetto.tela.width, oggetto.tela.height);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, visore.clientWidth, visore.clientHeight);
}

function disegnaViste() {
    viste.forEach(function(v) {
        disegnaInTela(v, function() {
            if (v.nome === '3d') {
                // la telecamera del visore ha le proporzioni del riquadro grande: per la casella le cambio un attimo
                camera.aspect = v.larghezza / v.altezza;
                camera.updateProjectionMatrix();
                renderer.render(scena, camera);
                camera.aspect = visore.clientWidth / visore.clientHeight;
                camera.updateProjectionMatrix();
            } else {
                disegnaFissa(v.camera);
            }
        });
    });
}


// ===================================================================================
// 10. LA GALLERIA dei modelli (div.galleria) e la PAGINA DI DETTAGLIO.
// Le caselle si costruiscono da js/modelli.js. Nella home ogni casella è un link a
// dettaglio.html?modello=id; nella pagina di dettaglio (body data-pagina="dettaglio") il clic
// non ricarica la pagina: la azzera e ci carica il modello scelto, aggiornando l'indirizzo.
// Le anteprime le disegno una alla volta, in una scena a parte con sfondo bianco
// ===================================================================================
const paginaDettaglio = document.body.dataset.pagina === 'dettaglio';

// trova un modello dell'elenco dal suo id (se non c'è, il primo: il mio)
function modelloDaId(id) {
    return MODELLI.find(function(voce) {
        return voce.id === id;
    }) || MODELLI[0];
}

// costruisco le caselle in ogni griglia della pagina
const caselleModelli = [];
document.querySelectorAll('.galleria').forEach(function(griglia) {
    MODELLI.forEach(function(voce) {
        const casella = document.createElement('a');
        casella.className = 'modello';
        casella.href = 'dettaglio.html?modello=' + voce.id;
        casella.dataset.id = voce.id;
        casella.innerHTML = '<span class="modello-foto"><canvas></canvas><canvas class="modello-dopo" aria-hidden="true"></canvas><span class="modello-vista-nome" aria-hidden="true"></span></span><span class="modello-nome"></span><span class="modello-info"></span>';
        casella.querySelector('.modello-nome').textContent = voce.nome;
        // sotto il nome: chi l'ha progettato e il prezzo
        casella.querySelector('.modello-info').textContent = (voce.autore || 'Il mio progetto') + ' · ' + formattaPrezzo(voce.prezzo);
        griglia.appendChild(casella);
        caselleModelli.push({ voce: voce, elemento: casella });

        // nella pagina di dettaglio il clic cambia il modello senza ricaricare la pagina
        // (con Ctrl/Cmd o il tasto centrale si apre comunque in una nuova scheda, come un link normale)
        casella.addEventListener('click', function(evento) {
            if (!paginaDettaglio || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.button !== 0) {
                return;
            }
            evento.preventDefault();
            history.pushState({ modello: voce.id }, '', casella.href);
            apriDettaglio(voce);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
});

// evidenzio nelle griglie il modello mostrato ora
function segnaScelto(voce) {
    caselleModelli.forEach(function(c) {
        const scelto = c.voce === voce;
        c.elemento.classList.toggle('selected', scelto);
        if (scelto) {
            c.elemento.setAttribute('aria-current', 'page');
        } else {
            c.elemento.removeAttribute('aria-current');
        }
    });
}

// la pagina di dettaglio torna com'era appena aperta: primi colori, versione "Personalizzata",
// modalità Aperto, ricomposto, vista 3D nel riquadro grande, inquadratura di partenza, tendine chiuse
function azzeraPagina() {
    // i bottoni del pannello: li "clicco" così si aggiornano anche le scritte accanto ai titoli
    document.querySelectorAll('.campioni').forEach(function(gruppo) {
        gruppo.querySelector('.campione').click();
    });
    const aperto = document.querySelector('.modalita[data-modalita="aperto"]');
    if (aperto) aperto.click();
    const scomponi = document.querySelector('.scomponi');
    if (scomponi && scomponi.classList.contains('selected')) scomponi.click();
    document.querySelectorAll('.preset').forEach(function(b) {
        b.classList.remove('selected');
    });
    document.querySelectorAll('.pannello details').forEach(function(tendina) {
        tendina.open = false;
    });

    // i movimenti si fermano subito al punto di partenza, senza animazione
    chiusura = obiettivoChiusura = 0;
    scomposizione = obiettivoScomposizione = 0;
    indosso = obiettivoIndosso = 0;
    cono.visible = false;
    camera.fov = campoVisivoNormale;
    camera.position.set(3, 2, 4);
    controlli.target.set(0, 0, 0);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    controlli.update();
    mostraNelGrande(viste.find(function(v) {
        return v.nome === '3d';
    }));
}

// apre un modello nella pagina di dettaglio: azzero tutto, poi carico il modello nuovo
function apriDettaglio(voce) {
    azzeraPagina();
    segnaScelto(voce);
    document.title = voce.nome + ' – Octulus';
    caricaModello(voce);
}

// con i tasti avanti/indietro del browser torno al modello di quell'indirizzo
window.addEventListener('popstate', function() {
    if (paginaDettaglio) {
        apriDettaglio(modelloDaId(new URLSearchParams(location.search).get('modello')));
    }
});

// i testi della pagina di dettaglio che dipendono dal modello (elementi con data-dettaglio)
function riempiDettaglio(voce, pronto) {
    const posizione = MODELLI.indexOf(voce);
    const estensione = voce.file.split('.').pop().toUpperCase();
    const pezziTrovati = M ? M.pezzi : {};
    const nomiPezzi = { lenti: 'lenti', 'stanga-dx': 'stanga Dx', 'stanga-sx': 'stanga Sx', 'stanghe-unite': 'stanghe (pezzo unico)', nasello: 'nasello', montatura: 'montatura' };
    const valori = {
        nome: voce.nome,
        prezzo: formattaPrezzo(voce.prezzo),
        autore: voce.autore ? 'Progetto di ' + voce.autore : 'Il mio progetto',
        progettista: voce.autore || 'Io',
        posizione: (posizione + 1) + ' di ' + MODELLI.length,
        formato: estensione === '3DM' ? 'Rhino 3DM' : 'glTF binario (GLB)',
        file: voce.file.split('/').pop(),
        parti: String(pronto.parti.length),
        pezzi: Object.keys(nomiPezzi).filter(function(p) {
            return pezziTrovati[p];
        }).map(function(p) {
            return nomiPezzi[p];
        }).join(', '),
        stanghe: M && M.cerniere.length === 2 ? 'Sì' : (M && M.cerniere.length === 1 ? 'Solo una' : 'No')
    };
    document.querySelectorAll('[data-dettaglio]').forEach(function(elemento) {
        const valore = valori[elemento.dataset.dettaglio];
        if (valore !== undefined) {
            elemento.textContent = valore;
        }
    });
    // i link al modello precedente e successivo
    const precedente = document.querySelector('[data-vai="precedente"]');
    const successivo = document.querySelector('[data-vai="successivo"]');
    if (precedente && successivo) {
        const prima = MODELLI[(posizione - 1 + MODELLI.length) % MODELLI.length];
        const dopo = MODELLI[(posizione + 1) % MODELLI.length];
        precedente.href = 'dettaglio.html?modello=' + prima.id;
        precedente.dataset.id = prima.id;
        successivo.href = 'dettaglio.html?modello=' + dopo.id;
        successivo.dataset.id = dopo.id;
    }
}

// precedente / successivo: anche loro cambiano modello senza ricaricare la pagina
document.querySelectorAll('[data-vai]').forEach(function(link) {
    link.addEventListener('click', function(evento) {
        if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.button !== 0 || !link.dataset.id) {
            return;
        }
        evento.preventDefault();
        history.pushState({ modello: link.dataset.id }, '', link.href);
        apriDettaglio(modelloDaId(link.dataset.id));
    });
});

// le anteprime della galleria sono dei MOCKUP da catalogo: l'occhiale in uno studio fotografico
// (fondo sfumato, ombra morbida a terra, luce principale + luce di riempimento + luce da dietro)
// fotografato da sei prospettive. Passando col mouse su una casella si passa alla prospettiva successiva
const scenaAnteprime = new THREE.Scene();
scenaAnteprime.background = null;   // trasparente: il fondo da studio lo dipingo io sotto (vedi fondoStudio)
scenaAnteprime.environment = riflessi;
scenaAnteprime.environmentIntensity = 0.8;
scenaAnteprime.add(new THREE.AmbientLight(0xffffff, 0.35));
// la luce principale, che fa l'ombra a terra
const luceAnteprime = new THREE.DirectionalLight(0xffffff, 1.6);
luceAnteprime.position.set(2.5, 6, 3);
luceAnteprime.castShadow = true;
luceAnteprime.shadow.mapSize.set(1024, 1024);
luceAnteprime.shadow.radius = 8;
luceAnteprime.shadow.bias = -0.0005;
Object.assign(luceAnteprime.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 20 });
scenaAnteprime.add(luceAnteprime);
// riempimento morbido dall'altro lato e una luce da dietro che disegna il bordo dell'occhiale
const riempimento = new THREE.DirectionalLight(0xdfe8ff, 0.5);
riempimento.position.set(-4, 2, 2);
scenaAnteprime.add(riempimento);
const controluce = new THREE.DirectionalLight(0xffffff, 1.1);
controluce.position.set(-1, 3, -5);
scenaAnteprime.add(controluce);
// il pavimento: mostra solo l'ombra
const pavimentoAnteprime = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.45 }));
pavimentoAnteprime.rotation.x = -Math.PI / 2;
pavimentoAnteprime.receiveShadow = true;
scenaAnteprime.add(pavimentoAnteprime);

const cameraAnteprime = new THREE.PerspectiveCamera(30, 4 / 3, 0.1, 100);

// le prospettive: [nome, posizione della camera]. La prima è quella che si vede all'inizio
const PROSPETTIVE = [
    ['Tre quarti',         [3.6, 2.2, 5.2]],
    ['Frontale',           [0, 0.6, 6.6]],
    ['Laterale',           [6.6, 0.7, 0.3]],
    ['Dall\'alto',         [0.3, 6.4, 1.6]],
    ['Tre quarti, dietro', [-3.8, 2.0, -5.0]],
    ['Tre quarti, Sx',     [-4.6, 2.8, 3.8]]
];

const anteprimeDaDisegnare = [];   // i modelli caricati che aspettano di essere fotografati

async function preparaAnteprime() {
    // un modello compare in più griglie? lo carico una volta sola e disegno le stesse foto in tutte
    for (const voce of MODELLI) {
        const caselle = caselleModelli.filter(function(c) {
            return c.voce === voce;
        }).map(function(c) {
            return c.elemento;
        });
        if (caselle.length === 0) {
            continue;
        }
        try {
            const pronto = await preparaModello(voce);
            anteprimeDaDisegnare.push({ voce: voce, caselle: caselle, occhiale: pronto.occhiale });
        } catch (errore) {
            console.error('Anteprima non riuscita: ' + voce.file, errore);
            caselle.forEach(function(c) {
                c.classList.add('errore');
            });
        }
    }
}

// il fondo da studio: un grigio scuro che sfuma verso il nero, più chiaro dietro l'occhiale,
// e una linea d'orizzonte appena accennata dove il pavimento piega verso il fondale
function fondoStudio(contesto, l, a) {
    const fondale = contesto.createLinearGradient(0, 0, 0, a);
    fondale.addColorStop(0, '#0b0d0c');
    fondale.addColorStop(0.55, '#1b1f1d');
    fondale.addColorStop(1, '#0e100f');
    contesto.fillStyle = fondale;
    contesto.fillRect(0, 0, l, a);
    const alone = contesto.createRadialGradient(l * 0.5, a * 0.55, 0, l * 0.5, a * 0.55, l * 0.6);
    alone.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
    alone.addColorStop(1, 'rgba(255, 255, 255, 0)');
    contesto.fillStyle = alone;
    contesto.fillRect(0, 0, l, a);
}

// i ritocchi sopra la foto: un velo di luce in alto (come un riflesso sul vetro) e gli angoli più scuri
function ritoccoStudio(contesto, l, a) {
    const angoli = contesto.createRadialGradient(l / 2, a / 2, Math.min(l, a) * 0.35, l / 2, a / 2, Math.max(l, a) * 0.75);
    angoli.addColorStop(0, 'rgba(0, 0, 0, 0)');
    angoli.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
    contesto.fillStyle = angoli;
    contesto.fillRect(0, 0, l, a);
}

function disegnaAnteprima(anteprima) {
    const oggetto = { tela: anteprima.caselle[0].querySelector('canvas') };
    adattaTela(oggetto);
    if (!oggetto.larghezza || !oggetto.altezza) {
        // la casella non è visibile (galleria nascosta): riprovo più tardi
        setTimeout(function() {
            anteprimeDaDisegnare.push(anteprima);
        }, 1000);
        return;
    }
    cameraAnteprime.aspect = oggetto.larghezza / oggetto.altezza;
    cameraAnteprime.updateProjectionMatrix();
    // il pavimento sotto l'occhiale, appena sotto il punto più basso
    const scatola = new THREE.Box3().setFromObject(anteprima.occhiale);
    pavimentoAnteprime.position.y = scatola.min.y - 0.005;
    scenaAnteprime.add(anteprima.occhiale);

    // una foto per prospettiva, ognuna nella sua tela fuori dalla pagina
    const foto = PROSPETTIVE.map(function(prospettiva) {
        cameraAnteprime.position.fromArray(prospettiva[1]);
        cameraAnteprime.lookAt(0, -0.1, 0);
        disegnaInTela(oggetto, function() {
            renderer.render(scenaAnteprime, cameraAnteprime);
        });
        const tela = document.createElement('canvas');
        tela.width = oggetto.tela.width;
        tela.height = oggetto.tela.height;
        const contesto = tela.getContext('2d');
        fondoStudio(contesto, tela.width, tela.height);
        contesto.drawImage(oggetto.tela, 0, 0);
        ritoccoStudio(contesto, tela.width, tela.height);
        return { nome: prospettiva[0], tela: tela };
    });
    scenaAnteprime.remove(anteprima.occhiale);
    liberaModello(anteprima.occhiale);   // le foto ora sono immagini: il modello 3D non serve più

    // la foto "tre quarti" la uso anche nel carrello (js/carrello.js): la lascio in window.fotoOcchiali e lo avviso
    window.fotoOcchiali = window.fotoOcchiali || {};
    window.fotoOcchiali[anteprima.voce.id] = foto[0].tela.toDataURL('image/jpeg', 0.88);
    document.dispatchEvent(new CustomEvent('fotoocchiale', { detail: anteprima.voce.id }));

    anteprima.caselle.forEach(function(casella) {
        casella.fotoProspettive = foto;
        casella.prospettiva = 0;
        mostraProspettiva(casella, 0, null);
        casella.classList.add('pronta');
        if (!casella.dataset.giraProspettiva) {
            casella.dataset.giraProspettiva = 'si';
            // ogni volta che il mouse entra nella casella: la prospettiva successiva
            casella.addEventListener('pointerenter', function(evento) {
                if (evento.pointerType === 'mouse' && casella.fotoProspettive) {
                    casella.prospettiva = (casella.prospettiva + 1) % casella.fotoProspettive.length;
                    mostraProspettiva(casella, casella.prospettiva, evento);
                }
            });
        }
    });
}

// mostra una prospettiva nella casella. Con il mouse: la nuova foto si apre a cerchio dal punto in cui
// è entrato il puntatore, con un piccolo zoom (GSAP); senza GSAP, o la prima volta, cambia e basta
function mostraProspettiva(casella, indice, evento) {
    const base = casella.querySelector('canvas');
    const sopra = casella.querySelector('.modello-dopo');
    const etichetta = casella.querySelector('.modello-vista-nome');
    const foto = casella.fotoProspettive[indice];
    [base, sopra].forEach(function(t) {
        t.width = foto.tela.width;
        t.height = foto.tela.height;
    });
    etichetta.textContent = foto.nome;
    if (!evento || !window.gsap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        base.getContext('2d').drawImage(foto.tela, 0, 0);
        return;
    }
    const box = sopra.getBoundingClientRect();
    const x = ((evento.clientX - box.left) / box.width * 100).toFixed(1) + '%';
    const y = ((evento.clientY - box.top) / box.height * 100).toFixed(1) + '%';
    sopra.getContext('2d').drawImage(foto.tela, 0, 0);
    gsap.killTweensOf([sopra, base, etichetta]);
    gsap.timeline({
        onComplete: function() {
            base.getContext('2d').drawImage(foto.tela, 0, 0);
            gsap.set(sopra, { autoAlpha: 0 });
            gsap.set(base, { scale: 1 });
        }
    })
        .fromTo(sopra, { autoAlpha: 1, clipPath: 'circle(0% at ' + x + ' ' + y + ')', filter: 'blur(6px) brightness(1.4)' },
            { clipPath: 'circle(150% at ' + x + ' ' + y + ')', filter: 'blur(0px) brightness(1)', duration: 0.35, ease: 'power3.inOut' })
        .to(base, { scale: 0.96, duration: 0.35, ease: 'power3.inOut' }, 0)
        .fromTo(etichetta, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.2, ease: 'power2.out' }, 0.1)
        .to(etichetta, { autoAlpha: 0, duration: 0.25 }, 1.0);
}


// la foto dell'occhiale COSÌ COM'È ADESSO nel visore (modello, colori, pois...), nello stesso studio
// fotografico delle anteprime. La usa js/carrello.js quando aggiungi al carrello: nel carrello vedi
// esattamente l'occhiale che stai comprando. Restituisce un'immagine JPEG (data URL), o null
window.fotoConfigurazione = function() {
    if (!M) {
        return null;
    }
    const larghezza = Math.min(480, visore.clientWidth);
    const altezza = Math.min(Math.round(larghezza * 0.75), visore.clientHeight);
    if (!larghezza || !altezza) {
        return null;
    }
    const pixel = Math.min(renderer.getPixelRatio(), 1.5);   // basta così: la foto resta leggera da salvare
    const oggetto = { tela: document.createElement('canvas'), larghezza: larghezza, altezza: altezza };
    oggetto.tela.width = Math.round(larghezza * pixel);
    oggetto.tela.height = Math.round(altezza * pixel);

    // sposto per un attimo l'occhiale nello studio, lo fotografo di tre quarti e lo rimetto nel visore
    const scatola = new THREE.Box3().setFromObject(M.occhiale);
    pavimentoAnteprime.position.y = scatola.min.y - 0.005;
    cameraAnteprime.aspect = larghezza / altezza;
    cameraAnteprime.updateProjectionMatrix();
    cameraAnteprime.position.fromArray(PROSPETTIVE[0][1]);
    cameraAnteprime.lookAt(0, -0.1, 0);
    scenaAnteprime.add(M.occhiale);
    try {
        disegnaInTela(oggetto, function() {
            renderer.render(scenaAnteprime, cameraAnteprime);
        });
    } finally {
        scena.add(M.occhiale);
    }

    const foto = document.createElement('canvas');
    foto.width = oggetto.tela.width;
    foto.height = oggetto.tela.height;
    const contesto = foto.getContext('2d');
    fondoStudio(contesto, foto.width, foto.height);
    contesto.drawImage(oggetto.tela, 0, 0);
    ritoccoStudio(contesto, foto.width, foto.height);
    visteDaAggiornare = true;
    return foto.toDataURL('image/jpeg', 0.82);
};

// ===================================================================================
// 11. L'ANIMAZIONE: a ogni fotogramma aggiorno i movimenti e ridisegno
// ===================================================================================
function anima() {
    // mentre l'occhiale viene "indossato" la telecamera la muove muoviIndosso, non i controlli
    const inMovimento = muoviIndosso();
    if (indosso === 0) {
        controlli.update();
    }
    let pezziInMovimento = false;
    if (M) {
        const stanghe = muoviStanghe();            // le stanghe che si chiudono o si aprono
        const pezzi = muoviScomposizione();        // i pezzi che si scompongono o si ricompongono
        pezziInMovimento = stanghe || pezzi;
    }
    // una sola anteprima della galleria per fotogramma, così la pagina resta fluida
    if (anteprimeDaDisegnare.length > 0) {
        disegnaAnteprima(anteprimeDaDisegnare.shift());
    }
    // mentre stanghe, pezzi o telecamera si muovono, anche le caselle delle viste devono seguirle
    if (visteDaAggiornare || inMovimento || pezziInMovimento) {
        disegnaViste();
        visteDaAggiornare = false;
    }
    // nel riquadro grande: la vista 3D ruotabile, oppure la vista fissa scelta
    if (vistaNelGrande.nome === '3d') {
        renderer.render(scena, camera);
    } else {
        disegnaFissa(cameraGrandeFissa);
    }
}
renderer.setAnimationLoop(anima);

// se la finestra cambia misura, adatto camera e canvas al visore
window.addEventListener('resize', function() {
    camera.aspect = visore.clientWidth / visore.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(visore.clientWidth, visore.clientHeight);
    adattaViste();
});



// ===================================================================================
// 12. LE "FOTO" DELLA PRESENTAZIONE (img.pr-scatto in cima alla pagina)
// Sono rendering del mio modello: lo carico una seconda volta in uno "studio" con luci morbide
// e un'ombra a terra, lo metto in posa (colori, chiuso, scomposto, indossato) e lo fotografo.
// Uso un secondo renderer solo per questo, perché alcune foto sono più grandi del visore;
// quando ho finito lo chiudo e libero la memoria
// ===================================================================================

// le inquadrature. camera = da dove guardo, guarda = verso dove; l'occhiale è lungo 3 unità, al centro.
// versione = i colori di una delle Versioni del pannello; colori = per cambiare il colore di qualche pezzo
const SCATTI = {
    'eroe':             { sfondo: '#000000', versione: 'Vulcano', camera: [2.3, 1.0, 4.4], guarda: [0, -0.1, 0] },
    'scomposto':        { sfondo: '#000000', versione: 'Aputa', scomposizione: 1, camera: [4.0, 2.4, 5.8], guarda: [0, -0.1, 0] },
    'lenti':            { sfondo: '#000000', versione: 'Ape', camera: 'lente' },
    'chiuso':           { sfondo: '#000000', versione: 'Aputa', chiusura: 1, camera: [2.0, 3.4, 3.4], guarda: [0, -0.2, 0.2] },
    'profilo':          { sfondo: '#000000', versione: 'Vulcano', camera: [6.6, 0.5, 0.4], guarda: [0, -0.05, -0.2] },
    'versione-vulcano': { sfondo: '#000000', versione: 'Vulcano', camera: [2.7, 1.3, 5.0], guarda: [0, -0.1, 0] },
    'versione-aputa':   { sfondo: '#000000', versione: 'Aputa', camera: [2.7, 1.3, 5.0], guarda: [0, -0.1, 0] },
    'versione-ape':     { sfondo: '#000000', versione: 'Ape', camera: [2.7, 1.3, 5.0], guarda: [0, -0.1, 0] },
    'versione-gargoz':  { sfondo: '#000000', versione: 'Gargoz', camera: [2.7, 1.3, 5.0], guarda: [0, -0.1, 0] },
    'indossa':          { sfondo: '#000000', versione: 'Aputa', colori: { lenti: 'Azzurro' }, camera: 'occhi' }
};

// i colori di una versione, presi dal pannello: { lenti: '#...', 'stanga-dx': '#...', ... }
function coloriDellaVersione(nomeVersione, modifiche) {
    const bottone = document.querySelector('.preset[data-nome="' + nomeVersione + '"]');
    const nomiColori = bottone ? bottone.dataset.colori.split(',') : [];
    const colori = {};
    document.querySelectorAll('.campioni').forEach(function(gruppo, i) {
        let nome = nomiColori[i];
        if (modifiche && modifiche[gruppo.dataset.pezzo]) {
            nome = modifiche[gruppo.dataset.pezzo];
        }
        const campione = gruppo.querySelector('.campione[data-nome="' + nome + '"]') || gruppo.querySelector('.campione.selected');
        colori[gruppo.dataset.pezzo] = campione.dataset.color;
    });
    return colori;
}

// scrive le misure vere nelle specifiche. Non so in che unità è il file: scelgo quella che dà
// all'occhiale una larghezza credibile (tra 8 e 25 cm). Se nessuna torna, lascio il trattino
function scriviMisure(misuraFile) {
    const unita = [1, 10, 1000, 25.4];   // da: millimetri, centimetri, metri, pollici → millimetri
    const fattore = unita.find(function(f) {
        return misuraFile.x * f >= 80 && misuraFile.x * f <= 250;
    });
    if (!fattore) {
        return;
    }
    const valori = { larghezza: misuraFile.x, profondita: misuraFile.z, altezza: misuraFile.y };
    document.querySelectorAll('[data-misura]').forEach(function(elemento) {
        elemento.textContent = Math.round(valori[elemento.dataset.misura] * fattore) + ' mm';
    });
}

async function scattaFoto() {
    const immagini = Array.from(document.querySelectorAll('img.pr-scatto'));
    const voceMia = modelloDaId('mio');
    if (immagini.length === 0) {
        return;
    }

    // il mio modello, preparato come nel visore (pezzi, cerniere, scomposizione, occhi)
    const pronto = await preparaModello(voceMia);
    scriviMisure(pronto.misuraFile);
    const studio = { occhiale: pronto.occhiale, parti: pronto.parti };
    studio.pezzi = dividiInPezzi(studio.occhiale, studio.parti, pronto.livelli);
    costruisciStanghe(studio);   // le stanghe come blocchi unici, come nel visore
    studio.cerniere = creaCerniere(studio);
    studio.spostamenti = calcolaSpostamenti(studio);
    calcolaOcchi(studio);
    if (M) {
        cono.position.y = M.altezzaOcchi;   // calcolaOcchi sposta anche il cono del visore: lo rimetto a posto
    }

    // il secondo renderer e la scena dello studio (alpha: per la foto in prima persona disegno
    // l'occhiale da solo, su fondo trasparente, e lo appoggio sopra il "mondo")
    const fotografo = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    fotografo.setPixelRatio(1);
    fotografo.shadowMap.enabled = true;
    fotografo.shadowMap.type = THREE.PCFSoftShadowMap;
    const studioScena = new THREE.Scene();
    const riflessiStudio = new THREE.PMREMGenerator(fotografo).fromScene(new RoomEnvironment(), 0.04).texture;
    studioScena.environment = riflessiStudio;
    studioScena.environmentIntensity = 0.7;
    studioScena.add(new THREE.AmbientLight(0xffffff, 0.5));
    // luce principale dall'alto a destra, con ombra; una luce più debole da dietro, che serve alla foto "indossa"
    const luceStudio = new THREE.DirectionalLight(0xffffff, 1.4);
    luceStudio.position.set(3, 6, 4);
    luceStudio.castShadow = true;
    luceStudio.shadow.mapSize.set(2048, 2048);
    luceStudio.shadow.radius = 8;
    Object.assign(luceStudio.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 20 });
    luceStudio.shadow.camera.updateProjectionMatrix();
    studioScena.add(luceStudio);
    const luceDietro = new THREE.DirectionalLight(0xffffff, 0.6);
    luceDietro.position.set(-3, 3, -5);
    studioScena.add(luceDietro);

    // il "pavimento" che mostra solo l'ombra (trasparente dove non c'è ombra)
    const pavimento = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.12 }));
    pavimento.rotation.x = -Math.PI / 2;
    pavimento.receiveShadow = true;
    studioScena.add(pavimento);

    // un cono come quello del visore, per la foto in prima persona
    const conoStudio = new THREE.Mesh(
        new THREE.ConeGeometry(1.3, 3.2, 64),
        new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 })
    );
    conoStudio.position.set(0, studio.altezzaOcchi, 7);
    studioScena.add(conoStudio);
    studioScena.add(studio.occhiale);

    const fotocamera = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 100);

    for (const img of immagini) {
        const scatto = SCATTI[img.dataset.scatto];
        if (!scatto) {
            continue;
        }
        // la posa: colori, stanghe, scomposizione
        const colori = coloriDellaVersione(scatto.versione, scatto.colori);
        Object.keys(studio.pezzi).forEach(function(nomePezzo) {
            const colore = nomePezzo === 'stanghe-unite' ? colori['stanga-dx'] : colori[nomePezzo];
            if (colore) {
                studio.pezzi[nomePezzo].forEach(function(parte) {
                    tingi(parte, colore);
                });
            }
        });
        studio.cerniere.forEach(function(c) {
            c.perno.rotation.y = c.angoloChiuso * (scatto.chiusura || 0);
        });
        studio.spostamenti.forEach(function(s) {
            s.parte.position.copy(s.composta).addScaledVector(s.spostamento, scatto.scomposizione || 0);
        });
        studio.occhiale.updateMatrixWorld(true);

        // il pavimento appena sotto il punto più basso dell'occhiale (cambia se è scomposto)
        pavimento.position.y = new THREE.Box3().setFromObject(studio.occhiale).min.y - 0.02;
        pavimento.visible = scatto.camera !== 'occhi';
        conoStudio.visible = scatto.camera === 'occhi';

        // la fotocamera
        const larghezza = Number(img.getAttribute('width'));
        const altezza = Number(img.getAttribute('height'));

        // la foto in prima persona ha un procedimento tutto suo (vedi fotoInPrimaPersona)
        if (scatto.camera === 'occhi') {
            conoStudio.visible = false;
            const strati = await fotoInPrimaPersona(fotografo, studioScena, studio, larghezza, altezza);
            img.src = strati.foto;
            img.classList.add('pronto');
            avviaVistaAttraverso(img, strati);   // la stessa vista, ma con la foresta che segue la testa
            await new Promise(function(fatto) {
                requestAnimationFrame(fatto);
            });
            continue;
        }
        fotocamera.aspect = larghezza / altezza;
        fotocamera.fov = 30;
        if (scatto.camera === 'occhi') {
            // in prima persona, come nella modalità Indossato
            fotocamera.fov = 95;
            fotocamera.position.copy(studio.puntoOcchi);
            fotocamera.lookAt(0, studio.altezzaOcchi, 10);
        } else if (scatto.camera === 'lente') {
            // primo piano della lente destra (quella verso -X), un po' dall'alto e di lato
            const scatolaLente = new THREE.Box3();
            (studio.pezzi.lenti || studio.parti).forEach(function(parte) {
                const s = new THREE.Box3().setFromObject(parte);
                if (s.getCenter(new THREE.Vector3()).x < 0 || !studio.pezzi.lenti) {
                    scatolaLente.union(s);
                }
            });
            const centroLente = scatolaLente.isEmpty() ? new THREE.Vector3() : scatolaLente.getCenter(new THREE.Vector3());
            fotocamera.position.copy(centroLente).add(new THREE.Vector3(0.9, 0.5, 2.6));
            fotocamera.lookAt(centroLente);
        } else {
            fotocamera.position.fromArray(scatto.camera);
            fotocamera.lookAt(new THREE.Vector3().fromArray(scatto.guarda));
        }
        fotocamera.updateProjectionMatrix();

        // scatto e metto la foto nell'immagine della pagina
        studioScena.background = new THREE.Color(scatto.sfondo);
        fotografo.setSize(larghezza, altezza, false);
        fotografo.render(studioScena, fotocamera);
        img.src = fotografo.domElement.toDataURL('image/jpeg', 0.9);
        img.classList.add('pronto');

        // lascio respirare la pagina tra una foto e l'altra
        await new Promise(function(fatto) {
            requestAnimationFrame(fatto);
        });
    }

    // fatto: libero tutto quello che serviva solo per le foto
    liberaModello(studio.occhiale);
    conoStudio.geometry.dispose();
    conoStudio.material.dispose();
    pavimento.geometry.dispose();
    pavimento.material.dispose();
    riflessiStudio.dispose();
    fotografo.dispose();
    fotografo.forceContextLoss();
}

// La foto "Guardaci attraverso": quello che vede chi indossa l'occhiale.
// Per sembrare vera la costruisco in tre strati, come la vede l'occhio:
// 1. il "mondo" è una foto della foresta pluviale (img/foresta-pluviale.jpg): lontana e a fuoco;
// 2. la lente è un vetro colorato: non la disegno come una superficie, ma come un filtro che "moltiplica"
//    il mondo per il suo colore (come fa un vetro vero), solo dove la lente copre la vista;
// 3. la montatura è a 2 cm dagli occhi, troppo vicina per essere a fuoco: la disegno sfocata sopra tutto.
// Restituisce l'immagine (data URL) da mettere nella <img>
const FOTO_FORESTA = 'img/foresta-pluviale.jpg';

// Oltre alla foto finita restituisce anche gli strati separati (la tinta della lente e la montatura),
// che servono alla vista dal vivo: { foto, tinta, montatura }
async function fotoInPrimaPersona(fotografo, studioScena, studio, larghezza, altezza) {
    const y = studio.altezzaOcchi;
    const strati = {};

    const lenti = studio.pezzi.lenti && studio.pezzi.lenti.length ? studio.pezzi.lenti : [];
    const scatolaLenti = new THREE.Box3();
    lenti.forEach(function(parte) {
        scatolaLenti.expandByObject(parte);
    });
    // gli occhi stanno poco dietro le lenti (circa 1,5 cm): l'occhiale è indossato e riempie la vista
    const zOcchi = (scatolaLenti.isEmpty() ? studio.puntoOcchi.z + 0.55 : scatolaLenti.min.z) - 0.32;

    // il punto di vista: tra i due occhi, che guardano avanti e un po' in basso: così in fondo all'immagine
    // la foresta si vede anche fuori dalla lente, e si nota la differenza di colore
    const occhio = new THREE.PerspectiveCamera(80, larghezza / altezza, 0.02, 200);
    occhio.position.set(0, y, zOcchi);
    occhio.lookAt(0, y - 0.45, 8);
    occhio.updateProjectionMatrix();

    // --- 1. il mondo: la foto della foresta, che riempie tutto il riquadro (tagliata ai bordi se serve) ---
    const foresta = new Image();
    foresta.src = FOTO_FORESTA;
    await foresta.decode();
    const foto = nuovaTela(larghezza, altezza);
    const pennello = foto.getContext('2d');
    const scala = Math.max(larghezza / foresta.naturalWidth, altezza / foresta.naturalHeight);
    const larghezzaForesta = foresta.naturalWidth * scala;
    const altezzaForesta = foresta.naturalHeight * scala;
    pennello.drawImage(foresta, (larghezza - larghezzaForesta) / 2, (altezza - altezzaForesta) * 0.4, larghezzaForesta, altezzaForesta);

    fotografo.setSize(larghezza, altezza, false);
    fotografo.setClearColor(0x000000, 0);

    // nello studio resta solo l'occhiale (con le sue luci): pavimento e cono li nascondo
    const sfondoStudio = studioScena.background;
    studioScena.background = null;
    const visibili = studioScena.children.map(function(figlio) {
        return figlio.visible;
    });
    studioScena.children.forEach(function(figlio) {
        if (figlio.isMesh && figlio !== studio.occhiale) {
            figlio.visible = false;
        }
    });
    function mostraParti(quali) {
        studio.occhiale.traverse(function(parte) {
            if (parte.isMesh) {
                parte.visible = quali(parte);
            }
        });
    }
    const eLente = function(parte) {
        return lenti.includes(parte);
    };

    // --- 2. la lente come filtro colorato ---
    if (lenti.length) {
        // la sagoma delle lenti (bianca, opaca) dice dove la vista passa attraverso il vetro
        mostraParti(eLente);
        const bianco = new THREE.MeshBasicMaterial({ color: '#ffffff' });
        studioScena.overrideMaterial = bianco;
        fotografo.render(studioScena, occhio);
        studioScena.overrideMaterial = null;
        bianco.dispose();

        // il colore della lente, appena schiarito (una lente da sole lascia passare parecchia luce)
        const colore = lenti[0].material.color.clone().lerp(new THREE.Color(1, 1, 1), 0.4);
        const tinta = nuovaTela(larghezza, altezza);
        const pennelloTinta = tinta.getContext('2d');
        pennelloTinta.drawImage(fotografo.domElement, 0, 0);
        pennelloTinta.globalCompositeOperation = 'source-in';   // coloro solo dentro la sagoma
        pennelloTinta.fillStyle = '#' + colore.getHexString();
        pennelloTinta.fillRect(0, 0, larghezza, altezza);
        // un riflesso chiaro e morbido in alto, come la luce sul vetro
        const riflesso = pennelloTinta.createLinearGradient(0, 0, 0, altezza * 0.6);
        riflesso.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
        riflesso.addColorStop(1, 'rgba(255, 255, 255, 0)');
        pennelloTinta.globalCompositeOperation = 'source-atop';
        pennelloTinta.fillStyle = riflesso;
        pennelloTinta.fillRect(0, 0, larghezza, altezza);

        // il mondo visto attraverso il vetro: moltiplicato per il colore (bordi della lente appena sfocati)
        const tintaSfocata = sfoca(tinta, larghezza * 0.004);
        strati.tinta = tintaSfocata.toDataURL('image/png');   // per la vista dal vivo (sezione 12b)
        pennello.globalCompositeOperation = 'multiply';
        pennello.drawImage(tintaSfocata, 0, 0);
        // più un velo leggero dello stesso colore: il vetro riflette un po' di luce colorata, e così
        // si vede bene dove finisce la lente anche sopra le parti scure (il sottobosco)
        pennello.globalCompositeOperation = 'source-over';
        pennello.globalAlpha = 0.22;
        pennello.drawImage(tintaSfocata, 0, 0);
        pennello.globalAlpha = 1;
    }

    // --- 3. la montatura, sfocata perché troppo vicina all'occhio ---
    mostraParti(function(parte) {
        return !eLente(parte);
    });
    fotografo.clear();
    fotografo.render(studioScena, occhio);
    const montatura = sfoca(fotografo.domElement, larghezza * 0.009);
    strati.montatura = montatura.toDataURL('image/png');
    pennello.drawImage(montatura, 0, 0);
    mostraParti(function() {
        return true;
    });

    // un velo scuro ai bordi, come la vista vera che si spegne ai lati
    const vignetta = pennello.createRadialGradient(larghezza / 2, altezza / 2, altezza * 0.35, larghezza / 2, altezza / 2, larghezza * 0.62);
    vignetta.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignetta.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
    pennello.fillStyle = vignetta;
    pennello.fillRect(0, 0, larghezza, altezza);

    // rimetto lo studio com'era e libero quello che serviva solo qui
    studioScena.children.forEach(function(figlio, i) {
        figlio.visible = visibili[i];
    });
    studioScena.background = sfondoStudio;
    fotografo.setClearColor(0x000000, 1);

    strati.foto = foto.toDataURL('image/jpeg', 0.9);
    return strati;
}

// ===================================================================================
// 12b. "GUARDACI ATTRAVERSO" DAL VIVO: la foresta si muove quando muovi la testa
// La foto in prima persona diventa una pila di strati (div.pr-attraverso-strati):
//   la foresta (sotto), la tinta della lente (in "moltiplica", come il vetro), un velo dello stesso
//   colore, la montatura sfocata (sopra). L'occhiale si muove con la testa, quindi resta fermo davanti
//   agli occhi: si sposta solo la foresta, nel verso opposto a dove giri la testa.
// La testa si muove con: il mouse (sul computer), l'inclinazione del telefono, oppure davvero,
// con la fotocamera e il riconoscimento del viso (bottone "Muovi la testa davvero")
// ===================================================================================

// MediaPipe Face Landmarker, lo stesso della prova (sezione 13): lo scarico una volta sola
let riconoscitoreCondiviso = null;
function caricaRiconoscitore() {
    if (!riconoscitoreCondiviso) {
        riconoscitoreCondiviso = (async function() {
            const cartella = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
            const vision = await import(cartella + '/vision_bundle.mjs');
            const file = await vision.FilesetResolver.forVisionTasks(cartella + '/wasm');
            return vision.FaceLandmarker.createFromOptions(file, {
                baseOptions: {
                    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
                    delegate: 'GPU'
                },
                runningMode: 'VIDEO',
                numFaces: 1,
                outputFacialTransformationMatrixes: true   // come è girata la testa
            });
        })();
        // se non riesce (per esempio senza internet) la prossima volta riprovo
        riconoscitoreCondiviso.catch(function() {
            riconoscitoreCondiviso = null;
        });
    }
    return riconoscitoreCondiviso;
}

// spegne la fotocamera della vista "Guardaci attraverso" (la sostituisce avviaVistaAttraverso)
let fermaTestaAttraverso = function() {};

function avviaVistaAttraverso(img, strati) {
    const contenitore = img.closest('.pr-attraverso');
    if (!contenitore || !strati.tinta || !strati.montatura) {
        return;   // senza lenti riconosciute resta la foto fissa
    }
    const foresta = contenitore.querySelector('.pr-attraverso-foresta');
    contenitore.querySelector('.pr-attraverso-tinta').src = strati.tinta;
    contenitore.querySelector('.pr-attraverso-velo').src = strati.tinta;
    contenitore.querySelector('.pr-attraverso-montatura').src = strati.montatura;
    const bottoneTesta = contenitore.parentElement.querySelector('.pr-attraverso-testa');
    const statoTesta = contenitore.parentElement.querySelector('.pr-attraverso-stato');
    contenitore.classList.add('dal-vivo');

    // dove "guarda" la testa: x da -1 (sinistra) a 1 (destra), y da -1 (giù) a 1 (su).
    // obiettivo = dove deve arrivare, testa = dove è ora (la raggiunge con dolcezza)
    const testa = { x: 0, y: 0 };
    const obiettivo = { x: 0, y: 0 };
    let conFotocamera = false;   // quando la fotocamera è accesa, mouse e telefono non contano
    const limita = function(v) {
        return Math.max(-1, Math.min(1, v));
    };

    // il mouse: la sua posizione nella finestra è dove guardi
    window.addEventListener('pointermove', function(evento) {
        if (conFotocamera || evento.pointerType !== 'mouse') {
            return;
        }
        obiettivo.x = limita(evento.clientX / window.innerWidth * 2 - 1);
        obiettivo.y = limita(1 - evento.clientY / window.innerHeight * 2);
        avvia();
    }, { passive: true });

    // il telefono: inclinandolo a destra/sinistra e avanti/indietro (dove il browser lo permette senza chiedere)
    window.addEventListener('deviceorientation', function(evento) {
        if (conFotocamera || evento.gamma === null) {
            return;
        }
        obiettivo.x = limita(evento.gamma / 30);
        obiettivo.y = limita((45 - evento.beta) / 30);   // il telefono tenuto a 45° = sguardo dritto
        avvia();
    });

    // a ogni fotogramma la foresta va dalla parte opposta a dove giri la testa
    let inMovimento = false;
    function passo() {
        testa.x += (obiettivo.x - testa.x) * 0.08;
        testa.y += (obiettivo.y - testa.y) * 0.08;
        foresta.style.transform = 'translate(' + (-testa.x * 6).toFixed(2) + '%, ' + (testa.y * 5).toFixed(2) + '%) scale(1.16)';
        if (Math.abs(obiettivo.x - testa.x) + Math.abs(obiettivo.y - testa.y) < 0.001 && !conFotocamera) {
            inMovimento = false;
            return;
        }
        requestAnimationFrame(passo);
    }
    function avvia() {
        if (!inMovimento) {
            inMovimento = true;
            requestAnimationFrame(passo);
        }
    }
    avvia();

    // --- la testa vera, con la fotocamera ---
    if (!bottoneTesta) {
        return;
    }
    let flusso = null;
    let video = null;
    let riposo = null;   // la posizione del viso quando si accende: è lo "sguardo dritto"

    function scrivi(testo) {
        statoTesta.textContent = testo;
        statoTesta.hidden = !testo;
    }

    fermaTestaAttraverso = function() {
        conFotocamera = false;
        riposo = null;
        if (flusso) {
            flusso.getTracks().forEach(function(traccia) {
                traccia.stop();
            });
            flusso = null;
        }
        if (video) {
            video.srcObject = null;
        }
        bottoneTesta.textContent = 'Muovi la testa davvero';
        bottoneTesta.setAttribute('aria-pressed', 'false');
        obiettivo.x = obiettivo.y = 0;
        avvia();
    };

    bottoneTesta.addEventListener('click', async function() {
        if (flusso) {
            fermaTestaAttraverso();
            scrivi('');
            return;
        }
        if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            scrivi('La fotocamera si può usare solo da una pagina https:// o da localhost.');
            return;
        }
        scrivi('Accendo la fotocamera…');
        try {
            flusso = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 } }, audio: false });
            video = video || Object.assign(document.createElement('video'), { muted: true, playsInline: true });
            video.srcObject = flusso;
            await video.play();
            scrivi('Preparo il riconoscimento del viso…');
            const riconoscitore = await caricaRiconoscitore();
            if (!flusso) {
                return;   // spenta nel frattempo
            }
            conFotocamera = true;
            bottoneTesta.textContent = 'Spegni la fotocamera';
            bottoneTesta.setAttribute('aria-pressed', 'true');
            scrivi('Guarda lo schermo e muovi la testa. Le immagini restano sul tuo dispositivo.');
            seguiTesta(riconoscitore);
        } catch (errore) {
            fermaTestaAttraverso();
            scrivi(errore.name === 'NotAllowedError'
                ? 'Permesso negato: per usare la testa consenti la fotocamera.'
                : 'Non riesco ad accendere la fotocamera o il riconoscimento del viso.');
        }
    });

    // il naso rispetto al centro degli occhi dice dove giri la testa (e funziona anche se ti sposti un po')
    function seguiTesta(riconoscitore) {
        if (!conFotocamera || !flusso) {
            return;
        }
        if (video.readyState >= 2) {
            const risultato = riconoscitore.detectForVideo(video, performance.now());
            const punti = risultato.faceLandmarks && risultato.faceLandmarks[0];
            if (punti) {
                const naso = punti[1];
                const occhioDx = punti[33];
                const occhioSx = punti[263];
                const distanza = Math.hypot(occhioSx.x - occhioDx.x, occhioSx.y - occhioDx.y) || 1;
                const meta = { x: (occhioDx.x + occhioSx.x) / 2, y: (occhioDx.y + occhioSx.y) / 2 };
                // la fotocamera vede il viso come un'altra persona: girando la testa a destra, il naso va a sinistra
                const giro = (meta.x - naso.x) / distanza;
                const alzo = (meta.y - naso.y) / distanza;
                const spostamento = { x: 0.5 - naso.x, y: 0.5 - naso.y };
                if (!riposo) {
                    riposo = { giro: giro, alzo: alzo, x: spostamento.x, y: spostamento.y };
                }
                obiettivo.x = limita((giro - riposo.giro) * 3 + (spostamento.x - riposo.x) * 3);
                obiettivo.y = limita((alzo - riposo.alzo) * 4 + (spostamento.y - riposo.y) * 3);
                avvia();
            }
        }
        requestAnimationFrame(function() {
            seguiTesta(riconoscitore);
        });
    }
    avvia();
}

function nuovaTela(larghezza, altezza) {
    const tela = document.createElement('canvas');
    tela.width = larghezza;
    tela.height = altezza;
    return tela;
}

// sfoca un'immagine (canvas) di "raggio" pixel e restituisce una tela nuova.
// Dove il browser lo sa fare uso il filtro blur del canvas; altrimenti (Safari) rimpicciolisco
// l'immagine a metà più volte e la riallargo: ogni passaggio ammorbidisce un po'
function sfoca(sorgente, raggio) {
    const larghezza = sorgente.width;
    const altezza = sorgente.height;
    const risultato = nuovaTela(larghezza, altezza);
    const pennello = risultato.getContext('2d');
    const ua = navigator.userAgent;
    const safari = /safari/i.test(ua) && !/chrome|chromium|android/i.test(ua);   // Safari non ha il filtro blur del canvas
    if ('filter' in pennello && !safari) {
        pennello.filter = 'blur(' + raggio.toFixed(1) + 'px)';
        pennello.drawImage(sorgente, 0, 0);
        pennello.filter = 'none';
        return risultato;
    }
    let tela = sorgente;
    const passaggi = Math.max(1, Math.round(Math.log2(raggio)));
    const scale = [];
    for (let i = 1; i <= passaggi; i++) {
        const piccola = nuovaTela(Math.max(1, Math.round(larghezza / 2 ** i)), Math.max(1, Math.round(altezza / 2 ** i)));
        const p = piccola.getContext('2d');
        p.imageSmoothingQuality = 'high';
        p.drawImage(tela, 0, 0, piccola.width, piccola.height);
        scale.push(piccola);
        tela = piccola;
    }
    for (let i = scale.length - 2; i >= 0; i--) {
        const p = scale[i].getContext('2d');
        p.clearRect(0, 0, scale[i].width, scale[i].height);
        p.drawImage(tela, 0, 0, scale[i].width, scale[i].height);
        tela = scale[i];
    }
    pennello.imageSmoothingQuality = 'high';
    pennello.drawImage(tela, 0, 0, larghezza, altezza);
    return risultato;
}




// ===================================================================================
// 13. PROVALO SU DI TE: l'occhiale sul tuo viso, con la fotocamera (solo nella pagina di dettaglio)
// Il viso lo riconosce MediaPipe Face Landmarker (di Google): gira tutto nel browser, le immagini
// non escono dal dispositivo. Trova 478 punti del viso e una "matrice" che dice come è girata la testa.
// Ogni volta che si apre la prova chiedo il consenso; chiudendo, la fotocamera si spegne davvero
// (così la volta dopo il browser deve richiederla)
// ===================================================================================
const finestraProva = document.querySelector('dialog.prova');

if (finestraProva) {
    const passoConsenso = finestraProva.querySelector('.prova-consenso');
    const passoScena = finestraProva.querySelector('.prova-scena');
    const passoErrore = finestraProva.querySelector('.prova-errore');
    const testoErrore = finestraProva.querySelector('.prova-errore-testo');
    const statoProva = finestraProva.querySelector('.prova-stato');
    const specchio = finestraProva.querySelector('.prova-specchio');
    const video = finestraProva.querySelector('.prova-video');
    const telaOcchiale = finestraProva.querySelector('.prova-occhiale');

    let flusso = null;         // il flusso della fotocamera (per poterla spegnere)
    let riconoscitore = null;  // MediaPipe: lo scarico la prima volta e poi lo tengo
    let prova = null;          // la scena 3D della prova: renderer, camera, occhiale...
    let inCorso = false;

    // i punti del viso che uso (numerazione di MediaPipe)
    const ANGOLO_OCCHIO_DESTRO = 33;    // angolo esterno dell'occhio destro
    const ANGOLO_OCCHIO_SINISTRO = 263; // angolo esterno dell'occhio sinistro
    const PONTE_NASO = 168;             // il punto tra gli occhi, dove poggia il ponte dell'occhiale
    // un occhiale è largo circa una volta e mezza la distanza tra gli angoli esterni degli occhi
    const LARGHEZZA_SU_OCCHI = 1.5;

    // il passo "telefono" e la scelta della fotocamera ci sono solo nella home
    const passoQr = finestraProva.querySelector('.prova-qr-passo');
    const scegli = finestraProva.querySelector('.prova-scegli');
    const selettore = finestraProva.querySelector('.prova-fotocamere');
    // quale fotocamera vuole chi apre la prova: 'computer' (quella del dispositivo) o 'telefono' (l'iPhone del Mac)
    let preferenza = 'computer';

    function mostraPasso(passo) {
        [passoConsenso, passoQr, passoScena, passoErrore].forEach(function(p) {
            if (p) {
                p.hidden = p !== passo;
            }
        });
    }

    function apriConsenso() {
        preferenza = 'computer';
        mostraPasso(passoConsenso);
        if (!finestraProva.open) {
            finestraProva.showModal();
        }
    }

    // apro la finestra: sempre dal consenso
    document.querySelectorAll('.prova-apri').forEach(function(bottone) {
        bottone.addEventListener('click', apriConsenso);
    });

    // "Collega il telefono": se sono già su un telefono uso la sua fotocamera, altrimenti mostro il codice QR
    const suTelefono = window.matchMedia('(pointer: coarse) and (hover: none)').matches;
    document.querySelectorAll('.prova-telefono').forEach(function(bottone) {
        if (suTelefono) {
            bottone.textContent = 'Usa la fotocamera del telefono';
        }
        bottone.addEventListener('click', function() {
            if (suTelefono || !passoQr) {
                apriConsenso();
                return;
            }
            mostraPasso(passoQr);
            finestraProva.showModal();
            disegnaQr();
        });
    });
    const bottoneContinuita = finestraProva.querySelector('.prova-continuita');
    if (bottoneContinuita) {
        bottoneContinuita.addEventListener('click', function() {
            preferenza = 'telefono';
            avviaProva();
        });
    }

    finestraProva.querySelectorAll('.prova-annulla, .prova-chiudi').forEach(function(bottone) {
        bottone.addEventListener('click', function() {
            finestraProva.close();
        });
    });
    // chiudendo la finestra (anche con Esc) spengo tutto
    finestraProva.addEventListener('close', fermaProva);
    finestraProva.querySelector('.prova-consenti').addEventListener('click', avviaProva);
    finestraProva.querySelector('.prova-riprova').addEventListener('click', avviaProva);
    if (selettore) {
        selettore.addEventListener('change', function() {
            cambiaFotocamera(selettore.value);
        });
    }

    // l'indirizzo che apre la prova sul telefono: questa pagina con ?prova=1 (vedi in fondo)
    function indirizzoPerTelefono() {
        const indirizzo = new URL(location.href);
        indirizzo.searchParams.set('prova', '1');
        indirizzo.hash = 'provali';
        return indirizzo.href;
    }

    // il codice QR: lo disegna la libreria qrcode-generator, che scarico solo la prima volta
    let libreriaQr = null;
    function caricaLibreriaQr() {
        if (!libreriaQr) {
            libreriaQr = new Promise(function(fatto, errore) {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
                script.onload = fatto;
                script.onerror = errore;
                document.head.appendChild(script);
            });
        }
        return libreriaQr;
    }

    async function disegnaQr() {
        const indirizzo = indirizzoPerTelefono();
        const link = passoQr.querySelector('.prova-qr-link a');
        link.href = indirizzo;
        link.textContent = indirizzo;

        // il telefono non può aprire un file del computer né "localhost" (che per lui è il telefono stesso),
        // e senza https il browser del telefono non dà la fotocamera
        const avviso = passoQr.querySelector('.prova-qr-avviso');
        const locale = location.protocol === 'file:' || ['localhost', '127.0.0.1', '::1', '[::1]'].includes(location.hostname);
        if (locale) {
            avviso.textContent = 'Stai aprendo il sito dal tuo computer: il telefono non può raggiungere questo indirizzo. Pubblica il sito (per esempio su GitHub Pages o Netlify) e apri da lì questa pagina.';
        } else if (location.protocol !== 'https:') {
            avviso.textContent = 'Il telefono può usare la fotocamera solo da una pagina https://: pubblica il sito con https perché la prova funzioni anche lì.';
        }
        avviso.hidden = !locale && location.protocol === 'https:';

        const riquadroQr = passoQr.querySelector('.prova-qr');
        try {
            await caricaLibreriaQr();
            const codice = window.qrcode(0, 'M');
            codice.addData(indirizzo);
            codice.make();
            riquadroQr.innerHTML = codice.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
        } catch (errore) {
            riquadroQr.textContent = 'Non riesco a creare il codice: apri il link qui accanto dal telefono.';
        }
    }

    // le fotocamere del dispositivo (i nomi ci sono solo dopo il permesso)
    async function elencoFotocamere() {
        const dispositivi = await navigator.mediaDevices.enumerateDevices();
        return dispositivi.filter(function(d) {
            return d.kind === 'videoinput';
        });
    }

    // riconosco l'iPhone (o un altro telefono) usato come fotocamera dal nome
    function eUnTelefono(dispositivo) {
        return /iphone|ipad|continuity|telefono|phone|android|galaxy|pixel/i.test(dispositivo.label);
    }

    // il menu delle fotocamere, con selezionata quella in uso
    function riempiSelettore(fotocamere) {
        if (!selettore) {
            return;
        }
        const inUso = flusso && flusso.getVideoTracks()[0] ? flusso.getVideoTracks()[0].getSettings().deviceId : '';
        selettore.innerHTML = '';
        fotocamere.forEach(function(f, i) {
            const voce = document.createElement('option');
            voce.value = f.deviceId;
            voce.textContent = f.label || 'Fotocamera ' + (i + 1);
            voce.selected = f.deviceId === inUso;
            selettore.appendChild(voce);
        });
        scegli.hidden = fotocamere.length < 2;
    }

    // accendo una fotocamera precisa (deviceId) oppure quella frontale
    async function accendi(idFotocamera) {
        const video = { width: { ideal: 1280 }, height: { ideal: 720 } };
        if (idFotocamera) {
            video.deviceId = { exact: idFotocamera };
        } else {
            video.facingMode = 'user';
        }
        // qui il browser chiede il permesso di usare la fotocamera
        return navigator.mediaDevices.getUserMedia({ video: video, audio: false });
    }

    // passo a un'altra fotocamera senza chiudere la prova
    async function cambiaFotocamera(idFotocamera) {
        fermaFotocamera();
        statoProva.textContent = 'Cambio fotocamera…';
        statoProva.hidden = false;
        try {
            flusso = await accendi(idFotocamera);
        } catch (errore) {
            mostraErrore('Non riesco ad accendere questa fotocamera: ' + errore.message);
            return;
        }
        await collegaVideo();
        inCorso = true;
        requestAnimationFrame(seguiViso);
    }

    // il video nel riquadro e la scena 3D con le sue proporzioni
    async function collegaVideo() {
        video.srcObject = flusso;
        await video.play();
        specchio.style.aspectRatio = video.videoWidth + ' / ' + video.videoHeight;
        if (prova) {
            prova.pennello.setSize(video.videoWidth, video.videoHeight, false);
            Object.assign(prova.camera, { left: 0, right: video.videoWidth, top: video.videoHeight, bottom: 0 });
            prova.camera.position.set(0, 0, 50000);
            prova.camera.updateProjectionMatrix();
        }
    }

    // arrivo dal codice QR (?prova=1): apro subito la prova, dal consenso
    if (new URLSearchParams(location.search).has('prova')) {
        const sezione = document.getElementById('provali');
        if (sezione) {
            sezione.scrollIntoView();
        }
        apriConsenso();
    }

    // scarico MediaPipe solo quando serve, la prima volta
    async function preparaRiconoscitore() {
        if (!riconoscitore) {
            riconoscitore = await caricaRiconoscitore();
        }
        return riconoscitore;
    }

    // la scena 3D della prova: una copia del modello aperto, con i colori scelti nel pannello
    async function preparaScenaProva() {
        const voce = M ? M.voce : modelloDaId('mio');
        const pronto = await preparaModello(voce);
        const copia = { occhiale: pronto.occhiale, parti: pronto.parti };
        copia.pezzi = dividiInPezzi(copia.occhiale, copia.parti, pronto.livelli);
        calcolaOcchi(copia);
        if (M) {
            cono.position.y = M.altezzaOcchi;   // calcolaOcchi sposta anche il cono del visore: lo rimetto a posto
        }
        // i colori: quelli selezionati ora nel pannello
        document.querySelectorAll('.campioni').forEach(function(gruppo) {
            const colore = gruppo.querySelector('.campione.selected').dataset.color;
            let partiGruppo = copia.pezzi[gruppo.dataset.pezzo] || [];
            if (gruppo.dataset.pezzo === 'stanga-dx' || gruppo.dataset.pezzo === 'stanga-sx') {
                partiGruppo = partiGruppo.concat(copia.pezzi['stanghe-unite'] || []);
            }
            partiGruppo.forEach(function(parte) {
                tingi(parte, colore);
            });
        });

        // il "punto d'appoggio" dell'occhiale: il centro delle lenti, sul davanti.
        // Lo porto nell'origine, così posizionarlo sul ponte del naso è semplice
        const scatola = new THREE.Box3().setFromObject(copia.occhiale);
        const larghezzaModello = scatola.getSize(new THREE.Vector3()).x;
        const zLenti = copia.puntoOcchi.z + 0.55;   // il piano delle lenti (puntoOcchi sta 0.55 dietro)
        const appoggio = new THREE.Group();
        copia.occhiale.position.sub(new THREE.Vector3(0, copia.altezzaOcchi, zLenti));
        appoggio.add(copia.occhiale);

        // la "testa" invisibile: un ovale dietro le lenti che non si vede ma copre quello che sta dietro
        // (così le stanghe spariscono dietro la testa e le orecchie, invece di passarci sopra)
        const testa = new THREE.Mesh(
            new THREE.SphereGeometry(1, 32, 24),
            new THREE.MeshBasicMaterial({ colorWrite: false })   // scrive solo la profondità, non il colore
        );
        testa.scale.set(0.47 * larghezzaModello, 0.62 * larghezzaModello, 0.62 * larghezzaModello);
        testa.position.set(0, -0.08 * larghezzaModello, -0.71 * larghezzaModello);
        testa.renderOrder = -1;   // la disegno per prima
        appoggio.add(testa);

        // renderer trasparente sopra il video, con luci e riflessi suoi
        const pennello = new THREE.WebGLRenderer({ canvas: telaOcchiale, antialias: true, alpha: true });
        pennello.setPixelRatio(1);
        const scenaProva = new THREE.Scene();
        const riflessiProva = new THREE.PMREMGenerator(pennello).fromScene(new RoomEnvironment(), 0.04).texture;
        scenaProva.environment = riflessiProva;
        scenaProva.environmentIntensity = 0.8;
        scenaProva.add(new THREE.AmbientLight(0xffffff, 0.7));
        const luceProva = new THREE.DirectionalLight(0xffffff, 1.2);
        luceProva.position.set(0, 1, 2);
        scenaProva.add(luceProva);
        scenaProva.add(appoggio);
        appoggio.visible = false;   // finché non trovo un viso

        // camera "ortografica" grande come il video: 1 unità = 1 pixel del video
        const cameraProva = new THREE.OrthographicCamera(0, 1, 1, 0, -100000, 100000);
        return {
            pennello: pennello, scena: scenaProva, camera: cameraProva, appoggio: appoggio,
            occhiale: copia.occhiale, testa: testa, riflessi: riflessiProva, larghezzaModello: larghezzaModello
        };
    }

    async function avviaProva() {
        fermaTestaAttraverso();   // se "Guardaci attraverso" stava usando la fotocamera, la libero
        mostraPasso(passoScena);
        statoProva.textContent = 'Avvio la fotocamera…';
        statoProva.hidden = false;
        if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            mostraErrore('La fotocamera si può usare solo da una pagina sicura: apri il sito da https:// oppure da localhost (per esempio con Live Server).');
            return;
        }
        fermaFotocamera();   // se ne era accesa una (per esempio con "Riprova"), la spengo prima
        try {
            flusso = await accendi();
            // con il permesso dato vedo i nomi delle fotocamere: se si è scelto il telefono, cerco l'iPhone
            const fotocamere = await elencoFotocamere();
            if (preferenza === 'telefono') {
                const telefono = fotocamere.find(eUnTelefono);
                if (!telefono) {
                    mostraErrore('Non trovo il telefono tra le fotocamere del computer. Su Mac: usa lo stesso ID Apple sull\'iPhone, tieni accesi Wi‑Fi e Bluetooth, blocca l\'iPhone e mettilo vicino al computer, poi riprova. Altrimenti chiudi e inquadra il codice QR con il telefono.');
                    return;
                }
                if (flusso.getVideoTracks()[0].getSettings().deviceId !== telefono.deviceId) {
                    fermaFotocamera();
                    flusso = await accendi(telefono.deviceId);
                }
            }
            riempiSelettore(fotocamere);
        } catch (errore) {
            if (errore.name === 'NotAllowedError') {
                mostraErrore('Il permesso è stato negato. Per provare l\'occhiale consenti l\'uso della fotocamera quando il browser te lo chiede (o nelle impostazioni del sito).');
            } else if (errore.name === 'NotFoundError' || errore.name === 'OverconstrainedError') {
                mostraErrore('Non ho trovato nessuna fotocamera su questo dispositivo.');
            } else if (errore.name === 'NotReadableError') {
                mostraErrore('La fotocamera è già usata da un\'altra app. Chiudila e riprova.');
            } else {
                mostraErrore('Errore: ' + errore.message);
            }
            return;
        }
        // se nel frattempo la finestra è stata chiusa, spengo subito
        if (!finestraProva.open) {
            fermaProva();
            return;
        }
        // il riquadro prende le proporzioni del video
        await collegaVideo();

        statoProva.textContent = 'Preparo l\'occhiale…';
        try {
            await preparaRiconoscitore();
            if (!prova) {
                prova = await preparaScenaProva();
            }
        } catch (errore) {
            console.error(errore);
            mostraErrore('Non riesco a caricare il riconoscimento del viso. Controlla la connessione a internet e riprova.');
            return;
        }
        if (!finestraProva.open) {
            fermaProva();
            return;
        }
        await collegaVideo();   // ora che la scena 3D c'è, le do le misure del video
        statoProva.textContent = 'Guarda verso la fotocamera…';
        inCorso = true;
        requestAnimationFrame(seguiViso);
    }

    // a ogni fotogramma: trovo il viso e ci appoggio l'occhiale
    const matrice = new THREE.Matrix4();
    const rotazione = new THREE.Quaternion();
    const nienteVettore = new THREE.Vector3();
    function seguiViso() {
        if (!inCorso) {
            return;
        }
        const larghezza = video.videoWidth;
        const altezza = video.videoHeight;
        const risultato = riconoscitore.detectForVideo(video, performance.now());
        const punti = risultato.faceLandmarks && risultato.faceLandmarks[0];
        if (punti) {
            // i punti sono tra 0 e 1: li porto in pixel (y verso l'alto, come nella camera 3D)
            function inPixel(i) {
                return new THREE.Vector3(punti[i].x * larghezza, (1 - punti[i].y) * altezza, -punti[i].z * larghezza);
            }
            const occhioDestro = inPixel(ANGOLO_OCCHIO_DESTRO);
            const occhioSinistro = inPixel(ANGOLO_OCCHIO_SINISTRO);
            const ponte = inPixel(PONTE_NASO);

            // grandezza: dalla distanza tra gli occhi (in 3D, così non cambia quando giri la testa)
            const scala = occhioDestro.distanceTo(occhioSinistro) * LARGHEZZA_SU_OCCHI / prova.larghezzaModello;
            prova.appoggio.scale.setScalar(scala);
            prova.appoggio.position.set(ponte.x, ponte.y, 0);

            // rotazione: dalla matrice della testa calcolata da MediaPipe
            const matrici = risultato.facialTransformationMatrixes;
            if (matrici && matrici[0]) {
                matrice.fromArray(matrici[0].data);
                matrice.decompose(nienteVettore, rotazione, new THREE.Vector3());
                prova.appoggio.quaternion.copy(rotazione);
            }
            prova.appoggio.visible = true;
            statoProva.hidden = true;
        } else {
            prova.appoggio.visible = false;
            statoProva.textContent = 'Non vedo il tuo viso: mettiti davanti alla fotocamera, con un po\' di luce.';
            statoProva.hidden = false;
        }
        prova.pennello.render(prova.scena, prova.camera);
        requestAnimationFrame(seguiViso);
    }

    function mostraErrore(testo) {
        fermaFotocamera();
        testoErrore.textContent = testo;
        mostraPasso(passoErrore);
    }

    function fermaFotocamera() {
        inCorso = false;
        if (flusso) {
            flusso.getTracks().forEach(function(traccia) {
                traccia.stop();   // spegne davvero la fotocamera (si spegne anche la lucina)
            });
            flusso = null;
        }
        video.srcObject = null;
    }

    // chiudo la prova: spengo la fotocamera e libero la scena 3D (la prossima volta si riparte da capo,
    // anche con i colori nuovi e con il modello eventualmente cambiato)
    function fermaProva() {
        fermaFotocamera();
        if (prova) {
            liberaModello(prova.occhiale);
            prova.testa.geometry.dispose();
            prova.testa.material.dispose();
            prova.riflessi.dispose();
            prova.pennello.dispose();
            prova = null;
        }
    }
}


// ===================================================================================
// 14. L'ESPLOSO DAL VIVO nella presentazione (riquadro nero "Scomponi", div.pr-esploso)
// Il riquadro nero è alto quanto lo schermo e sta in un "binario" più alto (div.pr-binario):
// quando lo occupa tutto si ferma, e scorrendo la pagina il mio occhiale si scompone (verso il basso)
// o si ricompone (verso l'alto), e compaiono i nomi dei pezzi. Finito il binario la pagina riprende
// a scorrere. Non trattiene la rotella: funziona uguale con il mouse, il trackpad e il dito
// ===================================================================================
async function avviaEsploso() {
    const contenitore = document.querySelector('.pr-esploso');
    if (!contenitore) {
        return;
    }
    const riquadro = contenitore.closest('.pr-riquadro') || contenitore;
    const tela = contenitore.querySelector('.pr-esploso-tela');
    const strato = contenitore.querySelector('.pr-esploso-etichette');
    const suggerimento = contenitore.querySelector('.pr-esploso-suggerimento');

    // il mio occhiale, preparato come nel visore (stanghe come blocchi unici), nei colori della versione Aputa
    const pronto = await preparaModello(modelloDaId('mio'));
    const esploso = { occhiale: pronto.occhiale, parti: pronto.parti };
    esploso.pezzi = dividiInPezzi(esploso.occhiale, esploso.parti, pronto.livelli);
    costruisciStanghe(esploso);
    esploso.spostamenti = calcolaSpostamenti(esploso);
    const colori = coloriDellaVersione('Aputa');
    Object.keys(esploso.pezzi).forEach(function(nomePezzo) {
        const colore = nomePezzo === 'stanghe-unite' ? colori['stanga-dx'] : colori[nomePezzo];
        esploso.pezzi[nomePezzo].forEach(function(parte) {
            if (colore) {
                tingi(parte, colore);
            }
        });
    });

    // il motore 3D del riquadro: fondo nero, luci morbide e riflessi
    const pennello = new THREE.WebGLRenderer({ canvas: tela, antialias: true });
    pennello.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scenaEsploso = new THREE.Scene();
    scenaEsploso.background = new THREE.Color('#000000');
    scenaEsploso.environment = new THREE.PMREMGenerator(pennello).fromScene(new RoomEnvironment(), 0.04).texture;
    scenaEsploso.environmentIntensity = 0.7;
    scenaEsploso.add(new THREE.AmbientLight(0xffffff, 0.5));
    const luceEsploso = new THREE.DirectionalLight(0xffffff, 1.4);
    luceEsploso.position.set(3, 6, 4);
    scenaEsploso.add(luceEsploso);
    scenaEsploso.add(esploso.occhiale);
    const cameraEsploso = new THREE.PerspectiveCamera(30, 3 / 2, 0.1, 100);
    cameraEsploso.position.set(4.0, 2.4, 5.8);
    cameraEsploso.lookAt(0, -0.1, 0);

    // le etichette dei pezzi: per ognuna, il punto del pezzo a cui si attacca
    const nomiEtichette = {
        lenti: 'Lenti',
        'stanga-dx': 'Stanga destra',
        'stanga-sx': 'Stanga sinistra',
        'stanghe-unite': 'Stanghe',
        nasello: 'Naselli',
        montatura: 'Montatura centrale'
    };
    const etichette = [];
    Object.keys(nomiEtichette).forEach(function(nomePezzo) {
        let partiPezzo = esploso.pezzi[nomePezzo];
        if (!partiPezzo || partiPezzo.length === 0) {
            return;
        }
        if (nomePezzo === 'lenti') {
            // l'etichetta va su una lente sola (la destra), non in mezzo alle due
            const destra = partiPezzo.filter(function(parte) {
                return new THREE.Box3().setFromObject(parte).getCenter(new THREE.Vector3()).x < 0;
            });
            partiPezzo = destra.length ? destra : partiPezzo;
        }
        const elemento = document.createElement('span');
        elemento.className = 'pr-esploso-etichetta';
        elemento.textContent = nomiEtichette[nomePezzo];
        strato.appendChild(elemento);
        etichette.push({ nomePezzo: nomePezzo, parti: partiPezzo, elemento: elemento });
    });

    // il punto dove attaccare un'etichetta: il centro del pezzo, o il suo bordo alto/basso
    // per la montatura (in alto) e i naselli (in basso), così le scritte non si sovrappongono
    function puntoEtichetta(etichetta) {
        const scatola = new THREE.Box3();
        etichetta.parti.forEach(function(parte) {
            scatola.expandByObject(parte);
        });
        const punto = scatola.getCenter(new THREE.Vector3());
        if (etichetta.nomePezzo === 'montatura') punto.y = scatola.max.y;
        if (etichetta.nomePezzo === 'nasello') punto.y = scatola.min.y;
        return punto;
    }

    // a che punto è la scomposizione: 0 = composto, 1 = scomposto. Lo scorrimento della pagina sposta
    // l'obiettivo, il disegno lo raggiunge con dolcezza a ogni fotogramma
    let avanzamento = 0;
    let obiettivo = 0;

    // l'obiettivo è quanto si è scorso lungo il binario del riquadro: resta 0 finché il riquadro nero
    // non occupa tutto lo schermo (e si ferma), arriva a 1 quando sta per ripartire
    const binario = riquadro.closest('.pr-binario');
    function seguiScorrimento() {
        obiettivo = binario ? progressoBinario(binario, riquadro) : 0;
        avvia();
    }
    window.addEventListener('scroll', seguiScorrimento, { passive: true });
    window.addEventListener('resize', seguiScorrimento);

    // la misura del disegno segue quella del riquadro
    function adatta() {
        const larghezza = contenitore.clientWidth;
        const altezza = contenitore.clientHeight;
        pennello.setSize(larghezza, altezza, false);
        cameraEsploso.aspect = larghezza / altezza;
        cameraEsploso.updateProjectionMatrix();
        disegna();
    }
    new ResizeObserver(adatta).observe(contenitore);

    const proiettato = new THREE.Vector3();
    function disegna() {
        const t = morbido(avanzamento);
        esploso.spostamenti.forEach(function(s) {
            s.parte.position.copy(s.composta).addScaledVector(s.spostamento, t);
        });
        esploso.occhiale.updateMatrixWorld(true);
        pennello.render(scenaEsploso, cameraEsploso);

        // le etichette: le metto sopra il punto del pezzo sullo schermo. Compaiono da metà scomposizione in poi
        const larghezza = contenitore.clientWidth;
        const altezza = contenitore.clientHeight;
        const visibilita = Math.max(0, Math.min(1, (t - 0.35) / 0.5));
        etichette.forEach(function(etichetta) {
            proiettato.copy(puntoEtichetta(etichetta)).project(cameraEsploso);
            etichetta.elemento.style.transform =
                'translate(' + ((proiettato.x + 1) / 2 * larghezza) + 'px, ' + ((1 - proiettato.y) / 2 * altezza) + 'px)';
            etichetta.elemento.style.opacity = visibilita;
        });
        suggerimento.style.opacity = 1 - Math.min(1, t * 4);   // "Scorri qui" sparisce appena si inizia
    }

    // disegno solo quando serve: mentre l'avanzamento raggiunge l'obiettivo
    let inMovimento = false;
    function passo() {
        avanzamento += (obiettivo - avanzamento) * 0.15;
        if (Math.abs(obiettivo - avanzamento) < 0.001) {
            avanzamento = obiettivo;
            inMovimento = false;
        }
        disegna();
        if (inMovimento) {
            requestAnimationFrame(passo);
        }
    }
    function avvia() {
        if (!inMovimento) {
            inMovimento = true;
            requestAnimationFrame(passo);
        }
    }

    adatta();
    seguiScorrimento();   // se la pagina è già scesa fin qui, parto dal punto giusto
    contenitore.classList.add('pronto');
}


// quanto si è scorso lungo un "binario" (div.pr-binario, vedi presentazione.css): il suo contenuto
// "fermo" (sticky) resta sullo schermo mentre la pagina scorre. 0 = si è appena fermato,
// 1 = sta per ripartire; prima è 0, dopo è 1
function progressoBinario(binario, fermo) {
    const alto = parseFloat(getComputedStyle(fermo).top) || 0;   // dove si ferma, dall'alto dello schermo
    const corsa = binario.offsetHeight - fermo.offsetHeight;      // per quanto resta fermo
    const fatto = alto - binario.getBoundingClientRect().top;
    return corsa > 0 ? Math.min(1, Math.max(0, fatto / corsa)) : 0;
}


// ===================================================================================
// 14b. LA ROTAZIONE NELL'APERTURA (riquadro grigio in cima, div.pr-eroe-vista)
// Scorrendo, quando il fondo del riquadro grigio arriva in fondo allo schermo, l'apertura si ferma
// e l'occhiale fa un giro completo su se stesso; finito il giro la pagina riprende a scorrere
// ===================================================================================

// il punto in cui l'apertura si ferma: con il suo fondo sul fondo dello schermo.
// Se l'apertura è più bassa dello schermo si ferma subito, appena sotto la barra di navigazione
function preparaBinarioEroe() {
    const eroe = document.querySelector('.pr-eroe-binario > .pr-eroe');
    if (!eroe) {
        return;
    }
    const barra = document.querySelector('.pr-nav');
    function aggiorna() {
        const sottoBarra = barra ? barra.offsetHeight : 0;
        const fermo = Math.min(sottoBarra, window.innerHeight - eroe.offsetHeight);
        eroe.style.setProperty('--fermo', fermo + 'px');
    }
    aggiorna();
    window.addEventListener('resize', aggiorna);
    new ResizeObserver(aggiorna).observe(eroe);   // per esempio quando arriva la foto
}

async function avviaEroe() {
    const vista = document.querySelector('.pr-eroe-vista');
    const eroe = vista ? vista.closest('.pr-eroe') : null;
    const binario = eroe ? eroe.closest('.pr-binario') : null;
    if (!vista || !binario) {
        return;
    }
    const tela = vista.querySelector('.pr-eroe-tela');

    // il mio occhiale nei colori della versione Vulcano, come nella foto
    const pronto = await preparaModello(modelloDaId('mio'));
    const occhiale = pronto.occhiale;
    const pezzi = dividiInPezzi(occhiale, pronto.parti, pronto.livelli);
    const colori = coloriDellaVersione('Vulcano');
    Object.keys(pezzi).forEach(function(nomePezzo) {
        const colore = nomePezzo === 'stanghe-unite' ? colori['stanga-dx'] : colori[nomePezzo];
        if (colore) {
            pezzi[nomePezzo].forEach(function(parte) {
                tingi(parte, colore);
            });
        }
    });
    occhiale.traverse(function(parte) {
        if (parte.isMesh) {
            parte.castShadow = true;
        }
    });
    // giro l'occhiale attorno al suo centro: lo metto dentro un perno
    const perno = new THREE.Group();
    perno.add(occhiale);

    // il motore 3D: fondo trasparente (si vede il grigio dell'apertura), luci come nello studio delle foto
    const pennello = new THREE.WebGLRenderer({ canvas: tela, antialias: true, alpha: true });
    pennello.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    pennello.shadowMap.enabled = true;
    pennello.shadowMap.type = THREE.PCFSoftShadowMap;
    const scenaEroe = new THREE.Scene();
    const riflessiEroe = new THREE.PMREMGenerator(pennello).fromScene(new RoomEnvironment(), 0.04).texture;
    scenaEroe.environment = riflessiEroe;
    scenaEroe.environmentIntensity = 0.7;
    scenaEroe.add(new THREE.AmbientLight(0xffffff, 0.5));
    const luce = new THREE.DirectionalLight(0xffffff, 1.4);
    luce.position.set(3, 6, 4);
    luce.castShadow = true;
    luce.shadow.mapSize.set(2048, 2048);
    luce.shadow.radius = 8;
    Object.assign(luce.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 20 });
    luce.shadow.camera.updateProjectionMatrix();
    scenaEroe.add(luce);
    const luceDietro = new THREE.DirectionalLight(0xffffff, 0.6);
    luceDietro.position.set(-3, 3, -5);
    scenaEroe.add(luceDietro);
    // il "pavimento" che mostra solo l'ombra, appena sotto l'occhiale
    const pavimento = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.12 }));
    pavimento.rotation.x = -Math.PI / 2;
    pavimento.position.y = new THREE.Box3().setFromObject(occhiale).min.y - 0.02;
    pavimento.receiveShadow = true;
    scenaEroe.add(pavimento);
    scenaEroe.add(perno);
    const cameraEroe = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 100);
    cameraEroe.position.set(2.3, 1.0, 4.4);   // la stessa inquadratura della foto "eroe"
    cameraEroe.lookAt(0, -0.1, 0);

    // l'angolo: 0 = come nella foto, 1 = un giro completo. Lo scorrimento sposta l'obiettivo,
    // il disegno lo raggiunge con dolcezza
    let giro = 0;
    let obiettivo = 0;
    function disegna() {
        perno.rotation.y = giro * Math.PI * 2;
        pennello.render(scenaEroe, cameraEroe);
    }
    let inMovimento = false;
    function passo() {
        giro += (obiettivo - giro) * 0.12;
        if (Math.abs(obiettivo - giro) < 0.0005) {
            giro = obiettivo;
            inMovimento = false;
        }
        disegna();
        if (inMovimento) {
            requestAnimationFrame(passo);
        }
    }
    function seguiScorrimento() {
        obiettivo = progressoBinario(binario, eroe);
        if (!inMovimento) {
            inMovimento = true;
            requestAnimationFrame(passo);
        }
    }
    window.addEventListener('scroll', seguiScorrimento, { passive: true });
    window.addEventListener('resize', seguiScorrimento);

    // la misura del disegno segue quella della foto
    new ResizeObserver(function() {
        const larghezza = vista.clientWidth;
        const altezza = vista.clientHeight;
        if (larghezza === 0 || altezza === 0) {
            return;
        }
        pennello.setSize(larghezza, altezza, false);
        cameraEroe.aspect = larghezza / altezza;
        cameraEroe.updateProjectionMatrix();
        disegna();
    }).observe(vista);

    giro = obiettivo = progressoBinario(binario, eroe);
    disegna();
    vista.classList.add('dal-vivo');   // la tela prende il posto della foto
}


// ===================================================================================
// 15. SI PARTE
// ===================================================================================
// si parte con il modello selezionato nella galleria (il mio occhiale); poi le foto della presentazione
// e, con calma, le anteprime della galleria
// nella home: il mio occhiale. Nella pagina di dettaglio: il modello scritto nell'indirizzo (?modello=id)
const modelloIniziale = paginaDettaglio ? modelloDaId(new URLSearchParams(location.search).get('modello')) : modelloDaId('mio');
if (paginaDettaglio) {
    history.replaceState({ modello: modelloIniziale.id }, '', 'dettaglio.html?modello=' + modelloIniziale.id);
    document.title = modelloIniziale.nome + ' – Octulus';
    segnaScelto(modelloIniziale);
}
preparaBinarioEroe();
await caricaModello(modelloIniziale);
try {
    await scattaFoto();
} catch (errore) {
    console.error('Foto della presentazione non riuscite', errore);
}
try {
    await avviaEroe();
} catch (errore) {
    console.error('Rotazione dell\'apertura non riuscita', errore);
}
try {
    await avviaEsploso();
} catch (errore) {
    console.error('Esploso della presentazione non riuscito', errore);
}
preparaAnteprime();
