import { Injectable } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';

interface ResetPasswordMailInput {
  to: string;
  code: string;
}

interface FinanceApplicationNotificationInput {
  to: string;
  fullName: string;
  email: string;
}

@Injectable()
export class MailService {
  private transporter: Transporter | null = null;

  async sendResetPasswordCode(input: ResetPasswordMailInput): Promise<void> {
    const { to, code } = input;
    const from = process.env.SMTP_FROM;
    const appName = process.env.APP_NAME || 'Credsure Admin';

    if (!from) {
      throw new Error('SMTP_FROM is not configured.');
    }

    const transporter = this.getTransporter();
    await transporter.sendMail({
      from,
      to,
      subject: `${appName} password reset code`,
      text: `Your password reset code is ${code}. This code expires in 15 minutes.`,
      html: `<p>Your password reset code is <strong>${code}</strong>.</p><p>This code expires in 15 minutes.</p>`,
    });
  }

  async sendFinanceApplicationNotification(
    input: FinanceApplicationNotificationInput,
  ): Promise<void> {
    const { to, fullName, email } = input;
    const from = process.env.SMTP_FROM;
    const appName = process.env.APP_NAME || 'Credsure Admin';
    if (!from) {
      throw new Error('SMTP_FROM is not configured.');
    }

    const transporter = this.getTransporter();
    await transporter.sendMail({
      from,
      to,
      subject: `${appName} new finance application`,
      text: `New finance application from ${fullName} (${email}).`,
      html: `<p>New finance application from <strong>${fullName}</strong> (${email}).</p>`,
    });
  }

  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE === 'true';

    if (!host || !user || !pass) {
      throw new Error(
        'SMTP_HOST, SMTP_USER, and SMTP_PASS must be configured.',
      );
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    return this.transporter;
  }
}
