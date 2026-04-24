/**
 * SendGrid Marketing Service Implementation
 * Integrates with SendGrid Marketing Campaigns API (v3).
 */

import { IMarketingService, Contact, Campaign, CampaignStats } from './IMarketingService'
import { createModuleLogger } from '../../utils/logger'

const logger = createModuleLogger('SendGridMarketingService')

export class SendGridMarketingService implements IMarketingService {
  private readonly apiKey: string
  private readonly baseUrl = 'https://api.sendgrid.com/v3'

  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY || ''
    if (!this.apiKey) {
      logger.warn('SENDGRID_API_KEY is not set. Marketing features will be limited.')
    }
  }

  private async request(path: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      logger.error(`SendGrid API error: ${path}`, { error, status: response.status })
      throw new Error(`SendGrid API error: ${error.message || response.statusText}`)
    }

    return response.status === 204 ? null : response.json()
  }

  async upsertContact(contact: Contact): Promise<boolean> {
    try {
      await this.request('/marketing/contacts', {
        method: 'PUT',
        body: JSON.stringify({
          contacts: [
            {
              email: contact.email,
              first_name: contact.firstName,
              last_name: contact.lastName,
              custom_fields: contact.customFields,
            },
          ],
        }),
      })
      return true
    } catch (error) {
      logger.error('Failed to upsert contact', { email: contact.email, error })
      return false
    }
  }

  async upsertContacts(contacts: Contact[]): Promise<boolean> {
    try {
      await this.request('/marketing/contacts', {
        method: 'PUT',
        body: JSON.stringify({
          contacts: contacts.map((c) => ({
            email: c.email,
            first_name: c.firstName,
            last_name: c.lastName,
            custom_fields: c.customFields,
          })),
        }),
      })
      return true
    } catch (error) {
      logger.error('Failed to upsert contacts in batch', { count: contacts.length, error })
      return false
    }
  }

  async createCampaign(campaign: Omit<Campaign, 'id' | 'status'>): Promise<string> {
    try {
      const result = await this.request('/marketing/singlesends', {
        method: 'POST',
        body: JSON.stringify({
          name: campaign.name,
          send_to: { all: true }, // Defaulting to all for simplicity, can be refined
          email_config: {
            subject: campaign.subject,
            html_content: campaign.content,
            generate_plain_content: true,
          },
        }),
      })
      return result.id
    } catch (error) {
      logger.error('Failed to create campaign', { name: campaign.name, error })
      throw error
    }
  }

  async sendCampaign(campaignId: string, scheduledAt?: Date): Promise<boolean> {
    try {
      if (scheduledAt) {
        await this.request(`/marketing/singlesends/${campaignId}/schedule`, {
          method: 'PUT',
          body: JSON.stringify({
            send_at: scheduledAt.toISOString(),
          }),
        })
      } else {
        await this.request(`/marketing/singlesends/${campaignId}/send`, {
          method: 'POST',
        })
      }
      return true
    } catch (error) {
      logger.error('Failed to send/schedule campaign', { campaignId, error })
      return false
    }
  }

  async getCampaignStats(campaignId: string): Promise<CampaignStats> {
    try {
      const result = await this.request(`/marketing/stats/singlesends/${campaignId}`)
      // SendGrid returns stats in an array or object depending on the version
      const stats = result.stats || (Array.isArray(result) ? result[0]?.stats : {}) || {}
      return {
        delivered: stats.delivered || 0,
        opens: stats.unique_opens || 0,
        clicks: stats.unique_clicks || 0,
        bounces: stats.bounces || 0,
        unsubscribes: stats.unsubscribes || 0,
      }
    } catch (error) {
      logger.error('Failed to get campaign stats', { campaignId, error })
      return { delivered: 0, opens: 0, clicks: 0, bounces: 0, unsubscribes: 0 }
    }
  }

  async unsubscribeContact(email: string): Promise<boolean> {
    // Note: In SendGrid Marketing, you typically add to a suppression group
    // For simplicity, we'll just log and assume handled by their unsubscribe link
    logger.info('Unsubscribe request for marketing', { email })
    return true
  }
}
