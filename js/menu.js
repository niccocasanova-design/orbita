document.addEventListener('DOMContentLoaded', function() {
    const btnMenu = document.querySelector('.btn-menu');
    const btnClose = document.querySelector('.btn-close');
    const mobileNavWrapper = document.querySelector('.mobile-nav-wrapper');
    const navLinks = document.querySelectorAll('.mobile-nav-wrapper .nav-link');

    // Assicurati che il display sia flex prima di aggiungere show
    btnMenu.addEventListener('click', function() {
        mobileNavWrapper.style.display = 'flex';
        // Piccolo delay per permettere al display di attivarsi
        setTimeout(() => {
            mobileNavWrapper.classList.add('show');
        }, 10);
    });

    // Chiude il menu mobile
    function closeMenu() {
        mobileNavWrapper.classList.remove('show');
        // Rimuovi display dopo l'animazione
        setTimeout(() => {
            if (!mobileNavWrapper.classList.contains('show')) {
                mobileNavWrapper.style.display = 'none';
            }
        }, 300); // Stesso tempo della transizione CSS
    }

    btnClose.addEventListener('click', closeMenu);

    mobileNavWrapper.addEventListener('click', function(e) {
        let isLink = false;
        navLinks.forEach(function(link) {
            if (link.contains(e.target)) {
                isLink = true;
            }
        });
        
        if (!isLink) {
            closeMenu();
        }
    });
});
