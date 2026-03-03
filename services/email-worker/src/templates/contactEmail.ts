import mjml2html from 'mjml';

type ContactEmailTemplateData = {
  subject: string;
  name: string;
  email: string;
  message: string;
  ip?: string;
  userAgent?: string;
  createdAtIso: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function formatHumanDate(isoValue: string) {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return isoValue;

  const day = pad2(date.getDate());
  const month = pad2(date.getMonth() + 1);
  const year = date.getFullYear();
  const hour = pad2(date.getHours());
  const minute = pad2(date.getMinutes());
  const second = pad2(date.getSeconds());

  // Requested format: dd.mm.yyyy hh:mm:ss
  return `${day}.${month}.${year} ${hour}:${minute}:${second}`;
}

function renderPrimaryRows(data: ContactEmailTemplateData, formattedAt: string) {
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Name', value: data.name },
    { label: 'Email', value: data.email },
    { label: 'At', value: formattedAt },
  ];

  return rows
    .map(
      ({ label, value }) =>
        `<tr>
          <td style="padding: 4px 0; color: #9a9a9a; -webkit-text-fill-color: #9a9a9a; font-size: 13px; font-weight: 600; width: 64px; vertical-align: top;">${escapeHtml(
            label
          )}</td>
          <td style="padding: 4px 0 4px 8px; color: #c7c7c7; -webkit-text-fill-color: #c7c7c7; font-size: 16px; line-height: 22px;">${escapeHtml(
            value
          )}</td>
        </tr>`
    )
    .join('');
}

function renderTechnicalRows(data: ContactEmailTemplateData) {
  const rows: Array<{ label: string; value: string }> = [];
  if (data.ip) rows.push({ label: 'IP', value: data.ip });
  if (data.userAgent) rows.push({ label: 'User-Agent', value: data.userAgent });

  if (!rows.length) return '';

  return rows
    .map(
      ({ label, value }) =>
        `<tr>
          <td style="padding: 2px 0; color: #9a9a9a; -webkit-text-fill-color: #9a9a9a; font-size: 11px; font-weight: 600; width: 64px; vertical-align: top;">${escapeHtml(
            label
          )}</td>
          <td style="padding: 2px 0 2px 8px; color: #9a9a9a; -webkit-text-fill-color: #9a9a9a; font-size: 11px; line-height: 16px;">${escapeHtml(
            value
          )}</td>
        </tr>`
    )
    .join('');
}

export function renderContactEmailHtml(data: ContactEmailTemplateData) {
  const safeSubject = data.subject.trim();
  const subjectText = safeSubject || 'No subject';
  const preview = escapeHtml(subjectText);
  const formattedAt = formatHumanDate(data.createdAtIso);
  const primaryRowsHtml = renderPrimaryRows(data, formattedAt);
  const technicalRowsHtml = renderTechnicalRows(data);
  const messageHtml = escapeHtml(data.message).replace(/\r\n|\r|\n/g, '<br/>');
  const messageCardHtml = `
      <mj-table>
        <tr>
          <td style="background-color: #050505; background-image: linear-gradient(#050505, #050505); border: 1px solid #242424; border-radius: 10px; padding: 12px; color: #c7c7c7; -webkit-text-fill-color: #c7c7c7; font-size: 15px; line-height: 24px;">
            ${messageHtml}
          </td>
        </tr>
      </mj-table>
    `;
  const technicalBlockHtml = technicalRowsHtml
    ? `
      <mj-divider border-color="#242424" padding="16px 0 8px 0" />
      <mj-text font-size="11px" font-weight="600" color="#757575" padding="0 0 6px 0">TECHNICAL DETAILS</mj-text>
      <mj-table>${technicalRowsHtml}</mj-table>
    `
    : '';

  const mjml = `
<mjml>
  <mj-head>
    <mj-raw>
      <meta name="color-scheme" content="dark">
      <meta name="supported-color-schemes" content="dark">
    </mj-raw>
    <mj-style inline="inline">
      .force-dark-bg {
        background-color: #050505 !important;
        background-image: linear-gradient(#050505, #050505) !important;
      }
      .force-dark-panel {
        background-color: #0d0d0d !important;
        background-image: linear-gradient(#0d0d0d, #0d0d0d) !important;
        border-color: #242424 !important;
      }
      .force-text-primary,
      .force-text-primary * {
        color: #f7f7f7 !important;
        -webkit-text-fill-color: #f7f7f7 !important;
      }
      .force-text-body,
      .force-text-body * {
        color: #c7c7c7 !important;
        -webkit-text-fill-color: #c7c7c7 !important;
      }
      .force-text-muted,
      .force-text-muted * {
        color: #9a9a9a !important;
        -webkit-text-fill-color: #9a9a9a !important;
      }
      .force-text-faded,
      .force-text-faded * {
        color: #757575 !important;
        -webkit-text-fill-color: #757575 !important;
      }
    </mj-style>
    <mj-preview>${preview}</mj-preview>
  </mj-head>
  <mj-body background-color="#050505">
    <mj-section css-class="force-dark-bg" padding="18px">
      <mj-column
        css-class="force-dark-panel"
        background-color="#0d0d0d"
        border="1px solid #242424"
        border-radius="14px"
        padding="18px 16px 16px 16px"
      >
        <mj-text
          css-class="force-text-primary"
          font-size="36px"
          font-weight="700"
          color="#f7f7f7"
          line-height="42px"
          padding="0"
        >
          New contact message
        </mj-text>

        <mj-divider border-color="#242424" padding="10px 0 10px 0" />

        <mj-text css-class="force-text-muted" font-size="12px" color="#9a9a9a" font-weight="600" padding="0 0 2px 0">Subject</mj-text>
        <mj-text css-class="force-text-primary" font-size="24px" color="#f7f7f7" line-height="30px" font-weight="700" padding="0 0 10px 0">
          ${preview}
        </mj-text>

        <mj-table>${primaryRowsHtml}</mj-table>

        <mj-divider border-color="#242424" padding="10px 0 10px 0" />

        <mj-text css-class="force-text-primary" font-size="16px" font-weight="700" color="#f7f7f7" padding="0 0 8px 0">Message</mj-text>
        ${messageCardHtml}
        ${technicalBlockHtml}
      </mj-column>
    </mj-section>

    <mj-section padding="0 18px 16px 18px">
      <mj-column>
        <mj-text css-class="force-text-faded" font-size="12px" color="#757575">Sent from your website contact form.</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;

  const { html, errors } = mjml2html(mjml, { validationLevel: 'soft' });

  if (errors.length) {
    console.warn('MJML validation warnings:', errors);
  }

  return html;
}
