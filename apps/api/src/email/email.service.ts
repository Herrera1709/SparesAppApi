import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as crypto from 'crypto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private fromEmail: string;
  private rpsLimit: number;
  private maxRetries: number;
  private idempotencyEnabled: boolean;
  private lastSendAt: number = 0;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    // Plan gratuito Resend: solo permite enviar desde onboarding@resend.dev (o dominio verificado)
    this.fromEmail = this.configService.get<string>('RESEND_FROM') || 'ImportaCR <onboarding@resend.dev>';
    this.rpsLimit = Math.max(1, parseInt(this.configService.get<string>('RESEND_RPS_LIMIT') || '2', 10));
    this.maxRetries = Math.max(1, parseInt(this.configService.get<string>('RESEND_MAX_RETRIES') || '5', 10));
    this.idempotencyEnabled = this.configService.get<string>('RESEND_DISABLE_IDEMPOTENCY') !== '1';
    
    if (!apiKey) {
      this.logger.error('RESEND_API_KEY no está configurado en .env. Los correos NO se enviarán. Añade RESEND_API_KEY desde https://resend.com');
      return;
    }

    try {
      this.resend = new Resend(apiKey);
      this.logger.log(`✅ Resend inicializado correctamente`);
      this.logger.log(`   API Key: ${apiKey.substring(0, 10)}...`);
      this.logger.log(`   From Email: ${this.fromEmail}`);
      this.logger.log(`   RPS Limit: ${this.rpsLimit}`);
      this.logger.log(`   Max Retries: ${this.maxRetries}`);
    } catch (error) {
      this.logger.error('❌ Error al inicializar Resend:', error);
    }
  }

  private async waitTurn(): Promise<void> {
    const spacingMs = Math.ceil(1000 / this.rpsLimit);
    const now = Date.now();
    const since = now - this.lastSendAt;
    const baseDelay = since >= spacingMs ? 0 : (spacingMs - since);
    const jitter = Math.floor(Math.random() * 120);
    const total = baseDelay + jitter;
    
    if (total > 0) {
      await new Promise(resolve => setTimeout(resolve, total));
    }
    
    this.lastSendAt = Date.now();
  }

  private computeIdempotencyKey(mailOpts: any): string {
    try {
      const h = crypto.createHash('sha256');
      h.update(String(mailOpts.from || this.fromEmail));
      h.update('|');
      h.update(Array.isArray(mailOpts.to) ? mailOpts.to.join(',') : String(mailOpts.to || ''));
      h.update('|');
      h.update(String(mailOpts.subject || ''));
      h.update('|');
      h.update(String(mailOpts.html || ''));
      return h.digest('hex');
    } catch {
      return crypto.randomUUID();
    }
  }

  async sendWithRetry(mailOpts: any): Promise<any> {
    if (!this.resend) {
      this.logger.warn('Resend no configurado. Email no enviado.');
      return null;
    }

    // Rate limiting
    await this.waitTurn();

    // Idempotency Key
    if (this.idempotencyEnabled && !mailOpts.headers?.['Idempotency-Key']) {
      mailOpts.headers = mailOpts.headers || {};
      mailOpts.headers['Idempotency-Key'] = this.computeIdempotencyKey(mailOpts);
    }

    let attempt = 0;
    let lastErr: any;

    while (attempt < this.maxRetries) {
      try {
        this.logger.log(`[Resend] Intentando enviar email → to=${mailOpts.to} from=${mailOpts.from} subject="${mailOpts.subject}"`);
        const response = await this.resend.emails.send(mailOpts);
        const emailTo = Array.isArray(mailOpts.to) ? mailOpts.to.join(',') : mailOpts.to;
        // Resend response structure: { data: { id: string } } or { error: ... }
        const emailId = (response as any)?.data?.id || (response as any)?.id || 'n/a';
        this.logger.log(`[Resend] ✅ Email enviado exitosamente → to=${emailTo} subject="${mailOpts.subject}" id=${emailId}`);
        return response;
      } catch (err: any) {
        lastErr = err;
        const status = err?.status || err?.code || err?.response?.status;
        const is429 = status === 429 || /rate/i.test(String(err?.message || ''));
        const is5xx = status >= 500 && status < 600;
        const isNet = !status;

        if (is429 || is5xx || isNet) {
          attempt++;
          const backoff = Math.min(30000, Math.pow(2, attempt) * 250);
          const jitter = Math.floor(Math.random() * 250);
          const waitMs = backoff + jitter;
          
          this.logger.warn(`[Resend] Reintento ${attempt}/${this.maxRetries} en ${waitMs}ms — status=${status || 'net'} msg=${err?.message || err}`);
          await new Promise(resolve => setTimeout(resolve, waitMs));
          continue;
        }

        // Error no transitorio
        this.logger.error(`[Resend] Error no recuperable — status=${status} msg=${err?.message || err}`, err?.stack || '');
        throw err;
      }
    }

    this.logger.error(`[Resend] Agotados reintentos — ${lastErr?.message || lastErr}`);
    throw lastErr || new Error('Fallo al enviar email (reintentos agotados)');
  }

  /**
   * Envía un correo de prueba. Útil para comprobar RESEND_API_KEY y RESEND_FROM.
   * Devuelve el resultado de Resend o el error para depuración.
   */
  async sendTestEmail(to: string): Promise<{ success: boolean; id?: string; error?: string }> {
    if (!this.resend) {
      return { success: false, error: 'Resend no configurado. Añade RESEND_API_KEY en .env' };
    }
    const mailOpts = {
      from: this.fromEmail,
      to,
      subject: 'Prueba ImportaCR',
      html: '<p>Si ves este correo, el envío con Resend está funcionando.</p>',
    };
    try {
      const response = await this.sendWithRetry(mailOpts) as any;
      if (response?.error) {
        const msg = response.error?.message || JSON.stringify(response.error);
        return { success: false, error: msg };
      }
      const id = response?.data?.id || response?.id;
      return { success: true, id: id || 'ok' };
    } catch (err: any) {
      const msg = err?.message || err?.response?.data?.message || String(err);
      this.logger.error(`[Resend] Test email failed: ${msg}`);
      return { success: false, error: msg };
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string, firstName?: string): Promise<void> {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200'}/reset-password?token=${resetToken}`;
    const name = firstName || 'Usuario';

    const mailOpts = {
      from: this.fromEmail,
      to: email,
      subject: 'Recuperación de Contraseña - ImportaCR',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 50%, #F97316 100%);
              border-radius: 12px;
              padding: 40px;
              color: white;
            }
            .content {
              background: white;
              border-radius: 8px;
              padding: 30px;
              margin-top: 20px;
              color: #333;
            }
            .button {
              display: inline-block;
              padding: 14px 28px;
              background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
              color: white;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              margin: 20px 0;
              box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 14px;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 style="margin: 0; font-size: 28px;">🌍 ImportaCR</h1>
          </div>
          <div class="content">
            <h2 style="color: #1f2937; margin-top: 0;">Hola ${name},</h2>
            <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en ImportaCR.</p>
            <p>Haz clic en el botón siguiente para crear una nueva contraseña:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
            </div>
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              O copia y pega este enlace en tu navegador:<br>
              <a href="${resetUrl}" style="color: #3B82F6; word-break: break-all;">${resetUrl}</a>
            </p>
            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
              <strong>Importante:</strong> Este enlace expirará en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo.
            </p>
          </div>
          <div class="footer">
            <p>Este es un correo automático, por favor no respondas.</p>
            <p>© ${new Date().getFullYear()} ImportaCR - Todos los derechos reservados</p>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.sendWithRetry(mailOpts);
    } catch (error) {
      this.logger.error(`Error enviando email de recuperación a ${email}:`, error);
      throw new Error('Error al enviar el correo de recuperación');
    }
  }

  async sendEmailVerificationEmail(
    email: string,
    verificationToken: string,
    firstName?: string,
    registrationData?: { ip?: string; userAgent?: string; timestamp?: Date }
  ): Promise<void> {
    const verificationUrl = `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200'}/verify-email?token=${verificationToken}`;
    const name = firstName || 'Usuario';
    const timestamp = registrationData?.timestamp || new Date();
    const formattedDate = timestamp.toLocaleString('es-CR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const mailOpts = {
      from: this.fromEmail,
      to: email,
      subject: 'Verifica tu correo electrónico - ImportaCR',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background: #f9fafb;
            }
            .container {
              background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 50%, #F97316 100%);
              border-radius: 16px;
              padding: 40px;
              color: white;
              text-align: center;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            }
            .content {
              background: white;
              border-radius: 12px;
              padding: 40px;
              margin-top: 20px;
              color: #333;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            .button {
              display: inline-block;
              padding: 14px 28px;
              background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
              color: white;
              text-decoration: none;
              border-radius: 10px;
              font-weight: 600;
              margin: 20px 0;
              box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
            }
            .info-box {
              background: #f0f9ff;
              border-left: 4px solid #3B82F6;
              padding: 16px;
              margin: 20px 0;
              border-radius: 8px;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 14px;
              color: #6b7280;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 style="margin: 0; font-size: 36px; font-weight: 800;">🌍 ImportaCR</h1>
            <p style="margin: 10px 0 0 0; font-size: 20px; opacity: 0.95;">¡Bienvenido a la familia!</p>
          </div>
          <div class="content">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 28px;">¡Hola ${name}! 👋</h2>
            <p style="font-size: 16px; color: #4b5563;">
              Gracias por registrarte en ImportaCR. Para completar tu registro y activar tu cuenta, 
              necesitamos verificar tu dirección de correo electrónico.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" class="button">Verificar mi correo electrónico</a>
            </div>

            <div class="info-box">
              <h3 style="margin-top: 0; color: #1f2937; font-size: 18px;">📋 Detalles de tu registro</h3>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="font-weight: 600; color: #6b7280;">Fecha y hora:</span>
                <span style="color: #1f2937;">${formattedDate}</span>
              </div>
              ${registrationData?.ip ? `
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="font-weight: 600; color: #6b7280;">Dirección IP:</span>
                <span style="color: #1f2937;">${registrationData.ip}</span>
              </div>
              ` : ''}
              ${registrationData?.userAgent ? `
              <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                <span style="font-weight: 600; color: #6b7280;">Dispositivo:</span>
                <span style="color: #1f2937;">${this.parseUserAgent(registrationData.userAgent)}</span>
              </div>
              ` : ''}
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              O copia y pega este enlace en tu navegador:<br>
              <a href="${verificationUrl}" style="color: #3B82F6; word-break: break-all;">${verificationUrl}</a>
            </p>

            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
              <strong>Importante:</strong> Este enlace expirará en 24 horas. Si no creaste esta cuenta, puedes ignorar este correo.
            </p>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              Si tienes alguna pregunta, no dudes en contactarnos. ¡Estamos aquí para ayudarte en cada paso del camino!
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ImportaCR - Todos los derechos reservados</p>
            <p>Este es un correo automático, por favor no respondas directamente.</p>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.sendWithRetry(mailOpts);
      this.logger.log(`Email de verificación enviado a ${email}`);
    } catch (error) {
      this.logger.error(`Error enviando email de verificación a ${email}:`, error);
      throw new Error('Error al enviar el correo de verificación');
    }
  }

  async sendWelcomeEmail(email: string, firstName?: string, registrationData?: { ip?: string; userAgent?: string; timestamp?: Date }): Promise<void> {
    const name = firstName || 'Usuario';
    const timestamp = registrationData?.timestamp || new Date();
    const formattedDate = timestamp.toLocaleString('es-CR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const mailOpts = {
      from: this.fromEmail,
      to: email,
      subject: '¡Bienvenido a ImportaCR! 🌍',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background: #f9fafb;
            }
            .container {
              background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 50%, #F97316 100%);
              border-radius: 16px;
              padding: 40px;
              color: white;
              text-align: center;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            }
            .content {
              background: white;
              border-radius: 12px;
              padding: 40px;
              margin-top: 20px;
              color: #333;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            .info-box {
              background: #f0f9ff;
              border-left: 4px solid #3B82F6;
              padding: 16px;
              margin: 20px 0;
              border-radius: 8px;
            }
            .info-item {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .info-item:last-child {
              border-bottom: none;
            }
            .info-label {
              font-weight: 600;
              color: #6b7280;
            }
            .info-value {
              color: #1f2937;
            }
            .button {
              display: inline-block;
              padding: 14px 28px;
              background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
              color: white;
              text-decoration: none;
              border-radius: 10px;
              font-weight: 600;
              margin: 20px 0;
              box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
            }
            .features {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
              margin: 24px 0;
            }
            .feature {
              text-align: center;
              padding: 16px;
              background: #f9fafb;
              border-radius: 8px;
            }
            .feature-icon {
              font-size: 2rem;
              margin-bottom: 8px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 style="margin: 0; font-size: 36px; font-weight: 800;">🌍 ImportaCR</h1>
            <p style="margin: 10px 0 0 0; font-size: 20px; opacity: 0.95;">¡Bienvenido a la familia!</p>
          </div>
          <div class="content">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 28px;">¡Hola ${name}! 👋</h2>
            <p style="font-size: 16px; color: #4b5563;">Estamos emocionados de tenerte con nosotros. Tu cuenta ha sido creada exitosamente y ya puedes comenzar a importar productos del mundo entero directamente a Costa Rica.</p>
            
            <div class="info-box">
              <h3 style="margin-top: 0; color: #1f2937; font-size: 18px;">📋 Detalles de tu registro</h3>
              <div class="info-item">
                <span class="info-label">Fecha y hora:</span>
                <span class="info-value">${formattedDate}</span>
              </div>
              ${registrationData?.ip ? `
              <div class="info-item">
                <span class="info-label">Dirección IP:</span>
                <span class="info-value">${registrationData.ip}</span>
              </div>
              ` : ''}
              ${registrationData?.userAgent ? `
              <div class="info-item">
                <span class="info-label">Dispositivo:</span>
                <span class="info-value">${this.parseUserAgent(registrationData.userAgent)}</span>
              </div>
              ` : ''}
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200'}" class="button">Comenzar a Importar</a>
            </div>

            <h3 style="color: #1f2937; margin-top: 30px;">✨ ¿Qué puedes hacer ahora?</h3>
            <div class="features">
              <div class="feature">
                <div class="feature-icon">🔍</div>
                <h4 style="margin: 8px 0; color: #1f2937;">Explorar Productos</h4>
                <p style="font-size: 14px; color: #6b7280; margin: 0;">Busca repuestos, herramientas y más</p>
              </div>
              <div class="feature">
                <div class="feature-icon">📦</div>
                <h4 style="margin: 8px 0; color: #1f2937;">Crear Pedidos</h4>
                <p style="font-size: 14px; color: #6b7280; margin: 0;">Pega links de Amazon, eBay y más</p>
              </div>
              <div class="feature">
                <div class="feature-icon">📊</div>
                <h4 style="margin: 8px 0; color: #1f2937;">Seguimiento</h4>
                <p style="font-size: 14px; color: #6b7280; margin: 0;">Monitorea tus importaciones</p>
              </div>
              <div class="feature">
                <div class="feature-icon">💬</div>
                <h4 style="margin: 8px 0; color: #1f2937;">Soporte</h4>
                <p style="font-size: 14px; color: #6b7280; margin: 0;">Estamos aquí para ayudarte</p>
              </div>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              Si tienes alguna pregunta, no dudes en contactarnos. ¡Estamos aquí para ayudarte en cada paso del camino!
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 20px; text-align: center;">
              © ${new Date().getFullYear()} ImportaCR - Todos los derechos reservados<br>
              Este es un correo automático, por favor no respondas directamente.
            </p>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.sendWithRetry(mailOpts);
      this.logger.log(`Email de bienvenida enviado a ${email}`);
    } catch (error) {
      this.logger.error(`Error enviando email de bienvenida a ${email}:`, error);
      // No lanzamos error para no bloquear el registro
    }
  }

  async sendLoginNotificationEmail(
    email: string, 
    firstName?: string, 
    loginData?: { ip?: string; userAgent?: string; timestamp?: Date; location?: string }
  ): Promise<void> {
    const name = firstName || 'Usuario';
    const timestamp = loginData?.timestamp || new Date();
    const formattedDate = timestamp.toLocaleString('es-CR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const isNewLocation = loginData?.location ? true : false;

    const mailOpts = {
      from: this.fromEmail,
      to: email,
      subject: isNewLocation ? '🔔 Nuevo inicio de sesión detectado' : '✅ Inicio de sesión exitoso',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background: #f9fafb;
            }
            .container {
              background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 50%, #F97316 100%);
              border-radius: 16px;
              padding: 40px;
              color: white;
              text-align: center;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            }
            .content {
              background: white;
              border-radius: 12px;
              padding: 40px;
              margin-top: 20px;
              color: #333;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            .info-box {
              background: ${isNewLocation ? '#fef3c7' : '#f0f9ff'};
              border-left: 4px solid ${isNewLocation ? '#F59E0B' : '#3B82F6'};
              padding: 20px;
              margin: 20px 0;
              border-radius: 8px;
            }
            .info-item {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .info-item:last-child {
              border-bottom: none;
            }
            .info-label {
              font-weight: 600;
              color: #6b7280;
              font-size: 14px;
            }
            .info-value {
              color: #1f2937;
              font-weight: 500;
              text-align: right;
            }
            .warning-box {
              background: #fef2f2;
              border-left: 4px solid #EF4444;
              padding: 16px;
              margin: 20px 0;
              border-radius: 8px;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
              color: white;
              text-decoration: none;
              border-radius: 10px;
              font-weight: 600;
              margin: 20px 0;
              box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 style="margin: 0; font-size: 36px; font-weight: 800;">🌍 ImportaCR</h1>
            <p style="margin: 10px 0 0 0; font-size: 20px; opacity: 0.95;">${isNewLocation ? '🔔 Nueva sesión detectada' : '✅ Sesión iniciada'}</p>
          </div>
          <div class="content">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 28px;">Hola ${name},</h2>
            <p style="font-size: 16px; color: #4b5563;">
              ${isNewLocation 
                ? 'Detectamos un nuevo inicio de sesión en tu cuenta. Si fuiste tú, puedes ignorar este mensaje. Si no reconoces esta actividad, te recomendamos cambiar tu contraseña inmediatamente.'
                : 'Se ha iniciado sesión exitosamente en tu cuenta de ImportaCR.'}
            </p>
            
            <div class="info-box">
              <h3 style="margin-top: 0; color: #1f2937; font-size: 18px;">📱 Detalles de la sesión</h3>
              <div class="info-item">
                <span class="info-label">Fecha y hora:</span>
                <span class="info-value">${formattedDate}</span>
              </div>
              ${loginData?.location ? `
              <div class="info-item">
                <span class="info-label">📍 Ubicación:</span>
                <span class="info-value">${loginData.location}</span>
              </div>
              ` : ''}
              ${loginData?.ip ? `
              <div class="info-item">
                <span class="info-label">🌐 Dirección IP:</span>
                <span class="info-value">${loginData.ip}</span>
              </div>
              ` : ''}
              ${loginData?.userAgent ? `
              <div class="info-item">
                <span class="info-label">💻 Dispositivo:</span>
                <span class="info-value">${this.parseUserAgent(loginData.userAgent)}</span>
              </div>
              ` : ''}
            </div>

            ${isNewLocation ? `
            <div class="warning-box">
              <h4 style="margin-top: 0; color: #DC2626;">⚠️ ¿No reconoces este inicio de sesión?</h4>
              <p style="margin-bottom: 0; color: #991B1B; font-size: 14px;">
                Si no fuiste tú quien inició sesión, cambia tu contraseña inmediatamente y contáctanos.
              </p>
            </div>
            ` : ''}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200'}/dashboard" class="button">Ir a mi Dashboard</a>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              Si tienes alguna pregunta o preocupación sobre la seguridad de tu cuenta, no dudes en contactarnos.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 20px; text-align: center;">
              © ${new Date().getFullYear()} ImportaCR - Todos los derechos reservados<br>
              Este es un correo automático de seguridad, por favor no respondas directamente.
            </p>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.sendWithRetry(mailOpts);
      this.logger.log(`Email de notificación de login enviado a ${email}`);
    } catch (error) {
      this.logger.error(`Error enviando email de notificación de login a ${email}:`, error);
      // No lanzamos error para no bloquear el login
    }
  }

  private parseUserAgent(userAgent: string): string {
    if (!userAgent) return 'Desconocido';

    // Detectar navegador
    let browser = 'Desconocido';
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
    else if (userAgent.includes('Edg')) browser = 'Edge';
    else if (userAgent.includes('Opera')) browser = 'Opera';

    // Detectar sistema operativo
    let os = 'Desconocido';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

    // Detectar dispositivo móvil
    const isMobile = userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone') || userAgent.includes('iPad');
    const deviceType = isMobile ? 'Móvil' : 'Escritorio';

    return `${browser} en ${os} (${deviceType})`;
  }
}
