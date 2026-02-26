import { Injectable, Logger } from '@nestjs/common';

interface ResetPasswordMailInput {
  to: string;
  code: string;
}

interface FinanceApplicationNotificationInput {
  to: string;
  fullName: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private get apiKey() {
    return process.env.RESEND_API_KEY;
  }

  private get fromAddress() {
    return process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM;
  }

  isConfigured() {
    return Boolean(this.apiKey && this.fromAddress);
  }

  async sendResetPasswordCode(input: ResetPasswordMailInput): Promise<void> {
    const { to, code } = input;
    const appName = process.env.APP_NAME || 'Credsure Admin';
    const html = `<p>Your password reset code is <strong>${code}</strong>.</p><p>This code expires in 15 minutes.</p>`;
    await this.sendEmail({
      to,
      subject: `${appName} password reset code`,
      html,
    });
  }

  async sendFinanceApplicationNotification(
    input: FinanceApplicationNotificationInput,
  ): Promise<void> {
    const { to, fullName } = input;
    const appName = process.env.APP_NAME || 'Credsure Admin';
    await this.sendEmail({
      to,
      subject: `${appName} finance application received`,
      html: `<p>Hi <strong>${fullName}</strong>,</p><p>Your loan request is under review.</p><p>We'll get back to you shortly.</p><p>Regards,<br/>Credsure Team</p>`,
    });
  }

  private async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.warn('Resend API is not configured - skipping email send');
      throw new Error('Resend API is not configured');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.fromAddress!,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Resend API error (${response.status}): ${errorText}`);
      throw new Error(errorText || 'Unable to send email via Resend');
    }
  }
}
