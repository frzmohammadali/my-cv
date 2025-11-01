// Handle document ready
document.addEventListener('DOMContentLoaded', () => {
    feather.replace();
    
    // Initialize animations
    anime({
        targets: '.glass-card',
        translateY: [50, 0],
        opacity: [0, 1],
        duration: 1000,
        delay: anime.stagger(200),
        easing: 'easeOutExpo'
    });

    // Close modal on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !document.getElementById('certModal').classList.contains('hidden')) {
            hideCertImage();
        }
    });

    // Close modal when clicking outside image
    document.getElementById('certModal').addEventListener('click', (e) => {
        if (e.target.id === 'certModal') {
            hideCertImage();
        }
    });
});

// Certification modal functions
function showCertImage(src) {
    document.getElementById('certFullImage').src = src;
    document.getElementById('certModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function hideCertImage() {
    document.getElementById('certModal').classList.add('hidden');
    document.body.style.overflow = '';
}

// Smooth scroll to contact form
function smoothScrollToContact() {
    document.getElementById('contact').scrollIntoView({behavior: 'smooth'});
}