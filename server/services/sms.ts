// PhilSMS Service for sending SMS notifications
import axios from 'axios';

const PHILSMS_API_TOKEN = process.env.PHILSMS_API_TOKEN;
const PHILSMS_SENDER_ID = process.env.PHILSMS_SENDER_ID || 'PhilSMS';
const PHILSMS_API_URL = 'https://dashboard.philsms.com/api/v3/sms/send';

interface SendSMSOptions {
  recipients: string | string[];
  message: string;
  senderId?: string;
}

export class SMSService {
  private static formatPhoneNumber(phone: string): string {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If starts with 0, replace with 63 (Philippines country code)
    if (cleaned.startsWith('0')) {
      cleaned = '63' + cleaned.substring(1);
    }
    
    // Ensure it starts with 63
    if (!cleaned.startsWith('63')) {
      cleaned = '63' + cleaned;
    }
    
    return cleaned;
  }

  static async sendSMS(options: SendSMSOptions): Promise<any> {
    try {
      if (!PHILSMS_API_TOKEN) {
        console.warn('SMS not configured: PHILSMS_API_TOKEN missing');
        return { success: false, error: 'SMS token not configured' };
      }

      let recipient = Array.isArray(options.recipients) 
        ? options.recipients[0]
        : options.recipients;
      
      recipient = this.formatPhoneNumber(recipient);

      const payload = {
        recipient,
        message: options.message,
        sender_id: options.senderId || PHILSMS_SENDER_ID,
        type: 'plain',
      };

      console.log('Sending SMS to:', recipient, 'Message:', options.message);

      const response = await axios.post(PHILSMS_API_URL, payload, {
        headers: {
          'Authorization': `Bearer ${PHILSMS_API_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      console.log('SMS sent successfully:', response.data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('SMS send error:', error.response?.status, error.response?.data || error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async notifyPaymentSubmission(tenantPhone: string, tenantName: string, month: string, amount: string): Promise<any> {
    const message = `Hello! Your rent payment for ${month} (P${amount}) has been received. Thank you!`;
    return this.sendSMS({
      recipients: tenantPhone,
      message,
    });
  }

  static async notifyPaymentVerified(tenantPhone: string, tenantName: string, month: string): Promise<any> {
    const message = `Your rent payment for ${month} has been verified and approved. Thank you for your prompt payment!`;
    return this.sendSMS({
      recipients: tenantPhone,
      message,
    });
  }

  static async notifyMaintenanceSubmission(tenantPhone: string, tenantName: string): Promise<any> {
    const message = `Hello ${tenantName}! Your maintenance report has been received. We will address it shortly.`;
    return this.sendSMS({
      recipients: tenantPhone,
      message,
    });
  }

  static async notifyMaintenanceUpdate(tenantPhone: string, tenantName: string, status: string): Promise<any> {
    const message = `Hello ${tenantName}! Your maintenance report status has been updated to: ${status}.`;
    return this.sendSMS({
      recipients: tenantPhone,
      message,
    });
  }

  static async sendAdminNotification(adminPhone: string, message: string): Promise<any> {
    return this.sendSMS({
      recipients: adminPhone,
      message,
    });
  }

  static async notifyPaymentReminder(
    tenantPhone: string,
    tenantName: string,
    monthLabel: string,
    amount: string,
    daysOverdue: number,
  ): Promise<any> {
    const overduePart =
      daysOverdue > 0
        ? `ay may ${daysOverdue} araw na overdue`
        : `ay nakatakdang bayaran`;
    const message =
      `Magandang araw ${tenantName}! Paalala lang po na ang renta ` +
      `para sa ${monthLabel} (P${amount}) ${overduePart}. ` +
      `Salamat po sa inyong agarang pagbabayad!`;
    return this.sendSMS({
      recipients: tenantPhone,
      message,
    });
  }

  static async notifyPaymentDueSoon(
    tenantPhone: string,
    tenantName: string,
    monthLabel: string,
    amount: string,
    daysUntilDue: number,
  ): Promise<any> {
    const whenPart =
      daysUntilDue <= 0
        ? `ay due na ngayong araw`
        : daysUntilDue === 1
        ? `ay due na bukas`
        : `ay due na sa ${daysUntilDue} araw`;
    const message =
      `Magandang araw ${tenantName}! Paalala lang po na ang renta ` +
      `para sa ${monthLabel} (P${amount}) ${whenPart}. ` +
      `Salamat po sa inyong agarang pagbabayad!`;
    return this.sendSMS({
      recipients: tenantPhone,
      message,
    });
  }
}
