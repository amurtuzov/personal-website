<script setup lang="ts">
const { contactEndpoint } = useRuntimeConfig().public

const form = reactive({
  name: '',
  email: '',
  subject: '',
  message: '',
  website: '',
})
const formStartedAt = ref(new Date().toISOString())

const isSubmitting = ref(false)
const status = ref<'idle' | 'success' | 'error'>('idle')
const errorText = ref('')

async function submit() {
  status.value = 'idle'
  errorText.value = ''

  if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
    status.value = 'error'
    errorText.value = 'Please complete name, email, and message.'
    return
  }

  isSubmitting.value = true

  try {
    await $fetch(contactEndpoint, {
      method: 'POST',
      body: {
        name: form.name,
        email: form.email,
        subject: form.subject,
        message: form.message,
        website: form.website,
        formStartedAt: formStartedAt.value,
      },
    })

    status.value = 'success'
    form.name = ''
    form.email = ''
    form.subject = ''
    form.message = ''
    form.website = ''
    formStartedAt.value = new Date().toISOString()
  }
  catch (error) {
    status.value = 'error'
    const err = error as {
      status?: number
      statusCode?: number
      response?: { status?: number }
    }
    const httpStatus = Number(err.status || err.statusCode || err.response?.status || 0)
    if (httpStatus === 429) {
      errorText.value = 'Too many attempts. Please wait a minute and try again.'
    }
    else if (httpStatus === 403 || httpStatus === 415) {
      errorText.value = 'Submission failed security checks. Please refresh and try again.'
    }
    else {
      errorText.value = 'Unable to send message right now. Please try again.'
    }
    console.error('Contact form submission failed:', error)
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section id="contact" class="section-anchor contact">
    <h2>Contact</h2>
    <p class="contact__intro">Open to freelance work, product roles, and collaboration. Share a few details and I will reply soon.</p>
    <p class="contact__email">
      Prefer email? <a href="mailto:an.murtuzov@gmail.com">an.murtuzov@gmail.com</a>
    </p>

    <form class="contact__form" @submit.prevent="submit">
      <div class="contact__row">
        <label>
          <span>Name</span>
          <input v-model="form.name" type="text" name="name" autocomplete="name" placeholder="Your name">
        </label>

        <label>
          <span>Email</span>
          <input v-model="form.email" type="email" name="email" autocomplete="email" placeholder="you@example.com">
        </label>
      </div>

      <label>
        <span>Subject</span>
        <input v-model="form.subject" type="text" name="subject" placeholder="Project inquiry">
      </label>

      <label>
        <span>Message</span>
        <textarea v-model="form.message" name="message" rows="6" placeholder="Tell me about your project" />
      </label>

      <label class="honeypot" aria-hidden="true">
        <span>Website</span>
        <input v-model="form.website" type="text" name="website" autocomplete="off" tabindex="-1">
      </label>

      <button :disabled="isSubmitting" type="submit">
        {{ isSubmitting ? 'Sending...' : 'Send Message' }}
      </button>

      <p v-if="status === 'success'" class="state state--success">Message accepted. I will get back to you soon.</p>
      <p v-if="status === 'error'" class="state state--error">{{ errorText }}</p>
    </form>
  </section>
</template>

<style lang="scss" scoped>
.contact {
  margin-top: 52px;

  h2 {
    margin: 0;
    color: $textBody;
    font-size: 13px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    @include heading(700);
  }

  &__intro {
    margin: 14px 0 0;
    color: $textBody;
    font-size: 15px;
    line-height: 1.78;
  }

  &__email {
    margin: 8px 0 0;
    color: $textMuted;
    font-size: 13px;
    line-height: 1.5;

    a {
      color: $textPrimary;
      text-decoration: underline;
      text-underline-offset: 3px;

      &:hover {
        color: $textBody;
      }
    }
  }

  &__form {
    margin-top: 14px;
    display: grid;
    gap: 12px;
    width: min(640px, 100%);
  }

  &__row {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(2, minmax(0, 1fr));

    @include mobileOnly {
      grid-template-columns: 1fr;
    }
  }

  label {
    display: grid;
    gap: 7px;

    span {
      color: $textMuted;
      font-size: 12px;
      @include overline;
      letter-spacing: 0.08em;
    }
  }

  input,
  textarea {
    @include field;
    width: 100%;
    padding: 11px 12px;
    @include body(400);
    font-size: 14px;
    line-height: 1.4;
  }

  textarea {
    min-height: 145px;
    resize: vertical;
  }

  button {
    margin-top: 2px;
    @include pillButton;
    width: fit-content;
    padding: 10px 17px;
    cursor: pointer;

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .honeypot {
    position: absolute;
    left: -9999px;
    opacity: 0;
    pointer-events: none;
  }

  .state {
    margin: 6px 0 0;
    font-size: 13px;

    &--success {
      color: #a7caa3;
    }

    &--error {
      color: #e6a9a9;
    }
  }
}
</style>
