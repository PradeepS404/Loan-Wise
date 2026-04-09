/* ===========================
   Landing Page Script
   =========================== */

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initScrollAnimations();

    // Animate hero gauge on load
    const gaugeCircle = document.querySelector('.gauge-svg circle:last-of-type');
    if (gaugeCircle) {
        setTimeout(() => {
            gaugeCircle.style.transition = 'stroke-dashoffset 1.5s ease-out';
            gaugeCircle.setAttribute('stroke-dashoffset', '50');
        }, 500);
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
});
