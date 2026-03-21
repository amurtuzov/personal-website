<script setup lang="ts">
const { siteName, baseURL, apiURL } = useRuntimeConfig().public
const canonicalUrl = `${baseURL.replace(/\/$/, '')}/contact`
const contactEndpoint = `${apiURL.replace(/\/$/, '')}/api/contact`

useSeoMeta({
  title: 'Contact',
  description: 'Get in touch with Anar Murtuzov about photography, collaborations, or project inquiries.',
  ogTitle: `${siteName} | Contact`,
  ogDescription: 'Get in touch about photography, collaboration, or project inquiries.',
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: `${siteName} | Contact`,
  twitterDescription: 'Get in touch about photography, collaboration, or project inquiries.',
  robots: 'index, follow',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
}))

type ContactStatus = 'idle' | 'success' | 'error'

const form = reactive({
  name: '',
  email: '',
  subject: '',
  message: '',
  website: '',
})

const formStartedAt = ref(new Date().toISOString())
const isSubmitting = ref(false)
const status = ref<ContactStatus>('idle')
const errorText = ref('')

const MAX_NAME = 120
const MAX_SUBJECT = 200
const MAX_MESSAGE = 5000

const emailLooksValid = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

const validateForm = () => {
  const name = form.name.trim()
  const email = form.email.trim()
  const subject = form.subject.trim()
  const message = form.message.trim()

  if (!name || !email || !message) {
    return 'Please complete name, email, and message.'
  }

  if (!emailLooksValid(email)) {
    return 'Please provide a valid email address.'
  }

  if (name.length > MAX_NAME) {
    return `Name must be ${MAX_NAME} characters or less.`
  }

  if (subject.length > MAX_SUBJECT) {
    return `Subject must be ${MAX_SUBJECT} characters or less.`
  }

  if (message.length > MAX_MESSAGE) {
    return `Message must be ${MAX_MESSAGE} characters or less.`
  }

  return ''
}

const resetForm = () => {
  form.name = ''
  form.email = ''
  form.subject = ''
  form.message = ''
  form.website = ''
  formStartedAt.value = new Date().toISOString()
}

const submit = async () => {
  status.value = 'idle'
  errorText.value = ''

  const validationMessage = validateForm()
  if (validationMessage) {
    status.value = 'error'
    errorText.value = validationMessage
    return
  }

  isSubmitting.value = true

  try {
    await $fetch(contactEndpoint, {
      method: 'POST',
      body: {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        subject: form.subject.trim() || undefined,
        message: form.message.trim(),
        website: form.website,
        formStartedAt: formStartedAt.value,
      },
    })

    status.value = 'success'
    resetForm()
  } catch (error) {
    status.value = 'error'

    const err = error as {
      status?: number
      statusCode?: number
      response?: { status?: number }
    }
    const httpStatus = Number(err.status || err.statusCode || err.response?.status || 0)

    if (httpStatus === 429) {
      errorText.value = 'Too many attempts. Please wait a minute and try again.'
    } else if (httpStatus === 403 || httpStatus === 415) {
      errorText.value = 'Submission failed security checks. Please refresh and try again.'
    } else {
      errorText.value = 'Unable to send message right now. Please try again.'
    }

    console.error('Contact form submission failed:', error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="contact-page">
    <div class="contact-wrap">
      <section class="contact-head">
        <h1>Get in touch</h1>
      </section>

      <div class="contact-grid">
        <article class="about-card">
          <div class="about-photo" aria-hidden="true">
            <NuxtImg
              class="about-photo__image"
              src="/contact.jpeg"
              alt="Portrait of Anar Murtuzov"
              width="2000"
              height="3000"
              loading="lazy"
              decoding="async"
              sizes="(max-width: 1024px) 100vw, 360px"
              densities="x1 x2"
            />
          </div>

          <div class="about-info">
            <p class="about-copy">
              I take most of my photos during surf trips and travels. This project is my personal visual journal, a way to capture the places, waves, and moments that stay with me along the journey.
            </p>
            <p class="about-copy">If you’d like to collaborate or work together on a photography project, feel free to reach out.</p>
          </div>
        </article>

        <form class="contact-form" @submit.prevent="submit">
          <div class="field">
            <label for="name">Name</label>
            <input
              id="name"
              v-model="form.name"
              type="text"
              name="name"
              autocomplete="name"
              :maxlength="MAX_NAME"
              required
            >
          </div>

          <div class="field">
            <label for="email">Email</label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              name="email"
              autocomplete="email"
              required
            >
          </div>

          <div class="field field-full">
            <label for="subject">Subject</label>
            <input
              id="subject"
              v-model="form.subject"
              type="text"
              name="subject"
              :maxlength="MAX_SUBJECT"
            >
          </div>

          <div class="field field-full">
            <label for="message">Message</label>
            <textarea
              id="message"
              v-model="form.message"
              name="message"
              :maxlength="MAX_MESSAGE"
              required
            />
          </div>

          <label class="honeypot" aria-hidden="true">
            <span>Website</span>
            <input v-model="form.website" type="text" name="website" autocomplete="off" tabindex="-1">
          </label>

          <div class="submit-row">
            <button :disabled="isSubmitting" type="submit">
              {{ isSubmitting ? 'Sending…' : 'Send message' }}
            </button>
          </div>

          <p v-if="status === 'success'" class="state-line state-line--success" aria-live="polite">
            Message accepted. I will get back to you soon.
          </p>
          <p v-if="status === 'error'" class="state-line state-line--error" aria-live="polite">
            {{ errorText }}
          </p>
        </form>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.contact-page {
  padding: 30px 44px 56px;
  @include page-fade-in;
}

.contact-wrap {
  max-width: 1200px;
  margin: 0 auto;
}

.contact-head {
  margin-bottom: 20px;

  h1 {
    margin: 0;
    font-family: 'Lora', serif;
    font-size: 42px;
    font-weight: 400;
    color: #161b21;
  }
}

.contact-grid {
  display: grid;
  gap: 20px;
}

.about-card {
  display: grid;
  grid-template-columns: minmax(260px, 360px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
  border: 1px solid #dde3e8;
  background: #fff;
  padding: 14px;
}

.about-photo {
  width: 100%;
  max-width: 360px;
  aspect-ratio: 5 / 6;
  border: 1px solid #dde3e8;
  overflow: hidden;

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

.about-info {
  display: grid;
  gap: 12px;
}

.about-copy {
  margin: 0;
  color: #67727d;
  line-height: 1.55;
  font-size: 15px;
}

.contact-form {
  border: 1px solid #dde3e8;
  background: #fff;
  padding: 24px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.field {
  display: grid;
  gap: 8px;
}

.field-full {
  grid-column: 1 / -1;
}

label {
  font-size: 12px;
  color: #67727d;
}

input,
textarea {
  width: 100%;
  border: 1px solid #dde3e8;
  background: #fff;
  padding: 11px 12px;
  font: inherit;
  color: #161b21;
}

input:focus,
textarea:focus {
  outline: none;
  border-color: #151a1f;
}

textarea {
  min-height: 140px;
  resize: vertical;
}

.submit-row {
  grid-column: 1 / -1;
}

button {
  border: 1px solid #161b21;
  background: transparent;
  color: #161b21;
  font: inherit;
  padding: 9px 18px;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

button:hover:not(:disabled) {
  background: #161b21;
  color: #fff;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.honeypot {
  position: absolute;
  left: -9999px;
  opacity: 0;
  pointer-events: none;
}

.state-line {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 13px;
  line-height: 1.5;

  &--success {
    color: #2f6b41;
  }

  &--error {
    color: #8f2f2f;
  }
}

@media (max-width: 1024px) {
  .contact-page {
    padding: 16px 12px 24px;
  }

  .contact-head {
    h1 {
      font-size: 34px;
    }
  }

  .about-card {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .about-photo {
    max-width: none;
    aspect-ratio: 4 / 5;
  }

  .contact-form {
    grid-template-columns: 1fr;
  }

  .field-full {
    grid-column: auto;
  }
}
</style>
