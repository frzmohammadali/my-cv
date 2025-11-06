// Handle document ready
document.addEventListener('DOMContentLoaded', () => {
    feather.replace();
    initVanta();
    initLanguage();
    initDownloadDropdown();
    initGlobalViewCounter();

    // Close modal on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
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

// Turnstile configuration
const TURNSTILE_SITE_KEY = '0x4AAAAAAB_jw--mhD6z0CmX'; // You'll get this from Cloudflare
let sessionToken = localStorage.getItem('turnstileSessionToken');

// Add this function to verify Turnstile
async function verifyTurnstile() {
    try {
        // Execute Turnstile
        const token = await new Promise((resolve, reject) => {
            turnstile.ready(() => {
                turnstile.execute(TURNSTILE_SITE_KEY, {
                    action: 'view',
                    execution: 'execute',
                    theme: 'dark'
                }).then(resolve).catch(reject);
            });
        });

        // Verify token with our worker
        const response = await fetch('https://visitor-counter.feed-shallow045.workers.dev/verify-turnstile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token })
        });

        const data = await response.json();

        if (data.success) {
            sessionToken = data.sessionToken;
            localStorage.setItem('turnstileSessionToken', sessionToken);
            return true;
        } else {
            console.error('Turnstile verification failed:', data.error);
            return false;
        }
    } catch (error) {
        console.error('Turnstile verification error:', error);
        return false;
    }
}

// Initialize Vanta.js background
function initVanta() {
    if (window.VANTA && window.THREE) {
        VANTA.NET({
            el: "#vanta-bg",
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.00,
            minWidth: 200.00,
            scale: 1.00,
            scaleMobile: 1.00,
            color: 0x3b82f6,        // Original blue color
            backgroundColor: 0x111827,
            points: 8.00,           // Moderate number of points
            maxDistance: 20.00,     // Moderate connection distance
            spacing: 20.00,         // Balanced spacing
            showDots: true,         // Show dots but make them subtle
            lineColor: 0x3b82f6,    // Match line color
            alpha: 0.6,             // Moderate transparency
            beta: 0.6,              // Moderate movement speed
            backgroundAlpha: 1      // Keep background visible
        });
    } else {
        // Retry after a short delay if Three.js isn't loaded yet
        setTimeout(initVanta, 100);
    }
}

let currentCertImage = '';

function showCertImage(src) {
    const modal = document.getElementById('certModal');
    const image = document.getElementById('certFullImage');

    currentCertImage = src;
    image.src = src;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Add fade-in effect
    setTimeout(() => {
        modal.style.opacity = '1';
    }, 10);
}

function hideCertImage() {
    const modal = document.getElementById('certModal');
    modal.style.opacity = '0';

    setTimeout(() => {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }, 300);
}

// Smooth scroll to contact form
function smoothScrollToContact() {
    document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
}

function initDownloadDropdown() {
    const dropdownButton = document.querySelector('#download-dropdown button');
    const dropdownMenu = document.getElementById('dropdown-menu');

    if (dropdownButton && dropdownMenu) {
        // Toggle dropdown on click (for mobile)
        dropdownButton.addEventListener('click', (e) => {
            e.preventDefault();
            const isHidden = dropdownMenu.classList.contains('hidden');

            // Close all other open dropdowns
            closeAllDropdowns();

            if (isHidden) {
                dropdownMenu.classList.remove('hidden');
                // Add click outside listener
                setTimeout(() => {
                    document.addEventListener('click', closeDropdownOnClickOutside);
                }, 10);
            }
        });

        // Keep dropdown open when hovering over it
        dropdownMenu.addEventListener('mouseenter', () => {
            dropdownMenu.classList.remove('hidden');
        });

        dropdownMenu.addEventListener('mouseleave', () => {
            // Only hide on mouseleave if not on mobile
            if (!isMobile()) {
                dropdownMenu.classList.add('hidden');
            }
        });
    }
}

function closeAllDropdowns() {
    const dropdowns = document.querySelectorAll('#dropdown-menu');
    dropdowns.forEach(dropdown => {
        dropdown.classList.add('hidden');
    });
    // Remove any existing click listeners
    document.removeEventListener('click', closeDropdownOnClickOutside);
}

function closeDropdownOnClickOutside(e) {
    const dropdown = document.getElementById('dropdown-menu');
    const dropdownButton = document.querySelector('#download-dropdown button');

    if (dropdown && dropdownButton &&
        !dropdown.contains(e.target) &&
        !dropdownButton.contains(e.target)) {
        dropdown.classList.add('hidden');
        document.removeEventListener('click', closeDropdownOnClickOutside);
    }
}

function isMobile() {
    return window.innerWidth <= 768;
}

// Close dropdown when window is resized
window.addEventListener('resize', () => {
    if (!isMobile()) {
        closeAllDropdowns();
    }
});


// Email protection against bots
document.addEventListener('DOMContentLoaded', () => {
    const part1 = 'frz.mohammadali.me';
    const part2 = 'gmail.com';
    const fullEmail = part1 + '@' + part2;

    // Set the email text content
    document.getElementById('email-part1').textContent = part1;
    document.getElementById('email-part2').textContent = part2;

    // Make it clickable for real users
    const emailContainer = document.querySelector('.email-container');
    if (emailContainer) {
        emailContainer.style.cursor = 'pointer';
        emailContainer.title = 'Click to copy email address';

        emailContainer.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(fullEmail);
                showCopyFeedback(emailContainer, true);
            } catch (err) {
                // Fallback for older browsers
                fallbackCopyText(fullEmail, emailContainer);
            }
        });

        // Add hover effects
        emailContainer.addEventListener('mouseenter', () => {
            emailContainer.style.transform = 'translateY(-2px)';
            emailContainer.style.borderColor = 'rgb(59, 130, 246)';
            emailContainer.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
        });

        emailContainer.addEventListener('mouseleave', () => {
            emailContainer.style.transform = 'translateY(0)';
            emailContainer.style.borderColor = '';
            emailContainer.style.boxShadow = '';
        });
    }
});

function showCopyFeedback(container, success) {
    const originalContent = container.innerHTML;
    if (success) {
        container.innerHTML = '<span class="text-green-400 flex items-center justify-center gap-2"><i data-feather="check" class="w-4 h-4"></i>Copied to clipboard!</span>';
    } else {
        container.innerHTML = '<span class="text-red-400 flex items-center justify-center gap-2"><i data-feather="x" class="w-4 h-4"></i>Copy failed</span>';
    }
    feather.replace();

    setTimeout(() => {
        // Restore original content with the copy icon
        container.innerHTML = `
            <span id="email-part1">frz.mohammadali.me</span>
            <span>@</span>
            <span id="email-part2">gmail.com</span>
            <i data-feather="copy" class="w-4 h-4 ml-2 text-gray-400 group-hover:text-blue-400 transition-colors duration-200"></i>
        `;
        feather.replace();
    }, 2000);
}

function fallbackCopyText(text, container) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);

    try {
        textArea.select();
        textArea.setSelectionRange(0, 99999); // For mobile devices
        const successful = document.execCommand('copy');
        showCopyFeedback(container, successful);
    } catch (err) {
        showCopyFeedback(container, false);
        // Final fallback - show email in alert
        setTimeout(() => {
            alert(`Email: ${text}\n\nPlease copy the email address manually.`);
        }, 500);
    } finally {
        document.body.removeChild(textArea);
    }
}

// Language management
let currentLanguage = 'en';

function setLanguage(lang) {
    currentLanguage = lang;

    // Update active button styling
    document.querySelectorAll('.lang-btn').forEach(btn => {
        const isActive = btn.dataset.lang === lang;
        btn.className = `lang-btn px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${isActive
            ? 'bg-blue-500 text-white'
            : 'text-gray-300 bg-gray-800/50 hover:bg-blue-600 hover:text-white'
            }`;
    });

    // Update all translatable elements
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        if (translations[lang] && translations[lang][key]) {
            element.textContent = translations[lang][key];
        }
    });

    // Update URL without page reload
    const url = new URL(window.location);
    url.searchParams.set('lang', lang);
    window.history.replaceState({}, '', url);
}

function initLanguage() {
    // Check URL parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');

    if (urlLang && (urlLang === 'en' || urlLang === 'de')) {
        setLanguage(urlLang);
    } else {
        // Check browser language
        const browserLang = navigator.language.split('-')[0];
        if (browserLang === 'de') {
            setLanguage('de');
        }
    }

    // Add click handlers to language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setLanguage(btn.dataset.lang);
        });
    });
}

// Scroll to top function
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Modify the existing initGlobalViewCounter function
async function initGlobalViewCounter() {
    try {
        // Check if we have a valid session token
        if (!sessionToken) {
            // Show Turnstile verification
            const verified = await verifyTurnstile();
            if (!verified) {
                document.getElementById('visitorCount').textContent = 'Verification required';
                return;
            }
        }

        // Replace with your actual Worker URL
        const workerUrl = 'https://visitor-counter.feed-shallow045.workers.dev/count';

        const response = await fetch(workerUrl, {
            headers: {
                'x-session-token': sessionToken
            }
        });

        if (response.status === 401) {
            // Session expired or invalid, re-verify
            localStorage.removeItem('turnstileSessionToken');
            sessionToken = null;
            await initGlobalViewCounter();
            return;
        }

        if (response.ok) {
            const data = await response.json();
            document.getElementById('visitorCount').textContent = data.count;
        } else {
            document.getElementById('visitorCount').textContent = '?';
        }
    } catch (error) {
        console.log('Counter service unavailable');
        document.getElementById('visitorCount').textContent = '?';
    }
}