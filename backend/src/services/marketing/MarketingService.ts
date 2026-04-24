/**
 * Marketing Application Service
 * Coordinates between the database and the marketing platform.
 */

import { prisma } from '../../config/database'
import { createModuleLogger } from '../../utils/logger'
import { IMarketingService, Contact } from './IMarketingService'
import { SendGridMarketingService } from './SendGridMarketingService'

const logger = createModuleLogger('MarketingService')

export class MarketingService {
  private readonly platformService: IMarketingService

  constructor(platformService?: IMarketingService) {
    this.platformService = platformService || new SendGridMarketingService()
  }

  /**
   * Register a new contact for marketing.
   * Saves to local DB and syncs with the platform.
   */
  async registerContact(data: { email: string; name?: string; metadata?: any }) {
    try {
      const contact = await prisma.marketingContact.upsert({
        where: { email: data.email },
        update: {
          name: data.name,
          metadata: data.metadata,
          status: 'SUBSCRIBED',
        },
        create: {
          email: data.email,
          name: data.name,
          metadata: data.metadata,
          status: 'SUBSCRIBED',
        },
      })

      // Async sync with platform
      this.platformService.upsertContact({
        email: data.email,
        firstName: data.name?.split(' ')[0],
        lastName: data.name?.split(' ').slice(1).join(' '),
        customFields: data.metadata,
      }).catch(err => logger.error('Async contact sync failed', { email: data.email, err }))

      return contact
    } catch (error) {
      logger.error('Failed to register marketing contact', { email: data.email, error })
      throw error
    }
  }

  /**
   * Create and send a campaign.
   */
  async createAndSendCampaign(data: { name: string; subject: string; content: string }) {
    try {
      // 1. Save locally as DRAFT
      const campaign = await prisma.marketingCampaign.create({
        data: {
          name: data.name,
          subject: data.subject,
          content: data.content,
          status: 'SENDING',
        },
      })

      // 2. Create on platform
      const platformId = await this.platformService.createCampaign({
        name: data.name,
        subject: data.subject,
        content: data.content,
      })

      // 3. Send via platform
      await this.platformService.sendCampaign(platformId)

      // 4. Update local status
      await prisma.marketingCampaign.update({
        where: { id: campaign.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          listId: platformId, // Store platform ID for tracking
        },
      })

      // 5. Initialize metrics
      await prisma.campaignMetrics.create({
        data: { campaignId: campaign.id },
      })

      return campaign
    } catch (error) {
      logger.error('Failed to create/send campaign', { name: data.name, error })
      throw error
    }
  }

  /**
   * Sync campaign stats from platform to local DB.
   */
  async syncCampaignStats(campaignId: string) {
    try {
      const campaign = await prisma.marketingCampaign.findUnique({
        where: { id: campaignId },
      })

      if (!campaign || !campaign.listId) return

      const stats = await this.platformService.getCampaignStats(campaign.listId)

      await prisma.campaignMetrics.update({
        where: { campaignId },
        data: {
          deliveredCount: stats.delivered,
          openCount: stats.opens,
          clickCount: stats.clicks,
          bounceCount: stats.bounces,
          unsubscribeCount: stats.unsubscribes,
        },
      })

      return stats
    } catch (error) {
      logger.error('Failed to sync campaign stats', { campaignId, error })
      throw error
    }
  }

  /**
   * Handle tracking events from webhooks.
   */
  async handleTrackingEvent(event: { email: string; event: string; campaignId?: string; metadata?: any }) {
    try {
      // Find local campaign by platform ID if campaignId is actually a platform ID (listId)
      let localCampaignId = event.campaignId
      if (event.campaignId) {
        const campaign = await prisma.marketingCampaign.findFirst({
          where: { listId: event.campaignId },
        })
        if (campaign) localCampaignId = campaign.id
      }

      if (!localCampaignId) return

      await prisma.campaignEvent.create({
        data: {
          campaignId: localCampaignId,
          email: event.email,
          eventType: event.event.toUpperCase(),
          metadata: event.metadata,
        },
      })

      // Increment metrics
      const updateData: any = {}
      if (event.event === 'open') updateData.openCount = { increment: 1 }
      if (event.event === 'click') updateData.clickCount = { increment: 1 }
      if (event.event === 'bounce') updateData.bounceCount = { increment: 1 }
      if (event.event === 'unsubscribe') updateData.unsubscribeCount = { increment: 1 }

      if (Object.keys(updateData).length > 0) {
        await prisma.campaignMetrics.update({
          where: { campaignId: localCampaignId },
          data: updateData,
        })
      }
    } catch (error) {
      logger.error('Failed to handle tracking event', { event, error })
    }
  }
}

export const marketingService = new MarketingService()
