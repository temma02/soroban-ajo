/**
 * Marketing Service Interface
 * Defines core operations for interacting with an email marketing platform.
 */

export interface Contact {
  email: string
  firstName?: string
  lastName?: string
  customFields?: Record<string, any>
}

export interface Campaign {
  id: string
  name: string
  subject: string
  content: string
  status: string
  scheduledAt?: Date
}

export interface CampaignStats {
  delivered: number
  opens: number
  clicks: number
  bounces: number
  unsubscribes: number
}

export interface IMarketingService {
  /**
   * Add or update a contact in the marketing platform.
   */
  upsertContact(contact: Contact): Promise<boolean>

  /**
   * Add multiple contacts in batch.
   */
  upsertContacts(contacts: Contact[]): Promise<boolean>

  /**
   * Create a new campaign/single-send.
   */
  createCampaign(campaign: Omit<Campaign, 'id' | 'status'>): Promise<string>

  /**
   * Send a campaign immediately or at a scheduled time.
   */
  sendCampaign(campaignId: string, scheduledAt?: Date): Promise<boolean>

  /**
   * Get real-time stats for a campaign from the platform.
   */
  getCampaignStats(campaignId: string): Promise<CampaignStats>

  /**
   * Unsubscribe a contact from marketing emails.
   */
  unsubscribeContact(email: string): Promise<boolean>
}
