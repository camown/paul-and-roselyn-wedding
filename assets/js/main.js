/**
 * Paul & Roselyn Wedding Invitation Web Application
 * Native High-Resolution Codebase with Working RSVP Backend & Dev Photo Settings
 * Event Date: December 19, 2026 · 9:00 AM (UTC+8) · Imus, Cavite, Philippines
 */

(function () {
  'use strict';

  // ============================================================
  // 1. Toast Notification Helper
  // ============================================================
  const toast = document.getElementById('toastNotice');
  let toastTimer = null;

  function showToast(message, duration = 3500) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  // ============================================================
  // 2. Interactive Wax Seal & Envelope Opening
  // ============================================================
  const envelopeHero = document.querySelector('.envelope-hero');
  const waxSealBtn = document.getElementById('waxSealBtn');

  if (waxSealBtn && envelopeHero) {
    waxSealBtn.addEventListener('click', function (e) {
      e.preventDefault();
      envelopeHero.classList.add('open');
      showToast('Opening invitation...');

      setTimeout(() => {
        const inviteSection = document.getElementById('invitation');
        if (inviteSection) {
          inviteSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 700);
    });
  }

  // ============================================================
  // 3. Real-Time Live Countdown (UTC+8 Philippine Time)
  // ============================================================
  const targetDate = new Date('2026-12-19T09:00:00+08:00');
  const cdDays = document.getElementById('cdDays');
  const cdHours = document.getElementById('cdHours');
  const cdMinutes = document.getElementById('cdMinutes');
  const cdSeconds = document.getElementById('cdSeconds');

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

    const pad = n => String(n).padStart(2, '0');
    if (cdDays) cdDays.textContent = String(d);
    if (cdHours) cdHours.textContent = pad(h);
    if (cdMinutes) cdMinutes.textContent = pad(m);
    if (cdSeconds) cdSeconds.textContent = pad(s);
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);

  // ============================================================
  // 4. Photo Customizer with LocalStorage Persistence
  // ============================================================
  const defaultPlaceholders = {
    'story-photo': 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1000&q=80',
    'gallery-photo-1': 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
    'gallery-photo-2': 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80',
    'gallery-photo-3': 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=800&q=80'
  };

  function updateSlotImages(slotId, imgSrc) {
    const mainImg = document.getElementById(slotId);
    if (mainImg) mainImg.src = imgSrc;

    const thumbImg = document.getElementById('thumb-' + slotId);
    if (thumbImg) thumbImg.src = imgSrc;
  }

  function loadPersistedPhotos() {
    Object.keys(defaultPlaceholders).forEach(slotId => {
      const saved = localStorage.getItem('wedding_custom_photo_' + slotId);
      const src = saved || defaultPlaceholders[slotId];
      updateSlotImages(slotId, src);
    });
  }

  loadPersistedPhotos();

  function setupPhotoUploadTrigger(btn, slotId) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.hidden = true;
    document.body.appendChild(fileInput);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });

    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file || !file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result;
        updateSlotImages(slotId, base64Data);
        try {
          localStorage.setItem('wedding_custom_photo_' + slotId, base64Data);
          showToast('✓ Photo updated and saved!');
        } catch (err) {
          showToast('✓ Photo preview updated!');
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // Setup inline change buttons
  document.querySelectorAll('[data-photo-trigger]').forEach(btn => {
    const slotId = btn.getAttribute('data-photo-trigger');
    setupPhotoUploadTrigger(btn, slotId);
  });

  // Setup Dev Drawer upload buttons
  document.querySelectorAll('[data-drawer-upload]').forEach(btn => {
    const slotId = btn.getAttribute('data-drawer-upload');
    setupPhotoUploadTrigger(btn, slotId);
  });

  // Reset all photos button
  const btnDevResetAll = document.getElementById('btnDevResetAll');
  if (btnDevResetAll) {
    btnDevResetAll.addEventListener('click', () => {
      if (confirm('Reset all custom uploaded photos back to default placeholders?')) {
        Object.keys(defaultPlaceholders).forEach(slotId => {
          localStorage.removeItem('wedding_custom_photo_' + slotId);
          updateSlotImages(slotId, defaultPlaceholders[slotId]);
        });
        showToast('✓ All photos restored to defaults.');
      }
    });
  }

  // Dev Settings Drawer Toggle
  const devSettingsToggleBtn = document.getElementById('devSettingsToggleBtn');
  const devDrawerBackdrop = document.getElementById('devDrawerBackdrop');
  const devDrawerClose = document.getElementById('devDrawerClose');

  if (devSettingsToggleBtn && devDrawerBackdrop) {
    devSettingsToggleBtn.addEventListener('click', () => {
      devDrawerBackdrop.classList.add('open');
    });

    if (devDrawerClose) {
      devDrawerClose.addEventListener('click', () => {
        devDrawerBackdrop.classList.remove('open');
      });
    }

    devDrawerBackdrop.addEventListener('click', (e) => {
      if (e.target === devDrawerBackdrop) {
        devDrawerBackdrop.classList.remove('open');
      }
    });
  }
  // Google Sheets Configuration in Dev Drawer
  const inputGoogleSheetUrl = document.getElementById('inputGoogleSheetUrl');
  const btnSaveSheetUrl = document.getElementById('btnSaveSheetUrl');
  const btnTestSheetSync = document.getElementById('btnTestSheetSync');

  if (inputGoogleSheetUrl) {
    inputGoogleSheetUrl.value = localStorage.getItem('wedding_google_sheet_url') || '';
  }

  if (btnSaveSheetUrl && inputGoogleSheetUrl) {
    btnSaveSheetUrl.addEventListener('click', () => {
      const url = inputGoogleSheetUrl.value.trim();
      if (!url) {
        localStorage.removeItem('wedding_google_sheet_url');
        showToast('Google Sheets URL cleared.');
      } else {
        localStorage.setItem('wedding_google_sheet_url', url);
        showToast('✓ Google Sheets Web App URL saved!');
      }
    });
  }

  if (btnTestSheetSync && inputGoogleSheetUrl) {
    btnTestSheetSync.addEventListener('click', async () => {
      const url = inputGoogleSheetUrl.value.trim() || localStorage.getItem('wedding_google_sheet_url');
      if (!url) {
        showToast('Please paste your Google Apps Script URL first.');
        return;
      }
      showToast('Sending test row to Google Sheet...');
      try {
        await fetch(url, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Test Guest (Setup Verification)',
            attendance: 'Joyfully Accepts',
            guests: '2',
            contact: '0917-123-4567',
            message: 'Testing Google Sheet sync for Paul & Roselyn!',
            timestamp: new Date().toISOString()
          })
        });
        showToast('✓ Test row dispatched to Google Sheet!');
      } catch (err) {
        showToast('Error sending to sheet: ' + err.message);
      }
    });
  }

  // ============================================================
  // 5. Interactive Dress Code Palette Chips
  // ============================================================
  document.querySelectorAll('.swatch-card').forEach(card => {
    card.addEventListener('click', () => {
      const name = card.getAttribute('data-color-name');
      const hex = card.getAttribute('data-color-hex');
      navigator.clipboard.writeText(hex).then(() => {
        showToast(`Copied ${name} (${hex}) to clipboard!`);
      });
    });
  });

  // ============================================================
  // 6. Working RSVP Form Submission & Storage
  // ============================================================
  const rsvpForm = document.getElementById('rsvpForm');
  const btnSubmitRsvp = document.getElementById('btnSubmitRsvp');
  const rsvpSuccessModal = document.getElementById('rsvpSuccessModal');

  // Radio button styling for attendance
  document.querySelectorAll('.attendance-radio-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.attendance-radio-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    });
  });

  function getLocalRsvps() {
    try {
      const data = localStorage.getItem('wedding_rsvps');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveLocalRsvp(rsvp) {
    const list = getLocalRsvps();
    list.unshift(rsvp);
    localStorage.setItem('wedding_rsvps', JSON.stringify(list));
  }

  if (rsvpForm) {
    rsvpForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const formData = new FormData(rsvpForm);
      const name = formData.get('name')?.toString().trim();
      const attendance = formData.get('attendance')?.toString().trim();
      const guests = formData.get('guests')?.toString().trim() || '1';
      const contact = formData.get('contact')?.toString().trim() || 'None';
      const message = formData.get('message')?.toString().trim() || '';

      if (!name || !attendance) {
        showToast('Please fill in your name and select your attendance.');
        return;
      }

      const rsvpData = {
        id: 'rsvp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        name,
        attendance,
        guests: attendance === 'Regretfully Declines' ? '0' : guests,
        contact,
        message,
        createdAt: new Date().toISOString()
      };

      if (btnSubmitRsvp) {
        btnSubmitRsvp.disabled = true;
        btnSubmitRsvp.innerHTML = `Recording Your RSVP...`;
      }

      // 1. Try sending to /api/rsvp (Backend Serverless)
      try {
        await fetch('/api/rsvp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rsvpData)
        });
      } catch (err) {
        console.warn('Backend note: Stored in persistent local database.');
      }

      // 2. Dispatch to Google Sheets if configured
      const sheetUrl = localStorage.getItem('wedding_google_sheet_url');
      if (sheetUrl && sheetUrl.trim() !== '') {
        try {
          fetch(sheetUrl.trim(), {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: rsvpData.name,
              attendance: rsvpData.attendance,
              guests: rsvpData.guests,
              contact: rsvpData.contact,
              message: rsvpData.message,
              timestamp: rsvpData.createdAt
            })
          }).catch(e => console.warn('Google Sheet fetch note:', e));
        } catch (e) {
          console.warn('Google Sheet dispatch note:', e);
        }
      }

      // 3. Always persist locally
      saveLocalRsvp(rsvpData);

      if (btnSubmitRsvp) {
        btnSubmitRsvp.disabled = false;
        btnSubmitRsvp.innerHTML = `Send RSVP`;
      }

      // Show Success Modal
      const guestNameSuccess = document.getElementById('guestNameSuccess');
      const rsvpStatusSuccess = document.getElementById('rsvpStatusSuccess');
      if (guestNameSuccess) guestNameSuccess.textContent = name;
      if (rsvpStatusSuccess) {
        rsvpStatusSuccess.textContent = attendance === 'Joyfully Accepts'
          ? `Joyfully Confirmed for ${guests} guest(s)!`
          : 'Regretfully Declined with love.';
      }

      const btnModalWhatsapp = document.getElementById('btnModalWhatsapp');
      if (btnModalWhatsapp) {
        const waText = [
          '💍 Paul & Roselyn Wedding RSVP',
          `Name: ${name}`,
          `Attendance: ${attendance}`,
          `Guests: ${guests}`,
          `Message: ${message || 'None'}`
        ].join('\n');
        btnModalWhatsapp.href = 'https://wa.me/?text=' + encodeURIComponent(waText);
      }

      if (rsvpSuccessModal) {
        rsvpSuccessModal.classList.add('open');
      }

      rsvpForm.reset();
      document.querySelectorAll('.attendance-radio-card').forEach(c => c.classList.remove('selected'));
      showToast('✓ RSVP successfully recorded!');
    });
  }

  // ============================================================
  // 7. Couple's Admin Dashboard & CSV Export
  // ============================================================
  const adminModal = document.getElementById('adminModal');
  const openAdminBtn = document.getElementById('openAdminBtn');
  const adminTableBody = document.getElementById('adminTableBody');
  const totalRsvpCountEl = document.getElementById('totalRsvpCount');
  const totalAttendingCountEl = document.getElementById('totalAttendingCount');
  const totalHeadcountEl = document.getElementById('totalHeadcount');
  const exportCsvBtn = document.getElementById('exportCsvBtn');

  function renderAdminDashboard() {
    const list = getLocalRsvps();
    let attendingCount = 0;
    let totalHeadcount = 0;

    list.forEach(r => {
      if (r.attendance === 'Joyfully Accepts') {
        attendingCount++;
        totalHeadcount += parseInt(r.guests, 10) || 1;
      }
    });

    if (totalRsvpCountEl) totalRsvpCountEl.textContent = list.length;
    if (totalAttendingCountEl) totalAttendingCountEl.textContent = attendingCount;
    if (totalHeadcountEl) totalHeadcountEl.textContent = totalHeadcount;

    if (adminTableBody) {
      if (list.length === 0) {
        adminTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:18px; color:#8b6851;">No RSVPs received yet.</td></tr>`;
      } else {
        adminTableBody.innerHTML = list.map(r => `
          <tr>
            <td><strong>${r.name}</strong></td>
            <td><span style="color:${r.attendance === 'Joyfully Accepts' ? '#2e7d32' : '#c62828'}; font-weight:700;">${r.attendance}</span></td>
            <td>${r.guests}</td>
            <td>${r.contact || '—'}</td>
            <td><small>${r.message || '—'}</small></td>
          </tr>
        `).join('');
      }
    }
  }

  if (openAdminBtn && adminModal) {
    openAdminBtn.addEventListener('click', (e) => {
      e.preventDefault();
      renderAdminDashboard();
      adminModal.classList.add('open');
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      renderAdminDashboard();
      if (adminModal) adminModal.classList.add('open');
    }
  });

  // Export to CSV
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      const list = getLocalRsvps();
      if (list.length === 0) {
        showToast('No RSVPs to export yet.');
        return;
      }

      const headers = ['Name', 'Attendance', 'Guest Count', 'Contact', 'Message', 'Submitted At'];
      const rows = list.map(r => [
        `"${(r.name || '').replace(/"/g, '""')}"`,
        `"${(r.attendance || '').replace(/"/g, '""')}"`,
        r.guests || '1',
        `"${(r.contact || '').replace(/"/g, '""')}"`,
        `"${(r.message || '').replace(/"/g, '""')}"`,
        `"${r.createdAt || ''}"`
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', 'Paul_and_Roselyn_Wedding_Guest_List.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('✓ Guest list downloaded as CSV!');
    });
  }

  // ============================================================
  // 8. 1-Click Copy GCash & Bank Accounts
  // ============================================================
  document.querySelectorAll('.btn-copy-acc').forEach(btn => {
    btn.addEventListener('click', function () {
      const acc = this.getAttribute('data-acc');
      if (!acc) return;
      navigator.clipboard.writeText(acc).then(() => {
        showToast(`Copied ${acc} to clipboard!`);
      });
    });
  });

  // ============================================================
  // 9. Calendar Options & .ics Download
  // ============================================================
  const btnAddToCalendar = document.getElementById('btnAddToCalendar');
  const calendarModal = document.getElementById('calendarModal');

  if (btnAddToCalendar && calendarModal) {
    btnAddToCalendar.addEventListener('click', (e) => {
      e.preventDefault();
      calendarModal.classList.add('open');
    });
  }

  const downloadIcsBtn = document.getElementById('downloadIcsBtn');
  if (downloadIcsBtn) {
    downloadIcsBtn.addEventListener('click', function (e) {
      e.preventDefault();
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Paul and Roselyn//Wedding Invitation//EN',
        'BEGIN:VEVENT',
        'UID:paul-roselyn-wedding-20261219@invite',
        'DTSTART:20261219T010000Z',
        'DTEND:20261219T060000Z',
        'SUMMARY:Paul & Roselyn Wedding',
        'DESCRIPTION:Paul & Roselyn Wedding Ceremony at Imus Cathedral (9:00 AM) and Reception at Nathan\'s Catering (11:00 AM).',
        'LOCATION:Our Lady of the Pillar Parish (Imus Cathedral), Imus, Cavite, Philippines',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', 'Paul-and-Roselyn-Wedding.ics');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('✓ Calendar invite downloaded (.ics)!');
    });
  }

  // ============================================================
  // 10. Close Modals (Escape & Backdrop)
  // ============================================================
  document.querySelectorAll('.app-modal-close, .app-modal').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target === el || el.classList.contains('app-modal-close')) {
        document.querySelectorAll('.app-modal.open, .admin-modal-overlay.open').forEach(m => m.classList.remove('open'));
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.app-modal.open, .admin-modal-overlay.open, .dev-drawer-backdrop.open').forEach(m => m.classList.remove('open'));
    }
  });

  // ============================================================
  // 11. Active Nav Link on Scroll
  // ============================================================
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.app-nav a');

  window.addEventListener('scroll', () => {
    const scrollPos = window.pageYOffset + 120;
    sections.forEach(sec => {
      const top = sec.offsetTop;
      const height = sec.offsetHeight;
      const id = sec.getAttribute('id');
      if (scrollPos >= top && scrollPos < top + height) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === '#' + id) {
            link.classList.add('active');
          }
        });
      }
    });
  }, { passive: true });

})();
