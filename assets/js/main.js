/**
 * Paul & Roselyn Wedding Invitation Web Application
 * Event Date: December 19, 2026 · 9:00 AM (UTC+8)
 * Imus, Cavite, Philippines
 */

(function () {
  'use strict';

  // ==========================================
  // 1. Toast Notification Helper
  // ==========================================
  const toast = document.getElementById('toastNotice');
  let toastTimer = null;

  function showToast(message, duration = 3200) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  // ==========================================
  // 2. Animated Wax Seal & Envelope Opening
  // ==========================================
  const coverPanel = document.getElementById('panel-1');
  const sealHotspot = document.querySelector('.hotspot.open-seal');

  if (coverPanel && sealHotspot) {
    sealHotspot.addEventListener('click', function (e) {
      e.preventDefault();
      if (coverPanel.classList.contains('opening')) return;

      coverPanel.classList.add('opening');
      sealHotspot.setAttribute('aria-label', 'Opening invitation...');

      // Smoothly scroll to the main invitation after the flap opening animation
      window.setTimeout(() => {
        const nextPanel = document.getElementById('panel-2');
        if (nextPanel) {
          nextPanel.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
            block: 'start'
          });
        }
      }, 1100);
    });
  }

  // ==========================================
  // 3. Real-Time Live Countdown (UTC+8 Imus, PH)
  // ==========================================
  const targetDate = new Date('2026-12-19T09:00:00+08:00');
  const cdDays = document.getElementById('cd-days');
  const cdHours = document.getElementById('cd-hours');
  const cdMinutes = document.getElementById('cd-minutes');
  const cdSeconds = document.getElementById('cd-seconds');

  const padZero = (n) => String(n).padStart(2, '0');

  function updateCountdown() {
    const now = Date.now();
    const diff = targetDate.getTime() - now;

    if (diff <= 0) {
      if (cdDays) cdDays.textContent = '00';
      if (cdHours) cdHours.textContent = '00';
      if (cdMinutes) cdMinutes.textContent = '00';
      if (cdSeconds) cdSeconds.textContent = '00';
      return;
    }

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    if (cdDays) cdDays.textContent = String(d);
    if (cdHours) cdHours.textContent = padZero(h);
    if (cdMinutes) cdMinutes.textContent = padZero(m);
    if (cdSeconds) cdSeconds.textContent = padZero(s);
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);

  // ==========================================
  // 4. Modals (Calendar, Registry, Lightbox)
  // ==========================================
  function setupModal(modalId, triggerSelector) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    document.querySelectorAll(triggerSelector).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        modal.classList.add('open');
      });
    });

    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => modal.classList.remove('open'));
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });
  }

  setupModal('calendarModal', '.btn-open-calendar');
  setupModal('registryModal', '.btn-show-registry');

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open, .lightbox-overlay.open').forEach(el => {
        el.classList.remove('open');
      });
    }
  });

  // ==========================================
  // 5. Add to Calendar (.ics Generator & Google Cal)
  // ==========================================
  const downloadIcsBtn = document.getElementById('downloadIcsBtn');
  if (downloadIcsBtn) {
    downloadIcsBtn.addEventListener('click', function (e) {
      e.preventDefault();

      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Paul and Roselyn//Wedding Invitation//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        'UID:paul-roselyn-wedding-20261219@weddinginvite',
        'DTSTAMP:20261018T000000Z',
        'DTSTART:20261219T010000Z', // 9:00 AM UTC+8 is 01:00 UTC
        'DTEND:20261219T060000Z',   // 2:00 PM UTC+8 is 06:00 UTC
        'SUMMARY:Paul & Roselyn Wedding',
        'DESCRIPTION:Paul & Roselyn Wedding Ceremony & Reception.\\nCeremony: 9:00 AM at Our Lady of the Pillar Parish (Imus Cathedral)\\nReception: 11:00 AM - 2:00 PM at Nathan\\'s Catering and Events Services, Imus, Cavite.',
        'LOCATION:Our Lady of the Pillar Parish (Imus Cathedral), Imus, Cavite, Philippines',
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute('download', 'Paul-and-Roselyn-Wedding.ics');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Downloaded calendar invite (.ics)!');
      document.getElementById('calendarModal')?.classList.remove('open');
    });
  }

  // ==========================================
  // 6. Photo Replacement Controls (FileReader)
  // ==========================================
  document.querySelectorAll('.photo-replace-zone').forEach(function (zone) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.hidden = true;
    input.setAttribute('aria-label', 'Choose replacement photo');
    zone.insertAdjacentElement('afterend', input);

    zone.addEventListener('click', function () {
      input.click();
    });

    input.addEventListener('change', function () {
      const file = input.files && input.files[0];
      if (!file || !file.type || !file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = function () {
        const preview = zone.querySelector('.photo-replace-preview');
        if (!preview) return;
        preview.src = reader.result;
        zone.classList.add('has-photo');
        showToast('Photo updated preview!');
      };
      reader.readAsDataURL(file);
    });
  });

  // ==========================================
  // 7. Photo Gallery Lightbox
  // ==========================================
  const lightbox = document.getElementById('galleryLightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxClose = document.getElementById('lightboxClose');

  if (lightbox && lightboxImg) {
    document.querySelectorAll('.photo-replace-zone').forEach(zone => {
      zone.addEventListener('dblclick', function (e) {
        e.stopPropagation();
        const preview = zone.querySelector('.photo-replace-preview');
        if (preview && preview.src && preview.src !== '') {
          lightboxImg.src = preview.src;
          lightbox.classList.add('open');
        }
      });
    });

    if (lightboxClose) {
      lightboxClose.addEventListener('click', () => lightbox.classList.remove('open'));
    }

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) lightbox.classList.remove('open');
    });
  }

  // ==========================================
  // 8. RSVP Form Handlers (WhatsApp & Messenger)
  // ==========================================
  const rsvpForm = document.getElementById('guest-rsvp');

  function getRsvpData() {
    if (!rsvpForm) return null;
    const formData = new FormData(rsvpForm);
    const name = formData.get('name')?.toString().trim();
    const attendance = formData.get('attendance')?.toString().trim();
    const guests = formData.get('guests')?.toString().trim() || '1';
    const message = formData.get('message')?.toString().trim() || 'None';

    if (!name || !attendance) {
      showToast('Please fill in your name and attendance status.');
      return null;
    }

    return { name, attendance, guests, message };
  }

  function formatRsvpText(data) {
    return [
      '💍 PAUL & ROSELYN WEDDING RSVP',
      '--------------------------------',
      `Name: ${data.name}`,
      `Attendance: ${data.attendance}`,
      `Number of Guests: ${data.guests}`,
      `Message for the Couple: ${data.message}`,
      '--------------------------------',
      'December 19, 2026 · Imus, Cavite'
    ].join('\n');
  }

  // WhatsApp Submit
  if (rsvpForm) {
    rsvpForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const data = getRsvpData();
      if (!data) return;

      const formattedText = formatRsvpText(data);
      const whatsappUrl = 'https://wa.me/?text=' + encodeURIComponent(formattedText);
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      showToast('Opening WhatsApp with your RSVP message...');
    });
  }

  // Copy for Facebook Messenger / Viber / SMS
  const copyMessengerBtn = document.getElementById('copyMessengerBtn');
  if (copyMessengerBtn) {
    copyMessengerBtn.addEventListener('click', function (e) {
      e.preventDefault();
      const data = getRsvpData();
      if (!data) return;

      const formattedText = formatRsvpText(data);
      navigator.clipboard.writeText(formattedText).then(() => {
        showToast('✓ RSVP copied! Paste it into Messenger or Viber.', 4500);
      }).catch(() => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = formattedText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('✓ RSVP copied to clipboard!', 4000);
      });
    });
  }

  // ==========================================
  // 9. 1-Click Copy Account Details (GCash/Bank)
  // ==========================================
  document.querySelectorAll('.btn-copy-acc').forEach(btn => {
    btn.addEventListener('click', function () {
      const accNumber = this.getAttribute('data-acc');
      if (!accNumber) return;

      navigator.clipboard.writeText(accNumber).then(() => {
        showToast(`Copied ${accNumber} to clipboard!`);
      });
    });
  });

  // ==========================================
  // 10. Sticky Navigation Active Link Highlight
  // ==========================================
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.quicknav a');

  function highlightNav() {
    let scrollY = window.pageYOffset;

    sections.forEach(current => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 100;
      const sectionId = current.getAttribute('id');

      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }

  window.addEventListener('scroll', highlightNav, { passive: true });

})();
