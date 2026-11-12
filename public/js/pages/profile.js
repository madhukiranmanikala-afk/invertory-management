import { getProfile, updateProfile } from '../api.js';
import { ROLES } from '../config/roles.js';
import { icon } from '../components/icons.js';
import { showToast } from '../components/toast.js';
import { confirmDialog } from '../components/modal.js';
import { avatarContent, escapeHtml, isIndianPhone, PHONE_ERROR } from '../utils.js';

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
const PHOTO_SIZE = 256;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('IMAGE_LOAD_FAILED'));
    };
    image.src = url;
  });
}

/** Centre-crop to a 256x256 square and return a small JPEG data URL. */
async function toSquareJpeg(file) {
  const image = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = PHOTO_SIZE;
  canvas.height = PHOTO_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('CANVAS_UNAVAILABLE');
  const scale = Math.max(PHOTO_SIZE / image.naturalWidth, PHOTO_SIZE / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.drawImage(image, (PHOTO_SIZE - width) / 2, (PHOTO_SIZE - height) / 2, width, height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export function mount(container, ctx) {
  let cancelled = false;
  // undefined = keep the saved photo, '' = remove it, string = new preview.
  let pendingPhoto;

  container.innerHTML = `
    <div class="stack-md" style="gap:24px;">
      <div class="page-head">
        <div>
          <h1>My Profile</h1>
          <p>Your account details. Email and role are managed by the Owner.</p>
        </div>
      </div>
      <div class="split-grid">
        <div class="card" id="profile-card">
          <div class="skeleton" style="height:120px;"></div>
        </div>
        <div class="card">
          <div class="card-head"><div><h3>Account snapshot</h3><p>Read-only fields set by the Owner.</p></div></div>
          <div class="stack-sm" id="profile-meta"></div>
        </div>
      </div>
    </div>
  `;

  async function load() {
    try {
      const user = await getProfile();
      if (cancelled) return;
      render(user);
    } catch (error) {
      if (cancelled) return;
      container.querySelector('#profile-card').innerHTML = `
        <div class="state-box error">
          <div class="state-icon">${icon('alertCircle', 22)}</div>
          <h3>Unable to load profile</h3>
          <p>${escapeHtml(error.message || 'Please try again.')}</p>
          <button type="button" class="btn btn-secondary" id="profile-retry">${icon('refresh', 15)} Retry</button>
        </div>`;
      container.querySelector('#profile-retry')?.addEventListener('click', load);
    }
  }

  function render(user) {
    pendingPhoto = undefined;
    const roleLabel = ROLES[user.role]?.label || user.role;
    const canEdit = ctx.hasPermission('profile.update');
    const avatarInner = avatarContent(user);

    container.querySelector('#profile-meta').innerHTML = `
      <div class="setting-row"><div><h3 style="margin:0;">Email</h3><p style="margin:0;">${escapeHtml(user.email)}</p></div><span class="badge">${icon('mail', 12)}</span></div>
      <div class="setting-row"><div><h3 style="margin:0;">Role</h3><p style="margin:0;">${escapeHtml(roleLabel)}</p></div><span class="badge badge-accent">${icon('shield', 12)}</span></div>
    `;

    container.querySelector('#profile-card').innerHTML = `
      <div class="profile-card">
        ${canEdit ? `
          <div class="profile-avatar-wrap">
            <button type="button" class="avatar avatar-lg profile-avatar" id="profile-avatar" aria-label="Change profile photo">
              ${avatarInner}
            </button>
            <span class="profile-avatar-badge" aria-hidden="true">${icon('camera', 12)}</span>
          </div>` : `
          <div class="avatar avatar-lg" id="profile-avatar">${avatarInner}</div>`}
        <div class="profile-ident">
          <h2>${escapeHtml(user.name)}</h2>
          <p>${escapeHtml(roleLabel)}</p>
          <div class="profile-meta">
            <span class="badge">${icon('mail', 11)} ${escapeHtml(user.email)}</span>
            ${user.phone ? `<span class="badge">${icon('phone', 11)} ${escapeHtml(user.phone)}</span>` : ''}
          </div>
        </div>
      </div>
      ${canEdit ? `
        <div class="profile-photo">
          <div class="profile-photo-actions">
            <button type="button" class="btn btn-secondary btn-sm" id="pf-photo-upload">${icon('camera', 15)} Upload photo</button>
            <button type="button" class="btn btn-secondary btn-sm" id="pf-photo-remove" ${user.photo ? '' : 'hidden'}>${icon('trash', 15)} Remove photo</button>
            <input type="file" id="pf-photo-input" accept="image/png,image/jpeg,image/webp" class="sr-only" tabindex="-1" aria-label="Choose a profile photo">
          </div>
          <p class="field-hint">JPG, PNG or WebP. Max 2 MB.</p>
          <p class="field-error" id="pf-photo-error" role="alert" aria-live="polite"></p>
        </div>
        <form id="profile-form" novalidate style="margin-top:24px;">
          <div class="form-grid">
            <div class="form-field">
              <label for="pf-name">Name <span class="req">*</span></label>
              <input type="text" id="pf-name" name="name" value="${escapeHtml(user.name)}" aria-invalid="false">
              <p class="field-error" id="pf-name-error" aria-live="polite"></p>
            </div>
            <div class="form-field">
              <label for="pf-phone">Phone</label>
              <input type="tel" id="pf-phone" name="phone" value="${escapeHtml(user.phone || '')}" placeholder="e.g. +91 98765 43210" inputmode="tel" aria-invalid="false">
              <p class="field-hint">Indian number with the +91 country code.</p>
              <p class="field-error" id="pf-phone-error" aria-live="polite"></p>
            </div>
            <div class="form-field span-2">
              <label for="pf-avatar">Avatar image URL</label>
              <input type="url" id="pf-avatar" name="avatar" value="${escapeHtml(user.avatar || '')}" placeholder="https://…" aria-invalid="false">
              <p class="field-hint">Paste an image URL (https). Leave empty to use your initials.</p>
              <p class="field-error" id="pf-avatar-error" aria-live="polite"></p>
            </div>
          </div>
          <div class="form-actions" style="margin-top:16px;">
            <button type="submit" class="btn btn-primary">${icon('check', 15)} Save profile</button>
          </div>
        </form>` : `
        <div class="callout" style="margin-top:24px;">${icon('lock', 15)}<span>You do not have permission to edit profile fields.</span></div>`}
    `;

    const nameInput = container.querySelector('#pf-name');
    const phoneInput = container.querySelector('#pf-phone');
    const avatarInput = container.querySelector('#pf-avatar');
    const fileInput = container.querySelector('#pf-photo-input');
    const uploadBtn = container.querySelector('#pf-photo-upload');
    const removeBtn = container.querySelector('#pf-photo-remove');
    const photoError = container.querySelector('#pf-photo-error');
    const avatarHost = container.querySelector('#profile-avatar');

    const currentPhoto = () => (pendingPhoto === undefined ? user.photo || '' : pendingPhoto);

    function clearPhotoError() {
      if (photoError) photoError.textContent = '';
    }

    function showPhotoError(message) {
      if (photoError) photoError.textContent = message;
    }

    /** Rebuild the avatar preview: uploaded photo wins over the URL field. */
    function updatePreview() {
      if (!avatarHost) return;
      const photo = currentPhoto();
      const url = avatarInput?.value.trim() || '';
      const name = nameInput?.value || user.name;
      avatarHost.innerHTML = avatarContent({ photo, avatar: photo ? '' : url }, name);
    }

    function updateRemoveButton() {
      if (removeBtn) removeBtn.hidden = !currentPhoto();
    }

    avatarHost?.addEventListener('click', () => fileInput?.click());
    uploadBtn?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      clearPhotoError();
      if (!PHOTO_TYPES.includes(file.type)) {
        showPhotoError('Choose a JPG, PNG or WebP image.');
        fileInput.value = '';
        return;
      }
      if (file.size > PHOTO_MAX_BYTES) {
        showPhotoError('That image is larger than 2 MB. Choose a smaller file.');
        fileInput.value = '';
        return;
      }
      try {
        pendingPhoto = await toSquareJpeg(file);
        if (cancelled) return;
        updatePreview();
        updateRemoveButton();
      } catch {
        showPhotoError('That image could not be loaded. Choose a different file.');
      } finally {
        fileInput.value = '';
      }
    });

    removeBtn?.addEventListener('click', async () => {
      const confirmed = await confirmDialog({
        title: 'Remove profile photo?',
        message: 'Your initials will be shown instead. Save profile to apply the change.',
        confirmLabel: 'Remove photo',
        danger: true,
      });
      if (!confirmed || cancelled) return;
      pendingPhoto = '';
      clearPhotoError();
      updatePreview();
      updateRemoveButton();
    });

    avatarInput?.addEventListener('input', updatePreview);
    nameInput?.addEventListener('input', updatePreview);

    container.querySelector('#profile-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const errors = {};
      if (!nameInput.value.trim()) {
        nameInput.setAttribute('aria-invalid', 'true');
        container.querySelector('#pf-name-error').textContent = 'Name is required.';
        errors.name = true;
      } else {
        nameInput.setAttribute('aria-invalid', 'false');
        container.querySelector('#pf-name-error').textContent = '';
      }
      if (!isIndianPhone(phoneInput.value.trim())) {
        phoneInput.setAttribute('aria-invalid', 'true');
        container.querySelector('#pf-phone-error').textContent = PHONE_ERROR;
        errors.phone = true;
      } else {
        phoneInput.setAttribute('aria-invalid', 'false');
        container.querySelector('#pf-phone-error').textContent = '';
      }
      if (Object.keys(errors).length) return;

      try {
        const updated = await updateProfile({
          name: nameInput.value.trim(),
          phone: phoneInput.value.trim(),
          avatar: avatarInput?.value.trim() || '',
          photo: currentPhoto(),
        });
        showToast('Profile updated successfully.', 'success');
        ctx.onUserUpdated?.(updated);
        if (cancelled) return;
        render(updated);
      } catch (error) {
        showToast(error.message || 'Failed to save profile.', 'error');
      }
    });
  }

  load();
  return () => { cancelled = true; };
}
